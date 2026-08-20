// Regression: history used to be count-capped, so fast polling compressed the window's real-time
// span and dropped recent events before they decayed — a game being exciting was self-defeating.
// The time-based window makes fast and slow polling produce the same scores for the same event.

import { computePowerScore } from '../src/scorer';
import { sportTypeConfigMap } from '../src/constants';
import type { Game, ScoreSnapshot } from '../src/types';


const makeGame = (overrides: Partial<Game> = {}): Game => ({
	id: 'game-1',
	league: 'nba',
	sportType: 'basketball',
	homeTeam: { abbreviation: 'HOM', score: 80 },
	awayTeam: { abbreviation: 'AWY', score: 78 },
	period: 4,
	clockSeconds: 120,
	status: 'in',
	...overrides,
});

// Mirrors background.ts: a snapshot every pollIntervalMs, always one at exactly nowMs, and only
// those within historyWindowMs retained.
const buildHistory = (
	pollIntervalMs: number,
	nowMs: number,
	historyWindowMs: number,
	scoreAtT: (t: number) => [number, number],
): ScoreSnapshot[] => {
	const all: ScoreSnapshot[] = [];
	for (let t = 0; t <= nowMs; t += pollIntervalMs) {
		const [home, away] = scoreAtT(t);
		all.push({ gameId: 'game-1', timestamp: t, homeScore: home, awayScore: away });
	}
	if (all.length === 0 || all[all.length - 1]!.timestamp < nowMs) {
		const [home, away] = scoreAtT(nowMs);
		all.push({ gameId: 'game-1', timestamp: nowMs, homeScore: home, awayScore: away });
	}
	const cutoff = nowMs - historyWindowMs;
	return all.filter(s => s.timestamp >= cutoff);
};

const FAST_POLL_MS = 6_000;
const SLOW_POLL_MS = 25_000;

const bballScoreAtT = (t: number): [number, number] => (t === 0 ? [80, 80] : [90, 80]);
// 150s is a multiple of both poll intervals, so both rates observe the run at the same instant.
const alignedScoreAtT = (t: number): [number, number] => (t >= 150_000 ? [90, 80] : [80, 80]);


describe('Basketball: time-based window decouples momentum from poll rate', () => {
	const config = sportTypeConfigMap.basketball;
	// Observed at t=3min, well within the 5-min window for both poll rates.
	const nowMs = 180_000;
	const scoreAtT = bballScoreAtT;
	const game = makeGame({
		homeTeam: { abbreviation: 'HOM', score: 90 },
		awayTeam: { abbreviation: 'AWY', score: 80 },
	});

	test('fast polling: run is inside 5-min window, momentum > 0', () => {
		const history = buildHistory(FAST_POLL_MS, nowMs, config.historyWindowMs, scoreAtT);
		expect(history[0]!.timestamp).toBe(0); // t=0 still in window
		const result = computePowerScore(game, history);
		expect(result.momentum).toBeGreaterThan(0);
	});

	// With the change aligned to a shared poll boundary there is nothing left for the poll rate to
	// alter, which is the whole claim being made here.
	test('slow polling: identical result once detection lag is taken out of it', () => {
		const fastHistory = buildHistory(FAST_POLL_MS, nowMs, config.historyWindowMs, alignedScoreAtT);
		const slowHistory = buildHistory(SLOW_POLL_MS, nowMs, config.historyWindowMs, alignedScoreAtT);
		const fastResult = computePowerScore(game, fastHistory);
		const slowResult = computePowerScore(game, slowHistory);
		expect(fastHistory.length).toBeGreaterThan(slowHistory.length);
		expect(fastResult.momentum).toBeGreaterThan(0);
		expect(slowResult).toEqual(fastResult);
	});

	test('run older than the 5-min window fades for both poll rates equally', () => {
		const oldNowMs = 360_000;
		const fastHistory = buildHistory(FAST_POLL_MS, oldNowMs, config.historyWindowMs, scoreAtT);
		const slowHistory = buildHistory(SLOW_POLL_MS, oldNowMs, config.historyWindowMs, scoreAtT);
		const fastResult = computePowerScore(game, fastHistory);
		const slowResult = computePowerScore(game, slowHistory);
		expect(fastResult.momentum).toBe(0);
		expect(slowResult.momentum).toBe(0);
	});
});


describe('Hockey: 16-min window keeps goals visible at both poll rates', () => {
	const config = sportTypeConfigMap.hockey;
	// Goals at t=1min, observed at t=7min — well inside the 16-minute window.
	const goalsAtMs = 60_000;
	const nowMs = 420_000;
	const scoreAtT = (t: number): [number, number] => (t >= goalsAtMs ? [2, 0] : [0, 0]);
	const game = makeGame({
		league: 'nhl',
		sportType: 'hockey',
		homeTeam: { abbreviation: 'HOM', score: 2 },
		awayTeam: { abbreviation: 'AWY', score: 0 },
		period: 3,
		clockSeconds: 300,
		status: 'in',
	});

	test('fast polling (6s): 16-min window still sees the goals at t=7min', () => {
		const history = buildHistory(FAST_POLL_MS, nowMs, config.historyWindowMs, scoreAtT);
		expect(history[0]!.timestamp).toBe(0);
		const result = computePowerScore(game, history);
		expect(result.momentum).toBeGreaterThan(0);
	});

	test('slow polling (25s): same — both rates see the goals', () => {
		const fastHistory = buildHistory(FAST_POLL_MS, nowMs, config.historyWindowMs, scoreAtT);
		const slowHistory = buildHistory(SLOW_POLL_MS, nowMs, config.historyWindowMs, scoreAtT);
		const fastResult = computePowerScore(game, fastHistory);
		const slowResult = computePowerScore(game, slowHistory);
		expect(fastResult.momentum).toBeGreaterThan(0);
		expect(slowResult.momentum).toBeGreaterThan(0);
	});

	test('sweep: momentum is consistent across all poll intervals once window is time-based', () => {
		const intervals = [6_000, 10_000, 15_000, 20_000, 25_000];
		const rows: { intervalS: number; windowMin: number; momentum: number; total: number }[] = [];
		for (const interval of intervals) {
			const history = buildHistory(interval, nowMs, config.historyWindowMs, scoreAtT);
			const result = computePowerScore(game, history);
			rows.push({
				intervalS: interval / 1000,
				windowMin: config.historyWindowMs / 60_000,
				momentum: result.momentum,
				total: result.total,
			});
		}
		const allNonzero = rows.every(r => r.momentum > 0);
		expect(allNonzero).toBe(true);
	});
});


// Ages are measured against the newest snapshot rather than Date.now(), so a score depends only on
// the history it was given — not on when the scorer happened to run.
describe('Decay is measured from the newest snapshot, not from wall-clock time', () => {
	const fixedHistory: ScoreSnapshot[] = [
		{ gameId: 'game-1', timestamp: 0,      homeScore: 80, awayScore: 80 },
		{ gameId: 'game-1', timestamp: 30_000,  homeScore: 88, awayScore: 80 },
		{ gameId: 'game-1', timestamp: 60_000,  homeScore: 88, awayScore: 80 },
		{ gameId: 'game-1', timestamp: 90_000,  homeScore: 88, awayScore: 80 },
	];
	const game = makeGame({ homeTeam: { abbreviation: 'HOM', score: 88 }, awayTeam: { abbreviation: 'AWY', score: 80 } });

	test('six hours of wall clock passing does not move the score', () => {
		jest.useFakeTimers();
		jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
		const scoredNow = computePowerScore(game, fixedHistory);
		jest.advanceTimersByTime(6 * 60 * 60 * 1_000);
		const scoredMuchLater = computePowerScore(game, fixedHistory);

		expect(scoredNow.momentum).toBeGreaterThan(0);
		expect(scoredMuchLater).toEqual(scoredNow);
	});
});
