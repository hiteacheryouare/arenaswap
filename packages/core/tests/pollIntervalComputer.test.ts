import { pollIntermissionMs, pollMaxEagerMs, pollMinEagerMs } from '../src/constants';
import { computeEagerIntervalMs, computeLeagueIntervalMs } from '../src/pollIntervalComputer';
import type { Game, PowerScoreResult } from '../src/types';

const makeGame = (overrides: Partial<Game> = {}): Game => ({
	id: 'g1',
	league: 'nba',
	sportType: 'basketball',
	homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 50 },
	awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 48 },
	period: 4,
	clockSeconds: 120,
	status: 'in',
	...overrides,
});

const makeScore = (gameId: string, total: number): PowerScoreResult => ({
	gameId,
	total,
	closeness: 0,
	lateGame: 0,
	momentum: 0,
	leadChanges: 0,
	comeback: 0,
	reason: 'test',
});

describe('computeEagerIntervalMs', () => {
	it('returns pollMinEagerMs for score 100', () => {
		expect(computeEagerIntervalMs(100)).toBe(pollMinEagerMs);
	});

	it('returns pollMaxEagerMs for score 0', () => {
		expect(computeEagerIntervalMs(0)).toBe(pollMaxEagerMs);
	});

	it('returns midpoint for score 50', () => {
		expect(computeEagerIntervalMs(50)).toBe(
			Math.round(pollMaxEagerMs - 0.5 * (pollMaxEagerMs - pollMinEagerMs))
		);
	});

	it('clamps score below 0 to pollMaxEagerMs', () => {
		expect(computeEagerIntervalMs(-50)).toBe(pollMaxEagerMs);
	});

	it('clamps score above 100 to pollMinEagerMs', () => {
		expect(computeEagerIntervalMs(150)).toBe(pollMinEagerMs);
	});

	it('produces a shorter interval for a higher score', () => {
		expect(computeEagerIntervalMs(80)).toBeLessThan(computeEagerIntervalMs(40));
	});
});

describe('computeLeagueIntervalMs', () => {
	it('returns pollMaxEagerMs when no live games are passed', () => {
		expect(computeLeagueIntervalMs([], [])).toBe(pollMaxEagerMs);
	});

	it('returns pollIntermissionMs when all live games are in intermission', () => {
		const games = [makeGame({ intermission: true }), makeGame({ id: 'g2', intermission: true })];
		expect(computeLeagueIntervalMs(games, [])).toBe(pollIntermissionMs);
	});

	it('uses active games only when some are in intermission', () => {
		const intermissionGame = makeGame({ id: 'g1', intermission: true });
		const activeGame = makeGame({ id: 'g2', intermission: false });
		const scores = [makeScore('g2', 80)];
		const result = computeLeagueIntervalMs([intermissionGame, activeGame], scores);
		expect(result).toBe(computeEagerIntervalMs(80));
	});

	it('returns pollIntermissionMs when all live games are delayed', () => {
		const games = [makeGame({ delayed: true }), makeGame({ id: 'g2', delayed: true })];
		expect(computeLeagueIntervalMs(games, [])).toBe(pollIntermissionMs);
	});

	it('ignores a delayed game holding a stale high score', () => {
		const delayedGame = makeGame({ id: 'g1', delayed: true });
		const activeGame = makeGame({ id: 'g2' });
		const scores = [makeScore('g1', 90), makeScore('g2', 40)];
		const result = computeLeagueIntervalMs([delayedGame, activeGame], scores);
		expect(result).toBe(computeEagerIntervalMs(40));
	});

	it('defaults to score 0 (pollMaxEagerMs) when no currentScores entry exists', () => {
		const game = makeGame({ id: 'g1' });
		expect(computeLeagueIntervalMs([game], [])).toBe(pollMaxEagerMs);
	});

	it('uses the highest score across multiple active games', () => {
		const games = [makeGame({ id: 'g1' }), makeGame({ id: 'g2' })];
		const scores = [makeScore('g1', 30), makeScore('g2', 75)];
		expect(computeLeagueIntervalMs(games, scores)).toBe(computeEagerIntervalMs(75));
	});

	it('returns pollMinEagerMs when a game has score 100', () => {
		const game = makeGame({ id: 'g1' });
		const scores = [makeScore('g1', 100)];
		expect(computeLeagueIntervalMs([game], scores)).toBe(pollMinEagerMs);
	});

	it('handles a game with total score that exceeds 100 (clamped to pollMinEagerMs)', () => {
		const game = makeGame({ id: 'g1' });
		const scores = [makeScore('g1', 115)];
		expect(computeLeagueIntervalMs([game], scores)).toBe(pollMinEagerMs);
	});
});
