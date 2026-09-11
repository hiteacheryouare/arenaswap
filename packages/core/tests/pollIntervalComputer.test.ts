import { pollDormantMaxMs, pollHebetudinousMaxMs, pollIntermissionMs, pollMaxEagerMs, pollMinEagerMs } from '../src/constants';
import { computeEagerIntervalMs, computeHebetudinousIntervalMs, computeLeagueIntervalMs, earliestUpcomingStartMs } from '../src/pollIntervalComputer';
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

describe('earliestUpcomingStartMs', () => {
	const now = Date.UTC(2026, 8, 11, 12, 0, 0);
	const at = (offsetMinutes: number) => new Date(now + offsetMinutes * 60_000).toISOString();

	test('no games at all reads as nothing scheduled', () => {
		expect(earliestUpcomingStartMs([], now)).toBeNull();
	});

	test('picks the earliest of several, whatever order they arrive in', () => {
		const games = [
			makeGame({ id: 'late', status: 'pre', startTime: at(400) }),
			makeGame({ id: 'soon', status: 'pre', startTime: at(90) }),
			makeGame({ id: 'mid', status: 'pre', startTime: at(200) }),
		];
		expect(earliestUpcomingStartMs(games, now)).toBe(now + 90 * 60_000);
	});

	// A live game's kickoff is in the past and a final game's is further back still. Every state
	// carries startTime now, so filtering on status is what keeps this answering the right question.
	test('ignores games that are already under way or over', () => {
		const games = [
			makeGame({ id: 'live', status: 'in', startTime: at(-40) }),
			makeGame({ id: 'done', status: 'post', startTime: at(-300) }),
			makeGame({ id: 'next', status: 'pre', startTime: at(150) }),
		];
		expect(earliestUpcomingStartMs(games, now)).toBe(now + 150 * 60_000);
	});

	// A scheduled game whose start has slipped past is about to go live, not about to be waited for.
	test('ignores a scheduled game whose start has already passed', () => {
		const games = [makeGame({ id: 'slipped', status: 'pre', startTime: at(-5) })];
		expect(earliestUpcomingStartMs(games, now)).toBeNull();
	});

	test('a start ESPN sent as nonsense is skipped rather than thrown on', () => {
		const games = [
			makeGame({ id: 'bad', status: 'pre', startTime: 'later today' }),
			makeGame({ id: 'none', status: 'pre', startTime: undefined }),
			makeGame({ id: 'good', status: 'pre', startTime: at(75) }),
		];
		expect(earliestUpcomingStartMs(games, now)).toBe(now + 75 * 60_000);
	});
});

describe('computeHebetudinousIntervalMs', () => {
	const now = Date.UTC(2026, 8, 11, 12, 0, 0);
	const minutes = (n: number) => now + n * 60_000;
	const day = 24 * 60 * 60_000;

	test('nothing scheduled sleeps for the ceiling', () => {
		expect(computeHebetudinousIntervalMs(null, now)).toBe(pollHebetudinousMaxMs);
	});

	test('a kickoff days out still only sleeps for the ceiling', () => {
		expect(computeHebetudinousIntervalMs(now + 9 * 24 * 60 * 60_000, now)).toBe(pollHebetudinousMaxMs);
	});

	// The point of the state: sleep up to the edge of the horizon, then hand back to the dormant beat.
	test('wakes as the kickoff comes inside the horizon', () => {
		expect(computeHebetudinousIntervalMs(now + day + 25 * 60_000, now)).toBe(25 * 60_000);
	});

	test('never sleeps for less than the dormant beat', () => {
		expect(computeHebetudinousIntervalMs(now + day + 60_000, now)).toBe(pollDormantMaxMs);
	});

	// Reachable while a schedule is still live but the league has already woken to dormant; the
	// interval is only read in the sleeping branch, and it must not go negative if it ever is not.
	test('a kickoff already inside the horizon sleeps for the dormant beat', () => {
		expect(computeHebetudinousIntervalMs(minutes(90), now)).toBe(pollDormantMaxMs);
	});

	// Reachable only through a schedule that went stale between the mode being read and the interval
	// being computed, and the answer has to stay a sleep rather than becoming a negative delay.
	test('a kickoff already in the past still sleeps for the dormant beat', () => {
		expect(computeHebetudinousIntervalMs(minutes(-30), now)).toBe(pollDormantMaxMs);
	});

	test('is never faster than dormant nor slower than the ceiling, at any distance', () => {
		for (let m = -60; m <= 60 * 24 * 3; m += 7) {
			const interval = computeHebetudinousIntervalMs(minutes(m), now);
			expect(interval).toBeGreaterThanOrEqual(pollDormantMaxMs);
			expect(interval).toBeLessThanOrEqual(pollHebetudinousMaxMs);
		}
	});
});
