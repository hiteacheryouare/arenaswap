import { parseScoreboard, parseTeams } from '../src/espnSchemas';
import type { LeagueId } from '../src/types';

/* ESPN publishes no schema and no changelog, so the question this file asks is not "does the happy
   path work" — the rest of the suite covers that — but "when ESPN moves, what does it cost, and
   does anybody find out". Every case below is a shape the payload could take tomorrow, and what is
   asserted is the size of the blast radius and whether the loss is visible.

   The design the code has chosen is salvage per row: one bad event costs that event, not the
   league. These prove the seams where that holds, and pin the three places where it does not. */

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

/* `jest.resetModules()` hands out a fresh copy of every module, logger included — its own comment
   says so. So the logger has to be woken up inside the same registry the api client is loaded
   from, or the switch is flipped on a copy nothing is writing through. */
const verboseClient = (): typeof import('../src/apiClient') => {
	jest.resetModules();
	// Quiet by default under NODE_ENV=test, which is the very reason a warning can go unnoticed.
	(require('../src/logger') as typeof import('../src/logger')).setVerboseLogging(true);
	return require('../src/apiClient') as typeof import('../src/apiClient');
};

const teamsPayload = (teams: unknown[]) => ({ sports: [{ leagues: [{ teams }] }] });

const teamRow = (over: Record<string, unknown> = {}) => (
	{ team: { id: '19', displayName: 'Detroit Pistons', ...over } }
);

describe('a field ESPN reshapes costs exactly one game', () => {
	/* The fields that already accept both encodings. The comment on `espnNumericText` says ESPN
	   varies number-vs-string by sport and by endpoint, and these are the ones that were burned. */
	test.each([
		['an id sent as a number', { id: 401584691 as unknown as string }],
		['a score sent as a number', { home: { score: 104 } }],
	])('%s is read rather than dropped', (_label, over) => {
		expect(parsedIds([liveEvent(over as never)])).toHaveLength(1);
	});

	/* And the fields that do not. Each of these is declared a bare number because the reader wants a
	   number, so a quoted one fails the competition, fails the event, and takes the game off the
	   board — score, clock and all. The salvage keeps the rest of the league, which is the point. */
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
	/* `z.optional` in zod means "may be absent", not "may be null", so a null lands as a type error
	   and fails the whole competitor. The reader two files over already handles an absent score —
	   `parseInt(home.score ?? '0', 10) || 0` — so the tolerance was intended and the schema is
	   stricter than the code that consumes it. A null score from ESPN takes the entire game off the
	   board instead of reading 0. */
	test('a null score fails the event, though the reader is written to cope with no score', () => {
		expect(parsedIds([liveEvent({ home: { score: null } })])).toEqual([]);
		expect(parsedIds([liveEvent({ home: { score: undefined } })])).toHaveLength(1);
	});

	/* `score` beside it takes either encoding; `shootoutScore` takes only a number. Soccer is the
	   only sport that sends it, and soccer is where the quoted-number habit shows up most. */
	test('a shootout score sent as a string drops the match, though the score beside it would not', () => {
		expect(parsedIds([liveEvent({ home: { score: '1', shootoutScore: 4 } })])).toHaveLength(1);
		expect(parsedIds([liveEvent({ home: { score: '1', shootoutScore: '4' } })])).toEqual([]);
	});

	/* A team with no display name is a whole event gone. ESPN sends placeholder competitors for
	   unfilled bracket slots, and today it names them ("Winner Match 49"); an unnamed one would be
	   a knockout fixture that never appears. */
	test('a competitor with no display name drops the fixture', () => {
		expect(parsedIds([liveEvent({ home: { team: { abbreviation: 'TBD' } } })])).toEqual([]);
	});
});

describe('a state ESPN has not used before', () => {
	/* `parseStatus` folds everything it does not recognise into `post`, and `post` is the state the
	   default slate filters out. So a new `state` string produces no error and no dropped-event
	   count — the games simply stop appearing, mid-game, while the payload parses cleanly the whole
	   time. Driven through the real fetch path rather than the parser alone, because the loss is
	   only visible at the far end. */
	test('a live game reaches the slate, and the same game in an unknown state does not', async () => {
		const known = mockScoreboard([liveEvent()]);
		const before = await known.fetchGamesWithLeagueLogos(['nba'] as LeagueId[], { includeUpcoming: false });

		expect(before.games.map(game => game.status)).toContain('in');

		const unknown = mockScoreboard([liveEvent({ status: { type: { state: 'in_review' } } })]);
		const after = await unknown.fetchGamesWithLeagueLogos(['nba'] as LeagueId[], { includeUpcoming: false });

		expect(after.games).toEqual([]);
		expect(after.shedLeagues).toEqual([]);
	});

	test('the payload itself parses cleanly, so nothing counts the loss', () => {
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

	/* The state worth knowing about most. If ESPN reshapes a field every event in a league carries,
	   every event drops, and the answer is a successful fetch of zero games — which is exactly what
	   a league in its off-season looks like. Nothing upstream can tell them apart: `shedLeagues`
	   only names leagues that refused, so a fully drifted league is not shed, and the poller reads a
	   successful tick with nothing live as a quiet league and walks it down to dormant. The count is
	   the only thing that knows, and it goes to a console warning. */
	test('a league that drifted entirely is a board of nothing, distinguishable only by the count', () => {
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

describe('the team list the onboarding picker is built from', () => {
	test('one unreadable row costs that team and not the league', () => {
		const result = parseTeams(teamsPayload([teamRow(), { team: { id: '25' } }, teamRow({ id: '2' })]));

		expect(result.teams).toHaveLength(2);
		expect(result.droppedTeams).toBe(1);
	});

	/* The same id, from the same API, with two different tolerances: the scoreboard's competitor id
	   is declared `string | number`, and this one is declared `string`. If `/teams` ever quotes its
	   ids the way the scoreboard already sometimes does, every row in the league drops. */
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
	// Each of these carries a `.catch([])` on the array rather than on the row, so a sport that
	// sends a `$ref` string where every other sport sends a list loses the block and keeps the game.
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

/* The console warning is the only place a drifted league leaves a trace, so it is worth knowing it
   actually fires — and that it stops firing, because at the twelve-second poll floor a warning on
   every tick would bury the console it is meant to make readable. */
describe('the warning that is the only trace a drift leaves', () => {
	const runPoll = async (events: unknown[], api?: typeof import('../src/apiClient')) => {
		const client = api ?? verboseClient();
		// Re-served on every poll, so a caller reusing a client can change what ESPN answers with.
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
