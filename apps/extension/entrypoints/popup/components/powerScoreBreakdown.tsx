import type { CSSProperties, ReactNode } from 'react';
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
	// Already folded into the total by the background scorer; absent when there was no line.
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
	// Our sources' own round name, passed through untranslated.
	postseasonLabel?: string;
	totalLabel: string;
	reason?: string;
	disabledSignals?: readonly SignalName[];
}

// The signal palette. The components chart further down draws the same five signals in these same
// colours, so they are data colours rather than theme colours and stay put in both modes.
export const signalMeta = [
	{ name: 'closeness' as SignalName, labelKey: 'powerScore.signalCloseness', tooltipKey: 'powerScore.tooltipCloseness', max: scoreMaxCloseness, color: '#22c55e' },
	{ name: 'lateGame' as SignalName, labelKey: 'powerScore.signalLateGame', tooltipKey: 'powerScore.tooltipLateGame', max: scoreMaxLateGame, color: '#f75c03' },
	{ name: 'momentum' as SignalName, labelKey: 'powerScore.signalMomentum', tooltipKey: 'powerScore.tooltipMomentum', max: scoreMaxMomentum, color: '#2274a5' },
	{ name: 'leadChanges' as SignalName, labelKey: 'powerScore.signalLeadChanges', tooltipKey: 'powerScore.tooltipLeadChanges', max: scoreMaxLeadChanges, color: '#f1c40f' },
	{ name: 'comeback' as SignalName, labelKey: 'powerScore.signalComeback', tooltipKey: 'powerScore.tooltipComeback', max: scoreMaxComeback, color: '#d90368' },
] as const;

// v2's boosts and penalties, each in its own colour. The tour's PowerScore legend uses the same set.
const factors = {
	clockStall: { icon: 'hourglass-split', color: '#ef4444' },
	volatility: { icon: 'activity', color: '#a855f7' },
	favorite: { icon: 'star-fill', color: '#f1c40f' },
	gameBoost: { icon: 'lightning-fill', color: '#22c55e' },
	scoringOpp: { icon: 'bullseye', color: '#f75c03' },
	postseason: { icon: 'trophy-fill', color: '#2274a5' },
} as const;

const penaltyColor = factors.clockStall.color;

const signed = (value: number): string => (value > 0 ? `+${value}` : value < 0 ? `${value}` : '0');

const tone = (value: number): string => (value > 0 ? ' is-gain' : value < 0 ? ' is-penalty' : ' is-zero');

const FactorRow = ({ factor, label, tooltip, value, extraClass = '', children }: {
	factor: keyof typeof factors;
	label: string;
	tooltip: string;
	value: number;
	extraClass?: string;
	children?: ReactNode;
}) => (
	<div
		className={`powerscore-breakdown-row dt-adjust${tone(value)}${extraClass}`}
		style={{ '--factor': value < 0 ? penaltyColor : factors[factor].color } as CSSProperties}
	>
		<span className='dt-adjust-name'>
			<i className={`bi bi-${factors[factor].icon} powerscore-factor-icon`} style={{ color: factors[factor].color }} aria-hidden='true' />
			{label}
			<SettingTooltipIcon text={tooltip} />
		</span>
		<span className='num'>{signed(value)}</span>
		{children}
	</div>
);

// "71 / 100" with the 71 set large and the rest quiet. The label arrives translated, so the first
// figure in it is the one that gets the weight, wherever the language puts it.
const TotalFigure = ({ label }: { label: string }) => {
	const match = /\d+/.exec(label);
	if (!match) return <span className='num'>{label}</span>;
	const before = label.slice(0, match.index);
	const after = label.slice(match.index + match[0].length);
	return (
		<span className='num'>
			{before && <small>{before}</small>}
			<strong>{match[0]}</strong>
			{after && <small>{after}</small>}
		</span>
	);
};

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
	const variance = winProbabilityVariance;
	// applyDisabledSignals scales the survivors up into the full signals-subtotal space, so
	// signalsSubtotal is the scaled result while rawSignalsSum stays raw. Both are pre-cap.
	const isSignalNormalized = disabledSet.size > 0 && signalsSubtotal !== rawSignalsSum;
	const shownSubtotal = isSignalNormalized ? signalsSubtotal : rawSignalsSum;
	const capped = shownSubtotal > scoreMaxTotal ? ` ${i18n.t('powerScore.cappedAt', { max: scoreMaxTotal })}` : '';

	return (
		<section className='card dt-card powerscore-breakdown' aria-labelledby='dt-breakdown-title'>
			<h3 className='dt-card-title' id='dt-breakdown-title'>{i18n.t('powerScore.heading')}</h3>
			<div className='dt-signals'>
				{signalMeta.map((sig, i) => {
					const isDisabled = disabledSet.has(sig.name);
					const val = isDisabled ? 0 : (signalValues[i] ?? 0);
					const pct = !isDisabled && sig.max > 0 ? Math.min((val / sig.max) * 100, 100) : 0;
					return (
						<div
							key={sig.labelKey}
							className={`powerscore-signal-row${isDisabled ? ' is-off' : ''}`}
							style={{ '--signal': sig.color } as CSSProperties}
						>
							<span className='powerscore-signal-name'>
								<span className='powerscore-signal-dot' aria-hidden='true' />
								{i18n.t(sig.labelKey)}
								{!isDisabled && <SettingTooltipIcon text={i18n.t(sig.tooltipKey)} />}
							</span>
							<span className='progress powerscore-signal-progress'>
								<span
									className='progress-bar'
									role='progressbar'
									aria-label={i18n.t(sig.labelKey)}
									style={{ width: `${pct}%` }}
									aria-valuenow={val}
									aria-valuemin={0}
									aria-valuemax={sig.max}
								/>
							</span>
							{isDisabled
								? <span className='powerscore-signal-value powerscore-signal-off'>{i18n.t('powerScore.signalOff')}</span>
								: <span className='powerscore-signal-value num'>{val}<small>/{sig.max}</small></span>}
						</div>
					);
				})}
			</div>

			<div className='powerscore-breakdown-row powerscore-breakdown-row-subtotal'>
				<span className='dt-adjust-name'>
					{i18n.t('powerScore.signalsTotal')}
					{isSignalNormalized && <SettingTooltipIcon text={i18n.t('powerScore.tooltipSignalsNormalized')} />}
				</span>
				<span className='num'>
					{isSignalNormalized && (
						<>
							<span className='powerscore-subtotal-raw'>{rawSignalsSum}</span>
							<span aria-hidden='true'> → </span>
						</>
					)}
					{shownSubtotal}{capped}
				</span>
			</div>
			{isSignalNormalized && <p className='powerscore-breakdown-note'>{i18n.t('powerScore.signalsNormalizedNote')}</p>}

			<div className='dt-adjustments'>
				{clockBased && (
					<FactorRow
						factor='clockStall'
						label={i18n.t('powerScore.clockStallPenalty')}
						tooltip={i18n.t('powerScore.tooltipClockStallPenalty')}
						value={-stallPenalty}
						extraClass=' powerscore-breakdown-row-penalty'
					/>
				)}
				{variance !== undefined && (
					<FactorRow
						factor='volatility'
						label={variance > 0
							? i18n.t('powerScore.volatilityBoost')
							: variance < 0
								? i18n.t('powerScore.volatilityPenalty')
								: i18n.t('powerScore.volatility')}
						tooltip={i18n.t('powerScore.tooltipVolatility')}
						value={variance}
					/>
				)}
				<FactorRow
					factor='favorite'
					label={i18n.t('powerScore.favoriteBoost')}
					tooltip={i18n.t('powerScore.tooltipFavoriteBoost')}
					value={favoriteBonus}
				/>
				{favoriteBonus > 0 && <p className='powerscore-breakdown-note'>{i18n.t('powerScore.favoriteTeamsInMatchup', favoriteTeamCount)}</p>}
				<FactorRow
					factor='gameBoost'
					label={i18n.t('powerScore.gameBoost')}
					tooltip={i18n.t('powerScore.tooltipGameBoost')}
					value={currentBoost}
				/>
				<FactorRow
					factor='scoringOpp'
					label={i18n.t('powerScore.scoringOpportunity')}
					tooltip={i18n.t('powerScore.tooltipScoringOpportunity')}
					value={scoringOpportunityBoost}
				/>
				<FactorRow
					factor='postseason'
					label={i18n.t('powerScore.postseasonBoost')}
					tooltip={i18n.t('powerScore.tooltipPostseasonBoost')}
					value={postseasonBoost}
				/>
				{postseasonLabel && <p className='powerscore-breakdown-note powerscore-breakdown-qualifier'>{postseasonLabel}</p>}
			</div>

			<div className='powerscore-breakdown-row powerscore-breakdown-row-total'>
				<span>{i18n.t('powerScore.finalPowerScore')}</span>
				<TotalFigure label={totalLabel} />
			</div>
			{reason && <p className='powerscore-breakdown-reason'>{reason}</p>}
		</section>
	);
};

export default PowerScoreBreakdown;
