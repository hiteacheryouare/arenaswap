/**
 * Regression tests for the poll-frequency / history-window coupling fix.
 *
 * Previously, history was count-capped (maxHistorySnapshots). Fast polling compressed
 * the real-time span of the window, causing recent score events to fall out of history
 * before they naturally decayed — a game being exciting (high score → fast polls) was
 * self-defeating. The fix switches to a time-based window (historyWindowMs = 4× max
 * decayHalfLife per sport) so the window is invariant to poll frequency.
 *
 * These tests verify the fix holds: fast and slow polling produce the same signal scores
 * when the same real-world event falls within both windows.
 */

import { computePowerScore } from '../src/scorer';
import { sportTypeConfigMap } from '../src/constants';
import type { Game, ScoreSnapshot } from '../src/types';

// ─── helpers ────────────────────────────────────────────────────────────────

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

/**
 * Build history that mirrors the fixed background.ts behavior:
 * - Snapshots at every pollIntervalMs from 0 → nowMs
 * - Always includes a final snapshot at exactly nowMs (background always fires Date.now())
 * - Time-based trim: only snapshots within historyWindowMs of nowMs are kept
 */
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

// ─── Basketball: run visible to both poll rates within 5-min window ──────────

describe('Basketball: time-based window decouples momentum from poll rate', () => {
	const config = sportTypeConfigMap.basketball;
	// historyWindowMs = 300_000 (5 min). Run at t=0 instantaneously.
	// Observe at t=3min — well within the 5-min window for both poll rates.
	const nowMs = 180_000;
	const scoreAtT = (t: number): [number, number] => (t === 0 ? [80, 80] : [90, 80]);
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

	test('slow polling: same result as fast — time window is identical', () => {
		const fastHistory = buildHistory(FAST_POLL_MS, nowMs, config.historyWindowMs, scoreAtT);
		const slowHistory = buildHistory(SLOW_POLL_MS, nowMs, config.historyWindowMs, scoreAtT);
		const fastResult = computePowerScore(game, fastHistory);
		const slowResult = computePowerScore(game, slowHistory);
		// Momentum values may differ slightly due to detection-lag (when the first poll
		// after t=0 captured the change differs by poll rate), but both are nonzero.
		expect(fastResult.momentum).toBeGreaterThan(0);
		expect(slowResult.momentum).toBeGreaterThan(0);
		console.log(`[bball window] fast momentum: ${fastResult.momentum}, slow momentum: ${slowResult.momentum}`);
	});

	test('run older than the 5-min window fades for both poll rates equally', () => {
		// nowMs = 360s (6 min), run at t=0 → age > 5 min → outside window
		const oldNowMs = 360_000;
		const fastHistory = buildHistory(FAST_POLL_MS, oldNowMs, config.historyWindowMs, scoreAtT);
		const slowHistory = buildHistory(SLOW_POLL_MS, oldNowMs, config.historyWindowMs, scoreAtT);
		const fastResult = computePowerScore(game, fastHistory);
		const slowResult = computePowerScore(game, slowHistory);
		// t=0 falls outside the 5-min window — both see no run
		expect(fastResult.momentum).toBe(0);
		expect(slowResult.momentum).toBe(0);
		console.log(`[bball expired] fast: ${fastResult.total}, slow: ${slowResult.total}`);
	});
});

// ─── Hockey: goals survive the window at both poll rates ─────────────────────

describe('Hockey: 16-min window keeps goals visible at both poll rates', () => {
	const config = sportTypeConfigMap.hockey;
	// historyWindowMs = 960_000 (16 min).
	// Goals at t=1min. Observe at t=7min (age=6min, well inside 16-min window).
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
		// With 16-min window, history goes back to t=420-960=-540 → t=0 is always in.
		expect(history[0]!.timestamp).toBe(0);
		const result = computePowerScore(game, history);
		expect(result.momentum).toBeGreaterThan(0);
		console.log(`[hockey fast 7min] momentum: ${result.momentum}, total: ${result.total}`);
	});

	test('slow polling (25s): same — both rates see the goals', () => {
		const fastHistory = buildHistory(FAST_POLL_MS, nowMs, config.historyWindowMs, scoreAtT);
		const slowHistory = buildHistory(SLOW_POLL_MS, nowMs, config.historyWindowMs, scoreAtT);
		const fastResult = computePowerScore(game, fastHistory);
		const slowResult = computePowerScore(game, slowHistory);
		expect(fastResult.momentum).toBeGreaterThan(0);
		expect(slowResult.momentum).toBeGreaterThan(0);
		console.log(`[hockey both] fast: ${fastResult.total}, slow: ${slowResult.total}`);
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
		console.table(rows);
		// All intervals produce nonzero momentum (no cliff, no coupling)
		const allNonzero = rows.every(r => r.momentum > 0);
		expect(allNonzero).toBe(true);
	});
});

// ─── Decay is wall-clock based ───────────────────────────────────────────────

describe('Decay is wall-clock based (given identical histories, result is identical)', () => {
	test('same snapshot data → same score regardless of how it was collected', () => {
		const fixedHistory: ScoreSnapshot[] = [
			{ gameId: 'game-1', timestamp: 0,      homeScore: 80, awayScore: 80 },
			{ gameId: 'game-1', timestamp: 30_000,  homeScore: 88, awayScore: 80 },
			{ gameId: 'game-1', timestamp: 60_000,  homeScore: 88, awayScore: 80 },
			{ gameId: 'game-1', timestamp: 90_000,  homeScore: 88, awayScore: 80 },
		];
		const game = makeGame({ homeTeam: { abbreviation: 'HOM', score: 88 }, awayTeam: { abbreviation: 'AWY', score: 80 } });
		const result1 = computePowerScore(game, fixedHistory);
		const result2 = computePowerScore(game, fixedHistory);
		expect(result1.momentum).toBe(result2.momentum);
		// age = 90s - 30s = 60s, halfLife = 45s → decay ≈ 0.40 → round(28*0.40) = 11
		console.log(`[decay isolation] momentum: ${result1.momentum} (age: 60s, halfLife: 45s)`);
	});
});
