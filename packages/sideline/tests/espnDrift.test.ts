import { parseScoreboard, parseTeams } from '../src/espnSchemas';
import type { LeagueId } from '@arenaswap/core';

const competitor = (homeAway: 'home' | 'away', over: Record<string, unknown> = {}) => ({
	id: homeAway === 'home' ? '19' : '25',
	homeAway,
	score: homeAway === 'home' ? '104' : '99',
	team: { displayName: homeAway === 'home' ? 'Detroit Pistons' : 'Boston Celtics', abbreviation: 'DET' },
	...over,
});

const liveEvent = (over: {
	id?: string;
	event?: Record<string, unknown>;
	competition?: Record<string, unknown>;
	status?: Record<string, unknown>;
	home?: Record<string, unknown>;
} = {}) => ({
	id: over.id ?? '401584691',
	date: '2026-09-21T23:30Z',
	competitions: [{
		competitors: [competitor('home', over.home), competitor('away')],
		status: { period: 3, displayClock: '7:12', type: { state: 'in', name: 'STATUS_IN_PROGRESS' }, ...over.status },
		...over.competition,
	}],
	...over.event,
});

const parsedIds = (events: unknown[]): string[] => parseScoreboard({ events }).events.map(e => e.id);

const serveEvents = (events: unknown[]): void => {
	(globalThis as { fetch: typeof fetch }).fetch = jest.fn().mockResolvedValue({
		ok: true, status: 200, headers: new Headers(), json: async () => ({ events }),
	} as Response) as unknown as typeof fetch;
};

const mockScoreboard = (events: unknown[]): typeof import('../src/apiClient') => {
	jest.resetModules();
	serveEvents(events);
	return require('../src/apiClient') as typeof import('../src/apiClient');
};

const verboseClient = (): typeof import('../src/apiClient') => {
	jest.resetModules();
	(require('@arenaswap/core') as typeof import('@arenaswap/core')).setVerboseLogging(true);
	return require('../src/apiClient') as typeof import('../src/apiClient');
};

const teamsPayload = (teams: unknown[]) => ({ sports: [{ leagues: [{ teams }] }] });

const teamRow = (over: Record<string, unknown> = {}) => (
	{ team: { id: '19', displayName: 'Detroit Pistons', ...over } }
);

describe('a field ESPN reshapes costs exactly one game', () => {
	test.each([
		['an id sent as a number', { id: 401584691 as unknown as string }],
		['a score sent as a number', { home: { score: 104 } }],
	])('%s is read rather than dropped', (_label, over) => {
		expect(parsedIds([liveEvent(over as never)])).toHaveLength(1);
	});

	test.each([
		['the period', { status: { period: '3' } }],
		['the attendance', { competition: { attendance: '20491' } }],
		['the season type', { event: { season: { type: '3' } } }],
		['a down', { competition: { situation: { down: '3', distance: 7 } } }],
		['a ball count', { competition: { situation: { balls: '2' } } }],
		['the temperature', { event: { weather: { temperature: '71', displayValue: 'Clear' } } }],
	])('%s sent as a string drops that game alone, and says so in the count', (_label, over) => {
		const payload = [liveEvent({ id: 'healthy-1' }), liveEvent({ id: 'drifted', ...(over as Record<string, unknown>) }), liveEvent({ id: 'healthy-2' })];
		const result = parseScoreboard({ events: payload });

		expect(result.events.map(e => e.id)).toEqual(['healthy-1', 'healthy-2']);
		expect(result.droppedEvents).toBe(1);
	});
});

describe('the three places one bad value costs more than its own row', () => {
	test('a null score fails the event, though the reader is written to cope with no score', () => {
		expect(parsedIds([liveEvent({ home: { score: null } })])).toEqual([]);
		expect(parsedIds([liveEvent({ home: { score: undefined } })])).toHaveLength(1);
	});

	test('a shootout score sent as a string drops the match, though the score beside it would not', () => {
		expect(parsedIds([liveEvent({ home: { score: '1', shootoutScore: 4 } })])).toHaveLength(1);
		expect(parsedIds([liveEvent({ home: { score: '1', shootoutScore: '4' } })])).toEqual([]);
	});

	test('a competitor with no display name drops the fixture', () => {
		expect(parsedIds([liveEvent({ home: { team: { abbreviation: 'TBD' } } })])).toEqual([]);
	});
});

describe('a state ESPN has not used before', () => {
	const slateFor = async (status: Record<string, unknown>, options = { includeUpcoming: false }) => {
		const client = mockScoreboard([liveEvent({ status })]);
		return (await client.fetchGamesWithLeagueLogos(['nba'] as LeagueId[], options)).games.map(game => game.status);
	};

	test('a game already under way stays live', async () => {
		expect(await slateFor({ period: 3, type: { state: 'in_review', completed: false } })).toEqual(['in']);
	});

	test('a game before its first period is upcoming', async () => {
		const tonight = new Date(Date.now() + 60 * 60 * 1000).toISOString();
		const client = mockScoreboard([liveEvent({ status: { period: 0, type: { state: 'warmups', completed: false } }, event: { date: tonight } })]);
		const result = await client.fetchGamesWithLeagueLogos(['nba'] as LeagueId[], { includeUpcoming: false });
		expect(result.games.map(game => game.status)).toEqual(['pre']);
	});

	test('a game is final only when the feed says it is completed', () => {
		const { parseScoreboardEvents } = mockScoreboard([]);
		const read = (completed: boolean) => parseScoreboardEvents({ events: [liveEvent({ status: { period: 4, type: { state: 'certified', completed } } })] }, 'nba')[0]?.status;

		expect([read(true), read(false)]).toEqual(['post', 'in']);
	});

	test('the payload itself parses cleanly, so nothing counts it as dropped', () => {
		const result = parseScoreboard({ events: [liveEvent({ status: { type: { state: 'in_review' } } })] });

		expect(result.droppedEvents).toBe(0);
		expect(result.events[0]?.competitions[0]?.status.type?.state).toBe('in_review');
	});
});

describe('the envelope itself', () => {
	test('an ESPN error document is an empty board rather than a throw', () => {
		expect(parseScoreboard({ code: 400, message: 'Failed to get events endpoint.' }))
			.toEqual({ events: [], leagues: [], droppedEvents: 0 });
	});

	test('a board with no events key is empty rather than a throw', () => {
		expect(parseScoreboard({ leagues: [] })).toEqual({ events: [], leagues: [], droppedEvents: 0 });
	});

	test('events arriving as an object instead of an array takes the whole board', () => {
		expect(parseScoreboard({ events: { '0': liveEvent() } }).events).toEqual([]);
	});

	test('a league that drifted entirely parses to no events, and the count is what tells it from an empty board', () => {
		const allDrifted = ['a', 'b', 'c'].map(id => liveEvent({ id, status: { period: '3' } }));
		const result = parseScoreboard({ events: allDrifted });

		expect(result.events).toEqual([]);
		expect(result.droppedEvents).toBe(3);
	});

	test('a malformed leagues block costs the logos and none of the games', () => {
		const result = parseScoreboard({ events: [liveEvent()], leagues: 'https://sports.core.api.espn.com/v2/' });

		expect(result.events).toHaveLength(1);
		expect(result.leagues).toEqual([]);
	});
});

describe('a league whose every event is unreadable', () => {
	const fetchNba = (events: unknown[]) => (
		mockScoreboard(events).fetchGamesWithLeagueLogos(['nba'] as LeagueId[], { includeUpcoming: false })
	);
	const allDrifted = ['a', 'b', 'c'].map(id => liveEvent({ id, status: { period: '3' } }));

	test('is reported as shed rather than as a quiet night', async () => {
		const result = await fetchNba(allDrifted);

		expect(result.games).toEqual([]);
		expect(result.shedLeagues).toEqual(['nba']);
	});

	test('is shed on the wide window too, when every day drifted', async () => {
		const result = await mockScoreboard(allDrifted)
			.fetchGamesWithLeagueLogos(['nba'] as LeagueId[], { includeUpcoming: true, upcomingDays: 3 });

		expect(result.shedLeagues).toEqual(['nba']);
	});

	test('does not take a healthy league down with it', async () => {
		jest.resetModules();
		(globalThis as { fetch: typeof fetch }).fetch = jest.fn().mockImplementation(async (url: string) => ({
			ok: true,
			status: 200,
			headers: new Headers(),
			json: async () => ({ events: url.includes('/nba/') ? allDrifted : [liveEvent({ id: 'wnba-live' })] }),
		} as Response)) as unknown as typeof fetch;
		const api = require('../src/apiClient') as typeof import('../src/apiClient');

		const result = await api.fetchGamesWithLeagueLogos(['nba', 'wnba'] as LeagueId[], { includeUpcoming: false });

		expect(result.shedLeagues).toEqual(['nba']);
		expect(result.games.map(game => game.id)).toEqual(['wnba-live']);
	});

	test('is not confused with one bad row, which still costs only that row', async () => {
		const result = await fetchNba([liveEvent({ id: 'healthy' }), liveEvent({ id: 'drifted', status: { period: '3' } })]);

		expect(result.shedLeagues).toEqual([]);
		expect(result.games.map(game => game.id)).toEqual(['healthy']);
	});

	test('is not confused with an off-season board that has no events at all', async () => {
		const result = await fetchNba([]);

		expect(result.shedLeagues).toEqual([]);
		expect(result.games).toEqual([]);
	});
});

describe('the team list the onboarding picker is built from', () => {
	test('one unreadable row costs that team and not the league', () => {
		const result = parseTeams(teamsPayload([teamRow(), { team: { id: '25' } }, teamRow({ id: '2' })]));

		expect(result.teams).toHaveLength(2);
		expect(result.droppedTeams).toBe(1);
	});

	test('a numeric id is read on the scoreboard and dropped here', () => {
		expect(parsedIds([liveEvent({ home: { id: 19 } })])).toHaveLength(1);
		expect(parseTeams(teamsPayload([teamRow({ id: 19 })])).droppedTeams).toBe(1);
	});

	test('every row dropping leaves a league with no teams to pick from and no error to show', () => {
		const result = parseTeams(teamsPayload([teamRow({ id: 19 }), teamRow({ id: 25 })]));

		expect(result.teams).toEqual([]);
		expect(result.droppedTeams).toBe(2);
	});

	test('a league that sent no teams array at all is empty without counting a drop', () => {
		expect(parseTeams({ sports: [{ leagues: [{}] }] })).toEqual({ teams: [], droppedTeams: 0 });
	});
});

describe('the blocks only some sports send', () => {
	test.each([
		['leaders', 'leaders'],
		['records', 'records'],
		['probables', 'probables'],
	])('%s arriving as a $ref string costs the block, not the game', (_label, key) => {
		const ref = 'http://sports.core.api.espn.com/v2/sports/cricket/leagues/x/leaders?lang=en';
		const result = parseScoreboard({ events: [liveEvent({ home: { [key]: ref } })] });

		expect(result.events).toHaveLength(1);
		expect(result.events[0]?.competitions[0]?.competitors[0]?.[key as 'leaders']).toEqual([]);
	});
});

describe('the warning that is the only trace a drift leaves', () => {
	const runPoll = async (events: unknown[], api?: typeof import('../src/apiClient')) => {
		const client = api ?? verboseClient();
		serveEvents(events);
		await client.fetchGamesWithLeagueLogos(['nba'] as LeagueId[], { includeUpcoming: false });
		return client;
	};

	const drifted = (id: string) => liveEvent({ id, status: { period: '3' } });

	test('names how many events were skipped and how many survived', async () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

		await runPoll([liveEvent({ id: 'ok' }), drifted('bad')]);

		expect(warn).toHaveBeenCalledWith('ArenaSwap:', 'Skipped 1 unparseable nba event(s); kept 1.');
	});

	test('says nothing at all when the whole board read cleanly', async () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

		await runPoll([liveEvent()]);

		expect(warn).not.toHaveBeenCalled();
	});

	test('does not repeat itself while the count holds steady', async () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
		const api = await runPoll([liveEvent({ id: 'ok' }), drifted('bad')]);
		warn.mockClear();

		await runPoll([liveEvent({ id: 'ok' }), drifted('bad')], api);
		await runPoll([liveEvent({ id: 'ok' }), drifted('bad')], api);

		expect(warn).not.toHaveBeenCalled();
	});

	test('speaks up again when the count moves', async () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
		const api = await runPoll([liveEvent({ id: 'ok' }), drifted('bad')]);
		warn.mockClear();

		await runPoll([liveEvent({ id: 'ok' }), drifted('bad'), drifted('worse')], api);

		expect(warn).toHaveBeenCalledWith('ArenaSwap:', 'Skipped 2 unparseable nba event(s); kept 1.');
	});
});
