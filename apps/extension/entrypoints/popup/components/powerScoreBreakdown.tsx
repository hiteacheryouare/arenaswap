import {
	scoreMaxCloseness,
	scoreMaxComeback,
	scoreMaxLateGame,
	scoreMaxLeadChanges,
	scoreMaxMomentum,
	scoreMaxTotal,
} from '@arenaswap/core/constants';

interface powerScoreBreakdownProps {
	closeness: number;
	lateGame: number;
	momentum: number;
	leadChanges: number;
	comeback: number;
	baseTotal: number;
	isStalled: boolean;
	totalBeforeBonuses: number;
	favoriteBonus: number;
	favoriteTeamCount: number;
	currentBoost: number;
	scoringOpportunityBoost: number;
	total: number;
	totalLabel: string;
}

const signalMeta = [
	{ label: 'Closeness', max: scoreMaxCloseness, color: '#22c55e' },
	{ label: 'Late-game', max: scoreMaxLateGame, color: '#f75c03' },
	{ label: 'Momentum', max: scoreMaxMomentum, color: '#2274a5' },
	{ label: 'Lead changes', max: scoreMaxLeadChanges, color: '#f1c40f' },
	{ label: 'Comeback', max: scoreMaxComeback, color: '#d90368' },
];

const PowerScoreBreakdown = ({
	closeness,
	lateGame,
	momentum,
	leadChanges,
	comeback,
	baseTotal,
	isStalled,
	totalBeforeBonuses,
	favoriteBonus,
	favoriteTeamCount,
	currentBoost,
	scoringOpportunityBoost,
	totalLabel,
}: powerScoreBreakdownProps) => {
	const signalValues = [closeness, lateGame, momentum, leadChanges, comeback];

	return (
		<section className='powerscore-breakdown game-detail-formula-card'>
			<div className='powerscore-breakdown-heading'>PowerScore Breakdown</div>
			{signalMeta.map((sig, i) => {
				const val = signalValues[i] ?? 0;
				const pct = sig.max > 0 ? Math.min((val / sig.max) * 100, 100) : 0;
				return (
					<div key={sig.label} className='powerscore-signal-row'>
						<span className='powerscore-signal-dot' style={{ backgroundColor: sig.color }} />
						<span className='powerscore-signal-name'>{sig.label}</span>
						<div className='progress powerscore-signal-progress flex-grow-1'>
							<div
								className='progress-bar'
								role='progressbar'
								style={{ width: `${pct}%`, backgroundColor: sig.color }}
								aria-valuenow={val}
								aria-valuemin={0}
								aria-valuemax={sig.max}
							/>
						</div>
						<span className='powerscore-signal-value'>{val}<span className='powerscore-signal-max'>/{sig.max}</span></span>
					</div>
				);
			})}
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
					game clock frozen — {baseTotal} → {totalBeforeBonuses} pts before bonuses
				</div>
			)}
			<div className='powerscore-breakdown-row'><span>Favorite bonus</span><span>{favoriteBonus > 0 ? `+${favoriteBonus}` : '0'}</span></div>
			{favoriteBonus > 0 && <div className='powerscore-breakdown-note'>{favoriteTeamCount} favorite team{favoriteTeamCount === 1 ? '' : 's'} in matchup</div>}
			<div className='powerscore-breakdown-row'><span>Game boost</span><span>{currentBoost > 0 ? `+${currentBoost}` : '0'}</span></div>
			<div className='powerscore-breakdown-row'><span>Scoring opportunity</span><span>{scoringOpportunityBoost > 0 ? `+${scoringOpportunityBoost}` : '0'}</span></div>
			<div className='powerscore-breakdown-row powerscore-breakdown-row-total'><span>Final PowerScore</span><span>{totalLabel}</span></div>
		</section>
	);
};

export default PowerScoreBreakdown;
