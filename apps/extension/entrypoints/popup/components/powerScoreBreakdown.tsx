import { Fragment } from 'react';
import {
	scoreMaxCloseness,
	scoreMaxComeback,
	scoreMaxLateGame,
	scoreMaxLeadChanges,
	scoreMaxMomentum,
	scoreMaxTotal,
} from '@arenaswap/core/constants';
import type { ScoreBreakdown, SignalName } from '@arenaswap/core/types';
import { i18n } from '#i18n';
import {
	boostPresentation,
	isBoostId,
	isBuiltInModeId,
	isModeSignalId,
	modePresentation,
	modeSignalIds,
	penaltyPresentation,
	signalPresentation,
	unknownFactorColor,
} from '@arenaswap/ui/src/components/scoringModeMeta';
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
	// A PowerScore 3 score. Without one, the flat fields above draw Classic.
	breakdown?: ScoreBreakdown;
}

interface signalRow {
	id: string;
	points: number;
	max: number;
	disabled: boolean;
}

interface boostRow {
	id: string;
	points: number;
}

const classicMax: Record<SignalName, number> = {
	closeness: scoreMaxCloseness,
	lateGame: scoreMaxLateGame,
	momentum: scoreMaxMomentum,
	leadChanges: scoreMaxLeadChanges,
	comeback: scoreMaxComeback,
};

// Shown at zero as well, the way the card always has. Every other boost appears only while it pays.
const alwaysShownBoosts: ReadonlySet<string> = new Set(['favoriteBoost', 'gameBoost', 'scoringOpportunity', 'postseasonBoost']);

const minus = '−';

const signalLabel = (id: string): string => (isModeSignalId(id) ? i18n.t(signalPresentation[id].labelKey) : id);
const boostLabel = (id: string): string => (isBoostId(id) ? i18n.t(boostPresentation[id].labelKey) : id);

const FactorIcon = ({ icon, color }: { icon: string; color: string }) => (
	<i
		className={`bi bi-${icon} powerscore-factor-icon`}
		style={{ color }}
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
	breakdown,
}: powerScoreBreakdownProps) => {
	const disabledSet = new Set<string>(disabledSignals);
	const flatValues: Record<SignalName, number> = { closeness, lateGame, momentum, leadChanges, comeback };
	const signalRows: signalRow[] = breakdown
		? breakdown.signals.map(signal => ({ id: signal.id, points: signal.disabled ? 0 : signal.points, max: signal.ceiling, disabled: signal.disabled }))
		: modeSignalIds.classic.map(id => ({ id, points: disabledSet.has(id) ? 0 : flatValues[id], max: classicMax[id], disabled: disabledSet.has(id) }));
	const boostRows: boostRow[] = breakdown
		? breakdown.boosts.filter(boost => boost.points > 0 || alwaysShownBoosts.has(boost.id))
		: [
			{ id: 'favoriteBoost', points: favoriteBonus },
			{ id: 'gameBoost', points: currentBoost },
			{ id: 'scoringOpportunity', points: scoringOpportunityBoost },
			{ id: 'postseasonBoost', points: postseasonBoost },
		];
	const modeId = breakdown?.modeId;
	const mode = isBuiltInModeId(modeId) ? modePresentation[modeId] : undefined;
	const showsStall = clockBased && (mode?.usesStallPenalty ?? true);
	const blendTooltipKey = mode && 'blendTooltipKey' in mode ? mode.blendTooltipKey : undefined;
	const classicTotal = breakdown?.classicTotal;
	const blend = breakdown?.blend;
	const blendPercent = blend ? Math.round(blend.weight * 100) : 0;
	// A floor only shows when it won; a boost adds the mode's weighted share on top of Classic.
	const showsClassicRow = classicTotal !== undefined && blendTooltipKey !== undefined && (blend?.kind !== 'floor' || blend.floorApplied === true);
	const classicRowValue = blend?.kind === 'floor'
		? `${blend.classicTotal} × ${blendPercent}% = ${Math.round(blend.classicTotal * blend.weight)}`
		: blend?.kind === 'mix' ? `${blend.classicTotal} × ${100 - blendPercent}%` : `${classicTotal}`;

	const rawSignalsSum = signalRows.reduce((total, row) => total + row.points, 0);
	const scaledSubtotal = breakdown?.scaledSubtotal ?? signalsSubtotal;
	const hasWinProbVariance = winProbabilityVariance !== undefined;
	const variance = winProbabilityVariance ?? 0;
	// Switching signals off scales the survivors up into the full signals-subtotal space, so the
	// scaled subtotal differs from rawSignalsSum. Both are pre-cap; the 100 cap lands on `total`.
	const isSignalNormalized = signalRows.some(row => row.disabled) && scaledSubtotal !== rawSignalsSum;
	const heading = mode && modeId !== 'classic'
		? i18n.t('powerScore.headingMode', { mode: i18n.t(mode.nameKey) })
		: i18n.t('powerScore.heading');

	return (
		<section className='powerscore-breakdown game-detail-formula-card'>
			<div className='powerscore-breakdown-heading'>{heading}</div>
			<div className='powerscore-signal-list'>
				{signalRows.map(row => {
					const color = isModeSignalId(row.id) ? signalPresentation[row.id].color : unknownFactorColor;
					const pct = !row.disabled && row.max > 0 ? Math.min((row.points / row.max) * 100, 100) : 0;
					const label = signalLabel(row.id);
					return (
						<div key={row.id} className={`powerscore-signal-row${row.disabled ? ' opacity-50' : ''}`}>
							<span className='powerscore-signal-dot' style={{ backgroundColor: row.disabled ? '#6c757d' : color }} />
							<span className='powerscore-signal-name'>{label}</span>
							{row.disabled
								? <span className='powerscore-signal-off-badge'>{i18n.t('powerScore.signalOff')}</span>
								: isModeSignalId(row.id)
									? <SettingTooltipIcon text={i18n.t(signalPresentation[row.id].tooltipKey)} label={label} />
									: <span />
							}
							<div className='progress powerscore-signal-progress'>
								<div
									className='progress-bar'
									role='progressbar'
									style={{ width: `${pct}%`, backgroundColor: color }}
									aria-valuenow={row.points}
									aria-valuemin={0}
									aria-valuemax={row.max}
								/>
							</div>
							{row.disabled
								? <span className='powerscore-signal-value text-muted'>—</span>
								: <span className='powerscore-signal-value'>{row.points}<span className='powerscore-signal-max'>/{row.max}</span></span>
							}
						</div>
					);
				})}
			</div>
			<div className='powerscore-breakdown-row powerscore-breakdown-row-subtotal'>
				<span className='d-flex align-items-center gap-1'>
					{i18n.t('powerScore.signalsTotal')}
					{isSignalNormalized && <SettingTooltipIcon text={i18n.t('powerScore.tooltipSignalsNormalized')} label={i18n.t('powerScore.signalsTotal')} />}
				</span>
				{isSignalNormalized ? (
					<span className='d-flex align-items-center gap-1'>
						<span className='powerscore-subtotal-raw'>{rawSignalsSum}</span>
						<span>→</span>
						<span>{scaledSubtotal}{scaledSubtotal > scoreMaxTotal ? ` ${i18n.t('powerScore.cappedAt', { max: scoreMaxTotal })}` : ''}</span>
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
			{showsStall && (
				<div className='powerscore-breakdown-row powerscore-breakdown-row-penalty'>
					<span className='d-flex align-items-center gap-1'>
						<FactorIcon icon={penaltyPresentation.clockStall.icon} color={penaltyPresentation.clockStall.color} />
						{i18n.t('powerScore.clockStallPenalty')}
						<SettingTooltipIcon text={i18n.t('powerScore.tooltipClockStallPenalty')} label={i18n.t('powerScore.clockStallPenalty')} />
					</span>
					<span className='powerscore-breakdown-value' style={{ color: stallPenalty > 0 ? penaltyPresentation.clockStall.ink : undefined }}>
						{stallPenalty > 0 ? `${minus}${stallPenalty}` : '0'}
					</span>
				</div>
			)}
			{hasWinProbVariance && (
				<div className='powerscore-breakdown-row'>
					<span className='d-flex align-items-center gap-1'>
						<FactorIcon icon={penaltyPresentation.volatility.icon} color={penaltyPresentation.volatility.color} />
						{variance > 0
							? i18n.t('powerScore.volatilityBoost')
							: variance < 0
								? i18n.t('powerScore.volatilityPenalty')
								: i18n.t('powerScore.volatility')}
						<SettingTooltipIcon text={i18n.t('powerScore.tooltipVolatility')} label={i18n.t('powerScore.volatility')} />
					</span>
					<span className='powerscore-breakdown-value' style={{ color: variance !== 0 ? penaltyPresentation.volatility.ink : undefined }}>
						{variance > 0 ? `+${variance}` : variance < 0 ? `${minus}${Math.abs(variance)}` : '0'}
					</span>
				</div>
			)}
			{showsClassicRow && (
				<div className='powerscore-breakdown-row'>
					<span className='d-flex align-items-center gap-1'>
						<FactorIcon icon='layers-half' color={unknownFactorColor} />
						{i18n.t('powerScore.blendClassic')}
						<SettingTooltipIcon text={i18n.t(blendTooltipKey)} label={i18n.t('powerScore.blendClassic')} />
					</span>
					<span className='powerscore-breakdown-value'>{classicRowValue}</span>
				</div>
			)}
			{blend && blend.kind !== 'floor' && mode && (
				<div className='powerscore-breakdown-row'>
					<span className='d-flex align-items-center gap-1'>
						<FactorIcon icon='layers-half' color={unknownFactorColor} />
						{`${i18n.t(mode.nameKey)} × ${blendPercent}%`}
					</span>
					<span className='powerscore-breakdown-value'>
						{blend.kind === 'boost' ? `+${Math.round(blend.ownTotal * blend.weight)}` : `${blend.ownTotal} × ${blendPercent}%`}
					</span>
				</div>
			)}
			{boostRows.map(boost => {
				const meta = isBoostId(boost.id) ? boostPresentation[boost.id] : undefined;
				const label = boostLabel(boost.id);
				return (
					<Fragment key={boost.id}>
						<div className='powerscore-breakdown-row'>
							<span className='d-flex align-items-center gap-1'>
								<FactorIcon icon={meta?.icon ?? 'plus-circle'} color={meta?.color ?? unknownFactorColor} />
								{label}
								{boost.id === 'postseasonBoost' && postseasonLabel && <span className='powerscore-breakdown-qualifier'>· {postseasonLabel}</span>}
								{meta && <SettingTooltipIcon text={i18n.t(meta.tooltipKey)} label={label} />}
							</span>
							<span className='powerscore-breakdown-value' style={{ color: boost.points > 0 ? meta?.ink : undefined }}>{boost.points > 0 ? `+${boost.points}` : '0'}</span>
						</div>
						{boost.id === 'favoriteBoost' && boost.points > 0 && <div className='powerscore-breakdown-note'>{i18n.t('powerScore.favoriteTeamsInMatchup', favoriteTeamCount)}</div>}
					</Fragment>
				);
			})}
			<div className='powerscore-breakdown-row powerscore-breakdown-row-total'><span>{i18n.t('powerScore.finalPowerScore')}</span><span>{totalLabel}</span></div>
			{reason && <div className='powerscore-breakdown-reason'>{reason}</div>}
		</section>
	);
};

export default PowerScoreBreakdown;
