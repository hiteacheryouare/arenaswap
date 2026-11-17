import type { UserPreferences } from '@arenaswap/core/types';

export type temperatureUnit = UserPreferences['temperatureUnit'];

export const romerUnlockClicks = 7;
export const romerUnlockWindowMs = 3000;

export const nextTemperatureUnit = (current: temperatureUnit, romerUnlocked: boolean): temperatureUnit => {
	const cycle: temperatureUnit[] = romerUnlocked ? ['F', 'C', 'Ro'] : ['F', 'C'];
	const index = cycle.indexOf(current);
	if (index === -1) return cycle[0]!;
	return cycle[(index + 1) % cycle.length]!;
};
