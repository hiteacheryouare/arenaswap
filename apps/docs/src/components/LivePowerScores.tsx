import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { allLeagueIds, computePowerScore, leagueConfigMap } from 'powerscore';
import type { LeagueId, ScoreSnapshot } from 'powerscore';
import type { Game, Team } from '@arenaswap/core/types';
// A dependency-free module, so this island can read it without dragging zod onto a marketing page.
import { parseClockToSeconds } from '@arenaswap/core/gameClock';
import GameTile from '@arenaswap/ui/src/components/gameTile';
import { TranslationContext, islandTranslator } from '../i18n/islandStrings';

interface EspnCompetitor {
	id: string;
	homeAway: 'home' | 'away' | string;
	score?: string;
	team: {
		id?: string;
		displayName: string;
		abbreviation?: string;
		color?: string;
		alternateColor?: string;
		logo?: string;
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

/* ESPN sheds requests from an IP by recent volume and answers 403 to what it drops, so the steady
   rate matters more than any one burst. This page asked all 31 leagues every 15 seconds for as long
   as the tab stayed open: 124 requests a minute to draw eight cards. Now only the leagues with
   something live are asked at that cadence, the full 31 are swept for newcomers every two minutes,
   the sweep is walked a few at a time, and a tab nobody is looking at asks for nothing. */
const fullSweepIntervalMs = 120_000;
const requestPoolSize = 6;

// Scrolling back to the section and returning to the tab both ask for a fresh draw, and neither
// should be worth a request when one just landed.
const minPollGapMs = 5000;

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

// The scoreboard carries each team's colours and crest, which is all a tile needs to draw it the way
// the popup does. ESPN writes the colours without the hash.
const hex = (value?: string) => (value && /^[0-9a-f]{6}$/i.test(value) ? `#${value}` : undefined);

const parseTeam = (competitor: EspnCompetitor, fallback: string): Team => ({
	id: competitor.team.id ?? competitor.id,
	name: competitor.team.displayName,
	abbreviation: competitor.team.abbreviation || competitor.team.displayName?.slice(0, 3).toUpperCase() || fallback,
	score: Number.parseInt(competitor.score ?? '0', 10) || 0,
	color: hex(competitor.team.color),
	alternateColor: hex(competitor.team.alternateColor),
	logo: competitor.team.logo,
});

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
			status: 'in' as const,
			homeTeam: parseTeam(home, 'HOME'),
			awayTeam: parseTeam(away, 'AWAY'),
			period: competition.status?.period ?? 1,
			clockSeconds: parseClockToSeconds(competition.status?.displayClock ?? '0:00'),
			intermission: /HALFTIME|END_PERIOD|INTERMISSION/i.test(competition.status?.type?.name ?? ''),
		}];
	});
};

// The extension pools its own fan-outs through `@arenaswap/core`, but importing that here would pull
// its whole ESPN client and zod onto a marketing page for a twelve-line helper.
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

// A league that failed used to contribute nothing and say nothing, so a page shed on all 31 drew the
// same "nothing is live" panel as a quiet Tuesday. The count comes back so the two can be told apart.
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
	loadingCopy: string;
	error: string;
	emptyTitle: string;
	emptyCopy: string;
}

// `card.reason` is not in here. It is composed by the `powerscore` package from the game state, and
// translating it means translating the package, which is a change to something published on npm on
// its own rather than to this page.
const LiveBoard = ({ strings }: { strings: Strings }) => {
	const [cards, setCards] = useState<LiveScoreCard[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const historyRef = useRef<Record<string, ScoreSnapshot[]>>({});
	const previousClockRef = useRef<Record<string, number>>({});
	const stallRef = useRef<Record<string, number>>({});

	const hostRef = useRef<HTMLDivElement | null>(null);
	const onScreenRef = useRef(true);
	const liveLeaguesRef = useRef<LeagueId[]>([]);
	const lastSweepRef = useRef(0);
	const lastPollRef = useRef(0);

	const refresh = useCallback(async () => {
		const startedAt = Date.now();
		if (startedAt - lastPollRef.current < minPollGapMs) return;

		// With nothing live there is nothing to poll narrowly, so the tick is skipped rather than
		// falling back to all 31 — an evening with no games on is where this page spent the most.
		const dueForSweep = startedAt - lastSweepRef.current >= fullSweepIntervalMs;
		if (!dueForSweep && liveLeaguesRef.current.length === 0) return;

		const leagueIds = dueForSweep ? allLeagueIds : liveLeaguesRef.current;
		lastPollRef.current = startedAt;
		// Stamped before the request, not after, so a sweep that comes back entirely shed backs off to
		// the sweep cadence instead of retrying all 31 on the next tick.
		if (dueForSweep) lastSweepRef.current = startedAt;

		try {
			const { games: liveGames, shed } = await fetchLiveGames(leagueIds);
			if (shed === leagueIds.length) {
				setError(strings.error);
				return;
			}
			// Only a sweep may narrow the rotation. Doing it on a narrow poll would let one shed request
			// drop a league that is mid-game until the next sweep two minutes later.
			if (dueForSweep) liveLeaguesRef.current = [...new Set(liveGames.map(game => game.league))];

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
			setError(strings.error);
		} finally {
			setLoading(false);
		}
	}, [strings.error]);

	useEffect(() => {
		let cancelled = false;
		let timer = 0;

		const pollable = (): boolean => onScreenRef.current && document.visibilityState === 'visible';

		// Self-scheduled rather than on an interval: a sweep that outruns the 15s gap would have the
		// next one start on top of it, which turns a slow answer into more requests.
		const tick = async (): Promise<void> => {
			if (cancelled) return;
			if (pollable()) await refresh();
			if (!cancelled) timer = window.setTimeout(() => void tick(), refreshIntervalMs);
		};
		void tick();

		// `client:visible` decides when this hydrates and nothing after that, so without these two a
		// tab left open on another site, or scrolled well past the section, polls all evening.
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

	// One host element in every state, because the observer above needs something to watch before the
	// first slate has landed and it must not change when the slate does.
	const renderBody = (): ReactNode => {
		if (loading) {
			return (
				<div className='ps-live-state as-loading' role='status'>
					<div className='spinner-border' aria-label={strings.loading}></div>
					<span>{strings.loadingCopy}</span>
				</div>
			);
		}

		if (error) {
			return (
				<div className='ps-live-state as-notice is-quiet is-danger' role='alert'>
					<i className='bi bi-exclamation-circle as-notice-icon' aria-hidden='true' />
					<span className='as-notice-copy'>{error}</span>
				</div>
			);
		}

		if (cards.length === 0) {
			return (
				<div className='ps-live-state as-empty'>
					<h3 className='as-empty-title'>{strings.emptyTitle}</h3>
					<p>{strings.emptyCopy}</p>
				</div>
			);
		}

		return (
			<div className='ps-live'>
				{cards.slice(0, 8).map(card => (
					<figure key={card.game.id} className='ps-live-game'>
						<GameTile
							game={card.game}
							power={card.score}
							tab={leagueConfigMap[card.game.league].label}
						/>
						{card.reason && <figcaption>{card.reason}</figcaption>}
					</figure>
				))}
			</div>
		);
	};

	return <div ref={hostRef}>{renderBody()}</div>;
};

const LivePowerScores = ({ strings, uiStrings }: { strings: Strings; uiStrings?: Record<string, string> }) => (
	<TranslationContext.Provider value={islandTranslator(uiStrings)}>
		<LiveBoard strings={strings} />
	</TranslationContext.Provider>
);

export default LivePowerScores;
