import { historyWindowMs, sportTypeConfigMap, sportWrapAllowanceMs } from '@arenaswap/core/constants';
import type { Game, SportType } from '@arenaswap/core/types';
import { chartHistory, coversWholeGame } from '../entrypoints/popup/components/wrapCoverage';

const startIso = '2026-09-06T16:10:00.000Z';
const startMs = new Date(startIso).getTime();
const now = startMs + (8 * 60 * 60 * 1000);

const game = (sportType: SportType = 'baseball'): Pick<Game, 'sportType' | 'startTime'> => ({
	sportType,
	startTime: startIso,
});

// Not an optional argument on `game` above: passing an explicit `undefined` to a parameter with a
// default gets the default, so that spelling would silently test the opposite of what it says.
const gameStarting = (start: string | undefined): Pick<Game, 'sportType' | 'startTime'> => ({
	sportType: 'baseball',
	startTime: start,
});

// Snapshots at fractions of the sport's estimated length, which is what the rule is expressed in.
const at = (fraction: number, sportType: SportType = 'baseball') => ({
	timestamp: startMs + (sportWrapAllowanceMs[sportType] * fraction),
});

describe('deciding whether a wrap has charts worth drawing', () => {
	test('a history running the length of the game does', () => {
		expect(coversWholeGame([at(0), at(0.5), at(0.98)], game())).toBe(true);
	});

	test('a history that starts three hours in does not', () => {
		// The case this rule exists for: the service worker woke up late, so the line would open
		// most of the way through a game it claims to describe.
		expect(coversWholeGame([at(0.8), at(0.9), at(1)], game())).toBe(false);
	});

	test('a history that stops at half time does not', () => {
		expect(coversWholeGame([at(0), at(0.2), at(0.5)], game())).toBe(false);
	});

	test('a first snapshot inside the tolerance still counts as from the start', () => {
		expect(coversWholeGame([at(0.09), at(0.95)], game())).toBe(true);
	});

	test('and one just outside it does not', () => {
		expect(coversWholeGame([at(0.11), at(0.95)], game())).toBe(false);
	});

	test('the last snapshot has to reach 90 percent of the way in', () => {
		expect(coversWholeGame([at(0), at(0.9)], game())).toBe(true);
		expect(coversWholeGame([at(0), at(0.89)], game())).toBe(false);
	});

	test('a single snapshot is never a line', () => {
		expect(coversWholeGame([at(0)], game())).toBe(false);
	});

	test('an empty history is not either', () => {
		expect(coversWholeGame([], game())).toBe(false);
	});

	test('the fractions scale with the sport, so football is judged over a longer game', () => {
		// The same wall-clock span covers a basketball game and falls short of a football one.
		const span = [{ timestamp: startMs }, { timestamp: startMs + (2.3 * 60 * 60 * 1000) }];
		expect(coversWholeGame(span, game('basketball'))).toBe(true);
		expect(coversWholeGame(span, game('football'))).toBe(false);
	});

	test('a game with no start time has no span to measure, so its charts are dropped', () => {
		expect(coversWholeGame([at(0), at(0.98)], gameStarting(undefined))).toBe(false);
	});

	test('an unparseable start time is treated the same way rather than throwing', () => {
		expect(coversWholeGame([at(0), at(0.98)], gameStarting('not a date'))).toBe(false);
	});

	test('a history reaching past the estimated wrap still counts — the estimate runs long', () => {
		expect(coversWholeGame([at(0), at(1.4)], game())).toBe(true);
	});

	test('the answer does not depend on when it is asked', () => {
		const history = [at(0), at(0.95)];
		expect(coversWholeGame(history, game(), now)).toBe(true);
		expect(coversWholeGame(history, game(), now + (30 * 24 * 60 * 60 * 1000))).toBe(true);
	});
});

// Every case above builds a history spanning hours, which is the right shape for a unit test of the
// predicate and says nothing about whether the background can produce one. That is asserted end to
// end in background.test.ts, by walking a whole game through the real polling and handing what
// survives to coversWholeGame — under the rolling window it once used, none of these inputs was
// reachable and the charts could never have drawn.
describe('which slice of history a chart draws', () => {
	const whole = [at(0), at(0.5), at(0.99)];
	const endOfGame = startMs + (sportWrapAllowanceMs.baseball * 0.99);

	test('a finished game gets the whole retained series', () => {
		expect(chartHistory(whole, { sportType: 'baseball', status: 'post' }, endOfGame)).toEqual(whole);
	});

	test('a live game gets the scorer window it has always drawn', () => {
		const drawn = chartHistory(whole, { sportType: 'baseball', status: 'in' }, endOfGame);
		expect(drawn).toEqual([at(0.99)]);
	});

	test('a pre-game screen is windowed too, rather than falling through to the whole series', () => {
		expect(chartHistory(whole, { sportType: 'baseball', status: 'pre' }, endOfGame)).toEqual([at(0.99)]);
	});

	// Each sport has its own window, so the slice is not one length applied to all of them.
	test('the window is the sport\'s own', () => {
		const minutesAgo = (minutes: number) => ({ timestamp: endOfGame - (minutes * 60 * 1000) });
		const history = [minutesAgo(18), minutesAgo(10), minutesAgo(2)];
		expect(sportTypeConfigMap.basketball.historyWindowMs).toBe(5 * 60 * 1000);
		expect(sportTypeConfigMap.soccer.historyWindowMs).toBe(20 * 60 * 1000);
		expect(chartHistory(history, { sportType: 'basketball', status: 'in' }, endOfGame)).toEqual([minutesAgo(2)]);
		expect(chartHistory(history, { sportType: 'soccer', status: 'in' }, endOfGame)).toEqual(history);
	});

	// Otherwise a live chart would empty out during a long gap in polling, which reads as the game
	// having stopped rather than as the worker having been asleep.
	test('keeps the newest snapshot even when the whole series predates the window', () => {
		const stale = [{ timestamp: endOfGame - (60 * 60 * 1000) }];
		expect(chartHistory(stale, { sportType: 'basketball', status: 'in' }, endOfGame)).toEqual(stale);
	});

	test('an empty history stays empty rather than becoming a one-point line', () => {
		expect(chartHistory([], { sportType: 'basketball', status: 'in' }, endOfGame)).toEqual([]);
		expect(chartHistory([], { sportType: 'basketball', status: 'post' }, endOfGame)).toEqual([]);
	});

	// An unrecognised sport has no window of its own, and dropping to the whole series would make a
	// live chart quietly wider than every other sport's.
	test('an unknown sport falls back to the global window', () => {
		const outside = [{ timestamp: endOfGame - historyWindowMs - 1 }, { timestamp: endOfGame }];
		expect(chartHistory(outside, { sportType: 'quidditch' as SportType, status: 'in' }, endOfGame))
			.toEqual([{ timestamp: endOfGame }]);
	});
});
