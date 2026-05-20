import {
	computeStallPenaltyPercent,
	formatClock,
	formatPeriod,
	formatStartDateTime,
	isInteractiveCardTarget,
	powerScoreColor,
} from '../entrypoints/popup/components/gameCardShared';
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

describe('formatStartDateTime', () => {
	test('returns a "Day • Time" string for a valid ISO timestamp', () => {
		const formatted = formatStartDateTime('2026-10-05T19:00:00.000Z');
		expect(formatted).toContain('•');
		const parts = formatted.split('•').map(s => s.trim());
		const day = parts[0]!;
		const time = parts[1]!;
		expect(day.length).toBeGreaterThan(0);
		expect(time.length).toBeGreaterThan(0);
	});
});

describe('powerScoreColor', () => {
	test('returns the gray endpoint when score is 0', () => {
		expect(powerScoreColor(0, 100)).toBe('rgb(139,148,158)');
	});

	test('returns the orange endpoint when score equals max', () => {
		expect(powerScoreColor(100, 100)).toBe('rgb(247,92,3)');
	});

	test('clamps to the orange endpoint when score exceeds max', () => {
		expect(powerScoreColor(200, 100)).toBe('rgb(247,92,3)');
	});

	test('returns an interpolated rgb color at the midpoint', () => {
		const color = powerScoreColor(50, 100);
		const match = color.match(/^rgb\((\d+),(\d+),(\d+)\)$/);
		expect(match).not.toBeNull();
		const [, r, g, b] = match!;
		expect(Number(r)).toBeGreaterThan(139);
		expect(Number(r)).toBeLessThan(247);
		expect(Number(g)).toBeLessThan(148);
		expect(Number(b)).toBeLessThan(158);
	});
});

describe('isInteractiveCardTarget', () => {
	// Most positive cases require a real DOM and live in component-level tests.
	// These cover the contract the function exposes to non-DOM targets, which is
	// what callers pass when an event originates from a non-element source.
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

describe('computeStallPenaltyPercent', () => {
	test('returns a positive integer percentage when rawTotal exceeds baseTotal', () => {
		const result = computeStallPenaltyPercent(100, 70);
		expect(Number.isInteger(result)).toBe(true);
		expect(result).toBeGreaterThan(0);
		expect(result).toBeLessThanOrEqual(100);
	});

	test('returns 0 when rawTotal is 0', () => {
		expect(computeStallPenaltyPercent(0, 0)).toBe(0);
	});

	test('returns 0 when rawTotal equals baseTotal (no penalty)', () => {
		expect(computeStallPenaltyPercent(50, 50)).toBe(0);
	});
});
