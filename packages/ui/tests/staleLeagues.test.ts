import { defaultTranslate } from '../src/components/defaultStrings';
import { formatStaleNote, staleLeagueMinutes } from '../src/components/staleLeagues';

const minute = 60_000;
const now = 1_760_000_000_000;

describe('staleLeagueMinutes', () => {
	test('counts whole minutes since the league last answered, for leagues that are not answering', () => {
		expect(staleLeagueMinutes(['nba', 'nhl'], { nba: now - (7 * minute) - 59_000, nhl: now - (90 * minute) }, now))
			.toEqual({ nba: 7, nhl: 90 });
	});

	test('says nothing about a league that is answering, even one with an old timestamp', () => {
		expect(staleLeagueMinutes(['nba'], { nba: now - minute, nhl: now - (30 * minute) }, now)).toEqual({ nba: 1 });
	});

	test('leaves out a refused league that has never answered', () => {
		expect(staleLeagueMinutes(['mlb'], { nba: now }, now)).toEqual({});
	});

	test('waits for a full minute, so a refusal moments after a good poll says nothing', () => {
		expect(staleLeagueMinutes(['nba', 'nhl', 'mlb'], { nba: now - 59_999, nhl: now - minute, mlb: now - 20_000 }, now))
			.toEqual({ nhl: 1 });
	});

	test('says nothing for a clock that stepped back', () => {
		expect(staleLeagueMinutes(['nba'], { nba: now + 5_000 }, now)).toEqual({});
	});

	test('is empty when nothing is refused', () => {
		expect(staleLeagueMinutes([], { nba: now - (10 * minute) }, now)).toEqual({});
	});
});

describe('formatStaleNote', () => {
	test.each([
		[1, 'Last updated 1 minute ago'],
		[2, 'Last updated 2 minutes ago'],
		[59, 'Last updated 59 minutes ago'],
		[60, 'Last updated 1 hour ago'],
		[119, 'Last updated 1 hour ago'],
		[120, 'Last updated 2 hours ago'],
		[1_500, 'Last updated 25 hours ago'],
	])('%i minutes reads %s', (minutes, expected) => {
		expect(formatStaleNote(minutes, defaultTranslate)).toBe(expected);
	});
});
