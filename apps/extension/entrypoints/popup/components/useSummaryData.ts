import { useEffect, useRef, useState } from 'react';
import { leagueConfigMap } from '@arenaswap/core/constants';
import { logWarn, pollWinProbabilityMs } from '@arenaswap/core';
import {
	emptyBoxScore,
	emptyLineups,
	emptyMatchup,
	emptyStandings,
	fetchSharedLeagueStandings,
	fetchSummary,
	parseBoxScore,
	parseGameDurationMins,
	parseLeagueStandings,
	parseLineups,
	parseMatchup,
	parseStandings,
	parseTickets,
	parseVenueDetails,
	standingsForMatchup,
	usesFullLeagueStandings,
} from '@arenaswap/sideline';
import type { BoxScore, Lineups, Matchup, StandingsGroup, TicketLink, VenueDetails } from '@arenaswap/sideline';
import type { Game, LeagueId } from '@arenaswap/core/types';
import { emptyTeamRecords, type MonoLogos, type SeriesInfo, type TeamRecords } from '@arenaswap/ui/src/components/detailSummary';
import { hasBoxScoreContent } from './boxScoreColumns';
import { mockStandingsPayloads } from '@arenaswap/sideline/mockStandings';
import { emptyMonoLogos, parseMonoLogos, parseTeamRecords, pickSeriesEntry } from './summaryParsers';
import { generateMockWinProbs, mockGameDurationMins, mockRecordsMap, mockSeriesMap } from './demoSummary';

interface summaryDataResult {
	winProbability: number[];
	seriesInfo: SeriesInfo | null;
	records: TeamRecords;
	monoLogos: MonoLogos;
	boxScore: BoxScore;
	standings: StandingsGroup[];
	gameDurationMins: number | null;
	matchup: Matchup;
	tickets: TicketLink | null;
	venue: VenueDetails | null;
	lineups: Lineups;
}

type SummaryGameArg = Pick<Game, 'id' | 'league' | 'status' | 'sportType'> & {
	homeTeam: Pick<Game['homeTeam'], 'id' | 'score' | 'record' | 'abbreviation'>;
	awayTeam: Pick<Game['awayTeam'], 'id' | 'score' | 'record' | 'abbreviation'>;
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
	const [matchup, setMatchup] = useState<Matchup>(emptyMatchup);
	const [tickets, setTickets] = useState<TicketLink | null>(null);
	const [venue, setVenue] = useState<VenueDetails | null>(null);
	const [lineups, setLineups] = useState<Lineups>(emptyLineups);
	const resolvedRecords: TeamRecords = {
		home: game.homeTeam.record ?? records.home,
		away: game.awayTeam.record ?? records.away,
	};
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

	const lastGameIdRef = useRef<string | null>(null);
	useEffect(() => {
		const sameGame = lastGameIdRef.current === gameId;
		lastGameIdRef.current = gameId;

		if (!sameGame) {
			// oxlint-disable-next-line react/set-state-in-effect
			setWinProbability([]);
			setSeriesInfo(null);
			setRecords(emptyTeamRecords);
			setMonoLogos(emptyMonoLogos);
			setBoxScore(emptyBoxScore);
			setStandings(emptyStandings);
			setGameDurationMins(null);
			setMatchup(emptyMatchup);
			setTickets(null);
			setVenue(null);
			setLineups(emptyLineups);
		}

		if (gameId.startsWith('mock-')) {
			// oxlint-disable-next-line react/set-state-in-effect
			setRecords(mockRecordsMap[gameId] ?? emptyTeamRecords);
			setGameDurationMins(mockGameDurationMins[gameId] ?? null);
			const canned = mockStandingsPayloads[gameId];
			setStandings(usesFullLeagueStandings(league)
				? standingsForMatchup(parseLeagueStandings(canned, gameRef.current.sportType), league, teamIdsRef.current.home, teamIdsRef.current.away)
				: parseStandings(canned, gameRef.current.sportType, teamIdsRef.current.home, teamIdsRef.current.away));
			if (status === 'pre') {
				let cancelled = false;
				import('@arenaswap/sideline/mockMatchup').then(({ mockMatchupPayloads }) => {
					const payload = mockMatchupPayloads[gameId];
					if (cancelled || !payload) return;
					setMatchup(parseMatchup(payload, gameRef.current.sportType, teamIdsRef.current));
					setTickets(parseTickets(payload));
				}).catch(err => logWarn(`Failed to load demo matchup for ${gameId}.`, err));
				return () => { cancelled = true; };
			}
			setWinProbability(generateMockWinProbs(gameId, scoreRef.current.home, scoreRef.current.away));
			setSeriesInfo(mockSeriesMap[gameId] ?? null);
			let cancelled = false;
			import('@arenaswap/sideline/mockBoxScores').then(({ mockBoxScorePayloads }) => {
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

		let cancelled = false;
		let latestRequest = 0;
		const applySummary = (data: Record<string, unknown>) => {
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
			setVenue(parseVenueDetails(data, gameRef.current.sportType));
			if (gameRef.current.sportType === 'soccer') {
				const nextLineups = parseLineups(data, teamIdsRef.current);
				setLineups(previous => (nextLineups.away || nextLineups.home ? nextLineups : previous));
			}
			if (!usesFullLeagueStandings(league)) {
				const nextStandings = parseStandings(
					data,
					gameRef.current.sportType,
					teamIdsRef.current.home,
					teamIdsRef.current.away,
				);
				setStandings(previous => (nextStandings.length > 0 ? nextStandings : previous));
			}
			const nextBoxScore = parseBoxScore(
				data,
				teamIdsRef.current.home,
				teamIdsRef.current.away,
				abbreviationsRef.current.home,
				abbreviationsRef.current.away,
			);
			setBoxScore(previous => (
				hasBoxScoreContent(gameRef.current.sportType, nextBoxScore) || !hasBoxScoreContent(gameRef.current.sportType, previous)
					? nextBoxScore
					: previous
			));
			if (status === 'pre') {
				setMatchup(parseMatchup(data, gameRef.current.sportType, teamIdsRef.current));
				setTickets(parseTickets(data));
			}
		};
		const loadSummary = () => {
			const request = ++latestRequest;
			fetchSummary(config.espnPath, gameId, status)
				.then(raw => {
					if (cancelled || request !== latestRequest) return;
					applySummary(raw as Record<string, unknown>);
				})
				.catch(err => {
					if (!cancelled) logWarn(`Failed to load summary data for ${gameId}.`, err);
				});
		};
		loadSummary();
		const refresh = status === 'in' ? setInterval(() => {
			if (!document.hidden) loadSummary();
		}, pollWinProbabilityMs) : undefined;

		if (usesFullLeagueStandings(league)) {
			fetchSharedLeagueStandings(config.espnPath)
				.then(data => {
					if (!cancelled) setStandings(standingsForMatchup(
						parseLeagueStandings(data, gameRef.current.sportType),
						league,
						teamIdsRef.current.home,
						teamIdsRef.current.away,
					));
				})
				.catch(err => {
					if (!cancelled) logWarn(`Failed to load standings for ${league}.`, err);
				});
		}

		return () => {
			cancelled = true;
			clearInterval(refresh);
		};
	}, [gameId, league, status]);

	return { winProbability, seriesInfo, records: resolvedRecords, monoLogos, boxScore, standings, gameDurationMins, matchup, tickets, venue, lineups };
};

export default useSummaryData;
