import type { Game, PowerScoreResult } from './types';

export const pollMinEagerMs = 6_000;
export const pollMaxEagerMs = 25_000;
export const pollIntermissionMs = 40_000;

// One request per live game, for a figure that moves on the scale of possessions and is worth at
// most ±5 points — polling it at the scoreboard's rate would multiply request volume for nothing.
export const pollWinProbabilityMs = 60_000;

export const computeEagerIntervalMs = (score: number): number => {
	const clamped = Math.min(Math.max(score, 0), 100);
	const t = clamped / 100;
	return Math.round(pollMaxEagerMs - t * (pollMaxEagerMs - pollMinEagerMs));
};

// The most exciting game in a league sets the pace for the whole league.
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
