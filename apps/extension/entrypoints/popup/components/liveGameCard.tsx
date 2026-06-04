import { useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import {
	createFavoriteTeamKey,
	leagueConfigMap,
	scoreMaxCloseness,
	scoreMaxComeback,
	scoreMaxLateGame,
	scoreMaxLeadChanges,
	scoreMaxMomentum,
	scoreMaxTotal,
	sportTypeConfigMap,
} from '@arenaswap/core/constants';
import BaseDiamond from './baseDiamond';
import FlipScore from './flipScore';
import TabAssignSelect from './tabAssignSelect';
import type { gameCardProps } from './gameCardTypes';
import { formatClock, formatPeriod, gameMeta as GameMeta, isInteractiveCardTarget, powerScoreColor, teamColumn as TeamColumn } from './gameCardShared';

const liveGameCard = ({ game, excitementResult, favoriteTeamIds, onToggleFavoriteTeam, gameBoosts, openTabs, registry, onRegistryChange, formatTabLabel, onOpenGameDetail }: gameCardProps) => {
	const [showPowerScoreDetails, setShowPowerScoreDetails] = useState(false);
	if (!game) return null;

	const isOt = game.period > (leagueConfigMap[game.league]?.regularPeriods ?? 4);
	const closenessScore = excitementResult?.closeness ?? 0;
	const lateGameScore = excitementResult?.lateGame ?? 0;
	const momentumScore = excitementResult?.momentum ?? 0;
	const leadChangesScore = excitementResult?.leadChanges ?? 0;
	const comebackScore = excitementResult?.comeback ?? 0;
	const totalPowerScore = excitementResult?.total ?? 0;
	const reason = excitementResult?.reason ?? 'Best Available';
	const sportTypeConfig = sportTypeConfigMap[game.sportType];
	const rawPowerScore = closenessScore + lateGameScore + momentumScore + leadChangesScore + comebackScore;
	// When stalled, baseTotal is the pre-stall signals sum (could exceed 100).
	// When not stalled, it equals rawPowerScore.
	const baseTotal = excitementResult?.baseTotal ?? rawPowerScore;
	const isStalled = excitementResult?.stalled === true;
	// Base score before bonuses: total minus anything added by background.ts on top.
	const favoriteBonus = excitementResult?.favoriteBonus ?? 0;
	const favoriteTeamCount = excitementResult?.favoriteTeamCount ?? 0;
	const currentBoost = gameBoosts[game.id] ?? 0;
	const awayFavoriteTeamKey = createFavoriteTeamKey(game.league, game.awayTeam.id);
	const homeFavoriteTeamKey = createFavoriteTeamKey(game.league, game.homeTeam.id);
	const awayFavorited = favoriteTeamIds.has(awayFavoriteTeamKey);
	const homeFavorited = favoriteTeamIds.has(homeFavoriteTeamKey);
	const totalLabel = totalPowerScore > scoreMaxTotal
		? `${totalPowerScore} (base max ${scoreMaxTotal})`
		: `${totalPowerScore} / ${scoreMaxTotal}`;

	const isBaseball = game.sportType === 'baseball';
	const hasClock = sportTypeConfig.clockBased;

	const onCardClick = (event: MouseEvent<HTMLDivElement>) => {
		if (isInteractiveCardTarget(event.target)) return;
		onOpenGameDetail(game.id);
	};

	const onCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		if (isInteractiveCardTarget(event.target)) return;
		event.preventDefault();
		onOpenGameDetail(game.id);
	};

	return (
		<div
			className={`game-card game-card-clickable${isOt ? ' is-ot' : ''}`}
			style={{ borderLeft: `5px solid ${game.awayTeam.color ?? '#dee2e6'}`, borderRight: `5px solid ${game.homeTeam.color ?? '#dee2e6'}`, background: `linear-gradient(to right, ${game.awayTeam.color ?? '#dee2e6'}28, ${game.homeTeam.color ?? '#dee2e6'}28), #ffffff` }}
			role='button'
			tabIndex={0}
			onClick={onCardClick}
			onKeyDown={onCardKeyDown}
			aria-label={`Open details for ${game.awayTeam.abbreviation} vs ${game.homeTeam.abbreviation}`}
		>
			<div className='d-flex justify-content-between align-items-center mb-1'>
				<div className='d-flex align-items-center gap-1 fw-bold text-uppercase text-primary live-status-label'>
					<span className='live-dot' />
					LIVE
				</div>
				{excitementResult && (
					<button type='button' className='powerscore powerscore-button' style={{ backgroundColor: powerScoreColor(totalPowerScore, scoreMaxTotal) }} onClick={() => setShowPowerScoreDetails(current => !current)} aria-expanded={showPowerScoreDetails} aria-label='Toggle PowerScore details'>
						PowerScore: {totalLabel}
						<i className={`bi ${showPowerScoreDetails ? 'bi-chevron-up' : 'bi-chevron-down'}`} />
					</button>
				)}
			</div>

			{excitementResult && showPowerScoreDetails && (
				<div className='powerscore-breakdown'>
					<div className='powerscore-breakdown-heading'>Score breakdown</div>
					<div className='powerscore-breakdown-row'><span>Closeness</span><span>{closenessScore} / {scoreMaxCloseness}</span></div>
					<div className='powerscore-breakdown-row'><span>Late-game pressure</span><span>{lateGameScore} / {scoreMaxLateGame}</span></div>
					<div className='powerscore-breakdown-row'><span>Momentum</span><span>{momentumScore} / {scoreMaxMomentum}</span></div>
					<div className='powerscore-breakdown-row'><span>Lead changes</span><span>{leadChangesScore} / {scoreMaxLeadChanges}</span></div>
					<div className='powerscore-breakdown-row'><span>Comeback</span><span>{comebackScore} / {scoreMaxComeback}</span></div>
					<div className='powerscore-breakdown-row powerscore-breakdown-row-subtotal'>
						<span>Signals total</span>
						<span>{baseTotal}{baseTotal > scoreMaxTotal ? ` (capped at ${scoreMaxTotal})` : ''}</span>
					</div>
					<div className='powerscore-breakdown-row powerscore-breakdown-row-penalty'>
						<span>Clock stall penalty</span>
						<span>{isStalled ? 'applied' : 'none'}</span>
					</div>
					{isStalled && (
						<div className='powerscore-breakdown-note'>
							game clock frozen — {baseTotal} → {totalPowerScore - favoriteBonus - currentBoost} pts before bonuses
						</div>
					)}
					<div className='powerscore-breakdown-row'><span>Favorite team bonus</span><span>{favoriteBonus > 0 ? `+${favoriteBonus}` : '0'}</span></div>
					{favoriteBonus > 0 && <div className='powerscore-breakdown-note'>{favoriteTeamCount} favorite team{favoriteTeamCount === 1 ? '' : 's'} in matchup</div>}
					<div className='powerscore-breakdown-row'><span>Game boost</span><span>{currentBoost > 0 ? `+${currentBoost}` : '0'}</span></div>
					<div className='powerscore-breakdown-row powerscore-breakdown-row-total'><span>Final PowerScore</span><span>{totalLabel}</span></div>
					<div className='powerscore-breakdown-reason'>Headline reason: {reason}</div>
				</div>
			)}

			<div className='d-flex align-items-center justify-content-center game-card-matchup'>
				<TeamColumn leagueId={game.league} team={game.awayTeam} isFavorited={awayFavorited} onToggleFavoriteTeam={onToggleFavoriteTeam} />
				<div className='d-flex flex-column align-items-center game-card-center'>
					<div className='d-flex align-items-center game-score-row'>
						<FlipScore value={game.awayTeam.score} className='fw-bold lh-1 game-score-value' />
						{isBaseball
							? <BaseDiamond
									first={game.baseRunners?.first ?? false}
									second={game.baseRunners?.second ?? false}
									third={game.baseRunners?.third ?? false}
								/>
							: <span className='game-score-sep' aria-hidden='true' />
						}
						<FlipScore value={game.homeTeam.score} className='fw-bold lh-1 game-score-value' />
					</div>
					{!isBaseball && hasClock && (
						<span className='font-lekton game-clock'>{formatClock(game.clockSeconds)}</span>
					)}
					<span className='font-lekton game-period'>
						{isBaseball && game.topOfInning !== undefined ? (game.topOfInning ? '▲ ' : '▼ ') : ''}{formatPeriod(game)}
					</span>
				</div>
				<TeamColumn leagueId={game.league} team={game.homeTeam} isFavorited={homeFavorited} onToggleFavoriteTeam={onToggleFavoriteTeam} />
			</div>

			<GameMeta game={game} />
			<TabAssignSelect gameId={game.id} openTabs={openTabs} registry={registry} onChange={onRegistryChange} formatTabLabel={formatTabLabel} />
		</div>
	);
};

export default liveGameCard;
