import {
	createFavoriteTeamKey,
	isHomeFirst,
	leagueConfigMap,
	scoreMaxTotal,
	sportTypeConfigMap,
} from '@arenaswap/core/constants';
import BaseDiamond from './baseDiamond';
import BsoIndicator from './bsoIndicator';
import FlipScore from './flipScore';
import InningHalfIcon from './inningHalfIcon';
import type { GameCardDisplayProps } from './gameCardTypes';
import { buildCardShellProps, buildGameCardSurface, CardDetailsButton, CardStatusRow, formatBreak, formatGameClock, formatPeriod, GameMeta, SeasonLabel, powerScoreColor, TeamColumn } from './gameCardShared';
import { useT } from './i18nContext';
import useCountTo from './useCountTo';
import { StaleLeagueNote } from './staleLeagueNote';
import useSwitchCrest from './useSwitchCrest';
import { timeoutAllotment } from './timeoutDots';

const liveGameCard = ({ game, excitementResult, favoriteTeamIds, onToggleFavoriteTeam, onOpenGameDetail, bettingPrefs, tabSlot, leagueSlot, interactive = true }: GameCardDisplayProps) => {
	const t = useT();
	useSwitchCrest(game?.awayTeam ?? {}, game?.homeTeam ?? {});
	const shownPowerScore = useCountTo(excitementResult?.total ?? 0);
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
	const homeFirst = isHomeFirst(game);
	const [leftTeam, rightTeam] = homeFirst ? [game.homeTeam, game.awayTeam] : [game.awayTeam, game.homeTeam];
	const shootout = leftTeam.shootoutScore !== undefined && rightTeam.shootoutScore !== undefined
		? t('gameCard.shootout', { away: leftTeam.shootoutScore, home: rightTeam.shootoutScore })
		: null;
	// The yard line is what tells you whether the down matters. Falls back to the down and distance
	// alone when ESPN omits the field position, as it does at halftime and between drives.
	const downDistanceLine = game.downDistance && game.fieldPosition
		? t('gameCard.downDistanceAt', { downDistance: game.downDistance, fieldPosition: game.fieldPosition })
		: game.downDistance;
	const onBreak = !isInningSport && game.intermission === true;
	const psBarPercent = Math.min((totalPowerScore / scoreMaxTotal) * 100, 100);
	const psColor = powerScoreColor(totalPowerScore, scoreMaxTotal);
	const shellProps = buildCardShellProps(game, t, onOpenGameDetail, interactive);
	const surface = buildGameCardSurface(game, isDelayed);
	const timeoutsMax = timeoutAllotment(game);

	const awayColumn = <TeamColumn leagueId={game.league} team={game.awayTeam} isFavorited={awayFavorited} onToggleFavoriteTeam={onToggleFavoriteTeam} side='away' surface={surface.awayColor} timeoutsMax={timeoutsMax} interactive={interactive} />;
	const homeColumn = <TeamColumn leagueId={game.league} team={game.homeTeam} isFavorited={homeFavorited} onToggleFavoriteTeam={onToggleFavoriteTeam} side='home' surface={surface.homeColor} timeoutsMax={timeoutsMax} interactive={interactive} />;

	return (
		<div
			className={`game-card${interactive ? ' game-card-clickable' : ' game-card-lift'} is-team-colored${isOt ? ' is-ot' : ''}${isDelayed ? ' is-delayed' : ''}`}
			style={surface.style}
			{...shellProps}
		>
			{interactive && <CardDetailsButton game={game} onOpenGameDetail={onOpenGameDetail} />}
			<CardStatusRow
				league={leagueSlot}
				status={isDelayed ? (
					<span className='d-flex align-items-center gap-1 fw-bold text-uppercase delay-status-label'>
						<i className='bi bi-pause-fill' />
						{game.delayDescription ?? t('gameCard.delay')}
					</span>
				) : (
					<span className='d-flex align-items-center gap-1 fw-bold text-uppercase live-status-label'>
						<span className='live-dot' />
						{t('gameCard.live')}
					</span>
				)}
			>
				<SeasonLabel game={game} />
			</CardStatusRow>

			<div className='d-flex align-items-center justify-content-center game-card-matchup'>
				{homeFirst ? homeColumn : awayColumn}
				<div className='d-flex flex-column align-items-center game-card-center'>
					<div className='d-flex align-items-center game-score-row'>
						<FlipScore value={leftTeam.score} className='fw-bold lh-1 game-score-value' />
						{isInningSport
							? <BaseDiamond
									first={game.baseRunners?.first ?? false}
									second={game.baseRunners?.second ?? false}
									third={game.baseRunners?.third ?? false}
								/>
							: <span className='game-score-sep' aria-hidden='true' />
						}
						<FlipScore value={rightTeam.score} className='fw-bold lh-1 game-score-value' />
					</div>
					{!isInningSport && hasClock && !onBreak && (
						<span className='game-clock'>{formatGameClock(game)}</span>
					)}
					{/* The shootout line already carries the period, so rendering the
					    period label above it would just say PENS twice. */}
					{!shootout && (
						<span className='game-period'>
							{isInningSport && <InningHalfIcon topOfInning={game.topOfInning} />}
							{onBreak ? formatBreak(game, t) : formatPeriod(game, t)}
						</span>
					)}
					{shootout && (
						<span className='game-shootout-score'>{shootout}</span>
					)}
					{isInningSport && game.bso && <BsoIndicator {...game.bso} />}
					{game.sportType === 'football' && game.downDistance && (
						<span className='game-period'>{downDistanceLine}</span>
					)}
				</div>
				{homeFirst ? awayColumn : homeColumn}
			</div>

			<GameMeta game={game} bettingPrefs={bettingPrefs} dark interactive={interactive} />
			<StaleLeagueNote league={game.league} />

			{excitementResult && (
				<div className='d-flex align-items-center gap-3 game-card-ps-bar-row'>
					<span className='game-card-ps-label'>{t('gameCard.powerScore')}</span>
					<div className='progress flex-grow-1 game-card-ps-progress'>
						<div
							className='progress-bar'
							role='progressbar'
							aria-label={t('gameCard.powerScore')}
							style={{ width: `${psBarPercent}%`, backgroundColor: psColor }}
							aria-valuenow={totalPowerScore}
							aria-valuemin={0}
							aria-valuemax={scoreMaxTotal}
						/>
					</div>
					<span className='game-card-ps-score'>
						{shownPowerScore} / {scoreMaxTotal}
					</span>
				</div>
			)}
			<div className='game-card-footer'>{tabSlot}</div>
		</div>
	);
};

export default liveGameCard;
