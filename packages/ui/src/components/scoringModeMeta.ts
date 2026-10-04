import type { BuiltInModeId, ScoringModeChoice } from '@arenaswap/core/types';
import { signalColors } from './signalColors';

// How each PowerScore 3 engine id is drawn and named: the breakdown card, the charts, the
// walkthrough. The engine's ids are plain strings, so the unions below are ours, and a test holds
// them to the engine's own lists.

export const modeSignalIds = {
	classic: ['closeness', 'lateGame', 'momentum', 'leadChanges', 'comeback'],
	blowouts: ['blowoutMargin', 'sustained', 'timing', 'pileOn'],
	fantasy: ['situation', 'production', 'exposure'],
} as const satisfies Record<BuiltInModeId, readonly string[]>;

export type ModeSignalId = (typeof modeSignalIds)[BuiltInModeId][number];

export const boostIds = [
	'favoriteBoost',
	'gameBoost',
	'scoringOpportunity',
	'goAheadRun',
	'twoMinuteDrill',
	'emptyNet',
	'powerPlay',
	'redCard',
	'noHitter',
	'upsetWatch',
	'upsetRout',
	'stakes',
	'postseasonBoost',
] as const;

export type BoostId = (typeof boostIds)[number];

export interface SignalPresentation {
	labelKey: string;
	tooltipKey: string;
	measuredKey: string;
	color: string;
}

// `color` is for an icon or a fill, which needs 3:1. `ink` is the same hue darkened for a number on
// the breakdown's light card, which needs 4.5:1.
export interface FactorTone {
	color: string;
	ink: string;
}

export const factorTones = {
	red: { color: '#ef4444', ink: '#b91c1c' },
	purple: { color: '#a855f7', ink: '#7e22ce' },
	gold: { color: '#f1c40f', ink: '#8a6100' },
	green: { color: '#22c55e', ink: '#15803d' },
	orange: { color: '#f75c03', ink: '#c2410c' },
	blue: { color: '#2274a5', ink: '#2274a5' },
} as const satisfies Record<string, FactorTone>;

export interface BoostPresentation extends FactorTone {
	labelKey: string;
	tooltipKey: string;
	icon: string;
	// Drawn as a shaded stretch on the PowerScore chart while it pays.
	moment: boolean;
}

export interface ModePresentation {
	nameKey: string;
	// The engine pays no stall penalty in this mode, so the breakdown leaves the row out.
	usesStallPenalty: boolean;
	// Present when the mode blends with Classic, to say how.
	blendTooltipKey?: string;
}

// Each Blowouts signal takes the tone of the Classic signal it turns inside out: margin for
// closeness, a lead held for lead changes, an early rout for late-game, piling on for momentum.
export const signalPresentation = {
	closeness: { labelKey: 'powerScore.signalCloseness', tooltipKey: 'powerScore.tooltipCloseness', measuredKey: 'stepPowerScore.closenessMeasured', color: signalColors.closeness },
	lateGame: { labelKey: 'powerScore.signalLateGame', tooltipKey: 'powerScore.tooltipLateGame', measuredKey: 'stepPowerScore.lateGameMeasured', color: signalColors.lateGame },
	momentum: { labelKey: 'powerScore.signalMomentum', tooltipKey: 'powerScore.tooltipMomentum', measuredKey: 'stepPowerScore.momentumMeasured', color: signalColors.momentum },
	leadChanges: { labelKey: 'powerScore.signalLeadChanges', tooltipKey: 'powerScore.tooltipLeadChanges', measuredKey: 'stepPowerScore.leadChangesMeasured', color: signalColors.leadChanges },
	comeback: { labelKey: 'powerScore.signalComeback', tooltipKey: 'powerScore.tooltipComeback', measuredKey: 'stepPowerScore.comebackMeasured', color: signalColors.comeback },
	blowoutMargin: { labelKey: 'powerScore.signalBlowoutMargin', tooltipKey: 'powerScore.tooltipBlowoutMargin', measuredKey: 'stepPowerScore.blowoutMarginMeasured', color: signalColors.closeness },
	sustained: { labelKey: 'powerScore.signalSustained', tooltipKey: 'powerScore.tooltipSustained', measuredKey: 'stepPowerScore.sustainedMeasured', color: signalColors.leadChanges },
	timing: { labelKey: 'powerScore.signalTiming', tooltipKey: 'powerScore.tooltipTiming', measuredKey: 'stepPowerScore.timingMeasured', color: signalColors.lateGame },
	pileOn: { labelKey: 'powerScore.signalPileOn', tooltipKey: 'powerScore.tooltipPileOn', measuredKey: 'stepPowerScore.pileOnMeasured', color: signalColors.momentum },
	situation: { labelKey: 'powerScore.signalSituation', tooltipKey: 'powerScore.tooltipSituation', measuredKey: 'stepPowerScore.situationMeasured', color: signalColors.lateGame },
	production: { labelKey: 'powerScore.signalProduction', tooltipKey: 'powerScore.tooltipProduction', measuredKey: 'stepPowerScore.productionMeasured', color: signalColors.momentum },
	exposure: { labelKey: 'powerScore.signalExposure', tooltipKey: 'powerScore.tooltipExposure', measuredKey: 'stepPowerScore.exposureMeasured', color: signalColors.leadChanges },
} as const satisfies Record<ModeSignalId, SignalPresentation>;

// No two boosts that can pay in one game share an icon. The live moments take scoring
// opportunity's orange, what the result decides takes the postseason's blue, and the rare
// once-a-season things take volatility's purple.
export const boostPresentation = {
	favoriteBoost: { labelKey: 'powerScore.favoriteBoost', tooltipKey: 'powerScore.tooltipFavoriteBoost', icon: 'star-fill', moment: false, ...factorTones.gold },
	gameBoost: { labelKey: 'powerScore.gameBoost', tooltipKey: 'powerScore.tooltipGameBoost', icon: 'lightning-fill', moment: false, ...factorTones.green },
	scoringOpportunity: { labelKey: 'powerScore.scoringOpportunity', tooltipKey: 'powerScore.tooltipScoringOpportunity', icon: 'bullseye', moment: true, ...factorTones.orange },
	goAheadRun: { labelKey: 'powerScore.goAheadRun', tooltipKey: 'powerScore.tooltipGoAheadRun', icon: 'diamond-fill', moment: true, ...factorTones.orange },
	twoMinuteDrill: { labelKey: 'powerScore.twoMinuteDrill', tooltipKey: 'powerScore.tooltipTwoMinuteDrill', icon: 'stopwatch-fill', moment: true, ...factorTones.orange },
	emptyNet: { labelKey: 'powerScore.emptyNet', tooltipKey: 'powerScore.tooltipEmptyNet', icon: 'door-open-fill', moment: true, ...factorTones.orange },
	powerPlay: { labelKey: 'powerScore.powerPlay', tooltipKey: 'powerScore.tooltipPowerPlay', icon: 'person-plus-fill', moment: true, ...factorTones.orange },
	redCard: { labelKey: 'powerScore.redCard', tooltipKey: 'powerScore.tooltipRedCard', icon: 'file-fill', moment: true, ...factorTones.red },
	noHitter: { labelKey: 'powerScore.noHitter', tooltipKey: 'powerScore.tooltipNoHitter', icon: 'slash-circle-fill', moment: true, ...factorTones.purple },
	upsetWatch: { labelKey: 'powerScore.upsetWatch', tooltipKey: 'powerScore.tooltipUpsetWatch', icon: 'binoculars-fill', moment: true, ...factorTones.purple },
	upsetRout: { labelKey: 'powerScore.upsetRout', tooltipKey: 'powerScore.tooltipUpsetRout', icon: 'arrow-down-up', moment: false, ...factorTones.purple },
	stakes: { labelKey: 'powerScore.stakes', tooltipKey: 'powerScore.tooltipStakes', icon: 'flag-fill', moment: true, ...factorTones.blue },
	postseasonBoost: { labelKey: 'powerScore.postseasonBoost', tooltipKey: 'powerScore.tooltipPostseasonBoost', icon: 'trophy-fill', moment: false, ...factorTones.blue },
} as const satisfies Record<BoostId, BoostPresentation>;

// The two adjustments that are not boosts: they come from the clock and the win-probability line.
export const penaltyPresentation = {
	clockStall: { icon: 'hourglass-split', ...factorTones.red },
	volatility: { icon: 'activity', ...factorTones.purple },
} as const;

export const modePresentation = {
	classic: { nameKey: 'powerScore.modeClassic', usesStallPenalty: true },
	blowouts: { nameKey: 'powerScore.modeBlowouts', usesStallPenalty: true, blendTooltipKey: 'powerScore.tooltipBlendBlowouts' },
	fantasy: { nameKey: 'powerScore.modeFantasy', usesStallPenalty: false, blendTooltipKey: 'powerScore.tooltipBlendFantasy' },
} as const satisfies Record<BuiltInModeId, ModePresentation>;

export const modeNameKeys = {
	classic: modePresentation.classic.nameKey,
	blowouts: modePresentation.blowouts.nameKey,
	fantasy: modePresentation.fantasy.nameKey,
	custom: 'powerScore.modeCustom',
} as const satisfies Record<ScoringModeChoice, string>;

export const modeIcons = {
	classic: 'bi-lightning-charge',
	blowouts: 'bi-hammer',
	fantasy: 'bi-person-badge',
	custom: 'bi-sliders2',
} as const satisfies Record<ScoringModeChoice, string>;

export const isModeSignalId =(id: string): id is ModeSignalId => Object.hasOwn(signalPresentation, id);
export const isBoostId = (id: string): id is BoostId => Object.hasOwn(boostPresentation, id);
export const isBuiltInModeId = (id: string | undefined): id is BuiltInModeId => id !== undefined && Object.hasOwn(modePresentation, id);

// A custom mode's own ids have no entry, so they draw in a neutral grey under their raw id.
export const unknownFactorColor = '#6c757d';

export const signalColorOf = (id: string): string => (isModeSignalId(id) ? signalPresentation[id].color : unknownFactorColor);

// Custom picks a built-in mode per league, so a screen that needs one mode shows Classic for it.
export const displayModeOf = (choice: ScoringModeChoice | undefined): BuiltInModeId => (
	choice === undefined || choice === 'custom' ? 'classic' : choice
);
