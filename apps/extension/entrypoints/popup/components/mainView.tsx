import { useMemo, useState } from 'react';
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
import { resolveLeagueLogoUrl } from '@arenaswap/core/constants';
import GameCard from './gameCard';
import PopupFooter from './popupFooter';
import ProTip from './proTip';
import EmptyGameState from './emptyGameState';
import GameListHeader from './gameListHeader';
import ReviewPromptBanner from './reviewPromptBanner';
import { buildFavoritePinnedComparator, buildUpcomingComparator, getRandomLoadingMessage, groupByDate, groupByLeague, leagueLabels } from '../popupHelpers';
import type { BettingDisplayPrefs, WeatherDisplayPrefs } from './gameCardTypes';

const emptyScoreMap = new Map<string, PowerScoreResult>();

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
	groupDates?: boolean;
	first?: boolean;
}

const LeagueSectionHeader = ({ league, logos }: { league: LeagueId; logos: LeagueLogoMap }) => {
	const [imgFailed, setImgFailed] = useState(false);
	const logoUrl = resolveLeagueLogoUrl(league, logos[league]);
	return (
		<div className='fw-bold text-uppercase popup-section-label'>
			{!imgFailed && logoUrl && (
				<img
					src={logoUrl}
					alt=''
					className='popup-league-logo'
					loading='lazy'
					onError={() => setImgFailed(true)}
				/>
			)}
			{leagueLabels[league] ?? league.toUpperCase()}
		</div>
	);
};

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
	onStartWalkthrough: () => void;
	onRefresh: () => void;
	showReviewPrompt: boolean;
	onToggleEnabled: () => void;
	onDismissReviewPrompt: () => void;
	onLeaveReview: () => void;
	onToggleFavoriteTeam: (leagueId: LeagueId, teamId: string) => void;
	onRegistryChange: (updated: TabRegistration[]) => void;
	formatTabLabel: (tab: Browser.tabs.Tab) => string;
}

const dateDivider = (label: string) => (
	<div className='d-flex align-items-center gap-2 my-2'>
		<hr className='flex-grow-1 m-0 border-secondary-subtle opacity-50' />
		<span className='text-body-tertiary' style={{ fontSize: '0.65rem', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</span>
		<hr className='flex-grow-1 m-0 border-secondary-subtle opacity-50' />
	</div>
);

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
) => groupByLeague(games).map(({ league, games: groupedGames }) => (
	<div key={league}>
		<LeagueSectionHeader league={league} logos={leagueLogos} />
		{groupedGames.map(game => (
			<GameCard
				key={game.id}
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
	groupDates,
	first,
}: gameSectionProps) => (
	<div className='mt-2'>
		<div className='popup-section-title' style={first ? { marginTop: '0.25rem' } : undefined}>{title}</div>
		{groupDates
			? groupByDate(games).map(({ dateLabel, games: dayGames }) => (
				<div key={dateLabel}>
					{dateDivider(dateLabel)}
					{leagueRows(dayGames, scoreMap, leagueLogos, favoriteTeamIds, onToggleFavoriteTeam, gameBoosts, openTabs, registry, onRegistryChange, formatTabLabel, onOpenGameDetail, bettingPrefs, weatherPrefs)}
				</div>
			))
			: leagueRows(games, scoreMap, leagueLogos, favoriteTeamIds, onToggleFavoriteTeam, gameBoosts, openTabs, registry, onRegistryChange, formatTabLabel, onOpenGameDetail, bettingPrefs, weatherPrefs)
		}
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
	onStartWalkthrough,
	onRefresh,
	showReviewPrompt,
	onToggleEnabled,
	onDismissReviewPrompt,
	onLeaveReview,
	onToggleFavoriteTeam,
	onRegistryChange,
	formatTabLabel,
}: mainViewProps) => {
	const noLeaguesSelected = prefs.enabledLeagues.length === 0;
	const loadingMessage = useMemo(() => getRandomLoadingMessage(), []);
	const scoreByGameId = useMemo(() => new Map(scores.map(s => [s.gameId, s.total])), [scores]);
	const scoreMap = useMemo(() => new Map(scores.map(s => [s.gameId, s])), [scores]);
	const sortGames = useMemo(
		() => buildFavoritePinnedComparator(favoriteTeamIds, scoreByGameId),
		[favoriteTeamIds, scoreByGameId],
	);
	const sortUpcomingGames = useMemo(
		() => buildUpcomingComparator(favoriteTeamIds, scoreByGameId),
		[favoriteTeamIds, scoreByGameId],
	);
	const upcomingCutoffMs = useMemo(
		() => Date.now() + prefs.upcomingGamesDays * 24 * 60 * 60 * 1000,
		[prefs.upcomingGamesDays],
	);
	const liveGames = useMemo(() => games.filter(g => g.status === 'in'), [games]);
	const upcomingGames = useMemo(
		() => games
			.filter(g => g.status === 'pre')
			.filter(g => !g.startTime || new Date(g.startTime).getTime() <= upcomingCutoffMs)
			.toSorted(sortUpcomingGames),
		[games, sortUpcomingGames, upcomingCutoffMs],
	);
	const [showAllUpcoming, setShowAllUpcoming] = useState(false);
	const upcomingInitialLimit = 10;
	const visibleUpcomingGames = showAllUpcoming ? upcomingGames : upcomingGames.slice(0, upcomingInitialLimit);
	const hiddenUpcomingCount = upcomingGames.length - upcomingInitialLimit;
	const registeredGameIds = useMemo(() => new Set(registry.map(r => r.gameId)), [registry]);
	const assignedLiveGames = useMemo(
		() => liveGames.filter(g => registeredGameIds.has(g.id)).toSorted(sortGames),
		[liveGames, registeredGameIds, sortGames],
	);
	const unassignedLiveGames = useMemo(
		() => liveGames.filter(g => !registeredGameIds.has(g.id)).toSorted(sortGames),
		[liveGames, registeredGameIds, sortGames],
	);

	const showNoGames = !isLoading && !noLeaguesSelected && liveGames.length === 0
		&& registry.length === 0 && (!prefs.showUpcomingGames || upcomingGames.length === 0);

	const bettingPrefs: BettingDisplayPrefs = {
		bettingEnabled: prefs.bettingEnabled,
	};
	const weatherPrefs: WeatherDisplayPrefs = {
		temperatureUnit: prefs.temperatureUnit,
	};

	return (
		<div className='popup-container d-flex flex-column'>
			<div className='d-flex justify-content-between align-items-center mb-2 pb-2'>
				<img src='/images/full_logo_white_on_transparent.svg' alt='ArenaSwap' className='arenaswap-logo' />
				<div className='d-flex align-items-center gap-2'>
					<button className='btn btn-sm p-0 popup-settings-button' onClick={onStartWalkthrough} title={i18n.t('main.tourButton')} aria-label={i18n.t('main.tourButton')}>
						<i className='bi bi-question-circle popup-settings-icon' />
					</button>
					<button className='btn btn-sm p-0 popup-settings-button' onClick={onOpenSetup} title={i18n.t('main.settingsButton')} aria-label={i18n.t('main.settingsButton')}>
						<i className='bi bi-gear-fill popup-settings-icon' />
					</button>
					<div className='form-check form-switch mb-0'>
						<input className='form-check-input' type='checkbox' id='enableToggle' checked={prefs.enabled} onChange={onToggleEnabled} disabled={!prefsLoaded} />
					</div>
				</div>
			</div>

			<GameListHeader isLoading={isLoading} hasError={hasError} loadingMessage={loadingMessage} onRefresh={onRefresh} />

			{showReviewPrompt && (
				<ReviewPromptBanner onDismiss={onDismissReviewPrompt} onLeaveReview={onLeaveReview} />
			)}

			{onStandbyStream && (
				<div className='d-flex align-items-center gap-2 px-2 py-1 mb-1 rounded text-body-secondary small bg-body-secondary'>
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
			{!isLoading && !noLeaguesSelected && assignedLiveGames.length > 0 && gameSection({ title: i18n.t('main.sectionActiveLiveTabs'), games: assignedLiveGames, scoreMap, leagueLogos, favoriteTeamIds, onToggleFavoriteTeam, gameBoosts, openTabs, registry, onRegistryChange, formatTabLabel, onOpenGameDetail, bettingPrefs, weatherPrefs, first: true })}
			{!isLoading && !noLeaguesSelected && unassignedLiveGames.length > 0 && gameSection({ title: i18n.t('main.sectionOtherLiveGames'), games: unassignedLiveGames, scoreMap, leagueLogos, favoriteTeamIds, onToggleFavoriteTeam, gameBoosts, openTabs, registry, onRegistryChange, formatTabLabel, onOpenGameDetail, bettingPrefs, weatherPrefs, first: assignedLiveGames.length === 0 })}
			{!isLoading && !noLeaguesSelected && prefs.showUpcomingGames && upcomingGames.length > 0 && (
				<>
					{gameSection({ title: i18n.t('main.sectionUpNext'), games: visibleUpcomingGames, scoreMap: emptyScoreMap, leagueLogos, favoriteTeamIds, onToggleFavoriteTeam, gameBoosts, openTabs, registry, onRegistryChange, formatTabLabel, onOpenGameDetail, bettingPrefs, weatherPrefs, groupDates: true, first: assignedLiveGames.length === 0 && unassignedLiveGames.length === 0 })}
					{!showAllUpcoming && hiddenUpcomingCount > 0 && (
						<button
							type='button'
							className='btn btn-sm btn-outline-secondary w-100 mt-1 mb-2'
							onClick={() => setShowAllUpcoming(true)}
						>
							{i18n.t('main.showMoreUpcoming', { count: String(hiddenUpcomingCount) })}
						</button>
					)}
				</>
			)}

			<PopupFooter />
		</div>
	);
};

export default mainView;
