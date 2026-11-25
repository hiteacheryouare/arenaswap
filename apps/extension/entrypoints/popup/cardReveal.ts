import { readOpenRevealEnabled } from '../../utils/openReveal';

export type revealMode = 'full' | 'quick' | 'none';

export interface cardRevealPlan {
	mode: revealMode;
	order: Map<string, number>;
	skipping: boolean;
	cut: revealCut;
}

export const revealBaseDurationMs = 3400;

export const revealOpenBeatMs = 700;
export const revealNameBeatMs = 1750;

export const revealFullRate = 1.3;
export const revealQuickRate = 0.8;

export const revealRate = (mode: revealMode) => {
	if (mode === 'full') return revealFullRate;
	if (mode === 'quick') return revealQuickRate;
	return 0;
};

export const revealDurationMs = (mode: revealMode) => Math.round(revealBaseDurationMs * revealRate(mode));

export const revealOpenMs = (mode: revealMode) => (
	mode === 'full' ? Math.round((revealOpenBeatMs + revealNameBeatMs) * revealRate(mode)) : 0
);

export const revealTotalMs = (mode: revealMode) => revealOpenMs(mode) + revealDurationMs(mode);

export const revealStaggerStepMs = 80;
export const revealStaggerCapIndex = 6;

export const revealDelayMs = (index: number, mode: revealMode) => Math.round(
	Math.min(index, revealStaggerCapIndex) * revealStaggerStepMs * revealRate(mode),
);

export const revealSpineStartMs = (index: number, mode: revealMode) => (
	revealDelayMs(index, mode) + revealOpenMs(mode)
);

export const revealMaxCards = 8;

export const revealModeForIndex = (mode: revealMode, index: number): revealMode => (
	index < revealMaxCards ? mode : 'none'
);

export const revealSettleMs = (mode: revealMode, cut: revealCut = 'poster') => (
	mode === 'none' ? 0 : revealDelayMs(revealStaggerCapIndex, mode) + revealCutTotalMs(mode, cut)
);

export const revealSkipOutMs = 140;

export const revealOpenCrestOverhangPerEdge = 0.17;
export const revealOpenCrestShare = 1 + revealOpenCrestOverhangPerEdge * 2;

export const revealSweepAngleDeg = 20.5;
export const revealLeanRatio = Math.tan((revealSweepAngleDeg * Math.PI) / 180);

export const revealLeanWidthCap = 0.1;

export const revealLean = (stageHeight: number, cardWidth: number) => Math.min(
	(stageHeight * revealLeanRatio) / 2,
	cardWidth * revealLeanWidthCap,
);

export const revealSkewDeg = (lean: number, stageHeight: number) => (
	stageHeight <= 0 ? revealSweepAngleDeg : (Math.atan((lean * 2) / stageHeight) * 180) / Math.PI
);

export const revealStageBleedPx = 1;

export const revealAbbrBaseLength = 3;

export const revealAbbrScale = (away = '', home = '') => (
	revealAbbrBaseLength / Math.max(revealAbbrBaseLength, away.length, home.length)
);

export const revealNameLines = (name = '', nickname = ''): string[] => {
	const full = name.trim().replace(/\s+/g, ' ');
	if (!full) return [];
	const tail = nickname.trim().replace(/\s+/g, ' ');
	const breakAt = tail && tail.length < full.length && full.endsWith(tail)
		? full.length - tail.length
		: full.lastIndexOf(' ') + 1;
	if (breakAt <= 0) return [full];
	return [full.slice(0, breakAt).trim(), full.slice(breakAt)];
};

export const revealNameLineHeight = 1.06;
export const revealNameMaxPx = 72;
export const revealNameInsetPx = 12;
export const revealNameHeightShare = 0.86;

const dmSansBoldEm = { fontAscent: 0.99, fontDescent: 0.31, inkAscent: 0.725, inkDescent: 0.232, space: 0.2355, averageCapAdvance: 0.68 };
const baselineDropEm = (dmSansBoldEm.fontAscent - dmSansBoldEm.fontDescent) / 2;

export const revealNameInkTopEm = dmSansBoldEm.inkAscent - baselineDropEm;
export const revealNameInkBottomEm = dmSansBoldEm.inkDescent + baselineDropEm;

export const revealNameSpaceEm = dmSansBoldEm.space;

export const revealNameJoinedRatio = (ratios: number[]) => (
	ratios.reduce((total, ratio) => total + ratio, 0) + revealNameSpaceEm * Math.max(0, ratios.length - 1)
);

const inkGapEm = () => Math.max(0, revealNameLineHeight / 2 - revealNameInkTopEm);
const inkHangEm = () => Math.max(0, revealNameInkBottomEm - revealNameLineHeight / 2);

export const revealNameSpread = 1.8;

export const revealNameFit = (ratios: number[], boxWidth: number, boxHeight: number, inset = revealNameInsetPx) => {
	if (!ratios.length || ratios.some(ratio => !(ratio > 0))) return ratios.map(() => 0);
	const width = Math.max(0, boxWidth - inset * 2);
	const height = Math.max(0, boxHeight * revealNameHeightShare);
	const stacked = ratios.reduce((total, ratio) => total + revealNameLineHeight / ratio, 0);
	const ink = stacked - inkGapEm() / ratios[0]! + inkHangEm() / ratios[ratios.length - 1]!;
	const block = Math.min(width, height / ink);
	const justified = ratios.map(ratio => block / ratio);
	const spread = Math.min(...justified) * revealNameSpread;
	return justified.map(size => Math.min(size, spread, revealNameMaxPx));
};

export const revealNameLift = (sizes: number[]) => (
	sizes.length && sizes.every(size => size > 0)
		? (inkGapEm() * sizes[0]! + inkHangEm() * sizes[sizes.length - 1]!) / 2
		: 0
);

export const revealSweepBarPx = 22;

export const revealSweepRun = (cardWidth: number, lean: number) => cardWidth + revealSweepBarPx + lean * 2;

export const revealPlateRatio = 4 / 3;

export const revealHoldHeightShare = 0.9;
export const revealHoldWidthShare = 0.42;

export const revealHoldScale = (cardWidth: number, cardHeight: number, crestSize: number) => {
	if (crestSize <= 0) return 1;
	const plate = Math.min(cardHeight * revealHoldHeightShare, cardWidth * revealHoldWidthShare);
	return Math.max(1, plate / (crestSize * revealPlateRatio));
};

export const lastRevealDayKey = 'arenaswap.lastOpenReveal';

export const revealDayStamp = (now: Date) => [
	now.getFullYear(),
	String(now.getMonth() + 1).padStart(2, '0'),
	String(now.getDate()).padStart(2, '0'),
].join('-');

export const pickRevealMode = (
	lastDay: string | null,
	today: string,
	reducedMotion: boolean,
	enabled: boolean,
): revealMode => {
	if (reducedMotion || !enabled) return 'none';
	return lastDay === today ? 'quick' : 'full';
};

// Memoised rather than guarded: StrictMode runs every `useState` initializer twice.
let resolved: revealMode | null = null;

export const resolveOpenRevealMode = (now = new Date()): revealMode => {
	if (resolved !== null) return resolved;
	const today = revealDayStamp(now);
	const lastDay = globalThis.localStorage?.getItem(lastRevealDayKey) ?? null;
	const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
	resolved = pickRevealMode(lastDay, today, reducedMotion, readOpenRevealEnabled());
	if (resolved !== 'none') globalThis.localStorage?.setItem(lastRevealDayKey, today);
	return resolved;
};

export type revealCut = 'poster' | 'headToHead' | 'typeSlam' | 'boxScore';

export const revealCuts: revealCut[] = ['poster', 'headToHead', 'typeSlam', 'boxScore'];

export const revealCutMs: Record<Exclude<revealCut, 'poster'>, number> = {
	headToHead: 1850,
	typeSlam: 2400,
	boxScore: 1600,
};

export const revealSlamTypePx = (abbreviation: string, width: number, height: number) => (
	Math.min(height, width / (dmSansBoldEm.averageCapAdvance * Math.max(2, abbreviation.length)))
);

export const lastRevealCutKey = 'arenaswap.lastOpenRevealCut';

export const pickRevealCut = (mode: revealMode, lastCut: string | null, random = Math.random): revealCut => {
	if (mode !== 'quick') return 'poster';
	const choices = revealCuts.filter(cut => cut !== lastCut);
	return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))]!;
};

export const revealCutTotalMs = (mode: revealMode, cut: revealCut) => (
	mode === 'none' || cut === 'poster' ? revealTotalMs(mode) : revealCutMs[cut]
);

let resolvedCut: revealCut | null = null;

export const resolveOpenRevealCut = (mode: revealMode): revealCut => {
	if (resolvedCut !== null) return resolvedCut;
	resolvedCut = pickRevealCut(mode, globalThis.localStorage?.getItem(lastRevealCutKey) ?? null);
	if (mode !== 'none') globalThis.localStorage?.setItem(lastRevealCutKey, resolvedCut);
	return resolvedCut;
};
