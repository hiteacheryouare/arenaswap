import { formatClock, formatPeriod } from '@arenaswap/ui/src/components/gameFormat';
import { isInteractiveCardTarget } from '@arenaswap/ui/src/components/gameOpener';
import type { Game } from '@arenaswap/core/types';

const makeGame = (overrides: Partial<Game> & { league: Game['league']; sportType: Game['sportType']; period: number }): Game => ({
	id: 'g1',
	homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 0 },
	awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 0 },
	clockSeconds: 600,
	status: 'in',
	...overrides,
});

describe('formatPeriod', () => {
	test('formats NBA periods as Q1..Q4', () => {
		expect(formatPeriod(makeGame({ league: 'nba', sportType: 'basketball', period: 1 }))).toBe('Q1');
		expect(formatPeriod(makeGame({ league: 'nba', sportType: 'basketball', period: 4 }))).toBe('Q4');
	});

	test('formats NBA OT as OT1, OT2 because its periodFormat is "quarters"', () => {
		expect(formatPeriod(makeGame({ league: 'nba', sportType: 'basketball', period: 5 }))).toBe('OT1');
		expect(formatPeriod(makeGame({ league: 'nba', sportType: 'basketball', period: 6 }))).toBe('OT2');
	});

	test('formats every NHL overtime as bare OT because its periodFormat is "periods"', () => {
		expect(formatPeriod(makeGame({ league: 'nhl', sportType: 'hockey', period: 4 }))).toBe('OT');
		expect(formatPeriod(makeGame({ league: 'nhl', sportType: 'hockey', period: 5 }))).toBe('OT');
	});

	test('formats soccer halves as 1H and 2H', () => {
		expect(formatPeriod(makeGame({ league: 'mls', sportType: 'soccer', period: 1 }))).toBe('1H');
		expect(formatPeriod(makeGame({ league: 'mls', sportType: 'soccer', period: 2 }))).toBe('2H');
	});

	test('formats soccer extra time as ET1/ET2 and a shootout as PENS', () => {
		expect(formatPeriod(makeGame({ league: 'mls', sportType: 'soccer', period: 3 }))).toBe('ET1');
		expect(formatPeriod(makeGame({ league: 'mls', sportType: 'soccer', period: 4 }))).toBe('ET2');
		expect(formatPeriod(makeGame({ league: 'mls', sportType: 'soccer', period: 5 }))).toBe('PENS');
	});

	test('formats MLB innings as "Inn N"', () => {
		expect(formatPeriod(makeGame({ league: 'mlb', sportType: 'baseball', period: 7 }))).toBe('Inn 7');
	});

	test('formats MLB extra innings as "Inn N" (not OT)', () => {
		expect(formatPeriod(makeGame({ league: 'mlb', sportType: 'baseball', period: 10 }))).toBe('Inn 10');
		expect(formatPeriod(makeGame({ league: 'mlb', sportType: 'baseball', period: 11 }))).toBe('Inn 11');
	});

	test('formats NFL overtime as OT1', () => {
		expect(formatPeriod(makeGame({ league: 'nfl', sportType: 'football', period: 5 }))).toBe('OT1');
	});
});

describe('formatClock', () => {
	test('formats 600 seconds as 10:00', () => {
		expect(formatClock(600)).toBe('10:00');
	});

	test('formats 5 seconds as 0:05 (zero-padded)', () => {
		expect(formatClock(5)).toBe('0:05');
	});

	test('formats 0 seconds as 0:00', () => {
		expect(formatClock(0)).toBe('0:00');
	});

	test('formats 75 seconds as 1:15', () => {
		expect(formatClock(75)).toBe('1:15');
	});
});

describe('isInteractiveCardTarget', () => {
	// Positive cases need a real DOM and live in the component tests.
	test('returns false for null', () => {
		expect(isInteractiveCardTarget(null)).toBe(false);
	});

	test('returns false for a plain object that is not an HTMLElement', () => {
		expect(isInteractiveCardTarget({} as unknown as EventTarget)).toBe(false);
	});

	test('returns false for a primitive-like target', () => {
		expect(isInteractiveCardTarget('button' as unknown as EventTarget)).toBe(false);
	});
});

