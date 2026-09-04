import type { UserPreferences } from '@arenaswap/core/types';

export type temperatureUnit = UserPreferences['temperatureUnit'];

// Seven, in a rolling three-second window, matching the ten-click heart in the footer. Nobody
// reaches it by changing their mind twice about Celsius.
export const romerUnlockClicks = 7;
export const romerUnlockWindowMs = 3000;

// Rømer joins the rotation only once it has been found. Until then this is the two-state toggle it
// has always been, and an unlocked-but-unknown unit falls back to the start of the cycle rather
// than stranding anyone on a value the button cannot advance past.
export const nextTemperatureUnit = (current: temperatureUnit, romerUnlocked: boolean): temperatureUnit => {
	const cycle: temperatureUnit[] = romerUnlocked ? ['F', 'C', 'Ro'] : ['F', 'C'];
	const index = cycle.indexOf(current);
	if (index === -1) return cycle[0]!;
	return cycle[(index + 1) % cycle.length]!;
};
