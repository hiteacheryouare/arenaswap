// Turns a night of raw recordings into the data file the films are rendered from.
//
// Run: npm run film:extract -- [--recording <day folder or file>]
// Reads: scripts/powerscore/recordings/2026-10-03 (gitignored; made by `npm run powerscore:record`)
// Writes: scripts/film/data/saturday.json (committed, so a render never needs the recording)
//
// Every poll is played through the same steps background.ts takes, with the same core functions:
// clock stalls, `scoreLiveGame` against the history so far, then the score and PowerScore history.
// Nothing here scores a game any other way.
import { createReadStream, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import { constants as zlibConstants, createGunzip } from 'node:zlib';
import { parseScoreboardEvents, parseWinProbability } from '../../../packages/core/src/apiClient';
import { createLiveExtras } from '../../../packages/core/src/liveExtras';
import { getHistoryWindowMsForGame, nextClockStall, retainSnapshots, scoreLiveGame, toLiveScore, toScoreSnapshot, type ClockStallEntry } from '../../../packages/core/src/scoring';
import { leagueConfigMap, sportTypeConfigMap } from '../../../packages/powerscore/src/constants';
import { resolveLeagueLogoUrl } from '../../../packages/core/src/constants';
import type { Game, LeagueId, LeagueLogoMap } from '../../../packages/core/src/types';
import type { ScoreSnapshot } from '../../../packages/powerscore/src/types';
import { listRecordingFiles } from '../../powerscore/replay/recording';
import { detailGameIds, guideAt, kentuckyKey, profiles, slateFrom, slateTo, summaryMoments, viewerLeagues, wallAt, type ProfileName } from './slateConfig';
import trimSummary from './trimSummary';
import type { FilmSlate, GameTrack, ScoreEntry, WallGame } from '../stage/data/slateTypes';
import { createFavoriteTeamKey } from '../../../packages/core/src/constants';

interface RawEvent {
	id?: string;
	status?: { type?: { state?: string } };
}

type RecordedLine =
	| { t: 'meta'; ts: number; gitSha?: string }
	| { t: 'scoreboard'; ts: number; league: LeagueId; events: RawEvent[]; unchanged: string[] }
	| { t: 'summary'; ts: number; league: LeagueId; gameId: string; raw: Record<string, unknown> }
	| { t: 'situation'; ts: number; league: LeagueId; gameId: string; raw: Record<string, unknown> }
	| { t: 'standings'; ts: number; league: LeagueId; raw: unknown };

const args = process.argv.slice(2);
const option = (name: string) => {
	const index = args.indexOf(`--${name}`);
	return index >= 0 ? args[index + 1] : undefined;
};

const root = join(__dirname, '..', '..', '..');
const recordingPath = option('recording') ?? join(root, 'scripts', 'powerscore', 'recordings', '2026-10-03');
const outFile = option('out') ?? join(root, 'scripts', 'film', 'data', 'saturday.json');

const readLines = async function* (file: string): AsyncGenerator<RecordedLine> {
	const gunzip = createGunzip({ finishFlush: zlibConstants.Z_SYNC_FLUSH });
	const lines = createInterface({ input: createReadStream(file).pipe(gunzip), crlfDelay: Infinity });
	for await (const line of lines) {
		if (!line) continue;
		try {
			yield JSON.parse(line) as RecordedLine;
		} catch {
			// A recording still being written ends mid-line.
		}
	}
};

// Our sources' broadcaster names include our sources. The films never name them.
const withoutSourceNames = (game: Game): Game => {
	if (!game.broadcasts) return game;
	const broadcasts = game.broadcasts.filter(name => !/espn/i.test(name));
	const { broadcasts: _dropped, ...rest } = game;
	return broadcasts.length > 0 ? { ...rest, broadcasts } : rest;
};

const isViewerGame = (game: Game) => viewerLeagues.includes(game.league);

// Only the fields that changed since the last frame, so a clock tick costs a few bytes.
const deltaOf = (previous: Game | undefined, next: Game): Partial<Game> => {
	if (!previous) return next;
	const delta: Record<string, unknown> = {};
	const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
	for (const key of keys) {
		const before = (previous as unknown as Record<string, unknown>)[key];
		const after = (next as unknown as Record<string, unknown>)[key];
		if (JSON.stringify(before) !== JSON.stringify(after)) delta[key] = after === undefined ? null : after;
	}
	return delta as Partial<Game>;
};

const main = async () => {
	const files = listRecordingFiles(recordingPath);
	const rawById = new Map<string, RawEvent>();
	const gameById = new Map<string, Game>();
	const leagueOf = new Map<string, LeagueId>();
	const liveIdsByLeague = new Map<LeagueId, Set<string>>();
	const history = new Map<string, ScoreSnapshot[]>();
	const stalls = new Map<string, ClockStallEntry>();
	const winProbability = new Map<string, number[]>();
	const liveExtras = createLiveExtras();
	const leagueLogos: LeagueLogoMap = Object.fromEntries(viewerLeagues.map(league => [league, resolveLeagueLogoUrl(league)]));

	const tracks: Record<string, GameTrack> = {};
	const lastFramed = new Map<string, Game>();
	const scoreTracks: Record<ProfileName, Record<string, ScoreEntry[]>> = { plain: {}, fan: {} };
	const lastScoreKey: Record<ProfileName, Map<string, string>> = { plain: new Map(), fan: new Map() };
	const summaries: Record<string, [number, unknown][]> = {};
	const winProbabilities: Record<string, [number, number[]][]> = {};
	const pendingMoments = [...summaryMoments];
	const lastSummary = new Map<string, [number, Record<string, unknown>]>();
	let wall: WallGame[] = [];
	let guideGames: Game[] = [];
	let recorderSha: string | undefined;

	for (const file of files) {
		for await (const line of readLines(file)) {
			if (line.ts > slateTo) break;
			if (line.t === 'meta') {
				recorderSha ??= line.gitSha;
				continue;
			}
			if (line.t === 'summary') {
				const probability = parseWinProbability(line.raw);
				if (probability.length > 0) winProbability.set(line.gameId, probability);
				const game = gameById.get(line.gameId) ?? { id: line.gameId, sportType: leagueConfigMap[line.league]?.sportType ?? 'basketball' };
				liveExtras.ingestSummary(game as Game, line.raw, line.ts);
				if (!detailGameIds.includes(line.gameId) || line.ts < slateFrom) continue;
				lastSummary.set(line.gameId, [line.ts, line.raw]);
				const series = (winProbabilities[line.gameId] ??= []);
				if (probability.length > 0 && (series.length === 0 || line.ts - series[series.length - 1]![0] >= 60_000)) series.push([line.ts, probability]);
				continue;
			}
			if (line.t === 'situation') {
				// The gate background.ts applies before it fetches one, as the replay harness does.
				const game = gameById.get(line.gameId);
				const margin = game ? Math.abs(game.homeTeam.score - game.awayTeam.score) : Infinity;
				if (game?.league === 'nhl' && !game.intermission && !game.delayed && margin <= (sportTypeConfigMap.hockey?.closenessMargins[2] ?? 3)) liveExtras.ingestSituation(line.gameId, line.raw);
				continue;
			}
			if (line.t === 'standings') {
				liveExtras.ingestStandings(line.league, leagueConfigMap[line.league]?.sportType ?? 'basketball', line.raw);
				continue;
			}

			const { ts, league } = line;
			// A box score is taken from the last summary recorded before its moment.
			for (let index = pendingMoments.length - 1; index >= 0; index--) {
				const [gameId, at] = pendingMoments[index]!;
				const latest = lastSummary.get(gameId);
				if (ts < at || !latest) continue;
				(summaries[gameId] ??= []).push([latest[0], trimSummary(latest[1])]);
				pendingMoments.splice(index, 1);
			}
			for (const raw of line.events) {
				if (!raw.id) continue;
				rawById.set(raw.id, raw);
				const parsed = parseScoreboardEvents({ events: [raw] }, league)[0];
				if (parsed) {
					gameById.set(raw.id, withoutSourceNames(parsed));
					leagueOf.set(raw.id, league);
				}
			}
			const liveIds = new Set([
				...line.events.filter(raw => raw.status?.type?.state === 'in').map(raw => raw.id!),
				...line.unchanged,
			]);
			liveIdsByLeague.set(league, liveIds);

			const fresh = [...liveIds].map(id => gameById.get(id)).filter((game): game is Game => game?.status === 'in');
			for (const game of fresh) {
				const stall = nextClockStall(game, stalls.get(game.id));
				if (stall) stalls.set(game.id, stall);
			}

			const allLive = [...liveIdsByLeague.values()].flatMap(ids => [...ids])
				.map(id => gameById.get(id))
				.filter((game): game is Game => game?.status === 'in');

			if (ts >= slateFrom) {
				for (const profile of Object.keys(profiles) as ProfileName[]) {
					const prefs = profiles[profile];
					const favorites = new Set(prefs.favoriteTeamIds);
					for (const game of allLive.filter(isViewerGame)) {
						// The fan only differs from the plain viewer on Kentucky's games.
						const isFavorite = [game.homeTeam.id, game.awayTeam.id].some(id => createFavoriteTeamKey(game.league, id) === kentuckyKey);
						if (profile === 'fan' && !isFavorite) continue;
						const score = toLiveScore(scoreLiveGame({
							game,
							history: history.get(game.id) ?? [],
							stallCount: stalls.get(game.id)?.stallCount ?? 0,
							winProbability: winProbability.get(game.id) ?? [],
							now: ts,
							extras: liveExtras.contextFor(game, ts),
						}, prefs, 0, favorites));
						// The history a snapshot is built from only advances for the league that polled.
						if (game.league !== league) continue;
						const series = (scoreTracks[profile][game.id] ??= []);
						if (detailGameIds.includes(game.id) || isFavorite) {
							const key = JSON.stringify(score);
							series.push([ts, lastScoreKey[profile].get(game.id) === key ? null : score]);
							lastScoreKey[profile].set(game.id, key);
						} else {
							const key = `${score.total}|${score.reason}|${score.stalled}`;
							if (lastScoreKey[profile].get(game.id) !== key) series.push([ts, { total: score.total, reason: score.reason, stalled: score.stalled }]);
							lastScoreKey[profile].set(game.id, key);
						}
					}
				}

				// Every game in the polled league that the viewer can see, live or not.
				for (const [id, game] of gameById) {
					if (leagueOf.get(id) !== league || !isViewerGame(game)) continue;
					const track = (tracks[id] ??= { league, frames: [] });
					const delta = deltaOf(lastFramed.get(id), game);
					if (game.status === 'in' || Object.keys(delta).length > 0) track.frames.push([ts, delta]);
					lastFramed.set(id, game);
				}
			}

			for (const game of fresh) {
				const snapshots = history.get(game.id) ?? [];
				snapshots.push(toScoreSnapshot(game, ts));
				history.set(game.id, retainSnapshots(snapshots, ts - getHistoryWindowMsForGame(game), false));
			}

			if (ts <= wallAt) {
				wall = allLive.map(game => ({
					id: game.id,
					league: game.league,
					away: { abbreviation: game.awayTeam.abbreviation, score: game.awayTeam.score, color: game.awayTeam.color, logo: game.awayTeam.logo },
					home: { abbreviation: game.homeTeam.abbreviation, score: game.homeTeam.score, color: game.homeTeam.color, logo: game.homeTeam.logo },
				}));
			}
			if (ts <= guideAt) guideGames = [...gameById.values()].filter(isViewerGame);
		}
	}

	const slate: FilmSlate = {
		source: {
			recording: 'scripts/powerscore/recordings/2026-10-03',
			recorderGitSha: recorderSha,
			from: new Date(slateFrom).toISOString(),
			to: new Date(slateTo).toISOString(),
			wallAt: new Date(wallAt).toISOString(),
			guideAt: new Date(guideAt).toISOString(),
		},
		leagueLogos,
		games: tracks,
		scores: scoreTracks,
		summaries,
		winProbabilities,
		wall,
		guide: { games: guideGames, leagueLogos, monoLogos: {}, gameBoosts: {}, endTimes: {} },
	};

	mkdirSync(dirname(outFile), { recursive: true });
	const json = JSON.stringify(slate);
	writeFileSync(outFile, json);
	const frames = Object.values(tracks).reduce((total, track) => total + track.frames.length, 0);
	console.log(`${Object.keys(tracks).length} games, ${frames} frames, ${wall.length} on the wall, ${(json.length / 1e6).toFixed(1)} MB → ${outFile}`);
};

void main();
