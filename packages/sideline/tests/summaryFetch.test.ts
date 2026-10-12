import {
	clearSharedRequests,
	fetchSharedLeagueStandings,
	fetchSummary,
	prefetchGameDetail,
	sharedRequestFreshMs,
	standingsUrl,
	summaryUrl,
} from '../src/summaryFetch';

const answering = (body: unknown = {}, ok = true) => (
	jest.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve({
		ok,
		status: ok ? 200 : 503,
		json: () => Promise.resolve(body),
	} as Response))
);

const requestedUrls = (fetchSpy: jest.SpyInstance) => fetchSpy.mock.calls.map(([url]) => url);

beforeEach(() => clearSharedRequests());

describe('the detail screen and a hover sharing one request', () => {
	it('hands the second caller the first one\'s answer', async () => {
		const fetchSpy = answering({ header: 'once' });
		const first = fetchSummary('football/nfl', '401', 'in');
		const second = fetchSummary('football/nfl', '401', 'in');
		await expect(second).resolves.toEqual({ header: 'once' });
		expect(second).toBe(first);
		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});

	it('asks again once the answer is too old to show', () => {
		const fetchSpy = answering();
		jest.useFakeTimers({ now: 1_000_000 });
		void fetchSummary('football/nfl', '401', 'in');
		jest.setSystemTime(1_000_000 + sharedRequestFreshMs);
		void fetchSummary('football/nfl', '401', 'in');
		expect(fetchSpy).toHaveBeenCalledTimes(2);
	});

	it('does not trust a stamp from a clock that has since moved backwards', () => {
		const fetchSpy = answering();
		jest.useFakeTimers({ now: 1_000_000 });
		void fetchSummary('football/nfl', '401', 'in');
		jest.setSystemTime(1_000_000 - 1);
		void fetchSummary('football/nfl', '401', 'in');
		expect(fetchSpy).toHaveBeenCalledTimes(2);
	});

	// Hovered a few seconds before tip-off, clicked a few seconds after: the pre-game answer has no
	// box score in it, so the live screen must not be handed it.
	it('asks again once the game has changed status, and keeps the new answer for whoever comes next', async () => {
		const fetchSpy = answering();
		void fetchSummary('football/nfl', '401', 'pre');
		const live = fetchSummary('football/nfl', '401', 'in');
		expect(fetchSpy).toHaveBeenCalledTimes(2);
		expect(fetchSummary('football/nfl', '401', 'in')).toBe(live);
		await live;
	});

	it('forgets a failed request, so the next caller retries rather than inheriting the failure', async () => {
		const failing = answering({}, false);
		await expect(fetchSummary('football/nfl', '401', 'in')).rejects.toThrow('HTTP 503');
		failing.mockRestore();
		const fetchSpy = answering({ header: 'second try' });
		await expect(fetchSummary('football/nfl', '401', 'in')).resolves.toEqual({ header: 'second try' });
		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});

	it('shares one league table across every game in that league', () => {
		const fetchSpy = answering();
		void fetchSharedLeagueStandings('football/nfl');
		void fetchSharedLeagueStandings('football/nfl');
		void fetchSharedLeagueStandings('basketball/nba');
		expect(requestedUrls(fetchSpy)).toEqual([standingsUrl('football/nfl'), standingsUrl('basketball/nba')]);
	});
});

describe('what a hovered card fetches ahead of the click', () => {
	it('fetches the summary and the league table the detail screen will ask for', () => {
		const fetchSpy = answering();
		prefetchGameDetail({ id: '401', league: 'nfl', status: 'in' });
		expect(requestedUrls(fetchSpy)).toEqual([summaryUrl('football/nfl', '401'), standingsUrl('football/nfl')]);
	});

	// College basketball reads its table off the summary, so there is no second request to warm.
	it('fetches only the summary for a league whose table rides along in it', () => {
		const fetchSpy = answering();
		prefetchGameDetail({ id: '401', league: 'ncaab', status: 'in' });
		expect(requestedUrls(fetchSpy)).toEqual([summaryUrl('basketball/mens-college-basketball', '401')]);
	});

	it('leaves demo games alone, since they never touch the network', () => {
		const fetchSpy = answering();
		prefetchGameDetail({ id: 'mock-5', league: 'nfl', status: 'in' });
		expect(fetchSpy).not.toHaveBeenCalled();
	});
});
