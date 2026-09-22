import { i18n } from '#i18n';
import { createDefaultUserPreferences, isFavoriteTeamGame } from '@arenaswap/core/constants';
import type { Game, GuideSlate, LeagueLogoMap, TeamMonoLogoMap, UserPreferences } from '@arenaswap/core/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { browser } from 'wxt/browser';
import { resolveDecorationDate } from '../../utils/holidayDecorations';
import GameDetailView from '../popup/components/gameDetailView';
import UpcomingDayPager from '../popup/components/upcomingDayPager';
import { groupByDate, resolveSelectedDayIndex } from '../popup/popupHelpers';
import { loadStoredUserPreferences } from '../../utils/prefsStorage';
import { bandLabel } from './guideFormat';
import GuideGrid from './guideGrid';
import { buildBar, buildHeatCurve } from './guideHeat';
import { msToPx, axisBounds, defaultDayKey, gutterPx } from './guideLayout';

// The boost control in the drawer is the real one, not a decoration: a slider that moves and
// changes nothing is worse than no slider.
const setGameBoost = (gameId: string, boost: number) => {
	void browser.runtime.sendMessage({ type: 'SET_GAME_BOOST', gameId, boost });
};

const startMs = (game: Game): number => (game.startTime ? new Date(game.startTime).getTime() : Number.NaN);

const isSameLocalDay = (ms: number, other: number): boolean => {
	const a = new Date(ms);
	const b = new Date(other);
	return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
};

const App = () => {
	const [prefs, setPrefs] = useState<UserPreferences>(() => createDefaultUserPreferences());
	const [slate, setSlate] = useState<GuideSlate | null>(null);
	const [showBand, setShowBand] = useState(true);
	const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
	// Held as a date key rather than an index, for the reason resolveSelectedDayIndex documents: the
	// day list is rebuilt on every poll, so an index would silently land on a different date.
	const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
	const [closingDrawer, setClosingDrawer] = useState(false);
	const [now, setNow] = useState(() => Date.now());
	const scrollerRef = useRef<HTMLDivElement | null>(null);
	const hasScrolledToNow = useRef(false);

	const loadSlate = useCallback(async () => {
		const reply = await browser.runtime.sendMessage({ type: 'GET_GUIDE_SLATE' }) as GuideSlate | undefined;
		if (reply) setSlate(reply);
	}, []);

	// Both reads go out together rather than one after the other: neither depends on the other, and
	// both sit in front of the first paint.
	useEffect(() => {
		const load = async () => {
			const [stored] = await Promise.all([loadStoredUserPreferences(), loadSlate()]);
			setPrefs(stored);
		};
		void load();
	}, [loadSlate]);

	// The background already broadcasts on every poll, so the guide rides that rather than polling
	// on a timer of its own. The second message is end times that landed after the slate went back.
	useEffect(() => {
		const onMessage = (message: unknown) => {
			const type = (message as { type?: string })?.type;
			if (type === 'SCORES_UPDATED' || type === 'GUIDE_SLATE_UPDATED') void loadSlate();
		};
		browser.runtime.onMessage.addListener(onMessage);
		return () => browser.runtime.onMessage.removeListener(onMessage);
	}, [loadSlate]);

	// Only the now line and the live bar floor depend on this, so a minute is plenty.
	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), 60_000);
		return () => clearInterval(timer);
	}, []);

	// The tab's own title, which is what the reader sees in the tab strip beside the games they are
	// watching. Set here rather than in the HTML so it is translated.
	useEffect(() => {
		// 'ArenaSwap' is a proper noun and is not translated anywhere else either. extName is the full
		// store listing name, which is far too long for a tab strip.
		document.title = `${i18n.t('main.guideButton')} \u00b7 ArenaSwap`;
	}, []);

	// Clearing the closing flag matters: picking a second game while the first is animating out has
	// to cancel that exit rather than let it finish and drop the new selection with it.
	const openGame = (gameId: string) => {
		setClosingDrawer(false);
		setSelectedGameId(gameId);
	};

	// Kept mounted through the exit animation, then dropped on animationend. Under reduced motion the
	// animation is off entirely, so there is no animationend to wait for and the panel closes at once
	// — checking the query here rather than trusting the event is what stops it sticking open.
	const closeDrawer = () => {
		if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
			setSelectedGameId(null);
			return;
		}
		setClosingDrawer(true);
	};

	// Escape closes the drawer, which is what every panel over a page does and the only way back out
	// without reaching for the mouse. Unkeyed on purpose: the handler closes over `selectedGameId`.
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape' && selectedGameId) closeDrawer();
		};
		globalThis.addEventListener('keydown', onKeyDown);
		return () => globalThis.removeEventListener('keydown', onKeyDown);
	});

	const favoriteTeamIds = useMemo(() => new Set(prefs.favoriteTeamIds), [prefs.favoriteTeamIds]);

	// Every day in the window that actually has something on it. Built from the slate rather than
	// from a date range, so the pager never steps onto a day with nothing to show.
	const days = useMemo(() => {
		const dated = (slate?.games ?? [])
			.filter(game => Number.isFinite(startMs(game)))
			.toSorted((a, b) => startMs(a) - startMs(b));
		return groupByDate(dated);
	}, [slate]);

	// Falls back to today rather than to the first group, which is two days of finals ago.
	const selectedDayIndex = resolveSelectedDayIndex(days, selectedDayKey ?? defaultDayKey(days, now));
	const selectedDay = days[selectedDayIndex];
	const showingToday = selectedDay ? isSameLocalDay(startMs(selectedDay.games[0]!), now) : false;

	const bars = useMemo(() => (
		(selectedDay?.games ?? [])
			.map(game => buildBar(game, isFavoriteTeamGame(game, favoriteTeamIds), now, slate?.endTimes?.[game.id]))
			.filter((bar): bar is NonNullable<typeof bar> => bar !== null)
	), [selectedDay, favoriteTeamIds, now, slate]);

	const { band } = useMemo(
		() => buildHeatCurve(bars, { weightFavorites: true, favoriteBonusPoints: prefs.favoriteTeamBonusPoints }),
		[bars, prefs.favoriteTeamBonusPoints],
	);

	// Opens on the current moment rather than at the start of the day, which is almost never the
	// part of the grid anybody came to read.
	useEffect(() => {
		if (hasScrolledToNow.current || bars.length === 0 || !showingToday) return;
		const bounds = axisBounds(bars);
		const scroller = scrollerRef.current;
		if (!bounds || !scroller) return;
		hasScrolledToNow.current = true;
		// Plus the gutter, which is the one place off the grid that has to know about it: every x the
		// grid draws is measured from the start of the day, and the scroller's is measured from the page.
		scroller.scrollLeft = Math.max(gutterPx + msToPx(now, bounds.fromMs) - scroller.clientWidth / 3, 0);
	}, [bars, now, showingToday]);


	// The scroll reset belongs to the click rather than to an effect watching the day. Clearing the
	// scrolled-to-now flag is what lets paging back to today land on the current moment again instead
	// of at breakfast.
	const selectDay = (index: number) => {
		const next = days[index];
		if (!next) return;
		setSelectedDayKey(next.key);
		hasScrolledToNow.current = false;
		if (scrollerRef.current) scrollerRef.current.scrollLeft = 0;
	};

	const selectedGame = selectedGameId ? slate?.games.find(game => game.id === selectedGameId) : undefined;
	const leagueLogos: LeagueLogoMap = slate?.leagueLogos ?? {};
	const monoLogos: TeamMonoLogoMap = slate?.monoLogos ?? {};

	return (
		<div className='guide-page'>
			<header className='guide-header'>
				<img src='/images/full_logo_white_on_transparent.svg' alt='ArenaSwap' className='guide-logo' />
				{/* The page has a wordmark and no heading, which leaves a screen reader nothing to
				    announce it by. */}
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
				{/* The switch's label opens the sentence and this finishes it, so the header reads 'Best
				    time to watch · 3:47 PM–4:17 PM · 3 games' across the pair. It sits here rather than over
				    the grid: anchored to the band it was four times wider than the band itself, so any
				    horizontal scroll sliced it into a fragment. The leading separator is safe here and only
				    here — the label it follows is never absent. */}
				<div className='form-check form-switch mb-0 guide-band-toggle'>
					<input className='form-check-input' type='checkbox' id='guideBandToggle' checked={showBand} onChange={() => setShowBand(value => !value)} />
					<label className='form-check-label' htmlFor='guideBandToggle'>{i18n.t('guide.bestWindow')}</label>
					{/* Inside the control rather than beside it, so the header's own 1rem column gap cannot open
					    a hole in the middle of a sentence. */}
					{showBand && band && <span className='guide-band-summary'>{`\u00b7 ${bandLabel(band)}`}</span>}
				</div>
			</header>

			{/* The drawer is a sibling of the grid rather than a panel floating over the page: fixed, it
			    covered the header's own controls, so opening a game hid the band toggle behind it. */}
			<div className='guide-main'>
			{bars.length === 0 ? (
				/* Two different states, and only one of them is news. An empty card gets the popup's own
				   orange empty-state plate; a slate still in flight is just a line, because dressing a
				   wait up as an outcome is how a slow network reads as "nothing on today". */
				slate
					? <p className='guide-empty'>{i18n.t('guide.empty')}</p>
					: <p className='guide-loading'>{i18n.t('guide.loading')}</p>
			) : (
				<div className='guide-scroller' ref={scrollerRef}>
					<GuideGrid bars={bars} band={showBand ? band : null} leagueLogos={leagueLogos}
					monoLogos={monoLogos} now={showingToday ? now : null} onOpen={openGame} />
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
						game={selectedGame}
						excitementResult={undefined}
						scoreHistory={[]}
						powerScoreHistory={[]}
						proTipsEnabled={prefs.proTipsEnabled}
						gameBoosts={slate?.gameBoosts ?? {}}
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
						onSetGameBoost={setGameBoost}
						onBack={closeDrawer}
					/>
				</aside>
			)}
			</div>
		</div>
	);
};

export default App;
