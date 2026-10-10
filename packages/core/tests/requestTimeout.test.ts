import { requestTimeoutMs } from '../src/apiClient';

const hangsUntilAborted = (_url: unknown, init?: RequestInit): Promise<Response> => new Promise((_resolve, reject) => {
	init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
});

const answersWithAnEmptyBoard = async (): Promise<Response> => ({
	ok: true,
	status: 200,
	headers: new Headers(),
	json: async () => ({ events: [] }),
} as Response);

const loadApiClient = (): typeof import('../src/apiClient') => {
	jest.resetModules();
	return require('../src/apiClient') as typeof import('../src/apiClient');
};

const setFetch = (fetchMock: jest.Mock) => {
	(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
};

// Node's own timeout signal runs on an internal timer that jest's fake clock cannot advance, so the
// spec stands one in on the faked `setTimeout` and keeps the duration it was asked for.
const timeoutSignals: number[] = [];

// What `tickLeague` asks for: the dateless live days only, so a hung one is not queued behind a week of others.
const livePoll = { includeUpcoming: false };

beforeEach(() => {
	jest.useFakeTimers();
	timeoutSignals.length = 0;
	jest.spyOn(AbortSignal, 'timeout').mockImplementation((ms: number) => {
		timeoutSignals.push(ms);
		const controller = new AbortController();
		setTimeout(() => controller.abort(new DOMException('The operation timed out.', 'TimeoutError')), ms);
		return controller.signal;
	});
});

afterEach(() => {
	jest.restoreAllMocks();
	jest.useRealTimers();
});

describe('a request that never answers', () => {
	test('fails a scoreboard poll after ten seconds and sheds the league', async () => {
		setFetch(jest.fn(hangsUntilAborted));
		const { fetchGamesWithLeagueLogos } = loadApiClient();

		let settled = false;
		const poll = fetchGamesWithLeagueLogos(['nba'], livePoll).finally(() => { settled = true; });

		await jest.advanceTimersByTimeAsync(requestTimeoutMs - 1);
		expect(settled).toBe(false);

		await jest.advanceTimersByTimeAsync(1);
		expect((await poll).shedLeagues).toEqual(['nba']);
		expect(timeoutSignals).toContain(10_000);
	});

	test('lets the next poll fetch again instead of waiting on the dead request', async () => {
		const fetchMock = jest.fn(hangsUntilAborted);
		setFetch(fetchMock);
		const { fetchGamesWithLeagueLogos } = loadApiClient();

		const hung = fetchGamesWithLeagueLogos(['nba'], livePoll);
		await jest.advanceTimersByTimeAsync(0);
		const callsWhileHung = fetchMock.mock.calls.length;
		expect(callsWhileHung).toBeGreaterThan(0);

		// Still inside the window, a second poll for the same league and days rides the first request.
		const alongside = fetchGamesWithLeagueLogos(['nba'], livePoll);
		await jest.advanceTimersByTimeAsync(1);
		expect(fetchMock).toHaveBeenCalledTimes(callsWhileHung);

		await jest.advanceTimersByTimeAsync(requestTimeoutMs);
		expect((await hung).shedLeagues).toEqual(['nba']);
		expect((await alongside).shedLeagues).toEqual(['nba']);

		fetchMock.mockImplementation(answersWithAnEmptyBoard);
		const recovered = await fetchGamesWithLeagueLogos(['nba'], livePoll);
		expect(fetchMock.mock.calls.length).toBeGreaterThan(callsWhileHung);
		expect(recovered.shedLeagues).toEqual([]);
	});

	test.each([
		['standings', (api: typeof import('../src/apiClient')) => api.fetchLeagueStandings('nba')],
		['situation', (api: typeof import('../src/apiClient')) => api.fetchCompetitionSituation({ id: '1', league: 'nba' })],
		['duration', (api: typeof import('../src/apiClient')) => api.fetchGameDurationMins({ id: '1', league: 'mlb' })],
		['team marks', (api: typeof import('../src/apiClient')) => api.fetchTeamMonoLogos(['nba'])],
		['teams', (api: typeof import('../src/apiClient')) => api.fetchTeamsForLeagues(['nba'])],
	])('gives up on the %s request after ten seconds', async (_name, call) => {
		setFetch(jest.fn(hangsUntilAborted));
		let settled = false;
		const outcome = call(loadApiClient()).then(() => undefined, () => undefined).finally(() => { settled = true; });

		await jest.advanceTimersByTimeAsync(requestTimeoutMs - 1);
		expect(settled).toBe(false);

		await jest.advanceTimersByTimeAsync(1);
		await outcome;
		expect(settled).toBe(true);
		expect(timeoutSignals).toEqual([10_000]);
	});

	test('leaves win probability on its caller\'s signal', async () => {
		const fetchMock = jest.fn(hangsUntilAborted);
		setFetch(fetchMock);
		const { fetchWinProbability } = loadApiClient();
		const controller = new AbortController();

		const outcome = fetchWinProbability({ id: '1', league: 'nba' }, { signal: controller.signal }).catch(() => 'aborted');
		await jest.advanceTimersByTimeAsync(requestTimeoutMs * 2);
		expect(timeoutSignals).toEqual([]);
		controller.abort();
		expect(await outcome).toBe('aborted');
	});
});
