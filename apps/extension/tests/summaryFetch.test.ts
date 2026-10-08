import {
	clearSharedRequests,
	fetchLeagueStandings,
	fetchSummary,
	hoverPrefetchWaitMs,
	prefetchGameDetail,
	prefetchOnIntent,
	sharedRequestFreshMs,
	standingsUrl,
	summaryUrl,
} from '../entrypoints/popup/components/summaryFetch';

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
		void fetchLeagueStandings('football/nfl');
		void fetchLeagueStandings('football/nfl');
		void fetchLeagueStandings('basketball/nba');
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

describe('when a pointer counts as interest in a card', () => {
	const nfl = { id: '401', league: 'nfl' as const, status: 'in' as const };

	it('fetches once the pointer has stayed on the card', () => {
		const fetchSpy = answering();
		jest.useFakeTimers();
		prefetchOnIntent(nfl).onPointerEnter();
		jest.advanceTimersByTime(hoverPrefetchWaitMs - 1);
		expect(fetchSpy).not.toHaveBeenCalled();
		jest.advanceTimersByTime(1);
		expect(requestedUrls(fetchSpy)[0]).toBe(summaryUrl('football/nfl', '401'));
	});

	it('ignores a card the pointer only swept across', () => {
		const fetchSpy = answering();
		jest.useFakeTimers();
		const handlers = prefetchOnIntent(nfl);
		handlers.onPointerEnter();
		handlers.onPointerLeave();
		jest.advanceTimersByTime(hoverPrefetchWaitMs * 10);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('fetches only the card the pointer settled on after crossing several', () => {
		const fetchSpy = answering();
		jest.useFakeTimers();
		prefetchOnIntent({ ...nfl, id: '1' }).onPointerEnter();
		prefetchOnIntent({ ...nfl, id: '2' }).onPointerEnter();
		prefetchOnIntent({ ...nfl, id: '3' }).onPointerEnter();
		jest.advanceTimersByTime(hoverPrefetchWaitMs);
		expect(requestedUrls(fetchSpy)[0]).toBe(summaryUrl('football/nfl', '3'));
		expect(fetchSpy).toHaveBeenCalledTimes(2);
	});

	// A test's last hover must not land in the next test's freshly emptied cache.
	it('drops a pending hover along with the cache', () => {
		const fetchSpy = answering();
		jest.useFakeTimers();
		prefetchOnIntent(nfl).onPointerEnter();
		clearSharedRequests();
		jest.advanceTimersByTime(hoverPrefetchWaitMs);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('counts keyboard focus the same as a resting pointer', () => {
		const fetchSpy = answering();
		jest.useFakeTimers();
		const handlers = prefetchOnIntent(nfl);
		handlers.onFocus();
		jest.advanceTimersByTime(hoverPrefetchWaitMs);
		expect(fetchSpy).toHaveBeenCalled();
	});
});
