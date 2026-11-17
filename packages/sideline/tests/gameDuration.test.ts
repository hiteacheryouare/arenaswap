import { parseGameDurationMins } from '../src/apiClient';

const withDuration = (gameDuration: unknown) => ({ gameInfo: { gameDuration } });

describe('parseGameDurationMins', () => {
	test.each([
		['3:14', 194],
		['2:42', 162],
		['2:17', 137],
		['0:59', 59],
		['10:05', 605],
	])('reads %s as %i minutes', (raw, expected) => {
		expect(parseGameDurationMins(withDuration(raw))).toBe(expected);
	});

	test('trims the whitespace ESPN occasionally pads values with', () => {
		expect(parseGameDurationMins(withDuration('  3:14 '))).toBe(194);
	});

	test.each([
		['a clock time with no minutes', '3:'],
		['minutes over sixty, which is not a duration this way round', '3:75'],
		['a bare number', '194'],
		['an empty string', ''],
		['a number rather than a string', 194],
		['null', null],
	])('ignores %s rather than guessing', (_label, raw) => {
		expect(parseGameDurationMins(withDuration(raw))).toBeNull();
	});

	test('a payload with no gameInfo at all', () => {
		expect(parseGameDurationMins({})).toBeNull();
		expect(parseGameDurationMins(null)).toBeNull();
		expect(parseGameDurationMins(undefined)).toBeNull();
	});

	test('a payload whose gameInfo omits the key', () => {
		expect(parseGameDurationMins({ gameInfo: { attendance: 42793 } })).toBeNull();
	});
});
