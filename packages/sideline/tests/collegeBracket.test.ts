import { readCollegeBracket } from '../src/collegeBracket';

describe('the title rounds', () => {
	test('read off the round headline, per sport', () => {
		expect(readCollegeBracket('ncaab', "NCAA Men's Basketball Championship - East Region - 1st Round")).toEqual({ collegeTitleRound: true, collegeSeeded: true });
		expect(readCollegeBracket('ncaab', "NCAA Men's Basketball Championship - West Region - First Four").collegeTitleRound).toBeUndefined();
		expect(readCollegeBracket('ncaab', 'NIT - 1st Round')).toEqual({});
		expect(readCollegeBracket('ncaaw', "NCAA Women's Basketball Championship - Regional 3 in Fort Worth - 1st Round").collegeTitleRound).toBeUndefined();
		expect(readCollegeBracket('ncaaw', "NCAA Women's Basketball Championship - Regional 1 in Fort Worth - Sweet 16").collegeTitleRound).toBe(true);
		expect(readCollegeBracket('ncaaw', "Women's NIT - 3rd Round")).toEqual({});
		expect(readCollegeBracket('ncaaf', 'College Football Playoff First Round Game')).toEqual({ collegeTitleRound: true, collegeSeeded: true });
		expect(readCollegeBracket('ncaaf', 'FCS Championship - Semifinals')).toEqual({});
		expect(readCollegeBracket('ncaaf', 'Pop-Tarts Bowl')).toEqual({});
		expect(readCollegeBracket('ncaamh', "NCAA Men's Hockey Championship - Albany Regional Semifinal").collegeTitleRound).toBe(true);
		expect(readCollegeBracket('cbase', "Men's College World Series - Elimination Game").collegeTitleRound).toBe(true);
		expect(readCollegeBracket('cbase', 'NCAA Baseball Championship - Athens Super Regional - Game 1')).toEqual({});
		expect(readCollegeBracket('csoft', "Women's College World Series - Finals - Game 1").collegeTitleRound).toBe(true);
		expect(readCollegeBracket('nba', 'NBA Finals - Game 1')).toEqual({});
	});
});
