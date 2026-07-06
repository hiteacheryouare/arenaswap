import {
	scoreMaxCloseness,
	scoreMaxComeback,
	scoreMaxLateGame,
	scoreMaxLeadChanges,
	scoreMaxMomentum,
	scoreMaxTotal,
} from '@arenaswap/core/constants';
import { i18n } from '#i18n';

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
	postseasonBoost: number;
	total: number;
	totalLabel: string;
}

const signalMeta = [
	{ labelKey: 'powerScore.signalCloseness', max: scoreMaxCloseness, color: '#22c55e' },
	{ labelKey: 'powerScore.signalLateGame', max: scoreMaxLateGame, color: '#f75c03' },
	{ labelKey: 'powerScore.signalMomentum', max: scoreMaxMomentum, color: '#2274a5' },
	{ labelKey: 'powerScore.signalLeadChanges', max: scoreMaxLeadChanges, color: '#f1c40f' },
	{ labelKey: 'powerScore.signalComeback', max: scoreMaxComeback, color: '#d90368' },
] as const;

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
	postseasonBoost,
	totalLabel,
}: powerScoreBreakdownProps) => {
	const signalValues = [closeness, lateGame, momentum, leadChanges, comeback];

	return (
		<section className='powerscore-breakdown game-detail-formula-card'>
			<div className='powerscore-breakdown-heading'>{i18n.t('powerScore.heading')}</div>
			{signalMeta.map((sig, i) => {
				const val = signalValues[i] ?? 0;
				const pct = sig.max > 0 ? Math.min((val / sig.max) * 100, 100) : 0;
				return (
					<div key={sig.labelKey} className='powerscore-signal-row'>
						<span className='powerscore-signal-dot' style={{ backgroundColor: sig.color }} />
						<span className='powerscore-signal-name'>{i18n.t(sig.labelKey)}</span>
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
				<span>{i18n.t('powerScore.signalsTotal')}</span>
				<span>{baseTotal}{baseTotal > scoreMaxTotal ? ` ${i18n.t('powerScore.cappedAt', { max: scoreMaxTotal })}` : ''}</span>
			</div>
			<div className='powerscore-breakdown-row powerscore-breakdown-row-penalty'>
				<span>{i18n.t('powerScore.clockStallPenalty')}</span>
				<span>{isStalled ? i18n.t('powerScore.applied') : i18n.t('powerScore.none')}</span>
			</div>
			{isStalled && (
				<div className='powerscore-breakdown-note'>
					{i18n.t('powerScore.clockFrozenNote', { before: baseTotal, after: totalBeforeBonuses })}
				</div>
			)}
			<div className='powerscore-breakdown-row'><span>{i18n.t('powerScore.favoriteBonus')}</span><span>{favoriteBonus > 0 ? `+${favoriteBonus}` : '0'}</span></div>
			{favoriteBonus > 0 && <div className='powerscore-breakdown-note'>{i18n.t('powerScore.favoriteTeamsInMatchup', favoriteTeamCount)}</div>}
			<div className='powerscore-breakdown-row'><span>{i18n.t('powerScore.gameBoost')}</span><span>{currentBoost > 0 ? `+${currentBoost}` : '0'}</span></div>
			<div className='powerscore-breakdown-row'><span>{i18n.t('powerScore.scoringOpportunity')}</span><span>{scoringOpportunityBoost > 0 ? `+${scoringOpportunityBoost}` : '0'}</span></div>
			<div className='powerscore-breakdown-row'><span>{i18n.t('powerScore.postseasonBoost')}</span><span>{postseasonBoost > 0 ? `+${postseasonBoost}` : '0'}</span></div>
			<div className='powerscore-breakdown-row powerscore-breakdown-row-total'><span>{i18n.t('powerScore.finalPowerScore')}</span><span>{totalLabel}</span></div>
		</section>
	);
};

export default PowerScoreBreakdown;
