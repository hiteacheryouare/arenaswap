import type { LeagueId } from '@arenaswap/core';
import type { WinProbabilityReading } from 'powerscore';

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

const probabilitiesOf = (readings: WinProbabilityReading[]) => readings.map(reading => reading.homeWinProbability);

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

		expect(probabilitiesOf(await api.fetchWinProbability(nbaGame))).toEqual([0.5, 0.62, 0.58, 0.81]);
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

		expect(probabilitiesOf(await api.fetchWinProbability({ id: '1', league: 'quidditch' as LeagueId }))).toEqual([]);
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

		expect(probabilitiesOf(await api.fetchWinProbability(nbaGame))).toEqual([]);
	});

	test('a summary with no winprobability block at all is empty', async () => {
		const { api } = mockFetch(createResponse({ header: {}, boxscore: {} }));

		expect(probabilitiesOf(await api.fetchWinProbability(nbaGame))).toEqual([]);
	});

	test('a summary that is not an object at all is empty rather than a throw', async () => {
		const { api } = mockFetch(createResponse('Service Unavailable'));

		expect(probabilitiesOf(await api.fetchWinProbability(nbaGame))).toEqual([]);
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

		expect(probabilitiesOf(await api.fetchWinProbability(nbaGame))).toEqual([0.5, 0.7]);
	});

	test('a percentage sent as a quoted string is dropped, not coerced', async () => {
		const { api } = mockFetch(createResponse(winProbabilityLine(['0.62', 0.58])));

		expect(probabilitiesOf(await api.fetchWinProbability(nbaGame))).toEqual([0.58]);
	});

	test('a null percentage is dropped rather than read as a certain away win', async () => {
		const { api } = mockFetch(createResponse(winProbabilityLine([0.5, null, 0.7])));

		expect(probabilitiesOf(await api.fetchWinProbability(nbaGame))).toEqual([0.5, 0.7]);
	});

	test('NaN and Infinity are dropped, so nothing downstream has to defend against them', async () => {
		const { api } = mockFetch(createResponse({
			winprobability: [
				{ homeWinPercentage: Number.NaN },
				{ homeWinPercentage: Number.POSITIVE_INFINITY },
				{ homeWinPercentage: 0.33 },
			],
		}));

		expect(probabilitiesOf(await api.fetchWinProbability(nbaGame))).toEqual([0.33]);
	});
});

describe('the [0, 1] contract the scorer relies on', () => {
	test('floating point spilling a hair past the ends is pulled back in', async () => {
		const { api } = mockFetch(createResponse(winProbabilityLine([-0.0000001, 1.0000001])));

		expect(probabilitiesOf(await api.fetchWinProbability(nbaGame))).toEqual([0, 1]);
	});

	test('whole percentages would clamp flat to 1, which is silent rather than loud', async () => {
		const { api } = mockFetch(createResponse(winProbabilityLine([12, 55, 88])));

		expect(probabilitiesOf(await api.fetchWinProbability(nbaGame))).toEqual([1, 1, 1]);
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

const play = (id: string, period: number, clock: string, type?: string) => ({ id, period: { number: period, ...(type ? { type } : {}) }, clock: { displayValue: clock } });
const reading = (playId: string, homeWinPercentage: number) => ({ homeWinPercentage, playId });

describe('stamping each reading with its point in the game', () => {
	test('basketball plays sit on the summary, and overtime keeps counting past the end of regulation', async () => {
		const { api } = mockFetch(createResponse({
			plays: [play('a', 1, '12:00'), play('b', 4, '6:00'), play('c', 4, '42.5'), play('d', 5, '2:30')],
			winprobability: [reading('a', 0.5), reading('b', 0.6), reading('c', 0.7), reading('d', 0.4)],
		}));
		const progress = (await api.fetchWinProbability(nbaGame)).map(entry => entry.progress);
		expect(progress[0]).toBeCloseTo(0);
		expect(progress[1]).toBeCloseTo(3.5 / 4);
		expect(progress[2]).toBeCloseTo((3 + (720 - 42) / 720) / 4);
		expect(progress[3]).toBeCloseTo(1 + 150 / 2880);
	});

	test('football plays are found inside the drives', async () => {
		const { api } = mockFetch(createResponse({
			drives: {
				previous: [{ plays: [play('k', 1, '15:00')] }, { plays: [play('t', 2, '7:30')] }],
				current: { plays: [play('n', 4, '2:00')] },
			},
			winprobability: [reading('k', 0.55), reading('t', 0.4), reading('n', 0.9)],
		}));
		const progress = (await api.fetchWinProbability({ id: '1', league: 'nfl' as LeagueId })).map(entry => entry.progress);
		expect(progress).toEqual([0, 1.5 / 4, (3 + 13 / 15) / 4].map(expect.closeTo));
	});

	test('baseball reads the half inning', async () => {
		const { api } = mockFetch(createResponse({
			plays: [play('t1', 1, '0:00', 'Top'), play('b9', 9, '0:00', 'Bottom'), play('t10', 10, '0:00', 'Top')],
			winprobability: [reading('t1', 0.5), reading('b9', 0.3), reading('t10', 0.6)],
		}));
		const progress = (await api.fetchWinProbability({ id: '1', league: 'mlb' as LeagueId })).map(entry => entry.progress);
		expect(progress).toEqual([0.25 / 9, 8.75 / 9, 9.25 / 9].map(expect.closeTo));
	});

	test('a reading whose play is missing borrows the last known point, and never runs backwards', async () => {
		const { api } = mockFetch(createResponse({
			plays: [play('b', 3, '6:00'), play('early', 1, '11:00')],
			winprobability: [reading('b', 0.5), reading('lost', 0.55), reading('early', 0.6)],
		}));
		const progress = (await api.fetchWinProbability(nbaGame)).map(entry => entry.progress);
		expect(progress).toEqual([2.5 / 4, 2.5 / 4, 2.5 / 4].map(expect.closeTo));
	});
});
