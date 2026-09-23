import {
	pollDormantMaxMs,
	pollHebetudinousHorizonMs,
	pollHebetudinousMaxMs,
	pollIntermissionMs,
	pollMaxEagerMs,
	pollMinEagerMs,
} from './constants';
import type { Game, PowerScoreResult } from './types';

// One request per live game, for a figure that moves on the scale of possessions and is worth at
// most ±5 points — polling it at the scoreboard's rate would multiply request volume for nothing.
export const pollWinProbabilityMs = 60_000;

/* The ramp is unchanged — a score of 0 polls at pollMaxEagerMs and 100 polls at the floor — but the
   floor is now the caller's to supply, because it belongs to whatever ESPN said it would refresh
   this league at rather than to a constant here. Clamped above the floor so a league that reports a
   max-age longer than pollMaxEagerMs is respected instead of inverting the ramp. */
export const computeEagerIntervalMs = (score: number, minIntervalMs: number = pollMinEagerMs): number => {
	const floor = Math.max(0, minIntervalMs);
	const ceiling = Math.max(floor, pollMaxEagerMs);
	const clamped = Math.min(Math.max(score, 0), 100);
	const t = clamped / 100;
	return Math.round(ceiling - t * (ceiling - floor));
};

// The most exciting game in a league sets the pace for the whole league.
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

// The earliest kickoff still ahead of us among games we already hold, which is free — the dateless
// scoreboard carries today's scheduled games on the same payload as the live ones. `null` is "none
// in what we have", which is the question a lookahead answers rather than one this can.
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

/* How long a hebetudinous league sleeps: until it is within the horizon of the kickoff it knows
   about, capped at the ceiling and floored at the dormant beat so this state can never poll faster
   than the one above it. With no kickoff known it is the flat ceiling, which is what an offseason
   costs. */
export const computeHebetudinousIntervalMs = (
	nextStartMs: number | null,
	now: number = Date.now(),
): number => {
	if (nextStartMs === null) return pollHebetudinousMaxMs;
	const untilHorizon = nextStartMs - pollHebetudinousHorizonMs - now;
	return Math.min(pollHebetudinousMaxMs, Math.max(pollDormantMaxMs, untilHorizon));
};
