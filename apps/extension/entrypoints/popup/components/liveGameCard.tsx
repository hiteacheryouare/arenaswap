import { useState } from 'react';
import {
	leagueConfigMap,
	scoreMaxCloseness,
	scoreMaxComeback,
	scoreMaxLateGame,
	scoreMaxLeadChanges,
	scoreMaxMomentum,
	scoreMaxTotal,
	stallPenaltyMultiplier,
} from '@arenaswap/core/constants';
import FlipScore from './flipScore';
import TabAssignSelect from './tabAssignSelect';
import type { gameCardProps } from './gameCardTypes';
import { formatClock, formatPeriod, gameMeta as GameMeta, powerScoreColor, stallPenaltyPercent, teamColumn as TeamColumn } from './gameCardShared';

const liveGameCard = ({ game, excitementResult, favoriteTeamIds, onToggleFavoriteTeam, openTabs, registry, onRegistryChange, formatTabLabel }: gameCardProps) => {
	const [showPowerScoreDetails, setShowPowerScoreDetails] = useState(false);
	if (!game) return null;

	const isOt = game.period > leagueConfigMap[game.league].regularPeriods;
	const closenessScore = excitementResult?.closeness ?? 0;
	const lateGameScore = excitementResult?.lateGame ?? 0;
	const momentumScore = excitementResult?.momentum ?? 0;
	const leadChangesScore = excitementResult?.leadChanges ?? 0;
	const comebackScore = excitementResult?.comeback ?? 0;
	const totalPowerScore = excitementResult?.total ?? 0;
	const reason = excitementResult?.reason ?? 'Best Available';
	const rawPowerScore = closenessScore + lateGameScore + momentumScore + leadChangesScore + comebackScore;
	const baseTotal = excitementResult?.baseTotal ?? (excitementResult?.stalled ? Math.round(rawPowerScore * stallPenaltyMultiplier) : rawPowerScore);
	const favoriteBonus = excitementResult?.favoriteBonus ?? 0;
	const favoriteTeamCount = excitementResult?.favoriteTeamCount ?? 0;
	const awayFavorited = favoriteTeamIds.has(game.awayTeam.id);
	const homeFavorited = favoriteTeamIds.has(game.homeTeam.id);
	const totalLabel = totalPowerScore > scoreMaxTotal
		? `${totalPowerScore} (base max ${scoreMaxTotal})`
		: `${totalPowerScore} / ${scoreMaxTotal}`;

	return (
		<div className={`game-card${isOt ? ' is-ot' : ''}`} style={{ borderLeft: `5px solid ${game.awayTeam.color ?? '#dee2e6'}`, borderRight: `5px solid ${game.homeTeam.color ?? '#dee2e6'}` }}>
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
					<div className='powerscore-breakdown-heading'>How this score was calculated</div>
					<div className='powerscore-breakdown-row'><span>Closeness</span><span>{closenessScore} / {scoreMaxCloseness}</span></div>
					<div className='powerscore-breakdown-row'><span>Late-game pressure</span><span>{lateGameScore} / {scoreMaxLateGame}</span></div>
					<div className='powerscore-breakdown-row'><span>Momentum</span><span>{momentumScore} / {scoreMaxMomentum}</span></div>
					<div className='powerscore-breakdown-row'><span>Lead changes</span><span>{leadChangesScore} / {scoreMaxLeadChanges}</span></div>
					<div className='powerscore-breakdown-row'><span>Comeback</span><span>{comebackScore} / {scoreMaxComeback}</span></div>
					<div className='powerscore-breakdown-row'><span>Raw subtotal</span><span>{closenessScore} + {lateGameScore} + {momentumScore} + {leadChangesScore} + {comebackScore} = {rawPowerScore}</span></div>
					{excitementResult.stalled
						? <div className='powerscore-breakdown-row'><span>Clock stall penalty</span><span>-{stallPenaltyPercent}% ({rawPowerScore} x {stallPenaltyMultiplier} ~= {baseTotal})</span></div>
						: <div className='powerscore-breakdown-row'><span>Clock stall penalty</span><span>None</span></div>}
					<div className='powerscore-breakdown-row'><span>Base total</span><span>{baseTotal}</span></div>
					<div className='powerscore-breakdown-row'><span>Favorite team bonus</span><span>{favoriteBonus > 0 ? `+${favoriteBonus} (${favoriteTeamCount} team${favoriteTeamCount === 1 ? '' : 's'})` : 'None'}</span></div>
					<div className='powerscore-breakdown-row powerscore-breakdown-row-total'><span>Final PowerScore</span><span>{totalLabel}</span></div>
					<div className='powerscore-breakdown-reason'>Why this score: {reason}</div>
				</div>
			)}

			<div className='d-flex align-items-center justify-content-center game-card-matchup'>
				<TeamColumn team={game.awayTeam} isFavorited={awayFavorited} onToggleFavoriteTeam={onToggleFavoriteTeam} />
				<div className='d-flex flex-column align-items-center game-card-center'>
					<div className='d-flex align-items-baseline game-score-row'>
						<FlipScore value={game.awayTeam.score} className='fw-bold lh-1 game-score-value' />
						<FlipScore value={game.homeTeam.score} className='fw-bold lh-1 game-score-value' />
					</div>
					{game.sportType !== 'baseball' && <span className='font-lekton game-clock'>{formatClock(game.clockSeconds)}</span>}
					<span className='font-lekton game-period'>{formatPeriod(game)}</span>
				</div>
				<TeamColumn team={game.homeTeam} isFavorited={homeFavorited} onToggleFavoriteTeam={onToggleFavoriteTeam} />
			</div>

			<GameMeta game={game} />
			<TabAssignSelect gameId={game.id} openTabs={openTabs} registry={registry} onChange={onRegistryChange} formatTabLabel={formatTabLabel} />
		</div>
	);
};

export default liveGameCard;
