import { useMemo, useRef } from 'react';
import type { CSSProperties, ReactNode, RefObject } from 'react';
import { i18n } from '#i18n';
import type { Browser } from 'wxt/browser';
import { createFavoriteTeamKey, sensitivityThresholds } from '@arenaswap/core/constants';
import type {
	Game,
	LeagueId,
	LeagueLogoMap,
	PowerScoreResult,
	PowerScoreSnapshot,
	TabRegistration,
	TeamMonoLogoMap,
	UserPreferences,
} from '@arenaswap/core/types';
import { PopupHeader } from '@arenaswap/ui/src/components/popupChrome';
import GameStage from '@arenaswap/ui/src/components/gameStage';
import GameTile from '@arenaswap/ui/src/components/gameTile';
import GameRow from '@arenaswap/ui/src/components/gameRow';
import { arrangeLive, powerTrend } from '@arenaswap/ui/src/components/boardLayout';
import { buildCardHandlers } from '@arenaswap/ui/src/components/gameOpener';
import GameCardReveal from './gameCardReveal';
import PopupFooter from './popupFooter';
import ProTip from './proTip';
import EmptyGameState from './emptyGameState';
import GameListHeader from './gameListHeader';
import ReviewPromptBanner from './reviewPromptBanner';
import SuggestBanner from './suggestBanner';
import UpcomingDayPager from './upcomingDayPager';
import TabAssignSelect, { tabNumberLabel } from './tabAssignSelect';
import { buildFinalComparator, buildLeagueRank, getRandomLoadingMessage, groupByDate, isFavoriteTeamGame, resolveSelectedDayIndex } from '../popupHelpers';
import { stageNote } from '@arenaswap/ui/src/components/boardSituation';
import { resolveGameColors } from '@arenaswap/ui/src/components/gameSurface';
import useRestoredScroll from '../useRestoredScroll';
import { revealModeForIndex, type cardRevealPlan, type revealMode } from '../cardReveal';

const emptyRevealOrder = new Map<string, number>();
const noMonoLogos: TeamMonoLogoMap = {};

interface mainViewProps {
	prefs: UserPreferences;
	prefsLoaded: boolean;
	isLoading: boolean;
	hasError: boolean;
	games: Game[];
	scores: PowerScoreResult[];
	powerScoreHistory?: Record<string, PowerScoreSnapshot[]>;
	leagueLogos: LeagueLogoMap;
	monoLogos?: TeamMonoLogoMap;
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
	revealSkipping?: boolean;
}

const favoritesOf = (game: Game, favoriteTeamIds: Set<string>) => ({
	away: favoriteTeamIds.has(createFavoriteTeamKey(game.league, game.awayTeam.id)),
	home: favoriteTeamIds.has(createFavoriteTeamKey(game.league, game.homeTeam.id)),
});

const marksOf = (game: Game, monoLogos: TeamMonoLogoMap) => ({
	away: monoLogos[game.league]?.[game.awayTeam.id],
	home: monoLogos[game.league]?.[game.homeTeam.id],
});

const byStartThenFavorite = (favoriteTeamIds: Set<string>, leagueRank: Record<LeagueId, number>) => (a: Game, b: Game) => {
	const aStart = a.startTime ? new Date(a.startTime).getTime() : Number.POSITIVE_INFINITY;
	const bStart = b.startTime ? new Date(b.startTime).getTime() : Number.POSITIVE_INFINITY;
	if (aStart !== bStart) return aStart - bStart;
	const aFavorite = isFavoriteTeamGame(a, favoriteTeamIds);
	const bFavorite = isFavoriteTeamGame(b, favoriteTeamIds);
	if (aFavorite !== bFavorite) return aFavorite ? -1 : 1;
	return (leagueRank[a.league] ?? 99) - (leagueRank[b.league] ?? 99);
};

const mainView = ({
	prefs,
	prefsLoaded,
	isLoading,
	hasError,
	games,
	scores,
	powerScoreHistory = {},
	monoLogos = noMonoLogos,
	registry,
	favoriteTeamIds,
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
	revealSkipping = false,
}: mainViewProps) => {
	const scrollerRef = useRestoredScroll(scrollOffsetRef);
	const noLeaguesSelected = prefs.enabledLeagues.length === 0;
	const loadingMessage = useMemo(() => getRandomLoadingMessage(), []);
	const scoreByGameId = useMemo(() => new Map(scores.map(s => [s.gameId, s.total])), [scores]);
	const leagueRank = useMemo(() => buildLeagueRank(prefs.enabledLeagues), [prefs.enabledLeagues]);
	const sortFinalGames = useMemo(() => buildFinalComparator(leagueRank, favoriteTeamIds), [leagueRank, favoriteTeamIds]);
	const upcomingCutoffMs = useMemo(
		() => Date.now() + prefs.upcomingGamesDays * 24 * 60 * 60 * 1000,
		[prefs.upcomingGamesDays],
	);
	const liveGames = useMemo(() => games.filter(g => g.status === 'in'), [games]);
	const board = useMemo(
		() => arrangeLive(liveGames, scoreByGameId, { favoriteTeamIds, leagueRank }),
		[liveGames, scoreByGameId, favoriteTeamIds, leagueRank],
	);
	// The background already drops a game once it has aged out of the retention window, so this is
	// only a sort: your teams first, then most recently wrapped.
	const finalGames = useMemo(
		() => (prefs.keepFinalGames ? games.filter(g => g.status === 'post').toSorted(sortFinalGames) : []),
		[games, prefs.keepFinalGames, sortFinalGames],
	);
	const upcomingGames = useMemo(
		() => games
			.filter(g => g.status === 'pre')
			.filter(g => !g.startTime || new Date(g.startTime).getTime() <= upcomingCutoffMs)
			.toSorted(byStartThenFavorite(favoriteTeamIds, leagueRank)),
		[games, upcomingCutoffMs, favoriteTeamIds, leagueRank],
	);
	// Grouping runs before any truncation, so the day on show is always exactly one whole day.
	const upcomingDays = useMemo(() => groupByDate(upcomingGames), [upcomingGames]);
	const selectedDayIndex = resolveSelectedDayIndex(upcomingDays, selectedDayKey);
	const selectedDay = upcomingDays[selectedDayIndex];
	const showUpcoming = prefs.showUpcomingGames && selectedDay !== undefined;

	const tabIdByGame = useMemo(() => new Map(registry.map(r => [r.gameId, r.tabId])), [registry]);
	const watchedTabId = openTabs.find(tab => tab.active)?.id ?? null;
	const watchedGameId = watchedTabId === null ? null : registry.find(r => r.tabId === watchedTabId)?.gameId ?? null;
	const tabOf = (gameId: string) => openTabs.find(tab => tab.id === tabIdByGame.get(gameId));

	// Fixed on the first list that has anything in it and never recomputed while it plays: a card
	// that keeps its identity but changes index would get a new `animation-delay` and jump.
	const revealPlanRef = useRef<Map<string, number> | null>(null);
	const reveal = useMemo<cardRevealPlan>(() => {
		if (revealMode === 'none') return { mode: 'none', order: emptyRevealOrder, skipping: false };
		if (revealPlanRef.current) return { mode: revealMode, order: revealPlanRef.current, skipping: revealSkipping };
		const order = new Map<string, number>();
		const take = (list: Game[]) => list.forEach(game => order.set(game.id, order.size));
		if (board.stage) take([board.stage]);
		take(board.tiles);
		take(board.rows);
		if (showUpcoming) take(selectedDay.games);
		take(finalGames);
		if (order.size > 0) revealPlanRef.current = order;
		return { mode: revealMode, order, skipping: revealSkipping };
	}, [revealMode, revealSkipping, board, showUpcoming, selectedDay, finalGames]);

	const showNoGames = !isLoading && !noLeaguesSelected && liveGames.length === 0
		&& registry.length === 0 && finalGames.length === 0
		&& (!prefs.showUpcomingGames || upcomingGames.length === 0);
	const listReady = !isLoading && !noLeaguesSelected;
	const stage = listReady ? board.stage : null;

	const glow = stage ? resolveGameColors(stage) : null;

	const revealed = (game: Game, node: ReactNode, shape: 'stage' | 'tile' | 'row') => (
		<GameCardReveal
			key={game.id}
			game={game}
			shape={shape}
			mode={reveal.order.has(game.id) ? revealModeForIndex(reveal.mode, reveal.order.get(game.id)!) : 'none'}
			index={reveal.order.get(game.id) ?? 0}
			skipping={reveal.skipping}
		>
			{node}
		</GameCardReveal>
	);

	const toggleFavorite = (game: Game) => (side: 'away' | 'home') => (
		onToggleFavoriteTeam(game.league, (side === 'away' ? game.awayTeam : game.homeTeam).id)
	);

	const opener = (game: Game) => ({
		role: 'button',
		tabIndex: 0,
		'aria-label': i18n.t('gameCard.openDetails', { away: game.awayTeam.abbreviation, home: game.homeTeam.abbreviation }),
		...buildCardHandlers(onOpenGameDetail, game.id),
	});

	const tabPicker = (game: Game, compact = false) => (
		<TabAssignSelect
			compact={compact}
			gameId={game.id}
			openTabs={openTabs}
			registry={registry}
			onChange={onRegistryChange}
			formatTabLabel={formatTabLabel}
			watchedTabId={watchedTabId}
		/>
	);

	const stageTab = (game: Game): ReactNode => {
		const tab = tabOf(game.id);
		const watched = watchedGameId !== null ? board.all.find(g => g.id === watchedGameId) : undefined;
		const threshold = sensitivityThresholds[prefs.sensitivity] ?? 11;
		const overtaking = prefs.enabled && tab && watched && watched.id !== game.id
			&& (scoreByGameId.get(game.id) ?? 0) >= (scoreByGameId.get(watched.id) ?? 0) + threshold;
		if (overtaking) return <span className='as-stage-switching'>{i18n.t('board.switchingTo', { tab: tabNumberLabel(tab) })}</span>;
		return tabPicker(game);
	};

	return (
		<div ref={scrollerRef} className='popup-container d-flex flex-column gm'>
			{glow && <div className='gm-glow' style={{ '--glow-away': glow[0], '--glow-home': glow[1] } as CSSProperties} aria-hidden='true' />}
			<PopupHeader
				scroller={scrollerRef}
				enabled={prefs.enabled}
				prefsLoaded={prefsLoaded}
				onToggleEnabled={onToggleEnabled}
				onOpenSettings={onOpenSetup}
				onStartTour={onStartWalkthrough}
				onOpenGuide={onOpenGuide}
			/>

			<div className='gm-lower'>
				<GameListHeader isLoading={isLoading} hasError={hasError} loadingMessage={loadingMessage} onRefresh={onRefresh} />

				{suggestionCount > 0 && (
					<SuggestBanner count={suggestionCount} onReview={onReviewSuggestions} onDismiss={onDismissSuggestions} />
				)}
				{/* The only banner whose condition does not come from the fetch: eligibility is read out
				    of storage.local and lands well before the slate does, so this one states the gate. */}
				{!isLoading && !hasError && showReviewPrompt && (
					<ReviewPromptBanner onDismiss={onDismissReviewPrompt} onLeaveReview={onLeaveReview} />
				)}

				{onStandbyStream && (
					<div className='as-notice is-quiet' data-testid='standby-banner'>
						<i className='bi bi-broadcast as-notice-icon' aria-hidden='true' />
						<span className='as-notice-copy'>{i18n.t('main.onStandbyStream')}</span>
					</div>
				)}

				<EmptyGameState
					noLeaguesSelected={!isLoading && noLeaguesSelected}
					noGames={showNoGames}
					onOpenSetup={onOpenSetup}
					onRefresh={onRefresh}
				/>

				{listReady && prefs.proTipsEnabled && <ProTip context='main' />}

				{stage && <h2 className='gm-title'>{i18n.t('main.sectionLive')}</h2>}

				{stage && revealed(stage, (
					<GameStage
						game={stage}
						tab={stageTab(stage)}
						note={stageNote(stage, prefs, i18n.t)}
						power={scoreByGameId.get(stage.id) ?? 0}
						trend={powerTrend(powerScoreHistory[stage.id])}
						favorites={favoritesOf(stage, favoriteTeamIds)}
						onToggleFavorite={toggleFavorite(stage)}
						monoMarks={marksOf(stage, monoLogos)}
						watched={stage.id === watchedGameId}
						interactive={opener(stage)}
					/>
				), 'stage')}

				{listReady && board.tiles.length > 0 && (
					<div className={`gm-tiles${board.tiles.length % 2 ? ' is-odd' : ''}`}>
						{board.tiles.map(game => revealed(game, (
							<GameTile
								game={game}
								power={scoreByGameId.get(game.id) ?? 0}
								trend={powerTrend(powerScoreHistory[game.id])}
								tab={tabPicker(game, true)}
								favorites={favoritesOf(game, favoriteTeamIds)}
								onToggleFavorite={toggleFavorite(game)}
								monoMarks={marksOf(game, monoLogos)}
								watched={game.id === watchedGameId}
								interactive={opener(game)}
							/>
						), 'tile'))}
					</div>
				)}

				{listReady && board.rows.length > 0 && (
					<div className='gm-rows as-rows'>
						{board.rows.map(game => revealed(game, (
							<GameRow
								game={game}
								power={scoreByGameId.get(game.id) ?? 0}
								trend={powerTrend(powerScoreHistory[game.id])}
								tab={tabPicker(game)}
								favorites={favoritesOf(game, favoriteTeamIds)}
								monoMarks={marksOf(game, monoLogos)}
								watched={game.id === watchedGameId}
								interactive={opener(game)}
							/>
						), 'row'))}
					</div>
				)}

				{listReady && showUpcoming && (
					<section className='gm-after' aria-labelledby='gm-up-next-title'>
						<UpcomingDayPager
							dayLabel={selectedDay.dateLabel}
							index={selectedDayIndex}
							total={upcomingDays.length}
							onSelect={index => onSelectDay(upcomingDays[index]?.key ?? null)}
						/>
						<div className='as-rows'>
						{selectedDay.games.map(game => revealed(game, (
							<GameRow
								game={game}
								favorites={favoritesOf(game, favoriteTeamIds)}
								monoMarks={marksOf(game, monoLogos)}
								interactive={opener(game)}
							/>
						), 'row'))}
						</div>
					</section>
				)}

				{/* Last: results are the one group you are never deciding anything from. */}
				{listReady && finalGames.length > 0 && (
					<section className='gm-after' aria-labelledby='gm-final-title'>
						<h2 className='gm-title' id='gm-final-title'>{i18n.t('main.sectionFinal')}</h2>
						<div className='as-rows'>
						{finalGames.map(game => revealed(game, (
							<GameRow
								game={game}
								favorites={favoritesOf(game, favoriteTeamIds)}
								monoMarks={marksOf(game, monoLogos)}
								interactive={opener(game)}
							/>
						), 'row'))}
						</div>
					</section>
				)}
			</div>

			<PopupFooter />
		</div>
	);
};

export default mainView;
