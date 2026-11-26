import type { BuiltInModeId, ScoringModeChoice, SportType } from '@arenaswap/core/types';
import { signalColors } from './signalColors';

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
	'lastShot',
	'suddenDeath',
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
	wine: { color: '#9f1239', ink: '#881337' },
	brown: { color: '#a16207', ink: '#854d0e' },
	aqua: { color: '#22d3ee', ink: '#0e7490' },
} as const satisfies Record<string, FactorTone>;

export interface BoostPresentation extends FactorTone {
	labelKey: string;
	tooltipKey: string;
	icon: string;
}

export interface ModePresentation {
	nameKey: string;
	usesBreakPenalty: boolean;
	blendTooltipKey?: string;
}

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

export const boostPresentation = {
	favoriteBoost: { labelKey: 'powerScore.favoriteBoost', tooltipKey: 'powerScore.tooltipFavoriteBoost', icon: 'star-fill', ...factorTones.gold },
	gameBoost: { labelKey: 'powerScore.gameBoost', tooltipKey: 'powerScore.tooltipGameBoost', icon: 'lightning-fill', ...factorTones.green },
	scoringOpportunity: { labelKey: 'powerScore.scoringOpportunity', tooltipKey: 'powerScore.tooltipScoringOpportunity', icon: 'bullseye', ...factorTones.orange },
	goAheadRun: { labelKey: 'powerScore.goAheadRun', tooltipKey: 'powerScore.tooltipGoAheadRun', icon: 'pentagon-fill', ...factorTones.lime },
	twoMinuteDrill: { labelKey: 'powerScore.twoMinuteDrill', tooltipKey: 'powerScore.tooltipTwoMinuteDrill', icon: 'stopwatch-fill', ...factorTones.rose },
	lastShot: { labelKey: 'powerScore.lastShot', tooltipKey: 'powerScore.tooltipLastShot', icon: 'hourglass-bottom', ...factorTones.brown },
	suddenDeath: { labelKey: 'powerScore.suddenDeath', tooltipKey: 'powerScore.tooltipSuddenDeath', icon: 'infinity', ...factorTones.aqua },
	redCard: { labelKey: 'powerScore.redCard', tooltipKey: 'powerScore.tooltipRedCard', icon: 'file-fill', ...factorTones.red },
	noHitter: { labelKey: 'powerScore.noHitter', tooltipKey: 'powerScore.tooltipNoHitter', icon: 'slash-circle-fill', ...factorTones.amber },
	upsetWatch: { labelKey: 'powerScore.upsetWatch', tooltipKey: 'powerScore.tooltipUpsetWatch', icon: 'binoculars-fill', ...factorTones.indigo },
	upsetRout: { labelKey: 'powerScore.upsetRout', tooltipKey: 'powerScore.tooltipUpsetRout', icon: 'tornado', ...factorTones.sky },
	stakes: { labelKey: 'powerScore.stakes', tooltipKey: 'powerScore.tooltipStakes', icon: 'flag-fill', ...factorTones.teal },
	postseasonBoost: { labelKey: 'powerScore.postseasonBoost', tooltipKey: 'powerScore.tooltipPostseasonBoost', icon: 'trophy-fill', ...factorTones.blue },
} as const satisfies Record<BoostId, BoostPresentation>;

export const boostSports: Partial<Record<BoostId, readonly SportType[]>> = {
	scoringOpportunity: ['football', 'baseball', 'softball', 'hockey'],
	goAheadRun: ['baseball', 'softball'],
	twoMinuteDrill: ['football'],
	lastShot: ['basketball'],
	suddenDeath: ['football', 'hockey', 'soccer'],
	redCard: ['soccer'],
	noHitter: ['baseball', 'softball'],
};

export const penaltyPresentation = {
	commercialBreak: { icon: 'tv-fill', ...factorTones.pink },
	volatility: { icon: 'activity', ...factorTones.purple },
	rivals: { icon: 'emoji-angry-fill', ...factorTones.wine },
} as const;

export const modePresentation = {
	classic: { nameKey: 'powerScore.modeClassic', usesBreakPenalty: true },
	blowouts: { nameKey: 'powerScore.modeBlowouts', usesBreakPenalty: true, blendTooltipKey: 'powerScore.tooltipBlendBlowouts' },
	fantasy: { nameKey: 'powerScore.modeFantasy', usesBreakPenalty: false, blendTooltipKey: 'powerScore.tooltipBlendFantasy' },
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

export const isModeSignalId = (id: string): id is ModeSignalId => Object.hasOwn(signalPresentation, id);
export const isBoostId = (id: string): id is BoostId => Object.hasOwn(boostPresentation, id);
export const isBuiltInModeId = (id: string | undefined): id is BuiltInModeId => id !== undefined && Object.hasOwn(modePresentation, id);

export const unknownFactorColor = '#6c757d';

export const signalColorOf = (id: string): string => (isModeSignalId(id) ? signalPresentation[id].color : unknownFactorColor);

export const displayModeOf = (choice: ScoringModeChoice | undefined): BuiltInModeId => (
	choice === undefined || choice === 'custom' ? 'classic' : choice
);
