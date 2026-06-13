import { createFavoriteTeamKey } from '@arenaswap/core/constants';
import TabAssignSelect from './tabAssignSelect';
import type { gameCardProps } from './gameCardTypes';
import { buildCardHandlers, buildGameCardStyle, formatStartDateTime, GameMeta, TeamColumn } from './gameCardShared';

const preGameCard = ({ game, favoriteTeamIds, onToggleFavoriteTeam, openTabs, registry, onRegistryChange, formatTabLabel, onOpenGameDetail }: gameCardProps) => {
	if (!game) return null;

	const awayFavoriteTeamKey = createFavoriteTeamKey(game.league, game.awayTeam.id);
	const homeFavoriteTeamKey = createFavoriteTeamKey(game.league, game.homeTeam.id);
	const awayFavorited = favoriteTeamIds.has(awayFavoriteTeamKey);
	const homeFavorited = favoriteTeamIds.has(homeFavoriteTeamKey);
	const { onClick: onCardClick, onKeyDown: onCardKeyDown } = buildCardHandlers(onOpenGameDetail, game.id);

	return (
		<div
			className='game-card game-card-clickable'
			style={buildGameCardStyle(game)}
			role='button'
			tabIndex={0}
			onClick={onCardClick}
			onKeyDown={onCardKeyDown}
			aria-label={`Open details for ${game.awayTeam.abbreviation} vs ${game.homeTeam.abbreviation}`}
		>
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
