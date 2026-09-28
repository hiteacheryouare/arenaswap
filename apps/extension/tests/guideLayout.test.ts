import type { Game, LeagueId } from '@arenaswap/core/types';
import { leagueConfigs } from '@arenaswap/core/constants';
import { buildBar, type guideBar } from '../entrypoints/guide/guideHeat';
import { groupByDate } from '../entrypoints/popup/popupHelpers';
import { axisBounds, defaultDayKey, fillAxis, groupByLeague, hourMarks, minutesToPx, msToPx, pxPerMinute, resolveHeat } from '../entrypoints/guide/guideLayout';

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

const bar = (id: string, league: LeagueId, startTime: string, overrides: Partial<Game> = {}, isFavorite = false): guideBar => {
	const built = buildBar({ ...makeGame(id, league, startTime), ...overrides }, isFavorite, now);
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

	test('orders games by start time inside a league, which is the order the keyboard walks', () => {
		const groups = groupByLeague([
			bar('late', 'nfl', '2026-09-13T20:25:00Z'),
			bar('early', 'nfl', '2026-09-13T17:00:00Z'),
		]);
		expect(groups[0]!.slots.map(slot => slot.bar.game.id)).toEqual(['early', 'late']);
	});

	test('puts every bar in exactly one group', () => {
		const bars = [
			bar('a', 'nfl', '2026-09-13T17:00:00Z'),
			bar('b', 'nfl', '2026-09-13T17:00:00Z'),
			bar('c', 'nba', '2026-09-14T00:00:00Z'),
		];
		const groups = groupByLeague(bars);
		expect(groups.flatMap(g => g.slots)).toHaveLength(bars.length);
		expect(new Set(groups.map(g => g.league)).size).toBe(groups.length);
	});
});

const overlaps = (a: guideBar, b: guideBar) => a.startMs < b.endMs && b.startMs < a.endMs;

describe('lanes', () => {
	test('gives games that overlap a lane each', () => {
		const [group] = groupByLeague([
			bar('first', 'nba', '2026-09-13T23:00:00Z'),
			bar('second', 'nba', '2026-09-13T23:30:00Z'),
			bar('third', 'nba', '2026-09-14T00:00:00Z'),
		]);
		expect(group!.laneCount).toBe(3);
		expect(group!.slots.map(slot => slot.lane)).toEqual([0, 1, 2]);
	});

	test('puts a game that starts after another has ended back in that lane', () => {
		// An NBA bar runs about two and a half hours, so the 11pm game is clear of both 7pm ones.
		const [group] = groupByLeague([
			bar('early-a', 'nba', '2026-09-13T19:00:00Z'),
			bar('early-b', 'nba', '2026-09-13T19:30:00Z'),
			bar('late', 'nba', '2026-09-13T23:00:00Z'),
		]);
		expect(group!.laneCount).toBe(2);
		expect(group!.slots.find(slot => slot.bar.game.id === 'late')!.lane).toBe(0);
	});

	test('never draws two games that overlap in the same lane, on a full NFL Sunday', () => {
		const bars = [
			...Array.from({ length: 9 }, (_, i) => bar(`early-${i}`, 'nfl', '2026-09-13T17:00:00Z')),
			...Array.from({ length: 4 }, (_, i) => bar(`late-${i}`, 'nfl', '2026-09-13T20:25:00Z')),
			bar('snf', 'nfl', '2026-09-14T00:20:00Z'),
		];
		const [group] = groupByLeague(bars);
		for (const slot of group!.slots) {
			for (const other of group!.slots) {
				if (slot === other || slot.lane !== other.lane) continue;
				expect(overlaps(slot.bar, other.bar)).toBe(false);
			}
		}
		// Nine at once needs nine lanes, and not one more: the later games reuse them.
		expect(group!.laneCount).toBe(9);
	});

	test('leaves room between two games sharing a lane rather than butting them together', () => {
		const first = bar('first', 'nba', '2026-09-13T19:00:00Z');
		const touching = bar('touching', 'nba', new Date(first.endMs).toISOString());
		const [group] = groupByLeague([first, touching]);
		expect(group!.laneCount).toBe(2);
	});

	// The pinned label of a game may run on until the next game in its lane starts, and no further.
	test('tells each game where the next one in its lane begins', () => {
		const [group] = groupByLeague([
			bar('early', 'nba', '2026-09-13T19:00:00Z'),
			bar('overlap', 'nba', '2026-09-13T19:30:00Z'),
			bar('late', 'nba', '2026-09-13T23:00:00Z'),
		]);
		const byId = new Map(group!.slots.map(slot => [slot.bar.game.id, slot]));
		expect(byId.get('early')!.untilMs).toBe(at('2026-09-13T23:00:00Z'));
		expect(byId.get('overlap')!.untilMs).toBeNull();
		expect(byId.get('late')!.untilMs).toBeNull();
	});
});

describe('heat', () => {
	const live = (id: string, start: string) => bar(id, 'nba', start, { status: 'in', period: 3, clockSeconds: 300 });

	test('makes the hottest live game tall, anything at the tile floor medium, and the rest short', () => {
		const bars = [live('hot', '2026-09-13T11:00:00Z'), live('warm', '2026-09-13T11:10:00Z'), live('cool', '2026-09-13T11:20:00Z')];
		const heat = resolveHeat(bars, new Map([['hot', 91], ['warm', 70], ['cool', 69]]));
		expect(Object.fromEntries(heat)).toEqual({ hot: 'hot', warm: 'warm', cool: 'cool' });
	});

	test('gives a game with no PowerScore no heat, however it is doing', () => {
		const bars = [live('scored', '2026-09-13T11:00:00Z'), live('unscored', '2026-09-13T11:10:00Z')];
		const heat = resolveHeat(bars, new Map([['scored', 40]]));
		expect(heat.get('scored')).toBe('hot');
		expect(heat.get('unscored')).toBe('cool');
	});

	test('draws nothing tall before the scores have arrived', () => {
		const heat = resolveHeat([live('a', '2026-09-13T11:00:00Z'), live('b', '2026-09-13T11:10:00Z')], new Map());
		expect([...heat.values()]).toEqual(['cool', 'cool']);
	});

	// A final's last PowerScore can still be in the popup's state, and a scheduled game has none.
	test('keeps finished and scheduled games short whatever score they carry', () => {
		const bars = [
			bar('final', 'nba', '2026-09-13T08:00:00Z', { status: 'post' }),
			bar('later', 'nba', '2026-09-13T20:00:00Z'),
			live('live', '2026-09-13T11:00:00Z'),
		];
		const heat = resolveHeat(bars, new Map([['final', 95], ['later', 90], ['live', 30]]));
		expect(heat.get('final')).toBe('cool');
		expect(heat.get('later')).toBe('cool');
		expect(heat.get('live')).toBe('hot');
	});

	test('breaks a tie for the tall block in favour of a favourite, then the earlier kickoff', () => {
		const plain = live('plain', '2026-09-13T10:00:00Z');
		const favorite = bar('favorite', 'nba', '2026-09-13T11:00:00Z', { status: 'in', period: 3, clockSeconds: 300 }, true);
		expect(resolveHeat([plain, favorite], new Map([['plain', 80], ['favorite', 80]])).get('favorite')).toBe('hot');
		const later = live('later', '2026-09-13T11:00:00Z');
		expect(resolveHeat([later, plain], new Map([['plain', 80], ['later', 80]])).get('plain')).toBe('hot');
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
