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
		expect(staleLeagueMinutes(['nba'], { nba: now - (6 * minute), nhl: now - (30 * minute) }, now)).toEqual({ nba: 6 });
	});

	test('leaves out a refused league that has never answered', () => {
		expect(staleLeagueMinutes(['mlb'], { nba: now }, now)).toEqual({});
	});

	test('waits five minutes, so a few missed polls say nothing', () => {
		expect(staleLeagueMinutes(['nba', 'nhl', 'mlb'], { nba: now - (5 * minute) + 1, nhl: now - (5 * minute), mlb: now - minute }, now))
			.toEqual({ nhl: 5 });
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
