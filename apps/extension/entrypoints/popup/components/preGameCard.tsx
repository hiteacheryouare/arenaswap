import { createFavoriteTeamKey } from '@arenaswap/core/constants';
import TabAssignSelect from './tabAssignSelect';
import type { gameCardProps } from './gameCardTypes';
import { formatStartDateTime, gameMeta as GameMeta, teamColumn as TeamColumn } from './gameCardShared';

const preGameCard = ({ game, favoriteTeamIds, onToggleFavoriteTeam, openTabs, registry, onRegistryChange, formatTabLabel }: gameCardProps) => {
	if (!game) return null;

	const awayFavoriteTeamKey = createFavoriteTeamKey(game.league, game.awayTeam.id);
	const homeFavoriteTeamKey = createFavoriteTeamKey(game.league, game.homeTeam.id);
	const awayFavorited = favoriteTeamIds.has(awayFavoriteTeamKey);
	const homeFavorited = favoriteTeamIds.has(homeFavoriteTeamKey);

	return (
		<div className='game-card' style={{ borderLeft: `5px solid ${game.awayTeam.color ?? '#dee2e6'}`, borderRight: `5px solid ${game.homeTeam.color ?? '#dee2e6'}`, background: `linear-gradient(to right, ${game.awayTeam.color ?? '#dee2e6'}28, ${game.homeTeam.color ?? '#dee2e6'}28), #ffffff` }}>
			<div className='d-flex align-items-center justify-content-center game-card-matchup'>
				<TeamColumn leagueId={game.league} team={game.awayTeam} isFavorited={awayFavorited} onToggleFavoriteTeam={onToggleFavoriteTeam} />
				<div className='d-flex flex-column align-items-center game-card-center'>
					<span className='pre-game-vs'>vs</span>
					{game.startTime && (
						<span className='font-lekton text-center text-nowrap pre-game-start-time'>
							{formatStartDateTime(game.startTime)}
						</span>
					)}
				</div>
				<TeamColumn leagueId={game.league} team={game.homeTeam} isFavorited={homeFavorited} onToggleFavoriteTeam={onToggleFavoriteTeam} />
			</div>
			<GameMeta game={game} />
			<TabAssignSelect gameId={game.id} openTabs={openTabs} registry={registry} onChange={onRegistryChange} formatTabLabel={formatTabLabel} />
		</div>
	);
};

export default preGameCard;
