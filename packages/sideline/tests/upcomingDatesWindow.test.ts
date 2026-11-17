/**
 * @jest-environment <rootDir>/tests/timeZoneEnvironment.ts
 */
import type { LeagueId } from '@arenaswap/core';

// Handed to the sandbox by the environment above, because assigning `process.env.TZ` from inside
// a test does not move the clock.
declare const setTimeZone: (zone: string) => void;

const loadApiClient = (): typeof import('../src/apiClient') => {
	jest.resetModules();
	return require('../src/apiClient') as typeof import('../src/apiClient');
};

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
		expect(rangeIn('Asia/Tokyo', '2026-09-06T00:00:00.000Z', 7)).toBe('20260905-20260913');
	});

	test('Auckland keeps it as well', () => {
		expect(rangeIn('Pacific/Auckland', '2026-09-06T00:00:00.000Z', 7)).toBe('20260905-20260913');
	});

	test('a US Pacific evening does not roll the window forward into tomorrow', () => {
		expect(rangeIn('America/Los_Angeles', '2026-09-06T03:00:00.000Z', 7)).toBe('20260905-20260913');
	});

	test('a one day window still covers both Eastern dates it straddles', () => {
		expect(rangeIn('Asia/Tokyo', '2026-09-06T00:00:00.000Z', 1)).toBe('20260905-20260907');
	});

	test('a window landing on exact local midnight does not claim the next Eastern date', () => {
		expect(rangeIn('America/New_York', '2026-09-05T04:00:00.000Z', 7)).toBe('20260905-20260912');
	});

	test('the Eastern boundary follows daylight saving rather than a fixed offset', () => {
		expect(rangeIn('America/Puerto_Rico', '2026-07-15T12:00:00.000Z', 7)).toBe('20260715-20260722');
		expect(rangeIn('America/Puerto_Rico', '2026-01-15T12:00:00.000Z', 7)).toBe('20260114-20260122');
	});

	test('a window crossing a month end rolls the calendar rather than the day number', () => {
		expect(rangeIn('Asia/Tokyo', '2026-09-29T00:00:00.000Z', 7)).toBe('20260928-20261006');
	});
});

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
		expect(rangeBack('Asia/Tokyo', '2026-09-06T00:00:00.000Z', 7, 1)).toBe('20260904-20260913');
	});

	test('crossing the start of a month counts days rather than subtracting from the number', () => {
		expect(rangeBack('America/New_York', '2026-10-01T14:00:00.000Z', 3, 1)).toBe('20260930-20261004');
	});

	test('crossing the start of a year', () => {
		expect(rangeBack('America/New_York', '2027-01-01T14:00:00.000Z', 1, 1)).toBe('20261231-20270102');
	});
});

describe('a local day that is not twenty-four hours long', () => {
	const keysIn = (timeZone: string, iso: string, days: number, pastDays = 0): string[] => (
		windowIn(timeZone, iso, days, pastDays)
	);

	test('an ordinary day asks for today and tomorrow, whatever the hour', () => {
		expect(keysIn('America/New_York', '2026-09-05T04:30:00.000Z', 1)).toEqual(['20260905', '20260906']);
		expect(keysIn('America/New_York', '2026-09-06T03:30:00.000Z', 1)).toEqual(['20260905', '20260906']);
	});

	test('the morning the clocks go back, a one-day window is a day short', () => {
		expect(keysIn('America/New_York', '2026-11-01T04:30:00.000Z', 1)).toEqual(['20261101']);
	});

	test('and the default seven-day window loses its last day the same morning', () => {
		expect(keysIn('America/New_York', '2026-11-01T04:30:00.000Z', 7)).toHaveLength(7);
		expect(keysIn('America/New_York', '2026-11-08T05:30:00.000Z', 7)).toHaveLength(8);
	});

	test('later the same day the extra hour is behind us and the window is its usual width', () => {
		expect(keysIn('America/New_York', '2026-11-01T17:00:00.000Z', 1)).toEqual(['20261101', '20261102']);
	});

	test('the evening before the clocks go forward, a one-day window reaches a day further', () => {
		expect(keysIn('America/New_York', '2026-03-08T04:30:00.000Z', 1)).toEqual(['20260307', '20260308', '20260309']);
	});

	test('a southern hemisphere transition moves the viewer while Eastern stands still', () => {
		expect(keysIn('Australia/Sydney', '2026-10-03T13:30:00.000Z', 1)).toEqual(
			['20261002', '20261003', '20261004', '20261005'],
		);
	});

	test('a zone whose transition deletes local midnight still produces a window', () => {
		expect(keysIn('America/Santiago', '2026-09-06T06:30:00.000Z', 1, 1)).toEqual(
			['20260905', '20260906', '20260907'],
		);
	});

	test('a half-hour transition is no different from a whole-hour one', () => {
		expect(keysIn('Australia/Lord_Howe', '2026-10-03T13:30:00.000Z', 1)).toEqual(
			['20261003', '20261004', '20261005'],
		);
	});
});

describe('today is always one of the days asked for', () => {
	const zones = [
		'UTC', 'America/New_York', 'America/Los_Angeles', 'America/Santiago',
		'Asia/Tokyo', 'Asia/Kolkata', 'Pacific/Auckland', 'Pacific/Chatham',
		'Pacific/Kiritimati', 'Pacific/Niue', 'Australia/Sydney', 'Australia/Lord_Howe',
	];
	const instants = [
		'2026-11-01T04:30:00.000Z',
		'2026-11-01T05:30:00.000Z',
		'2026-03-08T06:30:00.000Z',
		'2026-10-03T13:30:00.000Z',
		'2026-09-06T06:30:00.000Z',
		'2026-06-21T00:00:00.000Z',
		'2026-12-31T23:59:00.000Z',
		'2028-02-29T12:00:00.000Z',
	];

	test.each(zones)('%s never builds a window that has lost today', timeZone => {
		for (const iso of instants) {
			setTimeZone(timeZone);
			const api = loadApiClient();
			const now = new Date(iso);
			const todayKey = api.buildDayWindowKeys(0, now, 0)[0];

			for (const [days, pastDays] of [[0, 1], [7, 1], [14, 2]] as const) {
				const keys = api.buildDayWindowKeys(days, now, pastDays);
				expect({ timeZone, iso, days, keys }).toMatchObject({ keys: expect.arrayContaining([todayKey]) });
			}
		}
	});

	test('the live poll window is immune to a transition, because it adds no hours at all', () => {
		setTimeZone('America/New_York');
		expect(loadApiClient().buildCurrentDayKeys(new Date('2026-11-01T04:30:00.000Z')))
			.toEqual(['20261031', '20261101']);
		expect(loadApiClient().buildCurrentDayKeys(new Date('2026-03-08T06:30:00.000Z')))
			.toEqual(['20260307', '20260308']);
	});
});
