// Drives MockGameSimulator through many simulated polls and prints the resulting distributions,
// including the best-vs-active switch gap that sensitivityThresholds is calibrated from.
//
// Mirrors the background loop: the score is computed against history that does NOT yet include the
// current poll, so decay ages match runtime, and only then is the snapshot appended. Win
// probability is synthesized logistically from margin × progress in place of ESPN's real line.
//
// Run: npm run powerscore:simulate -- [ticks]
//      npm run powerscore:simulate -- --early-game    (stress test only)
import { MockGameSimulator } from '../../packages/core/src/mockGames';
import { computePowerScore } from '../../packages/powerscore/src/scorer';
import { sportTypeConfigMap, leagueConfigMap } from '../../packages/powerscore/src/constants';
import { historyWindowMs as defaultHistoryWindowMs } from '../../packages/core/src/constants';
import type { Game, ScoreSnapshot } from '../../packages/powerscore/src/types';

const earlyGameMode = process.argv.includes('--early-game');
const pollIntervalMs = 15_000;
const ticks = earlyGameMode ? 0 : Math.max(1_000, Number(process.argv[2]) || 40_000);

const historyWindowMsFor = (game: Game): number => (
	sportTypeConfigMap[game.sportType]?.historyWindowMs ?? defaultHistoryWindowMs
);

// Maps a typical winning margin to a logit of ~1-2, so a 10-point NBA lead reads ~70-75% late.
const winProbScaleBySport: Record<string, number> = {
	basketball: 11,
	football: 7,
	baseball: 2,
	softball: 2,
	hockey: 1.5,
	soccer: 1.2,
};

// Certainty amplifies with progress, so a mid-game margin is less decisive than the same margin
// late on.
const deriveWinProb = (game: Game): number => {
	const diff = game.homeTeam.score - game.awayTeam.score;
	const scale = winProbScaleBySport[game.sportType] ?? 8;
	const league = leagueConfigMap[game.league];
	const config = sportTypeConfigMap[game.sportType];
	if (!league || !config) return 0.5;
	const regularPeriods = Math.max(1, league.regularPeriods);
	const period = game.period ?? 1;
	const progress = period > regularPeriods ? 1 : Math.min((period - 0.5) / regularPeriods, 1);
	const certainty = 0.5 + progress * 2.0;
	const x = (diff / scale) * certainty;
	return 1 / (1 + Math.exp(-x));
};

const percentile = (sortedValues: number[], p: number): number => {
	if (sortedValues.length === 0) return 0;
	const index = Math.min(sortedValues.length - 1, Math.max(0, Math.round((p / 100) * (sortedValues.length - 1))));
	return sortedValues[index]!;
};

const summarize = (values: number[]): string => {
	if (values.length === 0) return 'no samples';
	const sorted = values.toSorted((a, b) => a - b);
	const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
	const stat = (p: number) => String(percentile(sorted, p)).padStart(3);
	return `min ${stat(0)}  p10 ${stat(10)}  p25 ${stat(25)}  p50 ${stat(50)}  p75 ${stat(75)}  p90 ${stat(90)}  p95 ${stat(95)}  p99 ${stat(99)}  max ${stat(100)}  mean ${mean.toFixed(1)}`;
};

const simulator = new MockGameSimulator();
const history = new Map<string, ScoreSnapshot[]>();
const winProbHistory = new Map<string, number[]>();

const totalsBySport: Record<string, number[]> = {};
const totalsByHistoryDepth: Record<string, number[]> = { '0': [], '1-2': [], '3-9': [], '10+': [] };
const allTotals: number[] = [];
const signalSamples: Record<'closeness' | 'lateGame' | 'momentum' | 'leadChanges' | 'comeback' | 'winProbVariance', number[]> = {
	closeness: [], lateGame: [], momentum: [], leadChanges: [], comeback: [], winProbVariance: [],
};
const switchGaps: number[] = [];
let zeroTotalCount = 0;
let liveSampleCount = 0;

const historyDepthBucket = (depth: number): string => {
	if (depth === 0) return '0';
	if (depth <= 2) return '1-2';
	if (depth <= 9) return '3-9';
	return '10+';
};

for (let tick = 0; tick < ticks; tick++) {
	const now = tick * pollIntervalMs;
	const games = simulator.tick().filter(game => game.status === 'in');

	// Scored before this poll's snapshot is appended, matching runtime decay timing.
	const tickTotals: number[] = [];
	for (const game of games) {
		const gameHistory = history.get(game.id) ?? [];
		const result = computePowerScore(game, gameHistory, 0, winProbHistory.get(game.id) ?? []);
		allTotals.push(result.total);
		(totalsBySport[game.sportType] ??= []).push(result.total);
		(totalsByHistoryDepth[historyDepthBucket(gameHistory.length)] ??= []).push(result.total);
		signalSamples.closeness.push(result.closeness);
		signalSamples.lateGame.push(result.lateGame);
		signalSamples.momentum.push(result.momentum);
		signalSamples.leadChanges.push(result.leadChanges);
		signalSamples.comeback.push(result.comeback);
		if (result.winProbabilityVariance !== undefined) signalSamples.winProbVariance.push(result.winProbabilityVariance);
		if (result.total === 0) zeroTotalCount++;
		liveSampleCount++;
		tickTotals.push(result.total);
	}

	// How far the best live game leads the runner-up — the delta a switch has to clear.
	if (tickTotals.length >= 2) {
		const sortedTickTotals = tickTotals.toSorted((a, b) => b - a);
		switchGaps.push(sortedTickTotals[0]! - sortedTickTotals[1]!);
	}

	for (const game of games) {
		const snapshots = history.get(game.id) ?? [];
		snapshots.push({ gameId: game.id, timestamp: now, homeScore: game.homeTeam.score, awayScore: game.awayTeam.score });
		const cutoff = now - historyWindowMsFor(game);
		while (snapshots.length > 1 && snapshots[0]!.timestamp < cutoff) snapshots.shift();
		history.set(game.id, snapshots);

		const probs = winProbHistory.get(game.id) ?? [];
		probs.push(deriveWinProb(game));
		// Same number of data points as score snapshots, to stay consistent.
		while (probs.length > snapshots.length) probs.shift();
		winProbHistory.set(game.id, probs);
	}
}

const sortedGaps = switchGaps.toSorted((a, b) => a - b);
// Sensitivity levels map to gap percentiles: 7 is the most eager, 1 the least.
const levelToPercentile: Record<number, number> = { 1: 97, 2: 88, 3: 72, 4: 52, 5: 34, 6: 18, 7: 2 };
const suggestedThresholds: Record<number, number> = {};
for (let level = 1; level <= 7; level++) {
	const value = percentile(sortedGaps, levelToPercentile[level]!);
	suggestedThresholds[level] = level === 7 ? Math.max(1, value) : Math.max(1, value);
}

if (ticks > 0) {
	console.log(`\nPowerScore distribution — ${ticks.toLocaleString()} polls, ${liveSampleCount.toLocaleString()} live-game samples\n`);
	console.log('TOTAL');
	console.log(`  ${summarize(allTotals)}`);
	console.log(`  total === 0: ${((zeroTotalCount / Math.max(1, liveSampleCount)) * 100).toFixed(1)}% of live samples\n`);

	console.log('TOTAL by sport');
	for (const sport of Object.keys(totalsBySport).toSorted()) {
		console.log(`  ${sport.padEnd(11)} ${summarize(totalsBySport[sport]!)}`);
	}

	console.log('\nTOTAL by history depth (snapshots available when scored)');
	for (const bucket of ['0', '1-2', '3-9', '10+']) {
		const samples = totalsByHistoryDepth[bucket] ?? [];
		console.log(`  depth ${bucket.padEnd(4)} (n=${samples.length.toLocaleString().padStart(7)})  ${summarize(samples)}`);
	}

	console.log('\nSIGNALS');
	for (const signal of Object.keys(signalSamples) as (keyof typeof signalSamples)[]) {
		const samples = signalSamples[signal];
		const label = signal === 'winProbVariance'
			? `${signal.padEnd(11)} (${samples.length.toLocaleString()} samples with ≥5 data pts)`
			: signal.padEnd(11);
		console.log(`  ${label} ${summarize(samples)}`);
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
}

// Catches ceiling regressions the main simulation masks: by the time it measures distributions
// every game already has rich history.
const makeSnapshotHistory = (count: number, homeScore: number, awayScore: number): ScoreSnapshot[] => (
	Array.from({ length: count }, (_, i) => ({
		gameId: 'stress', timestamp: i * pollIntervalMs, homeScore, awayScore,
	}))
);

const earlyGameScenarios: Array<{ label: string; game: Game; depths: number[] }> = [
	{
		label: 'basketball tied buzzer (NBA Q4 1s)',
		game: { id: 'stress', league: 'nba', sportType: 'basketball', homeTeam: { score: 78, abbreviation: 'HOM' }, awayTeam: { score: 78, abbreviation: 'AWY' }, period: 4, clockSeconds: 1 },
		depths: [0, 1, 3],
	},
	{
		label: 'basketball 1-pt final min (NBA Q4 30s)',
		game: { id: 'stress', league: 'nba', sportType: 'basketball', homeTeam: { score: 80, abbreviation: 'HOM' }, awayTeam: { score: 79, abbreviation: 'AWY' }, period: 4, clockSeconds: 30 },
		depths: [0, 1, 3],
	},
	{
		label: 'hockey 1-goal final min (NHL P3 1m)',
		game: { id: 'stress', league: 'nhl', sportType: 'hockey', homeTeam: { score: 2, abbreviation: 'HOM' }, awayTeam: { score: 1, abbreviation: 'AWY' }, period: 3, clockSeconds: 60 },
		depths: [0, 1, 3],
	},
	{
		label: 'hockey tied final min (NHL P3 1s)',
		game: { id: 'stress', league: 'nhl', sportType: 'hockey', homeTeam: { score: 1, abbreviation: 'HOM' }, awayTeam: { score: 1, abbreviation: 'AWY' }, period: 3, clockSeconds: 1 },
		depths: [0, 1, 3],
	},
	{
		label: 'football 3-pt final min (NFL Q4 1m)',
		game: { id: 'stress', league: 'nfl', sportType: 'football', homeTeam: { score: 21, abbreviation: 'HOM' }, awayTeam: { score: 18, abbreviation: 'AWY' }, period: 4, clockSeconds: 60 },
		depths: [0, 1, 3],
	},
	{
		label: 'baseball 1-run 9th (MLB)',
		game: { id: 'stress', league: 'mlb', sportType: 'baseball', homeTeam: { score: 3, abbreviation: 'HOM' }, awayTeam: { score: 2, abbreviation: 'AWY' }, period: 9, clockSeconds: 0 },
		depths: [0, 1, 3],
	},
	{
		label: 'soccer tied 2nd half 85m (MLS)',
		game: { id: 'stress', league: 'mls', sportType: 'soccer', homeTeam: { score: 1, abbreviation: 'HOM' }, awayTeam: { score: 1, abbreviation: 'AWY' }, period: 2, clockSeconds: 5100 },
		depths: [0, 1, 3],
	},
	{
		label: 'basketball blowout Q4 (NBA Q4 mid)',
		game: { id: 'stress', league: 'nba', sportType: 'basketball', homeTeam: { score: 110, abbreviation: 'HOM' }, awayTeam: { score: 82, abbreviation: 'AWY' }, period: 4, clockSeconds: 400 },
		depths: [0, 1, 3],
	},
];

console.log('\nEARLY-GAME / NO-HISTORY STRESS TEST\n');
console.log('  Validates scores at 0, 1, and 3 snapshot depths — catching ceiling regressions\n');
console.log('  scenario'.padEnd(44) + '  depth  score  closeness  lateGame  signals');
console.log('  ' + '-'.repeat(88));
for (const { label, game, depths } of earlyGameScenarios) {
	for (const depth of depths) {
		const h = makeSnapshotHistory(depth, game.homeTeam.score, game.awayTeam.score);
		const r = computePowerScore(game, h, 0, []);
		const signals = r.closeness + r.lateGame + r.momentum + r.leadChanges + r.comeback;
		const row = [
			`  ${label}`.padEnd(44),
			String(depth).padStart(7),
			String(r.total).padStart(7),
			String(r.closeness).padStart(11),
			String(r.lateGame).padStart(10),
			String(signals).padStart(10),
		].join('');
		console.log(row);
	}
	console.log();
}
