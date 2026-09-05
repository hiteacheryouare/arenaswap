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
// own calendar day, so every range below is written out rather than recomputed from the same
// arithmetic it is testing. A recomputed expectation passes in every zone and proves none.
const rangeIn = (timeZone: string, iso: string, days: number): string => {
	setTimeZone(timeZone);
	return loadApiClient().buildUpcomingDatesRangeQuery(days, new Date(iso));
};

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
		// the range taking a date nothing on screen would come from.
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

describe('the scoreboard request in the viewer\'s own time zone', () => {
	test('a Tokyo viewer is offered the Eastern slate their own day opened on', async () => {
		setTimeZone('Asia/Tokyo');
		jest.useFakeTimers().setSystemTime(new Date('2026-09-06T00:00:00.000Z'));
		const fetchMock = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => ({ events: [] }),
		} as Response);
		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;

		const leagues: LeagueId[] = ['nba'];
		await loadApiClient().fetchGamesWithLeagueLogos(leagues);

		const datesUrl = fetchMock.mock.calls.map(([url]) => String(url)).find(u => u.includes('dates='));
		expect(datesUrl).toBeDefined();
		expect(new URL(datesUrl!).searchParams.get('dates')).toBe('20260905-20260913');
	});
});
