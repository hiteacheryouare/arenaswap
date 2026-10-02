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
import { signalColors } from '@arenaswap/ui/src/components/signalColors';
import SettingTooltipIcon from './settingTooltipIcon';

interface powerScoreBreakdownProps {
	closeness: number;
	lateGame: number;
	momentum: number;
	leadChanges: number;
	comeback: number;
	// Already folded into the total by the background scorer; absent when ESPN gave no line.
	winProbabilityVariance?: number;
	signalsSubtotal: number;
	stallPenalty: number;
	// Baseball/softball never accumulate a stall count, so the row is hidden rather than pinned at 0.
	clockBased: boolean;
	favoriteBonus: number;
	favoriteTeamCount: number;
	currentBoost: number;
	scoringOpportunityBoost: number;
	postseasonBoost: number;
	// ESPN's own round name, so the number has something accounting for it. Untranslated, like
	// every other string this project passes through from ESPN.
	postseasonLabel?: string;
	totalLabel: string;
	reason?: string;
	disabledSignals?: readonly SignalName[];
}

const signalMeta = [
	{ name: 'closeness' as SignalName, labelKey: 'powerScore.signalCloseness', tooltipKey: 'powerScore.tooltipCloseness', max: scoreMaxCloseness, color: signalColors.closeness },
	{ name: 'lateGame' as SignalName, labelKey: 'powerScore.signalLateGame', tooltipKey: 'powerScore.tooltipLateGame', max: scoreMaxLateGame, color: signalColors.lateGame },
	{ name: 'momentum' as SignalName, labelKey: 'powerScore.signalMomentum', tooltipKey: 'powerScore.tooltipMomentum', max: scoreMaxMomentum, color: signalColors.momentum },
	{ name: 'leadChanges' as SignalName, labelKey: 'powerScore.signalLeadChanges', tooltipKey: 'powerScore.tooltipLeadChanges', max: scoreMaxLeadChanges, color: signalColors.leadChanges },
	{ name: 'comeback' as SignalName, labelKey: 'powerScore.signalComeback', tooltipKey: 'powerScore.tooltipComeback', max: scoreMaxComeback, color: signalColors.comeback },
] as const;

// Per-factor colors and icons mirror the walkthrough's boost/penalty legend (walkthroughStepPowerScore.tsx).
// `color` is for the icon, which only needs 3:1 to be seen. `ink` is the same hue darkened for the
// number beside it, which is small text on this #f8fafc card and needs 4.5:1: the gold managed 1.6
// and the green 2.2 in the icon colours.
const boostPenaltyMeta = {
	clockStall: { color: '#ef4444', ink: '#b91c1c', icon: 'hourglass-split' },
	volatility: { color: '#a855f7', ink: '#7e22ce', icon: 'activity' },
	favorite: { color: '#f1c40f', ink: '#8a6100', icon: 'star-fill' },
	gameBoost: { color: '#22c55e', ink: '#15803d', icon: 'lightning-fill' },
	scoringOpp: { color: '#f75c03', ink: '#c2410c', icon: 'bullseye' },
	postseason: { color: '#2274a5', ink: '#2274a5', icon: 'trophy-fill' },
} as const;

const minus = '\u2212';

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
	signalsSubtotal,
	stallPenalty,
	clockBased,
	favoriteBonus,
	favoriteTeamCount,
	currentBoost,
	scoringOpportunityBoost,
	postseasonBoost,
	postseasonLabel,
	totalLabel,
	reason,
	disabledSignals = [],
}: powerScoreBreakdownProps) => {
	const disabledSet = new Set<SignalName>(disabledSignals);
	const signalValues = [closeness, lateGame, momentum, leadChanges, comeback];
	const rawSignalsSum = closeness + lateGame + momentum + leadChanges + comeback;
	const hasWinProbVariance = winProbabilityVariance !== undefined;
	const variance = winProbabilityVariance ?? 0;
	// applyDisabledSignals scales the survivors up into the full signals-subtotal space, so
	// signalsSubtotal is the scaled result while rawSignalsSum stays raw. Both are pre-cap; the 100
	// cap lands on `total`.
	const isSignalNormalized = disabledSet.size > 0 && signalsSubtotal !== rawSignalsSum;

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
						<span className='powerscore-subtotal-raw'>{rawSignalsSum}</span>
						<span>→</span>
						<span>{signalsSubtotal}{(signalsSubtotal ?? 0) > scoreMaxTotal ? ` ${i18n.t('powerScore.cappedAt', { max: scoreMaxTotal })}` : ''}</span>
					</span>
				) : (
					<span>{rawSignalsSum}{rawSignalsSum > scoreMaxTotal ? ` ${i18n.t('powerScore.cappedAt', { max: scoreMaxTotal })}` : ''}</span>
				)}
			</div>
			{isSignalNormalized && (
				<div className='powerscore-breakdown-note'>
					{i18n.t('powerScore.signalsNormalizedNote')}
				</div>
			)}
			{clockBased && (
				<div className='powerscore-breakdown-row powerscore-breakdown-row-penalty'>
					<span className='d-flex align-items-center gap-1'>
						<FactorIcon factor='clockStall' />
						{i18n.t('powerScore.clockStallPenalty')}
						<SettingTooltipIcon text={i18n.t('powerScore.tooltipClockStallPenalty')} />
					</span>
					<span className='powerscore-breakdown-value' style={{ color: stallPenalty > 0 ? boostPenaltyMeta.clockStall.ink : undefined }}>
						{stallPenalty > 0 ? `${minus}${stallPenalty}` : '0'}
					</span>
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
					<span className='powerscore-breakdown-value' style={{ color: variance > 0 ? boostPenaltyMeta.volatility.ink : variance < 0 ? boostPenaltyMeta.clockStall.ink : undefined }}>
						{variance > 0 ? `+${variance}` : variance < 0 ? `${minus}${Math.abs(variance)}` : '0'}
					</span>
				</div>
			)}
			<div className='powerscore-breakdown-row'>
				<span className='d-flex align-items-center gap-1'>
					<FactorIcon factor='favorite' />
					{i18n.t('powerScore.favoriteBoost')}
					<SettingTooltipIcon text={i18n.t('powerScore.tooltipFavoriteBoost')} />
				</span>
				<span className='powerscore-breakdown-value' style={{ color: favoriteBonus > 0 ? boostPenaltyMeta.favorite.ink : undefined }}>{favoriteBonus > 0 ? `+${favoriteBonus}` : '0'}</span>
			</div>
			{favoriteBonus > 0 && <div className='powerscore-breakdown-note'>{i18n.t('powerScore.favoriteTeamsInMatchup', favoriteTeamCount)}</div>}
			<div className='powerscore-breakdown-row'>
				<span className='d-flex align-items-center gap-1'>
					<FactorIcon factor='gameBoost' />
					{i18n.t('powerScore.gameBoost')}
					<SettingTooltipIcon text={i18n.t('powerScore.tooltipGameBoost')} />
				</span>
				<span className='powerscore-breakdown-value' style={{ color: currentBoost > 0 ? boostPenaltyMeta.gameBoost.ink : undefined }}>{currentBoost > 0 ? `+${currentBoost}` : '0'}</span>
			</div>
			<div className='powerscore-breakdown-row'>
				<span className='d-flex align-items-center gap-1'>
					<FactorIcon factor='scoringOpp' />
					{i18n.t('powerScore.scoringOpportunity')}
					<SettingTooltipIcon text={i18n.t('powerScore.tooltipScoringOpportunity')} />
				</span>
				<span className='powerscore-breakdown-value' style={{ color: scoringOpportunityBoost > 0 ? boostPenaltyMeta.scoringOpp.ink : undefined }}>{scoringOpportunityBoost > 0 ? `+${scoringOpportunityBoost}` : '0'}</span>
			</div>
			<div className='powerscore-breakdown-row'>
				<span className='d-flex align-items-center gap-1'>
					<FactorIcon factor='postseason' />
					{i18n.t('powerScore.postseasonBoost')}
					{postseasonLabel && <span className='powerscore-breakdown-qualifier'>· {postseasonLabel}</span>}
					<SettingTooltipIcon text={i18n.t('powerScore.tooltipPostseasonBoost')} />
				</span>
				<span className='powerscore-breakdown-value' style={{ color: postseasonBoost > 0 ? boostPenaltyMeta.postseason.ink : undefined }}>{postseasonBoost > 0 ? `+${postseasonBoost}` : '0'}</span>
			</div>
			<div className='powerscore-breakdown-row powerscore-breakdown-row-total'><span>{i18n.t('powerScore.finalPowerScore')}</span><span>{totalLabel}</span></div>
			{reason && <div className='powerscore-breakdown-reason'>{reason}</div>}
		</section>
	);
};

export default PowerScoreBreakdown;
