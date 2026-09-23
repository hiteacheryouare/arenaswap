import { computeGameProgress } from '@arenaswap/core';
import { leagueConfigMap } from '@arenaswap/core/constants';
import type { Game, LeagueRunMinutes, SportType } from '@arenaswap/core/types';

// How much of the good part of a game is happening at a given fraction of its run, as
// [fraction, value] pairs read piecewise-linearly. This is what makes late afternoon on an NFL
// Sunday beat one o'clock: nine games in the fourth quarter beats nine games in the first.
//
// Dead zones sit at a hard zero rather than at a low point on a smooth ramp. Nearly a quarter of a
// hockey broadcast is intermission, and a curve that smooths through that is lying about a fifth of
// the game.
type leveragePoint = readonly [number, number];

const leverageCurves: Record<SportType | 'ncaam', readonly leveragePoint[]> = {
	football:   [[0, 0.18], [0.45, 0.34], [0.455, 0], [0.515, 0], [0.52, 0.3], [0.72, 0.44], [0.9, 0.95], [1, 1]],
	basketball: [[0, 0.16], [0.44, 0.32], [0.445, 0], [0.53, 0], [0.535, 0.3], [0.77, 0.5], [0.9, 0.95], [1, 1]],
	// College men's play halves, so there is no fourth quarter to ramp from — but a 20-minute half
	// with no reset means a game can be decided at 0.6.
	ncaam:      [[0, 0.16], [0.46, 0.34], [0.465, 0], [0.545, 0], [0.56, 0.55], [0.62, 0.5], [0.855, 0.7], [0.92, 0.97], [1, 1]],
	// No clock and genuinely spiky leverage, so this is the weakest approximation of the seven.
	// The 7th starts at 0.63, the 9th at 0.88.
	baseball:   [[0, 0.2], [0.4, 0.3], [0.63, 0.55], [0.76, 0.72], [0.88, 0.95], [1, 1]],
	softball:   [[0, 0.2], [0.4, 0.32], [0.57, 0.55], [0.71, 0.74], [0.85, 0.96], [1, 1]],
	hockey:     [[0, 0.2], [0.25, 0.35], [0.255, 0], [0.37, 0], [0.375, 0.4], [0.64, 0.55], [0.645, 0], [0.76, 0], [0.765, 0.6], [0.94, 0.97], [1, 1]],
	soccer:     [[0, 0.2], [0.42, 0.38], [0.425, 0], [0.545, 0], [0.55, 0.45], [0.68, 0.6], [0.81, 0.82], [0.94, 1], [1, 1]],
};

// A live game's bar is never allowed to end behind the now line. The projection below already runs
// it out to the end of regulation, but overtime, a rain delay and a knockout going to penalties all
// sit past that, and this one rule covers them without any per-sport extrapolation. It is always
// wrong in the safe direction, which matters because with no live colour on a bar, crossing the now
// line is the only thing saying the game is still on.
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

// NCAA men's basketball plays halves rather than quarters, which changes where leverage lives, so it
// is the one league that does not resolve to its sport's curve.
const resolveLeverageCurve = (game: Pick<Game, 'league' | 'sportType'>): readonly leveragePoint[] => (
	game.league === 'ncaab' ? leverageCurves.ncaam : leverageCurves[game.sportType]
);

export interface guideBar {
	game: Game;
	startMs: number;
	endMs: number;
	isFavorite: boolean;
	// Set only on a final whose end was seen or published, rather than estimated.
	endIsActual?: boolean;
}

// A final ends where it actually ended when that is known, and at its estimate when it is not. A live
// game ends a typical game's worth of what regulation has left after now, which is what stretches a
// slow one past its slot and pulls a quick one in, rather than drawing both at the schedule.
export const buildBar = (game: Game, isFavorite: boolean, now: number, endedAt?: number): guideBar | null => {
	if (!game.startTime) return null;
	const startMs = new Date(game.startTime).getTime();
	if (!Number.isFinite(startMs)) return null;

	const runMs = resolveRunMinutes(game).bar * 60_000;
	if (game.status === 'post' && endedAt !== undefined && endedAt > startMs) {
		return { game, startMs, endMs: endedAt, isFavorite, endIsActual: true };
	}
	if (game.status === 'in') {
		const projectedEnd = now + runMs * (1 - computeGameProgress(game));
		return { game, startMs, endMs: Math.max(projectedEnd, now + liveBarFloorMs), isFavorite };
	}
	return { game, startMs, endMs: startMs + runMs, isFavorite };
};

// The probability the game is still running at `t`: flat to p25, then a smoothstep taper to p99.
// Summing survival probabilities rather than thresholding on the drawn bar is what gives a smooth
// curve instead of a staircase that drops by nine the moment the one o'clock window nominally ends.
//
// A final with a known end is simply on until then. A live game's bar is already a projection
// from where it stands, so the taper hangs off the end of the bar rather than off the start time.
export const occupancy = (bar: guideBar, t: number): number => {
	if (t < bar.startMs) return 0;
	if (bar.endIsActual) return t < bar.endMs ? 1 : 0;
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
// The band is every moment within 10% of the day's peak, rather than the single instant of it.
const bandThreshold = 0.9;
// And never narrower than this, however sharp the peak. Bar lengths are ~p75 estimates with tens of
// minutes of spread in them, so a ten-minute band is arithmetic precision the inputs cannot support
// — it reads as "be watching at 3:55" when what is true is "late afternoon is the good part".
const minBandMs = 30 * 60_000;

interface heatCurveOptions {
	weightFavorites: boolean;
	favoriteBonusPoints: number;
	// Today's page passes the present, so the band is the best of what is left rather than the best
	// of a day that is mostly behind the reader.
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
		for (const bar of bars) heat += occupancy(bar, t) * leverage(bar, t) * weightOf(bar);
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
