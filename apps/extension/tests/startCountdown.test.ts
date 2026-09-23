import { i18n } from '#i18n';
import { countdownParts, countdownShowsSeconds, formatCompactCountdown } from '../entrypoints/popup/components/startCountdown';

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

describe('formatCompactCountdown', () => {
	const t = i18n.t;

	test('leads with days and drops the minutes the hero shows', () => {
		expect(formatCompactCountdown(partsIn(2 * dayMs + 5 * hourMs + 13 * minuteMs), t)).toBe('2d 05h');
	});

	test('leads with hours inside the final day', () => {
		expect(formatCompactCountdown(partsIn(5 * hourMs + 13 * minuteMs + 42_000), t)).toBe('5h 13m');
	});

	test('drops a zero hours segment rather than printing it', () => {
		expect(formatCompactCountdown(partsIn(13 * minuteMs + 42_000), t)).toBe('13m 42s');
	});

	test('shows seconds alone under a minute, since there is no unit below to pair', () => {
		expect(formatCompactCountdown(partsIn(9_000), t)).toBe('9s');
	});

	test('pads the trailing figure so a ticking string keeps its width', () => {
		expect(formatCompactCountdown(partsIn(3 * hourMs + 5 * minuteMs), t)).toBe('3h 05m');
		expect(formatCompactCountdown(partsIn(5 * minuteMs + 7_000), t)).toBe('5m 07s');
	});

	test('never pads the leading figure', () => {
		expect(formatCompactCountdown(partsIn(dayMs + hourMs), t)).toBe('1d 01h');
		expect(formatCompactCountdown(partsIn(2 * hourMs), t)).toBe('2h 00m');
	});

	test('falls back to "Starts soon" once the clock runs out', () => {
		expect(formatCompactCountdown(partsIn(0), t)).toBe('Starts soon');
		expect(formatCompactCountdown(partsIn(-5 * hourMs), t)).toBe('Starts soon');
	});

	test('renders nothing at all when there is no start time to count to', () => {
		expect(formatCompactCountdown(null, t)).toBe('');
	});
});
