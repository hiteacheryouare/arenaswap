import type { Game, SportType, Team } from './types';

export const pollIntervalMs = 15_000;

export const finalRetentionMs = 24 * 60 * 60 * 1000;

// The feed's scoreboard publishes no completion timestamp, so a final game's wrap is estimated from
// its start plus how long the sport takes on TV.
export const sportWrapAllowanceMs: Record<SportType, number> = {
	football:   3.5  * 60 * 60 * 1000,
	baseball:   3.25 * 60 * 60 * 1000,
	softball:   2.5  * 60 * 60 * 1000,
	basketball: 2.5  * 60 * 60 * 1000,
	hockey:     2.75 * 60 * 60 * 1000,
	soccer:     2.5  * 60 * 60 * 1000,
};

export const estimatedWrapMs = (game: Pick<Game, 'sportType' | 'startTime'>, now: number): number => {
	if (!game.startTime) return now;
	const startMs = new Date(game.startTime).getTime();
	if (!Number.isFinite(startMs)) return now;
	return startMs + (sportWrapAllowanceMs[game.sportType] ?? sportWrapAllowanceMs.basketball);
};

export const isWithinFinalRetention = (
	game: Pick<Game, 'sportType' | 'startTime'>,
	now: number = Date.now(),
): boolean => now - estimatedWrapMs(game, now) <= finalRetentionMs;

export const isPlaceholderTeam = (team: Pick<Team, 'id'>): boolean => team.id.startsWith('-');

export const hasMissedItsWindow = (
	game: Pick<Game, 'status' | 'sportType' | 'startTime' | 'delayed'>,
	now: number = Date.now(),
): boolean => {
	if (game.status !== 'pre') return false;
	const delayAllowance = game.delayed ? (sportWrapAllowanceMs[game.sportType] ?? sportWrapAllowanceMs.basketball) : 0;
	return now > estimatedWrapMs(game, now) + delayAllowance;
};
export const historyWindowMs = 300_000;

export const pollDormantThresholdPolls = 2;
export const pollDormantMinMs = 120_000;
export const pollDormantMaxMs = 180_000;

export const pollHebetudinousHorizonMs = 24 * 60 * 60 * 1000;
export const pollHebetudinousMaxMs = 30 * 60 * 1000;

export const pollLookaheadDays = 7;
export const pollLookaheadTtlMs = 6 * 60 * 60 * 1000;

/* The floor is ESPN's, not ours. The scoreboard answers with `cache-control: max-age=12` and our
   fetch uses the HTTP cache, so a poll inside that window is served the bytes it already has: the
   6s floor this used to hold spent every other request on the hottest game in the product to be
   told nothing. This value is only the assumption made until a response says otherwise —
   `scoreboardRefreshMs` reads the max-age each league actually sent and floors that league there
   instead, so a league ESPN refreshes faster is polled faster without anyone editing this. */
export const pollMinEagerMs = 12_000;
export const pollMaxEagerMs = 25_000;
export const pollIntermissionMs = 40_000;
