// Manual inspection tool, not an automated test: polls a league's public scoreboard every 15s and
// prints a per-poll table so low-scoring sports can be eyeballed for staying alive via decay.
//
// Run: npm run powerscore:validate-live -- <leagueId> [polls]
import { fetchGamesWithLeagueLogos } from '../../packages/core/src/apiClient';
import { computePowerScore } from '../../packages/powerscore/src/scorer';
import { sportTypeConfigMap } from '../../packages/powerscore/src/constants';
import { historyWindowMs as defaultHistoryWindowMs } from '../../packages/core/src/constants';
import { allLeagueIds } from '../../packages/powerscore/src/constants';
import type { Game, ScoreSnapshot, LeagueId } from '../../packages/powerscore/src/types';

const pollIntervalMs = 15_000;
const leagueArg = process.argv[2] as LeagueId | undefined;
const polls = Math.max(1, Number(process.argv[3]) || 20);

if (!leagueArg || !allLeagueIds.includes(leagueArg)) {
	console.error(`Usage: npm run powerscore:validate-live -- <leagueId> [polls]\nLeagues: ${allLeagueIds.join(', ')}`);
	process.exit(1);
}
const league: LeagueId = leagueArg;

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

const historyWindowMsFor = (game: Game): number => (
	sportTypeConfigMap[game.sportType]?.historyWindowMs ?? defaultHistoryWindowMs
);

const history = new Map<string, ScoreSnapshot[]>();
const pad = (value: string | number, width: number) => String(value).padEnd(width);

const runPoll = async (pollIndex: number): Promise<void> => {
	const now = Date.now();
	let games: Game[] = [];
	try {
		const result = await fetchGamesWithLeagueLogos([league], { includeUpcoming: false });
		games = result.games.filter(game => game.status === 'in') as unknown as Game[];
	} catch (error) {
		console.error(`poll ${pollIndex}: fetch failed —`, error instanceof Error ? error.message : error);
		return;
	}

	console.log(`\n── poll ${pollIndex + 1}/${polls} · ${league} · ${new Date(now).toLocaleTimeString()} · ${games.length} live ──`);
	if (games.length === 0) {
		console.log('  (no live games right now)');
	} else {
		console.log(`  ${pad('matchup', 14)}${pad('per', 4)}${pad('clock', 7)}${pad('TOTAL', 6)}${pad('cl', 4)}${pad('lg', 4)}${pad('mo', 4)}${pad('lc', 4)}${pad('cb', 4)}reason`);
		const scored = games
			.map(game => ({ game, score: computePowerScore(game, history.get(game.id) ?? []) }))
			.toSorted((a, b) => b.score.total - a.score.total);
		for (const { game, score } of scored) {
			const matchup = `${game.awayTeam.abbreviation}@${game.homeTeam.abbreviation} ${game.awayTeam.score}-${game.homeTeam.score}`;
			console.log(`  ${pad(matchup, 14)}${pad(game.period, 4)}${pad(game.clockSeconds, 7)}${pad(score.total, 6)}${pad(score.closeness, 4)}${pad(score.lateGame, 4)}${pad(score.momentum, 4)}${pad(score.leadChanges, 4)}${pad(score.comeback, 4)}${score.reason}`);
		}
	}

	for (const game of games) {
		const snapshots = history.get(game.id) ?? [];
		snapshots.push({ gameId: game.id, timestamp: now, homeScore: game.homeTeam.score, awayScore: game.awayTeam.score });
		const cutoff = now - historyWindowMsFor(game);
		while (snapshots.length > 1 && snapshots[0]!.timestamp < cutoff) snapshots.shift();
		history.set(game.id, snapshots);
	}
};

const main = async (): Promise<void> => {
	console.log(`Polling ESPN for ${league} — ${polls} polls @ ${pollIntervalMs / 1000}s. Ctrl-C to stop.`);
	for (let i = 0; i < polls; i++) {
		await runPoll(i);
		if (i < polls - 1) await sleep(pollIntervalMs);
	}
	console.log('\nDone.');
};

main();
