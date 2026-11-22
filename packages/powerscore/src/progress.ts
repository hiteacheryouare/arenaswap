import { clamp } from './math';
import type { Game, GameClockState, LeagueConfig, SportTypeConfig } from './types';

export const isPlayFrozen = (game: Game<string>): boolean => game.intermission === true || game.delayed === true;

export const scoreMargin = (game: Game<string>): number => Math.abs(game.homeTeam.score - game.awayTeam.score);

export const getClockSecondsRemaining = (
	game: GameClockState,
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

export const getGameProgress = (game: GameClockState, sport: SportTypeConfig, league: LeagueConfig): number => {
	if (game.period == null) return 0;
	const regularPeriods = Math.max(1, league.regularPeriods);
	if (game.period > regularPeriods) return 1;

	if (!sport.clockBased) {
		const halfInning = game.topOfInning == null ? 0.5 : (game.topOfInning ? 0.25 : 0.75);
		return clamp((game.period - 1 + halfInning) / regularPeriods, 0, 1);
	}

	const periodDuration = Math.max(1, league.periodDurationSecs);
	const secsRemaining = getClockSecondsRemaining(game, sport, periodDuration);
	const elapsedInPeriod = secsRemaining === null
		? 0
		: clamp(periodDuration - secsRemaining, 0, periodDuration);
	const periodsDone = Math.max(0, game.period - 1);
	return clamp((periodsDone + elapsedInPeriod / periodDuration) / regularPeriods, 0, 1);
};

const untimedOvertimeShare = 0.05;

// Like getGameProgress, but keeps counting past 1 through overtime and extra innings.
export const getTimelineProgress = (game: GameClockState, sport: SportTypeConfig, league: LeagueConfig): number => {
	if (game.period == null) return 0;
	const regularPeriods = Math.max(1, league.regularPeriods);
	if (game.period <= regularPeriods) return getGameProgress(game, sport, league);

	if (!sport.clockBased) {
		const halfInning = game.topOfInning == null ? 0.5 : (game.topOfInning ? 0.25 : 0.75);
		return (game.period - 1 + halfInning) / regularPeriods;
	}

	const overtimeIndex = game.period - regularPeriods - 1;
	const overtimeSecs = sport.overtimeDurationSecs;
	if (overtimeSecs === undefined || sport.clockIsFullGameElapsed || league.untimedOvertime) return 1 + (overtimeIndex + 0.5) * untimedOvertimeShare;
	const regulationSecs = regularPeriods * Math.max(1, league.periodDurationSecs);
	const secsRemaining = getClockSecondsRemaining(game, sport, overtimeSecs);
	const elapsed = secsRemaining === null ? 0 : overtimeSecs - secsRemaining;
	return 1 + (overtimeIndex * overtimeSecs + elapsed) / regulationSecs;
};

export const getElapsedMinutes = (game: Game<string>, sport: SportTypeConfig, league: LeagueConfig): number | null => {
	if (typeof game.clockSeconds !== 'number' || !Number.isFinite(game.clockSeconds)) return null;
	if (sport.clockIsFullGameElapsed) return game.clockSeconds / 60;
	const periodDuration = Math.max(1, league.periodDurationSecs);
	const remaining = getClockSecondsRemaining(game, sport, periodDuration) ?? periodDuration;
	return (Math.max(0, (game.period ?? 1) - 1) * periodDuration + (periodDuration - remaining)) / 60;
};
