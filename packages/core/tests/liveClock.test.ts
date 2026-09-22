import type { LeagueId } from '../src/types';
import { parseClockToSeconds } from '../src/gameClock';

/* `parseClockToSeconds` is total everywhere except one branch, and the exception produces NaN
   rather than an error. It matters because `clockSeconds` is not decoration: it feeds the lateGame
   signal, which is worth up to a quarter of a PowerScore, and it is what the popup renders on the
   card. A NaN there compares false against every threshold, so the game scores as though the clock
   said nothing, and it survives into storage as `null`. Nothing logs, nothing drops, nothing counts.

   Read the function and the intent is plain — `(min ?? 0)` and `Math.floor(sec ?? 0)` are written to
   stop exactly this. They do not fire, because `??` catches null and undefined and NaN is neither. */

const createResponse = (data: unknown): Response => ({
	ok: true,
	status: 200,
	headers: new Headers(),
	json: async () => data,
} as Response);

const loadApiClient = (): typeof import('../src/apiClient') => {
	jest.resetModules();
	return require('../src/apiClient') as typeof import('../src/apiClient');
};

const gameWithClock = async (displayClock: string) => {
	const fetchMock = jest.fn().mockResolvedValue(createResponse({
		events: [{
			id: '401584691',
			date: '2026-09-21T23:30Z',
			competitions: [{
				competitors: [
					{ id: '19', homeAway: 'home', score: '88', team: { displayName: 'Detroit Pistons' } },
					{ id: '25', homeAway: 'away', score: '85', team: { displayName: 'Boston Celtics' } },
				],
				status: { period: 4, displayClock, type: { state: 'in', name: 'STATUS_IN_PROGRESS' } },
			}],
		}],
	}));
	(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
	const { games } = await loadApiClient()
		.fetchGamesWithLeagueLogos(['nba'] as LeagueId[], { includeUpcoming: false });
	return games[0];
};

describe('the clock on a live game', () => {
	test('a normal clock is read into seconds', async () => {
		expect((await gameWithClock('7:12'))?.clockSeconds).toBe(432);
	});

	/* Every other unreadable clock is already funnelled to 0, which is the honest answer for "we do
	   not know how much time is left". These are the shapes ESPN has actually been seen to send. */
	test.each([
		['a clock with too many parts', '12:34:56'],
		['an empty clock', ''],
		['a word where the clock should be', 'Final'],
		['soccer prime notation left half-finished', "90'+"],
	])('%s reads as no time left rather than as nonsense', async (_label, clock) => {
		expect((await gameWithClock(clock))?.clockSeconds).toBe(0);
	});

	/* These two used to escape that funnel: `parts.map(Number)` makes both halves NaN, and NaN
	   walks straight through a `?? 0`. The guard is a finite check now. */
	test.each([
		['a placeholder clock', '--:--'],
		['a clock with a non-numeric half', 'TBD:00'],
	])('%s reads as no time left rather than as NaN', async (_label, clock) => {
		expect((await gameWithClock(clock))?.clockSeconds).toBe(0);
	});

	test('an unreadable clock stays a number through a storage round trip', async () => {
		const game = await gameWithClock('--:--');

		// NaN serialises to null, so the old bug handed whatever read the value back a third shape
		// on top of the two it already had. 0 survives as 0.
		expect(JSON.parse(JSON.stringify({ clockSeconds: game?.clockSeconds }))).toEqual({ clockSeconds: 0 });
	});
});

/* The block above reads the clock the way the extension does, through the ESPN client. These read
   the module directly, because that is the surface the extraction actually published: the docs site
   imports `@arenaswap/core/gameClock` so it can have the parser without zod and the whole client
   coming with it. If the module and the client ever disagree, the page and the popup disagree. */
describe('the shapes ESPN is known to send', () => {
	test.each([
		['a running clock', '7:12', 432],
		['a clock at the buzzer', '0:00', 0],
		['a clock with no minutes digit', ':30', 30],
		['a soccer clock in prime notation', "85'", 5100],
		['a soccer clock in stoppage time', "90'+8'", 5880],
		['a soccer clock before kickoff', "0'", 0],
		['a placeholder clock', '--:--', 0],
		['a word where the clock should be', 'Final', 0],
	])('%s reads as the right number of seconds', (_label, clock, expected) => {
		expect(parseClockToSeconds(clock)).toBe(expected);
	});
});

/* Characterisation of input ESPN has never been seen to send. Nothing here is a wish list — every
   row is what the function does today, written down so that changing any of it is a decision
   somebody made rather than a side effect of touching something nearby.

   Three rows are worth arguing about and none of them are reachable from the wire:

     * a leading minus survives, so '-5:30' is -270 and the card renders that as '-5:-30'
     * a negative seconds half subtracts, so '5:-3' is 297 rather than 303 or 0
     * Number() accepts hex and exponent notation, so '0x10:00' is sixteen minutes

   They are listed rather than fixed because a clamp added for input that cannot arrive is a clamp
   nobody can justify later. If ESPN is ever caught sending one of these, this table is where the
   evidence goes. */
describe('input the wire has never produced', () => {
	test.each([
		['a negative minutes half', '-5:30', -270],
		['a negative seconds half', '5:-3', 297],
		['exponent notation', '1e3:00', 60000],
		['the word Infinity', 'Infinity:00', 0],
		['a bare negative number', '-5', 0],
		['Arabic-Indic digits', '\u0665:\u0663\u0660', 0],
		['hexadecimal notation', '0x10:00', 960],
		['nothing at all', '', 0],
		['a lone separator', ':', 0],
		['a missing seconds half', '5:', 300],
		['a missing minutes half', ':30', 30],
		['padding around both halves', '  5 : 30  ', 330],
		['three parts', '12:34:56', 0],
		['soccer stoppage notation', "90'+8'", 5880],
		['soccer prime notation', "85'", 5100],
		['a leading plus on prime notation', "+5'", 0],
		['a sub-minute decimal', '0.75', 0],
		['a zero decimal', '0.0', 0],
		['the word NaN', 'NaN:00', 0],
	])('%s reads as a known value', (_label, clock, expected) => {
		expect(parseClockToSeconds(clock)).toBe(expected);
	});

	/* The bug this module was extracted to fix was not a wrong number, it was a NaN: it compared
	   false against every threshold in the scorer, stored as null, and nothing logged. This is that
	   property on its own, so the next hole in the funnel trips a test that already exists rather
	   than waiting for somebody to add a row above. */
	test('nothing produces a value that is not a finite number', () => {
		const everyShape = ['-5:30', '5:-3', '1e3:00', 'Infinity:00', '-5', '\u0665:\u0663\u0660', '0x10:00',
			'', ':', '5:', ':30', '  5 : 30  ', '12:34:56', "90'+8'", "85'", "+5'", '0.75', '0.0',
			'NaN:00', '--:--', 'Final', '1e400:00', '5:99', '1_0:00', "90'+"];
		const notFinite = everyShape.filter(clock => !Number.isFinite(parseClockToSeconds(clock)));

		expect(notFinite).toEqual([]);
	});
});

// A countdown only ever decreases, so the seconds read off two consecutive readings must never
// increase. They used to across the boundary at 1: the single-part branch read anything below 1
// as decimal minutes, so a clock ticking 1.0 -> 0.9 was read as 1 second -> 54 seconds, and a
// viewer with nine tenths of a second left was told there was most of a minute to go.
//
// Settled against ESPN on 2026-09-21 rather than by argument. A single-part clock is seconds:
// an NBA play-by-play runs 40.8 down to 0.1 and never emits `0:xx`, and a WNBA one carries both
// 1.0 and 0.3 in the same period. Hockey and gridiron stay on `M:SS` the whole way down, which
// is why no capture in this repository had shown the other form before.
test('the clock never reads higher as it winds down', () => {
	const winddown = ['2.0', '1.5', '1.0', '0.9', '0.5', '0.1'];
	const readings = winddown.map(parseClockToSeconds);
	const jumps = readings.flatMap((seconds, index) => index > 0 && seconds > readings[index - 1]!
		? [`${winddown[index - 1]} read ${readings[index - 1]}s, then ${winddown[index]} read ${seconds}s`]
		: []);

	expect(jumps).toEqual([]);
});
