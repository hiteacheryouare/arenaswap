import { i18n } from '#i18n';
import { createDefaultUserPreferences, createFavoriteTeamKey, isFavoriteTeamGame, normalizeUserPreferences } from '@arenaswap/core/constants';
import type { BackgroundState, ExtensionMessage, Game, GuideSlate, LeagueId, LeagueLogoMap, PowerScoreSnapshot, ScoreSnapshot, TeamMonoLogoMap, UserPreferences } from '@arenaswap/core/types';
import { TranslationContext } from '@arenaswap/ui/src/components/i18nContext';
import ToggleSwitch from '@arenaswap/ui/src/components/toggleSwitch';
import { prefersReducedMotion } from '@arenaswap/ui/src/motion';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { browser } from 'wxt/browser';
import { resolveDecorationDate } from '../../utils/holidayDecorations';
import { isSameLocalDay } from '../../utils/localDay';
import GameDetailView from '../popup/components/gameDetailView';
import GameListHeader from '../popup/components/gameListHeader';
import NoGamesMessage from '@arenaswap/ui/src/components/noGamesMessage';
import UpcomingDayPager from '../popup/components/upcomingDayPager';
import { fetchState, normalizeBackgroundState } from '../../utils/backgroundState';
import { groupByDate, resolveSelectedDayIndex } from '../../utils/gameGroups';
import { getRandomLoadingMessage } from '../../utils/loadingMessages';
import useFavoriteScoreConfetti from '../popup/useFavoriteScoreConfetti';
import { guideConfettiStage } from './guideConfettiStage';
import { loadStoredUserPreferences, saveUserPrefs } from '../../utils/prefsStorage';
import { fullLogoSrc, useTheme } from '../../utils/theme';
import { bandLabel } from './guideFormat';
import GuideGrid from './guideGrid';
import { buildBar, buildHeatCurve } from './guideHeat';
import { msToPx, axisBounds, defaultDayKey, gutterPx, plotWidthOf, nowLinePlotShare } from './guideLayout';
import { displayLocale } from '../../utils/displayLocale';

const setGameBoost = (gameId: string, boost: number) => {
	void browser.runtime.sendMessage({ type: 'SET_GAME_BOOST', gameId, boost } satisfies ExtensionMessage);
};

const startMs = (game: Game): number => (game.startTime ? new Date(game.startTime).getTime() : Number.NaN);

const noGames: Game[] = [];
const noSnapshots: ScoreSnapshot[] = [];
const noPowerScoreSnapshots: PowerScoreSnapshot[] = [];

const App = () => {
	const [prefs, setPrefs] = useState<UserPreferences>(() => createDefaultUserPreferences());
	const prefsRef = useRef(prefs);
	const [prefsLoaded, setPrefsLoaded] = useState(false);
	const theme = useTheme(prefsLoaded ? prefs.theme : null);
	const [slate, setSlate] = useState<GuideSlate | null>(null);
	const [slateFailed, setSlateFailed] = useState(false);
	const [live, setLive] = useState<BackgroundState | null>(null);
	const [loadingMessage] = useState(getRandomLoadingMessage);
	const [plotWidthPx, setPlotWidthPx] = useState(0);
	const [showBand, setShowBand] = useState(true);
	const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
	const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
	const [closingDrawer, setClosingDrawer] = useState(false);
	const drawerRef = useRef<HTMLDialogElement | null>(null);
	const [now, setNow] = useState(() => Date.now());
	const scrollerRef = useRef<HTMLDivElement | null>(null);
	const hasScrolledToNow = useRef(false);

	const loadSlate = useCallback(async (force = false) => {
		try {
			const reply = await browser.runtime.sendMessage({ type: 'GET_GUIDE_SLATE', ...(force ? { force } : {}) } satisfies ExtensionMessage) as GuideSlate | undefined;
			if (!reply) throw new Error('The background did not answer.');
			setSlate(reply);
			setSlateFailed(false);
		} catch {
			setSlateFailed(true);
		}
	}, []);

	useEffect(() => {
		const load = async () => {
			const stored = loadStoredUserPreferences().then(storedPrefs => {
				prefsRef.current = storedPrefs;
				setPrefs(storedPrefs);
				setPrefsLoaded(true);
			});
			await Promise.all([stored, loadSlate(), fetchState().then(setLive, () => {})]);
		};
		void load();
	}, [loadSlate]);

	useEffect(() => {
		const onPrefsChanged = (changes: Record<string, unknown>) => {
			if (!('prefs' in changes)) return;
			void loadStoredUserPreferences().then(storedPrefs => {
				prefsRef.current = storedPrefs;
				setPrefs(storedPrefs);
			});
		};
		browser.storage.local.onChanged.addListener(onPrefsChanged);
		browser.storage.sync.onChanged.addListener(onPrefsChanged);
		return () => {
			browser.storage.local.onChanged.removeListener(onPrefsChanged);
			browser.storage.sync.onChanged.removeListener(onPrefsChanged);
		};
	}, []);

	useEffect(() => {
		let pendingLive: unknown = null;
		let slateStale = false;
		const onMessage = (message: unknown) => {
			const type = (message as { type?: string })?.type;
			if (type !== 'SCORES_UPDATED' && type !== 'GUIDE_SLATE_UPDATED') return;
			if (document.hidden) {
				if (type === 'SCORES_UPDATED') pendingLive = message;
				slateStale = true;
				return;
			}
			if (type === 'SCORES_UPDATED') setLive(normalizeBackgroundState(message));
			void loadSlate();
		};
		const onVisibilityChange = () => {
			if (document.hidden) return;
			if (pendingLive) setLive(normalizeBackgroundState(pendingLive));
			if (slateStale) void loadSlate();
			pendingLive = null;
			slateStale = false;
		};
		browser.runtime.onMessage.addListener(onMessage);
		document.addEventListener('visibilitychange', onVisibilityChange);
		return () => {
			browser.runtime.onMessage.removeListener(onMessage);
			document.removeEventListener('visibilitychange', onVisibilityChange);
		};
	}, [loadSlate]);

	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), 60_000);
		return () => clearInterval(timer);
	}, []);

	useEffect(() => {
		document.title = `${i18n.t('main.guideButton')} \u00b7 ArenaSwap`;
		document.documentElement.lang = displayLocale();
	}, []);

	const openGame = (gameId: string) => {
		setClosingDrawer(false);
		setSelectedGameId(gameId);
	};

	const finishClosingDrawer = () => {
		drawerRef.current?.close();
		setClosingDrawer(false);
		setSelectedGameId(null);
	};

	const closeDrawer = () => {
		if (prefersReducedMotion()) {
			finishClosingDrawer();
			return;
		}
		setClosingDrawer(true);
	};

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape' && selectedGameId) closeDrawer();
		};
		globalThis.addEventListener('keydown', onKeyDown);
		return () => globalThis.removeEventListener('keydown', onKeyDown);
	});

	const toggleFavoriteTeam = (leagueId: LeagueId, teamId: string) => {
		const favoriteTeamKey = createFavoriteTeamKey(leagueId, teamId);
		const current = new Set(prefsRef.current.favoriteTeamIds);
		if (current.has(favoriteTeamKey)) current.delete(favoriteTeamKey);
		else current.add(favoriteTeamKey);
		const next = normalizeUserPreferences({ ...prefsRef.current, favoriteTeamIds: [...current] });
		prefsRef.current = next;
		setPrefs(next);
		void saveUserPrefs(next).catch(() => {});
	};

	const favoriteTeamIds = useMemo(() => new Set(prefs.favoriteTeamIds), [prefs.favoriteTeamIds]);

	const confettiCanvasRef = useFavoriteScoreConfetti({ games: live?.games ?? noGames, favoriteTeamIds, stage: guideConfettiStage });

	const slateGames = useMemo(() => {
		const current = new Map((live?.games ?? []).map(game => [game.id, game]));
		return (slate?.games ?? []).map(game => current.get(game.id) ?? game);
	}, [slate, live]);

	const days = useMemo(() => {
		const dated = slateGames
			.filter(game => Number.isFinite(startMs(game)))
			.toSorted((a, b) => startMs(a) - startMs(b));
		return groupByDate(dated, displayLocale());
	}, [slateGames]);

	const selectedDayIndex = resolveSelectedDayIndex(days, selectedDayKey ?? defaultDayKey(days, now));
	const selectedDay = days[selectedDayIndex];
	const showingToday = selectedDay ? isSameLocalDay(startMs(selectedDay.games[0]!), now) : false;

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

	useEffect(() => {
		if (hasScrolledToNow.current || bars.length === 0 || !showingToday) return;
		const bounds = axisBounds(bars);
		const scroller = scrollerRef.current;
		if (!bounds || !scroller) return;
		hasScrolledToNow.current = true;
		scroller.scrollLeft = Math.max(msToPx(now, bounds.fromMs) - plotWidthOf(scroller.clientWidth) * nowLinePlotShare, 0);
	}, [bars, now, showingToday]);

	const hasBars = bars.length > 0;
	useEffect(() => {
		const scroller = scrollerRef.current;
		if (!hasBars || !scroller) return;
		const observer = new ResizeObserver(() => setPlotWidthPx(plotWidthOf(scroller.clientWidth)));
		observer.observe(scroller);
		return () => observer.disconnect();
	}, [hasBars]);

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

	const selectDay = (index: number) => {
		const next = days[index];
		if (!next) return;
		setSelectedDayKey(next.key);
		hasScrolledToNow.current = false;
		if (scrollerRef.current) scrollerRef.current.scrollLeft = 0;
	};

	const selectedGame = selectedGameId ? slateGames.find(game => game.id === selectedGameId) : undefined;
	const isDrawerOpen = Boolean(selectedGame);

	useLayoutEffect(() => {
		if (isDrawerOpen) drawerRef.current?.show();
	}, [isDrawerOpen]);

	if (selectedGameId && slate && !selectedGame) {
		setSelectedGameId(null);
		setClosingDrawer(false);
	}
	const leagueLogos: LeagueLogoMap = slate?.leagueLogos ?? {};
	const monoLogos: TeamMonoLogoMap = slate?.monoLogos ?? {};
	const hasError = Boolean(slate?.refused) || (slateFailed && !slate);

	return (
		<TranslationContext.Provider value={i18n.t}>
		<div className='guide-page'>
			<header className='guide-header'>
				<img src={fullLogoSrc(theme)} alt='ArenaSwap' className='guide-logo' />
				<h1 className='visually-hidden'>{i18n.t('main.guideButton')}</h1>
				{selectedDay && (
					<div className='guide-day-pager'>
						<UpcomingDayPager
							dayLabel={selectedDay.dateLabel}
							index={selectedDayIndex}
							total={days.length}
							onSelect={selectDay}
						/>
					</div>
				)}
				{hasBars && (
					<div className='guide-band-toggle'>
						<ToggleSwitch id='guideBandToggle' checked={showBand} onChange={() => setShowBand(value => !value)} />
						<label htmlFor='guideBandToggle'>{i18n.t('guide.bestWindow')}</label>
						{showBand && band && <span className='guide-band-summary'>{`\u00b7 ${bandLabel(band, displayLocale())}`}</span>}
					</div>
				)}
			</header>

			<div className='guide-main'>
			{hasBars ? (
				<div className='guide-scroller' ref={scrollerRef}>
					<GuideGrid bars={bars} band={showBand ? band : null} leagueLogos={leagueLogos}
					monoLogos={monoLogos} now={showingToday ? now : null} minPlotPx={plotWidthPx}
					selectedGameId={selectedGameId} onOpen={openGame} theme={theme} />
				</div>
			) : (
				<div className='guide-status'>
					{slate && !hasError
						? <NoGamesMessage onRefresh={() => loadSlate(true)} />
						: <GameListHeader isLoading={!slate && !hasError} hasError={hasError} loadingMessage={loadingMessage} onRefresh={() => loadSlate(true)} />}
				</div>
			)}

			{selectedGame && (
				<dialog
					ref={drawerRef}
					className='guide-drawer'
					aria-label={`${selectedGame.awayTeam.name} ${i18n.t('guide.at')} ${selectedGame.homeTeam.name}`}
					data-closing={closingDrawer ? 'true' : undefined}
					onAnimationEnd={event => {
						if (!closingDrawer || event.target !== event.currentTarget) return;
						finishClosingDrawer();
					}}
				>
					<GameDetailView
						key={selectedGame.id}
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
							holidayChristmasEnabled: prefs.holidayChristmasEnabled,
							holidayBuntingEnabled: prefs.holidayBuntingEnabled,
							holidayFireworksEnabled: prefs.holidayFireworksEnabled,
						}}
						decorationDate={resolveDecorationDate(new Date(), 'real')}
						lastUpdatedAt={live?.leagueLastGoodAt[selectedGame.league]}
						disabledSignals={prefs.disabledSignals}
						favoriteTeamIds={favoriteTeamIds}
						onToggleFavoriteTeam={toggleFavoriteTeam}
						tabAssignEnabled={false}
						dismiss='close'
						onSetGameBoost={setGameBoost}
						onBack={closeDrawer}
						theme={theme}
					/>
				</dialog>
			)}
			</div>
			<canvas ref={confettiCanvasRef} className='guide-confetti-canvas' aria-hidden='true' />
		</div>
		</TranslationContext.Provider>
	);
};

export default App;
