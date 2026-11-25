import { gridironTimeoutAllotment, timeoutAllotment } from '../src/components/timeoutDots';
import type { Game, LeagueId } from '@arenaswap/core/types';

const makeGame = (league: LeagueId, overrides: Partial<Game> = {}): Game => ({
	id: 'g1',
	league,
	sportType: 'football',
	status: 'in',
	period: 1,
	clockSeconds: 0,
	homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 0 },
	awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 0 },
	...overrides,
});

describe('gridiron timeout allotment', () => {
	test('three a half in regulation, everywhere', () => {
		for (const league of ['nfl', 'ncaaf', 'ufl'] as LeagueId[]) {
			expect(gridironTimeoutAllotment(makeGame(league, { period: 4 }))).toBe(3);
		}
	});

	test('two in NFL regular-season overtime, three in a playoff overtime', () => {
		expect(gridironTimeoutAllotment(makeGame('nfl', { period: 5 }))).toBe(2);
		expect(gridironTimeoutAllotment(makeGame('nfl', { period: 5, isPostseason: true }))).toBe(3);
	});

	test('one per college overtime period', () => {
		expect(gridironTimeoutAllotment(makeGame('ncaaf', { period: 6 }))).toBe(1);
	});
});

describe('timeout allotment by sport', () => {
	test('a basketball game carries its league\'s full set: seven in the NBA, five in the WNBA, four in college', () => {
		expect(timeoutAllotment(makeGame('nba', { sportType: 'basketball' }))).toBe(7);
		expect(timeoutAllotment(makeGame('wnba', { sportType: 'basketball' }))).toBe(5);
		expect(timeoutAllotment(makeGame('ncaab', { sportType: 'basketball' }))).toBe(4);
	});

	test('football keeps its overtime allotment and the sports without dots get none', () => {
		expect(timeoutAllotment(makeGame('nfl', { period: 5 }))).toBe(2);
		expect(timeoutAllotment(makeGame('nhl', { sportType: 'hockey' }))).toBeUndefined();
	});
});
