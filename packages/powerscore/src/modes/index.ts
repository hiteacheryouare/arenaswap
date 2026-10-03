import { classicMode } from './classic';
import { blowoutsMode } from './blowouts';
import { fantasyMode } from './fantasy';
import type { BuiltInModeId, PowerScoreMode } from '../types';

export const builtInModes: Record<BuiltInModeId, PowerScoreMode> = {
	classic: classicMode,
	blowouts: blowoutsMode,
	fantasy: fantasyMode,
};

// Checks a custom mode once, up front, rather than on every score.
export const defineMode = (mode: PowerScoreMode): PowerScoreMode => {
	const ids = new Set<string>();
	for (const signal of mode.signals) {
		if (ids.has(signal.id)) throw new Error(`PowerScore mode "${mode.id}" declares signal "${signal.id}" twice`);
		if (!(signal.ceiling > 0)) throw new Error(`PowerScore signal "${signal.id}" needs a positive ceiling`);
		ids.add(signal.id);
	}
	if (mode.signals.length === 0) throw new Error(`PowerScore mode "${mode.id}" declares no signals`);
	return mode;
};

export const getMode = (mode: BuiltInModeId | PowerScoreMode | undefined): PowerScoreMode => {
	if (mode === undefined) return classicMode;
	if (typeof mode === 'string') return builtInModes[mode] ?? classicMode;
	return mode;
};

export { blowoutsMode, classicMode, fantasyMode };
