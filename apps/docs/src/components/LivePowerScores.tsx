import { useEffect, useRef, useState } from 'react';
import { allLeagueIds, computePowerScore, leagueConfigMap } from 'powerscore';
import type { Game, LeagueId, ScoreSnapshot } from 'powerscore';

interface EspnCompetitor {
	id: string;
	homeAway: 'home' | 'away' | string;
	score?: string;
	team: {
		displayName: string;
		abbreviation?: string;
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

interface LiveScoreCard {
	game: Game;
	score: number;
	reason: string;
}

const espnBase = 'https://site.api.espn.com/apis/site/v2/sports';
const refreshIntervalMs = 15000;
const historyMax = 20;

const parseClockToSeconds = (clock: string): number => {
	const parts = clock.split(':');
	if (parts.length !== 2) return 0;
	const [min, sec] = parts.map(Number);
	return ((min ?? 0) * 60) + (sec ?? 0);
};

const parseLiveState = (state?: string): boolean => {
	const normalized = (state ?? '').trim().toLowerCase();
	return normalized === 'in' || normalized === 'in_progress' || normalized === 'inprogress' || normalized === 'live';
};

const buildScoreboardUrl = (leagueId: LeagueId): string => {
	const config = leagueConfigMap[leagueId];
	const params = new URLSearchParams();
	if (leagueId === 'ncaab') params.set('groups', '50');
	if (leagueId === 'ncaaw') params.set('groups', '49');
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
				score: Number.parseInt(home.score ?? '0', 10) || 0,
			},
			awayTeam: {
				abbreviation: away.team.abbreviation || away.team.displayName?.slice(0, 3).toUpperCase() || 'AWAY',
				score: Number.parseInt(away.score ?? '0', 10) || 0,
			},
			period: competition.status?.period ?? 1,
			clockSeconds: parseClockToSeconds(competition.status?.displayClock ?? '0:00'),
			intermission: /HALFTIME|END_PERIOD|INTERMISSION/i.test(competition.status?.type?.name ?? ''),
		}];
	});
};

const fetchLiveGames = async (): Promise<Game[]> => {
	const settled = await Promise.allSettled(
		allLeagueIds.map(async leagueId => {
			const res = await fetch(buildScoreboardUrl(leagueId));
			if (!res.ok) return [];
			const payload = await res.json() as EspnScoreboardResponse;
			return parseLiveGames(leagueId, payload);
		})
	);

	return settled.flatMap(result => result.status === 'fulfilled' ? result.value : []);
};

// `clockSeconds` and `period` are optional on Game (pre-game and clockless sports omit them),
// so both fall back the same way the extension's own card formatters do.
const formatClock = (clockSeconds: number | undefined): string => {
	if (clockSeconds === undefined) return '';
	const mins = Math.floor(clockSeconds / 60);
	const secs = clockSeconds % 60;
	return `${mins}:${String(secs).padStart(2, '0')}`;
};

const formatPeriod = (game: Game): string => {
	const config = leagueConfigMap[game.league];
	const period = game.period ?? 1;
	if (config.periodFormat === 'innings') return `Inning ${period}`;
	if (period > config.regularPeriods) return 'OT';
	if (config.periodFormat === 'quarters') return `Q${period}`;
	if (config.periodFormat === 'halves') return `H${period}`;
	return `P${period}`;
};

const LivePowerScores = () => {
	const [cards, setCards] = useState<LiveScoreCard[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const historyRef = useRef<Record<string, ScoreSnapshot[]>>({});
	const previousClockRef = useRef<Record<string, number>>({});
	const stallRef = useRef<Record<string, number>>({});

	const refresh = async () => {
		try {
			const liveGames = await fetchLiveGames();
			const now = Date.now();
			const nextCards = liveGames.map(game => {
				const prevClock = previousClockRef.current[game.id];
				const nextStall = prevClock === game.clockSeconds
					? (stallRef.current[game.id] ?? 0) + 1
					: 0;
				stallRef.current[game.id] = nextStall;
				previousClockRef.current[game.id] = game.clockSeconds ?? 0;

				const nextSnapshot: ScoreSnapshot = {
					gameId: game.id,
					timestamp: now,
					homeScore: game.homeTeam.score,
					awayScore: game.awayTeam.score,
				};
				const prior = historyRef.current[game.id] ?? [];
				const history = [...prior, nextSnapshot].slice(-historyMax);
				historyRef.current[game.id] = history;

				const result = computePowerScore(game, history, nextStall);
				return { game, score: result.total, reason: result.reason };
			});

			const activeGameIds = new Set(nextCards.map(card => card.game.id));
			for (const gameId of Object.keys(historyRef.current)) {
				if (!activeGameIds.has(gameId)) delete historyRef.current[gameId];
			}
			for (const gameId of Object.keys(previousClockRef.current)) {
				if (!activeGameIds.has(gameId)) delete previousClockRef.current[gameId];
			}
			for (const gameId of Object.keys(stallRef.current)) {
				if (!activeGameIds.has(gameId)) delete stallRef.current[gameId];
			}

			setCards(nextCards.toSorted((a, b) => b.score - a.score));
			setError(null);
		} catch {
			setError('Unable to load live game data right now.');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		void refresh();
		const timer = window.setInterval(() => {
			void refresh();
		}, refreshIntervalMs);
		return () => window.clearInterval(timer);
	}, []);

	if (loading) {
		return (
			<div className='feature-card'>
				<div className='d-flex align-items-center gap-3'>
					<div className='spinner-border text-[var(--color-primary)]' role='status' aria-label='Loading live power scores'></div>
					<span className='section-sub mb-0'>Pulling live games and computing PowerScore now.</span>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className='feature-card'>
				<div className='alert alert-warning mb-0'>{error}</div>
			</div>
		);
	}

	if (cards.length === 0) {
		return (
			<div className='feature-card'>
				<span className='fw-semibold mb-3 d-block'>No live games right now</span>
				<p className='mb-0 section-sub'>
					When games go live, this section will auto-refresh and show real-time PowerScores across all supported leagues.
				</p>
			</div>
		);
	}

	return (
		<div className='d-flex flex-column gap-3'>
			{cards.slice(0, 8).map(card => (
				<div key={card.game.id} className='feature-card py-3 px-3'>
					<div className='d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2'>
						<span className='text-[0.75rem] tracking-[0.08em] text-[var(--color-muted)]'>
							{leagueConfigMap[card.game.league].label.toUpperCase()}
						</span>
						<span className='badge rounded-pill text-bg-dark px-3 py-2 text-[0.78rem]'>
							PowerScore {card.score} / 100
						</span>
					</div>
					<div className='d-flex align-items-center justify-content-between gap-2'>
						<div className='d-flex align-items-center gap-2'>
							<span className='fw-semibold'>{card.game.awayTeam.abbreviation}</span>
							<span className='text-[var(--color-muted)]'>{card.game.awayTeam.score}</span>
						</div>
						<div className='text-center text-[0.78rem] text-[var(--color-muted)]'>
							<div>{formatPeriod(card.game)}</div>
							<div>{card.game.sportType === 'baseball' ? 'Live' : formatClock(card.game.clockSeconds)}</div>
						</div>
						<div className='d-flex align-items-center gap-2'>
							<span className='text-[var(--color-muted)]'>{card.game.homeTeam.score}</span>
							<span className='fw-semibold'>{card.game.homeTeam.abbreviation}</span>
						</div>
					</div>
					<div className='mt-1 text-[0.78rem] text-[var(--color-muted)]'>{card.reason}</div>
					<div className='ps-score-bar-track'>
						<div className='ps-score-bar-fill' style={{ width: `${card.score}%` }} />
					</div>
				</div>
			))}
		</div>
	);
};

export default LivePowerScores;
