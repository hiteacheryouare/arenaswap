/**
 * @jest-environment <rootDir>/tests/timeZoneEnvironment.ts
 */
import type { LeagueId } from '../src/types';

// Handed to the sandbox by the environment above, because assigning `process.env.TZ` from inside
// a test does not move the clock.
declare const setTimeZone: (zone: string) => void;

const loadApiClient = (): typeof import('../src/apiClient') => {
	jest.resetModules();
	return require('../src/apiClient') as typeof import('../src/apiClient');
};

// ESPN files its scoreboard by US Eastern date while the popup groups and labels by the viewer's
// own calendar day, so every window below is written out rather than recomputed from the same
// arithmetic it is testing. A recomputed expectation passes in every zone and proves none.
//
// ESPN stopped answering for a span, so the window is a list of days rather than a range string.
// What each zone below is proving is still the two edges, and the interior is contiguous by
// construction — so the edges are what these read, and contiguity is asserted once on its own. The
// literals are untouched from when this asked for a range.
const edges = (dayKeys: string[]): string => `${dayKeys[0]}-${dayKeys[dayKeys.length - 1]}`;

const windowIn = (timeZone: string, iso: string, days: number, pastDays = 0): string[] => {
	setTimeZone(timeZone);
	return loadApiClient().buildDayWindowKeys(days, new Date(iso), pastDays);
};

const rangeIn = (timeZone: string, iso: string, days: number): string => (
	edges(windowIn(timeZone, iso, days))
);

afterEach(() => {
	setTimeZone('UTC');
});

describe('the upcoming window against the viewer\'s own day', () => {
	test('an Eastern viewer is asked for exactly the days they set', () => {
		expect(rangeIn('America/New_York', '2026-09-05T18:00:00.000Z', 7)).toBe('20260905-20260912');
	});

	test('UTC reaches back to the Eastern evening its own midnight opens on', () => {
		expect(rangeIn('UTC', '2026-09-05T12:00:00.000Z', 7)).toBe('20260904-20260912');
	});

	test('Tokyo keeps the Eastern evening its morning belongs to', () => {
		// 09:00 on Sep 6 in Tokyo is a day that opened at 11:00 Eastern on Sep 5. The UTC window
		// opened at 20260906 and dropped that entire Eastern slate.
		expect(rangeIn('Asia/Tokyo', '2026-09-06T00:00:00.000Z', 7)).toBe('20260905-20260913');
	});

	test('Auckland keeps it as well', () => {
		expect(rangeIn('Pacific/Auckland', '2026-09-06T00:00:00.000Z', 7)).toBe('20260905-20260913');
	});

	test('a US Pacific evening does not roll the window forward into tomorrow', () => {
		// 20:00 on Sep 5 in Los Angeles is already Sep 6 in UTC, so the old window opened past the
		// whole night's slate. Three hours behind Eastern was enough to hit this; twelve hours ahead
		// was never the only way.
		expect(rangeIn('America/Los_Angeles', '2026-09-06T03:00:00.000Z', 7)).toBe('20260905-20260913');
	});

	test('a one day window still covers both Eastern dates it straddles', () => {
		expect(rangeIn('Asia/Tokyo', '2026-09-06T00:00:00.000Z', 1)).toBe('20260905-20260907');
	});

	test('a window landing on exact local midnight does not claim the next Eastern date', () => {
		// Seven days on from midnight Eastern is midnight again, which is the first instant of
		// Sep 13 rather than the last of Sep 12. Ending on the day's final millisecond is what stops
		// the window taking a date nothing on screen would come from.
		expect(rangeIn('America/New_York', '2026-09-05T04:00:00.000Z', 7)).toBe('20260905-20260912');
	});

	test('the Eastern boundary follows daylight saving rather than a fixed offset', () => {
		// Puerto Rico is UTC-4 the year round, so its midnight is 04:00Z in both seasons: midnight
		// Eastern in July, and 23:00 the previous evening in January.
		expect(rangeIn('America/Puerto_Rico', '2026-07-15T12:00:00.000Z', 7)).toBe('20260715-20260722');
		expect(rangeIn('America/Puerto_Rico', '2026-01-15T12:00:00.000Z', 7)).toBe('20260114-20260122');
	});

	test('a window crossing a month end rolls the calendar rather than the day number', () => {
		expect(rangeIn('Asia/Tokyo', '2026-09-29T00:00:00.000Z', 7)).toBe('20260928-20261006');
	});
});

/* The edges above are read off a list now, so something has to prove the list between them is every
   day and each one exactly once. Written out rather than generated, for the same reason the edges
   are: a generated expectation would agree with a generator that skipped a day. */
describe('the days between the two edges', () => {
	test('every Eastern date in the window, once, in order', () => {
		expect(windowIn('America/New_York', '2026-09-05T18:00:00.000Z', 7)).toEqual([
			'20260905', '20260906', '20260907', '20260908',
			'20260909', '20260910', '20260911', '20260912',
		]);
	});

	test('a month end is counted rather than subtracted from', () => {
		expect(windowIn('America/New_York', '2026-09-29T14:00:00.000Z', 3, 1)).toEqual([
			'20260928', '20260929', '20260930', '20261001', '20261002',
		]);
	});

	test('a leap day is a day', () => {
		expect(windowIn('America/New_York', '2028-02-28T14:00:00.000Z', 2, 0)).toEqual([
			'20280228', '20280229', '20280301',
		]);
	});

	test('a single day window is one key, not two', () => {
		expect(windowIn('America/New_York', '2026-09-05T18:00:00.000Z', 0, 0)).toEqual(['20260905']);
	});
});

describe('the scoreboard request in the viewer\'s own time zone', () => {
	test('a Tokyo viewer is offered the Eastern slate their own day opened on', async () => {
		setTimeZone('Asia/Tokyo');
		jest.useFakeTimers().setSystemTime(new Date('2026-09-06T00:00:00.000Z'));
		const fetchMock = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			headers: new Headers(),
			json: async () => ({ events: [] }),
		} as Response);
		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;

		await loadApiClient().fetchGamesWithLeagueLogos(['nba'] as LeagueId[]);

		// One window now rather than a live leg and a slate leg, and its edges are their union: the
		// live leg reached back a day for a kickoff filed under yesterday, the slate leg ran to the
		// seventh day ahead, and one list covers both without asking for either twice.
		const asked = fetchMock.mock.calls
			.map(([url]) => new URL(String(url)).searchParams.get('dates'))
			.filter((dates): dates is string => dates !== null);
		expect(new Set(asked).size).toBe(asked.length);
		expect(edges(asked.toSorted())).toBe('20260904-20260913');
	});
});

describe('reaching back for games that have already finished', () => {
	const rangeBack = (timeZone: string, iso: string, days: number, pastDays: number): string => (
		edges(windowIn(timeZone, iso, days, pastDays))
	);

	test('no past days is the window every existing caller already gets', () => {
		expect(rangeBack('America/New_York', '2026-09-05T18:00:00.000Z', 7, 0))
			.toBe(rangeIn('America/New_York', '2026-09-05T18:00:00.000Z', 7));
	});

	test('one past day opens the window a day earlier and leaves the close alone', () => {
		expect(rangeBack('America/New_York', '2026-09-05T18:00:00.000Z', 7, 1)).toBe('20260904-20260912');
	});

	test('a Tokyo viewer reaches back from their own yesterday, not Eastern\'s', () => {
		// 09:00 Sep 6 in Tokyo opened at 11:00 Eastern on Sep 5, so their yesterday opened Sep 4.
		expect(rangeBack('Asia/Tokyo', '2026-09-06T00:00:00.000Z', 7, 1)).toBe('20260904-20260913');
	});

	test('crossing the start of a month counts days rather than subtracting from the number', () => {
		expect(rangeBack('America/New_York', '2026-10-01T14:00:00.000Z', 3, 1)).toBe('20260930-20261004');
	});

	test('crossing the start of a year', () => {
		expect(rangeBack('America/New_York', '2027-01-01T14:00:00.000Z', 1, 1)).toBe('20261231-20270102');
	});
});
