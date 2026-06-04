import {
	leagueConfigMap,
	sportTypeConfigMap,
	scorerTunables,
	stallPenaltySteps,
	scoreMaxCloseness,
	scoreMaxLateGame,
	scoreMaxMomentum,
	scoreMaxLeadChanges,
	scoreMaxComeback,
	scoreMaxTotal,
} from './constants';
import type { SportTypeConfig, BaseballLateGameCurveConfig } from './types';
import type { Game, ScoreSnapshot, PowerScoreResult } from './types';

interface Signal { score: number; reason: string; }
interface NormalizePowerScoreOptions { allowTotalOverflow?: boolean; }

const toFiniteNumber = (value: unknown, fallback = 0): number => (
	typeof value === 'number' && Number.isFinite(value) ? value : fallback
);

const clamp = (value: number, min: number, max: number): number => (
	Math.min(max, Math.max(min, value))
);

// Hybrid flat-floor + progress scaling for state-based signals (closeness, comeback).
// A small floor always pays out; the rest of the tier ceiling is gated by how far the game has
// progressed, so early games sit low and tension builds smoothly toward the final buzzer.
const applyProgressFloor = (tierCeiling: number, flatFloor: number, progress: number): number => {
	if (tierCeiling <= 0) return 0;
	const floor = clamp(flatFloor, 0, tierCeiling);
	return Math.round(floor + (tierCeiling - floor) * clamp(progress, 0, 1));
};

export const normalizePowerScoreResult = (
	score: Partial<PowerScoreResult> & Pick<PowerScoreResult, 'gameId'>,
	options: NormalizePowerScoreOptions = {},
): PowerScoreResult => {
	const closeness = clamp(toFiniteNumber(score.closeness), 0, scoreMaxCloseness);
	const lateGame = clamp(toFiniteNumber(score.lateGame), 0, scoreMaxLateGame);
	const momentum = clamp(toFiniteNumber(score.momentum), 0, scoreMaxMomentum);
	const leadChanges = clamp(toFiniteNumber(score.leadChanges), 0, scoreMaxLeadChanges);
	const comeback = clamp(toFiniteNumber(score.comeback), 0, scoreMaxComeback);
	const rawTotal = closeness + lateGame + momentum + leadChanges + comeback;
	const total = options.allowTotalOverflow
		? Math.max(0, toFiniteNumber(score.total, rawTotal))
		: clamp(toFiniteNumber(score.total, rawTotal), 0, scoreMaxTotal);
	const hasBaseTotal = typeof score.baseTotal === 'number' && Number.isFinite(score.baseTotal);
	const hasFavoriteBonus = typeof score.favoriteBonus === 'number' && Number.isFinite(score.favoriteBonus);
	const hasFavoriteTeamCount = typeof score.favoriteTeamCount === 'number' && Number.isFinite(score.favoriteTeamCount);
	const hasGameBoost = typeof score.gameBoost === 'number' && Number.isFinite(score.gameBoost);
	const baseTotal = hasBaseTotal ? clamp(toFiniteNumber(score.baseTotal), 0, scoreMaxTotal) : undefined;
	const favoriteBonus = hasFavoriteBonus ? Math.max(0, Math.round(toFiniteNumber(score.favoriteBonus))) : undefined;
	const favoriteTeamCount = hasFavoriteTeamCount ? Math.max(0, Math.round(toFiniteNumber(score.favoriteTeamCount))) : undefined;
	const gameBoost = hasGameBoost ? Math.max(0, Math.round(toFiniteNumber(score.gameBoost))) : undefined;

	return {
		gameId: score.gameId,
		total,
		closeness,
		lateGame,
		momentum,
		leadChanges,
		comeback,
		reason: typeof score.reason === 'string' ? score.reason : scorerTunables.reasons.fallback,
		stalled: score.stalled === true,
		...(hasBaseTotal ? { baseTotal } : {}),
		...(hasFavoriteBonus ? { favoriteBonus } : {}),
		...(hasFavoriteTeamCount ? { favoriteTeamCount } : {}),
		...(hasGameBoost ? { gameBoost } : {}),
	};
};

const getClosenessUnit = (game: Game): string => (
	scorerTunables.reasons.closenessUnitBySportType[game.sportType] ?? scorerTunables.reasons.defaultClosenessUnit
);

const shouldScoreZeroZeroAsFullTie = (game: Game, config: SportTypeConfig): boolean => (
	config.zeroZeroAsFullTie && config.zeroZeroPenaltyPeriods?.includes(game.period) !== true
);

const getCloseness = (game: Game, config: SportTypeConfig, progress: number): Signal => {
	const { scores, reasons } = scorerTunables;
	const [t1, t2, t3] = config.closenessMargins;
	const margin = Math.abs(game.homeTeam.score - game.awayTeam.score);
	const marginReason = `${margin}-${getClosenessUnit(game)} ${reasons.closenessGameSuffix}`;

	let tier: number;
	let reason: string;
	if (game.homeTeam.score === 0 && game.awayTeam.score === 0) {
		// reason string intentionally reuses 'tied' — UI label is the same
		tier = shouldScoreZeroZeroAsFullTie(game, config) ? scores.closeness.tied : scores.closeness.zeroZero;
		reason = reasons.tied;
	} else if (margin === 0) {
		tier = scores.closeness.tied;
		reason = reasons.tied;
	} else if (margin <= t1) {
		tier = scores.closeness.tight;
		reason = marginReason;
	} else if (margin <= t2) {
		tier = scores.closeness.close;
		reason = marginReason;
	} else if (margin <= t3) {
		tier = scores.closeness.fringe;
		reason = '';
	} else {
		tier = scores.closeness.none;
		reason = '';
	}

	return { score: applyProgressFloor(tier, scores.closenessFlatFloor, progress), reason };
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

type LateGamePhase = 'none' | 'previous' | 'final';

// Near-linear late-game ramp. Tension begins at the start of the final period and rises smoothly to
// the OT-edge max (no final-seconds spike); the prior period carries a gentle "touch" of pressure.
const mapLinearLateGame = (phase: LateGamePhase, fraction: number): number => {
	const { lateGame } = scorerTunables.scores;
	const f = clamp(fraction, 0, 1);
	if (phase === 'none') return 0;
	if (phase === 'previous')
		return clamp(Math.round(lateGame.previousPeriodTouch * f), 0, scoreMaxLateGame);
	return clamp(
		Math.round(lateGame.finalPeriodStart + (lateGame.otEdgeMax - lateGame.finalPeriodStart) * f),
		0,
		scoreMaxLateGame,
	);
};

// Tied games telegraph overtime: a ramping boost (otEdgeMax → overtime) in the final-period window.
// Clock sports only; disabled when otPreBoostWindowSecs is 0 (e.g. clockless baseball).
const getOtPreBoost = (game: Game, config: SportTypeConfig, secsRemaining: number): number => {
	const window = Math.max(0, config.otPreBoostWindowSecs);
	if (window <= 0) return 0;
	if (game.homeTeam.score !== game.awayTeam.score) return 0;
	if (secsRemaining > window) return 0;
	const ramp = clamp((window - secsRemaining) / window, 0, 1);
	return Math.round(scorerTunables.scores.lateGame.otPreBoostMax * ramp);
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

// 0 at the opening tip, 1 at the end of the final regulation period (and during overtime).
// Drives the progress-scaled flat-floor model so a tied game in Q1 scores far lower than in Q4.
const getGameProgress = (game: Game, config: SportTypeConfig): number => {
	const league = leagueConfigMap[game.league];
	const regularPeriods = Math.max(1, league.regularPeriods);
	if (game.period > regularPeriods) return 1;

	if (!config.clockBased) {
		// No game clock (baseball): approximate progress from the inning, mid-inning resolution.
		return clamp((game.period - 1 + 0.5) / regularPeriods, 0, 1);
	}

	const periodDuration = Math.max(1, league.periodDurationSecs);
	const secsRemaining = getClockSecondsRemaining(game, config, periodDuration);
	const elapsedInPeriod = clamp(periodDuration - secsRemaining, 0, periodDuration);
	const periodsDone = Math.max(0, game.period - 1);
	return clamp((periodsDone + elapsedInPeriod / periodDuration) / regularPeriods, 0, 1);
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
	const { scores, reasons } = scorerTunables;
	const leagueConfig = leagueConfigMap[game.league];
	const regularPeriods = leagueConfig.regularPeriods;
	const { clockBased } = config;

	// Overtime / extra innings → reserved top-of-range pressure.
	if (game.period > regularPeriods)
		return { score: scores.lateGame.overtime, reason: clockBased ? reasons.overtime : reasons.extraInnings };

	// Baseball (no clock): near-linear ramp across regulation innings (6th → 9th), reusing the
	// inning-progress helper. Extra innings already returned above.
	if (!clockBased) {
		if (config.lateGameCurve.model !== 'baseball')
			return { score: scores.lateGame.none, reason: '' };

		const regulationProgress = getBaseballRegulationProgress(game.period, config.lateGameCurve);
		if (regulationProgress === null)
			return { score: scores.lateGame.none, reason: '' };

		const score = mapLinearLateGame('final', regulationProgress);
		const inning = Math.min(game.period, config.lateGameCurve.regulationInnings);
		return { score, reason: `${ordinal(inning)} ${reasons.inningSuffix}` };
	}

	// Clock sports: derive the phase from the period and a near-linear fraction from the clock.
	const periodDuration = Math.max(1, leagueConfig.periodDurationSecs);
	const secsRemaining = getClockSecondsRemaining(game, config, periodDuration);
	const elapsedFraction = clamp((periodDuration - secsRemaining) / periodDuration, 0, 1);
	const previousPeriod = regularPeriods - 1;

	if (game.period < previousPeriod)
		return { score: scores.lateGame.none, reason: '' };

	if (game.period < regularPeriods)
		return { score: mapLinearLateGame('previous', elapsedFraction), reason: '' };

	// Final regulation period — whole-period linear ramp plus the tied-game OT pre-boost.
	const rampScore = mapLinearLateGame('final', elapsedFraction);
	const otBoost = getOtPreBoost(game, config, secsRemaining);
	const score = clamp(rampScore + otBoost, 0, scoreMaxLateGame);
	const reason = otBoost > 0
		? reasons.overtimeAnticipation
		: secsRemaining < 60
			? `${formatClock(secsRemaining)} ${reasons.clockLeftSuffix}`
			: `${reasons.underPrefix} ${Math.ceil(secsRemaining / 60)} ${reasons.minutesLeftSuffix}`;

	return { score, reason };
};

const getMomentum = (game: Game, history: ScoreSnapshot[], config: SportTypeConfig): Signal => {
	const { scores, reasons } = scorerTunables;
	if (history.length < 3) return { score: 0, reason: '' };

	const oldest = history[0]!;
	const newest = history[history.length - 1]!;
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
	const { scores, reasons } = scorerTunables;
	if (history.length < 3) return { score: 0, reason: '' };

	let changes = 0;
	for (let i = 1; i < history.length; i++) {
		const prevDiff = history[i - 1]!.homeScore - history[i - 1]!.awayScore;
		const currDiff = history[i]!.homeScore - history[i]!.awayScore;
		if (Math.sign(prevDiff) !== Math.sign(currDiff) && !(prevDiff === 0 && currDiff === 0))
			changes++;
	}

	if (changes >= 2) return { score: scores.leadChanges.multiple, reason: reasons.leadChangeMultiple };
	if (changes === 1) return { score: scores.leadChanges.single, reason: reasons.leadChangeSingle };
	return { score: scores.leadChanges.none, reason: '' };
};

const getComeback = (game: Game, history: ScoreSnapshot[], config: SportTypeConfig, progress: number): Signal => {
	const { scores } = scorerTunables;
	if (history.length < 3) return { score: 0, reason: '' };

	const oldDiff = Math.abs(history[0]!.homeScore - history[0]!.awayScore);
	const newDiff = Math.abs(game.homeTeam.score - game.awayTeam.score);
	const shrinkage = oldDiff - newDiff;

	const trailingTeam = history[0]!.homeScore < history[0]!.awayScore
		? game.homeTeam.abbreviation
		: game.awayTeam.abbreviation;

	let tier: number;
	let reason: string;
	if (shrinkage >= config.comebackThresholdBig) {
		tier = scores.comeback.big;
		reason = `${trailingTeam} cutting into it`;
	} else if (shrinkage >= config.comebackThresholdSmall) {
		tier = scores.comeback.moderate;
		reason = `${trailingTeam} closing the gap`;
	} else {
		return { score: scores.comeback.none, reason: '' };
	}

	return { score: applyProgressFloor(tier, scores.comeback.flatFloor, progress), reason };
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

	const config = sportTypeConfigMap[game.sportType] ?? sportTypeConfigMap.basketball;
	const progress = getGameProgress(game, config);

	const closeness = getCloseness(game, config, progress);
	const lateGame = getLateGame(game, config);
	const momentum = getMomentum(game, history, config);
	const leadChanges = getLeadChanges(history);
	const comeback = getComeback(game, history, config, progress);

	const rawTotal = closeness.score + lateGame.score + momentum.score + leadChanges.score + comeback.score;
	const stallStep = stallPenaltySteps.find(s => stallCount >= s.minPolls);
	const stalled = stallStep !== undefined;
	const total = stalled ? Math.round(rawTotal * stallStep.multiplier) : rawTotal;

	const reason = [momentum.reason, comeback.reason, leadChanges.reason, lateGame.reason, closeness.reason]
		.filter(Boolean)
		.slice(0, 2)
		.join(', ') || scorerTunables.reasons.fallback;

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
		...(stalled ? { baseTotal: rawTotal } : {}),
	});
};
