import {
	createFavoriteTeamKey,
	leagueConfigMap,
	scoreMaxTotal,
	sportTypeConfigMap,
} from '@arenaswap/core/constants';
import BaseDiamond from './baseDiamond';
import BsoIndicator from './bsoIndicator';
import FlipScore from './flipScore';
import type { GameCardDisplayProps } from './gameCardTypes';
import { buildCardHandlers, buildGameCardStyle, formatGameClock, formatPeriod, GameMeta, powerScoreColor, TeamColumn } from './gameCardShared';
import { useT } from './i18nContext';

const liveGameCard = ({ game, excitementResult, favoriteTeamIds, onToggleFavoriteTeam, onOpenGameDetail, bettingPrefs, tabSlot }: GameCardDisplayProps) => {
	const t = useT();
	if (!game) return null;

	const isOt = game.period > (leagueConfigMap[game.league]?.regularPeriods ?? 4);
	const totalPowerScore = excitementResult?.total ?? 0;
	const sportTypeConfig = sportTypeConfigMap[game.sportType];
	const isInningSport = leagueConfigMap[game.league]?.periodFormat === 'innings';
	const hasClock = sportTypeConfig.clockBased;
	const awayFavoriteTeamKey = createFavoriteTeamKey(game.league, game.awayTeam.id);
	const homeFavoriteTeamKey = createFavoriteTeamKey(game.league, game.homeTeam.id);
	const awayFavorited = favoriteTeamIds.has(awayFavoriteTeamKey);
	const homeFavorited = favoriteTeamIds.has(homeFavoriteTeamKey);
	const psBarPercent = Math.min((totalPowerScore / scoreMaxTotal) * 100, 100);
	const { onClick: onCardClick, onKeyDown: onCardKeyDown } = buildCardHandlers(onOpenGameDetail, game.id);

	return (
		<div
			className={`game-card game-card-clickable${isOt ? ' is-ot' : ''}`}
			style={buildGameCardStyle(game)}
			role='button'
			tabIndex={0}
			onClick={onCardClick}
			onKeyDown={onCardKeyDown}
			aria-label={t('gameCard.openDetails', { away: game.awayTeam.abbreviation, home: game.homeTeam.abbreviation })}
		>
			<div className='d-flex align-items-center gap-1 fw-bold text-uppercase text-primary live-status-label mb-1'>
				<span className='live-dot' />
				{t('gameCard.live')}
			</div>

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
					<span className='font-lekton game-period'>
						{isInningSport && game.topOfInning !== undefined ? (game.topOfInning ? '▲ ' : '▼ ') : ''}{formatPeriod(game)}
					</span>
					{isInningSport && game.bso && <BsoIndicator {...game.bso} />}
					{game.sportType === 'football' && game.downDistance && (
						<span className='font-lekton game-period'>{game.downDistance}</span>
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
							style={{ width: `${psBarPercent}%`, backgroundColor: powerScoreColor(totalPowerScore, scoreMaxTotal) }}
							aria-valuenow={totalPowerScore}
							aria-valuemin={0}
							aria-valuemax={scoreMaxTotal}
						/>
					</div>
					<span className='game-card-ps-score' style={{ color: powerScoreColor(totalPowerScore, scoreMaxTotal) }}>
						{totalPowerScore} / {scoreMaxTotal}
					</span>
				</div>
			)}

			{tabSlot}
		</div>
	);
};

export default liveGameCard;
