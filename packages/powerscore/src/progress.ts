import { clamp } from './math';
import type { Game, LeagueConfig, SportTypeConfig } from './types';

// Halftime, an intermission, and a delay all mean no play can happen, so nothing about the game
// state is worth scoring until it resumes.
export const isPlayFrozen = (game: Game): boolean => game.intermission === true || game.delayed === true;

export const scoreMargin = (game: Game): number => Math.abs(game.homeTeam.score - game.awayTeam.score);

// Null when the feed reports no clock. Coercing a missing clock to 0 read as the final buzzer on a
// countdown sport — paying the full late-game ceiling — and as kickoff on a count-up one.
export const getClockSecondsRemaining = (
	game: Game,
	sport: SportTypeConfig,
	periodDurationSecs: number,
): number | null => {
	if (typeof game.clockSeconds !== 'number' || !Number.isFinite(game.clockSeconds)) return null;
	const boundedDuration = Math.max(0, periodDurationSecs);
	let rawClock = game.clockSeconds;
	// Soccer's clock is total elapsed time (0'→90'+ without resetting between halves), so completed
	// periods have to come off to get the within-period position.
	if (sport.clockIsFullGameElapsed && (game.period ?? 1) > 1) {
		rawClock = Math.max(0, rawClock - (game.period! - 1) * boundedDuration);
	}
	const boundedClock = clamp(rawClock, 0, boundedDuration);
	return sport.clockCountsUp
		? clamp(boundedDuration - boundedClock, 0, boundedDuration)
		: boundedClock;
};

// 0 at the opening tip, 1 at the end of the final regulation period and during overtime.
export const getGameProgress = (game: Game, sport: SportTypeConfig, league: LeagueConfig): number => {
	if (game.period == null) return 0;
	const regularPeriods = Math.max(1, league.regularPeriods);
	if (game.period > regularPeriods) return 1;

	if (!sport.clockBased) {
		// No game clock, so progress is approximated from the inning, and from the half-inning when
		// the feed reports one: a bottom-of-the-9th walk-off is later than the top of the 9th.
		const halfInning = game.topOfInning == null ? 0.5 : (game.topOfInning ? 0.25 : 0.75);
		return clamp((game.period - 1 + halfInning) / regularPeriods, 0, 1);
	}

	const periodDuration = Math.max(1, league.periodDurationSecs);
	const secsRemaining = getClockSecondsRemaining(game, sport, periodDuration);
	// An unknown clock reads as the period having just started, so it can never inflate progress.
	const elapsedInPeriod = secsRemaining === null
		? 0
		: clamp(periodDuration - secsRemaining, 0, periodDuration);
	const periodsDone = Math.max(0, game.period - 1);
	return clamp((periodsDone + elapsedInPeriod / periodDuration) / regularPeriods, 0, 1);
};

// Elapsed game minutes on a count-up clock (soccer), or null when the clock is unknown.
export const getElapsedMinutes = (game: Game, sport: SportTypeConfig, league: LeagueConfig): number | null => {
	if (typeof game.clockSeconds !== 'number' || !Number.isFinite(game.clockSeconds)) return null;
	if (sport.clockIsFullGameElapsed) return game.clockSeconds / 60;
	const periodDuration = Math.max(1, league.periodDurationSecs);
	const remaining = getClockSecondsRemaining(game, sport, periodDuration) ?? periodDuration;
	return (Math.max(0, (game.period ?? 1) - 1) * periodDuration + (periodDuration - remaining)) / 60;
};
