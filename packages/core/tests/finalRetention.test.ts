/**
 * @jest-environment <rootDir>/tests/timeZoneEnvironment.ts
 */
import { estimatedWrapMs, finalRetentionMs, isWithinFinalRetention, sportWrapAllowanceMs } from '../src/constants';
import type { Game, SportType } from '../src/types';

declare const setTimeZone: (zone: string) => void;

const at = (iso: string): number => new Date(iso).getTime();

const finished = (sportType: SportType, startIso: string | undefined): Pick<Game, 'sportType' | 'startTime'> => ({
	sportType,
	startTime: startIso,
});

afterEach(() => {
	setTimeZone('UTC');
});

describe('estimating when a game wrapped', () => {
	test('a start plus the sport\'s own allowance, not a flat guess', () => {
		const start = '2026-09-06T16:10:00.000Z';
		const now = at('2026-09-06T20:00:00.000Z');
		expect(estimatedWrapMs(finished('baseball', start), now)).toBe(at(start) + sportWrapAllowanceMs.baseball);
		expect(estimatedWrapMs(finished('basketball', start), now)).toBe(at(start) + sportWrapAllowanceMs.basketball);
	});

	test('football is allowed the longest and basketball the shortest', () => {
		expect(sportWrapAllowanceMs.football).toBeGreaterThan(sportWrapAllowanceMs.baseball);
		expect(sportWrapAllowanceMs.baseball).toBeGreaterThan(sportWrapAllowanceMs.hockey);
		expect(sportWrapAllowanceMs.hockey).toBeGreaterThan(sportWrapAllowanceMs.basketball);
	});

	test('a game with no start time is treated as having just wrapped', () => {
		const now = at('2026-09-06T20:00:00.000Z');
		expect(estimatedWrapMs(finished('baseball', undefined), now)).toBe(now);
	});

	test('an unparseable start time falls back the same way rather than producing NaN', () => {
		const now = at('2026-09-06T20:00:00.000Z');
		expect(estimatedWrapMs(finished('baseball', 'not a date'), now)).toBe(now);
	});
});

describe('the 24 hour retention window', () => {
	// A 16:10Z first pitch plus baseball's 3h15m allowance wraps at 19:25Z, so the window closes
	// at 19:25Z the following day. Both edges are written out rather than recomputed.
	const start = '2026-09-06T16:10:00.000Z';
	const game = finished('baseball', start);

	test('a game that has just wrapped is kept', () => {
		expect(isWithinFinalRetention(game, at('2026-09-06T19:26:00.000Z'))).toBe(true);
	});

	test('a game still kept one minute before its window closes', () => {
		expect(isWithinFinalRetention(game, at('2026-09-07T19:24:00.000Z'))).toBe(true);
	});

	test('and dropped one minute after', () => {
		expect(isWithinFinalRetention(game, at('2026-09-07T19:26:00.000Z'))).toBe(false);
	});

	test('exactly 24 hours after the wrap is still inside the window', () => {
		expect(isWithinFinalRetention(game, at(start) + sportWrapAllowanceMs.baseball + finalRetentionMs)).toBe(true);
	});

	test('one millisecond past it is not', () => {
		expect(isWithinFinalRetention(game, at(start) + sportWrapAllowanceMs.baseball + finalRetentionMs + 1)).toBe(false);
	});

	test('a game that has not reached its estimated wrap yet is kept', () => {
		// ESPN can report a blowout final well before the allowance is up. A negative age must not
		// read as "older than a day".
		expect(isWithinFinalRetention(game, at('2026-09-06T17:00:00.000Z'))).toBe(true);
	});

	test('a game with no start time is kept, rather than dropped for a missing field', () => {
		expect(isWithinFinalRetention(finished('hockey', undefined), at('2026-09-06T20:00:00.000Z'))).toBe(true);
	});

	test('the window does not move with the viewer\'s time zone', () => {
		const closes = at(start) + sportWrapAllowanceMs.baseball + finalRetentionMs;
		setTimeZone('Asia/Tokyo');
		expect(isWithinFinalRetention(game, closes)).toBe(true);
		expect(isWithinFinalRetention(game, closes + 1)).toBe(false);
		setTimeZone('America/Los_Angeles');
		expect(isWithinFinalRetention(game, closes)).toBe(true);
		expect(isWithinFinalRetention(game, closes + 1)).toBe(false);
	});
});
