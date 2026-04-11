import {
	LEAGUE_CONFIG_MAP,
	SPORT_TYPE_CONFIG_MAP,
	SCORER_TUNABLES,
	STALL_THRESHOLD_POLLS,
	STALL_PENALTY_MULTIPLIER,
	SCORE_MAX_CLOSENESS,
	SCORE_MAX_LATE_GAME,
	SCORE_MAX_MOMENTUM,
	SCORE_MAX_LEAD_CHANGES,
	SCORE_MAX_COMEBACK,
	SCORE_MAX_TOTAL,
} from './constants';
import type { SportTypeConfig, ExponentialLateGameCurve, ClockLateGameCurveConfig, BaseballLateGameCurveConfig } from './types';
import type { Game, ScoreSnapshot, PowerScoreResult } from './types';

interface Signal { score: number; reason: string; }

const toFiniteNumber = (value: unknown, fallback = 0): number => (
	typeof value === 'number' && Number.isFinite(value) ? value : fallback
);

const clamp = (value: number, min: number, max: number): number => (
	Math.min(max, Math.max(min, value))
);

export const normalizePowerScoreResult = (
	score: Partial<PowerScoreResult> & Pick<PowerScoreResult, 'gameId'>
): PowerScoreResult => {
	const closeness = clamp(toFiniteNumber(score.closeness), 0, SCORE_MAX_CLOSENESS);
	const lateGame = clamp(toFiniteNumber(score.lateGame), 0, SCORE_MAX_LATE_GAME);
	const momentum = clamp(toFiniteNumber(score.momentum), 0, SCORE_MAX_MOMENTUM);
	const leadChanges = clamp(toFiniteNumber(score.leadChanges), 0, SCORE_MAX_LEAD_CHANGES);
	const comeback = clamp(toFiniteNumber(score.comeback), 0, SCORE_MAX_COMEBACK);
	const rawTotal = closeness + lateGame + momentum + leadChanges + comeback;
	const total = clamp(toFiniteNumber(score.total, rawTotal), 0, SCORE_MAX_TOTAL);

	return {
		gameId: score.gameId,
		total,
		closeness,
		lateGame,
		momentum,
		leadChanges,
		comeback,
		reason: typeof score.reason === 'string' ? score.reason : SCORER_TUNABLES.reasons.fallback,
		stalled: score.stalled === true,
	};
};

const getClosenessUnit = (game: Game): string => (
	SCORER_TUNABLES.reasons.closenessUnitBySportType[game.sportType] ?? SCORER_TUNABLES.reasons.defaultClosenessUnit
);

const getCloseness = (game: Game, config: SportTypeConfig): Signal => {
	const { scores, reasons } = SCORER_TUNABLES;
	const [t1, t2, t3] = config.closenessMargins;
	const margin = Math.abs(game.homeTeam.score - game.awayTeam.score);
	if (game.homeTeam.score === 0 && game.awayTeam.score === 0)
		// reason string intentionally reuses 'tied' — UI label is the same
		return { score: config.zeroZeroAsFullTie ? scores.closeness.tied : scores.closeness.zeroZero, reason: reasons.tied };
	if (margin === 0) return { score: scores.closeness.tied, reason: reasons.tied };
	if (margin <= t1) return { score: scores.closeness.tight, reason: `${margin}-${getClosenessUnit(game)} ${reasons.closenessGameSuffix}` };
	if (margin <= t2) return { score: scores.closeness.close, reason: `${margin}-${getClosenessUnit(game)} ${reasons.closenessGameSuffix}` };
	if (margin <= t3) return { score: scores.closeness.fringe, reason: '' };
	return { score: scores.closeness.none, reason: '' };
};

const formatClock = (seconds: number): string => {
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return `${m}:${String(s).padStart(2, '0')}`;
};

const ordinal = (n: number): string => {
	if (n === 1) return '1st';
	if (n === 2) return '2nd';
	if (n === 3) return '3rd';
	return `${n}th`;
};

interface ClockRegulationProgress {
	progress: number;
	phase: 'none' | 'previous' | 'final';
	secsRemaining: number;
}

const mapExponentialLateGameScore = (
	progress: number,
	curve: ExponentialLateGameCurve,
): number => {
	const normalizedProgress = clamp(progress, 0, 1);
	const minScore = clamp(curve.minScore, 0, SCORE_MAX_LATE_GAME);
	const maxScore = clamp(curve.maxScore, minScore, SCORE_MAX_LATE_GAME);
	const scoreRange = maxScore - minScore;
	if (scoreRange === 0) return maxScore;

	const growthRate = Math.max(0, curve.growthRate);
	const curveProgress = growthRate === 0
		? normalizedProgress
		: (Math.exp(growthRate * normalizedProgress) - 1) / (Math.exp(growthRate) - 1);

	return clamp(Math.round(minScore + (scoreRange * curveProgress)), 0, SCORE_MAX_LATE_GAME);
};

const getClockSecondsRemaining = (
	game: Game,
	config: SportTypeConfig,
	periodDurationSecs: number,
): number => {
	const boundedDuration = Math.max(0, periodDurationSecs);
	const boundedClock = clamp(game.clockSeconds, 0, boundedDuration);
	return config.clockCountsUp
		? clamp(boundedDuration - boundedClock, 0, boundedDuration)
		: boundedClock;
};

const getClockRegulationProgress = (
	game: Game,
	regularPeriods: number,
	periodDurationSecs: number,
	config: SportTypeConfig,
	curve: ClockLateGameCurveConfig,
): ClockRegulationProgress => {
	const secsRemaining = getClockSecondsRemaining(game, config, periodDurationSecs);
	const previousWindowSecs = Math.max(0, curve.previousPeriodWindowSecs);
	const finalWindowSecs = Math.max(0, curve.finalPeriodWindowSecs);
	const totalWindowSecs = previousWindowSecs + finalWindowSecs;

	if (totalWindowSecs <= 0)
		return { progress: 0, phase: 'none', secsRemaining };

	const previousPeriod = regularPeriods - 1;
	if (game.period < previousPeriod)
		return { progress: 0, phase: 'none', secsRemaining };

	if (game.period === previousPeriod) {
		if (previousWindowSecs <= 0 || secsRemaining > previousWindowSecs)
			return { progress: 0, phase: 'none', secsRemaining };

		const elapsedPrevWindow = clamp(previousWindowSecs - secsRemaining, 0, previousWindowSecs);
		return {
			progress: clamp(elapsedPrevWindow / totalWindowSecs, 0, 1),
			phase: 'previous',
			secsRemaining,
		};
	}

	if (game.period === regularPeriods) {
		if (finalWindowSecs <= 0) {
			if (previousWindowSecs <= 0)
				return { progress: 0, phase: 'none', secsRemaining };

			return { progress: 1, phase: 'previous', secsRemaining };
		}

		if (secsRemaining > finalWindowSecs) {
			if (previousWindowSecs <= 0)
				return { progress: 0, phase: 'none', secsRemaining };

			return {
				progress: clamp(previousWindowSecs / totalWindowSecs, 0, 1),
				phase: 'previous',
				secsRemaining,
			};
		}

		const elapsedFinalWindow = clamp(finalWindowSecs - secsRemaining, 0, finalWindowSecs);
		return {
			progress: clamp((previousWindowSecs + elapsedFinalWindow) / totalWindowSecs, 0, 1),
			phase: 'final',
			secsRemaining,
		};
	}

	return { progress: 0, phase: 'none', secsRemaining };
};

const getBaseballRegulationProgress = (
	inning: number,
	curve: BaseballLateGameCurveConfig,
): number | null => {
	if (inning < curve.regulationStartInning) return null;
	const spanInnings = Math.max(1, curve.regulationInnings - curve.regulationStartInning);
	return clamp((inning - curve.regulationStartInning) / spanInnings, 0, 1);
};

const getLateGame = (game: Game, config: SportTypeConfig): Signal => {
	const { scores, reasons } = SCORER_TUNABLES;
	const leagueConfig = LEAGUE_CONFIG_MAP[game.league];
	const regularPeriods = leagueConfig.regularPeriods;
	const { clockBased } = config;

	// Overtime / extra innings
	if (game.period > regularPeriods)
		return { score: scores.lateGame.overtime, reason: clockBased ? reasons.overtime : reasons.extraInnings };

	if (!clockBased) {
		if (config.lateGameCurve.model !== 'baseball')
			return { score: scores.lateGame.none, reason: '' };

		const regulationProgress = getBaseballRegulationProgress(game.period, config.lateGameCurve);
		if (regulationProgress === null)
			return { score: scores.lateGame.none, reason: '' };

		const score = mapExponentialLateGameScore(regulationProgress, config.lateGameCurve.regulationCurve);
		const inning = Math.min(game.period, config.lateGameCurve.regulationInnings);
		const reason = `${ordinal(inning)} ${reasons.inningSuffix}`;
		return { score, reason };
	}

	if (config.lateGameCurve.model !== 'clock')
		return { score: scores.lateGame.none, reason: '' };

	const previousWindowSecs = Math.max(0, config.lateGameCurve.previousPeriodWindowSecs);
	const finalWindowSecs = Math.max(0, config.lateGameCurve.finalPeriodWindowSecs);
	const totalWindowSecs = previousWindowSecs + finalWindowSecs;
	if (totalWindowSecs <= 0)
		return { score: scores.lateGame.none, reason: '' };

	const regulationProgress = getClockRegulationProgress(
		game,
		regularPeriods,
		leagueConfig.periodDurationSecs,
		config,
		config.lateGameCurve,
	);
	if (regulationProgress.phase === 'none')
		return { score: scores.lateGame.none, reason: '' };

	const previousShare = previousWindowSecs / totalWindowSecs;
	if (regulationProgress.phase === 'previous') {
		const previousProgress = previousShare === 0
			? 1
			: clamp(regulationProgress.progress / previousShare, 0, 1);
		const score = mapExponentialLateGameScore(previousProgress, config.lateGameCurve.previousPeriodCurve);
		return { score, reason: '' };
	}

	const finalShare = 1 - previousShare;
	const finalProgress = finalShare <= 0
		? 1
		: clamp((regulationProgress.progress - previousShare) / finalShare, 0, 1);
	const score = mapExponentialLateGameScore(finalProgress, config.lateGameCurve.finalPeriodCurve);
	const reason = finalWindowSecs >= 60
		? `${reasons.underPrefix} ${Math.ceil(finalWindowSecs / 60)} ${reasons.minutesLeftSuffix}`
		: `${formatClock(finalWindowSecs)} ${reasons.clockLeftSuffix}`;

	return { score, reason };
};

const getMomentum = (game: Game, history: ScoreSnapshot[], config: SportTypeConfig): Signal => {
	const { scores, reasons } = SCORER_TUNABLES;
	if (history.length < 3) return { score: 0, reason: '' };

	const oldest = history[0];
	const newest = history[history.length - 1];
	const homeDelta = newest.homeScore - oldest.homeScore;
	const awayDelta = newest.awayScore - oldest.awayScore;
	const run = Math.abs(homeDelta - awayDelta);
	const runTeam = homeDelta > awayDelta ? game.homeTeam.abbreviation : game.awayTeam.abbreviation;

	if (run >= config.momentumBigRun)
		return { score: scores.momentum.bigRun, reason: `${runTeam} ${reasons.momentumRunPrefix} ${run}-0 ${reasons.momentumRunSuffix}` };
	if (run >= config.momentumSmallRun)
		return { score: scores.momentum.smallRun, reason: `${runTeam} ${reasons.momentumRolling}` };
	return { score: scores.momentum.none, reason: '' };
};

const getLeadChanges = (history: ScoreSnapshot[]): Signal => {
	const { scores, reasons } = SCORER_TUNABLES;
	if (history.length < 3) return { score: 0, reason: '' };

	let changes = 0;
	for (let i = 1; i < history.length; i++) {
		const prevDiff = history[i - 1].homeScore - history[i - 1].awayScore;
		const currDiff = history[i].homeScore - history[i].awayScore;
		if (Math.sign(prevDiff) !== Math.sign(currDiff) && !(prevDiff === 0 && currDiff === 0))
			changes++;
	}

	if (changes >= 2) return { score: scores.leadChanges.multiple, reason: reasons.leadChangeMultiple };
	if (changes === 1) return { score: scores.leadChanges.single, reason: reasons.leadChangeSingle };
	return { score: scores.leadChanges.none, reason: '' };
};

const getComeback = (game: Game, history: ScoreSnapshot[], config: SportTypeConfig): Signal => {
	const { scores, reasons } = SCORER_TUNABLES;
	if (history.length < 3) return { score: 0, reason: '' };

	const oldDiff = Math.abs(history[0].homeScore - history[0].awayScore);
	const newDiff = Math.abs(game.homeTeam.score - game.awayTeam.score);
	const shrinkage = oldDiff - newDiff;

	if (shrinkage >= config.comebackThresholdBig) return { score: scores.comeback.big, reason: reasons.comebackBig };
	if (shrinkage >= config.comebackThresholdSmall) return { score: scores.comeback.moderate, reason: reasons.comebackModerate };
	return { score: scores.comeback.none, reason: '' };
};

export const computePowerScore = (
	game: Game,
	history: ScoreSnapshot[],
	stallCount: number = 0,
): PowerScoreResult => {
	if (game.intermission)
		return normalizePowerScoreResult({
			gameId: game.id,
			total: 0,
			closeness: 0,
			lateGame: 0,
			momentum: 0,
			leadChanges: 0,
			comeback: 0,
			reason: '',
			stalled: false,
		});

	const config = SPORT_TYPE_CONFIG_MAP[game.sportType] ?? SPORT_TYPE_CONFIG_MAP.basketball;

	const closeness = getCloseness(game, config);
	const lateGame = getLateGame(game, config);
	const momentum = getMomentum(game, history, config);
	const leadChanges = getLeadChanges(history);
	const comeback = getComeback(game, history, config);

	const stalled = stallCount >= STALL_THRESHOLD_POLLS;
	const rawTotal = closeness.score + lateGame.score + momentum.score + leadChanges.score + comeback.score;
	const total = stalled ? Math.round(rawTotal * STALL_PENALTY_MULTIPLIER) : rawTotal;

	const reason = [momentum.reason, comeback.reason, leadChanges.reason, lateGame.reason, closeness.reason]
		.filter(Boolean)
		.slice(0, 2)
		.join(', ') || SCORER_TUNABLES.reasons.fallback;

	return normalizePowerScoreResult({
		gameId: game.id,
		total,
		closeness: closeness.score,
		lateGame: lateGame.score,
		momentum: momentum.score,
		leadChanges: leadChanges.score,
		comeback: comeback.score,
		reason,
		stalled,
	});
};
