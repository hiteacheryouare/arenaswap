import type { Game } from '@arenaswap/core/types';
import {
	accumulationDepth,
	isDecember,
	isDemoSeason,
	isSnowing,
	isThanksgivingWeek,
	inningProgress,
	periodProgress,
	resolveDecorationDate,
	resolveDecorations,
	thanksgivingDate,
} from '../utils/holidayDecorations';

const allOn = {
	holidayDecorationsEnabled: true,
	holidaySnowEnabled: true,
	holidayLightsEnabled: true,
	holidayLeavesEnabled: true,
};

const football = (over: Partial<Game> = {}): Game => ({
	id: 'g',
	league: 'nfl',
	sportType: 'football',
	status: 'in',
	period: 1,
	clockSeconds: 900,
	homeTeam: { id: 'h', name: 'Buffalo Bills', abbreviation: 'BUF', score: 0 },
	awayTeam: { id: 'a', name: 'Green Bay Packers', abbreviation: 'GB', score: 0 },
	...over,
});

describe('isSnowing', () => {
	test('matches every wording ESPN uses for snow', () => {
		expect(isSnowing(football({ weather: { temperatureF: 24, conditionLabel: 'Snow' } }))).toBe(true);
		expect(isSnowing(football({ weather: { temperatureF: 24, conditionLabel: 'Light Snow' } }))).toBe(true);
		expect(isSnowing(football({ weather: { temperatureF: 24, conditionLabel: 'Snow Showers/Wind' } }))).toBe(true);
		expect(isSnowing(football({ weather: { temperatureF: 28, conditionLabel: 'Flurries' } }))).toBe(true);
		expect(isSnowing(football({ weather: { temperatureF: 30, conditionLabel: 'Sleet' } }))).toBe(true);
	});

	test('does not match rain, cold or a missing reading', () => {
		expect(isSnowing(football({ weather: { temperatureF: 20, conditionLabel: 'Cold' } }))).toBe(false);
		expect(isSnowing(football({ weather: { temperatureF: 40, conditionLabel: 'Heavy Rain' } }))).toBe(false);
		expect(isSnowing(football())).toBe(false);
	});
});

describe('thanksgiving', () => {
	test('finds the fourth Thursday of November', () => {
		expect(thanksgivingDate(2026).getDate()).toBe(26);
		expect(thanksgivingDate(2027).getDate()).toBe(25);
		expect(thanksgivingDate(2025).getDate()).toBe(27);
	});

	test('covers the whole Monday to Sunday week around it', () => {
		expect(isThanksgivingWeek(new Date(2026, 10, 23, 12))).toBe(true);
		expect(isThanksgivingWeek(new Date(2026, 10, 26, 12))).toBe(true);
		expect(isThanksgivingWeek(new Date(2026, 10, 29, 23))).toBe(true);
	});

	test('stops at the days either side of that week', () => {
		expect(isThanksgivingWeek(new Date(2026, 10, 22, 23))).toBe(false);
		expect(isThanksgivingWeek(new Date(2026, 10, 30, 0))).toBe(false);
		expect(isThanksgivingWeek(new Date(2026, 9, 26, 12))).toBe(false);
	});
});

describe('isDecember', () => {
	test('runs the whole month and no further', () => {
		expect(isDecember(new Date(2026, 11, 1))).toBe(true);
		expect(isDecember(new Date(2026, 11, 31, 23))).toBe(true);
		expect(isDecember(new Date(2026, 10, 30))).toBe(false);
		expect(isDecember(new Date(2027, 0, 1))).toBe(false);
	});
});

describe('periodProgress', () => {
	test('reads a counting-down clock against the league period length', () => {
		expect(periodProgress(football({ period: 1, clockSeconds: 900 }))).toBe(0);
		expect(periodProgress(football({ period: 1, clockSeconds: 450 }))).toBe(0.5);
		expect(periodProgress(football({ period: 4, clockSeconds: 0 }))).toBe(1);
	});

	test('takes the elapsed offset back off a soccer second half', () => {
		const secondHalf = football({ league: 'epl', sportType: 'soccer', period: 2, clockSeconds: 4050 });
		expect(periodProgress(secondHalf)).toBe(0.5);
		const firstHalf = football({ league: 'epl', sportType: 'soccer', period: 1, clockSeconds: 1350 });
		expect(periodProgress(firstHalf)).toBe(0.5);
	});

	test('clamps stoppage time rather than running past a full half', () => {
		const stoppage = football({ league: 'epl', sportType: 'soccer', period: 2, clockSeconds: 5700 });
		expect(periodProgress(stoppage)).toBe(1);
	});
});

const baseball = (over: Partial<Game> = {}): Game => ({
	id: 'b',
	league: 'mlb',
	sportType: 'baseball',
	status: 'in',
	period: 6,
	clockSeconds: 0,
	homeTeam: { id: 'h', name: 'Washington Nationals', abbreviation: 'WSH', score: 2 },
	awayTeam: { id: 'a', name: 'Miami Marlins', abbreviation: 'MIA', score: 1 },
	...over,
});

describe('inningProgress', () => {
	test('spends the top half in the first sixth-steps of the inning', () => {
		expect(inningProgress(baseball({ topOfInning: true, bso: { balls: 0, strikes: 0, outs: 0 } }))).toBe(0);
		expect(inningProgress(baseball({ topOfInning: true, bso: { balls: 0, strikes: 0, outs: 1 } }))).toBeCloseTo(1 / 6);
		expect(inningProgress(baseball({ topOfInning: true, bso: { balls: 0, strikes: 0, outs: 2 } }))).toBeCloseTo(2 / 6);
	});

	test('hands the inning over at its midpoint rather than restarting the range', () => {
		expect(inningProgress(baseball({ topOfInning: true, bso: { balls: 0, strikes: 0, outs: 3 } }))).toBe(0.5);
		expect(inningProgress(baseball({ topOfInning: false, bso: { balls: 0, strikes: 0, outs: 0 } }))).toBe(0.5);
	});

	test('only fills the inning on the last out of the bottom half', () => {
		expect(inningProgress(baseball({ topOfInning: false, bso: { balls: 0, strikes: 0, outs: 2 } }))).toBeCloseTo(5 / 6);
		expect(inningProgress(baseball({ topOfInning: false, bso: { balls: 0, strikes: 0, outs: 3 } }))).toBe(1);
	});

	test('reads an unreported half as the start of the inning, not its middle', () => {
		expect(inningProgress(baseball())).toBe(0);
	});

	test('routes the clockless leagues here through periodProgress', () => {
		const sixthWithTwoDown = baseball({ topOfInning: false, bso: { balls: 1, strikes: 2, outs: 1 } });
		expect(periodProgress(sixthWithTwoDown)).toBeCloseTo(4 / 6);
		// Sixth of nine, two thirds through the inning: 0.667 x 0.667.
		expect(accumulationDepth(sixthWithTwoDown)).toBeCloseTo(0.444, 3);
	});
});

describe('accumulationDepth', () => {
	test('nothing has settled before kickoff and everything has by the final', () => {
		expect(accumulationDepth(football({ status: 'pre', period: 0, clockSeconds: 0 }))).toBe(0);
		expect(accumulationDepth(football({ status: 'post', period: 4, clockSeconds: 0 }))).toBe(1);
	});

	test('each period ends deeper than the one before it', () => {
		const endOf = (period: number) => accumulationDepth(football({ period, clockSeconds: 0 }));
		expect(endOf(1)).toBe(0.25);
		expect(endOf(2)).toBe(0.5);
		expect(endOf(3)).toBe(0.75);
		expect(endOf(4)).toBe(1);
	});

	test('resets to nothing at the start of a period', () => {
		expect(accumulationDepth(football({ period: 4, clockSeconds: 900 }))).toBe(0);
	});

	test('overtime keeps the regulation maximum instead of piling past it', () => {
		expect(accumulationDepth(football({ period: 5, clockSeconds: 0 }))).toBe(1);
	});
});

describe('resolveDecorations', () => {
	const december = new Date(2026, 11, 14, 13);
	const thanksgivingWeek = new Date(2026, 10, 26, 13);
	const august = new Date(2026, 7, 14, 13);
	const snowy = football({ period: 4, clockSeconds: 0, weather: { temperatureF: 24, conditionLabel: 'Snow' } });

	test('the parent switch turns off all three', () => {
		expect(resolveDecorations(snowy, december, { ...allOn, holidayDecorationsEnabled: false }))
			.toEqual({ lights: false, falling: null, depth: 0 });
	});

	test('lights hang all December regardless of the weather or the sport', () => {
		expect(resolveDecorations(football(), december, allOn).lights).toBe(true);
		expect(resolveDecorations(football(), august, allOn).lights).toBe(false);
		expect(resolveDecorations(football(), december, { ...allOn, holidayLightsEnabled: false }).lights).toBe(false);
	});

	test('snow falls whenever it is snowing at the game', () => {
		expect(resolveDecorations(snowy, august, allOn).falling).toBe('snow');
		expect(resolveDecorations(football(), august, allOn).falling).toBe(null);
		expect(resolveDecorations(snowy, august, { ...allOn, holidaySnowEnabled: false }).falling).toBe(null);
	});

	test('leaves take the Thanksgiving week off snow, which gets the rest of the winter', () => {
		expect(resolveDecorations(snowy, thanksgivingWeek, allOn).falling).toBe('leaves');
		expect(resolveDecorations(snowy, december, allOn).falling).toBe('snow');
	});

	test('leaves are a football thing, so a snowy hockey game that week still gets snow', () => {
		const hockey = football({ league: 'nhl', sportType: 'hockey', weather: { temperatureF: 24, conditionLabel: 'Snow' } });
		expect(resolveDecorations(hockey, thanksgivingWeek, allOn).falling).toBe('snow');
	});

	test('turning leaves off hands that week back to snow', () => {
		expect(resolveDecorations(snowy, thanksgivingWeek, { ...allOn, holidayLeavesEnabled: false }).falling).toBe('snow');
	});

	test('depth is only reported when something is actually falling', () => {
		expect(resolveDecorations(snowy, december, allOn).depth).toBe(1);
		expect(resolveDecorations(football({ period: 4, clockSeconds: 0 }), december, allOn).depth).toBe(0);
	});
});

describe('demo season', () => {
	const september = new Date(2026, 8, 3, 13);

	test('leaves the real date alone by default', () => {
		expect(resolveDecorationDate(september, 'real')).toBe(september);
	});

	test('borrows a date the real rules would decorate', () => {
		expect(isThanksgivingWeek(resolveDecorationDate(september, 'thanksgiving'))).toBe(true);
		expect(isDecember(resolveDecorationDate(september, 'december'))).toBe(true);
	});

	test('computes Thanksgiving for the current year rather than pinning one', () => {
		expect(resolveDecorationDate(new Date(2027, 4, 1), 'thanksgiving').getFullYear()).toBe(2027);
		expect(resolveDecorationDate(new Date(2031, 4, 1), 'thanksgiving').getDate()).toBe(thanksgivingDate(2031).getDate());
	});

	test('rejects a stored season it does not recognize', () => {
		expect(isDemoSeason('december')).toBe(true);
		expect(isDemoSeason('halloween')).toBe(false);
		expect(isDemoSeason(undefined)).toBe(false);
	});

	test('the borrowed December date decorates a snowy football game with both', () => {
		const snowy = football({ period: 4, clockSeconds: 0, weather: { temperatureF: 26, conditionLabel: 'Snow' } });
		const borrowed = resolveDecorationDate(september, 'december');
		expect(resolveDecorations(snowy, borrowed, allOn)).toEqual({ lights: true, falling: 'snow', depth: 1 });
	});

	test('the borrowed Thanksgiving date turns that same game over to leaves', () => {
		const snowy = football({ period: 4, clockSeconds: 0, weather: { temperatureF: 26, conditionLabel: 'Snow' } });
		const borrowed = resolveDecorationDate(september, 'thanksgiving');
		expect(resolveDecorations(snowy, borrowed, allOn).falling).toBe('leaves');
		expect(resolveDecorations(snowy, borrowed, allOn).lights).toBe(false);
	});
});

describe('snow is a weather rule, not a sport rule', () => {
	const snowyWeather = { temperatureF: 27, conditionLabel: 'Snow' };
	const august = new Date(2026, 7, 14, 13);

	test('falls on every sport that reports it', () => {
		const sports = [
			{ league: 'nfl' as const, sportType: 'football' as const },
			{ league: 'mls' as const, sportType: 'soccer' as const },
			{ league: 'mlb' as const, sportType: 'baseball' as const },
			{ league: 'nhl' as const, sportType: 'hockey' as const },
		];
		for (const sport of sports) {
			const game = football({ ...sport, weather: snowyWeather });
			expect(resolveDecorations(game, august, allOn).falling).toBe('snow');
		}
	});

	test('falls on none of them without it', () => {
		const sports = ['football', 'soccer', 'baseball', 'hockey'] as const;
		for (const sportType of sports) {
			const game = football({ sportType, weather: { temperatureF: 21, conditionLabel: 'Cloudy' } });
			expect(resolveDecorations(game, august, allOn).falling).toBe(null);
		}
	});
});

/* Serves the event as a one-game scoreboard and returns what the parser made of it.

   On a fresh module registry each time, because ESPN stopped answering for a span of dates and the
   client asks for a window one day at a time now, holding each day's answer so the repeat asks are
   free. That cache is keyed by league and day and is exactly right in the extension — but here it
   would hand the second reading below the first one's games, since both are the same league on the
   same days. */
const parseThroughFetch = async (event: unknown): Promise<Game> => {
	(globalThis as { fetch: typeof fetch }).fetch = (async () => ({
		ok: true,
		status: 200,
		// The client reads `cache-control` off every scoreboard response to learn how often ESPN will
		// actually answer with something new, so a double without headers is not a Response.
		headers: new Headers(),
		json: async () => ({ events: [event] }),
	})) as unknown as typeof fetch;
	jest.resetModules();
	const { fetchGames: freshFetchGames } = require('@arenaswap/core') as typeof import('@arenaswap/core');
	const games = await freshFetchGames(['nfl']);
	expect(games).toHaveLength(1);
	return games[0]!;
};

// Nothing else joins the two halves of the dome rule: the suppression lives in core's parser and
// the decoration that acts on it lives here, so a unit test either side of the seam can pass while
// a snowy dome still buries the screen. This runs a real scoreboard payload through the real fetch.
describe('a dome game and the snow decoration, end to end', () => {
	// Transcribed off the live NFL scoreboard on 2026-09-09, down to the `indoor` flag on each
	// venue. The readings are December's — ESPN drops the weather block entirely once a game is
	// final, so a snowy January payload cannot be fetched back out to copy.
	const domeEvent = {
		id: 'dome',
		date: '2026-12-14T18:00:00.000Z',
		weather: { displayValue: 'Snow', temperature: 19, highTemperature: 19, conditionId: '22' },
		competitions: [{
			competitors: [
				{ id: 'h', homeAway: 'home', score: '17', team: { displayName: 'Minnesota Vikings', abbreviation: 'MIN' } },
				{ id: 'a', homeAway: 'away', score: '14', team: { displayName: 'Green Bay Packers', abbreviation: 'GB' } },
			],
			status: { period: 4, displayClock: '5:00', type: { state: 'in', name: 'STATUS_IN_PROGRESS' } },
			venue: { fullName: 'U.S. Bank Stadium', address: { city: 'Minneapolis', state: 'MN' }, indoor: true },
		}],
	};

	const openAirEvent = {
		...domeEvent,
		id: 'open-air',
		competitions: [{
			...domeEvent.competitions[0],
			venue: { fullName: 'Lambeau Field', address: { city: 'Green Bay', state: 'WI' }, indoor: false },
		}],
	};

	const december = new Date(2026, 11, 14, 13);

	test('the roof takes the snow off the screen', async () => {
		const game = await parseThroughFetch(domeEvent);
		expect(game.venueName).toBe('U.S. Bank Stadium');
		expect(game.weather).toBeUndefined();
		expect(isSnowing(game)).toBe(false);
		expect(resolveDecorations(game, december, allOn).falling).toBe(null);
		expect(resolveDecorations(game, december, allOn).depth).toBe(0);
	});

	// The control the assertion above is worth nothing without: the same reading on an open roof has
	// to still snow, or the dome case could be passing because the payload never carried snow at all.
	test('the same reading outdoors still snows', async () => {
		const game = await parseThroughFetch(openAirEvent);
		expect(game.weather).toEqual({ temperatureF: 19, conditionLabel: 'Snow' });
		expect(isSnowing(game)).toBe(true);
		expect(resolveDecorations(game, december, allOn).falling).toBe('snow');
	});
});
