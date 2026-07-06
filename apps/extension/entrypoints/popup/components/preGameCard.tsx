import { createFavoriteTeamKey } from '@arenaswap/core/constants';
import TabAssignSelect from './tabAssignSelect';
import type { gameCardProps } from './gameCardTypes';
import { buildCardHandlers, buildGameCardStyle, formatStartDateTime, GameMeta, TeamColumn } from './gameCardShared';
import { conditionIcon, formatTemperature } from './weatherUtils';
import { i18n } from '#i18n';

const preGameCard = ({ game, favoriteTeamIds, onToggleFavoriteTeam, openTabs, registry, onRegistryChange, formatTabLabel, onOpenGameDetail, bettingPrefs, weatherPrefs }: gameCardProps) => {
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
			aria-label={i18n.t('gameCard.openDetails', { away: game.awayTeam.abbreviation, home: game.homeTeam.abbreviation })}
		>
			<div className='d-flex align-items-center justify-content-center game-card-matchup'>
				<TeamColumn leagueId={game.league} team={game.awayTeam} isFavorited={awayFavorited} onToggleFavoriteTeam={onToggleFavoriteTeam} />
				<div className='d-flex flex-column align-items-center game-card-center'>
					<span className='pre-game-vs'>{i18n.t('gameCard.vs')}</span>
					{game.startTime && (
						<span className='font-lekton text-center text-nowrap pre-game-start-time'>
							{formatStartDateTime(game.startTime)}
						</span>
					)}
					{game.weather && (
						<div className='pre-game-weather' aria-hidden='true'>
							<i className={`bi ${conditionIcon(game.weather.conditionLabel)}`} />
							<span>{formatTemperature(game.weather.temperatureF, weatherPrefs.temperatureUnit)}</span>
						</div>
					)}
				</div>
				<TeamColumn leagueId={game.league} team={game.homeTeam} isFavorited={homeFavorited} onToggleFavoriteTeam={onToggleFavoriteTeam} />
			</div>
			<GameMeta game={game} bettingPrefs={bettingPrefs} hideBroadcasts />
			<TabAssignSelect gameId={game.id} openTabs={openTabs} registry={registry} onChange={onRegistryChange} formatTabLabel={formatTabLabel} />
		</div>
	);
};

export default preGameCard;
