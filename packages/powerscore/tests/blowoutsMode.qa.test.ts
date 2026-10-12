import { scoreGame } from '../src/compose';
import type { Game, ScoreSnapshot } from '../src/types';

const now = 10_000_000;

const nba = (period: number, clockSeconds: number, home: number, away: number): Game => ({
	id: 'g',
	league: 'nba',
	sportType: 'basketball',
	status: 'in',
	period,
	clockSeconds,
	homeTeam: { score: home, abbreviation: 'BOS' },
	awayTeam: { score: away, abbreviation: 'MIA' },
});

// One snapshot every fifteen seconds over the last five minutes, the way the worker records a game,
// with the score moving linearly from `from` to `to`.
const window = (from: [number, number], to: [number, number], spanMs = 300_000): ScoreSnapshot[] => {
	const steps = spanMs / 15_000;
	return Array.from({ length: steps + 1 }, (_, i) => ({
		gameId: 'g',
		timestamp: now - spanMs + i * 15_000,
		homeScore: Math.round(from[0] + (to[0] - from[0]) * i / steps),
		awayScore: Math.round(from[1] + (to[1] - from[1]) * i / steps),
	}));
};

const blowouts = (game: Game, history: ScoreSnapshot[] = []) => scoreGame(game, { history }, { mode: 'blowouts' });
const signal = (result: ReturnType<typeof scoreGame>, id: string) => result.signals.find(entry => entry.id === id)?.points ?? 0;

describe('a Tuesday slate under Blowouts', () => {
	test('a rout with a half still to play outranks the same margin with a minute left', () => {
		const early = blowouts(nba(2, 360, 70, 40), window([62, 38], [70, 40]));
		const late = blowouts(nba(4, 60, 120, 90), window([112, 88], [120, 90]));

		expect(early.total).toBeGreaterThan(late.total);
		expect(signal(early, 'timing')).toBeGreaterThan(0);
		expect(signal(late, 'timing')).toBeLessThan(signal(early, 'timing'));
	});

	test('a beatdown held through the window outranks a tied game in its final seconds', () => {
		const rout = blowouts(nba(3, 300, 88, 62), window([80, 58], [88, 62]));
		const thriller = blowouts(nba(4, 20, 100, 100), window([94, 95], [100, 100]));

		expect(thriller.blend).toMatchObject({ kind: 'floor', floorApplied: true });
		expect(rout.total).toBeGreaterThan(thriller.total);
	});

	test('a single-digit game gets nothing from the blowout signals', () => {
		const result = blowouts(nba(3, 300, 80, 72), window([76, 70], [80, 72]));
		for (const id of ['blowoutMargin', 'sustained', 'timing', 'pileOn']) expect(signal(result, id)).toBe(0);
	});

	test('scores a rout the moment the worker sees it, before any history has built up', () => {
		const fresh = blowouts(nba(2, 360, 70, 40));
		const held = blowouts(nba(2, 360, 70, 40), window([62, 38], [70, 40]));

		expect(signal(fresh, 'blowoutMargin')).toBeGreaterThan(0);
		expect(signal(fresh, 'sustained')).toBe(0);
		expect(held.total).toBeGreaterThan(fresh.total);
	});
});

describe('piling on', () => {
	test('pays the leader for stretching the lead', () => {
		const result = blowouts(nba(3, 300, 90, 62), window([78, 62], [90, 62]));
		expect(signal(result, 'pileOn')).toBe(15);
		expect(result.reasons).toContainEqual({ key: 'pilingOn', params: { team: 'BOS' } });
	});

	test('pays nothing for the trailing team chipping away', () => {
		const result = blowouts(nba(3, 300, 90, 70), window([90, 58], [90, 70]));
		expect(signal(result, 'pileOn')).toBe(0);
	});

	test('fades once the leader stops scoring', () => {
		const stillRunning = blowouts(nba(3, 300, 90, 62), window([78, 62], [90, 62]));
		// The same 12-0 run, but it ended three minutes ago and nothing has gone in since.
		const history = window([78, 62], [90, 62], 120_000).map(snapshot => ({ ...snapshot, timestamp: snapshot.timestamp - 180_000 }));
		const stalled = blowouts(nba(3, 120, 90, 62), [...history, { gameId: 'g', timestamp: now, homeScore: 90, awayScore: 62 }]);
		expect(signal(stalled, 'pileOn')).toBeLessThan(signal(stillRunning, 'pileOn'));
	});
});

const hockey = (home: number, away: number): Game => ({
	id: 'g', league: 'nhl', sportType: 'hockey', status: 'in', period: 2, clockSeconds: 600,
	homeTeam: { score: home, abbreviation: 'TOR' }, awayTeam: { score: away, abbreviation: 'MTL' },
});

describe('the margin that counts as a rout follows the sport', () => {
	test('two goals is a game, four is a rout', () => {
		expect(signal(blowouts(hockey(2, 0)), 'blowoutMargin')).toBe(0);
		expect(signal(blowouts(hockey(4, 0)), 'blowoutMargin')).toBeGreaterThan(0);
		expect(signal(blowouts(hockey(6, 0)), 'blowoutMargin')).toBeGreaterThan(signal(blowouts(hockey(4, 0)), 'blowoutMargin'));
	});

	test('does not care which side is winning', () => {
		expect(blowouts(hockey(0, 5)).total).toBe(blowouts(hockey(5, 0)).total);
	});
});
