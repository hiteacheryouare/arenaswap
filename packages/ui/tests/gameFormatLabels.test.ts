import { formatClock, formatGameClock, formatPeriod, isHalftime } from '../src/components/gameFormat';
import { leagueConfigs } from '@arenaswap/core/constants';
import type { Game, LeagueId } from '@arenaswap/core/types';

const makeGame = (league: LeagueId, overrides: Partial<Game> = {}): Game => ({
	id: 'g1',
	league,
	sportType: 'basketball',
	status: 'in',
	period: 1,
	clockSeconds: 0,
	homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 0 },
	awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 0 },
	...overrides,
});

describe('formatPeriod', () => {
	test('labels quarters, halves, periods and innings by league format', () => {
		expect(formatPeriod(makeGame('nba', { period: 3 }))).toBe('Q3');
		expect(formatPeriod(makeGame('epl', { period: 1 }))).toBe('1H');
		expect(formatPeriod(makeGame('epl', { period: 2 }))).toBe('2H');
		expect(formatPeriod(makeGame('nhl', { period: 2 }))).toBe('P2');
		expect(formatPeriod(makeGame('mlb', { period: 7 }))).toBe('Inn 7');
	});

	test('numbers overtime past regulation, and leaves hockey OT unnumbered', () => {
		expect(formatPeriod(makeGame('nba', { period: 5 }))).toBe('OT1');
		expect(formatPeriod(makeGame('nba', { period: 6 }))).toBe('OT2');
		expect(formatPeriod(makeGame('nhl', { period: 4 }))).toBe('OT');
	});

	// ESPN encodes the shootout as period 5 — verified against the 2016 UCL and 2022 WC finals.
	describe('soccer extra time and penalties', () => {
		const soccer = (period: number) => formatPeriod(makeGame('ucl', { sportType: 'soccer', period }));

		test('labels the two extra-time halves ET1 and ET2, not OT1/OT2', () => {
			expect(soccer(3)).toBe('ET1');
			expect(soccer(4)).toBe('ET2');
		});

		test('labels a penalty shootout PENS rather than a third extra-time period', () => {
			expect(soccer(5)).toBe('PENS');
		});

		test('still reads PENS past period 5, since nothing but penalties follows extra time', () => {
			expect(soccer(6)).toBe('PENS');
		});

		test('leaves NCAA basketball halves on OT numbering — the rule is per sport, not per format', () => {
			expect(formatPeriod(makeGame('ncaab', { period: 3 }))).toBe('OT1');
			expect(formatPeriod(makeGame('ncaab', { period: 4 }))).toBe('OT2');
		});
	});

	test('keeps counting innings into extras', () => {
		expect(formatPeriod(makeGame('mlb', { period: 11 }))).toBe('Inn 11');
	});
});

describe('formatClock', () => {
	test('renders minutes and zero-padded seconds', () => {
		expect(formatClock(402)).toBe('6:42');
		expect(formatClock(65)).toBe('1:05');
		expect(formatClock(0)).toBe('0:00');
	});
});

describe('formatGameClock', () => {
	test('renders soccer as elapsed minutes', () => {
		expect(formatGameClock(makeGame('epl', { sportType: 'soccer', clockSeconds: 2_700 }))).toBe("45'");
	});

	test('renders clock sports as mm:ss', () => {
		expect(formatGameClock(makeGame('nba', { clockSeconds: 402 }))).toBe('6:42');
	});
});

// The soccer clock keeps counting through stoppage, so nothing here may assume 45 or 90.
describe('formatGameClock through stoppage time', () => {
	test('keeps counting a soccer clock past the end of the half', () => {
		expect(formatGameClock(makeGame('epl', { sportType: 'soccer', clockSeconds: 2_880 }))).toBe("48'");
		expect(formatGameClock(makeGame('epl', { sportType: 'soccer', clockSeconds: 5_700 }))).toBe("95'");
	});

	test('rounds a soccer clock down, so the 44th minute is not reported as the 45th', () => {
		expect(formatGameClock(makeGame('epl', { sportType: 'soccer', clockSeconds: 2_699 }))).toBe("44'");
	});
});

// Every league ArenaSwap tracks, rather than the handful anyone remembers to add a case for. A
// league added with a period format nobody wrote a branch for renders a label all the same — it is
// just the wrong one, on a card somebody is deciding whether to switch to.
describe('formatPeriod labels every league we ship', () => {
	test.each(leagueConfigs.map(config => [config.id, config] as const))('%s', (_id, config) => {
		const label = (period: number) => formatPeriod(makeGame(config.id, {
			sportType: config.sportType,
			period,
		}));
		for (let period = 1; period <= config.regularPeriods + 3; period++) {
			const rendered = label(period);
			expect(rendered).not.toBe('');
			expect(rendered).not.toMatch(/undefined|NaN|null/);
		}
	});

	test.each(leagueConfigs.filter(config => config.sportType === 'soccer').map(config => [config.id, config] as const))(
		'%s runs extra time into a shootout rather than into overtime',
		(_id, config) => {
			const label = (period: number) => formatPeriod(makeGame(config.id, { sportType: 'soccer', period }));
			expect(label(config.regularPeriods + 1)).toBe('ET1');
			expect(label(config.regularPeriods + 2)).toBe('ET2');
			expect(label(config.regularPeriods + 3)).toBe('PENS');
		},
	);

	test.each(leagueConfigs.filter(config => config.periodFormat === 'innings').map(config => [config.id, config] as const))(
		'%s keeps counting innings rather than calling extras overtime',
		(_id, config) => {
			expect(formatPeriod(makeGame(config.id, {
				sportType: config.sportType,
				period: config.regularPeriods + 2,
			}))).toBe(`Inn ${config.regularPeriods + 2}`);
		},
	);

	// An id ESPN starts sending that we have no config for still has to render something.
	test('falls back to a bare period for a league it has never seen', () => {
		expect(formatPeriod(makeGame('not-a-league' as LeagueId, { period: 2 }))).toBe('P2');
	});
});

// A predicate about the calendar of a game, not about its state: the caller ands it with
// `game.intermission`, because period 2 of 4 is the second quarter right up until the whistle.
describe('isHalftime', () => {
	test('finds the midpoint of a sport played in an even number of periods', () => {
		expect(isHalftime(makeGame('nba', { period: 2 }))).toBe(true);
		expect(isHalftime(makeGame('epl', { sportType: 'soccer', period: 1 }))).toBe(true);
		expect(isHalftime(makeGame('nfl', { sportType: 'football', period: 2 }))).toBe(true);
	});

	test('is false anywhere else in a game that has a half', () => {
		expect(isHalftime(makeGame('nba', { period: 1 }))).toBe(false);
		expect(isHalftime(makeGame('nba', { period: 3 }))).toBe(false);
		expect(isHalftime(makeGame('nba', { period: 5 }))).toBe(false);
	});

	// Hockey breaks twice and baseball never, so neither has a half to be at the middle of. Calling
	// the first intermission "Halftime" is the mistake this guards.
	test('never reports a half in a sport that has none', () => {
		for (const period of [1, 2, 3, 4, 5, 6, 7]) {
			expect(isHalftime(makeGame('nhl', { period }))).toBe(false);
			expect(isHalftime(makeGame('mlb', { sportType: 'baseball', period }))).toBe(false);
		}
	});

	test('reports no half for a league it has never seen', () => {
		expect(isHalftime(makeGame('not-a-league' as LeagueId, { period: 1 }))).toBe(false);
	});
});

