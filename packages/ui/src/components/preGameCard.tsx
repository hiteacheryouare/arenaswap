import { createFavoriteTeamKey } from '@arenaswap/core/constants';
import type { GameCardDisplayProps } from './gameCardTypes';
import { CardStatusRow, GameMeta, PostseasonLabel, TeamColumn, buildCardHandlers, buildGameCardSurface, formatStartDateTime, formatStartTime } from './gameCardShared';
import { conditionIcon, formatTemperature } from './weatherUtils';
import { useDisplayLocale, useT } from './i18nContext';
import useSwitchCrest from './useSwitchCrest';

const preGameCard = ({ game, favoriteTeamIds, onToggleFavoriteTeam, onOpenGameDetail, bettingPrefs, weatherPrefs, tabSlot, leagueSlot, dayNamedAbove = false }: GameCardDisplayProps) => {
	const t = useT();
	const locale = useDisplayLocale();
	useSwitchCrest(game?.awayTeam ?? {}, game?.homeTeam ?? {});
	if (!game) return null;

	const awayFavoriteTeamKey = createFavoriteTeamKey(game.league, game.awayTeam.id);
	const homeFavoriteTeamKey = createFavoriteTeamKey(game.league, game.homeTeam.id);
	const awayFavorited = favoriteTeamIds.has(awayFavoriteTeamKey);
	const homeFavorited = favoriteTeamIds.has(homeFavoriteTeamKey);
	const { onClick: onCardClick, onKeyDown: onCardKeyDown } = buildCardHandlers(onOpenGameDetail, game.id);
	const surface = buildGameCardSurface(game);

	return (
		<div
			className='game-card game-card-clickable is-team-colored'
			style={surface.style}
			role='button'
			tabIndex={0}
			onClick={onCardClick}
			onKeyDown={onCardKeyDown}
			aria-label={t('gameCard.openDetails', { away: game.awayTeam.abbreviation, home: game.homeTeam.abbreviation })}
		>
			{/* A scheduled card has no status row of its own, so the league mark or the round name
			    brings one. Without either, the card keeps the height it has always had. */}
			{(leagueSlot || game.postseasonLabel) && (
				<CardStatusRow status={leagueSlot}><PostseasonLabel game={game} /></CardStatusRow>
			)}

			<div className='d-flex align-items-center justify-content-center game-card-matchup'>
				<TeamColumn leagueId={game.league} team={game.awayTeam} isFavorited={awayFavorited} onToggleFavoriteTeam={onToggleFavoriteTeam} side='away' surface={surface.awayColor} />
				<div className='d-flex flex-column align-items-center game-card-center'>
					<span className='pre-game-vs'>{t('gameCard.vs')}</span>
					{game.startTime && (
						<span className='text-center text-nowrap pre-game-start-time'>
							{dayNamedAbove ? formatStartTime(game.startTime, locale) : formatStartDateTime(game.startTime, locale)}
						</span>
					)}
					{game.weather && weatherPrefs && (
						<div className='pre-game-weather' aria-hidden='true'>
							<i className={`bi ${conditionIcon(game.weather.conditionLabel, game.weather.conditionCode)}`} />
							<span>{formatTemperature(game.weather.temperatureF, weatherPrefs.temperatureUnit)}</span>
						</div>
					)}
				</div>
				<TeamColumn leagueId={game.league} team={game.homeTeam} isFavorited={homeFavorited} onToggleFavoriteTeam={onToggleFavoriteTeam} side='home' surface={surface.homeColor} />
			</div>
			<GameMeta game={game} bettingPrefs={bettingPrefs} hideBroadcasts dark />
			<div className='game-card-footer'>{tabSlot}</div>
		</div>
	);
};

export default preGameCard;
