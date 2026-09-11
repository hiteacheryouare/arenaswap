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

/* Every instant below is written out rather than derived from the constants under test, so a
   threshold that moves has to be re-read rather than agreeing with itself. `now` is passed to both
   the recorder and the reader for the same reason: the default is Date.now(), and a test that leans
   on it is measuring the machine's clock. */
describe('createPollModeTracker hebetudinous mode', () => {
	const now = Date.UTC(2026, 8, 11, 12, 0, 0);
	const minutes = (n: number) => now + n * 60_000;
	const hours = (n: number) => now + n * 60 * 60_000;
	const days = (n: number) => now + n * 24 * 60 * 60_000;

	const quiet = (tracker: ReturnType<typeof createPollModeTracker>, nextStartMs?: number | null) => {
		tracker.recordPollResult('mlb', false, nextStartMs, now);
		tracker.recordPollResult('mlb', false, nextStartMs, now);
	};

	describe('choosing between the two quiet states', () => {
		test('a league nobody has asked about stays dormant rather than falling asleep', () => {
			const tracker = createPollModeTracker();
			quiet(tracker);
			expect(tracker.getMode('mlb', now)).toBe('dormant');
		});

		test('a lookahead that found nothing puts the league to sleep', () => {
			const tracker = createPollModeTracker();
			quiet(tracker);
			tracker.recordLookahead('mlb', null, now);
			expect(tracker.getMode('mlb', now)).toBe('hebetudinous');
		});

		test('a kickoff beyond the horizon puts the league to sleep', () => {
			const tracker = createPollModeTracker();
			quiet(tracker);
			tracker.recordLookahead('mlb', days(9), now);
			expect(tracker.getMode('mlb', now)).toBe('hebetudinous');
		});

		test('a kickoff inside the horizon keeps the league on the dormant beat', () => {
			const tracker = createPollModeTracker();
			quiet(tracker);
			tracker.recordLookahead('mlb', minutes(45), now);
			expect(tracker.getMode('mlb', now)).toBe('dormant');
		});

		/* The report this came back on: MLB went to sleep at midday with first pitch at seven. A
		   league with a game on today's card is having a day whatever hour the popup is opened in,
		   so the horizon is a full day and none of these three may sleep. */
		test('a game later today never lets the league sleep, at any distance inside the day', () => {
			for (const start of [minutes(45), hours(5), hours(19)]) {
				const tracker = createPollModeTracker();
				quiet(tracker);
				tracker.recordLookahead('mlb', start, now);
				expect(tracker.getMode('mlb', now)).toBe('dormant');
			}
		});

		test('exactly a day out is inside the horizon', () => {
			const tracker = createPollModeTracker();
			quiet(tracker);
			tracker.recordLookahead('mlb', days(1), now);
			expect(tracker.getMode('mlb', now)).toBe('dormant');
		});

		test('one millisecond past the horizon is not', () => {
			const tracker = createPollModeTracker();
			quiet(tracker);
			tracker.recordLookahead('mlb', days(1) + 1, now);
			expect(tracker.getMode('mlb', now)).toBe('hebetudinous');
		});

		test('a sleeping league wakes as its kickoff comes inside the horizon', () => {
			const tracker = createPollModeTracker();
			quiet(tracker);
			tracker.recordLookahead('mlb', days(3), now);
			expect(tracker.getMode('mlb', now)).toBe('hebetudinous');
			expect(tracker.getMode('mlb', days(2))).toBe('dormant');
		});

		// A game returning is the one thing that outranks everything else here.
		test('a live game beats a schedule saying there is nothing on', () => {
			const tracker = createPollModeTracker();
			quiet(tracker);
			tracker.recordLookahead('mlb', null, now);
			expect(tracker.getMode('mlb', now)).toBe('hebetudinous');
			tracker.recordPollResult('mlb', true, undefined, now);
			expect(tracker.getMode('mlb', now)).toBe('eager');
		});

		test('a league still polling live games is eager whatever its schedule says', () => {
			const tracker = createPollModeTracker();
			tracker.recordLookahead('mlb', null, now);
			expect(tracker.getMode('mlb', now)).toBe('eager');
		});
	});

	describe('when the lookahead is worth spending a request on', () => {
		test('never while a league is still eager', () => {
			const tracker = createPollModeTracker();
			tracker.recordPollResult('mlb', false, undefined, now);
			expect(tracker.needsLookahead('mlb', now)).toBe(false);
		});

		test('once it goes quiet with nothing known about it', () => {
			const tracker = createPollModeTracker();
			quiet(tracker);
			expect(tracker.needsLookahead('mlb', now)).toBe(true);
		});

		test('not again while its answer is still good', () => {
			const tracker = createPollModeTracker();
			quiet(tracker);
			tracker.recordLookahead('mlb', null, now);
			expect(tracker.needsLookahead('mlb', now)).toBe(false);
			expect(tracker.needsLookahead('mlb', hours(5))).toBe(false);
		});

		test('again once the answer has aged out', () => {
			const tracker = createPollModeTracker();
			quiet(tracker);
			tracker.recordLookahead('mlb', null, now);
			expect(tracker.needsLookahead('mlb', hours(6))).toBe(true);
		});

		// A kickoff that has come and gone says nothing about the next one, whatever its age.
		test('again once the kickoff it named has passed', () => {
			const tracker = createPollModeTracker();
			quiet(tracker);
			tracker.recordLookahead('mlb', minutes(30), now);
			expect(tracker.needsLookahead('mlb', minutes(29))).toBe(false);
			expect(tracker.needsLookahead('mlb', minutes(31))).toBe(true);
		});

		// The dateless scoreboard carries today's card, so a league with a game tonight answers the
		// question off its own poll and the lookahead is never spent.
		test('not at all when the poll itself found the kickoff', () => {
			const tracker = createPollModeTracker();
			quiet(tracker, hours(6));
			expect(tracker.needsLookahead('mlb', now)).toBe(false);
			// And a kickoff off the poll's own payload is today's, so it is inside the horizon by
			// definition: the request is skipped and the league stays dormant.
			expect(tracker.getMode('mlb', now)).toBe('dormant');
		});
	});

	describe('what a poll is allowed to say', () => {
		// An empty card is the case the lookahead exists for, so it must not be recorded as an answer.
		test('finding no kickoff does not overwrite what a lookahead established', () => {
			const tracker = createPollModeTracker();
			quiet(tracker);
			tracker.recordLookahead('mlb', hours(6), now);
			tracker.recordPollResult('mlb', false, null, now);
			expect(tracker.getNextStartMs('mlb', now)).toBe(hours(6));
			expect(tracker.needsLookahead('mlb', now)).toBe(false);
		});

		test('finding a nearer kickoff replaces one a lookahead established', () => {
			const tracker = createPollModeTracker();
			quiet(tracker);
			tracker.recordLookahead('mlb', days(9), now);
			expect(tracker.getMode('mlb', now)).toBe('hebetudinous');
			tracker.recordPollResult('mlb', false, minutes(20), now);
			expect(tracker.getMode('mlb', now)).toBe('dormant');
		});
	});

	describe('what the schedule reports', () => {
		test('nothing at all before anyone has asked', () => {
			const tracker = createPollModeTracker();
			expect(tracker.getNextStartMs('mlb', now)).toBeUndefined();
		});

		// Distinct from undefined on purpose: one is "asked, nothing on", the other "not asked".
		test('null once a lookahead has come back empty', () => {
			const tracker = createPollModeTracker();
			tracker.recordLookahead('mlb', null, now);
			expect(tracker.getNextStartMs('mlb', now)).toBeNull();
		});

		test('nothing at all once the answer has aged out', () => {
			const tracker = createPollModeTracker();
			tracker.recordLookahead('mlb', null, now);
			expect(tracker.getNextStartMs('mlb', hours(6))).toBeUndefined();
		});
	});

	describe('reset', () => {
		// A preference change is not news about when anybody plays next, and re-asking would cost a
		// request per enabled league.
		test('returns a sleeping league to eager without discarding its schedule', () => {
			const tracker = createPollModeTracker();
			quiet(tracker);
			tracker.recordLookahead('mlb', null, now);
			tracker.reset();
			expect(tracker.getMode('mlb', now)).toBe('eager');
			expect(tracker.needsLookahead('mlb', now)).toBe(false);
			expect(tracker.getNextStartMs('mlb', now)).toBeNull();
		});

		test('a league that goes quiet again picks its schedule back up', () => {
			const tracker = createPollModeTracker();
			quiet(tracker);
			tracker.recordLookahead('mlb', null, now);
			tracker.reset('mlb');
			quiet(tracker);
			expect(tracker.getMode('mlb', now)).toBe('hebetudinous');
		});
	});

	describe('per-league isolation', () => {
		test('one league asleep says nothing about another', () => {
			const tracker = createPollModeTracker();
			quiet(tracker);
			tracker.recordLookahead('mlb', null, now);
			tracker.recordPollResult('nba', false, undefined, now);
			tracker.recordPollResult('nba', false, undefined, now);
			expect(tracker.getMode('mlb', now)).toBe('hebetudinous');
			expect(tracker.getMode('nba', now)).toBe('dormant');
		});
	});
});
