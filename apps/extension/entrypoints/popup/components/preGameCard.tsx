import TabAssignSelect from './tabAssignSelect';
import type { gameCardProps } from './gameCardTypes';
import { formatStartDateTime, gameMeta as GameMeta, teamColumn as TeamColumn } from './gameCardShared';

const preGameCard = ({ game, favoriteTeamIds, onToggleFavoriteTeam, openTabs, registry, onRegistryChange, formatTabLabel }: gameCardProps) => {
	if (!game) return null;

	const awayFavorited = favoriteTeamIds.has(game.awayTeam.id);
	const homeFavorited = favoriteTeamIds.has(game.homeTeam.id);

	return (
		<div className='game-card' style={{ borderLeft: `5px solid ${game.awayTeam.color ?? '#dee2e6'}`, borderRight: `5px solid ${game.homeTeam.color ?? '#dee2e6'}` }}>
			<div className='d-flex align-items-center justify-content-center game-card-matchup'>
				<TeamColumn team={game.awayTeam} isFavorited={awayFavorited} onToggleFavoriteTeam={onToggleFavoriteTeam} />
				<div className='d-flex flex-column align-items-center game-card-center'>
					<span className='pre-game-vs'>vs</span>
					{game.startTime && (
						<span className='font-lekton text-center text-nowrap pre-game-start-time'>
							{formatStartDateTime(game.startTime)}
						</span>
					)}
				</div>
				<TeamColumn team={game.homeTeam} isFavorited={homeFavorited} onToggleFavoriteTeam={onToggleFavoriteTeam} />
			</div>
			<GameMeta game={game} />
			<TabAssignSelect gameId={game.id} openTabs={openTabs} registry={registry} onChange={onRegistryChange} formatTabLabel={formatTabLabel} />
		</div>
	);
};

export default preGameCard;
