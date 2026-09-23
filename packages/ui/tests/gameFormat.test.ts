import { leagueConfigs, leagueConfigMap } from '@arenaswap/core/constants';
import type { LeagueId, SportType } from '@arenaswap/core/types';
import { formatPeriod, isHalftime } from '../src/components/gameFormat';

/* The label in the middle of a live card is the one thing on it that says where the game is. A
   league config edit — a periodFormat typo, a regularPeriods off by one, a new league copied from
   the wrong neighbour — changes that label without changing a line of this module, and the
   existing "renders something non-empty" sweep in gameCardShared.test.ts would stay green through
   all of it.

   So the expected labels are written out rather than derived from the same config the function
   reads, which would only prove the function agrees with itself. Every value below was diffed
   against the pre-split implementation in `gameCardShared.tsx` at commit 0750e61c, for every
   league and every period from 0 to regularPeriods + 6: identical throughout. */

const periodLabels: Record<LeagueId, string[]> = {
	nba: ['Q1', 'Q2', 'Q3', 'Q4', 'OT1', 'OT2', 'OT3'],
	wnba: ['Q1', 'Q2', 'Q3', 'Q4', 'OT1', 'OT2', 'OT3'],
	ncaab: ['1H', '2H', 'OT1', 'OT2', 'OT3'],
	nhl: ['P1', 'P2', 'P3', 'OT', 'OT', 'OT'],
	ncaamh: ['P1', 'P2', 'P3', 'OT', 'OT', 'OT'],
	mlb: ['Inn 1', 'Inn 2', 'Inn 3', 'Inn 4', 'Inn 5', 'Inn 6', 'Inn 7', 'Inn 8', 'Inn 9', 'Inn 10', 'Inn 11', 'Inn 12'],
	nfl: ['Q1', 'Q2', 'Q3', 'Q4', 'OT1', 'OT2', 'OT3'],
	ncaaf: ['Q1', 'Q2', 'Q3', 'Q4', 'OT1', 'OT2', 'OT3'],
	mls: ['1H', '2H', 'ET1', 'ET2', 'PENS'],
	ncaaw: ['Q1', 'Q2', 'Q3', 'Q4', 'OT1', 'OT2', 'OT3'],
	epl: ['1H', '2H', 'ET1', 'ET2', 'PENS'],
	fifawc: ['1H', '2H', 'ET1', 'ET2', 'PENS'],
	cbase: ['Inn 1', 'Inn 2', 'Inn 3', 'Inn 4', 'Inn 5', 'Inn 6', 'Inn 7', 'Inn 8', 'Inn 9', 'Inn 10', 'Inn 11', 'Inn 12'],
	csoft: ['Inn 1', 'Inn 2', 'Inn 3', 'Inn 4', 'Inn 5', 'Inn 6', 'Inn 7', 'Inn 8', 'Inn 9', 'Inn 10'],
	olybb: ['Inn 1', 'Inn 2', 'Inn 3', 'Inn 4', 'Inn 5', 'Inn 6', 'Inn 7', 'Inn 8', 'Inn 9', 'Inn 10', 'Inn 11', 'Inn 12'],
	wbbc: ['Inn 1', 'Inn 2', 'Inn 3', 'Inn 4', 'Inn 5', 'Inn 6', 'Inn 7', 'Inn 8', 'Inn 9', 'Inn 10', 'Inn 11', 'Inn 12'],
	ufl: ['Q1', 'Q2', 'Q3', 'Q4', 'OT1', 'OT2', 'OT3'],
	olymih: ['P1', 'P2', 'P3', 'OT', 'OT', 'OT'],
	olywih: ['P1', 'P2', 'P3', 'OT', 'OT', 'OT'],
	olybkm: ['Q1', 'Q2', 'Q3', 'Q4', 'OT1', 'OT2', 'OT3'],
	olybkw: ['Q1', 'Q2', 'Q3', 'Q4', 'OT1', 'OT2', 'OT3'],
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

// The period a league breaks at, or null for a sport with no half to be in the middle of. Hockey
// breaks twice and baseball never, and calling either of those intermissions "Halftime" is the
// mistake this pins.
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

// Without this, adding a league and forgetting to add it to either table above would leave both
// `test.each` runs iterating over the leagues that were already there and reporting all green.
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

	// The card prints the halftime word *instead of* the period label, so the two have to be
	// talking about the same moment. A league whose break landed on a period the label already
	// calls overtime would put "Halftime" on a card in the fifth quarter.
	test.each(leagueRows)('%s labels its break as a regulation period, never overtime', id => {
		const breakPeriod = halftimePeriod[id];
		if (breakPeriod === null) return;
		expect(periodLabels[id]![breakPeriod - 1]).not.toMatch(/^(OT|ET|PENS)/);
	});
});

describe('the edges the card can reach', () => {
	// ESPN can start sending a league id before we have a config for it, and the card still has to
	// print something a person can read.
	test('a league with no config falls back to a bare period number', () => {
		expect(formatPeriod({ league: 'not-a-league' as LeagueId, period: 2, sportType: 'basketball' })).toBe('P2');
		expect(isHalftime({ league: 'not-a-league' as LeagueId, period: 1, sportType: 'basketball' })).toBe(false);
	});

	/* The one behaviour the split changed. `period` went optional so the docs site could pass
	   `powerscore`'s narrower Game, and the old code would have printed the string "Qundefined"
	   here. It now reads as period 1.

	   Note what that costs: `isHalftime` was left reading `game.period` raw, so for a league whose
	   break is period 1 the two disagree — the label says the game is in the first half and the
	   predicate says it is not at the break, which for period 1 of a two-half league it would be.
	   Nothing reaches this today: `isHalftime`'s only two callers pass `@arenaswap/core`'s Game,
	   where `period` is required, and the site's only caller substitutes 1 while parsing ESPN. It
	   is pinned so that stops being quietly true if a call site ever loosens. */
	test('an absent period reads as period 1 for the label but not for the halftime check', () => {
		expect(formatPeriod({ league: 'nba', sportType: 'basketball' })).toBe('Q1');
		expect(formatPeriod({ league: 'epl', sportType: 'soccer' })).toBe('1H');
		expect(formatPeriod({ league: 'mlb', sportType: 'baseball' })).toBe('Inn 1');

		expect(isHalftime({ league: 'epl', sportType: 'soccer' })).toBe(false);
		expect(isHalftime({ league: 'epl', sportType: 'soccer', period: 1 })).toBe(true);
	});
});

// `gameCardShared` re-exports both, and `apps/extension` re-exports that in turn with `export *`.
// A default export or a renamed binding anywhere along that chain breaks the popup at runtime
// without breaking this package.
describe('the re-export chain still carries both helpers', () => {
	test('gameCardShared hands on the same functions the module defines', async () => {
		const shared = await import('../src/components/gameCardShared');
		expect(shared.formatPeriod).toBe(formatPeriod);
		expect(shared.isHalftime).toBe(isHalftime);
	});
});
