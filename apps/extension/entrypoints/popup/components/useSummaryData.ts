import { useEffect, useRef, useState } from 'react';
import { leagueConfigMap } from '@arenaswap/core/constants';
import { logWarn } from '@arenaswap/core';
import type { Game, LeagueId } from '@arenaswap/core/types';

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
	summary?: string;
	totalCompetitions?: number;
	events?: SeriesEvent[];
}

/** Each side's overall win-loss record, already formatted for display. `null` when unavailable. */
export interface TeamRecords {
	home: string | null;
	away: string | null;
}

interface summaryDataResult {
	winProbability: number[];
	seriesInfo: SeriesInfo | null;
	records: TeamRecords;
}

interface RecordEntry {
	type?: string;
	summary?: string;
	displayValue?: string;
}

interface HeaderCompetitor {
	homeAway?: string;
	team?: { id?: string };
	record?: RecordEntry[];
}

export const emptyTeamRecords: TeamRecords = { home: null, away: null };

/**
 * The `total` entry is the overall record; the rest are splits (home, road, vsconf) we don't show.
 *
 * `summary` is read in preference to `displayValue`. Across every league that had a record to
 * check, the two are identical except in the NHL, where `displayValue` appends the standings
 * points — "28-28-10, 66 PTS" — which is a second statistic wearing the record's clothes and
 * twice the width of the column it has to sit in. `summary` is the bare record everywhere.
 */
const totalRecord = (competitor: HeaderCompetitor | undefined): string | null => {
	const total = competitor?.record?.find(entry => entry.type === 'total');
	const value = (total?.summary ?? total?.displayValue ?? '').trim();
	// ESPN sends `record: []` in the offseason and an empty summary for teams that haven't played,
	// both of which should read as "no record" rather than a blank line under the name.
	return value.length > 0 ? value : null;
};

/**
 * Reads both sides' records out of an ESPN summary payload.
 *
 * Team id is the primary key rather than array position: ESPN orders `competitors` by its own
 * `order` field, which is not the same as away-then-home across every sport. `homeAway` is the
 * fallback for leagues where we synthesize team ids (college hockey) and so can never match.
 */
export const parseTeamRecords = (data: unknown, homeTeamId: string, awayTeamId: string): TeamRecords => {
	const competitors = (data as {
		header?: { competitions?: { competitors?: HeaderCompetitor[] }[] };
	})?.header?.competitions?.[0]?.competitors;
	if (!Array.isArray(competitors)) return emptyTeamRecords;

	const byId = (id: string) => (id ? competitors.find(c => c.team?.id === id) : undefined);
	const bySide = (side: string) => competitors.find(c => c.homeAway === side);

	return {
		home: totalRecord(byId(homeTeamId) ?? bySide('home')),
		away: totalRecord(byId(awayTeamId) ?? bySide('away')),
	};
};

type SummaryGameArg = Pick<Game, 'id' | 'league' | 'status'> & {
	homeTeam: Pick<Game['homeTeam'], 'id' | 'score'>;
	awayTeam: Pick<Game['awayTeam'], 'id' | 'score'>;
};

// Deterministic LCG for mock data — avoids non-determinism in render
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

// Demo mode has no ESPN payload to read records out of, so the simulated games carry canned ones.
// Formats follow each league: W-L, W-L-OTL for hockey, W-D-L for soccer.
const mockRecordsMap: Record<string, TeamRecords> = {
	'mock-1': { home: '18-9', away: '15-12' },
	'mock-2': { home: '41-30', away: '33-38' },
	// Eight characters is the widest a real record gets (NHL W-L-OTL, soccer W-D-L past ten in
	// each column), so this is the entry the column-width test measures against.
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
};

const useSummaryData = (game: SummaryGameArg): summaryDataResult => {
	const { id: gameId, league, status } = game;
	const [winProbability, setWinProbability] = useState<number[]>([]);
	const [seriesInfo, setSeriesInfo] = useState<SeriesInfo | null>(null);
	const [records, setRecords] = useState<TeamRecords>(emptyTeamRecords);
	// Same reasoning as the score snapshot below: the ids only matter at fetch time, and depending
	// on them directly would refetch whenever the caller hands us a fresh team object.
	const teamIdsRef = useRef({ home: game.homeTeam.id, away: game.awayTeam.id });
	teamIdsRef.current = { home: game.homeTeam.id, away: game.awayTeam.id };
	// Snapshotted rather than tracked: the mock generator seeds off the score once, and making
	// the effect depend on a live score would refetch ESPN on every made basket.
	const scoreRef = useRef({ home: game.homeTeam.score, away: game.awayTeam.score });
	scoreRef.current = { home: game.homeTeam.score, away: game.awayTeam.score };

	useEffect(() => {
		// A detail view reused for a different game must not keep showing the previous game's line.
		setWinProbability([]);
		setSeriesInfo(null);
		setRecords(emptyTeamRecords);

		// Demo mode: mock- prefixed IDs don't have ESPN summary data
		if (gameId.startsWith('mock-')) {
			setRecords(mockRecordsMap[gameId] ?? emptyTeamRecords);
			if (status === 'pre') return;
			setWinProbability(generateMockWinProbs(gameId, scoreRef.current.home, scoreRef.current.away));
			setSeriesInfo(mockSeriesMap[gameId] ?? null);
			return;
		}

		const config = leagueConfigMap[league as LeagueId];
		if (!config) return;

		// Fetched once per game rather than per score change: this drives the chart, and the line
		// only moves on the scale of possessions. The volatility figure in the breakdown comes from
		// the background scorer, so nothing here feeds the number the switcher acts on. Pre-game
		// games fetch too — there is no win-probability line yet, but the records are exactly what
		// you want before a game starts, and it is still one request per detail screen opened.
		const controller = new AbortController();
		const url = `https://site.api.espn.com/apis/site/v2/sports/${config.espnPath}/summary?event=${encodeURIComponent(gameId)}`;
		fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal })
			.then(r => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return r.json();
			})
			.then((data: Record<string, unknown>) => {
				const wp = data?.winprobability;
				// Only replace win probability data with non-empty results. ESPN returns [] during
				// rain delays and brief interruptions even when earlier at-bats produced data, which
				// would clear the chart mid-game and desync it from the score.
				if (Array.isArray(wp) && wp.length > 0) {
					setWinProbability(wp.map((p: { homeWinPercentage?: number }) => p.homeWinPercentage ?? 0.5));
				}
				const series = (data?.seasonseries as SeriesInfo[] | undefined)?.[0];
				if ((series as { type?: string } | undefined)?.type === 'current') {
					setSeriesInfo(series ?? null);
				}
				setRecords(parseTeamRecords(data, teamIdsRef.current.home, teamIdsRef.current.away));
			})
			.catch(err => {
				if (err instanceof DOMException && err.name === 'AbortError') return;
				logWarn(`Failed to load summary data for ${gameId}.`, err);
			});

		return () => controller.abort();
	}, [gameId, league, status]);

	return { winProbability, seriesInfo, records };
};

export default useSummaryData;
