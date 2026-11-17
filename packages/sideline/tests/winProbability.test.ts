import type { LeagueId } from '@arenaswap/core';

const createResponse = (data: unknown, init: { ok?: boolean; status?: number } = {}): Response => ({
	ok: init.ok ?? true,
	status: init.status ?? 200,
	headers: new Headers(),
	json: async () => data,
} as Response);

const loadApiClient = (): typeof import('../src/apiClient') => {
	jest.resetModules();
	return require('../src/apiClient') as typeof import('../src/apiClient');
};

const mockFetch = (response: Response | (() => Promise<Response>)) => {
	const respond = typeof response === 'function' ? response : async () => response;
	const fetchMock = jest.fn((..._args: Parameters<typeof fetch>) => respond());
	(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
	return { fetchMock, api: loadApiClient() };
};

const nbaGame = { id: '401584691', league: 'nba' as LeagueId };

const winProbabilityLine = (percentages: unknown[]) => ({
	winprobability: percentages.map(homeWinPercentage => ({
		homeWinPercentage,
		awayWinPercentage: typeof homeWinPercentage === 'number' ? 1 - homeWinPercentage : undefined,
		tiePercentage: 0,
		secondsLeft: 2880,
		playId: '401584691101',
	})),
});

describe('reading the win probability line off a game', () => {
	test('hands back the home-win fractions in the order ESPN sent them', async () => {
		const { fetchMock, api } = mockFetch(createResponse(winProbabilityLine([0.5, 0.62, 0.58, 0.81])));

		await expect(api.fetchWinProbability(nbaGame)).resolves.toEqual([0.5, 0.62, 0.58, 0.81]);
		expect(String(fetchMock.mock.calls[0]?.[0]))
			.toBe('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=401584691');
	});

	test('asks the league its own ESPN path, not the NBA one', async () => {
		const { fetchMock, api } = mockFetch(createResponse(winProbabilityLine([0.4])));

		await api.fetchWinProbability({ id: '727331', league: 'epl' as LeagueId });

		expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/soccer/eng.1/summary?event=727331');
	});

	test('answers empty without asking ESPN anything for a league we do not ship', async () => {
		const { fetchMock, api } = mockFetch(createResponse({}));

		await expect(api.fetchWinProbability({ id: '1', league: 'quidditch' as LeagueId })).resolves.toEqual([]);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	test('a game id with characters that need escaping is escaped', async () => {
		const { fetchMock, api } = mockFetch(createResponse(winProbabilityLine([0.5])));

		await api.fetchWinProbability({ id: 'a b&c', league: 'nba' as LeagueId });

		expect(String(fetchMock.mock.calls[0]?.[0])).toContain('event=a%20b%26c');
	});
});

describe('when ESPN has nothing to say', () => {
	test('a game ESPN has not started modelling yet is empty rather than an error', async () => {
		const { api } = mockFetch(createResponse({ winprobability: [] }));

		await expect(api.fetchWinProbability(nbaGame)).resolves.toEqual([]);
	});

	test('a summary with no winprobability block at all is empty', async () => {
		const { api } = mockFetch(createResponse({ header: {}, boxscore: {} }));

		await expect(api.fetchWinProbability(nbaGame)).resolves.toEqual([]);
	});

	test('a summary that is not an object at all is empty rather than a throw', async () => {
		const { api } = mockFetch(createResponse('Service Unavailable'));

		await expect(api.fetchWinProbability(nbaGame)).resolves.toEqual([]);
	});
});

describe('when ESPN answers badly', () => {
	test('a 403 shed throws rather than reading as a game with no line', async () => {
		const { api } = mockFetch(createResponse({}, { ok: false, status: 403 }));

		await expect(api.fetchWinProbability(nbaGame)).rejects.toThrow('HTTP 403');
	});

	test('a 500 throws too, and names the game so the log is actionable', async () => {
		const { api } = mockFetch(createResponse({}, { ok: false, status: 500 }));

		await expect(api.fetchWinProbability(nbaGame)).rejects.toThrow('401584691');
	});

	test('an HTML error page served with a 200 throws out of the JSON parse', async () => {
		const { api } = mockFetch({
			ok: true,
			status: 200,
			headers: new Headers(),
			json: async () => { throw new SyntaxError('Unexpected token < in JSON at position 0'); },
		} as unknown as Response);

		await expect(api.fetchWinProbability(nbaGame)).rejects.toThrow(SyntaxError);
	});

	test('a connection that dies mid-flight propagates rather than resolving empty', async () => {
		const { api } = mockFetch(async () => { throw new TypeError('Failed to fetch'); });

		await expect(api.fetchWinProbability(nbaGame)).rejects.toThrow('Failed to fetch');
	});
});

describe('rows inside the line that do not read', () => {
	test('one unreadable row is dropped and the rest of the line survives', async () => {
		const { api } = mockFetch(createResponse({
			winprobability: [
				{ homeWinPercentage: 0.5 },
				'$ref: https://sports.core.api.espn.com/v2/...',
				{ homeWinPercentage: 0.7 },
			],
		}));

		await expect(api.fetchWinProbability(nbaGame)).resolves.toEqual([0.5, 0.7]);
	});

	test('a percentage sent as a quoted string is dropped, not coerced', async () => {
		const { api } = mockFetch(createResponse(winProbabilityLine(['0.62', 0.58])));

		await expect(api.fetchWinProbability(nbaGame)).resolves.toEqual([0.58]);
	});

	test('a null percentage is dropped rather than read as a certain away win', async () => {
		const { api } = mockFetch(createResponse(winProbabilityLine([0.5, null, 0.7])));

		await expect(api.fetchWinProbability(nbaGame)).resolves.toEqual([0.5, 0.7]);
	});

	test('NaN and Infinity are dropped, so nothing downstream has to defend against them', async () => {
		const { api } = mockFetch(createResponse({
			winprobability: [
				{ homeWinPercentage: Number.NaN },
				{ homeWinPercentage: Number.POSITIVE_INFINITY },
				{ homeWinPercentage: 0.33 },
			],
		}));

		await expect(api.fetchWinProbability(nbaGame)).resolves.toEqual([0.33]);
	});
});

describe('the [0, 1] contract the scorer relies on', () => {
	test('floating point spilling a hair past the ends is pulled back in', async () => {
		const { api } = mockFetch(createResponse(winProbabilityLine([-0.0000001, 1.0000001])));

		await expect(api.fetchWinProbability(nbaGame)).resolves.toEqual([0, 1]);
	});

	test('whole percentages would clamp flat to 1, which is silent rather than loud', async () => {
		const { api } = mockFetch(createResponse(winProbabilityLine([12, 55, 88])));

		await expect(api.fetchWinProbability(nbaGame)).resolves.toEqual([1, 1, 1]);
	});
});

describe('abandoning a request', () => {
	test('the caller\'s abort signal reaches fetch', async () => {
		const { fetchMock, api } = mockFetch(createResponse(winProbabilityLine([0.5])));
		const controller = new AbortController();

		await api.fetchWinProbability(nbaGame, { signal: controller.signal });

		expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ signal: controller.signal });
	});

	test('an abort that fires mid-flight rejects rather than resolving empty', async () => {
		const { api } = mockFetch(async () => { throw new DOMException('The operation was aborted.', 'AbortError'); });
		const controller = new AbortController();
		controller.abort();

		await expect(api.fetchWinProbability(nbaGame, { signal: controller.signal })).rejects.toThrow('aborted');
	});
});
