import { leagueConfigs } from '@arenaswap/core/constants';
import type { LeagueId } from '@arenaswap/core/types';
import { tileFloor } from '@arenaswap/ui/src/components/boardLayout';
import type { dateGroup } from '../popup/popupHelpers';
import type { guideBar } from './guideHeat';

// Fixed rather than fitting the day to the viewport. A whole NFL Sunday squeezed into 1280px puts a
// two-hour soccer match at 115px, which cannot hold two crests and a matchup, so the axis keeps its
// scale and the grid scrolls instead. At this rate the shortest bar in the table, a 108-minute
// Olympic basketball game, is 227px.
export const pxPerMinute = 2.1;
export const laneHeight = 56;

// Heat is the block's height and nothing else, by the rule the popup sizes its games by: the hottest
// live game is tall, anything at or above the tile floor is medium, the rest are short.
export const blockHeights = { hot: 48, warm: 36, cool: 28 } as const;
export type blockHeat = keyof typeof blockHeights;

// The league column, which stays on screen at every horizontal scroll position. Nothing drawn on the
// grid accounts for it: every x inside the plot is measured from the start of the day, and only the
// canvas width and the opening scroll position add it.
export const gutterPx = 168;

// Two games only share a lane with room between them, so one block never reads as the other's tail.
const laneGapMs = (8 / pxPerMinute) * 60_000;

const hourMs = 60 * 60_000;

export const minutesToPx = (minutes: number): number => minutes * pxPerMinute;
export const msToPx = (ms: number, fromMs: number): number => ((ms - fromMs) / 60_000) * pxPerMinute;

// Clamped to the slate rather than to local midnight. A day whose first game is at 7pm should not
// open on nineteen hours of empty grid.
export const axisBounds = (bars: guideBar[]): { fromMs: number; toMs: number } | null => {
	if (bars.length === 0) return null;
	const earliest = Math.min(...bars.map(b => b.startMs));
	const latest = Math.max(...bars.map(b => b.endMs));
	return {
		fromMs: Math.floor((earliest - 30 * 60_000) / hourMs) * hourMs,
		toMs: Math.ceil((latest + 30 * 60_000) / hourMs) * hourMs,
	};
};

// Runs the axis on past the last game until it fills the width it is drawn in. Whole hours, so the
// last mark still lands on the canvas's own edge.
export const fillAxis = (bounds: { fromMs: number; toMs: number }, minPlotPx: number): { fromMs: number; toMs: number } => {
	const hoursToFill = Math.ceil(minPlotPx / (pxPerMinute * 60));
	return { fromMs: bounds.fromMs, toMs: Math.max(bounds.toMs, bounds.fromMs + hoursToFill * hourMs) };
};

export const hourMarks = (fromMs: number, toMs: number): number[] => {
	const marks: number[] = [];
	for (let t = fromMs; t <= toMs; t += hourMs) marks.push(t);
	return marks;
};

const leagueRank = new Map<LeagueId, number>(leagueConfigs.map((config, index) => [config.id, index]));

export interface guideSlot {
	bar: guideBar;
	lane: number;
	// Where the next game in the same lane starts, which is as far as this one's pinned label may run.
	untilMs: number | null;
}

export interface guideLeagueGroup {
	league: LeagueId;
	// In start-time order, which is also the order the keyboard walks them in.
	slots: guideSlot[];
	laneCount: number;
}

// First fit: each game takes the highest lane that is free by its kickoff, so a league draws as few
// lanes as the day's overlaps need and its name heads the first one.
const packLanes = (bars: guideBar[]): { slots: guideSlot[]; laneCount: number } => {
	const laneEnds: number[] = [];
	const laneOf = bars.map(bar => {
		const free = laneEnds.findIndex(end => bar.startMs >= end + laneGapMs);
		const lane = free === -1 ? laneEnds.length : free;
		laneEnds[lane] = bar.endMs;
		return lane;
	});
	const slots = bars.map((bar, index) => {
		const lane = laneOf[index]!;
		const next = bars.find((other, otherIndex) => otherIndex > index && laneOf[otherIndex] === lane);
		return { bar, lane, untilMs: next?.startMs ?? null };
	});
	return { slots, laneCount: laneEnds.length };
};

// Grouped by league in the popup's own display order, then by start time inside each group.
export const groupByLeague = (bars: guideBar[]): guideLeagueGroup[] => {
	const groups = new Map<LeagueId, guideBar[]>();
	for (const bar of bars) {
		const existing = groups.get(bar.game.league);
		if (existing) existing.push(bar);
		else groups.set(bar.game.league, [bar]);
	}
	return [...groups.entries()]
		.toSorted(([a], [b]) => (leagueRank.get(a) ?? 999) - (leagueRank.get(b) ?? 999))
		.map(([league, groupBars]) => ({
			league,
			...packLanes(groupBars.toSorted((a, b) => a.startMs - b.startMs || a.game.id.localeCompare(b.game.id))),
		}));
};

// Only a live game with a PowerScore has any heat. Ties go to a favourite, then to the earlier kickoff.
export const resolveHeat = (bars: guideBar[], powers: ReadonlyMap<string, number>): Map<string, blockHeat> => {
	const scored = bars.filter(bar => bar.game.status === 'in' && powers.has(bar.game.id));
	const hottest = scored.toSorted((a, b) => (
		(powers.get(b.game.id) ?? 0) - (powers.get(a.game.id) ?? 0)
		|| Number(b.isFavorite) - Number(a.isFavorite)
		|| a.startMs - b.startMs
		|| a.game.id.localeCompare(b.game.id)
	))[0];
	return new Map(bars.map(bar => {
		if (bar === hottest) return [bar.game.id, 'hot'];
		const power = scored.includes(bar) ? powers.get(bar.game.id) ?? 0 : -1;
		return [bar.game.id, power >= tileFloor ? 'warm' : 'cool'];
	}));
};

// Which day the guide opens on. Not simply the first group: the slate reaches two local days into
// the past, because that is what the range query does once finals are asked for, so the earliest
// group is usually a day of results nobody opened the guide to read.
//
// Past days are kept in the list rather than filtered out. A game that kicked off at 11pm yesterday
// and is still running belongs to yesterday by start date, and dropping those days would make a
// live game disappear from the guide entirely.
export const defaultDayKey = (days: dateGroup[], now: number): string | null => {
	const todayKey = new Date(now).toDateString();
	if (days.some(day => day.key === todayKey)) return todayKey;

	// Nothing on today: open on the next day that has something rather than on the last thing that
	// happened.
	const todayStart = new Date(now);
	todayStart.setHours(0, 0, 0, 0);
	const ahead = days.find(day => new Date(day.key).getTime() >= todayStart.getTime());
	if (ahead) return ahead.key;

	// Only results left, so the most recent of them rather than the oldest.
	return days.at(-1)?.key ?? null;
};
