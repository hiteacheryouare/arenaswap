import {
	scoreMaxCloseness,
	scoreMaxComeback,
	scoreMaxLateGame,
	scoreMaxLeadChanges,
	scoreMaxMomentum,
	scoreMaxTotal,
} from '@arenaswap/core/constants';
import type { SignalName } from '@arenaswap/core/types';
import { i18n } from '#i18n';
import SettingTooltipIcon from './settingTooltipIcon';

interface powerScoreBreakdownProps {
	closeness: number;
	lateGame: number;
	momentum: number;
	leadChanges: number;
	comeback: number;
	// Already folded into the total by the background scorer; absent when ESPN gave no line.
	winProbabilityVariance?: number;
	baseTotal: number;
	stallPenalty: number;
	favoriteBonus: number;
	favoriteTeamCount: number;
	currentBoost: number;
	scoringOpportunityBoost: number;
	postseasonBoost: number;
	totalLabel: string;
	reason?: string;
	disabledSignals?: readonly SignalName[];
}

// This card is the one light surface in the popup, so momentum keeps the darker #2274a5 here.
// Everywhere else it draws on #0d1117 and uses $secondary (#3e9bd1) instead.
const signalMeta = [
	{ name: 'closeness' as SignalName, labelKey: 'powerScore.signalCloseness', tooltipKey: 'powerScore.tooltipCloseness', max: scoreMaxCloseness, color: '#22c55e' },
	{ name: 'lateGame' as SignalName, labelKey: 'powerScore.signalLateGame', tooltipKey: 'powerScore.tooltipLateGame', max: scoreMaxLateGame, color: '#f75c03' },
	{ name: 'momentum' as SignalName, labelKey: 'powerScore.signalMomentum', tooltipKey: 'powerScore.tooltipMomentum', max: scoreMaxMomentum, color: '#2274a5' },
	{ name: 'leadChanges' as SignalName, labelKey: 'powerScore.signalLeadChanges', tooltipKey: 'powerScore.tooltipLeadChanges', max: scoreMaxLeadChanges, color: '#f1c40f' },
	{ name: 'comeback' as SignalName, labelKey: 'powerScore.signalComeback', tooltipKey: 'powerScore.tooltipComeback', max: scoreMaxComeback, color: '#d90368' },
] as const;

// Per-factor colors and icons mirror the walkthrough's boost/penalty legend (walkthroughStepPowerScore.tsx).
const boostPenaltyMeta = {
	clockStall: { color: '#ef4444', icon: 'hourglass-split' },
	volatility: { color: '#a855f7', icon: 'activity' },
	favorite: { color: '#f1c40f', icon: 'star-fill' },
	gameBoost: { color: '#22c55e', icon: 'lightning-fill' },
	scoringOpp: { color: '#f75c03', icon: 'bullseye' },
	postseason: { color: '#2274a5', icon: 'trophy-fill' },
} as const;

const FactorIcon = ({ factor }: { factor: keyof typeof boostPenaltyMeta }) => (
	<i
		className={`bi bi-${boostPenaltyMeta[factor].icon} powerscore-factor-icon`}
		style={{ color: boostPenaltyMeta[factor].color }}
		aria-hidden='true'
	/>
);

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
	reason,
	disabledSignals = [],
}: powerScoreBreakdownProps) => {
	const disabledSet = new Set<SignalName>(disabledSignals);
	const signalValues = [closeness, lateGame, momentum, leadChanges, comeback];
	const signalsSubtotal = closeness + lateGame + momentum + leadChanges + comeback;
	const hasWinProbVariance = winProbabilityVariance !== undefined;
	const variance = winProbabilityVariance ?? 0;
	// applyDisabledSignals rescales the enabled sum back into 0-100, so baseTotal is the scaled
	// result while signalsSubtotal stays raw.
	const isSignalNormalized = disabledSet.size > 0 && baseTotal !== signalsSubtotal;

	return (
		<section className='powerscore-breakdown game-detail-formula-card'>
			<div className='powerscore-breakdown-heading'>{i18n.t('powerScore.heading')}</div>
			{signalMeta.map((sig, i) => {
				const isDisabled = disabledSet.has(sig.name);
				const val = isDisabled ? 0 : (signalValues[i] ?? 0);
				const pct = !isDisabled && sig.max > 0 ? Math.min((val / sig.max) * 100, 100) : 0;
				return (
					<div key={sig.labelKey} className={`powerscore-signal-row${isDisabled ? ' opacity-50' : ''}`}>
						<span className='powerscore-signal-dot' style={{ backgroundColor: isDisabled ? '#6c757d' : sig.color }} />
						<span className='powerscore-signal-name'>{i18n.t(sig.labelKey)}</span>
						{isDisabled
							? <span className='powerscore-signal-off-badge'>{i18n.t('powerScore.signalOff')}</span>
							: <SettingTooltipIcon text={i18n.t(sig.tooltipKey)} />
						}
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
						{isDisabled
							? <span className='powerscore-signal-value text-muted'>—</span>
							: <span className='powerscore-signal-value'>{val}<span className='powerscore-signal-max'>/{sig.max}</span></span>
						}
					</div>
				);
			})}
			<div className='powerscore-breakdown-row powerscore-breakdown-row-subtotal'>
				<span className='d-flex align-items-center gap-1'>
					{i18n.t('powerScore.signalsTotal')}
					{isSignalNormalized && <SettingTooltipIcon text={i18n.t('powerScore.tooltipSignalsNormalized')} />}
				</span>
				{isSignalNormalized ? (
					<span className='d-flex align-items-center gap-1'>
						<span className='powerscore-subtotal-raw'>{signalsSubtotal}</span>
						<span>→</span>
						<span>{baseTotal}</span>
					</span>
				) : (
					<span>{signalsSubtotal}{signalsSubtotal > scoreMaxTotal ? ` ${i18n.t('powerScore.cappedAt', { max: scoreMaxTotal })}` : ''}</span>
				)}
			</div>
			{isSignalNormalized && (
				<div className='powerscore-breakdown-note'>
					{i18n.t('powerScore.signalsNormalizedNote')}
				</div>
			)}
			<div className='powerscore-breakdown-row powerscore-breakdown-row-penalty'>
				<span className='d-flex align-items-center gap-1'>
					<FactorIcon factor='clockStall' />
					{i18n.t('powerScore.clockStallPenalty')}
					<SettingTooltipIcon text={i18n.t('powerScore.tooltipClockStallPenalty')} />
				</span>
				<span style={{ color: stallPenalty > 0 ? boostPenaltyMeta.clockStall.color : undefined }}>
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
						<FactorIcon factor='volatility' />
						{variance > 0
							? i18n.t('powerScore.volatilityBoost')
							: variance < 0
								? i18n.t('powerScore.volatilityPenalty')
								: i18n.t('powerScore.volatility')}
						<SettingTooltipIcon text={i18n.t('powerScore.tooltipVolatility')} />
					</span>
					<span style={{ color: variance > 0 ? boostPenaltyMeta.volatility.color : variance < 0 ? boostPenaltyMeta.clockStall.color : undefined }}>
						{variance > 0 ? `+${variance}` : variance < 0 ? `${variance}` : '0'}
					</span>
				</div>
			)}
			<div className='powerscore-breakdown-row'>
				<span className='d-flex align-items-center gap-1'>
					<FactorIcon factor='favorite' />
					{i18n.t('powerScore.favoriteBoost')}
					<SettingTooltipIcon text={i18n.t('powerScore.tooltipFavoriteBoost')} />
				</span>
				<span style={{ color: favoriteBonus > 0 ? boostPenaltyMeta.favorite.color : undefined }}>{favoriteBonus > 0 ? `+${favoriteBonus}` : '0'}</span>
			</div>
			{favoriteBonus > 0 && <div className='powerscore-breakdown-note'>{i18n.t('powerScore.favoriteTeamsInMatchup', favoriteTeamCount)}</div>}
			<div className='powerscore-breakdown-row'>
				<span className='d-flex align-items-center gap-1'>
					<FactorIcon factor='gameBoost' />
					{i18n.t('powerScore.gameBoost')}
					<SettingTooltipIcon text={i18n.t('powerScore.tooltipGameBoost')} />
				</span>
				<span style={{ color: currentBoost > 0 ? boostPenaltyMeta.gameBoost.color : undefined }}>{currentBoost > 0 ? `+${currentBoost}` : '0'}</span>
			</div>
			<div className='powerscore-breakdown-row'>
				<span className='d-flex align-items-center gap-1'>
					<FactorIcon factor='scoringOpp' />
					{i18n.t('powerScore.scoringOpportunity')}
					<SettingTooltipIcon text={i18n.t('powerScore.tooltipScoringOpportunity')} />
				</span>
				<span style={{ color: scoringOpportunityBoost > 0 ? boostPenaltyMeta.scoringOpp.color : undefined }}>{scoringOpportunityBoost > 0 ? `+${scoringOpportunityBoost}` : '0'}</span>
			</div>
			<div className='powerscore-breakdown-row'>
				<span className='d-flex align-items-center gap-1'>
					<FactorIcon factor='postseason' />
					{i18n.t('powerScore.postseasonBoost')}
					<SettingTooltipIcon text={i18n.t('powerScore.tooltipPostseasonBoost')} />
				</span>
				<span style={{ color: postseasonBoost > 0 ? boostPenaltyMeta.postseason.color : undefined }}>{postseasonBoost > 0 ? `+${postseasonBoost}` : '0'}</span>
			</div>
			<div className='powerscore-breakdown-row powerscore-breakdown-row-total'><span>{i18n.t('powerScore.finalPowerScore')}</span><span>{totalLabel}</span></div>
			{reason && <div className='powerscore-breakdown-reason'>{reason}</div>}
		</section>
	);
};

export default PowerScoreBreakdown;
