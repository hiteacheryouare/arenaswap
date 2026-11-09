import { scoreGame } from '../src/compose';
import type { Game, ScoreOptions, ScoreSnapshot, Side } from '../src/types';

const now = 10_000_000;

// Cowboys on the road, so a rival on the away side.
const nfl = (period: number, clockSeconds: number, home: number, away: number, id = 'nyg-dal'): Game => ({
	id,
	league: 'nfl',
	sportType: 'football',
	status: 'in',
	period,
	clockSeconds,
	homeTeam: { score: home, abbreviation: 'NYG', nickname: 'Giants' },
	awayTeam: { score: away, abbreviation: 'DAL', nickname: 'Cowboys' },
});

const nba = (period: number, clockSeconds: number, home: number, away: number): Game => ({
	id: 'bos-mia',
	league: 'nba',
	sportType: 'basketball',
	status: 'in',
	period,
	clockSeconds,
	homeTeam: { score: home, abbreviation: 'BOS' },
	awayTeam: { score: away, abbreviation: 'MIA' },
});

const window = (gameId: string, from: [number, number], to: [number, number], spanMs = 600_000): ScoreSnapshot[] => {
	const steps = spanMs / 30_000;
	return Array.from({ length: steps + 1 }, (_, i) => ({
		gameId,
		timestamp: now - spanMs + i * 30_000,
		homeScore: Math.round(from[0] + (to[0] - from[0]) * i / steps),
		awayScore: Math.round(from[1] + (to[1] - from[1]) * i / steps),
	}));
};

const score = (game: Game, rivalSides: readonly Side[] | undefined, history: ScoreSnapshot[] = [], options: ScoreOptions = {}) => (
	scoreGame(game, { history }, { mode: 'blowouts', ...(rivalSides ? { rivalSides } : {}), ...options })
);

describe('Blowouts with the Cowboys on the rivals list', () => {
	test('a Cowboys beatdown outranks the biggest rout on the slate', () => {
		const rout = score(nba(3, 300, 98, 54), [], window('bos-mia', [86, 50], [98, 54]));
		const beatdown = score(nfl(3, 600, 24, 6), ['away'], window('nyg-dal', [17, 6], [24, 6]));

		expect(rout.rivalry?.kind).toBe('ordinary');
		expect(rout.total).toBeLessThanOrEqual(85);
		expect(beatdown.rivalry).toMatchObject({ kind: 'beatdown', side: 'away' });
		expect(beatdown.total).toBeGreaterThan(85);
		expect(beatdown.total).toBeGreaterThan(rout.total);
	});

	test('a worse beating ranks higher than a milder one', () => {
		const mild = score(nfl(3, 600, 17, 6), ['away']);
		const brutal = score(nfl(4, 600, 38, 3), ['away']);

		expect(mild.rivalry?.kind).toBe('beatdown');
		expect(brutal.total).toBeGreaterThan(mild.total);
		expect(brutal.total).toBeLessThanOrEqual(100);
	});

	test('a Cowboys team that blew the lead to get there ranks above one that never had it', () => {
		const neverLed = score(nfl(3, 600, 24, 10), ['away'], window('nyg-dal', [10, 7], [24, 10]));
		const collapsed = score(nfl(3, 600, 24, 10), ['away'], window('nyg-dal', [7, 10], [24, 10]));

		expect(neverLed.rivalry?.blownLead).toBeUndefined();
		expect(collapsed.rivalry?.blownLead).toBe(true);
		expect(collapsed.total).toBeGreaterThan(neverLed.total);
	});

	test('down one score is not a beatdown, so it is scored like any other game', () => {
		const close = score(nfl(4, 120, 20, 17), ['away']);
		const neutral = score(nfl(4, 120, 20, 17), []);

		expect(close.rivalry?.kind).toBe('ordinary');
		expect(close.total).toBe(neutral.total);
	});

	test('a Cowboys lead gets buried deeper the bigger it grows', () => {
		const kept = (home: number, away: number) => {
			const buried = score(nfl(3, 600, home, away), ['away']);
			const ordinary = score(nfl(3, 600, home, away), []);
			expect(buried.rivalry).toMatchObject({ kind: 'winning', side: 'away' });
			return buried.total / ordinary.total;
		};

		const upThree = kept(14, 17);
		const upEight = kept(14, 22);
		const cruising = kept(3, 31);

		expect(upThree).toBeLessThan(1);
		expect(upEight).toBeLessThan(upThree);
		expect(cruising).toBeLessThanOrEqual(0.06);
	});

	test('when both teams are rivals, the one getting beaten is what counts', () => {
		const result = score(nfl(3, 600, 31, 7), ['home', 'away']);
		expect(result.rivalry).toMatchObject({ kind: 'beatdown', side: 'away' });
	});

	test('ordinary games keep their order inside the squeezed range', () => {
		const bigger = score(nba(3, 300, 98, 54), [], window('bos-mia', [86, 50], [98, 54]));
		const smaller = score(nba(3, 300, 80, 62), [], window('bos-mia', [74, 58], [80, 62]));
		const unranked = score(nba(3, 300, 98, 54), undefined, window('bos-mia', [86, 50], [98, 54]));

		expect(bigger.total).toBeGreaterThan(smaller.total);
		expect(bigger.total).toBe(Math.round(unranked.total * 0.85));
	});

	test('halftime still scores zero, rival or not', () => {
		const halftime = scoreGame({ ...nfl(2, 0, 24, 3), intermission: true }, {}, { mode: 'blowouts', rivalSides: ['away'] });
		expect(halftime.total).toBe(0);
		expect(halftime.frozen).toBe(true);
	});

	test('a manual game boost still goes on top', () => {
		const boosted = score(nfl(4, 600, 38, 3), ['away'], [], { gameBoost: 10 });
		const plain = score(nfl(4, 600, 38, 3), ['away']);
		expect(boosted.total).toBe(plain.total + 10);
	});
});

describe('modes without rivals', () => {
	test('Classic ignores the rivals list', () => {
		const game = nfl(3, 600, 24, 6);
		const withRivals = scoreGame(game, {}, { mode: 'classic', rivalSides: ['away'] });
		const without = scoreGame(game, {}, { mode: 'classic' });

		expect(withRivals.rivalry).toBeUndefined();
		expect(withRivals.total).toBe(without.total);
	});
});
