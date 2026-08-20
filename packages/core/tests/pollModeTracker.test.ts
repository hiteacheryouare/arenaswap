import { createPollModeTracker } from '../src/pollModeTracker';
import { pollDormantThresholdPolls } from '../src/constants';

describe('createPollModeTracker', () => {
	describe('initial state', () => {
		test('returns eager for an unpolled league', () => {
			const tracker = createPollModeTracker();
			expect(tracker.getMode('nba')).toBe('eager');
		});

		test('two fresh leagues are independently eager', () => {
			const tracker = createPollModeTracker();
			expect(tracker.getMode('nba')).toBe('eager');
			expect(tracker.getMode('nhl')).toBe('eager');
		});
	});

	describe('eager → dormant transition', () => {
		test('one empty poll leaves league eager', () => {
			const tracker = createPollModeTracker();
			tracker.recordPollResult('nba', false);
			expect(tracker.getMode('nba')).toBe('eager');
		});

		test('two consecutive empty polls transitions to dormant', () => {
			const tracker = createPollModeTracker();
			tracker.recordPollResult('nba', false);
			tracker.recordPollResult('nba', false);
			expect(tracker.getMode('nba')).toBe('dormant');
		});

		test('three consecutive empty polls stays dormant', () => {
			const tracker = createPollModeTracker();
			tracker.recordPollResult('nba', false);
			tracker.recordPollResult('nba', false);
			tracker.recordPollResult('nba', false);
			expect(tracker.getMode('nba')).toBe('dormant');
		});

		test('live poll then two empty polls transitions to dormant', () => {
			const tracker = createPollModeTracker();
			tracker.recordPollResult('nba', true);
			tracker.recordPollResult('nba', false);
			tracker.recordPollResult('nba', false);
			expect(tracker.getMode('nba')).toBe('dormant');
		});
	});

	describe('dormant → eager transition', () => {
		test('live game result while dormant switches back to eager', () => {
			const tracker = createPollModeTracker();
			tracker.recordPollResult('nba', false);
			tracker.recordPollResult('nba', false);
			expect(tracker.getMode('nba')).toBe('dormant');
			tracker.recordPollResult('nba', true);
			expect(tracker.getMode('nba')).toBe('eager');
		});

		test('after returning to eager, one more empty poll does not re-enter dormant', () => {
			const tracker = createPollModeTracker();
			tracker.recordPollResult('nba', false);
			tracker.recordPollResult('nba', false);
			tracker.recordPollResult('nba', true); // back to eager
			tracker.recordPollResult('nba', false); // only 1 empty — should stay eager
			expect(tracker.getMode('nba')).toBe('eager');
		});
	});

	describe('re-entry', () => {
		test('eager → dormant → eager → 2 more empties → dormant again', () => {
			const tracker = createPollModeTracker();
			tracker.recordPollResult('nba', false);
			tracker.recordPollResult('nba', false);
			expect(tracker.getMode('nba')).toBe('dormant');

			tracker.recordPollResult('nba', true);
			expect(tracker.getMode('nba')).toBe('eager');

			tracker.recordPollResult('nba', false);
			tracker.recordPollResult('nba', false);
			expect(tracker.getMode('nba')).toBe('dormant');
		});
	});

	describe('per-league isolation', () => {
		test('NBA going dormant does not affect NHL', () => {
			const tracker = createPollModeTracker();
			tracker.recordPollResult('nba', false);
			tracker.recordPollResult('nba', false);
			expect(tracker.getMode('nba')).toBe('dormant');
			expect(tracker.getMode('nhl')).toBe('eager');
		});

		test('NBA returning to eager does not affect dormant NHL', () => {
			const tracker = createPollModeTracker();
			tracker.recordPollResult('nhl', false);
			tracker.recordPollResult('nhl', false);
			tracker.recordPollResult('nba', false);
			tracker.recordPollResult('nba', false);

			tracker.recordPollResult('nba', true); // NBA wakes up
			expect(tracker.getMode('nba')).toBe('eager');
			expect(tracker.getMode('nhl')).toBe('dormant'); // NHL unaffected
		});

		test('alternating empty polls across leagues do not cross-contaminate counts', () => {
			const tracker = createPollModeTracker();
			tracker.recordPollResult('nba', false);
			tracker.recordPollResult('nhl', false);
			tracker.recordPollResult('nba', false);
			expect(tracker.getMode('nba')).toBe('dormant');
			expect(tracker.getMode('nhl')).toBe('eager');
		});
	});

	describe('error neutrality', () => {
		// background.ts skips recordPollResult entirely on error, which these tests simulate by
		// simply not calling it.

		test('one empty + error (skipped) + one more empty → dormant', () => {
			const tracker = createPollModeTracker();
			tracker.recordPollResult('nba', false); // count: 1
			tracker.recordPollResult('nba', false); // count: 2
			expect(tracker.getMode('nba')).toBe('dormant');
		});

		test('error without any prior calls leaves league eager', () => {
			const tracker = createPollModeTracker();
			expect(tracker.getMode('nba')).toBe('eager');
		});

		test('errors do not reset the empty count', () => {
			const tracker = createPollModeTracker();
			tracker.recordPollResult('nba', false); // count: 1
			tracker.recordPollResult('nba', false); // count: 2
			expect(tracker.getMode('nba')).toBe('dormant');
		});

		test('error after dormant does not wake the league', () => {
			const tracker = createPollModeTracker();
			tracker.recordPollResult('nba', false);
			tracker.recordPollResult('nba', false);
			expect(tracker.getMode('nba')).toBe('dormant');
			// error — recordPollResult not called
			expect(tracker.getMode('nba')).toBe('dormant');
		});
	});

	describe('reset behaviour', () => {
		test('reset(leagueId) on a dormant league returns it to eager', () => {
			const tracker = createPollModeTracker();
			tracker.recordPollResult('nba', false);
			tracker.recordPollResult('nba', false);
			tracker.reset('nba');
			expect(tracker.getMode('nba')).toBe('eager');
		});

		test('reset(leagueId) does not affect other leagues', () => {
			const tracker = createPollModeTracker();
			tracker.recordPollResult('nba', false);
			tracker.recordPollResult('nba', false);
			tracker.recordPollResult('nhl', false);
			tracker.recordPollResult('nhl', false);
			tracker.reset('nba');
			expect(tracker.getMode('nba')).toBe('eager');
			expect(tracker.getMode('nhl')).toBe('dormant');
		});

		test('reset() with no arg clears all leagues', () => {
			const tracker = createPollModeTracker();
			tracker.recordPollResult('nba', false);
			tracker.recordPollResult('nba', false);
			tracker.recordPollResult('nhl', false);
			tracker.recordPollResult('nhl', false);
			tracker.reset();
			expect(tracker.getMode('nba')).toBe('eager');
			expect(tracker.getMode('nhl')).toBe('eager');
		});

		test('reset on an unpolled league does not throw', () => {
			const tracker = createPollModeTracker();
			expect(() => tracker.reset('nba')).not.toThrow();
		});

		test('after reset, league needs 2 new empties to re-enter dormant', () => {
			const tracker = createPollModeTracker();
			tracker.recordPollResult('nba', false);
			tracker.recordPollResult('nba', false);
			tracker.reset('nba');
			tracker.recordPollResult('nba', false); // only 1 — still eager
			expect(tracker.getMode('nba')).toBe('eager');
			tracker.recordPollResult('nba', false); // 2 — dormant
			expect(tracker.getMode('nba')).toBe('dormant');
		});
	});

	describe('off-by-one checks', () => {
		test(`exactly pollDormantThresholdPolls (${pollDormantThresholdPolls}) empty polls → dormant`, () => {
			const tracker = createPollModeTracker();
			for (let i = 0; i < pollDormantThresholdPolls; i++) {
				tracker.recordPollResult('nba', false);
			}
			expect(tracker.getMode('nba')).toBe('dormant');
		});

		test(`pollDormantThresholdPolls - 1 (${pollDormantThresholdPolls - 1}) empty polls → eager`, () => {
			const tracker = createPollModeTracker();
			for (let i = 0; i < pollDormantThresholdPolls - 1; i++) {
				tracker.recordPollResult('nba', false);
			}
			expect(tracker.getMode('nba')).toBe('eager');
		});
	});

	describe('live game result on untracked league', () => {
		test('does not throw', () => {
			const tracker = createPollModeTracker();
			expect(() => tracker.recordPollResult('nba', true)).not.toThrow();
		});

		test('stays eager after a live result on a brand-new league', () => {
			const tracker = createPollModeTracker();
			tracker.recordPollResult('nba', true);
			expect(tracker.getMode('nba')).toBe('eager');
		});
	});
});
