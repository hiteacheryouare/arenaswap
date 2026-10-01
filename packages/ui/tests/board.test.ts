import type { Game } from '@arenaswap/core/types';
import { arrangeLive, tileFloor } from '../src/components/boardLayout';
import { formatStartTime, resolveBoardClock, trailingSide } from '../src/components/boardClock';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveGameColors, resolveGamePlate, resolveGameSurface, veilTopShare, monogramInk } from '../src/components/gameSurface';
import { powerScoreColor } from '../src/components/heatBar';
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
const cssHex = (rgb: string) => {
	const [red = 0, green = 0, blue = 0] = rgb.match(/\d+/g)!.map(Number);
	return rgbToHex(red, green, blue);
};
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

describe('the plate', () => {
	const steps = [0x00, 0x33, 0x66, 0x99, 0xcc, 0xff];
	const colours = steps.flatMap(r => steps.flatMap(g => steps.map(b => rgbToHex(r, g, b))));
	const theme = readFileSync(join(__dirname, '../src/_theme.scss'), 'utf8');
	const token = (name: string) => theme.match(new RegExp(`--as-plate-${name}: (#[0-9a-f]{6});`))![1]!;
	const inks = ['ink', 'muted', 'live', 'overtime', 'delay', 'start', 'gain', 'penalty'];

	// The wash is darkest at each rail, where one team's colour holds alone, which is where the crest
	// and the name sit.
	test.each(inks)('keeps the %s ink readable on any team colour', name => {
		for (const colour of colours) {
			expect(contrast(token(name), resolveGamePlate(pairOf(colour)).crestAway)).toBeGreaterThanOrEqual(4.5);
		}
	});

	test('keeps the PowerScore figure readable at every score', () => {
		const darkest = resolveGamePlate(pairOf('#000000')).crestAway;
		for (let score = 0; score <= 100; score += 1) {
			expect(contrast(mix(cssHex(powerScoreColor(score)), token('ink'), 0.55), darkest)).toBeGreaterThanOrEqual(4.5);
		}
	});

	test('steps a finished game back to a flat grey plate', () => {
		const final = resolveGamePlate({ ...pairOf('#002D72'), status: 'post' as const });
		expect(final.crestAway).toBe('#f4f6f8');
		expect(final.crestHome).toBe('#f4f6f8');
	});
});

describe('a delayed game', () => {
	const delayed = { ...pairOf('#002D72'), delayed: true, status: 'in' as const };

	test('gives both sides over to the warning yellow', () => {
		expect(resolveGamePlate(delayed).away).toBe('#f1c40f');
		expect(resolveGamePlate(delayed).home).toBe('#f1c40f');
		expect(resolveGameSurface(delayed).away).toBe('#f1c40f');
	});

	test('keeps white type readable on the yellow stage', () => {
		const surface = resolveGameSurface(delayed);
		const top = mix('#1c1603', surface.away, surface.veil * veilTopShare);
		expect(contrast('#ffffff', top)).toBeGreaterThanOrEqual(4.49);
	});

	test('keeps its colours before the start, when there is nothing to pause', () => {
		expect(resolveGameSurface({ ...delayed, status: 'pre' }).away).not.toBe('#f1c40f');
	});
});
