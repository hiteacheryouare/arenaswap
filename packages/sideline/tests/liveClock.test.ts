import type { LeagueId } from '@arenaswap/core';
import { parseClockTenths, parseClockToSeconds, parseStoppageMinutes } from '../src/gameClock';

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

	test.each([
		['a clock with too many parts', '12:34:56'],
		['an empty clock', ''],
		['a word where the clock should be', 'Final'],
		['soccer prime notation left half-finished', "90'+"],
	])('%s reads as no time left rather than as nonsense', async (_label, clock) => {
		expect((await gameWithClock(clock))?.clockSeconds).toBe(0);
	});

	test.each([
		['a placeholder clock', '--:--'],
		['a clock with a non-numeric half', 'TBD:00'],
	])('%s reads as no time left rather than as NaN', async (_label, clock) => {
		expect((await gameWithClock(clock))?.clockSeconds).toBe(0);
	});

	test('an unreadable clock stays a number through a storage round trip', async () => {
		const game = await gameWithClock('--:--');

		expect(JSON.parse(JSON.stringify({ clockSeconds: game?.clockSeconds }))).toEqual({ clockSeconds: 0 });
	});
});

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
		['a sub-second decimal, which is still time on the clock', '0.75', 1],
		['a zero decimal', '0.0', 0],
		['the word NaN', 'NaN:00', 0],
	])('%s reads as a known value', (_label, clock, expected) => {
		expect(parseClockToSeconds(clock)).toBe(expected);
	});

	test('nothing produces a value that is not a finite number', () => {
		const everyShape = ['-5:30', '5:-3', '1e3:00', 'Infinity:00', '-5', '\u0665:\u0663\u0660', '0x10:00',
			'', ':', '5:', ':30', '  5 : 30  ', '12:34:56', "90'+8'", "85'", "+5'", '0.75', '0.0',
			'NaN:00', '--:--', 'Final', '1e400:00', '5:99', '1_0:00', "90'+"];
		const notFinite = everyShape.filter(clock => !Number.isFinite(parseClockToSeconds(clock)));

		expect(notFinite).toEqual([]);
	});
});

test('the clock never reads higher as it winds down', () => {
	const winddown = ['2.0', '1.5', '1.0', '0.9', '0.5', '0.1'];
	const readings = winddown.map(parseClockToSeconds);
	const jumps = readings.flatMap((seconds, index) => index > 0 && seconds > readings[index - 1]!
		? [`${winddown[index - 1]} read ${readings[index - 1]}s, then ${winddown[index]} read ${seconds}s`]
		: []);

	expect(jumps).toEqual([]);
});

test('reads the added minutes off a stoppage-time clock, and nothing off any other', () => {
	expect(parseStoppageMinutes("45'+2'")).toBe(2);
	expect(parseStoppageMinutes("90'+8'")).toBe(8);
	expect(parseStoppageMinutes("85'")).toBeUndefined();
	expect(parseStoppageMinutes("90'+0'")).toBeUndefined();
	expect(parseStoppageMinutes('5:30')).toBeUndefined();
});

test('keeps the tenths of a basketball clock under a minute, and nothing else', () => {
	expect(parseClockTenths('45.3')).toBe(453);
	expect(parseClockTenths('0.8')).toBe(8);
	expect(parseClockTenths('0.0')).toBe(0);
	expect(parseClockTenths('0:22')).toBeUndefined();
	expect(parseClockTenths("90'+8'")).toBeUndefined();
	expect(parseClockTenths('')).toBeUndefined();
});
