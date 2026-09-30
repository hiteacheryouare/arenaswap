import { i18n } from '#i18n';
import { createDefaultUserPreferences, isFavoriteTeamGame } from '@arenaswap/core/constants';
import type { BackgroundState, Game, GuideSlate, LeagueLogoMap, PowerScoreSnapshot, ScoreSnapshot, TeamMonoLogoMap, UserPreferences } from '@arenaswap/core/types';
import { TranslationContext } from '@arenaswap/ui/src/components/i18nContext';
import Wordmark from '@arenaswap/ui/src/components/wordmark';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { browser } from 'wxt/browser';
import { resolveDecorationDate } from '../../utils/holidayDecorations';
import GameDetailView from '../popup/components/gameDetailView';
import GameListHeader from '../popup/components/gameListHeader';
import NoGamesMessage from '../popup/components/noGamesMessage';
import { fetchState, getRandomLoadingMessage, groupByDate, normalizeBackgroundState, resolveSelectedDayIndex } from '../popup/popupHelpers';
import useFavoriteScoreConfetti from '../popup/useFavoriteScoreConfetti';
import { loadStoredUserPreferences } from '../../utils/prefsStorage';
import { useTheme } from '../../utils/theme';
import GuideDayPager from './guideDayPager';
import { bandLabel, formatDayDate } from './guideFormat';
import GuideGrid from './guideGrid';
import { buildBar, buildHeatCurve, type guideBar } from './guideHeat';
import { msToPx, axisBounds, defaultDayKey, gutterPx } from './guideLayout';
import useWatchedTabs from './useWatchedTabs';

const setGameBoost = (gameId: string, boost: number) => {
	void browser.runtime.sendMessage({ type: 'SET_GAME_BOOST', gameId, boost });
};

const startMs = (game: Game): number => (game.startTime ? new Date(game.startTime).getTime() : Number.NaN);

const isSameLocalDay = (ms: number, other: number): boolean => {
	const a = new Date(ms);
	const b = new Date(other);
	return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
};

const noGames: Game[] = [];
const noSnapshots: ScoreSnapshot[] = [];
const noPowerScoreSnapshots: PowerScoreSnapshot[] = [];

const prefersReducedMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

// Now sits a third of the way across the plot rather than the scroller, which the league column
// would eat most of.
const scrollToNow = (scroller: HTMLElement, bars: guideBar[], now: number): boolean => {
	const bounds = axisBounds(bars);
	if (!bounds) return false;
	scroller.scrollLeft = Math.max(msToPx(now, bounds.fromMs) - (scroller.clientWidth - gutterPx) / 3, 0);
	return true;
};

const App = () => {
	const [prefs, setPrefs] = useState<UserPreferences>(() => createDefaultUserPreferences());
	const [prefsLoaded, setPrefsLoaded] = useState(false);
	const theme = useTheme(prefsLoaded ? prefs.theme : null);
	const [slate, setSlate] = useState<GuideSlate | null>(null);
	// The popup's state: the scores and PowerScores, which the slate does not carry.
	const [live, setLive] = useState<BackgroundState | null>(null);
	const [loadingMessage] = useState(getRandomLoadingMessage);
	const [plotWidthPx, setPlotWidthPx] = useState(0);
	const [showBand, setShowBand] = useState(true);
	const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
	// A date key rather than an index, because the day list is rebuilt on every poll.
	const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
	const [closingDrawer, setClosingDrawer] = useState(false);
	const [now, setNow] = useState(() => Date.now());
	const scrollerRef = useRef<HTMLDivElement | null>(null);
	const hasScrolledToNow = useRef(false);

	const loadSlate = useCallback(async () => {
		const reply = await browser.runtime.sendMessage({ type: 'GET_GUIDE_SLATE' }) as GuideSlate | undefined;
		if (reply) setSlate(reply);
	}, []);

	// Prefs land on their own, so the theme does not wait on the network.
	useEffect(() => {
		const load = async () => {
			const stored = loadStoredUserPreferences().then(storedPrefs => {
				setPrefs(storedPrefs);
				setPrefsLoaded(true);
			});
			await Promise.all([stored, loadSlate(), fetchState().then(setLive, () => {})]);
		};
		void load();
	}, [loadSlate]);

	// Rides the background's poll broadcast rather than polling on a timer of its own.
	// GUIDE_SLATE_UPDATED is end times that landed after the slate went back.
	useEffect(() => {
		const onMessage = (message: unknown) => {
			const type = (message as { type?: string })?.type;
			if (type === 'SCORES_UPDATED') setLive(normalizeBackgroundState(message));
			if (type === 'SCORES_UPDATED' || type === 'GUIDE_SLATE_UPDATED') void loadSlate();
		};
		browser.runtime.onMessage.addListener(onMessage);
		return () => browser.runtime.onMessage.removeListener(onMessage);
	}, [loadSlate]);

	// Only the now line and the live block floor depend on this, so a minute is plenty.
	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), 60_000);
		return () => clearInterval(timer);
	}, []);

	// Set here rather than in the HTML so the tab's title is translated.
	useEffect(() => {
		document.title = `${i18n.t('main.guideButton')} · ArenaSwap`;
		document.documentElement.lang = browser.i18n.getUILanguage();
	}, []);

	// Picking a game while the last one animates out cancels the exit, which would otherwise drop the
	// new selection with it.
	const openGame = (gameId: string) => {
		setClosingDrawer(false);
		setSelectedGameId(gameId);
	};

	// Under reduced motion there is no animation, so no animationend to wait for.
	const closeDrawer = () => {
		if (prefersReducedMotion()) {
			setSelectedGameId(null);
			return;
		}
		setClosingDrawer(true);
	};

	// Unkeyed on purpose: the handler closes over `selectedGameId`.
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape' && selectedGameId) closeDrawer();
		};
		globalThis.addEventListener('keydown', onKeyDown);
		return () => globalThis.removeEventListener('keydown', onKeyDown);
	});

	const favoriteTeamIds = useMemo(() => new Set(prefs.favoriteTeamIds), [prefs.favoriteTeamIds]);

	// Off the popup's games, which the background re-scores on every poll.
	const confettiCanvasRef = useFavoriteScoreConfetti({ games: live?.games ?? noGames, favoriteTeamIds });

	// A game in the popup's state is the newer copy: the slate is only rebuilt when asked for.
	const slateGames = useMemo(() => {
		const current = new Map((live?.games ?? []).map(game => [game.id, game]));
		return (slate?.games ?? []).map(game => current.get(game.id) ?? game);
	}, [slate, live]);

	// Only days that have something on, so the pager never steps onto an empty one.
	const days = useMemo(() => {
		const dated = slateGames
			.filter(game => Number.isFinite(startMs(game)))
			.toSorted((a, b) => startMs(a) - startMs(b));
		return groupByDate(dated);
	}, [slateGames]);

	const selectedDayIndex = resolveSelectedDayIndex(days, selectedDayKey ?? defaultDayKey(days, now));
	const selectedDay = days[selectedDayIndex];
	const showingToday = selectedDay ? isSameLocalDay(startMs(selectedDay.games[0]!), now) : false;
	const todayIndex = days.findIndex(day => day.key === new Date(now).toDateString());

	const bars = useMemo(() => (
		(selectedDay?.games ?? [])
			.map(game => buildBar(game, isFavoriteTeamGame(game, favoriteTeamIds), now, slate?.endTimes?.[game.id]))
			.filter((bar): bar is NonNullable<typeof bar> => bar !== null)
	), [selectedDay, favoriteTeamIds, now, slate]);

	const { band } = useMemo(
		() => buildHeatCurve(bars, {
			weightFavorites: true,
			favoriteBonusPoints: prefs.favoriteTeamBonusPoints,
			notBeforeMs: showingToday ? now : undefined,
		}),
		[bars, prefs.favoriteTeamBonusPoints, showingToday, now],
	);

	const powers = useMemo(() => new Map((live?.scores ?? []).map(score => [score.gameId, score.total])), [live]);
	const watching = useWatchedTabs(live);

	useEffect(() => {
		const scroller = scrollerRef.current;
		if (hasScrolledToNow.current || bars.length === 0 || !showingToday || !scroller) return;
		hasScrolledToNow.current = scrollToNow(scroller, bars, now);
	}, [bars, now, showingToday]);

	// The grid is drawn at least as wide as the tab, so a short day runs out to the edge.
	const hasBars = bars.length > 0;
	useEffect(() => {
		const scroller = scrollerRef.current;
		if (!hasBars || !scroller) return;
		const observer = new ResizeObserver(() => setPlotWidthPx(scroller.clientWidth - gutterPx));
		observer.observe(scroller);
		return () => observer.disconnect();
	}, [hasBars]);

	// The drawer narrows the grid, which can hide the block just clicked; brought back only if it has gone.
	useEffect(() => {
		const scroller = scrollerRef.current;
		if (!selectedGameId || !scroller) return;
		const shape = scroller.querySelector(`[data-game-id="${CSS.escape(selectedGameId)}"] .guide-bar-shape`);
		if (!shape) return;
		const bar = shape.getBoundingClientRect();
		const view = scroller.getBoundingClientRect();
		const reveal = 8 * 16;
		if (bar.left <= view.right - reveal) return;
		scroller.scrollBy({ left: bar.left - (view.left + gutterPx + reveal), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
	}, [selectedGameId]);

	// Clearing the flag is what lets a page back to today land on now again rather than at breakfast.
	const selectDay = (index: number) => {
		const next = days[index];
		const scroller = scrollerRef.current;
		if (!next) return;
		// Today again, from today: nothing re-renders, so the jump back to now has to happen here.
		if (next.key === selectedDay?.key) {
			if (scroller && showingToday) scrollToNow(scroller, bars, now);
			return;
		}
		setSelectedDayKey(next.key);
		hasScrolledToNow.current = false;
		if (scroller) scroller.scrollLeft = 0;
	};

	const selectedGame = selectedGameId ? slateGames.find(game => game.id === selectedGameId) : undefined;
	const leagueLogos: LeagueLogoMap = slate?.leagueLogos ?? {};
	const monoLogos: TeamMonoLogoMap = slate?.monoLogos ?? {};

	return (
		<TranslationContext.Provider value={i18n.t}>
		<div className='guide-page'>
			<header className='guide-header'>
				<Wordmark className='guide-wordmark' />
				{/* The page has a wordmark and no heading, which leaves a screen reader nothing to
				    announce it by. */}
				<h1 className='visually-hidden'>{i18n.t('main.guideButton')}</h1>
				{selectedDay && (
					<GuideDayPager
						index={selectedDayIndex}
						total={days.length}
						todayIndex={todayIndex === -1 ? null : todayIndex}
						dateLabel={formatDayDate(new Date(selectedDay.key).getTime())}
						onSelect={selectDay}
					/>
				)}
				{/* The summary finishes the sentence the switch's label starts. Absent while there is no
				    grid for it to mark. */}
				{hasBars && (
					<div className='form-check form-switch guide-band-toggle'>
						<input className='form-check-input' type='checkbox' role='switch' id='guideBandToggle' checked={showBand} aria-checked={showBand} onChange={() => setShowBand(value => !value)} />
						<label className='form-check-label' htmlFor='guideBandToggle'>{i18n.t('guide.bestWindow')}</label>
						{showBand && band && <span className='guide-band-summary num'>{bandLabel(band)}</span>}
					</div>
				)}
			</header>

			{/* A sibling of the grid rather than a panel over the page, which covered the header's controls. */}
			<div className='guide-main'>
			{hasBars ? (
				<div className='guide-scroller' ref={scrollerRef}>
					<GuideGrid bars={bars} band={showBand ? band : null} leagueLogos={leagueLogos}
					monoLogos={monoLogos} now={showingToday ? now : null} minPlotPx={plotWidthPx}
					powers={powers} watching={watching}
					selectedGameId={selectedGameId} onOpen={openGame} theme={theme} />
				</div>
			) : (
				// The popup's two states: a wait is a spinner, and only an answer is news.
				<div className='guide-status'>
					{slate
						? <NoGamesMessage onRefresh={() => void loadSlate()} />
						: <GameListHeader isLoading hasError={false} loadingMessage={loadingMessage} onRefresh={() => void loadSlate()} />}
				</div>
			)}

			{selectedGame && (
				<aside
					className='guide-drawer'
					data-closing={closingDrawer ? 'true' : undefined}
					onAnimationEnd={() => {
						if (!closingDrawer) return;
						setClosingDrawer(false);
						setSelectedGameId(null);
					}}
				>
					<GameDetailView
						boardMonoLogos={monoLogos}
						game={selectedGame}
						excitementResult={live?.scores.find(score => score.gameId === selectedGame.id)}
						scoreHistory={live?.scoreHistory[selectedGame.id] ?? noSnapshots}
						powerScoreHistory={live?.powerScoreHistory[selectedGame.id] ?? noPowerScoreSnapshots}
						proTipsEnabled={prefs.proTipsEnabled}
						gameBoosts={live?.gameBoosts ?? slate?.gameBoosts ?? {}}
						bettingPrefs={{ bettingEnabled: prefs.bettingEnabled }}
						weatherPrefs={{ temperatureUnit: prefs.temperatureUnit }}
						decorationPrefs={{
							holidayDecorationsEnabled: prefs.holidayDecorationsEnabled,
							holidaySnowEnabled: prefs.holidaySnowEnabled,
							holidayLightsEnabled: prefs.holidayLightsEnabled,
							holidayLeavesEnabled: prefs.holidayLeavesEnabled,
						}}
						decorationDate={resolveDecorationDate(new Date(), 'real')}
						disabledSignals={prefs.disabledSignals}
						favoriteTeamIds={favoriteTeamIds}
						tabAssignEnabled={false}
						dismiss='close'
						onSetGameBoost={setGameBoost}
						onBack={closeDrawer}
						theme={theme}
					/>
				</aside>
			)}
			</div>
			<canvas ref={confettiCanvasRef} className='guide-confetti-canvas' aria-hidden='true' />
		</div>
		</TranslationContext.Provider>
	);
};

export default App;
