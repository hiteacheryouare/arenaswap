import type { Game, LeagueId } from '@arenaswap/core/types';
import { leagueConfigs } from '@arenaswap/core/constants';
import { buildBar, type guideBar } from '../entrypoints/guide/guideHeat';
import { groupByDate } from '../entrypoints/popup/popupHelpers';
import { axisBounds, defaultDayKey, fillAxis, groupByLeague, hourMarks, minutesToPx, msToPx, pxPerMinute } from '../entrypoints/guide/guideLayout';

const at = (iso: string) => new Date(iso).getTime();
const now = at('2026-09-13T12:00:00Z');

const makeGame = (id: string, league: LeagueId, startTime: string): Game => ({
	id,
	league,
	sportType: leagueConfigs.find(c => c.id === league)!.sportType,
	homeTeam: { id: `${id}-h`, name: 'Home', abbreviation: 'HOM', score: 0 },
	awayTeam: { id: `${id}-a`, name: 'Away', abbreviation: 'AWY', score: 0 },
	status: 'pre',
	period: 0,
	clockSeconds: 0,
	startTime,
} as Game);

const bar = (id: string, league: LeagueId, startTime: string): guideBar => {
	const built = buildBar(makeGame(id, league, startTime), false, now);
	if (!built) throw new Error('expected a bar');
	return built;
};

describe('axis bounds', () => {
	test('clamp to the slate rather than to midnight, so a 7pm slate does not open on empty grid', () => {
		const bounds = axisBounds([bar('a', 'nba', '2026-09-13T23:00:00Z')]);
		expect(bounds).not.toBeNull();
		expect(bounds!.fromMs).toBe(at('2026-09-13T22:00:00Z'));
	});

	test('snap outward to whole hours at both ends', () => {
		const bounds = axisBounds([bar('a', 'nba', '2026-09-13T23:10:00Z')])!;
		expect(bounds.fromMs % (60 * 60_000)).toBe(0);
		expect(bounds.toMs % (60 * 60_000)).toBe(0);
	});

	test('always contain every bar they were built from', () => {
		const bars = [
			bar('a', 'nfl', '2026-09-13T17:00:00Z'),
			bar('b', 'nba', '2026-09-14T00:30:00Z'),
			bar('c', 'nhl', '2026-09-13T23:00:00Z'),
		];
		const bounds = axisBounds(bars)!;
		for (const b of bars) {
			expect(b.startMs).toBeGreaterThanOrEqual(bounds.fromMs);
			expect(b.endMs).toBeLessThanOrEqual(bounds.toMs);
		}
	});

	test('an empty slate has no axis rather than a zero-width one', () => {
		expect(axisBounds([])).toBeNull();
	});
});

describe('filling the width', () => {
	const bounds = { fromMs: at('2026-09-13T23:00:00Z'), toMs: at('2026-09-14T02:00:00Z') };

	test('runs a short evening out to the edge of the tab in whole hours', () => {
		const filled = fillAxis(bounds, 1000);
		expect(msToPx(filled.toMs, filled.fromMs)).toBeGreaterThanOrEqual(1000);
		expect((filled.toMs - filled.fromMs) % (60 * 60_000)).toBe(0);
		expect(filled.fromMs).toBe(bounds.fromMs);
	});

	test('leaves a day already wider than the tab alone', () => {
		expect(fillAxis(bounds, 200)).toEqual(bounds);
	});
});

describe('the fixed scale', () => {
	// The scale is fixed and the grid scrolls, rather than fitting the day to the viewport. The
	// shortest bar in the whole league table has to stay wide enough to hold two crests and a
	// matchup, which is the reason no narrow-bar variant exists.
	test('the shortest league bar is still wide enough to read a matchup off', () => {
		const shortest = Math.min(...leagueConfigs.map(c => c.runMinutes.bar));
		expect(minutesToPx(shortest)).toBeGreaterThan(200);
	});

	test('an hour is always the same width wherever it falls on the axis', () => {
		const from = at('2026-09-13T12:00:00Z');
		const first = msToPx(at('2026-09-13T13:00:00Z'), from) - msToPx(from, from);
		const later = msToPx(at('2026-09-13T20:00:00Z'), from) - msToPx(at('2026-09-13T19:00:00Z'), from);
		expect(first).toBeCloseTo(later, 9);
		expect(first).toBeCloseTo(60 * pxPerMinute, 9);
	});

	test('hour marks run from one end of the axis to the other inclusive', () => {
		const marks = hourMarks(at('2026-09-13T12:00:00Z'), at('2026-09-13T15:00:00Z'));
		expect(marks).toHaveLength(4);
		expect(marks[0]).toBe(at('2026-09-13T12:00:00Z'));
		expect(marks[3]).toBe(at('2026-09-13T15:00:00Z'));
	});
});

describe('grouping', () => {
	test('orders leagues by the popup display order, not by when they happen to start', () => {
		// NBA is first in leagueConfigs and NHL fourth, so a late NBA game still heads the grid.
		const groups = groupByLeague([
			bar('nhl-1', 'nhl', '2026-09-13T17:00:00Z'),
			bar('nba-1', 'nba', '2026-09-14T02:00:00Z'),
		]);
		expect(groups.map(g => g.league)).toEqual(['nba', 'nhl']);
	});

	test('orders games by start time inside a league', () => {
		const groups = groupByLeague([
			bar('late', 'nfl', '2026-09-13T20:25:00Z'),
			bar('early', 'nfl', '2026-09-13T17:00:00Z'),
		]);
		expect(groups[0]!.bars.map(b => b.game.id)).toEqual(['early', 'late']);
	});

	test('puts every bar in exactly one group', () => {
		const bars = [
			bar('a', 'nfl', '2026-09-13T17:00:00Z'),
			bar('b', 'nfl', '2026-09-13T17:00:00Z'),
			bar('c', 'nba', '2026-09-14T00:00:00Z'),
		];
		const groups = groupByLeague(bars);
		expect(groups.flatMap(g => g.bars)).toHaveLength(bars.length);
		expect(new Set(groups.map(g => g.league)).size).toBe(groups.length);
	});
});

const dayOf = (iso: string) => new Date(iso).toDateString();

// The slate reaches two local days into the past, because that is what the range query does once
// finals are asked for. Opening on the first group therefore opened on a day of old results.
describe('the day the guide opens on', () => {
	const nowMs = at('2026-09-12T15:00:00Z');

	const daysFrom = (...isos: string[]) => groupByDate(
		isos.map((iso, index) => makeGame(`g${index}`, 'nba', iso)),
	);

	test('is today, not the oldest day on the slate', () => {
		const days = daysFrom('2026-09-10T23:00:00Z', '2026-09-11T23:00:00Z', '2026-09-12T23:00:00Z');
		expect(defaultDayKey(days, nowMs)).toBe(dayOf('2026-09-12T23:00:00Z'));
		expect(defaultDayKey(days, nowMs)).not.toBe(days[0]!.key);
	});

	test('is today even when today is the only day', () => {
		const days = daysFrom('2026-09-12T23:00:00Z');
		expect(defaultDayKey(days, nowMs)).toBe(dayOf('2026-09-12T23:00:00Z'));
	});

	test('is the next day with games when nothing is on today', () => {
		const days = daysFrom('2026-09-10T23:00:00Z', '2026-09-14T23:00:00Z');
		expect(defaultDayKey(days, nowMs)).toBe(dayOf('2026-09-14T23:00:00Z'));
	});

	// Only results left. The most recent of them is the one worth opening on, not the oldest.
	test('is the most recent day when every day is in the past', () => {
		const days = daysFrom('2026-09-09T23:00:00Z', '2026-09-10T23:00:00Z', '2026-09-11T23:00:00Z');
		expect(defaultDayKey(days, nowMs)).toBe(dayOf('2026-09-11T23:00:00Z'));
	});

	test('is nothing at all on an empty slate, rather than throwing', () => {
		expect(defaultDayKey([], nowMs)).toBeNull();
	});
});
