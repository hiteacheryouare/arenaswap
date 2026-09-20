import { useEffect, useRef, useState } from 'react';
import { leagueConfigMap } from '@arenaswap/core/constants';
import { logWarn, monoMarksFromLogos } from '@arenaswap/core';
import type { Game, LeagueId, TeamMonoMarks } from '@arenaswap/core/types';
import { emptyBoxScore, parseBoxScore } from './boxScoreParse';
import type { BoxScore } from './boxScoreParse';
import { emptyStandings, parseLeagueStandings, parseStandings, usesFullLeagueStandings } from './standingsParse';
import type { StandingsGroup } from './standingsParse';
import { mockStandingsPayloads } from './mockStandings';

export interface SeriesCompetitor {
	homeAway: string;
	winner?: boolean;
	team: { id: string };
}

export interface SeriesEvent {
	statusType?: { completed?: boolean };
	competitors?: SeriesCompetitor[];
}

export interface SeriesInfo {
	type?: string;
	summary?: string;
	totalCompetitions?: number;
	events?: SeriesEvent[];
}

export interface TeamRecords {
	home: string | null;
	away: string | null;
}

// The monochrome marks ESPN draws for each team, the ones broadcast uses over a photo. Null for a
// team ESPN has drawn none for, which is every club outside North America.
export interface MonoLogos {
	home: TeamMonoMarks | null;
	away: TeamMonoMarks | null;
}

interface summaryDataResult {
	winProbability: number[];
	seriesInfo: SeriesInfo | null;
	records: TeamRecords;
	monoLogos: MonoLogos;
	boxScore: BoxScore;
	// Empty for the leagues ESPN publishes no table for — college hockey, college baseball and
	// softball, Olympic basketball — and for a knockout tie whose two sides came out of different
	// groups. The tab is absent rather than empty in all of those.
	standings: StandingsGroup[];
	// Wall-clock length of a finished game, in whole minutes. The one thing that makes an actual
	// finish time knowable: ESPN publishes no completion timestamp anywhere, so the wrap screen
	// adds this to the start rather than printing an estimate.
	gameDurationMins: number | null;
}

interface RecordEntry {
	type?: string;
	summary?: string;
	displayValue?: string;
}

interface HeaderLogo {
	href?: string;
	rel?: string[];
}

interface HeaderCompetitor {
	homeAway?: string;
	team?: { id?: string; logos?: HeaderLogo[] };
	record?: RecordEntry[];
}

export const emptyTeamRecords: TeamRecords = { home: null, away: null };
export const emptyMonoLogos: MonoLogos = { home: null, away: null };

// The same two `rel` names and the same combiner rewrite the guide's `/teams` fetch uses, read here
// off the `/summary` header instead. One copy, in core, so a renamed `rel` is one edit.
const monoMarksOf = (competitor: HeaderCompetitor | undefined): TeamMonoMarks | null => (
	monoMarksFromLogos(competitor?.team?.logos)
);

// ESPN sends `gameInfo.gameDuration` as "3:14" — hours and minutes, not a clock time. It is
// baseball-only among the leagues sampled, which is why the row it feeds is absent rather than
// blank everywhere else. Anything that is not h:mm is ignored rather than guessed at.
export const parseGameDurationMins = (data: unknown): number | null => {
	const raw = (data as { gameInfo?: { gameDuration?: unknown } })?.gameInfo?.gameDuration;
	if (typeof raw !== 'string') return null;
	const matched = /^(\d{1,2}):([0-5]\d)$/.exec(raw.trim());
	if (!matched) return null;
	return (Number(matched[1]) * 60) + Number(matched[2]);
};

// `summary` beats `displayValue` because the NHL appends standings points there —
// "28-28-10, 66 PTS" — twice the width of the column it has to sit in.
const totalRecord = (competitor: HeaderCompetitor | undefined): string | null => {
	const total = competitor?.record?.find(entry => entry.type === 'total');
	const value = (total?.summary ?? total?.displayValue ?? '').trim();
	// ESPN sends `record: []` in the offseason and an empty summary for teams that haven't
	// played; both should read as "no record".
	return value.length > 0 ? value : null;
};

// Team id is the primary key rather than array position: ESPN orders `competitors` by its own
// `order` field, which is not away-then-home across every sport. `homeAway` is the fallback for
// leagues where we synthesize team ids (college hockey) and so can never match.
const headerCompetitors = (data: unknown): HeaderCompetitor[] | null => {
	const competitors = (data as {
		header?: { competitions?: { competitors?: HeaderCompetitor[] }[] };
	})?.header?.competitions?.[0]?.competitors;
	return Array.isArray(competitors) ? competitors : null;
};

// Resolved by id where ESPN gives one and by side where it does not — the same pairing the box
// score needs, because college hockey ids are synthesized and never match.
const sidesOf = (data: unknown, homeTeamId: string, awayTeamId: string) => {
	const competitors = headerCompetitors(data);
	if (!competitors) return null;
	const byId = (id: string) => (id ? competitors.find(c => c.team?.id === id) : undefined);
	const bySide = (side: string) => competitors.find(c => c.homeAway === side);
	return {
		home: byId(homeTeamId) ?? bySide('home'),
		away: byId(awayTeamId) ?? bySide('away'),
	};
};

export const parseTeamRecords = (data: unknown, homeTeamId: string, awayTeamId: string): TeamRecords => {
	const sides = sidesOf(data, homeTeamId, awayTeamId);
	if (!sides) return emptyTeamRecords;
	return { home: totalRecord(sides.home), away: totalRecord(sides.away) };
};

export const parseMonoLogos = (data: unknown, homeTeamId: string, awayTeamId: string): MonoLogos => {
	const sides = sidesOf(data, homeTeamId, awayTeamId);
	if (!sides) return emptyMonoLogos;
	return { home: monoMarksOf(sides.home), away: monoMarksOf(sides.away) };
};

type SummaryGameArg = Pick<Game, 'id' | 'league' | 'status' | 'sportType'> & {
	homeTeam: Pick<Game['homeTeam'], 'id' | 'score' | 'record' | 'abbreviation'>;
	awayTeam: Pick<Game['awayTeam'], 'id' | 'score' | 'record' | 'abbreviation'>;
};

// Deterministic so mock charts do not change between renders.
const lcgNext = (s: number): number => (s * 1664525 + 1013904223) & 0x7fffffff;

const seedFromStr = (str: string): number => (
	[...str].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) & 0x7fffffff, 7)
);

const generateMockWinProbs = (gameId: string, homeScore: number, awayScore: number): number[] => {
	let s = seedFromStr(gameId);
	const total = homeScore + awayScore;
	const target = total > 0 ? homeScore / total : 0.5;
	let v = 0.5;
	return Array.from({ length: 50 }, (_, i) => {
		s = lcgNext(s);
		const noise = (s / 0x7fffffff - 0.5) * 0.12;
		v += noise + (target - v) * 0.06 * (i / 50);
		return Math.max(0.05, Math.min(0.95, v));
	});
};

const won = (id: string): SeriesEvent => ({
	statusType: { completed: true },
	competitors: [{ homeAway: 'home', winner: true, team: { id } }],
});
const pending = (): SeriesEvent => ({ statusType: { completed: false } });

interface MockSeriesEntry {
	summary: string;
	totalCompetitions: number;
	events: SeriesEvent[];
}

const mockSeriesMap: Record<string, MockSeriesEntry> = {
	'mock-4': {
		summary: 'PHI leads series 2-1',
		totalCompetitions: 7,
		events: [won('22'), won('21'), won('22'), pending(), pending(), pending(), pending()],
	},
	'mock-14': {
		summary: 'BOS leads series 3-2',
		totalCompetitions: 7,
		events: [won('1'), won('3'), won('1'), won('1'), won('3'), pending(), pending()],
	},
	'mock-16': {
		summary: 'Series tied 2-2',
		totalCompetitions: 7,
		events: [won('28'), won('10'), won('28'), won('10'), pending(), pending(), pending()],
	},
};

// The one finished demo game, so the wrap's finish time is reachable without a live slate. 3h22m
// on a ten-inning game, which is what one actually runs to.
const mockGameDurationMins: Record<string, number> = {
	'mock-20': 202,
};

const mockRecordsMap: Record<string, TeamRecords> = {
	'mock-1': { home: '18-9', away: '15-12' },
	'mock-2': { home: '41-30', away: '33-38' },
	// Widest a real record gets (8 chars); the column-width test measures against this entry.
	'mock-3': { home: '28-28-10', away: '30-28-9' },
	'mock-4': { home: '59-53', away: '55-58' },
	'mock-5': { home: '11-4', away: '8-7' },
	'mock-6': { home: '4-7', away: '9-2' },
	'mock-9': { home: '12-6-8', away: '10-9-7' },
	'mock-10': { home: '16-12-4', away: '13-15-3' },
	'mock-11': { home: '20-8', away: '17-11' },
	'mock-12': { home: '18-9-5', away: '17-10-5' },
	'mock-13': { home: '1-1-0', away: '0-1-1' },
	'mock-14': { home: '38-24-6', away: '36-26-7' },
	'mock-15': { home: '45-26', away: '40-31' },
	'mock-16': { home: '90-72', away: '98-64' },
	'mock-17': { home: '28-16', away: '24-20' },
	'mock-20': { home: '81-63', away: '74-70' },
};

// Only the series being played right now. ESPN also ships a 'season' entry holding the whole
// head-to-head — six meetings spread across the year — and a series opener carries that and
// nothing else, so falling back to it captions a series that has not started with the record from
// the last one. It is not reliably index 0 either: a 'preseason' entry can sit in front of it.
export const pickSeriesEntry = (entries: SeriesInfo[] | undefined): SeriesInfo | null => {
	if (!Array.isArray(entries)) return null;
	return entries.find(entry => entry.type === 'current') ?? null;
};

const useSummaryData = (game: SummaryGameArg): summaryDataResult => {
	const { id: gameId, league, status } = game;
	const [winProbability, setWinProbability] = useState<number[]>([]);
	const [seriesInfo, setSeriesInfo] = useState<SeriesInfo | null>(null);
	const [records, setRecords] = useState<TeamRecords>(emptyTeamRecords);
	const [monoLogos, setMonoLogos] = useState<MonoLogos>(emptyMonoLogos);
	const [boxScore, setBoxScore] = useState<BoxScore>(emptyBoxScore);
	const [standings, setStandings] = useState<StandingsGroup[]>(emptyStandings);
	const [gameDurationMins, setGameDurationMins] = useState<number | null>(null);
	// The scoreboard's records win when it has them; the summary is the fallback for the leagues
	// and dates where it does not.
	const resolvedRecords: TeamRecords = {
		home: game.homeTeam.record ?? records.home,
		away: game.awayTeam.record ?? records.away,
	};
	// Snapshotted, not tracked: depending on these directly would refetch whenever the caller
	// hands us a fresh team object, and depending on a live score would refetch ESPN on every
	// made basket. This effect is declared before the fetch below so the refs are already
	// current by the time it runs.
	const teamIdsRef = useRef({ home: game.homeTeam.id, away: game.awayTeam.id });
	const abbreviationsRef = useRef({ home: game.homeTeam.abbreviation, away: game.awayTeam.abbreviation });
	const scoreRef = useRef({ home: game.homeTeam.score, away: game.awayTeam.score });
	const gameRef = useRef(game);
	useEffect(() => {
		teamIdsRef.current = { home: game.homeTeam.id, away: game.awayTeam.id };
		abbreviationsRef.current = { home: game.homeTeam.abbreviation, away: game.awayTeam.abbreviation };
		scoreRef.current = { home: game.homeTeam.score, away: game.awayTeam.score };
		gameRef.current = game;
	});

	// The effect below also runs when a game goes from pre to in, and a team's monochrome marks do
	// not change when it kicks off. Clearing them there dropped a crest that had settled on a mark
	// back to a tinted plate for the length of the refetch, on a sticky bar that stays mounted
	// across the transition.
	const lastGameIdRef = useRef<string | null>(null);
	useEffect(() => {
		const sameGame = lastGameIdRef.current === gameId;
		lastGameIdRef.current = gameId;

		// A detail view reused for a different game must not keep the previous game's line.
		// oxlint-disable-next-line react/set-state-in-effect
		setWinProbability([]);
		setSeriesInfo(null);
		setRecords(emptyTeamRecords);
		if (!sameGame) setMonoLogos(emptyMonoLogos);
		setBoxScore(emptyBoxScore);
		setStandings(emptyStandings);
		setGameDurationMins(null);

		if (gameId.startsWith('mock-')) {
			setRecords(mockRecordsMap[gameId] ?? emptyTeamRecords);
			setGameDurationMins(mockGameDurationMins[gameId] ?? null);
			// Unlike the rest of the demo state, a table is worth showing before a start: it is
			// the context for a game that has not begun. The fixtures are shaped like whichever
			// endpoint the league really answers from, so the demo runs the same parser the live
			// screen does rather than a simplified stand-in.
			const canned = mockStandingsPayloads[gameId];
			setStandings(usesFullLeagueStandings(league)
				? parseLeagueStandings(canned, gameRef.current.sportType)
				: parseStandings(canned, gameRef.current.sportType, teamIdsRef.current.home, teamIdsRef.current.away));
			if (status === 'pre') return;
			setWinProbability(generateMockWinProbs(gameId, scoreRef.current.home, scoreRef.current.away));
			setSeriesInfo(mockSeriesMap[gameId] ?? null);
			// The fixtures are ~22KB no real game can reach, so they stay out of the popup chunk.
			// Every other piece of demo state is already set above; only the box score waits.
			let cancelled = false;
			import('./mockBoxScores').then(({ mockBoxScorePayloads }) => {
				if (cancelled) return;
				setBoxScore(parseBoxScore(
					mockBoxScorePayloads[gameId],
					teamIdsRef.current.home,
					teamIdsRef.current.away,
					abbreviationsRef.current.home,
					abbreviationsRef.current.away,
				));
			}).catch(err => logWarn(`Failed to load demo box score for ${gameId}.`, err));
			return () => { cancelled = true; };
		}

		const config = leagueConfigMap[league as LeagueId];
		if (!config) return;

		// Fetched once per game rather than per score change: the line only moves on the scale of
		// possessions, and the switcher reads volatility from the background scorer, not from here.
		const controller = new AbortController();
		const url = `https://site.api.espn.com/apis/site/v2/sports/${config.espnPath}/summary?event=${encodeURIComponent(gameId)}`;
		fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal })
			.then(r => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return r.json();
			})
			.then((data: Record<string, unknown>) => {
				const wp = data?.winprobability;
				// ESPN returns [] during rain delays and brief interruptions even when earlier play
				// produced data, which would clear the chart mid-game and desync it from the score.
				if (Array.isArray(wp) && wp.length > 0) {
					setWinProbability(wp.map((p: { homeWinPercentage?: number }) => p.homeWinPercentage ?? 0.5));
				}
				setSeriesInfo(pickSeriesEntry(data?.seasonseries as SeriesInfo[] | undefined));
				setRecords(parseTeamRecords(data, teamIdsRef.current.home, teamIdsRef.current.away));
				setMonoLogos(parseMonoLogos(data, teamIdsRef.current.home, teamIdsRef.current.away));
				setGameDurationMins(parseGameDurationMins(data));
				// Only where the whole-league fetch below is not running. Both would otherwise
				// write this state, and whichever landed second would win.
				if (!usesFullLeagueStandings(league)) {
					setStandings(parseStandings(
						data,
						gameRef.current.sportType,
						teamIdsRef.current.home,
						teamIdsRef.current.away,
					));
				}
				setBoxScore(parseBoxScore(
					data,
					teamIdsRef.current.home,
					teamIdsRef.current.away,
					abbreviationsRef.current.home,
					abbreviationsRef.current.away,
				));
			})
			.catch(err => {
				if (err instanceof DOMException && err.name === 'AbortError') return;
				logWarn(`Failed to load summary data for ${gameId}.`, err);
			});

		// The whole league, alongside the summary rather than when the Standings tab is opened.
		// It is 4-15KB gzipped and identical for every game in the league, so the browser serves
		// the second one from cache — and the tab only exists if this answers, so waiting for a
		// click would mean never offering it for the leagues whose summary carries no table at
		// all (college hockey, college baseball and softball).
		if (usesFullLeagueStandings(league)) {
			const standingsUrl = `https://site.api.espn.com/apis/v2/sports/${config.espnPath}/standings?level=3`;
			fetch(standingsUrl, { headers: { Accept: 'application/json' }, signal: controller.signal })
				.then(r => {
					if (!r.ok) throw new Error(`HTTP ${r.status}`);
					return r.json();
				})
				.then((data: unknown) => setStandings(parseLeagueStandings(data, gameRef.current.sportType)))
				.catch(err => {
					if (err instanceof DOMException && err.name === 'AbortError') return;
					logWarn(`Failed to load standings for ${league}.`, err);
				});
		}

		return () => controller.abort();
	}, [gameId, league, status]);

	return { winProbability, seriesInfo, records: resolvedRecords, monoLogos, boxScore, standings, gameDurationMins };
};

export default useSummaryData;
