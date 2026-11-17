import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { allLeagueIds, computePowerScore, leagueConfigMap } from 'powerscore';
import type { Game, LeagueId, ScoreSnapshot } from 'powerscore';
import { parseClockToSeconds } from '@arenaswap/sideline/gameClock';
import { formatGameClock, formatPeriod } from '@arenaswap/ui/src/components/gameFormat';
import { isHomeFirst } from '@arenaswap/core/constants';
import { islandTranslator } from '../i18n/islandStrings';

interface EspnCompetitor {
	id: string;
	homeAway: 'home' | 'away' | string;
	score?: string;
	team: {
		displayName: string;
		abbreviation?: string;
		name?: string;
		shortDisplayName?: string;
	};
}

interface EspnCompetition {
	competitors: EspnCompetitor[];
	status: {
		period?: number;
		displayClock?: string;
		type?: {
			state?: string;
			name?: string;
		};
	};
}

interface EspnEvent {
	id: string;
	competitions: EspnCompetition[];
}

interface EspnScoreboardResponse {
	events?: EspnEvent[];
}

const nicknameOf = (team: EspnCompetitor['team'], sportType: Game['sportType']): string | undefined => (
	sportType === 'soccer' ? team.shortDisplayName ?? team.name : team.name ?? team.shortDisplayName
);

interface LiveScoreCard {
	game: Game;
	score: number;
	reason: string;
}

const espnBase = 'https://site.api.espn.com/apis/site/v2/sports';
const refreshIntervalMs = 15000;
const historyMax = 20;

const fullSweepIntervalMs = 120_000;
const requestPoolSize = 6;

const minPollGapMs = 5000;

const parseLiveState = (state?: string): boolean => {
	const normalized = (state ?? '').trim().toLowerCase();
	return normalized === 'in' || normalized === 'in_progress' || normalized === 'inprogress' || normalized === 'live';
};

const buildScoreboardUrl = (leagueId: LeagueId): string => {
	const config = leagueConfigMap[leagueId];
	const params = new URLSearchParams();
	if (leagueId === 'ncaab' || leagueId === 'ncaaw') params.set('groups', '50');
	const query = params.toString();
	const url = `${espnBase}/${config.espnPath}/scoreboard`;
	return query ? `${url}?${query}` : url;
};

const parseLiveGames = (leagueId: LeagueId, payload: EspnScoreboardResponse): Game[] => {
	const config = leagueConfigMap[leagueId];
	return (payload.events ?? []).flatMap(event => {
		const competition = event.competitions?.[0];
		if (!competition) return [];
		const state = competition.status?.type?.state;
		if (!parseLiveState(state)) return [];
		const home = competition.competitors.find(team => team.homeAway === 'home');
		const away = competition.competitors.find(team => team.homeAway === 'away');
		if (!home || !away) return [];

		return [{
			id: event.id,
			league: config.id,
			sportType: config.sportType,
			homeTeam: {
				abbreviation: home.team.abbreviation || home.team.displayName?.slice(0, 3).toUpperCase() || 'HOME',
				nickname: nicknameOf(home.team, config.sportType),
				score: Number.parseInt(home.score ?? '0', 10) || 0,
			},
			awayTeam: {
				abbreviation: away.team.abbreviation || away.team.displayName?.slice(0, 3).toUpperCase() || 'AWAY',
				nickname: nicknameOf(away.team, config.sportType),
				score: Number.parseInt(away.score ?? '0', 10) || 0,
			},
			period: competition.status?.period ?? 1,
			clockSeconds: parseClockToSeconds(competition.status?.displayClock ?? '0:00'),
			intermission: /HALFTIME|END_PERIOD|INTERMISSION/i.test(competition.status?.type?.name ?? ''),
		}];
	});
};

const mapInPool = async <T, R>(items: T[], run: (item: T) => Promise<R>, size = requestPoolSize): Promise<R[]> => {
	const results: R[] = [];
	let next = 0;
	const worker = async (): Promise<void> => {
		while (next < items.length) {
			const index = next;
			next += 1;
			results[index] = await run(items[index] as T);
		}
	};
	await Promise.all(Array.from({ length: Math.min(size, items.length) }, () => worker()));
	return results;
};

interface leagueSweep {
	games: Game[];
	shed: number;
}

const fetchLiveGames = async (leagueIds: LeagueId[]): Promise<leagueSweep> => {
	const perLeague = await mapInPool(leagueIds, async (leagueId): Promise<Game[] | null> => {
		try {
			const res = await fetch(buildScoreboardUrl(leagueId));
			if (!res.ok) return null;
			return parseLiveGames(leagueId, await res.json() as EspnScoreboardResponse);
		} catch {
			return null;
		}
	});

	return {
		games: perLeague.flatMap(games => games ?? []),
		shed: perLeague.filter(games => games === null).length,
	};
};

interface Strings {
	loading: string;
	error: string;
	emptyTitle: string;
	live: string;
}

const LivePowerScores = ({ strings, ui }: { strings: Strings; ui?: Record<string, string> }) => {
	const t = useMemo(() => islandTranslator(ui), [ui]);
	const [cards, setCards] = useState<LiveScoreCard[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const historyRef = useRef<Record<string, ScoreSnapshot[]>>({});

	const hostRef = useRef<HTMLDivElement | null>(null);
	const onScreenRef = useRef(true);
	const liveLeaguesRef = useRef<LeagueId[]>([]);
	const lastSweepRef = useRef(0);
	const lastPollRef = useRef(0);

	const refresh = useCallback(async () => {
		const startedAt = Date.now();
		if (startedAt - lastPollRef.current < minPollGapMs) return;

		const dueForSweep = startedAt - lastSweepRef.current >= fullSweepIntervalMs;
		if (!dueForSweep && liveLeaguesRef.current.length === 0) return;

		const leagueIds = dueForSweep ? allLeagueIds : liveLeaguesRef.current;
		lastPollRef.current = startedAt;
		if (dueForSweep) lastSweepRef.current = startedAt;

		try {
			const { games: liveGames, shed } = await fetchLiveGames(leagueIds);
			if (shed === leagueIds.length) {
				setError(strings.error);
				return;
			}
			if (dueForSweep) liveLeaguesRef.current = [...new Set(liveGames.map(game => game.league))];

			const now = Date.now();
			const nextCards = liveGames.map(game => {
				const nextSnapshot: ScoreSnapshot = {
					gameId: game.id,
					timestamp: now,
					homeScore: game.homeTeam.score,
					awayScore: game.awayTeam.score,
				};
				const prior = historyRef.current[game.id] ?? [];
				const history = [...prior, nextSnapshot].slice(-historyMax);
				historyRef.current[game.id] = history;

				const result = computePowerScore(game, history);
				return { game, score: result.total, reason: result.reason };
			});

			const activeGameIds = new Set(nextCards.map(card => card.game.id));
			for (const gameId of Object.keys(historyRef.current)) {
				if (!activeGameIds.has(gameId)) delete historyRef.current[gameId];
			}

			setCards(nextCards.toSorted((a, b) => b.score - a.score));
			setError(null);
		} catch {
			setError(strings.error);
		} finally {
			setLoading(false);
		}
	}, [strings.error]);

	useEffect(() => {
		let cancelled = false;
		let timer = 0;

		const pollable = (): boolean => onScreenRef.current && document.visibilityState === 'visible';

		const tick = async (): Promise<void> => {
			if (cancelled) return;
			if (pollable()) await refresh();
			if (!cancelled) timer = window.setTimeout(() => void tick(), refreshIntervalMs);
		};
		void tick();

		const onVisibilityChange = (): void => {
			if (pollable()) void refresh();
		};
		document.addEventListener('visibilitychange', onVisibilityChange);

		const host = hostRef.current;
		const observer = new IntersectionObserver(entries => {
			const entry = entries.at(-1);
			if (!entry) return;
			onScreenRef.current = entry.isIntersecting;
			if (pollable()) void refresh();
		}, { rootMargin: '200px' });
		if (host) observer.observe(host);

		return () => {
			cancelled = true;
			window.clearTimeout(timer);
			document.removeEventListener('visibilitychange', onVisibilityChange);
			observer.disconnect();
		};
	}, [refresh]);

	const renderBody = (): ReactNode => {
		if (loading) {
			return (
				<div className='feature-card'>
					<div className='spinner-border text-[var(--color-primary)]' role='status' aria-label={strings.loading}></div>
				</div>
			);
		}

		if (error) {
			return (
				<div className='feature-card'>
					<div className='alert theme-warning mb-0'>{error}</div>
				</div>
			);
		}

		if (cards.length === 0) {
			return (
				<div className='feature-card'>
					<span className='fw-semibold d-block'>{strings.emptyTitle}</span>
				</div>
			);
		}

		return (
			<ol className='ps-live'>
				{cards.slice(0, 8).map(card => (
					<li key={card.game.id} className='ps-live-row'>
						<div className='ps-live-teams'>
							{(isHomeFirst(card.game) ? [card.game.homeTeam, card.game.awayTeam] : [card.game.awayTeam, card.game.homeTeam]).map((team, index) => (
								<div key={index} className='ps-team'>
									<span>{team.abbreviation}</span>
									<span className='ps-team-score'>{team.score}</span>
								</div>
							))}
						</div>
						<div>
							<p className='ps-meta'>
								{leagueConfigMap[card.game.league].label} <span aria-hidden='true'>/</span> {formatPeriod(card.game, t)} {card.game.sportType === 'baseball' ? strings.live : formatGameClock(card.game)}
							</p>
							<p className='ps-live-reason'>{card.reason}</p>
						</div>
						<div className='ps-live-score'>
							<span className='ps-number'>{card.score}</span>
							<span className='ps-score-bar-track' aria-hidden='true'>
								<span className='ps-score-bar-fill' style={{ width: `${card.score}%` }} />
							</span>
						</div>
					</li>
				))}
			</ol>
		);
	};

	return <div ref={hostRef}>{renderBody()}</div>;
};

export default LivePowerScores;
