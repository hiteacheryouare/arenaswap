import {
	createFavoriteTeamKey,
	leagueConfigMap,
	scoreMaxTotal,
	sportTypeConfigMap,
} from '@arenaswap/core/constants';
import BaseDiamond from './baseDiamond';
import BsoIndicator from './bsoIndicator';
import FlipScore from './flipScore';
import InningHalfIcon from './inningHalfIcon';
import type { GameCardDisplayProps } from './gameCardTypes';
import { buildCardHandlers, buildGameCardStyle, formatGameClock, formatPeriod, GameMeta, isHalftime, powerScoreColor, TeamColumn } from './gameCardShared';
import { useT } from './i18nContext';

const liveGameCard = ({ game, excitementResult, favoriteTeamIds, onToggleFavoriteTeam, onOpenGameDetail, bettingPrefs, tabSlot }: GameCardDisplayProps) => {
	const t = useT();
	if (!game) return null;

	const isOt = game.period > (leagueConfigMap[game.league]?.regularPeriods ?? 4);
	const isDelayed = game.delayed === true;
	const totalPowerScore = excitementResult?.total ?? 0;
	const sportTypeConfig = sportTypeConfigMap[game.sportType];
	const isInningSport = leagueConfigMap[game.league]?.periodFormat === 'innings';
	const hasClock = sportTypeConfig.clockBased;
	const awayFavoriteTeamKey = createFavoriteTeamKey(game.league, game.awayTeam.id);
	const homeFavoriteTeamKey = createFavoriteTeamKey(game.league, game.homeTeam.id);
	const awayFavorited = favoriteTeamIds.has(awayFavoriteTeamKey);
	const homeFavorited = favoriteTeamIds.has(homeFavoriteTeamKey);
	// A shootout freezes the main score at the 120-minute scoreline, so without this the card sits
	// on "1 – 1" while the tie is being decided. Secondary rather than replacing the score, which
	// everywhere else means goals scored in the match. Shows nothing until both tallies arrive.
	const shootout = game.awayTeam.shootoutScore !== undefined && game.homeTeam.shootoutScore !== undefined
		? t('gameCard.shootout', { away: game.awayTeam.shootoutScore, home: game.homeTeam.shootoutScore })
		: null;
	// The yard line is what tells you whether the down matters. Falls back to the down and distance
	// alone when ESPN omits the field position, as it does at halftime and between drives.
	const downDistanceLine = game.downDistance && game.fieldPosition
		? t('gameCard.downDistanceAt', { downDistance: game.downDistance, fieldPosition: game.fieldPosition })
		: game.downDistance;
	const psBarPercent = Math.min((totalPowerScore / scoreMaxTotal) * 100, 100);
	const psColor = powerScoreColor(totalPowerScore, scoreMaxTotal);
	const { onClick: onCardClick, onKeyDown: onCardKeyDown } = buildCardHandlers(onOpenGameDetail, game.id);

	const delayCardStyle = isDelayed ? {
		borderLeft: '5px solid #F1C40F',
		borderRight: '5px solid #F1C40F',
		background: 'linear-gradient(to right, rgba(241,196,15,0.12), rgba(241,196,15,0.12)), #ffffff',
	} : buildGameCardStyle(game);

	return (
		<div
			className={`game-card game-card-clickable${isOt ? ' is-ot' : ''}${isDelayed ? ' is-delayed' : ''}`}
			style={delayCardStyle}
			role='button'
			tabIndex={0}
			onClick={onCardClick}
			onKeyDown={onCardKeyDown}
			aria-label={t('gameCard.openDetails', { away: game.awayTeam.abbreviation, home: game.homeTeam.abbreviation })}
		>
			{isDelayed ? (
				<div className='d-flex align-items-center gap-1 fw-bold text-uppercase delay-status-label mb-1'>
					<i className='bi bi-pause-fill' />
					{t('gameCard.delay')}
				</div>
			) : (
				<div className='d-flex align-items-center gap-1 fw-bold text-uppercase text-primary live-status-label mb-1'>
					<span className='live-dot' />
					{t('gameCard.live')}
				</div>
			)}

			<div className='d-flex align-items-center justify-content-center game-card-matchup'>
				<TeamColumn leagueId={game.league} team={game.awayTeam} isFavorited={awayFavorited} onToggleFavoriteTeam={onToggleFavoriteTeam} />
				<div className='d-flex flex-column align-items-center game-card-center'>
					<div className='d-flex align-items-center game-score-row'>
						<FlipScore value={game.awayTeam.score} className='fw-bold lh-1 game-score-value' />
						{isInningSport
							? <BaseDiamond
									first={game.baseRunners?.first ?? false}
									second={game.baseRunners?.second ?? false}
									third={game.baseRunners?.third ?? false}
								/>
							: <span className='game-score-sep' aria-hidden='true' />
						}
						<FlipScore value={game.homeTeam.score} className='fw-bold lh-1 game-score-value' />
					</div>
					{!isInningSport && hasClock && (
						<span className='font-lekton game-clock'>{formatGameClock(game)}</span>
					)}
					{/* The shootout line already carries the period, so rendering the
					    period label above it would just say PENS twice. */}
					{!shootout && (
						<span className='font-lekton game-period'>
							{isInningSport && <InningHalfIcon topOfInning={game.topOfInning} />}
							{!isInningSport && game.intermission === true && isHalftime(game) ? t('detail.halftime') : formatPeriod(game)}
						</span>
					)}
					{shootout && (
						<span className='font-lekton game-shootout-score'>{shootout}</span>
					)}
					{isDelayed && (
						<span className='badge bg-warning text-dark delay-type-badge mt-1'>
							{game.delayDescription ?? t('gameCard.delayFallback')}
						</span>
					)}
					{isInningSport && game.bso && <BsoIndicator {...game.bso} />}
					{game.sportType === 'football' && game.downDistance && (
						<span className='font-lekton game-period'>{downDistanceLine}</span>
					)}
				</div>
				<TeamColumn leagueId={game.league} team={game.homeTeam} isFavorited={homeFavorited} onToggleFavoriteTeam={onToggleFavoriteTeam} />
			</div>

			<GameMeta game={game} bettingPrefs={bettingPrefs} />

			{excitementResult && (
				<div className='d-flex align-items-center gap-2 game-card-ps-bar-row'>
					<span className='game-card-ps-label'>{t('gameCard.powerScore')}</span>
					<div className='progress flex-grow-1 game-card-ps-progress'>
						<div
							className='progress-bar'
							role='progressbar'
							style={{ width: `${psBarPercent}%`, backgroundColor: psColor }}
							aria-valuenow={totalPowerScore}
							aria-valuemin={0}
							aria-valuemax={scoreMaxTotal}
						/>
					</div>
					<span className='game-card-ps-score' style={{ color: psColor }}>
						{totalPowerScore} / {scoreMaxTotal}
					</span>
				</div>
			)}

			{tabSlot}
		</div>
	);
};

export default liveGameCard;
