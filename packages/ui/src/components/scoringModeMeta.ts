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
	rose: { color: '#f43f5e', ink: '#be123c' },
	orange: { color: '#f75c03', ink: '#c2410c' },
	amber: { color: '#f59e0b', ink: '#b45309' },
	gold: { color: '#f1c40f', ink: '#8a6100' },
	lime: { color: '#84cc16', ink: '#4d7c0f' },
	green: { color: '#22c55e', ink: '#15803d' },
	teal: { color: '#14b8a6', ink: '#0f766e' },
	sky: { color: '#0ea5e9', ink: '#0369a1' },
	blue: { color: '#2274a5', ink: '#2274a5' },
	indigo: { color: '#6366f1', ink: '#4338ca' },
	purple: { color: '#a855f7', ink: '#7e22ce' },
	pink: { color: '#ec4899', ink: '#be185d' },
} as const satisfies Record<string, FactorTone>;

export interface BoostPresentation extends FactorTone {
	labelKey: string;
	tooltipKey: string;
	icon: string;
	// Named in the PowerScore chart's tooltip while it pays.
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
	closeness: { labelKey: 'powerScore.signalCloseness', tooltipKey: 'powerScore.tooltipCloseness', color: signalColors.closeness },
	lateGame: { labelKey: 'powerScore.signalLateGame', tooltipKey: 'powerScore.tooltipLateGame', color: signalColors.lateGame },
	momentum: { labelKey: 'powerScore.signalMomentum', tooltipKey: 'powerScore.tooltipMomentum', color: signalColors.momentum },
	leadChanges: { labelKey: 'powerScore.signalLeadChanges', tooltipKey: 'powerScore.tooltipLeadChanges', color: signalColors.leadChanges },
	comeback: { labelKey: 'powerScore.signalComeback', tooltipKey: 'powerScore.tooltipComeback', color: signalColors.comeback },
	blowoutMargin: { labelKey: 'powerScore.signalBlowoutMargin', tooltipKey: 'powerScore.tooltipBlowoutMargin', color: signalColors.closeness },
	sustained: { labelKey: 'powerScore.signalSustained', tooltipKey: 'powerScore.tooltipSustained', color: signalColors.leadChanges },
	timing: { labelKey: 'powerScore.signalTiming', tooltipKey: 'powerScore.tooltipTiming', color: signalColors.lateGame },
	pileOn: { labelKey: 'powerScore.signalPileOn', tooltipKey: 'powerScore.tooltipPileOn', color: signalColors.momentum },
	situation: { labelKey: 'powerScore.signalSituation', tooltipKey: 'powerScore.tooltipSituation', color: signalColors.lateGame },
	production: { labelKey: 'powerScore.signalProduction', tooltipKey: 'powerScore.tooltipProduction', color: signalColors.momentum },
	exposure: { labelKey: 'powerScore.signalExposure', tooltipKey: 'powerScore.tooltipExposure', color: signalColors.leadChanges },
} as const satisfies Record<ModeSignalId, SignalPresentation>;

// Every boost and penalty has its own icon and tone, and any two that can share a card sit at least
// 11 apart in ΔE00. Closer hues only meet across sports, like the two-minute drill and the red card.
export const boostPresentation = {
	favoriteBoost: { labelKey: 'powerScore.favoriteBoost', tooltipKey: 'powerScore.tooltipFavoriteBoost', icon: 'star-fill', moment: false, ...factorTones.gold },
	gameBoost: { labelKey: 'powerScore.gameBoost', tooltipKey: 'powerScore.tooltipGameBoost', icon: 'lightning-fill', moment: false, ...factorTones.green },
	scoringOpportunity: { labelKey: 'powerScore.scoringOpportunity', tooltipKey: 'powerScore.tooltipScoringOpportunity', icon: 'bullseye', moment: true, ...factorTones.orange },
	goAheadRun: { labelKey: 'powerScore.goAheadRun', tooltipKey: 'powerScore.tooltipGoAheadRun', icon: 'pentagon-fill', moment: true, ...factorTones.lime },
	twoMinuteDrill: { labelKey: 'powerScore.twoMinuteDrill', tooltipKey: 'powerScore.tooltipTwoMinuteDrill', icon: 'stopwatch-fill', moment: true, ...factorTones.rose },
	redCard: { labelKey: 'powerScore.redCard', tooltipKey: 'powerScore.tooltipRedCard', icon: 'file-fill', moment: true, ...factorTones.red },
	noHitter: { labelKey: 'powerScore.noHitter', tooltipKey: 'powerScore.tooltipNoHitter', icon: 'slash-circle-fill', moment: true, ...factorTones.amber },
	upsetWatch: { labelKey: 'powerScore.upsetWatch', tooltipKey: 'powerScore.tooltipUpsetWatch', icon: 'binoculars-fill', moment: true, ...factorTones.indigo },
	upsetRout: { labelKey: 'powerScore.upsetRout', tooltipKey: 'powerScore.tooltipUpsetRout', icon: 'tornado', moment: false, ...factorTones.sky },
	stakes: { labelKey: 'powerScore.stakes', tooltipKey: 'powerScore.tooltipStakes', icon: 'flag-fill', moment: true, ...factorTones.teal },
	postseasonBoost: { labelKey: 'powerScore.postseasonBoost', tooltipKey: 'powerScore.tooltipPostseasonBoost', icon: 'trophy-fill', moment: false, ...factorTones.blue },
} as const satisfies Record<BoostId, BoostPresentation>;

// The two adjustments that are not boosts: they come from the clock and the win-probability line.
export const penaltyPresentation = {
	clockStall: { icon: 'pause-circle-fill', ...factorTones.pink },
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
