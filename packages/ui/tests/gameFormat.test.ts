import { leagueConfigs, leagueConfigMap } from '@arenaswap/core/constants';
import type { LeagueId, SportType } from '@arenaswap/core/types';
import { formatBreak, formatPeriod, isHalftime } from '../src/components/gameFormat';
import { translateFrom } from '../src/components/defaultStrings';

const periodLabels: Record<LeagueId, string[]> = {
	nba: ['Q1', 'Q2', 'Q3', 'Q4', 'OT', '2OT', '3OT'],
	wnba: ['Q1', 'Q2', 'Q3', 'Q4', 'OT', '2OT', '3OT'],
	ncaab: ['1H', '2H', 'OT', '2OT', '3OT'],
	nhl: ['P1', 'P2', 'P3', 'OT', 'SO', 'SO'],
	ncaamh: ['P1', 'P2', 'P3', 'OT', 'SO', 'SO'],
	mlb: ['Inn 1', 'Inn 2', 'Inn 3', 'Inn 4', 'Inn 5', 'Inn 6', 'Inn 7', 'Inn 8', 'Inn 9', 'Inn 10', 'Inn 11', 'Inn 12'],
	nfl: ['Q1', 'Q2', 'Q3', 'Q4', 'OT', '2OT', '3OT'],
	ncaaf: ['Q1', 'Q2', 'Q3', 'Q4', 'OT', '2OT', '3OT'],
	mls: ['1H', '2H', 'ET1', 'ET2', 'PENS'],
	ncaaw: ['Q1', 'Q2', 'Q3', 'Q4', 'OT', '2OT', '3OT'],
	epl: ['1H', '2H', 'ET1', 'ET2', 'PENS'],
	fifawc: ['1H', '2H', 'ET1', 'ET2', 'PENS'],
	cbase: ['Inn 1', 'Inn 2', 'Inn 3', 'Inn 4', 'Inn 5', 'Inn 6', 'Inn 7', 'Inn 8', 'Inn 9', 'Inn 10', 'Inn 11', 'Inn 12'],
	csoft: ['Inn 1', 'Inn 2', 'Inn 3', 'Inn 4', 'Inn 5', 'Inn 6', 'Inn 7', 'Inn 8', 'Inn 9', 'Inn 10'],
	olybb: ['Inn 1', 'Inn 2', 'Inn 3', 'Inn 4', 'Inn 5', 'Inn 6', 'Inn 7', 'Inn 8', 'Inn 9', 'Inn 10', 'Inn 11', 'Inn 12'],
	wbbc: ['Inn 1', 'Inn 2', 'Inn 3', 'Inn 4', 'Inn 5', 'Inn 6', 'Inn 7', 'Inn 8', 'Inn 9', 'Inn 10', 'Inn 11', 'Inn 12'],
	ufl: ['Q1', 'Q2', 'Q3', 'Q4', 'OT', '2OT', '3OT'],
	olymih: ['P1', 'P2', 'P3', 'OT', 'SO', 'SO'],
	olywih: ['P1', 'P2', 'P3', 'OT', 'SO', 'SO'],
	olybkm: ['Q1', 'Q2', 'Q3', 'Q4', 'OT', '2OT', '3OT'],
	olybkw: ['Q1', 'Q2', 'Q3', 'Q4', 'OT', '2OT', '3OT'],
	olysocm: ['1H', '2H', 'ET1', 'ET2', 'PENS'],
	olysocw: ['1H', '2H', 'ET1', 'ET2', 'PENS'],
	laliga: ['1H', '2H', 'ET1', 'ET2', 'PENS'],
	bundesliga: ['1H', '2H', 'ET1', 'ET2', 'PENS'],
	seriea: ['1H', '2H', 'ET1', 'ET2', 'PENS'],
	ligamx: ['1H', '2H', 'ET1', 'ET2', 'PENS'],
	ucl: ['1H', '2H', 'ET1', 'ET2', 'PENS'],
	uel: ['1H', '2H', 'ET1', 'ET2', 'PENS'],
	nwsl: ['1H', '2H', 'ET1', 'ET2', 'PENS'],
	fifawwc: ['1H', '2H', 'ET1', 'ET2', 'PENS'],
};

const halftimePeriod: Record<LeagueId, number | null> = {
	nba: 2,
	wnba: 2,
	ncaab: 1,
	nhl: null,
	ncaamh: null,
	mlb: null,
	nfl: 2,
	ncaaf: 2,
	mls: 1,
	ncaaw: 2,
	epl: 1,
	fifawc: 1,
	cbase: null,
	csoft: null,
	olybb: null,
	wbbc: null,
	ufl: 2,
	olymih: null,
	olywih: null,
	olybkm: 2,
	olybkw: 2,
	olysocm: 1,
	olysocw: 1,
	laliga: 1,
	bundesliga: 1,
	seriea: 1,
	ligamx: 1,
	ucl: 1,
	uel: 1,
	nwsl: 1,
	fifawwc: 1,
};

const sourceFor = (league: LeagueId, period: number) => ({
	league,
	period,
	sportType: leagueConfigMap[league]!.sportType as SportType,
});

const leagueRows = leagueConfigs.map(config => [config.id, config] as const);

describe('the tables cover exactly the leagues ArenaSwap ships', () => {
	test('every shipped league has a row, so a new one cannot land unlabelled', () => {
		const shipped = leagueConfigs.map(config => config.id).toSorted();
		expect(Object.keys(periodLabels).toSorted()).toEqual(shipped);
		expect(Object.keys(halftimePeriod).toSorted()).toEqual(shipped);
	});

	test('each row runs from period 1 through three past regulation', () => {
		for (const config of leagueConfigs) {
			expect(periodLabels[config.id]).toHaveLength(config.regularPeriods + 3);
		}
	});
});

describe('formatPeriod renders the same label it rendered before the split', () => {
	test.each(leagueRows)('%s', id => {
		const expected = periodLabels[id]!;
		const actual = expected.map((_, index) => formatPeriod(sourceFor(id, index + 1)));
		expect(actual).toEqual(expected);
	});
});

describe('isHalftime finds the break, and only the break', () => {
	test.each(leagueRows)('%s', (id, config) => {
		const expected = halftimePeriod[id];
		for (let period = 1; period <= config.regularPeriods + 3; period++) {
			expect(isHalftime(sourceFor(id, period))).toBe(period === expected);
		}
	});

	test.each(leagueRows)('%s labels its break as a regulation period, never overtime', id => {
		const breakPeriod = halftimePeriod[id];
		if (breakPeriod === null) return;
		expect(periodLabels[id]![breakPeriod - 1]).not.toMatch(/^(OT|ET|PENS)/);
	});
});

describe('hockey overtime', () => {
	test('NHL and NCAA playoff overtime is numbered, because it never goes to a shootout', () => {
		for (const league of ['nhl', 'ncaamh'] as LeagueId[]) {
			const labels = [4, 5, 6, 7].map(period => formatPeriod({ league, period, sportType: 'hockey', isPostseason: true }));
			expect(labels).toEqual(['OT', '2OT', '3OT', '4OT']);
		}
	});

	test('Olympic playoff hockey still ends in a shootout', () => {
		expect(formatPeriod({ league: 'olymih', period: 5, sportType: 'hockey', isPostseason: true })).toBe('SO');
	});
});

describe('the edges the card can reach', () => {
	test('a league with no config falls back to a bare period number', () => {
		expect(formatPeriod({ league: 'not-a-league' as LeagueId, period: 2, sportType: 'basketball' })).toBe('P2');
		expect(isHalftime({ league: 'not-a-league' as LeagueId, period: 1, sportType: 'basketball' })).toBe(false);
	});

	test('an absent period reads as period 1 for the label but not for the halftime check', () => {
		expect(formatPeriod({ league: 'nba', sportType: 'basketball' })).toBe('Q1');
		expect(formatPeriod({ league: 'epl', sportType: 'soccer' })).toBe('1H');
		expect(formatPeriod({ league: 'mlb', sportType: 'baseball' })).toBe('Inn 1');

		expect(isHalftime({ league: 'epl', sportType: 'soccer' })).toBe(false);
		expect(isHalftime({ league: 'epl', sportType: 'soccer', period: 1 })).toBe(true);
	});
});

describe('the re-export chain still carries both helpers', () => {
	test('gameCardShared hands on the same functions the module defines', async () => {
		const shared = await import('../src/components/gameCardShared');
		expect(shared.formatPeriod).toBe(formatPeriod);
		expect(shared.isHalftime).toBe(isHalftime);
		expect(shared.formatBreak).toBe(formatBreak);
	});
});

describe('formatBreak names the break the way a broadcast would', () => {
	test('the midpoint is halftime in every sport that has one', () => {
		expect(formatBreak({ league: 'nba', sportType: 'basketball', period: 2 })).toBe('Halftime');
		expect(formatBreak({ league: 'nfl', sportType: 'football', period: 2 })).toBe('Halftime');
		expect(formatBreak({ league: 'ncaab', sportType: 'basketball', period: 1 })).toBe('Halftime');
		expect(formatBreak({ league: 'epl', sportType: 'soccer', period: 1 })).toBe('Halftime');
	});

	test('any other break says which period ended, except in hockey', () => {
		expect(formatBreak({ league: 'nba', sportType: 'basketball', period: 3 })).toBe('End of Q3');
		expect(formatBreak({ league: 'nfl', sportType: 'football', period: 1 })).toBe('End of Q1');
		expect(formatBreak({ league: 'nhl', sportType: 'hockey', period: 1 })).toBe('Intermission');
		expect(formatBreak({ league: 'nhl', sportType: 'hockey', period: 2 })).toBe('Intermission');
	});
});

describe('formatPeriod translates', () => {
	const german = translateFrom(key => ({
		'gameCard.periodQuarter': 'Q{count}',
		'gameCard.periodFirstHalf': '1. HZ',
		'gameCard.periodSecondHalf': '2. HZ',
		'gameCard.period': '{count}. Drittel',
		'gameCard.periodInning': '{count}. Inning',
		'gameCard.periodOvertime': 'OT',
		'gameCard.periodOvertimeNumbered': '{count}OT',
		'gameCard.periodExtraTimeFirst': 'V1',
		'gameCard.periodExtraTimeSecond': 'V2',
		'gameCard.periodShootout': 'I.E.',
	} as Record<string, string>)[key]);
	const label = (league: LeagueId, period: number) => formatPeriod({ league, period, sportType: leagueConfigMap[league]!.sportType }, german);

	test.each([
		['nba', 2, 'Q2'],
		['nba', 6, '2OT'],
		['epl', 2, '2. HZ'],
		['epl', 3, 'V1'],
		['epl', 5, 'I.E.'],
		['nhl', 2, '2. Drittel'],
		['nhl', 4, 'OT'],
		['mlb', 7, '7. Inning'],
	] as [LeagueId, number, string][])('%s period %i reads %s', (league, period, expected) => {
		expect(label(league, period)).toBe(expected);
	});
});
