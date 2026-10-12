import { summaryUrl } from '@arenaswap/sideline';
import { hoverPrefetchWaitMs, prefetchOnIntent, resetPrefetchIntent } from '../entrypoints/popup/components/prefetchIntent';

const answering = (body: unknown = {}, ok = true) => (
	jest.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve({
		ok,
		status: ok ? 200 : 503,
		json: () => Promise.resolve(body),
	} as Response))
);

const requestedUrls = (fetchSpy: jest.SpyInstance) => fetchSpy.mock.calls.map(([url]) => url);

beforeEach(() => resetPrefetchIntent());

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
		resetPrefetchIntent();
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
