import { Fragment } from 'react';
import {
	scoreMaxCloseness,
	scoreMaxComeback,
	scoreMaxLateGame,
	scoreMaxLeadChanges,
	scoreMaxMomentum,
	scoreMaxTotal,
} from '@arenaswap/core/constants';
import type { ReasonFragment, ScoreBreakdown, SignalName, SportType } from '@arenaswap/core/types';
import { i18n } from '#i18n';
import {
	boostPresentation,
	boostSports,
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
import BreakdownSection from './breakdownSection';
import { boostReason } from '../../../utils/boostReason';
import { sportTypeLabels } from '../popupHelpers';

interface powerScoreBreakdownProps {
	closeness: number;
	lateGame: number;
	momentum: number;
	leadChanges: number;
	comeback: number;
	// Already folded into the total by the background scorer; absent when ESPN gave no line.
	winProbabilityVariance?: number;
	signalsSubtotal: number;
	breakPenalty: number;
	// Soccer has no commercials during play, so the row is hidden rather than pinned at 0.
	hasBreaks: boolean;
	favoriteBonus: number;
	// Abbreviations of the favorited teams in this game, for the favorite boost's reason.
	favoriteTeams?: readonly string[];
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
	sportType?: SportType;
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
	details?: readonly ReasonFragment[];
}

const classicMax: Record<SignalName, number> = {
	closeness: scoreMaxCloseness,
	lateGame: scoreMaxLateGame,
	momentum: scoreMaxMomentum,
	leadChanges: scoreMaxLeadChanges,
	comeback: scoreMaxComeback,
};

const minus = '−';

const signed = (points: number): string => (points > 0 ? `+${points}` : points < 0 ? `${minus}${Math.abs(points)}` : '0');
const sumOf = (rows: readonly boostRow[]): number => rows.reduce((total, row) => total + row.points, 0);
const isActive = (boost: boostRow): boolean => boost.points > 0;
const isSportBoost = (id: string): boolean => isBoostId(id) && boostSports[id] !== undefined;
const paysInSport = (id: string, sportType: SportType): boolean => isBoostId(id) && (boostSports[id]?.includes(sportType) ?? false);

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
	breakPenalty,
	hasBreaks,
	favoriteBonus,
	favoriteTeams = [],
	currentBoost,
	scoringOpportunityBoost,
	postseasonBoost,
	postseasonLabel,
	totalLabel,
	reason,
	disabledSignals = [],
	breakdown,
	sportType,
}: powerScoreBreakdownProps) => {
	const disabledSet = new Set<string>(disabledSignals);
	const flatValues: Record<SignalName, number> = { closeness, lateGame, momentum, leadChanges, comeback };
	const signalRows: signalRow[] = breakdown
		? breakdown.signals.map(signal => ({ id: signal.id, points: signal.disabled ? 0 : signal.points, max: signal.ceiling, disabled: signal.disabled }))
		: modeSignalIds.classic.map(id => ({ id, points: disabledSet.has(id) ? 0 : flatValues[id], max: classicMax[id], disabled: disabledSet.has(id) }));
	const boostRows: boostRow[] = breakdown
		? breakdown.boosts
		: [
			{ id: 'favoriteBoost', points: favoriteBonus },
			{ id: 'gameBoost', points: currentBoost },
			{ id: 'scoringOpportunity', points: scoringOpportunityBoost },
			{ id: 'postseasonBoost', points: postseasonBoost },
		];
	const modeId = breakdown?.modeId;
	const mode = isBuiltInModeId(modeId) ? modePresentation[modeId] : undefined;
	const showsBreak = hasBreaks && (mode?.usesStallPenalty ?? true) && breakPenalty > 0;
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
	const variance = winProbabilityVariance ?? 0;
	const activeBoosts = boostRows.filter(isActive);
	const generalBoosts = activeBoosts.filter(boost => !isSportBoost(boost.id));
	const sportBoosts = sportType ? activeBoosts.filter(boost => paysInSport(boost.id, sportType)) : [];
	const showsGeneral = showsBreak || variance !== 0 || generalBoosts.length > 0;
	const generalTotal = sumOf(generalBoosts) + variance - (showsBreak ? breakPenalty : 0);
	const sportLabel = sportType ? sportTypeLabels[sportType] : '';
	// Switching signals off scales the survivors up into the full signals-subtotal space, so the
	// scaled subtotal differs from rawSignalsSum. Both are pre-cap; the 100 cap lands on `total`.
	const isSignalNormalized = signalRows.some(row => row.disabled) && scaledSubtotal !== rawSignalsSum;
	const renderBoost = (boost: boostRow) => {
		const meta = isBoostId(boost.id) ? boostPresentation[boost.id] : undefined;
		const label = boostLabel(boost.id);
		const tooltip = meta ? i18n.t(meta.tooltipKey) : undefined;
		const why = boostReason({ ...boost, favoriteTeams }, i18n.t);
		return (
			<Fragment key={boost.id}>
				<div className='powerscore-breakdown-row'>
					<span className='d-flex align-items-center gap-1'>
						<FactorIcon icon={meta?.icon ?? 'plus-circle'} color={meta?.color ?? unknownFactorColor} />
						{label}
						{boost.id === 'postseasonBoost' && postseasonLabel && <span className='powerscore-breakdown-qualifier'>· {postseasonLabel}</span>}
						{tooltip && <SettingTooltipIcon text={tooltip} label={label} />}
					</span>
					<span className='powerscore-breakdown-value' style={{ color: meta?.ink }}>{signed(boost.points)}</span>
				</div>
				{why && <div className='powerscore-breakdown-note'>{why}</div>}
			</Fragment>
		);
	};
	const heading = mode && modeId !== 'classic'
		? i18n.t('powerScore.headingMode', { mode: i18n.t(mode.nameKey) })
		: i18n.t('powerScore.heading');

	return (
		<section className='powerscore-breakdown game-detail-formula-card'>
			<div className='powerscore-breakdown-heading'>{heading}</div>
			<BreakdownSection
				id='signals'
				heading={i18n.t('powerScore.signalsHeading')}
				total={(
					<>
						<div className='powerscore-breakdown-row powerscore-breakdown-row-subtotal'>
							<span className='d-flex align-items-center gap-1'>
								{i18n.t('powerScore.signalsTotal')}
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
					</>
				)}
			>
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
									? <span className='powerscore-signal-value fg-secondary'>—</span>
									: <span className='powerscore-signal-value'>{row.points}<span className='powerscore-signal-max'>/{row.max}</span></span>
								}
							</div>
						);
					})}
				</div>
			</BreakdownSection>
			{showsGeneral && (
				<BreakdownSection
					id='general'
					heading={i18n.t('powerScore.generalHeading')}
					total={(
						<div className='powerscore-breakdown-row powerscore-breakdown-row-subtotal'>
							<span>{i18n.t('powerScore.generalTotal')}</span>
							<span>{signed(generalTotal)}</span>
						</div>
					)}
				>
					{showsBreak && (
						<div className='powerscore-breakdown-row powerscore-breakdown-row-penalty'>
							<span className='d-flex align-items-center gap-1'>
								<FactorIcon icon={penaltyPresentation.commercialBreak.icon} color={penaltyPresentation.commercialBreak.color} />
								{i18n.t('powerScore.breakPenalty')}
								<SettingTooltipIcon text={i18n.t('powerScore.tooltipBreakPenalty')} label={i18n.t('powerScore.breakPenalty')} />
							</span>
							<span className='powerscore-breakdown-value' style={{ color: penaltyPresentation.commercialBreak.ink }}>
								{signed(-breakPenalty)}
							</span>
						</div>
					)}
					{variance !== 0 && (
						<div className='powerscore-breakdown-row'>
							<span className='d-flex align-items-center gap-1'>
								<FactorIcon icon={penaltyPresentation.volatility.icon} color={penaltyPresentation.volatility.color} />
								{variance > 0 ? i18n.t('powerScore.volatilityBoost') : i18n.t('powerScore.volatilityPenalty')}
								<SettingTooltipIcon text={i18n.t('powerScore.tooltipVolatility')} label={i18n.t('powerScore.volatility')} />
							</span>
							<span className='powerscore-breakdown-value' style={{ color: penaltyPresentation.volatility.ink }}>
								{signed(variance)}
							</span>
						</div>
					)}
					{generalBoosts.map(renderBoost)}
				</BreakdownSection>
			)}
			{sportBoosts.length > 0 && (
				<BreakdownSection
					id='sport'
					heading={i18n.t('powerScore.sportHeading', { sport: sportLabel })}
					total={(
						<div className='powerscore-breakdown-row powerscore-breakdown-row-subtotal'>
							<span>{i18n.t('powerScore.sportTotal', { sport: sportLabel })}</span>
							<span>{signed(sumOf(sportBoosts))}</span>
						</div>
					)}
				>
					{sportBoosts.map(renderBoost)}
				</BreakdownSection>
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
			<div className='powerscore-breakdown-row powerscore-breakdown-row-total'><span>{i18n.t('powerScore.finalPowerScore')}</span><span>{totalLabel}</span></div>
			{reason && <div className='powerscore-breakdown-reason'>{reason}</div>}
		</section>
	);
};

export default PowerScoreBreakdown;
