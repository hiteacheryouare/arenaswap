import type { Game, PowerScoreResult } from './types';

export const pollMinEagerMs = 6_000;
export const pollMaxEagerMs = 25_000;
export const pollIntermissionMs = 40_000;

/**
 * Maps a PowerScore (0–100) to a poll interval via linear interpolation.
 * Higher score = shorter interval (more frequent polling).
 */
export const computeEagerIntervalMs = (score: number): number => {
	const clamped = Math.min(Math.max(score, 0), 100);
	const t = clamped / 100;
	return Math.round(pollMaxEagerMs - t * (pollMaxEagerMs - pollMinEagerMs));
};

/**
 * Computes the next poll interval (ms) for a league given its current live games
 * and the previous poll's PowerScore results.
 *
 * - Returns pollIntermissionMs when every live game is frozen (halftime/intermission
 *   or suspended by a delay).
 * - Returns pollMaxEagerMs when no live games are present (dormant mode handles
 *   the true no-game case separately; this is a fallback).
 * - Otherwise returns computeEagerIntervalMs(bestScore), where bestScore is the
 *   highest total score across all active (non-frozen) games in the league.
 *   The most exciting game in the league sets the pace for the whole league.
 */
export const computeLeagueIntervalMs = (
	liveGames: Game[],
	currentScores: PowerScoreResult[],
): number => {
	if (liveGames.length === 0) return pollMaxEagerMs;

	const activeGames = liveGames.filter(g => !g.intermission && !g.delayed);
	if (activeGames.length === 0) return pollIntermissionMs;

	const bestScore = activeGames.reduce((best, g) => {
		const score = currentScores.find(s => s.gameId === g.id)?.total ?? 0;
		return Math.max(best, score);
	}, 0);

	return computeEagerIntervalMs(bestScore);
};
