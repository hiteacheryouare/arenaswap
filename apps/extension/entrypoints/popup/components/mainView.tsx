import type { Browser } from 'wxt/browser';
import type {
	Game,
	LeagueId,
	LeagueLogoMap,
	PowerScoreResult,
	TabRegistration,
	UserPreferences,
} from '@arenaswap/core/types';
import GameCard from './gameCard';
import PopupFooter from './popupFooter';
import { byLeague, groupByLeague, leagueLabels } from '../popupHelpers';

interface gameSectionProps {
	title: string;
	games: Game[];
	scores: PowerScoreResult[];
	favoriteTeamIds: Set<string>;
	onToggleFavoriteTeam: (leagueId: LeagueId, teamId: string) => void;
	openTabs: Browser.tabs.Tab[];
	registry: TabRegistration[];
	onRegistryChange: (updated: TabRegistration[]) => void;
	formatTabLabel: (tab: Browser.tabs.Tab) => string;
	onOpenGameDetail: (gameId: string) => void;
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
	openTabs: Browser.tabs.Tab[];
	onOpenGameDetail: (gameId: string) => void;
	onOpenSetup: () => void;
	onToggleEnabled: () => void;
	onToggleFavoriteTeam: (leagueId: LeagueId, teamId: string) => void;
	onRegistryChange: (updated: TabRegistration[]) => void;
	formatTabLabel: (tab: Browser.tabs.Tab) => string;
}

const gameSection = ({
	title,
	games,
	scores,
	favoriteTeamIds,
	onToggleFavoriteTeam,
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
				<div className='fw-bold text-uppercase mt-1 popup-section-label'>{leagueLabels[league] ?? league.toUpperCase()}</div>
				{groupedGames.map(game => (
					<GameCard
						key={game.id}
						game={game}
						excitementResult={scores.find(s => s.gameId === game.id)}
						favoriteTeamIds={favoriteTeamIds}
						onToggleFavoriteTeam={onToggleFavoriteTeam}
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
	openTabs,
	onOpenGameDetail,
	onOpenSetup,
	onToggleEnabled,
	onToggleFavoriteTeam,
	onRegistryChange,
	formatTabLabel,
}: mainViewProps) => {
	const oneWeekFromNow = Date.now() + 7 * 24 * 60 * 60 * 1000;
	const noLeaguesSelected = prefs.enabledLeagues.length === 0;
	const liveGames = games.filter(g => g.status === 'in');
	const upcomingGames = games
		.filter(g => g.status === 'pre')
		.filter(g => !g.startTime || new Date(g.startTime).getTime() <= oneWeekFromNow)
		.sort(byLeague);

	const registeredGameIds = new Set(registry.map(r => r.gameId));
	const assignedLiveGames = liveGames.filter(g => registeredGameIds.has(g.id)).sort(byLeague);
	const unassignedLiveGames = liveGames.filter(g => !registeredGameIds.has(g.id)).sort(byLeague);
	const hasEspnBranding = (
		Object.values(leagueLogos).some(url => typeof url === 'string' && url.toLowerCase().includes('espn'))
		|| games.some(game => (game.odds?.provider?.logoUrl ?? '').toLowerCase().includes('espn'))
	);

	return (
		<div className='popup-container'>
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

			{!isLoading && noLeaguesSelected && (
				<div className='text-center rounded mt-2 mb-3 p-3 popup-empty-leagues'>
					<h2 className='fw-bold text-white lh-sm mb-2 popup-empty-leagues-title'>Choose leagues to get started</h2>
					<p className='mb-2 lh-sm popup-empty-leagues-copy'>
						ArenaSwap needs at least one league selected before it can find games to swap between.
					</p>
					<button className='btn btn-primary btn-lg w-100' onClick={onOpenSetup}>Select Leagues in Settings</button>
				</div>
			)}

			{isLoading && (
				<div className='d-flex justify-content-center align-items-center mt-4 popup-loading-wrap'>
					<div className='spinner-border popup-loading-spinner' role='status'>
						<span className='visually-hidden'>Loading...</span>
					</div>
				</div>
			)}

			{hasError && <div className='alert alert-danger d-flex align-items-center gap-2 mt-3 py-2 px-3 popup-error-banner' role='alert'><i className='bi bi-exclamation-triangle-fill' />Failed to load games. Retrying&hellip;</div>}
			{!isLoading && !noLeaguesSelected && assignedLiveGames.length > 0 && gameSection({ title: 'Active Tabs', games: assignedLiveGames, scores, favoriteTeamIds, onToggleFavoriteTeam, openTabs, registry, onRegistryChange, formatTabLabel, onOpenGameDetail })}
			{!isLoading && !noLeaguesSelected && unassignedLiveGames.length > 0 && gameSection({ title: 'Other Games', games: unassignedLiveGames, scores, favoriteTeamIds, onToggleFavoriteTeam, openTabs, registry, onRegistryChange, formatTabLabel, onOpenGameDetail })}

			{!isLoading && !noLeaguesSelected && liveGames.length === 0 && registry.length === 0 && (!prefs.showUpcomingGames || upcomingGames.length === 0) && (
				<div className='mt-3 text-center'>
					<div className='fw-bold text-body mb-1 popup-no-games-title'>No games right now 💔</div>
					<button className='btn btn-link btn-sm p-0 popup-settings-link' onClick={onOpenSetup}>Settings →</button>
				</div>
			)}

			{!isLoading && !noLeaguesSelected && prefs.showUpcomingGames && upcomingGames.length > 0 && (
				<div className='mt-2'>
					<div className='fw-bold text-body text-center popup-section-title'>Up Next</div>
					{groupByLeague(upcomingGames).map(({ league, games: groupedGames }) => (
						<div key={league}>
							<div className='fw-bold text-uppercase mt-1 popup-section-label'>{leagueLabels[league] ?? league.toUpperCase()}</div>
							{groupedGames.map(game => (
								<GameCard
									key={game.id}
									game={game}
									excitementResult={undefined}
									favoriteTeamIds={favoriteTeamIds}
									onToggleFavoriteTeam={onToggleFavoriteTeam}
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
			)}

			<PopupFooter hasEspnBranding={hasEspnBranding} />
		</div>
	);
};

export default mainView;
