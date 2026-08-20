import { countdownParts, countdownShowsSeconds } from '../entrypoints/popup/components/startCountdown';

const minuteMs = 60_000;
const hourMs = 60 * minuteMs;
const dayMs = 24 * hourMs;

const partsIn = (ms: number) => countdownParts(1_000_000_000_000 + ms, 1_000_000_000_000);

describe('countdownParts', () => {
	test('splits the remaining time into days, hours, minutes and seconds', () => {
		expect(partsIn(2 * dayMs + 5 * hourMs + 13 * minuteMs + 42_000)).toEqual({
			days: 2,
			hours: 5,
			minutes: 13,
			seconds: 42,
			remainingMs: 2 * dayMs + 5 * hourMs + 13 * minuteMs + 42_000,
		});
	});

	test('truncates partial seconds rather than rounding up', () => {
		expect(partsIn(90_900)).toMatchObject({ minutes: 1, seconds: 30 });
	});

	test('clamps to zero once the start time has passed', () => {
		expect(partsIn(-5 * hourMs)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0, remainingMs: 0 });
	});
});

describe('countdownShowsSeconds', () => {
	test('shows seconds inside the final day', () => {
		expect(countdownShowsSeconds(partsIn(5 * hourMs))).toBe(true);
		expect(countdownShowsSeconds(partsIn(30_000))).toBe(true);
	});

	test('hides seconds once a day or more remains', () => {
		expect(countdownShowsSeconds(partsIn(dayMs))).toBe(false);
		expect(countdownShowsSeconds(partsIn(6 * dayMs))).toBe(false);
	});

	test('stops once the game has started', () => {
		expect(countdownShowsSeconds(partsIn(0))).toBe(false);
		expect(countdownShowsSeconds(null)).toBe(false);
	});
});
