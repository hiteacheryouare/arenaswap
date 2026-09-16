import { useMemo, useRef } from 'react';
import type { ReactNode, RefObject } from 'react';
import { i18n } from '#i18n';
import type { Browser } from 'wxt/browser';
import type {
	Game,
	LeagueId,
	LeagueLogoMap,
	PowerScoreResult,
	TabRegistration,
	UserPreferences,
} from '@arenaswap/core/types';
import { LeagueSectionHeader, PopupHeader, PopupSectionTitle } from '@arenaswap/ui/src/components/popupChrome';
import GameCard from './gameCard';
import GameCardReveal from './gameCardReveal';
import PopupFooter from './popupFooter';
import ProTip from './proTip';
import EmptyGameState from './emptyGameState';
import GameListHeader from './gameListHeader';
import ReviewPromptBanner from './reviewPromptBanner';
import SuggestBanner from './suggestBanner';
import UpcomingDayPager from './upcomingDayPager';
import { buildFavoritePinnedComparator, buildFinalComparator, buildLeagueRank, buildUpcomingComparator, getRandomLoadingMessage, groupByDate, groupByLeague, resolveSelectedDayIndex } from '../popupHelpers';
import type { BettingDisplayPrefs, WeatherDisplayPrefs } from './gameCardTypes';
import useRestoredScroll from '../useRestoredScroll';
import { revealModeForIndex, type cardRevealPlan, type revealMode } from '../cardReveal';

const emptyScoreMap = new Map<string, PowerScoreResult>();
const emptyRevealOrder = new Map<string, number>();

interface gameSectionProps {
	title: string;
	games: Game[];
	scoreMap: Map<string, PowerScoreResult>;
	leagueLogos: LeagueLogoMap;
	favoriteTeamIds: Set<string>;
	onToggleFavoriteTeam: (leagueId: LeagueId, teamId: string) => void;
	gameBoosts: Record<string, number>;
	openTabs: Browser.tabs.Tab[];
	registry: TabRegistration[];
	onRegistryChange: (updated: TabRegistration[]) => void;
	formatTabLabel: (tab: Browser.tabs.Tab) => string;
	onOpenGameDetail: (gameId: string) => void;
	bettingPrefs: BettingDisplayPrefs;
	weatherPrefs: WeatherDisplayPrefs;
	reveal: cardRevealPlan;
	afterTitle?: ReactNode;
	first?: boolean;
}

interface mainViewProps {
	prefs: UserPreferences;
	prefsLoaded: boolean;
	isLoading: boolean;
	hasError: boolean;
	games: Game[];
	scores: PowerScoreResult[];
	leagueLogos: LeagueLogoMap;
	registry: TabRegistration[];
	favoriteTeamIds: Set<string>;
	gameBoosts: Record<string, number>;
	openTabs: Browser.tabs.Tab[];
	onStandbyStream: boolean;
	onOpenGameDetail: (gameId: string) => void;
	onOpenSetup: () => void;
	suggestionCount: number;
	onReviewSuggestions: () => void;
	onDismissSuggestions: () => void;
	onStartWalkthrough: () => void;
	onOpenGuide: () => void;
	onRefresh: () => void;
	showReviewPrompt: boolean;
	onToggleEnabled: () => void;
	onDismissReviewPrompt: () => void;
	onLeaveReview: () => void;
	onToggleFavoriteTeam: (leagueId: LeagueId, teamId: string) => void;
	onRegistryChange: (updated: TabRegistration[]) => void;
	formatTabLabel: (tab: Browser.tabs.Tab) => string;
	scrollOffsetRef: RefObject<number>;
	selectedDayKey: string | null;
	onSelectDay: (dayKey: string | null) => void;
	revealMode?: revealMode;
}

const leagueRows = (
	games: Game[],
	scoreMap: Map<string, PowerScoreResult>,
	leagueLogos: LeagueLogoMap,
	favoriteTeamIds: Set<string>,
	onToggleFavoriteTeam: (leagueId: LeagueId, teamId: string) => void,
	gameBoosts: Record<string, number>,
	openTabs: Browser.tabs.Tab[],
	registry: TabRegistration[],
	onRegistryChange: (updated: TabRegistration[]) => void,
	formatTabLabel: (tab: Browser.tabs.Tab) => string,
	onOpenGameDetail: (gameId: string) => void,
	bettingPrefs: BettingDisplayPrefs,
	weatherPrefs: WeatherDisplayPrefs,
	reveal: cardRevealPlan,
) => groupByLeague(games).map(({ league, games: groupedGames }) => (
	<div key={league}>
		<LeagueSectionHeader league={league} logos={leagueLogos} />
		{groupedGames.map(game => (
			// A game the plan does not name is one that arrived after the plan was fixed, and it gets
			// nothing: a card that has been sitting there plainly for two seconds must not suddenly grow
			// a poster over itself.
			<GameCardReveal
				key={game.id}
				game={game}
				mode={reveal.order.has(game.id) ? revealModeForIndex(reveal.mode, reveal.order.get(game.id)!) : 'none'}
				index={reveal.order.get(game.id) ?? 0}
			>
				<GameCard
					game={game}
					excitementResult={scoreMap.get(game.id)}
					favoriteTeamIds={favoriteTeamIds}
					onToggleFavoriteTeam={onToggleFavoriteTeam}
					gameBoosts={gameBoosts}
					openTabs={openTabs}
					registry={registry}
					onRegistryChange={onRegistryChange}
					formatTabLabel={formatTabLabel}
					onOpenGameDetail={onOpenGameDetail}
					bettingPrefs={bettingPrefs}
					weatherPrefs={weatherPrefs}
				/>
			</GameCardReveal>
		))}
	</div>
));

const gameSection = ({
	title,
	games,
	scoreMap,
	leagueLogos,
	favoriteTeamIds,
	onToggleFavoriteTeam,
	gameBoosts,
	openTabs,
	registry,
	onRegistryChange,
	formatTabLabel,
	onOpenGameDetail,
	bettingPrefs,
	weatherPrefs,
	reveal,
	afterTitle,
	first,
}: gameSectionProps) => (
	<div className='mt-2'>
		<PopupSectionTitle first={first}>{title}</PopupSectionTitle>
		{afterTitle}
		{leagueRows(games, scoreMap, leagueLogos, favoriteTeamIds, onToggleFavoriteTeam, gameBoosts, openTabs, registry, onRegistryChange, formatTabLabel, onOpenGameDetail, bettingPrefs, weatherPrefs, reveal)}
	</div>
);

const mainView = ({
	prefs,
	prefsLoaded,
	isLoading,
	hasError,
	games,
	scores,
	leagueLogos,
	registry,
	favoriteTeamIds,
	gameBoosts,
	openTabs,
	onStandbyStream,
	onOpenGameDetail,
	onOpenSetup,
	suggestionCount,
	onReviewSuggestions,
	onDismissSuggestions,
	onStartWalkthrough,
	onOpenGuide,
	onRefresh,
	showReviewPrompt,
	onToggleEnabled,
	onDismissReviewPrompt,
	onLeaveReview,
	onToggleFavoriteTeam,
	onRegistryChange,
	formatTabLabel,
	scrollOffsetRef,
	selectedDayKey,
	onSelectDay,
	revealMode = 'none',
}: mainViewProps) => {
	const scrollerRef = useRestoredScroll(scrollOffsetRef);
	const noLeaguesSelected = prefs.enabledLeagues.length === 0;
	const loadingMessage = useMemo(() => getRandomLoadingMessage(), []);
	const scoreByGameId = useMemo(() => new Map(scores.map(s => [s.gameId, s.total])), [scores]);
	const scoreMap = useMemo(() => new Map(scores.map(s => [s.gameId, s])), [scores]);
	const leagueRank = useMemo(() => buildLeagueRank(prefs.enabledLeagues), [prefs.enabledLeagues]);
	const sortGames = useMemo(
		() => buildFavoritePinnedComparator(leagueRank, favoriteTeamIds, scoreByGameId),
		[leagueRank, favoriteTeamIds, scoreByGameId],
	);
	const sortUpcomingGames = useMemo(
		() => buildUpcomingComparator(leagueRank, favoriteTeamIds, scoreByGameId),
		[leagueRank, favoriteTeamIds, scoreByGameId],
	);
	const sortFinalGames = useMemo(
		() => buildFinalComparator(leagueRank, favoriteTeamIds),
		[leagueRank, favoriteTeamIds],
	);
	const upcomingCutoffMs = useMemo(
		() => Date.now() + prefs.upcomingGamesDays * 24 * 60 * 60 * 1000,
		[prefs.upcomingGamesDays],
	);
	const liveGames = useMemo(() => games.filter(g => g.status === 'in'), [games]);
	// The background already drops a game once it has aged out of the retention window, so this is
	// only a sort: most recently wrapped first, since that is the game you came looking for.
	const finalGames = useMemo(
		() => (prefs.keepFinalGames
			? games.filter(g => g.status === 'post').toSorted(sortFinalGames)
			: []),
		[games, prefs.keepFinalGames, sortFinalGames],
	);
	const upcomingGames = useMemo(
		() => games
			.filter(g => g.status === 'pre')
			.filter(g => !g.startTime || new Date(g.startTime).getTime() <= upcomingCutoffMs)
			.toSorted(sortUpcomingGames),
		[games, sortUpcomingGames, upcomingCutoffMs],
	);
	// Grouping runs before any truncation, so what Up Next shows is always exactly one whole day.
	const upcomingDays = useMemo(() => groupByDate(upcomingGames), [upcomingGames]);
	const selectedDayIndex = resolveSelectedDayIndex(upcomingDays, selectedDayKey);
	const selectedDay = upcomingDays[selectedDayIndex];
	const registeredGameIds = useMemo(() => new Set(registry.map(r => r.gameId)), [registry]);
	const assignedLiveGames = useMemo(
		() => liveGames.filter(g => registeredGameIds.has(g.id)).toSorted(sortGames),
		[liveGames, registeredGameIds, sortGames],
	);
	const unassignedLiveGames = useMemo(
		() => liveGames.filter(g => !registeredGameIds.has(g.id)).toSorted(sortGames),
		[liveGames, registeredGameIds, sortGames],
	);

	// The stagger counts down the rendered page, so it has to be built the way the page is built:
	// four sections in this order, each one grouped by league before it is drawn. Counting within a
	// section instead would start Up Next back at zero and land its first card on top of the second
	// live one.
	//
	// Fixed on the first list that has anything in it, and not recomputed while it is playing. Both
	// live sections are re-sorted on PowerScore and scores arrive by push every few seconds, so a
	// resort inside the 3.4s window is the common case rather than the edge one — and a card that
	// keeps its React identity but changes index gets a new `animation-delay`, which moves a running
	// animation's current time and jumps the poster by up to 480ms. Worse across the eight-card cap,
	// where the mode itself flips and a card either grows a poster from nothing or loses one
	// mid-frame.
	const revealPlanRef = useRef<Map<string, number> | null>(null);
	const reveal = useMemo<cardRevealPlan>(() => {
		if (revealMode === 'none') return { mode: 'none', order: emptyRevealOrder };
		if (revealPlanRef.current) return { mode: revealMode, order: revealPlanRef.current };
		const order = new Map<string, number>();
		const take = (list: Game[]) => groupByLeague(list)
			.forEach(({ games: grouped }) => grouped.forEach(game => order.set(game.id, order.size)));
		take(assignedLiveGames);
		take(unassignedLiveGames);
		if (prefs.showUpcomingGames && selectedDay) take(selectedDay.games);
		take(finalGames);
		if (order.size > 0) revealPlanRef.current = order;
		return { mode: revealMode, order };
	}, [revealMode, assignedLiveGames, unassignedLiveGames, prefs.showUpcomingGames, selectedDay, finalGames]);

	const showNoGames = !isLoading && !noLeaguesSelected && liveGames.length === 0
		&& registry.length === 0 && finalGames.length === 0
		&& (!prefs.showUpcomingGames || upcomingGames.length === 0);

	const bettingPrefs: BettingDisplayPrefs = {
		bettingEnabled: prefs.bettingEnabled,
	};
	const weatherPrefs: WeatherDisplayPrefs = {
		temperatureUnit: prefs.temperatureUnit,
	};

	return (
		<div ref={scrollerRef} className='popup-container d-flex flex-column'>
			<PopupHeader
				logoSrc='/images/full_logo_white_on_transparent.svg'
				enabled={prefs.enabled}
				prefsLoaded={prefsLoaded}
				onToggleEnabled={onToggleEnabled}
				onOpenSettings={onOpenSetup}
				onStartTour={onStartWalkthrough}
				onOpenGuide={onOpenGuide}
			/>

			<GameListHeader isLoading={isLoading} hasError={hasError} loadingMessage={loadingMessage} onRefresh={onRefresh} />

			{suggestionCount > 0 && (
				<SuggestBanner
					count={suggestionCount}
					onReview={onReviewSuggestions}
					onDismiss={onDismissSuggestions}
				/>
			)}
			{/* The only banner here whose condition does not come from the fetch: eligibility is read
			    out of storage.local and lands well before the slate does. The other two self-suppress
			    because their inputs are empty until `data` arrives, so this one states the gate. */}
			{!isLoading && !hasError && showReviewPrompt && (
				<ReviewPromptBanner onDismiss={onDismissReviewPrompt} onLeaveReview={onLeaveReview} />
			)}

			{onStandbyStream && (
				<div className='d-flex align-items-center gap-2 px-2 py-1 mb-1 rounded text-body-secondary small bg-body-secondary' data-testid='standby-banner'>
					<i className='bi bi-broadcast text-primary' />
					<span>{i18n.t('main.onStandbyStream')}</span>
				</div>
			)}

			<EmptyGameState
				noLeaguesSelected={!isLoading && noLeaguesSelected}
				noGames={showNoGames}
				onOpenSetup={onOpenSetup}
				onRefresh={onRefresh}
			/>

			{!isLoading && !noLeaguesSelected && prefs.proTipsEnabled && <ProTip context='main' />}
			{!isLoading && !noLeaguesSelected && assignedLiveGames.length > 0 && gameSection({ title: i18n.t('main.sectionActiveLiveTabs'), games: assignedLiveGames, scoreMap, leagueLogos, favoriteTeamIds, onToggleFavoriteTeam, gameBoosts, openTabs, registry, onRegistryChange, formatTabLabel, onOpenGameDetail, bettingPrefs, weatherPrefs, reveal, first: true })}
			{!isLoading && !noLeaguesSelected && unassignedLiveGames.length > 0 && gameSection({ title: i18n.t('main.sectionOtherLiveGames'), games: unassignedLiveGames, scoreMap, leagueLogos, favoriteTeamIds, onToggleFavoriteTeam, gameBoosts, openTabs, registry, onRegistryChange, formatTabLabel, onOpenGameDetail, bettingPrefs, weatherPrefs, reveal, first: assignedLiveGames.length === 0 })}
			{!isLoading && !noLeaguesSelected && prefs.showUpcomingGames && selectedDay && gameSection({
				title: i18n.t('main.sectionUpNext'),
				games: selectedDay.games,
				scoreMap: emptyScoreMap,
				leagueLogos,
				favoriteTeamIds,
				onToggleFavoriteTeam,
				gameBoosts,
				openTabs,
				registry,
				onRegistryChange,
				formatTabLabel,
				onOpenGameDetail,
				bettingPrefs,
				weatherPrefs,
				reveal,
				afterTitle: (
					<UpcomingDayPager
						dayLabel={selectedDay.dateLabel}
						index={selectedDayIndex}
						total={upcomingDays.length}
						onSelect={index => onSelectDay(upcomingDays[index]?.key ?? null)}
					/>
				),
				first: assignedLiveGames.length === 0 && unassignedLiveGames.length === 0,
			})}

			{/* Last, under Up Next: results are the one section you are never deciding anything from,
			    so they sit below the two that you are. */}
			{!isLoading && !noLeaguesSelected && finalGames.length > 0 && gameSection({
				title: i18n.t('main.sectionFinal'),
				games: finalGames,
				scoreMap: emptyScoreMap,
				leagueLogos,
				favoriteTeamIds,
				onToggleFavoriteTeam,
				gameBoosts,
				openTabs,
				registry,
				onRegistryChange,
				formatTabLabel,
				onOpenGameDetail,
				bettingPrefs,
				weatherPrefs,
				reveal,
				first: assignedLiveGames.length === 0 && unassignedLiveGames.length === 0
					&& !(prefs.showUpcomingGames && selectedDay),
			})}

			<PopupFooter />
		</div>
	);
};

export default mainView;
