import { formatClock, formatGameClock, formatPeriod, powerScoreColor } from '../src/components/gameCardShared';
import { scoreMaxTotal } from '@arenaswap/core/constants';
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

// Period labelling is sport-specific and shared by both apps, so a regression here is visible
// on every card in the product.
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
	// Soccer clocks read as elapsed minutes, not a counting-down mm:ss.
	test('renders soccer as elapsed minutes', () => {
		expect(formatGameClock(makeGame('epl', { sportType: 'soccer', clockSeconds: 2_700 }))).toBe("45'");
	});

	test('renders clock sports as mm:ss', () => {
		expect(formatGameClock(makeGame('nba', { clockSeconds: 402 }))).toBe('6:42');
	});
});

describe('powerScoreColor', () => {
	test('runs from muted slate at zero to brand orange at the ceiling', () => {
		expect(powerScoreColor(0, scoreMaxTotal)).toBe('rgb(139,148,158)');
		expect(powerScoreColor(scoreMaxTotal, scoreMaxTotal)).toBe('rgb(247,92,3)');
	});

	// A manual game boost can push a total past 100; the gradient has to hold at the top rather
	// than overshooting into an out-of-range colour.
	test('clamps above the ceiling', () => {
		expect(powerScoreColor(140, scoreMaxTotal)).toBe('rgb(247,92,3)');
	});

	test('always produces a parseable rgb triple', () => {
		for (const score of [0, 17, 42, 73, 99, 100]) {
			expect(powerScoreColor(score, scoreMaxTotal)).toMatch(/^rgb\((\d{1,3}),(\d{1,3}),(\d{1,3})\)$/);
		}
	});
});
