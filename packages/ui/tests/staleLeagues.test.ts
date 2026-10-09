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

	test('reads zero minutes for a refusal moments after a good poll, and for a clock that stepped back', () => {
		expect(staleLeagueMinutes(['nba', 'nhl'], { nba: now - 20_000, nhl: now + 5_000 }, now)).toEqual({ nba: 0, nhl: 0 });
	});

	test('is empty when nothing is refused', () => {
		expect(staleLeagueMinutes([], { nba: now - (10 * minute) }, now)).toEqual({});
	});
});

describe('formatStaleNote', () => {
	test.each([
		[0, 'Last updated less than a minute ago'],
		[1, 'Last updated 1 minute ago'],
		[2, 'Last updated 2 minutes ago'],
		[95, 'Last updated 95 minutes ago'],
	])('%i minutes reads %s', (minutes, expected) => {
		expect(formatStaleNote(minutes, defaultTranslate)).toBe(expected);
	});
});
