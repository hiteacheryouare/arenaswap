import { leagueConfigs } from '@arenaswap/core/constants';
import type { LeagueId } from '@arenaswap/core/types';
import type { dateGroup } from '../../utils/gameGroups';
import type { guideBar } from './guideHeat';

export const pxPerMinute = 2.1;
export const rowHeight = 30;
export const barHeight = 22;

export const gutterPx = 168;
export const plotWidthOf = (scrollerWidthPx: number) => scrollerWidthPx - gutterPx;
export const nowLinePlotShare = 1 / 3;

const hourMs = 60 * 60_000;

const floorToLocalHour = (ms: number): number => new Date(ms).setMinutes(0, 0, 0);
const ceilToLocalHour = (ms: number): number => {
	const floored = floorToLocalHour(ms);
	return floored === ms ? ms : floored + hourMs;
};

export const minutesToPx = (minutes: number): number => minutes * pxPerMinute;
export const msToPx = (ms: number, fromMs: number): number => ((ms - fromMs) / 60_000) * pxPerMinute;

export const axisBounds = (bars: guideBar[]): { fromMs: number; toMs: number } | null => {
	if (bars.length === 0) return null;
	const earliest = Math.min(...bars.map(b => b.startMs));
	const latest = Math.max(...bars.map(b => b.endMs));
	return {
		fromMs: floorToLocalHour(earliest - 30 * 60_000),
		toMs: ceilToLocalHour(latest + 30 * 60_000),
	};
};

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

export interface guideLeagueGroup {
	league: LeagueId;
	bars: guideBar[];
}

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
			bars: groupBars.toSorted((a, b) => a.startMs - b.startMs || a.game.id.localeCompare(b.game.id)),
		}));
};

export const defaultDayKey = (days: dateGroup[], now: number): string | null => {
	const todayKey = new Date(now).toDateString();
	if (days.some(day => day.key === todayKey)) return todayKey;

	const todayStart = new Date(now);
	todayStart.setHours(0, 0, 0, 0);
	const ahead = days.find(day => new Date(day.key).getTime() >= todayStart.getTime());
	if (ahead) return ahead.key;

	return days.at(-1)?.key ?? null;
};
