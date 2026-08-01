import { countdownParts, formatStartsIn } from '../entrypoints/popup/components/startCountdown';

const minuteMs = 60_000;
const hourMs = 60 * minuteMs;
const dayMs = 24 * hourMs;

const partsIn = (ms: number) => countdownParts(1_000_000_000_000 + ms, 1_000_000_000_000);

describe('countdownParts', () => {
	test('splits the remaining time into days, hours and minutes', () => {
		expect(partsIn(2 * dayMs + 5 * hourMs + 13 * minuteMs)).toEqual({
			days: 2,
			hours: 5,
			minutes: 13,
			remainingMs: 2 * dayMs + 5 * hourMs + 13 * minuteMs,
		});
	});

	test('truncates partial minutes rather than rounding up', () => {
		expect(partsIn(90 * 1000)).toMatchObject({ days: 0, hours: 0, minutes: 1 });
	});

	test('clamps to zero once the start time has passed', () => {
		expect(partsIn(-5 * hourMs)).toEqual({ days: 0, hours: 0, minutes: 0, remainingMs: 0 });
	});
});

describe('formatStartsIn', () => {
	test('lists days, hours and minutes for a distant start', () => {
		expect(formatStartsIn(partsIn(2 * dayMs + 5 * hourMs + 13 * minuteMs)))
			.toBe('Starts in 2 days 5 hours 13 minutes');
	});

	test('uses singular units for a count of one', () => {
		expect(formatStartsIn(partsIn(dayMs + hourMs + minuteMs)))
			.toBe('Starts in 1 day 1 hour 1 minute');
	});

	test('keeps a zero hours segment when days are showing', () => {
		expect(formatStartsIn(partsIn(dayMs + 5 * minuteMs)))
			.toBe('Starts in 1 day 0 hours 5 minutes');
	});

	test('drops the days segment inside 24 hours', () => {
		expect(formatStartsIn(partsIn(3 * hourMs + 4 * minuteMs)))
			.toBe('Starts in 3 hours 4 minutes');
	});

	test('drops both larger segments inside the hour', () => {
		expect(formatStartsIn(partsIn(42 * minuteMs))).toBe('Starts in 42 minutes');
	});

	test('falls back to "Starts soon" under a minute out', () => {
		expect(formatStartsIn(partsIn(30 * 1000))).toBe('Starts soon');
	});

	test('falls back to "Starts soon" when there is no scheduled start time', () => {
		expect(formatStartsIn(null)).toBe('Starts soon');
	});
});
