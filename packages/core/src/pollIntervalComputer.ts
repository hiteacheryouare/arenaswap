import {
	pollDormantMaxMs,
	pollHebetudinousHorizonMs,
	pollHebetudinousMaxMs,
	pollIntermissionMs,
	pollMaxEagerMs,
	pollMinEagerMs,
} from './constants';
import type { Game, PowerScoreResult } from './types';

export const pollWinProbabilityMs = 60_000;

export const computeEagerIntervalMs = (score: number, minIntervalMs: number = pollMinEagerMs): number => {
	const floor = Math.max(0, minIntervalMs);
	const ceiling = Math.max(floor, pollMaxEagerMs);
	const clamped = Math.min(Math.max(score, 0), 100);
	const t = clamped / 100;
	return Math.round(ceiling - t * (ceiling - floor));
};

export const computeLeagueIntervalMs = (
	liveGames: Game[],
	currentScores: PowerScoreResult[],
	minIntervalMs: number = pollMinEagerMs,
): number => {
	if (liveGames.length === 0) return Math.max(minIntervalMs, pollMaxEagerMs);

	const activeGames = liveGames.filter(g => !g.intermission && !g.delayed);
	if (activeGames.length === 0) return Math.max(minIntervalMs, pollIntermissionMs);

	const bestScore = activeGames.reduce((best, g) => {
		const score = currentScores.find(s => s.gameId === g.id)?.total ?? 0;
		return Math.max(best, score);
	}, 0);

	return computeEagerIntervalMs(bestScore, minIntervalMs);
};

export const earliestUpcomingStartMs = (games: Game[], now: number = Date.now()): number | null => {
	let earliest: number | null = null;
	for (const game of games) {
		if (game.status !== 'pre' || !game.startTime) continue;
		const startMs = new Date(game.startTime).getTime();
		if (!Number.isFinite(startMs) || startMs <= now) continue;
		if (earliest === null || startMs < earliest) earliest = startMs;
	}
	return earliest;
};

export const computeHebetudinousIntervalMs = (
	nextStartMs: number | null,
	now: number = Date.now(),
): number => {
	if (nextStartMs === null) return pollHebetudinousMaxMs;
	const untilHorizon = nextStartMs - pollHebetudinousHorizonMs - now;
	return Math.min(pollHebetudinousMaxMs, Math.max(pollDormantMaxMs, untilHorizon));
};
