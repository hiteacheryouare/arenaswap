import { nextTemperatureUnit, romerUnlockClicks, romerUnlockWindowMs } from '../utils/temperatureUnitCycle';

const lap = (unlocked: boolean, steps: number) => {
	let unit = nextTemperatureUnit('F', unlocked);
	for (let i = 1; i < steps; i += 1) unit = nextTemperatureUnit(unit, unlocked);
	return unit;
};

describe('nextTemperatureUnit', () => {
	test('is a two-state toggle until Rømer has been found', () => {
		expect(nextTemperatureUnit('F', false)).toBe('C');
		expect(nextTemperatureUnit('C', false)).toBe('F');
	});

	test('adds Rømer as a third stop once unlocked', () => {
		expect(nextTemperatureUnit('F', true)).toBe('C');
		expect(nextTemperatureUnit('C', true)).toBe('Ro');
		expect(nextTemperatureUnit('Ro', true)).toBe('F');
	});

	test('returns to Fahrenheit rather than stranding a locked user on Rømer', () => {
		expect(nextTemperatureUnit('Ro', false)).toBe('F');
	});

	test('lands back where it started after a full lap of either cycle', () => {
		expect(lap(false, 2)).toBe('F');
		expect(lap(true, 3)).toBe('F');
	});

	test('the unlock gesture is seven clicks in three seconds', () => {
		expect(romerUnlockClicks).toBe(7);
		expect(romerUnlockWindowMs).toBe(3000);
	});
});
