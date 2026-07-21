import { useEffect, useState } from 'react';
import { leagueConfigMap } from '@arenaswap/core/constants';
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

interface summaryDataResult {
	winProbability: number[];
	seriesInfo: SeriesInfo | null;
}

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

const useSummaryData = (game: SummaryGameArg): summaryDataResult => {
	const { id: gameId, league, status } = game;
	const [winProbability, setWinProbability] = useState<number[]>([]);
	const [seriesInfo, setSeriesInfo] = useState<SeriesInfo | null>(null);

	useEffect(() => {
		if (status === 'pre') return;

		// Demo mode: mock- prefixed IDs don't have ESPN summary data
		if (gameId.startsWith('mock-')) {
			setWinProbability(generateMockWinProbs(gameId, game.homeTeam.score, game.awayTeam.score));
			setSeriesInfo(mockSeriesMap[gameId] ?? null);
			return;
		}

		const config = leagueConfigMap[league as LeagueId];
		if (!config) return;

		let cancelled = false;
		const url = `https://site.api.espn.com/apis/site/v2/sports/${config.espnPath}/summary?event=${gameId}`;
		fetch(url, { headers: { Accept: 'application/json' } })
			.then(r => r.json())
			.then((data: Record<string, unknown>) => {
				if (cancelled) return;
				const wp = data?.winprobability;
				// Only replace win probability data with non-empty results. ESPN returns [] during
				// rain delays and brief interruptions even when earlier at-bats produced data, which
				// would clear the chart and variance line mid-game and desync them from the score.
				if (Array.isArray(wp) && wp.length > 0) {
					setWinProbability(wp.map((p: { homeWinPercentage: number }) => p.homeWinPercentage ?? 0.5));
				}
				const series = (data?.seasonseries as SeriesInfo[] | undefined)?.[0];
				if ((series as { type?: string } | undefined)?.type === 'current') {
					setSeriesInfo(series ?? null);
				}
			})
			.catch(() => {});

		return () => { cancelled = true; };
	}, [gameId, league, status, game.homeTeam.score, game.awayTeam.score]);

	return { winProbability, seriesInfo };
};

export default useSummaryData;
