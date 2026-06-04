/**
 * PowerScore v2 distribution harness.
 *
 * Drives MockGameSimulator through many simulated polls, scores every live game with the v2 scorer,
 * and prints the resulting distributions so we can verify v2 goals empirically:
 *   - 0s / low totals are common (no more 20–30 floor)
 *   - totals spread sensibly across the 0–100 range
 *   - the best-vs-active "switch gap" distribution → recalibrated sensitivityThresholds
 *
 * Mirrors the extension background loop: score is computed against the history that does NOT yet
 * include the current poll (so decay ages match runtime), then the current snapshot is appended.
 *
 * Run: npm run powerscore:simulate -- [ticks]
 */
import { MockGameSimulator } from '../../packages/core/src/mockGames';
import { computePowerScore } from '../../packages/powerscore/src/scorer';
import { sportTypeConfigMap } from '../../packages/powerscore/src/constants';
import { maxHistorySnapshots as defaultMaxSnapshots } from '../../packages/core/src/constants';
import type { Game, ScoreSnapshot } from '../../packages/powerscore/src/types';

const pollIntervalMs = 15_000;
const ticks = Math.max(1_000, Number(process.argv[2]) || 40_000);

const maxSnapshotsFor = (game: Game): number => (
	sportTypeConfigMap[game.sportType]?.maxHistorySnapshots ?? defaultMaxSnapshots
);

const percentile = (sortedValues: number[], p: number): number => {
	if (sortedValues.length === 0) return 0;
	const index = Math.min(sortedValues.length - 1, Math.max(0, Math.round((p / 100) * (sortedValues.length - 1))));
	return sortedValues[index]!;
};

const summarize = (values: number[]): string => {
	if (values.length === 0) return 'no samples';
	const sorted = [...values].sort((a, b) => a - b);
	const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
	const stat = (p: number) => String(percentile(sorted, p)).padStart(3);
	return `min ${stat(0)}  p10 ${stat(10)}  p25 ${stat(25)}  p50 ${stat(50)}  p75 ${stat(75)}  p90 ${stat(90)}  p95 ${stat(95)}  p99 ${stat(99)}  max ${stat(100)}  mean ${mean.toFixed(1)}`;
};

const simulator = new MockGameSimulator();
const history = new Map<string, ScoreSnapshot[]>();

const totalsBySport: Record<string, number[]> = {};
const allTotals: number[] = [];
const signalSamples: Record<'closeness' | 'lateGame' | 'momentum' | 'leadChanges' | 'comeback', number[]> = {
	closeness: [], lateGame: [], momentum: [], leadChanges: [], comeback: [],
};
const switchGaps: number[] = [];
let zeroTotalCount = 0;
let liveSampleCount = 0;

for (let tick = 0; tick < ticks; tick++) {
	const now = tick * pollIntervalMs;
	const games = simulator.tick().filter(game => game.status === 'in');

	// Score with history BEFORE this poll's snapshot is appended (matches runtime decay timing).
	const tickTotals: number[] = [];
	for (const game of games) {
		const result = computePowerScore(game, history.get(game.id) ?? []);
		allTotals.push(result.total);
		(totalsBySport[game.sportType] ??= []).push(result.total);
		signalSamples.closeness.push(result.closeness);
		signalSamples.lateGame.push(result.lateGame);
		signalSamples.momentum.push(result.momentum);
		signalSamples.leadChanges.push(result.leadChanges);
		signalSamples.comeback.push(result.comeback);
		if (result.total === 0) zeroTotalCount++;
		liveSampleCount++;
		tickTotals.push(result.total);
	}

	// Switch gap = how far the best live game leads the runner-up this poll (the delta a switch clears).
	if (tickTotals.length >= 2) {
		tickTotals.sort((a, b) => b - a);
		switchGaps.push(tickTotals[0]! - tickTotals[1]!);
	}

	// Append this poll's snapshot and trim, mirroring background.updateHistory.
	for (const game of games) {
		const snapshots = history.get(game.id) ?? [];
		snapshots.push({ gameId: game.id, timestamp: now, homeScore: game.homeTeam.score, awayScore: game.awayTeam.score });
		if (snapshots.length > maxSnapshotsFor(game)) snapshots.shift();
		history.set(game.id, snapshots);
	}
}

const sortedGaps = [...switchGaps].sort((a, b) => a - b);
// Sensitivity levels map to gap percentiles: 7 = most eager (tiny gap), 1 = least eager (large gap).
const levelToPercentile: Record<number, number> = { 1: 97, 2: 88, 3: 72, 4: 52, 5: 34, 6: 18, 7: 2 };
const suggestedThresholds: Record<number, number> = {};
for (let level = 1; level <= 7; level++) {
	const value = percentile(sortedGaps, levelToPercentile[level]!);
	suggestedThresholds[level] = level === 7 ? Math.max(1, value) : Math.max(1, value);
}

console.log(`\nPowerScore v2 distribution — ${ticks.toLocaleString()} polls, ${liveSampleCount.toLocaleString()} live-game samples\n`);
console.log('TOTAL');
console.log(`  ${summarize(allTotals)}`);
console.log(`  total === 0: ${((zeroTotalCount / Math.max(1, liveSampleCount)) * 100).toFixed(1)}% of live samples\n`);

console.log('TOTAL by sport');
for (const sport of Object.keys(totalsBySport).sort()) {
	console.log(`  ${sport.padEnd(11)} ${summarize(totalsBySport[sport]!)}`);
}

console.log('\nSIGNALS');
for (const signal of Object.keys(signalSamples) as (keyof typeof signalSamples)[]) {
	console.log(`  ${signal.padEnd(11)} ${summarize(signalSamples[signal])}`);
}

console.log('\nSWITCH GAP (best − runner-up per poll)');
console.log(`  ${summarize(switchGaps)}`);

console.log('\nSUGGESTED sensitivityThresholds (paste into packages/core/src/constants.ts):');
console.log('export const sensitivityThresholds: Record<number, number> = {');
for (let level = 1; level <= 7; level++) {
	const label = { 1: 'Barely Active', 2: 'Passive', 3: 'Conservative', 4: 'Balanced (default)', 5: 'Eager', 6: 'Trigger Happy', 7: 'Overkill' }[level];
	console.log(`\t${level}: ${suggestedThresholds[level]},`.padEnd(10) + `// ${label} — ~p${levelToPercentile[level]} of switch gaps`);
}
console.log('};\n');
