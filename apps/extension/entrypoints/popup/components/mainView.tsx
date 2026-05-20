import { useMemo, useState } from 'react';
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
import { buildFavoritePinnedComparator, getRandomLoadingMessage, groupByLeague, leagueLabels } from '../popupHelpers';

interface gameSectionProps {
	title: string;
	games: Game[];
	scores: PowerScoreResult[];
	leagueLogos: LeagueLogoMap;
	favoriteTeamIds: Set<string>;
	onToggleFavoriteTeam: (leagueId: LeagueId, teamId: string) => void;
	gameBoosts: Record<string, number>;
	openTabs: Browser.tabs.Tab[];
	registry: TabRegistration[];
	onRegistryChange: (updated: TabRegistration[]) => void;
	formatTabLabel: (tab: Browser.tabs.Tab) => string;
	onOpenGameDetail: (gameId: string) => void;
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
	onRefresh: () => void;
	onToggleEnabled: () => void;
	onToggleFavoriteTeam: (leagueId: LeagueId, teamId: string) => void;
	onRegistryChange: (updated: TabRegistration[]) => void;
	formatTabLabel: (tab: Browser.tabs.Tab) => string;
}

const gameSection = ({
	title,
	games,
	scores,
	leagueLogos,
	favoriteTeamIds,
	onToggleFavoriteTeam,
	gameBoosts,
	openTabs,
	registry,
	onRegistryChange,
	formatTabLabel,
	onOpenGameDetail,
}: gameSectionProps) => (
	<div className='mt-2'>
		<div className='fw-bold text-body text-center popup-section-title'>{title}</div>
		{groupByLeague(games).map(({ league, games: groupedGames }) => (
			<div key={league}>
				<LeagueSectionHeader league={league} logos={leagueLogos} />
				{groupedGames.map(game => (
					<GameCard
						key={game.id}
						game={game}
						excitementResult={scores.find(s => s.gameId === game.id)}
						favoriteTeamIds={favoriteTeamIds}
						onToggleFavoriteTeam={onToggleFavoriteTeam}
						gameBoosts={gameBoosts}
						openTabs={openTabs}
						registry={registry}
						onRegistryChange={onRegistryChange}
						formatTabLabel={formatTabLabel}
						onOpenGameDetail={onOpenGameDetail}
					/>
				))}
			</div>
		))}
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
	onRefresh,
	onToggleEnabled,
	onToggleFavoriteTeam,
	onRegistryChange,
	formatTabLabel,
}: mainViewProps) => {
	const oneWeekFromNow = Date.now() + 7 * 24 * 60 * 60 * 1000;
	const noLeaguesSelected = prefs.enabledLeagues.length === 0;
	const loadingMessage = useMemo(() => getRandomLoadingMessage(), []);
	const scoreByGameId = useMemo(() => new Map(scores.map(s => [s.gameId, s.total])), [scores]);
	const sortGames = useMemo(
		() => buildFavoritePinnedComparator(favoriteTeamIds, scoreByGameId),
		[favoriteTeamIds, scoreByGameId],
	);
	const liveGames = games.filter(g => g.status === 'in');
	const upcomingGames = games
		.filter(g => g.status === 'pre')
		.filter(g => !g.startTime || new Date(g.startTime).getTime() <= oneWeekFromNow)
		.sort(sortGames);

	const registeredGameIds = new Set(registry.map(r => r.gameId));
	const assignedLiveGames = liveGames.filter(g => registeredGameIds.has(g.id)).sort(sortGames);
	const unassignedLiveGames = liveGames.filter(g => !registeredGameIds.has(g.id)).sort(sortGames);

	const showNoGames = !isLoading && !noLeaguesSelected && liveGames.length === 0
		&& registry.length === 0 && (!prefs.showUpcomingGames || upcomingGames.length === 0);

	return (
		<div className='popup-container d-flex flex-column'>
			<div className='d-flex justify-content-between align-items-center mb-2 pb-2'>
				<img src='/images/full_logo_white_on_transparent.png' alt='ArenaSwap' className='arenaswap-logo' />
				<div className='d-flex align-items-center gap-2'>
					<button className='btn btn-sm p-0 popup-settings-button' onClick={onOpenSetup} title='Settings'>
						<i className='bi bi-gear-fill popup-settings-icon' />
					</button>
					<div className='form-check form-switch mb-0'>
						<input className='form-check-input' type='checkbox' id='enableToggle' checked={prefs.enabled} onChange={onToggleEnabled} disabled={!prefsLoaded} />
					</div>
				</div>
			</div>

			<GameListHeader isLoading={isLoading} hasError={hasError} loadingMessage={loadingMessage} onRefresh={onRefresh} />

			{onStandbyStream && (
				<div className='d-flex align-items-center gap-2 px-2 py-1 mb-1 rounded text-body-secondary small bg-body-secondary'>
					<i className='bi bi-broadcast text-primary' />
					<span>On standby stream — waiting for action</span>
				</div>
			)}

			<EmptyGameState
				noLeaguesSelected={!isLoading && noLeaguesSelected}
				noGames={showNoGames}
				onOpenSetup={onOpenSetup}
				onRefresh={onRefresh}
			/>

			{!isLoading && !noLeaguesSelected && <ProTip context='main' />}
			{!isLoading && !noLeaguesSelected && assignedLiveGames.length > 0 && gameSection({ title: 'Active Live Tabs', games: assignedLiveGames, scores, leagueLogos, favoriteTeamIds, onToggleFavoriteTeam, gameBoosts, openTabs, registry, onRegistryChange, formatTabLabel, onOpenGameDetail })}
			{!isLoading && !noLeaguesSelected && unassignedLiveGames.length > 0 && gameSection({ title: 'Other Live Games', games: unassignedLiveGames, scores, leagueLogos, favoriteTeamIds, onToggleFavoriteTeam, gameBoosts, openTabs, registry, onRegistryChange, formatTabLabel, onOpenGameDetail })}
			{!isLoading && !noLeaguesSelected && prefs.showUpcomingGames && upcomingGames.length > 0 && gameSection({ title: 'Up Next', games: upcomingGames, scores: [], leagueLogos, favoriteTeamIds, onToggleFavoriteTeam, gameBoosts, openTabs, registry, onRegistryChange, formatTabLabel, onOpenGameDetail })}

			<PopupFooter />
		</div>
	);
};

export default mainView;
