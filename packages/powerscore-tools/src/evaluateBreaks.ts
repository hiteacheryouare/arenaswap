// Scores the commercial-break detector against what really happened. Replays the recordings through
// the same steps the extension takes, then compares every poll's verdict with the dead time in each
// game's post-game play-by-play.
//
// Run: npm run powerscore:breaks -- [options]
//   --recording <path>     a recordings folder, day folder or file (default: scripts/powerscore/recordings)
//   --play-by-play <path>  cached post-game summaries, <league>-<gameId>.json (default: <recordings>/playByPlay)
//   --max-false <share>    the most false alarms a league may raise, as a share of its flagged runs (default 0.05)
//   --leagues a,b          only these leagues (default: all)
//   --examples             list every false alarm
//   --misses               list every break no rule caught
//
// The play-by-play is fetched once per game with `--fetch`, which only asks for games in the
// recordings that have no cached file yet.
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { leagueConfigMap } from 'powerscore';
import type { LeagueId } from '@arenaswap/core';
import { listRecordingFiles, readRecording } from './replay/recording';
import { createReplaySession } from './replay/session';
import { replayPrefs } from './replay/scorers';
import { deadIntervals, playByPlayPath, readPlays } from './breaks/groundTruth';
import { feedLagMs, scoreBreaks, type BreakScore, type GameTrace, type PollFlag } from './breaks/scoreBreaks';

const args = process.argv.slice(2);
const option = (name: string): string | undefined => {
	const index = args.indexOf(`--${name}`);
	return index >= 0 ? args[index + 1] : undefined;
};
const pathOption = (name: string): string | undefined => {
	const value = option(name);
	return value === undefined ? undefined : resolve(process.env.INIT_CWD ?? process.cwd(), value);
};
const flag = (name: string): boolean => args.includes(`--${name}`);

const recordingPath = pathOption('recording') ?? join(__dirname, '..', '..', '..', 'scripts', 'powerscore', 'recordings');
const playByPlayDir = pathOption('play-by-play') ?? join(recordingPath, 'playByPlay');
const maxFalseShare = Number(option('max-false') ?? 0.05);
const leagues = option('leagues') ? new Set(option('leagues')!.split(',') as LeagueId[]) : undefined;

const sportOf = (league: LeagueId): string => leagueConfigMap[league]?.sportType ?? 'basketball';
const isBaseball = (league: LeagueId) => ['baseball', 'softball'].includes(sportOf(league));

const cachedGames = (): Set<string> => new Set(existsSync(playByPlayDir)
	? readdirSync(playByPlayDir).filter(name => name.endsWith('.json')).map(name => name.slice(0, -'.json'.length))
	: []);

const fetchPlayByPlay = async (league: LeagueId, gameId: string): Promise<void> => {
	mkdirSync(playByPlayDir, { recursive: true });
	const url = `https://site.api.espn.com/apis/site/v2/sports/${leagueConfigMap[league]!.espnPath}/summary?event=${gameId}`;
	const response = await fetch(url);
	if (!response.ok) throw new Error(`${response.status} for ${url}`);
	writeFileSync(playByPlayPath(playByPlayDir, league, gameId), await response.text());
	await new Promise(done => setTimeout(done, 1500));
};

const percent = (share: number) => `${(share * 100).toFixed(1)}%`;
const seconds = (value: number | undefined) => (value === undefined ? '-' : `${value}s`);

const row = (league: string, wall: BreakScore, stream: BreakScore, limit: number) => [
	league,
	wall.games,
	wall.hours.toFixed(1),
	`${wall.caught}/${wall.breaks}`,
	percent(wall.pollPrecision),
	`${seconds(wall.latencyMedian)} / ${seconds(stream.latencyMedian)}`,
	`${seconds(wall.releaseMedian)} / ${seconds(stream.releaseMedian)}`,
	`${wall.falseAlarms.length}/${wall.runs}`,
	`${percent(wall.falseAlarmShare)} / ${percent(stream.falseAlarmShare)}`,
	Math.max(wall.falseAlarmShare, stream.falseAlarmShare) <= limit ? 'ok' : 'OVER',
].join(' | ');

const main = async () => {
	const files = listRecordingFiles(recordingPath);
	const traces = new Map<string, PollFlag[]>();
	const leagueOf = new Map<string, LeagueId>();
	const session = createReplaySession([], replayPrefs);
	let cached = cachedGames();

	for await (const event of readRecording(files, undefined, leagues)) {
		const frame = session.handle(event);
		if (!frame) continue;
		for (const game of frame.games.values()) {
			if (game.league !== frame.league) continue;
			leagueOf.set(game.id, game.league);
			const entry = frame.commercialBreaks.get(game.id);
			const polls = traces.get(game.id) ?? [];
			polls.push({ at: frame.ts, kind: entry?.kind, lastPlayId: game.lastPlayId });
			traces.set(game.id, polls);
		}
	}

	if (flag('fetch')) {
		for (const [gameId, league] of leagueOf) {
			if (cached.has(`${league}-${gameId}`) || sportOf(league) === 'soccer') continue;
			await fetchPlayByPlay(league, gameId);
		}
		cached = cachedGames();
	}

	const byLeague = new Map<LeagueId, GameTrace[]>();
	const noTruth = new Map<LeagueId, { polls: number; flagged: number; runs: number; hours: number }>();
	for (const [gameId, polls] of traces) {
		const league = leagueOf.get(gameId)!;
		const plays = cached.has(`${league}-${gameId}`) ? readPlays(playByPlayPath(playByPlayDir, league, gameId)) : [];
		const sport = sportOf(league);
		if (plays.length === 0 || sport === 'soccer') {
			const summary = noTruth.get(league) ?? { polls: 0, flagged: 0, runs: 0, hours: 0 };
			summary.polls += polls.length;
			summary.flagged += polls.filter(poll => poll.kind).length;
			summary.runs += polls.filter((poll, index) => poll.kind && !polls[index - 1]?.kind).length;
			summary.hours += polls.length > 1 ? (polls[polls.length - 1]!.at - polls[0]!.at) / 3_600_000 : 0;
			noTruth.set(league, summary);
			continue;
		}
		const { intervals, action } = deadIntervals(sport, plays);
		byLeague.set(league, [...(byLeague.get(league) ?? []), { gameId, polls, intervals, action, plays }]);
	}

	console.log('Wall time is when the play happened; stream time shifts the truth by the feed\'s median lag.\n');
	console.log('league | games | hours | breaks caught | flags inside a break | first flag, wall / stream | release, wall / stream | false alarms | false share, wall / stream | verdict');
	console.log('--- | --- | --- | --- | --- | --- | --- | --- | --- | ---');
	let failed = false;
	const examples: string[] = [];
	const kindLines: string[] = [];
	const misses: string[] = [];
	for (const [league, leagueTraces] of [...byLeague].toSorted(([a], [b]) => a.localeCompare(b))) {
		const excludeIntermissions = !isBaseball(league);
		const wall = scoreBreaks(leagueTraces, { excludeIntermissions });
		const stream = scoreBreaks(leagueTraces, { excludeIntermissions, shiftMs: feedLagMs(leagueTraces) });
		if (Math.max(wall.falseAlarmShare, stream.falseAlarmShare) > maxFalseShare) failed = true;
		console.log(row(league, wall, stream, maxFalseShare));
		kindLines.push(`  ${league}: ${Object.entries(wall.byKind).map(([kind, tally]) => `${kind} ${tally.falseAlarms}/${tally.runs}`).join(', ')}`);
		for (const miss of wall.missed) misses.push(`${league} ${miss.gameId} ${new Date(miss.start).toISOString()} ${miss.seconds}s ${miss.kind}`);
		for (const alarm of wall.falseAlarms) examples.push(`${league} ${alarm.gameId} ${new Date(alarm.at).toISOString()} ${alarm.seconds}s ${alarm.kind ?? ''}`);
	}

	console.log('\nFalse alarms by kind of break, wall time:');
	console.log(kindLines.join('\n'));

	console.log('\nLeagues without play-by-play (no truth to score against):');
	for (const [league, summary] of [...noTruth].toSorted(([a], [b]) => a.localeCompare(b))) {
		const perHour = summary.hours > 0 ? (summary.runs / summary.hours).toFixed(2) : '-';
		console.log(`  ${league}: ${summary.runs} flagged runs in ${summary.hours.toFixed(1)} live hours (${perHour}/hr), ${percent(summary.polls > 0 ? summary.flagged / summary.polls : 0)} of polls flagged`);
	}

	if (flag('examples') && examples.length > 0) console.log(`\nFalse alarms:\n  ${examples.join('\n  ')}`);
	if (flag('misses') && misses.length > 0) console.log(`\nBreaks no rule caught:\n  ${misses.join('\n  ')}`);
	if (failed) {
		console.error(`\nA league raised more than ${percent(maxFalseShare)} false alarms.`);
		process.exitCode = 1;
	}
};

main().catch(error => {
	console.error(error);
	process.exit(1);
});
