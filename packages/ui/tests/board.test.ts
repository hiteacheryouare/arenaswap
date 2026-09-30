import type { Game, PowerScoreSnapshot } from '@arenaswap/core/types';
import { arrangeLive, powerTrend, tileFloor } from '../src/components/boardLayout';
import { formatStartTime, resolveBoardClock, trailingSide } from '../src/components/boardClock';
import { resolveGameColors, resolveGameSurface, resolveRowSurface, veilTopShare, monogramInk } from '../src/components/gameSurface';
import { resolveTeamColorPair } from '../src/components/colorUtils';
import { contrastBetween, hexLuminance, hexToRgb, rgbToHex } from '../src/components/colorMath';
import { defaultStrings } from '../src/components/defaultStrings';

const t = (key: string, subs?: Record<string, string | number>) => {
	let text = defaultStrings[key] ?? key;
	for (const [name, value] of Object.entries(subs ?? {})) text = text.split(`{${name}}`).join(String(value));
	return text;
};

const game = (id: string, overrides: Partial<Game> = {}): Game => ({
	id,
	league: 'nba',
	sportType: 'basketball',
	status: 'in',
	period: 4,
	clockSeconds: 38,
	homeTeam: { id: `${id}-h`, name: 'Home', abbreviation: 'HOM', score: 108, color: '#860038' },
	awayTeam: { id: `${id}-a`, name: 'Away', abbreviation: 'AWY', score: 107, color: '#00471B' },
	...overrides,
});

describe('arrangeLive', () => {
	const scores = new Map([['a', 93], ['b', 88], ['c', 70], ['d', 69], ['e', 12]]);
	const live = ['e', 'd', 'c', 'b', 'a'].map(id => game(id));

	test('puts the hottest game on the stage and splits the rest at the tile floor', () => {
		const board = arrangeLive(live, scores);
		expect(board.stage?.id).toBe('a');
		expect(board.tiles.map(g => g.id)).toEqual(['b', 'c']);
		expect(board.rows.map(g => g.id)).toEqual(['d', 'e']);
		expect(tileFloor).toBe(70);
	});

	test('gives an empty slate no stage', () => {
		expect(arrangeLive([], scores)).toEqual({ all: [], stage: null, tiles: [], rows: [] });
	});

	test('breaks ties on favourites, then league order, then id', () => {
		const tied = new Map([['x', 50], ['y', 50]]);
		const x = game('x', { league: 'nba' });
		const y = game('y', { league: 'wnba' });
		expect(arrangeLive([x, y], tied, { leagueRank: { nba: 1, wnba: 0 } }).stage?.id).toBe('y');
		expect(arrangeLive([x, y], tied, { leagueRank: { nba: 1, wnba: 0 }, favoriteTeamIds: new Set(['nba:x-h']) }).stage?.id).toBe('x');
		expect(arrangeLive([y, x], tied).stage?.id).toBe('x');
	});

	test('treats a game with no score yet as zero rather than dropping it', () => {
		const board = arrangeLive([game('new'), game('a')], new Map([['a', 40]]));
		expect(board.all.map(g => g.id)).toEqual(['a', 'new']);
	});
});

const at = (ago: number, total: number, now: number) => ({ gameId: 'g', timestamp: now - ago, total } as PowerScoreSnapshot);

describe('powerTrend', () => {
	const now = 1_800_000_000_000;

	test('compares against the reading about a minute ago', () => {
		expect(powerTrend([at(120_000, 50, now), at(60_000, 60, now), at(30_000, 65, now), at(0, 66, now)], now)).toBe(6);
	});

	test('falls back to the oldest reading at least twenty seconds old', () => {
		expect(powerTrend([at(40_000, 70, now), at(0, 64, now)], now)).toBe(-6);
	});

	test('says nothing until there is a reading worth comparing', () => {
		expect(powerTrend(undefined, now)).toBeNull();
		expect(powerTrend([at(0, 40, now)], now)).toBeNull();
		expect(powerTrend([at(5_000, 40, now), at(0, 41, now)], now)).toBeNull();
	});

	test('says nothing about a history that stopped five minutes ago', () => {
		expect(powerTrend([at(400_000, 40, now), at(310_000, 50, now)], now)).toBeNull();
	});

	test('reads history in any order', () => {
		expect(powerTrend([at(0, 80, now), at(60_000, 70, now)], now)).toBe(10);
	});
});

describe('resolveBoardClock', () => {
	test('writes a period and clock without a separator dot', () => {
		expect(resolveBoardClock(game('g'), t)).toEqual({ text: 'Q4 0:38', word: false });
	});

	test('writes soccer minutes with a prime', () => {
		expect(resolveBoardClock(game('g', { league: 'mls', sportType: 'soccer', period: 2, clockSeconds: 67 * 60 }), t).text).toBe("2H 67'");
	});

	test('names halftime and other breaks as words', () => {
		expect(resolveBoardClock(game('g', { period: 2, intermission: true }), t)).toEqual({ text: 'Halftime', word: true });
		expect(resolveBoardClock(game('g', { league: 'nhl', sportType: 'hockey', period: 1, intermission: true }), t).word).toBe(true);
	});

	test('puts a delay in the slot and marks it', () => {
		expect(resolveBoardClock(game('g', { delayed: true, delayDescription: 'Rain Delay' }), t)).toEqual({ text: 'Rain Delay', word: true, delayed: true });
		expect(resolveBoardClock(game('g', { delayed: true }), t).text).toBe('Delay');
	});

	test('carries the inning half for inning sports', () => {
		expect(resolveBoardClock(game('g', { league: 'mlb', sportType: 'baseball', period: 7, topOfInning: false }), t)).toEqual({ text: 'Inn 7', word: false, topOfInning: false });
	});

	test('shows the shootout tally once both sides have one', () => {
		const shootout = game('g', {
			league: 'mls', sportType: 'soccer', period: 5,
			awayTeam: { id: 'a', name: 'A', abbreviation: 'A', score: 1, shootoutScore: 4 },
			homeTeam: { id: 'h', name: 'H', abbreviation: 'H', score: 1, shootoutScore: 3 },
		});
		expect(resolveBoardClock(shootout, t).text).toBe('PENS 4–3');
	});

	test('carries our sources\' Final designation', () => {
		expect(resolveBoardClock(game('g', { status: 'post', finalPeriodSuffix: 'OT' }), t)).toEqual({ text: 'Final/OT', word: true });
		expect(resolveBoardClock(game('g', { status: 'post' }), t).text).toBe('Final');
	});

	test('shows the start time before a game', () => {
		const start = '2026-09-28T23:20:00Z';
		expect(resolveBoardClock(game('g', { status: 'pre', startTime: start }), t).text).toBe(formatStartTime(start));
		expect(formatStartTime(undefined)).toBe('');
		expect(formatStartTime('not a date')).toBe('');
	});
});

describe('trailingSide', () => {
	test('names the team behind, and nobody on a tie, before a start or in a shootout', () => {
		expect(trailingSide(game('g'))).toBe('away');
		expect(trailingSide(game('g', { status: 'post', awayTeam: { id: 'a', name: 'A', abbreviation: 'A', score: 3 }, homeTeam: { id: 'h', name: 'H', abbreviation: 'H', score: 1 } }))).toBe('home');
		expect(trailingSide(game('g', { awayTeam: { id: 'a', name: 'A', abbreviation: 'A', score: 2 }, homeTeam: { id: 'h', name: 'H', abbreviation: 'H', score: 2 } }))).toBeNull();
		expect(trailingSide(game('g', { status: 'pre' }))).toBeNull();
	});
});

const mix = (over: string, under: string, share: number) => {
	const a = hexToRgb(over)!;
	const b = hexToRgb(under)!;
	return rgbToHex(a.red * share + b.red * (1 - share), a.green * share + b.green * (1 - share), a.blue * share + b.blue * (1 - share));
};
const contrast = (a: string, b: string) => contrastBetween(hexLuminance(a), hexLuminance(b));
const surfaceFor = (color: string) => resolveGameSurface({ awayTeam: { id: 'a', name: '', abbreviation: '', score: 0, color }, homeTeam: { id: 'h', name: '', abbreviation: '', score: 0, color } });

describe('the stage surface', () => {

	test('uses exactly the pair today\'s picker chooses', () => {
		const pair = { awayTeam: { id: 'a', name: '', abbreviation: '', score: 0, color: '#0A1F44', alternateColor: '#FFC72C' }, homeTeam: { id: 'h', name: '', abbreviation: '', score: 0, color: '#0C2340', alternateColor: '#C8102E' } };
		expect(resolveGameColors(pair)).toEqual(resolveTeamColorPair(pair.awayTeam, pair.homeTeam, '#5a6370', '#5a6370'));
	});

	// Every colour a team could send, sampled across the cube: white type must clear 4.5:1 on the
	// lightest point of the field, which is a pure team colour under the thinner top of the veil.
	test('keeps white type readable on any pair of team colours', () => {
		const steps = [0x00, 0x33, 0x66, 0x99, 0xcc, 0xff];
		const colours = steps.flatMap(r => steps.flatMap(g => steps.map(b => rgbToHex(r, g, b))));
		for (const colour of colours) {
			const surface = resolveGameSurface({ awayTeam: { id: 'a', name: '', abbreviation: '', score: 0, color: colour }, homeTeam: { id: 'h', name: '', abbreviation: '', score: 0, color: '#000000' } });
			const top = mix('#080a0c', surface.away, surface.veil * veilTopShare);
			expect(contrast('#ffffff', top)).toBeGreaterThanOrEqual(4.49);
		}
	});

	test('gives a navy almost no veil and a gold much more', () => {
		expect(surfaceFor('#002D72').veil).toBeLessThan(0.15);
		expect(surfaceFor('#FFB81C').veil).toBeGreaterThan(0.5);
	});

	test('warms the veil for a delay', () => {
		const pair = { awayTeam: { id: 'a', name: '', abbreviation: '', score: 0, color: '#CE1141' }, homeTeam: { id: 'h', name: '', abbreviation: '', score: 0, color: '#006BB6' } };
		expect(resolveGameSurface(pair).veilRgb).toBe('8, 10, 12');
		expect(resolveGameSurface({ ...pair, delayed: true }).veilRgb).toBe('28, 22, 3');
	});

	test('letters a monogram in the alternate when it reads, else white or black', () => {
		expect(monogramInk({ alternateColor: '#FFC72C' }, '#1D428A')).toBe('#FFC72C');
		expect(monogramInk({ alternateColor: '#1E3A8A' }, '#1D428A')).toBe('#ffffff');
		expect(monogramInk({}, '#FFD200')).toBe('#000000');
	});
});

const pairOf = (color: string) => ({ awayTeam: { id: 'a', name: '', abbreviation: '', score: 0, color }, homeTeam: { id: 'h', name: '', abbreviation: '', score: 0, color: '#777777' } });

describe('the row surface', () => {
	const steps = [0x00, 0x33, 0x66, 0x99, 0xcc, 0xff];
	const colours = steps.flatMap(r => steps.flatMap(g => steps.map(b => rgbToHex(r, g, b))));
	const themes = [
		{ theme: 'dark' as const, page: '#0e1013', ink: '#ffffff', accent: '#f75c03', noteAlpha: 0.74 },
		{ theme: 'light' as const, page: '#f4f5f7', ink: '#0e1013', accent: '#c2410c', noteAlpha: 0.7 },
	];

	// The names, scores and the dimmer trailing score sit where the veil is thinnest.
	test.each(themes)('keeps the $theme ink readable on any team colour', ({ theme, page, ink, noteAlpha }) => {
		for (const colour of colours) {
			const surface = resolveRowSurface(pairOf(colour), theme);
			const under = mix(page, surface.away, surface.near);
			expect(contrast(ink, under)).toBeGreaterThanOrEqual(4.49);
			expect(contrast(mix(ink, under, noteAlpha), under)).toBeGreaterThanOrEqual(4.49);
		}
	});

	// The tab picker is drawn in the accent, at the thick end of the veil.
	test.each(themes)('keeps the $theme accent readable where the tab picker sits', ({ theme, page, accent }) => {
		for (const colour of colours) {
			const surface = resolveRowSurface(pairOf(colour), theme);
			expect(contrast(accent, mix(page, surface.away, surface.far))).toBeGreaterThanOrEqual(4.49);
		}
	});

	test('washes upcoming and final games more quietly than live ones', () => {
		const live = resolveRowSurface(pairOf('#002D72'), 'dark');
		const quiet = resolveRowSurface(pairOf('#002D72'), 'dark', true);
		expect(quiet.near).toBeGreaterThan(live.near);
	});
});
