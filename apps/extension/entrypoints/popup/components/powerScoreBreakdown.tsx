import {
	scoreMaxCloseness,
	scoreMaxComeback,
	scoreMaxLateGame,
	scoreMaxLeadChanges,
	scoreMaxMomentum,
	scoreMaxTotal,
} from '@arenaswap/core/constants';
import { i18n } from '#i18n';
import SignalTooltipIcon from './signalTooltipIcon';

interface powerScoreBreakdownProps {
	closeness: number;
	lateGame: number;
	momentum: number;
	leadChanges: number;
	comeback: number;
	/** Win probability volatility boost/penalty (−10 to +10). Omit when data is unavailable. */
	winProbabilityVariance?: number;
	baseTotal: number;
	stallPenalty: number;
	favoriteBonus: number;
	favoriteTeamCount: number;
	currentBoost: number;
	scoringOpportunityBoost: number;
	postseasonBoost: number;
	total: number;
	totalLabel: string;
}

const signalMeta = [
	{ labelKey: 'powerScore.signalCloseness', tooltipKey: 'powerScore.tooltipCloseness', max: scoreMaxCloseness, color: '#22c55e' },
	{ labelKey: 'powerScore.signalLateGame', tooltipKey: 'powerScore.tooltipLateGame', max: scoreMaxLateGame, color: '#f75c03' },
	{ labelKey: 'powerScore.signalMomentum', tooltipKey: 'powerScore.tooltipMomentum', max: scoreMaxMomentum, color: '#2274a5' },
	{ labelKey: 'powerScore.signalLeadChanges', tooltipKey: 'powerScore.tooltipLeadChanges', max: scoreMaxLeadChanges, color: '#f1c40f' },
	{ labelKey: 'powerScore.signalComeback', tooltipKey: 'powerScore.tooltipComeback', max: scoreMaxComeback, color: '#d90368' },
] as const;

const PowerScoreBreakdown = ({
	closeness,
	lateGame,
	momentum,
	leadChanges,
	comeback,
	winProbabilityVariance,
	baseTotal,
	stallPenalty,
	favoriteBonus,
	favoriteTeamCount,
	currentBoost,
	scoringOpportunityBoost,
	postseasonBoost,
	totalLabel,
}: powerScoreBreakdownProps) => {
	const signalValues = [closeness, lateGame, momentum, leadChanges, comeback];
	const signalsSubtotal = closeness + lateGame + momentum + leadChanges + comeback;
	const hasWinProbVariance = winProbabilityVariance !== undefined;
	const variance = winProbabilityVariance ?? 0;

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
						<SignalTooltipIcon text={i18n.t(sig.tooltipKey)} />
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
				<span>{signalsSubtotal}{signalsSubtotal > scoreMaxTotal ? ` ${i18n.t('powerScore.cappedAt', { max: scoreMaxTotal })}` : ''}</span>
			</div>
			<div className='powerscore-breakdown-row powerscore-breakdown-row-penalty'>
				<span className='d-flex align-items-center gap-1'>
					{i18n.t('powerScore.clockStallPenalty')}
					<SignalTooltipIcon text={i18n.t('powerScore.tooltipClockStallPenalty')} />
				</span>
				<span style={{ color: stallPenalty > 0 ? '#ef4444' : undefined }}>
					{stallPenalty > 0 ? `-${stallPenalty}` : '0'}
				</span>
			</div>
			{stallPenalty > 0 && (
				<div className='powerscore-breakdown-note'>
					{i18n.t('powerScore.clockFrozenNote', { before: baseTotal, after: baseTotal - stallPenalty })}
				</div>
			)}
			{hasWinProbVariance && (
				<div className='powerscore-breakdown-row'>
					<span className='d-flex align-items-center gap-1'>
						{variance > 0
							? i18n.t('powerScore.volatilityBoost')
							: variance < 0
								? i18n.t('powerScore.volatilityPenalty')
								: i18n.t('powerScore.volatility')}
						<SignalTooltipIcon text={i18n.t('powerScore.tooltipVolatility')} />
					</span>
					<span style={{ color: variance > 0 ? '#a855f7' : variance < 0 ? '#ef4444' : undefined }}>
						{variance > 0 ? `+${variance}` : variance < 0 ? `${variance}` : '0'}
					</span>
				</div>
			)}
			<div className='powerscore-breakdown-row'>
				<span className='d-flex align-items-center gap-1'>
					{i18n.t('powerScore.favoriteBoost')}
					<SignalTooltipIcon text={i18n.t('powerScore.tooltipFavoriteBoost')} />
				</span>
				<span>{favoriteBonus > 0 ? `+${favoriteBonus}` : '0'}</span>
			</div>
			{favoriteBonus > 0 && <div className='powerscore-breakdown-note'>{i18n.t('powerScore.favoriteTeamsInMatchup', favoriteTeamCount)}</div>}
			<div className='powerscore-breakdown-row'>
				<span className='d-flex align-items-center gap-1'>
					{i18n.t('powerScore.gameBoost')}
					<SignalTooltipIcon text={i18n.t('powerScore.tooltipGameBoost')} />
				</span>
				<span>{currentBoost > 0 ? `+${currentBoost}` : '0'}</span>
			</div>
			<div className='powerscore-breakdown-row'>
				<span className='d-flex align-items-center gap-1'>
					{i18n.t('powerScore.scoringOpportunity')}
					<SignalTooltipIcon text={i18n.t('powerScore.tooltipScoringOpportunity')} />
				</span>
				<span>{scoringOpportunityBoost > 0 ? `+${scoringOpportunityBoost}` : '0'}</span>
			</div>
			<div className='powerscore-breakdown-row'>
				<span className='d-flex align-items-center gap-1'>
					{i18n.t('powerScore.postseasonBoost')}
					<SignalTooltipIcon text={i18n.t('powerScore.tooltipPostseasonBoost')} />
				</span>
				<span>{postseasonBoost > 0 ? `+${postseasonBoost}` : '0'}</span>
			</div>
			<div className='powerscore-breakdown-row powerscore-breakdown-row-total'><span>{i18n.t('powerScore.finalPowerScore')}</span><span>{totalLabel}</span></div>
		</section>
	);
};

export default PowerScoreBreakdown;
