import { computeGameProgress } from '@arenaswap/core';
import { leagueConfigMap } from '@arenaswap/core/constants';
import type { Game, LeagueRunMinutes, SportType } from '@arenaswap/core/types';

type leveragePoint = readonly [number, number];

const leverageCurves: Record<SportType | 'ncaam', readonly leveragePoint[]> = {
	football:   [[0, 0.18], [0.45, 0.34], [0.455, 0], [0.515, 0], [0.52, 0.3], [0.72, 0.44], [0.9, 0.95], [1, 1]],
	basketball: [[0, 0.16], [0.44, 0.32], [0.445, 0], [0.53, 0], [0.535, 0.3], [0.77, 0.5], [0.9, 0.95], [1, 1]],
	ncaam:      [[0, 0.16], [0.46, 0.34], [0.465, 0], [0.545, 0], [0.56, 0.55], [0.62, 0.5], [0.855, 0.7], [0.92, 0.97], [1, 1]],
	baseball:   [[0, 0.2], [0.4, 0.3], [0.63, 0.55], [0.76, 0.72], [0.88, 0.95], [1, 1]],
	softball:   [[0, 0.2], [0.4, 0.32], [0.57, 0.55], [0.71, 0.74], [0.85, 0.96], [1, 1]],
	hockey:     [[0, 0.2], [0.25, 0.35], [0.255, 0], [0.37, 0], [0.375, 0.4], [0.64, 0.55], [0.645, 0], [0.76, 0], [0.765, 0.6], [0.94, 0.97], [1, 1]],
	soccer:     [[0, 0.2], [0.42, 0.38], [0.425, 0], [0.545, 0], [0.55, 0.45], [0.68, 0.6], [0.81, 0.82], [0.94, 1], [1, 1]],
};

export const liveBarFloorMs = 10 * 60 * 1000;

const interpolate = (curve: readonly leveragePoint[], x: number): number => {
	const first = curve[0];
	const last = curve[curve.length - 1];
	if (!first || !last) return 0;
	if (x <= first[0]) return first[1];
	if (x >= last[0]) return last[1];
	for (let i = 1; i < curve.length; i += 1) {
		const previous = curve[i - 1];
		const next = curve[i];
		if (!previous || !next) break;
		const [px, py] = previous;
		const [nx, ny] = next;
		if (x <= nx) {
			const span = nx - px;
			return span === 0 ? ny : py + ((ny - py) * (x - px)) / span;
		}
	}
	return last[1];
};

export const resolveRunMinutes = (game: Pick<Game, 'league' | 'isPostseason'>): LeagueRunMinutes => {
	const config = leagueConfigMap[game.league];
	return game.isPostseason && config.knockoutRunMinutes ? config.knockoutRunMinutes : config.runMinutes;
};

const resolveLeverageCurve = (game: Pick<Game, 'league' | 'sportType'>): readonly leveragePoint[] => (
	game.league === 'ncaab' ? leverageCurves.ncaam : leverageCurves[game.sportType]
);

export interface guideBar {
	game: Game;
	startMs: number;
	endMs: number;
	isFavorite: boolean;
	endIsActual?: boolean;
}

export const buildBar = (game: Game, isFavorite: boolean, now: number, endedAt?: number): guideBar | null => {
	if (!game.startTime) return null;
	const startMs = new Date(game.startTime).getTime();
	if (!Number.isFinite(startMs)) return null;

	const runMs = resolveRunMinutes(game).bar * 60_000;
	if (game.status === 'post' && endedAt !== undefined && endedAt > startMs) {
		return { game, startMs, endMs: endedAt, isFavorite, endIsActual: true };
	}
	if (game.status === 'in') {
		const progress = (game.period ?? 0) < 1 ? 0 : computeGameProgress(game);
		const projectedEnd = now + runMs * (1 - progress);
		return { game, startMs, endMs: Math.max(projectedEnd, now + liveBarFloorMs), isFavorite };
	}
	if (game.status === 'post') return { game, startMs, endMs: Math.max(startMs, Math.min(startMs + runMs, now)), isFavorite };
	return { game, startMs, endMs: startMs + runMs, isFavorite };
};

export const occupancy = (bar: guideBar, t: number): number => {
	if (t < bar.startMs) return 0;
	if (bar.endIsActual) return t < bar.endMs ? 1 : 0;
	if (bar.game.status === 'post' && t >= bar.endMs) return 0;
	if (bar.game.status === 'in') {
		if (t <= bar.endMs) return 1;
		const { bar: typical, p99 } = resolveRunMinutes(bar.game);
		const x = (t - bar.endMs) / ((p99 - typical) * 60_000);
		return x >= 1 ? 0 : 1 - x * x * (3 - 2 * x);
	}

	const elapsedMinutes = (t - bar.startMs) / 60_000;
	const { p25, p99 } = resolveRunMinutes(bar.game);
	if (elapsedMinutes <= p25) return 1;
	if (elapsedMinutes >= p99) return 0;
	const x = (elapsedMinutes - p25) / (p99 - p25);
	return 1 - x * x * (3 - 2 * x);
};

export const leverage = (bar: guideBar, t: number): number => {
	const runMs = bar.endMs - bar.startMs;
	if (runMs <= 0) return 0;
	return interpolate(resolveLeverageCurve(bar.game), (t - bar.startMs) / runMs);
};

export interface guideBand {
	fromMs: number;
	toMs: number;
	peakMs: number;
	gameCount: number;
	favoriteCount: number;
}

export interface heatCurveResult {
	points: { t: number; heat: number }[];
	band: guideBand | null;
}

const bandSampleMs = 5 * 60_000;
const lateGameWeight = 0.25;
const bandThreshold = 0.9;
const minBandMs = 30 * 60_000;

interface heatCurveOptions {
	weightFavorites: boolean;
	favoriteBonusPoints: number;
	notBeforeMs?: number;
}

export const buildHeatCurve = (
	bars: guideBar[],
	{ weightFavorites, favoriteBonusPoints, notBeforeMs = -Infinity }: heatCurveOptions,
): heatCurveResult => {
	if (bars.length === 0) return { points: [], band: null };

	const from = Math.max(Math.min(...bars.map(b => b.startMs)), notBeforeMs);
	const to = Math.max(...bars.map(b => b.endMs));
	const weightOf = (bar: guideBar) => (
		weightFavorites && bar.isFavorite ? 1 + favoriteBonusPoints / 10 : 1
	);

	const points: { t: number; heat: number }[] = [];
	for (let t = from; t <= to; t += bandSampleMs) {
		let heat = 0;
		for (const bar of bars) {
			const stakes = 1 - lateGameWeight + lateGameWeight * leverage(bar, t);
			heat += occupancy(bar, t) * stakes * weightOf(bar);
		}
		points.push({ t, heat });
	}

	let peakIndex = 0;
	for (let i = 1; i < points.length; i += 1) {
		if ((points[i]?.heat ?? 0) > (points[peakIndex]?.heat ?? 0)) peakIndex = i;
	}
	const peak = points[peakIndex];
	if (!peak || peak.heat <= 0) return { points, band: null };

	const floor = peak.heat * bandThreshold;
	let startIndex = peakIndex;
	let endIndex = peakIndex;
	while (startIndex > 0 && (points[startIndex - 1]?.heat ?? 0) >= floor) startIndex -= 1;
	while (endIndex < points.length - 1 && (points[endIndex + 1]?.heat ?? 0) >= floor) endIndex += 1;

	const rawFrom = points[startIndex]?.t ?? peak.t;
	const rawTo = points[endIndex]?.t ?? peak.t;
	const shortfall = minBandMs - (rawTo - rawFrom);
	const pad = shortfall > 0 ? shortfall / 2 : 0;
	const fromMs = Math.max(rawFrom - pad, notBeforeMs);
	const toMs = Math.max(rawTo + pad, fromMs + minBandMs);
	const running = bars.filter(bar => bar.startMs <= peak.t && bar.endMs > peak.t);

	return {
		points,
		band: {
			fromMs,
			toMs,
			peakMs: peak.t,
			gameCount: running.length,
			favoriteCount: running.filter(bar => bar.isFavorite).length,
		},
	};
};
