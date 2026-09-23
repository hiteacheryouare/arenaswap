import { leagueConfigs } from '@arenaswap/core/constants';
import type { Game, LeagueId } from '@arenaswap/core/types';
import { buildBar, buildHeatCurve, leverage, liveBarFloorMs, occupancy, resolveRunMinutes } from '../entrypoints/guide/guideHeat';

const at = (iso: string) => new Date(iso).getTime();

const makeGame = (id: string, league: LeagueId, startTime: string, overrides: Partial<Game> = {}): Game => ({
	id,
	league,
	sportType: leagueConfigs.find(c => c.id === league)!.sportType,
	homeTeam: { id: `${id}-h`, name: 'Home', abbreviation: 'HOM', score: 0 },
	awayTeam: { id: `${id}-a`, name: 'Away', abbreviation: 'AWY', score: 0 },
	status: 'pre',
	period: 0,
	clockSeconds: 0,
	startTime,
	...overrides,
} as Game);

const barFor = (game: Game, isFavorite = false, now = at('2026-09-13T12:00:00Z')) => {
	const bar = buildBar(game, isFavorite, now);
	if (!bar) throw new Error('expected a bar');
	return bar;
};

describe('the per-league duration table', () => {
	// This is the assertion that would have caught olybb being drawn as a basketball game: it is
	// Olympic Men's Baseball, and a 110-minute bar on it ends in the sixth inning.
	test.each(leagueConfigs.map(c => [c.id, c] as const))('%s has a run length ordered p25 <= bar <= p99', (_id, config) => {
		expect(config.runMinutes.p25).toBeLessThanOrEqual(config.runMinutes.bar);
		expect(config.runMinutes.bar).toBeLessThanOrEqual(config.runMinutes.p99);
		expect(config.runMinutes.p25).toBeGreaterThan(0);
	});

	test.each(leagueConfigs.filter(c => c.knockoutRunMinutes).map(c => [c.id, c] as const))(
		'%s draws a longer bar in the knockout stage, which is the whole reason it has one',
		(_id, config) => {
			expect(config.knockoutRunMinutes!.bar).toBeGreaterThan(config.runMinutes.bar);
		},
	);

	test('a baseball league is never given a basketball length', () => {
		for (const config of leagueConfigs.filter(c => c.sportType === 'baseball')) {
			expect(config.runMinutes.bar).toBeGreaterThan(120);
		}
	});

	test('the knockout table is selected by the postseason flag rather than the league alone', () => {
		const group = makeGame('g', 'fifawc', '2026-06-20T16:00:00Z');
		const knockout = makeGame('k', 'fifawc', '2026-07-05T16:00:00Z', { isPostseason: true });
		expect(resolveRunMinutes(group).bar).toBe(124);
		expect(resolveRunMinutes(knockout).bar).toBe(158);
	});
});

describe('occupancy', () => {
	const game = makeGame('nfl-1', 'nfl', '2026-09-13T17:00:00Z');

	test('is flat at 1 right up to p25 and has started tapering just past it', () => {
		const bar = barFor(game);
		const p25 = resolveRunMinutes(game).p25;
		expect(occupancy(bar, bar.startMs)).toBe(1);
		expect(occupancy(bar, bar.startMs + (p25 - 1) * 60_000)).toBe(1);
		expect(occupancy(bar, bar.startMs + p25 * 60_000)).toBe(1);
		expect(occupancy(bar, bar.startMs + (p25 + 20) * 60_000)).toBeLessThan(1);
	});

	test('is zero before the game and zero once past p99', () => {
		const bar = barFor(game);
		const p99 = resolveRunMinutes(game).p99;
		expect(occupancy(bar, bar.startMs - 60_000)).toBe(0);
		expect(occupancy(bar, bar.startMs + p99 * 60_000)).toBe(0);
	});

	test('never increases as the game goes on', () => {
		const bar = barFor(game);
		let previous = 1;
		for (let m = 0; m <= 260; m += 5) {
			const value = occupancy(bar, bar.startMs + m * 60_000);
			expect(value).toBeLessThanOrEqual(previous + 1e-9);
			previous = value;
		}
	});
});

describe('leverage dead zones', () => {
	// A hard zero rather than a low point on a smooth ramp. Nearly a quarter of a hockey broadcast
	// is intermission, and a curve that smooths through that is lying about a fifth of the game.
	test('hockey reads exactly zero in both intermissions', () => {
		const bar = barFor(makeGame('nhl-1', 'nhl', '2026-09-13T23:00:00Z'));
		const run = bar.endMs - bar.startMs;
		expect(leverage(bar, bar.startMs + run * 0.3)).toBe(0);
		expect(leverage(bar, bar.startMs + run * 0.7)).toBe(0);
	});

	test('football reads exactly zero at halftime and not just near it', () => {
		const bar = barFor(makeGame('nfl-1', 'nfl', '2026-09-13T17:00:00Z'));
		const run = bar.endMs - bar.startMs;
		expect(leverage(bar, bar.startMs + run * 0.48)).toBe(0);
	});

	test('baseball has no dead zone at all, because it has no clock to stop', () => {
		const bar = barFor(makeGame('mlb-1', 'mlb', '2026-09-13T17:00:00Z'));
		const run = bar.endMs - bar.startMs;
		for (let f = 0.05; f < 1; f += 0.05) {
			expect(leverage(bar, bar.startMs + run * f)).toBeGreaterThan(0);
		}
	});

	test('every sport peaks at the end rather than the start', () => {
		for (const league of ['nfl', 'nba', 'ncaab', 'mlb', 'csoft', 'nhl', 'epl'] as LeagueId[]) {
			const bar = barFor(makeGame(`${league}-1`, league, '2026-09-13T17:00:00Z'));
			const run = bar.endMs - bar.startMs;
			expect(leverage(bar, bar.endMs)).toBeGreaterThan(leverage(bar, bar.startMs + run * 0.05));
		}
	});
});

describe('a live bar', () => {
	test('never ends behind the now line, however long the game has run', () => {
		const now = at('2026-09-13T23:30:00Z');
		// Kicked off six and a half hours ago: a rain delay, or a hockey game in double overtime.
		const game = makeGame('nfl-1', 'nfl', '2026-09-13T17:00:00Z', { status: 'in' });
		const bar = barFor(game, false, now);
		expect(bar.endMs).toBeGreaterThanOrEqual(now + liveBarFloorMs);
	});

	// Three hours in and only through the third quarter: the schedule said 8:15, but a quarter and a
	// bit is still to be played.
	test('runs a slow game past its slot by what regulation has left', () => {
		const now = at('2026-09-13T20:00:00Z');
		const game = makeGame('nfl-1', 'nfl', '2026-09-13T17:00:00Z', { status: 'in', period: 3, clockSeconds: 300 });
		const left = 195 * (1 - (2 + 600 / 900) / 4);
		expect(barFor(game, false, now).endMs).toBeCloseTo(now + left * 60_000, -3);
		expect(barFor(game, false, now).endMs).toBeGreaterThan(at('2026-09-13T17:00:00Z') + 195 * 60_000);
	});

	test('pulls a quick game in ahead of its slot', () => {
		const now = at('2026-09-13T19:00:00Z');
		const game = makeGame('mlb-1', 'mlb', '2026-09-13T17:00:00Z', { status: 'in', period: 8, topOfInning: false });
		const estimate = at('2026-09-13T17:00:00Z') + resolveRunMinutes(game).bar * 60_000;
		expect(barFor(game, false, now).endMs).toBeLessThan(estimate);
	});

	test('a scheduled game is not extended, so the floor cannot pull a whole slate forward', () => {
		const now = at('2026-09-13T23:30:00Z');
		const game = makeGame('nfl-1', 'nfl', '2026-09-13T17:00:00Z');
		expect(barFor(game, false, now).endMs).toBe(at('2026-09-13T17:00:00Z') + 195 * 60_000);
	});

	test('a game with no start time yields no bar rather than one at the epoch', () => {
		const game = makeGame('nfl-1', 'nfl', '2026-09-13T17:00:00Z');
		delete (game as { startTime?: string }).startTime;
		expect(buildBar(game, false, Date.now())).toBeNull();
	});
});

describe('a final', () => {
	const game = makeGame('nba-1', 'nba', '2026-09-13T17:00:00Z', { status: 'post' });
	const estimate = at('2026-09-13T17:00:00Z') + resolveRunMinutes(game).bar * 60_000;

	test('ends where it actually ended', () => {
		const endedAt = at('2026-09-13T20:10:00Z');
		const bar = buildBar(game, false, Date.now(), endedAt);
		expect(bar?.endMs).toBe(endedAt);
		expect(bar?.endIsActual).toBe(true);
	});

	test('keeps its estimate when nobody saw it end', () => {
		const bar = buildBar(game, false, Date.now());
		expect(bar?.endMs).toBe(estimate);
		expect(bar?.endIsActual).toBeUndefined();
	});

	test('ignores an end time that lands before the start', () => {
		expect(buildBar(game, false, Date.now(), at('2026-09-13T16:00:00Z'))?.endMs).toBe(estimate);
	});

	// A stamp belongs to a final. One left over on a game ESPN has since put back in play means nothing.
	test('ignores an end time on a game that is not final', () => {
		const live = makeGame('nba-1', 'nba', '2026-09-13T17:00:00Z', { status: 'in', period: 2, clockSeconds: 300 });
		expect(buildBar(live, false, at('2026-09-13T18:00:00Z'), at('2026-09-13T18:30:00Z'))?.endIsActual).toBeUndefined();
	});

	test('is running right up to a known end and not a moment after', () => {
		const endedAt = at('2026-09-13T19:05:00Z');
		const bar = buildBar(game, false, Date.now(), endedAt)!;
		expect(occupancy(bar, endedAt - 60_000)).toBe(1);
		expect(occupancy(bar, endedAt)).toBe(0);
	});
});

describe('the best-time band', () => {
	const now = at('2026-09-13T12:00:00Z');
	// An NFL Sunday: nine one o'clock kickoffs against four late ones. Raw concurrency peaks in the
	// late window, when the most bars overlap; leverage-weighted concurrency peaks earlier, when the
	// nine early games are all in the fourth quarter at once.
	const nflSunday = () => {
		const bars = [];
		for (let i = 0; i < 9; i += 1) {
			bars.push(barFor(makeGame(`early-${i}`, 'nfl', '2026-09-13T17:00:00Z'), false, now));
		}
		for (let i = 0; i < 4; i += 1) {
			bars.push(barFor(makeGame(`late-${i}`, 'nfl', '2026-09-13T20:25:00Z'), false, now));
		}
		return bars;
	};

	const options = { weightFavorites: false, favoriteBonusPoints: 10 };

	test('lands on the leverage-weighted peak, not the moment the most bars overlap', () => {
		const { band } = buildHeatCurve(nflSunday(), options);
		expect(band).not.toBeNull();

		// The raw-count peak is the instant the late window has started and the early games have
		// not yet ended. A band that cannot tell the two apart is measuring nothing, so this pins
		// the distance between them rather than only the answer.
		const rawPeak = at('2026-09-13T20:25:00Z');
		expect(band!.peakMs).toBeLessThan(rawPeak);
		expect(rawPeak - band!.peakMs).toBeGreaterThan(20 * 60_000);
	});

	test('reports the number of games actually running at the peak', () => {
		const { band } = buildHeatCurve(nflSunday(), options);
		expect(band!.gameCount).toBeGreaterThan(0);
		expect(band!.gameCount).toBeLessThanOrEqual(13);
	});

	test('is a window rather than a single instant', () => {
		const { band } = buildHeatCurve(nflSunday(), options);
		expect(band!.toMs).toBeGreaterThan(band!.fromMs);
	});

	// Bar lengths are ~p75 estimates with tens of minutes of spread in them, so a knife-edge peak
	// must not be reported as a ten-minute window — that is arithmetic precision the inputs cannot
	// support. A sharp peak is exactly what a sparse slate produces.
	test('is never narrower than half an hour, however sharp the peak', () => {
		const sparse = [
			barFor(makeGame('a', 'nhl', '2026-09-13T23:00:00Z'), false, now),
			barFor(makeGame('b', 'nba', '2026-09-14T01:00:00Z'), false, now),
		];
		const { band } = buildHeatCurve(sparse, options);
		expect(band!.toMs - band!.fromMs).toBeGreaterThanOrEqual(30 * 60_000);
	});

	test('keeps the peak inside the band it widened', () => {
		const sparse = [barFor(makeGame('a', 'nhl', '2026-09-13T23:00:00Z'), false, now)];
		const { band } = buildHeatCurve(sparse, options);
		expect(band!.peakMs).toBeGreaterThanOrEqual(band!.fromMs);
		expect(band!.peakMs).toBeLessThanOrEqual(band!.toMs);
	});

	// Opened at twenty to six, the fourth quarters of the one o'clock games are long over. Telling
	// somebody the best time to watch was two hours ago is not advice.
	test('looks only ahead of the moment it is given', () => {
		const tooLate = at('2026-09-13T21:40:00Z');
		const { band } = buildHeatCurve(nflSunday(), { ...options, notBeforeMs: tooLate });
		expect(band).not.toBeNull();
		expect(band!.fromMs).toBeGreaterThanOrEqual(tooLate);
		expect(band!.peakMs).toBeGreaterThanOrEqual(tooLate);
	});

	test('widens forward rather than back across the moment it is given', () => {
		const sparse = [barFor(makeGame('a', 'nhl', '2026-09-13T23:00:00Z'), false, now)];
		const { band: open } = buildHeatCurve(sparse, options);
		const { band } = buildHeatCurve(sparse, { ...options, notBeforeMs: open!.peakMs });
		expect(band!.fromMs).toBe(open!.peakMs);
		expect(band!.toMs - band!.fromMs).toBeGreaterThanOrEqual(30 * 60_000);
	});

	test('has no band once everything on the slate is over', () => {
		const { band } = buildHeatCurve(nflSunday(), { ...options, notBeforeMs: at('2026-09-14T06:00:00Z') });
		expect(band).toBeNull();
	});

	test('an empty slate yields no band rather than throwing', () => {
		expect(buildHeatCurve([], options)).toEqual({ points: [], band: null });
	});

	test('favourite weighting moves the band on a sparse slate', () => {
		const bars = [
			barFor(makeGame('a', 'nba', '2026-09-13T23:00:00Z'), false, now),
			barFor(makeGame('b', 'nhl', '2026-09-14T02:00:00Z'), true, now),
		];
		const flat = buildHeatCurve(bars, { weightFavorites: false, favoriteBonusPoints: 10 });
		const weighted = buildHeatCurve(bars, { weightFavorites: true, favoriteBonusPoints: 10 });
		expect(weighted.band!.peakMs).not.toBe(flat.band!.peakMs);
		expect(weighted.band!.favoriteCount).toBe(1);
	});

	test('the favourite weighting is inert on a busy slate, which is worth knowing rather than a bug', () => {
		const bars = nflSunday();
		bars[0] = { ...bars[0], isFavorite: true };
		const flat = buildHeatCurve(bars, { weightFavorites: false, favoriteBonusPoints: 10 });
		const weighted = buildHeatCurve(bars, { weightFavorites: true, favoriteBonusPoints: 10 });
		expect(weighted.band!.peakMs).toBe(flat.band!.peakMs);
	});
});
