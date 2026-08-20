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
	scoreMaxSignalsSubtotal,
	scoreWinProbVarianceMax,
	scoringOpportunityBaseRunnerBoosts,
	scoringOpportunityRedZoneBoost,
	scoringOpportunityRedZoneFringeBoost,
	redZoneDownMultipliers,
	thirdAndShortDistance,
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

// Published to npm, so an untyped consumer can hand over a league this map has never heard of.
// Falling back to a four-period clock sport keeps the shape rather than throwing, the same way an
// unrecognized sportType falls back to basketball.
const fallbackLeagueConfig = leagueConfigMap.nba;

// Concave (<1) so state signals reach most of their ceiling by mid-game rather than only at the
// final buzzer: a Q1 blowout still scores ~0, a mid-game nail-biter lands in a meaningful range.
const progressCurveExponent = 0.55;

// The floor always pays out; the rest of the tier ceiling is gated by curved game progress.
const applyProgressFloor = (tierCeiling: number, flatFloor: number, progress: number): number => {
	if (tierCeiling <= 0) return 0;
	const floor = clamp(flatFloor, 0, tierCeiling);
	const curvedProgress = Math.pow(clamp(progress, 0, 1), progressCurveExponent);
	return Math.round(floor + (tierCeiling - floor) * curvedProgress);
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
	const hasWinProbVariance = typeof score.winProbabilityVariance === 'number' && Number.isFinite(score.winProbabilityVariance);
	const winProbabilityVariance = hasWinProbVariance
		? clamp(Math.round(toFiniteNumber(score.winProbabilityVariance)), -scoreWinProbVarianceMax, scoreWinProbVarianceMax)
		: undefined;
	const hasStallPenalty = typeof score.stallPenalty === 'number' && Number.isFinite(score.stallPenalty);
	const stallPenalty = hasStallPenalty ? Math.max(0, Math.round(toFiniteNumber(score.stallPenalty))) : undefined;
	const clampedSignalsSum = closeness + lateGame + momentum + leadChanges + comeback;
	// The fallback subtracts the penalty. Falling back to the bare signal sum handed a stalled game
	// back every point the penalty had removed, any time `total` arrived non-finite.
	const totalFallback = Math.max(0, clampedSignalsSum - (stallPenalty ?? 0));
	const total = options.allowTotalOverflow
		? Math.max(0, toFiniteNumber(score.total, totalFallback))
		: clamp(toFiniteNumber(score.total, totalFallback), 0, scoreMaxTotal);
	const hasSignalsSubtotal = typeof score.signalsSubtotal === 'number' && Number.isFinite(score.signalsSubtotal);
	const hasFavoriteBonus = typeof score.favoriteBonus === 'number' && Number.isFinite(score.favoriteBonus);
	const hasFavoriteTeamCount = typeof score.favoriteTeamCount === 'number' && Number.isFinite(score.favoriteTeamCount);
	const hasGameBoost = typeof score.gameBoost === 'number' && Number.isFinite(score.gameBoost);
	const hasScoringOpportunityBoost = typeof score.scoringOpportunityBoost === 'number' && Number.isFinite(score.scoringOpportunityBoost);
	const hasPostseasonBoost = typeof score.postseasonBoost === 'number' && Number.isFinite(score.postseasonBoost);
	// Clamped to the signals ceiling, not scoreMaxTotal: this is the raw pre-cap subtotal the
	// breakdown subtracts the stall penalty from.
	const signalsSubtotal = hasSignalsSubtotal ? clamp(toFiniteNumber(score.signalsSubtotal), 0, scoreMaxSignalsSubtotal) : undefined;
	const favoriteBonus = hasFavoriteBonus ? Math.max(0, Math.round(toFiniteNumber(score.favoriteBonus))) : undefined;
	const favoriteTeamCount = hasFavoriteTeamCount ? Math.max(0, Math.round(toFiniteNumber(score.favoriteTeamCount))) : undefined;
	const gameBoost = hasGameBoost ? Math.max(0, Math.round(toFiniteNumber(score.gameBoost))) : undefined;
	const scoringOpportunityBoost = hasScoringOpportunityBoost ? Math.max(0, Math.round(toFiniteNumber(score.scoringOpportunityBoost))) : undefined;
	const postseasonBoost = hasPostseasonBoost ? Math.max(0, Math.round(toFiniteNumber(score.postseasonBoost))) : undefined;

	return {
		gameId: score.gameId,
		total,
		closeness,
		lateGame,
		momentum,
		leadChanges,
		comeback,
		...(hasWinProbVariance ? { winProbabilityVariance } : {}),
		reason: typeof score.reason === 'string' ? score.reason : scorerTunables.reasons.fallback,
		stalled: score.stalled === true,
		...(hasStallPenalty ? { stallPenalty } : {}),
		...(hasSignalsSubtotal ? { signalsSubtotal } : {}),
		...(hasFavoriteBonus ? { favoriteBonus } : {}),
		...(hasFavoriteTeamCount ? { favoriteTeamCount } : {}),
		...(hasGameBoost ? { gameBoost } : {}),
		...(hasScoringOpportunityBoost ? { scoringOpportunityBoost } : {}),
		...(hasPostseasonBoost ? { postseasonBoost } : {}),
	};
};

const getClosenessUnit = (game: Game): string => (
	scorerTunables.reasons.closenessUnitBySportType[game.sportType] ?? scorerTunables.reasons.defaultClosenessUnit
);

const shouldScoreZeroZeroAsFullTie = (game: Game, config: SportTypeConfig): boolean => (
	config.zeroZeroAsFullTie && (game.period == null || config.zeroZeroPenaltyPeriods?.includes(game.period) !== true)
);

const getCloseness = (game: Game, config: SportTypeConfig, progress: number): Signal => {
	const { scores, reasons } = scorerTunables;
	const [t1, t2, t3] = config.closenessMargins;
	const margin = Math.abs(game.homeTeam.score - game.awayTeam.score);
	const marginReason = `${margin}-${getClosenessUnit(game)} ${reasons.closenessGameSuffix}`;

	let tier: number;
	let reason: string;
	if (game.homeTeam.score === 0 && game.awayTeam.score === 0) {
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

// Rises smoothly from the start of the final period to the tier ceiling, with no final-seconds
// spike; the prior period carries a gentle touch.
const mapLinearLateGame = (phase: LateGamePhase, fraction: number, ceiling: number): number => {
	const { lateGame } = scorerTunables.scores;
	const f = clamp(fraction, 0, 1);
	if (phase === 'none') return 0;
	if (phase === 'previous')
		return clamp(Math.round(lateGame.previousPeriodTouch * f), 0, ceiling);
	return clamp(
		Math.round(lateGame.finalPeriodStart + (ceiling - lateGame.finalPeriodStart) * f),
		0,
		ceiling,
	);
};

// Tied games telegraph overtime. Clock sports only; disabled when otPreBoostWindowSecs is 0.
const getOtPreBoost = (game: Game, config: SportTypeConfig, secsRemaining: number): number => {
	const window = Math.max(0, config.otPreBoostWindowSecs);
	if (window <= 0) return 0;
	if (game.homeTeam.score !== game.awayTeam.score) return 0;
	if (secsRemaining > window) return 0;
	const ramp = clamp((window - secsRemaining) / window, 0, 1);
	return Math.round(scorerTunables.scores.lateGame.otPreBoostMax * ramp);
};

// Null when the feed reports no clock. Coercing a missing clock to 0 read as the final buzzer on a
// countdown sport — paying the full late-game ceiling — and as kickoff on a count-up one.
const getClockSecondsRemaining = (
	game: Game,
	config: SportTypeConfig,
	periodDurationSecs: number,
): number | null => {
	if (typeof game.clockSeconds !== 'number' || !Number.isFinite(game.clockSeconds)) return null;
	const boundedDuration = Math.max(0, periodDurationSecs);
	let rawClock = game.clockSeconds;
	// Soccer's clock is total elapsed time — ESPN reports 0'→90'+ without resetting between
	// halves — so completed periods have to come off to get the within-period position.
	if (config.clockIsFullGameElapsed && (game.period ?? 1) > 1) {
		rawClock = Math.max(0, rawClock - (game.period! - 1) * boundedDuration);
	}
	const boundedClock = clamp(rawClock, 0, boundedDuration);
	return config.clockCountsUp
		? clamp(boundedDuration - boundedClock, 0, boundedDuration)
		: boundedClock;
};

// 0 at the opening tip, 1 at the end of the final regulation period and during overtime.
const getGameProgress = (game: Game, config: SportTypeConfig): number => {
	if (game.period == null) return 0;
	const league = leagueConfigMap[game.league] ?? fallbackLeagueConfig;
	const regularPeriods = Math.max(1, league.regularPeriods);
	if (game.period > regularPeriods) return 1;

	if (!config.clockBased) {
		// No game clock, so progress is approximated from the inning, and from the half-inning when
		// the feed reports one: a bottom-of-the-9th walk-off is later than the top of the 9th.
		const halfInning = game.topOfInning == null ? 0.5 : (game.topOfInning ? 0.25 : 0.75);
		return clamp((game.period - 1 + halfInning) / regularPeriods, 0, 1);
	}

	const periodDuration = Math.max(1, league.periodDurationSecs);
	const secsRemaining = getClockSecondsRemaining(game, config, periodDuration);
	// An unknown clock reads as the period having just started, so it can never inflate progress.
	const elapsedInPeriod = secsRemaining === null
		? 0
		: clamp(periodDuration - secsRemaining, 0, periodDuration);
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

// Late-game pressure scales with how close the game is: tied games earn the full closeCeiling,
// fringe games a moderate one, blowouts a small one.
const getLateGameCeiling = (game: Game, config: SportTypeConfig): number => {
	const [, t2, t3] = config.closenessMargins;
	const margin = Math.abs(game.homeTeam.score - game.awayTeam.score);
	const { lateGame } = scorerTunables.scores;
	if (margin <= t2) return lateGame.closeCeiling;
	if (margin <= t3) return lateGame.fringeCeiling;
	return lateGame.blowoutCeiling;
};

// Keyed on sportType the same way the card's period label is: soccer plays two extra-time halves
// and then a shootout, none of which is overtime.
const getOvertimeReason = (game: Game, regularPeriods: number): string => {
	const { reasons } = scorerTunables;
	if (game.sportType !== 'soccer') return reasons.overtime;
	return (game.period ?? 0) - regularPeriods > 2 ? reasons.shootout : reasons.extraTime;
};

// A draw is the ordinary result of a league match, so a level game late is tense without being
// bound for anything.
const getOvertimeAnticipationReason = (game: Game): string => (
	game.sportType === 'soccer'
		? scorerTunables.reasons.drawAnticipation
		: scorerTunables.reasons.overtimeAnticipation
);

// A count-up clock has no countdown to render — soccer's stoppage time is never published ahead of
// time — so it reports elapsed minutes instead of a 0:00 that never arrives.
const getFinalStretchReason = (
	game: Game,
	config: SportTypeConfig,
	periodDurationSecs: number,
	secsRemaining: number,
): string => {
	const { reasons } = scorerTunables;
	if (!config.clockCountsUp) return `${formatClock(secsRemaining)} ${reasons.clockLeftSuffix}`;
	const elapsedSecs = config.clockIsFullGameElapsed
		? Math.max(0, game.clockSeconds ?? 0)
		: Math.max(0, (game.period ?? 1) - 1) * periodDurationSecs + (periodDurationSecs - secsRemaining);
	return `${Math.floor(elapsedSecs / 60)} ${reasons.minutesElapsedSuffix}`;
};

const getLateGame = (game: Game, config: SportTypeConfig): Signal => {
	const { scores, reasons } = scorerTunables;
	if (game.period == null) return { score: scores.lateGame.none, reason: '' };
	const leagueConfig = leagueConfigMap[game.league] ?? fallbackLeagueConfig;
	const regularPeriods = leagueConfig.regularPeriods;
	const { clockBased } = config;

	// Overtime and extra innings only happen from a tie, so they take the top of the range.
	if (game.period > regularPeriods)
		return {
			score: scores.lateGame.overtime,
			reason: clockBased ? getOvertimeReason(game, regularPeriods) : reasons.extraInnings,
		};

	const tierCeiling = getLateGameCeiling(game, config);

	// No clock, so the ramp runs across regulation innings instead.
	if (!clockBased) {
		const curve = config.lateGameCurve;
		if (!curve || curve.model !== 'baseball')
			return { score: scores.lateGame.none, reason: '' };

		const regulationProgress = getBaseballRegulationProgress(game.period, curve);
		if (regulationProgress === null)
			return { score: scores.lateGame.none, reason: '' };

		const score = mapLinearLateGame('final', regulationProgress, tierCeiling);
		const inning = Math.min(game.period, curve.regulationInnings);
		return { score, reason: `${ordinal(inning)} ${reasons.inningSuffix}` };
	}

	const periodDuration = Math.max(1, leagueConfig.periodDurationSecs);
	const secsRemaining = getClockSecondsRemaining(game, config, periodDuration);
	const elapsedFraction = secsRemaining === null
		? 0
		: clamp((periodDuration - secsRemaining) / periodDuration, 0, 1);
	const previousPeriod = regularPeriods - 1;

	if (game.period < previousPeriod)
		return { score: scores.lateGame.none, reason: '' };

	if (game.period < regularPeriods)
		return { score: mapLinearLateGame('previous', elapsedFraction, tierCeiling), reason: '' };

	const rampScore = mapLinearLateGame('final', elapsedFraction, tierCeiling);
	// An unknown clock cannot place the game inside the pre-overtime window, and there is no clock
	// position worth reporting, so the ramp holds where the period started.
	if (secsRemaining === null) return { score: rampScore, reason: '' };

	const otBoost = getOtPreBoost(game, config, secsRemaining);
	const score = clamp(rampScore + otBoost, 0, scoreMaxLateGame);
	const reason = otBoost > 0
		? getOvertimeAnticipationReason(game)
		: secsRemaining < 60
			? getFinalStretchReason(game, config, periodDuration, secsRemaining)
			: `${reasons.underPrefix} ${Math.ceil(secsRemaining / 60)} ${reasons.minutesLeftSuffix}`;

	return { score, reason };
};

// Event ages are measured against the newest snapshot, not wall-clock now.
const deriveNow = (history: ScoreSnapshot[]): number => (
	history.length > 0 ? history[history.length - 1]!.timestamp : 0
);

// A null event timestamp (never happened) ages to Infinity, giving a factor of 0.
const decayFactor = (ageMs: number, halfLifeMs: number): number => {
	if (ageMs <= 0) return 1;
	if (halfLifeMs <= 0) return 0;
	return Math.pow(0.5, ageMs / halfLifeMs);
};

const ageSince = (timestamp: number | null, now: number): number => (
	timestamp === null ? Infinity : Math.max(0, now - timestamp)
);

const lastScoreChangeTimestamp = (history: ScoreSnapshot[]): number | null => {
	for (let i = history.length - 1; i >= 1; i--) {
		const cur = history[i]!;
		const prev = history[i - 1]!;
		if (cur.homeScore !== prev.homeScore || cur.awayScore !== prev.awayScore)
			return cur.timestamp;
	}
	return null;
};

// Ties are skipped rather than treated as their own sign. Comparing adjacent signs counted an
// ordinary "behind, level, ahead" sequence as two lead changes when it is one.
const findLeadChanges = (history: ScoreSnapshot[]): { count: number; lastTimestamp: number | null } => {
	let count = 0;
	let lastTimestamp: number | null = null;
	let lastLeadSign = 0;
	for (const snapshot of history) {
		const sign = Math.sign(snapshot.homeScore - snapshot.awayScore);
		if (sign === 0) continue;
		if (lastLeadSign !== 0 && sign !== lastLeadSign) {
			count++;
			lastTimestamp = snapshot.timestamp;
		}
		lastLeadSign = sign;
	}
	return { count, lastTimestamp };
};

// Clears the reason once the value fades to nothing.
const decaySignal = (tier: number, reason: string, ageMs: number, halfLifeMs: number): Signal => {
	const score = Math.round(tier * decayFactor(ageMs, halfLifeMs));
	return score <= 0 ? { score: 0, reason: '' } : { score, reason };
};

const getMomentum = (game: Game, history: ScoreSnapshot[], config: SportTypeConfig, now: number): Signal => {
	const { scores, reasons } = scorerTunables;
	if (history.length < 3) return { score: 0, reason: '' };

	const oldest = history[0]!;
	const newest = history[history.length - 1]!;
	const homeDelta = newest.homeScore - oldest.homeScore;
	const awayDelta = newest.awayScore - oldest.awayScore;
	const run = Math.abs(homeDelta - awayDelta);
	const homeIsRunning = homeDelta > awayDelta;
	const runTeam = homeIsRunning
		? (game.homeTeam.abbreviation ?? '?')
		: (game.awayTeam.abbreviation ?? '?');
	const chasingTeam = homeIsRunning
		? (game.awayTeam.abbreviation ?? '?')
		: (game.homeTeam.abbreviation ?? '?');

	let tier: number;
	let reason: string;
	if (run >= config.momentumBigRun) {
		tier = scores.momentum.bigRun;
		// `run` is the differential, not an unanswered streak, so both scores are named. Rendering it
		// as "8-0" claimed a shutout that a 10-2 stretch never was.
		const scoredFor = Math.max(homeDelta, awayDelta);
		const scoredAgainst = Math.max(0, Math.min(homeDelta, awayDelta));
		reason = `${runTeam} ${reasons.momentumOutscoring} ${chasingTeam} ${scoredFor}-${scoredAgainst}`;
	} else if (run >= config.momentumSmallRun) {
		tier = scores.momentum.smallRun;
		reason = `${runTeam} ${reasons.momentumRolling}`;
	} else {
		return { score: scores.momentum.none, reason: '' };
	}

	const ageMs = ageSince(lastScoreChangeTimestamp(history), now);
	return decaySignal(tier, reason, ageMs, config.decayHalfLifeMs.momentum);
};

const getLeadChanges = (history: ScoreSnapshot[], config: SportTypeConfig, now: number): Signal => {
	const { scores, reasons } = scorerTunables;
	if (history.length < 3) return { score: 0, reason: '' };

	const { count, lastTimestamp } = findLeadChanges(history);
	let tier: number;
	let reason: string;
	if (count >= 2) {
		tier = scores.leadChanges.multiple;
		reason = reasons.leadChangeMultiple;
	} else if (count === 1) {
		tier = scores.leadChanges.single;
		reason = reasons.leadChangeSingle;
	} else {
		return { score: scores.leadChanges.none, reason: '' };
	}

	const ageMs = ageSince(lastTimestamp, now);
	return decaySignal(tier, reason, ageMs, config.decayHalfLifeMs.leadChange);
};

const getComeback = (game: Game, history: ScoreSnapshot[], config: SportTypeConfig, progress: number, now: number): Signal => {
	const { scores } = scorerTunables;
	if (history.length < 3) return { score: 0, reason: '' };

	const oldDiff = Math.abs(history[0]!.homeScore - history[0]!.awayScore);
	const newDiff = Math.abs(game.homeTeam.score - game.awayTeam.score);
	const shrinkage = oldDiff - newDiff;

	const trailingTeam = history[0]!.homeScore < history[0]!.awayScore
		? (game.homeTeam.abbreviation ?? '?')
		: (game.awayTeam.abbreviation ?? '?');

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

	// Progress-scaled first, since a late rally matters more, then faded with the cluster.
	const floored = applyProgressFloor(tier, scores.comeback.flatFloor, progress);
	const ageMs = ageSince(lastScoreChangeTimestamp(history), now);
	return decaySignal(floored, reason, ageMs, config.decayHalfLifeMs.comeback);
};

// Despite the name, this measures mean absolute distance from 50%, not variance. Known limitation:
// a line oscillating between 10% and 90% scores the same penalty as a steady 90% blowout. Capturing
// swing instead would mean summing |pᵢ − pᵢ₋₁|, a different signal and a recalibration.
export const computeWinProbVarianceScore = (winProbHistory: number[]): number | undefined => {
	const { maxAvgDist, minDataPoints } = scorerTunables.scores.winProbabilityVariance;
	// A single non-finite entry from a partial feed used to poison the average, and the resulting
	// NaN total then fell back to the pre-penalty signal sum.
	const samples = winProbHistory.filter(p => typeof p === 'number' && Number.isFinite(p));
	if (samples.length < minDataPoints) return undefined;
	const avgDistFromMid = samples.reduce((sum, p) => sum + Math.abs(p - 0.5), 0) / samples.length;
	const raw = scoreWinProbVarianceMax - (avgDistFromMid / maxAvgDist) * 2 * scoreWinProbVarianceMax;
	return Math.round(clamp(raw, -scoreWinProbVarianceMax, scoreWinProbVarianceMax));
};

// An unknown down — ESPN between plays, or a feed that doesn't report one — falls through to
// `other`, so a missing field costs the boost its bonus rather than the whole thing.
const getRedZoneDownMultiplier = (game: Game): number => {
	if (game.down === 4) {
		return game.isGoalToGo ? redZoneDownMultipliers.fourthDownGoalToGo : redZoneDownMultipliers.fourthDown;
	}
	if (game.down === 3 && typeof game.distance === 'number' && game.distance <= thirdAndShortDistance) {
		return redZoneDownMultipliers.thirdAndShort;
	}
	return redZoneDownMultipliers.other;
};

// Gated on the margin because closeness and lateGame have already scored a blowout correctly low,
// and an unconditional +10 on top would undo that.
const getRedZoneBoost = (game: Game): number => {
	const config = sportTypeConfigMap[game.sportType];
	if (!config) return 0;
	const [, t2, t3] = config.closenessMargins;
	const margin = Math.abs(game.homeTeam.score - game.awayTeam.score);
	const base = margin <= t2
		? scoringOpportunityRedZoneBoost
		: margin <= t3
			? scoringOpportunityRedZoneFringeBoost
			: 0;
	if (base === 0) return 0;
	return Math.round(base * getRedZoneDownMultiplier(game));
};

// Halftime, an intermission, and a delay all mean no play can happen, so nothing about the game
// state is worth scoring until it resumes.
export const isPlayFrozen = (game: Game): boolean => game.intermission === true || game.delayed === true;

export const computeScoringOpportunityBoost = (game: Game): number => {
	if (game.status !== 'in') return 0;
	// A freeze holds the situation in place — runners stay on base, the offense stays in the red
	// zone — so the boost would otherwise keep paying out while nothing can happen.
	if (isPlayFrozen(game)) return 0;

	if (game.sportType === 'baseball' || game.sportType === 'softball') {
		const r = game.baseRunners;
		if (!r) return 0;
		const count = [r.first, r.second, r.third].filter(Boolean).length;
		return scoringOpportunityBaseRunnerBoosts[count] ?? 0;
	}

	if (game.sportType === 'football' && game.isRedZone) {
		return getRedZoneBoost(game);
	}

	return 0;
};

export const computePowerScore = (
	game: Game,
	history: ScoreSnapshot[] = [],
	stallCount: number = 0,
	winProbabilityHistory: number[] = [],
): PowerScoreResult => {
	// A frozen game must never out-score a live one, so it zeroes out rather than keeping its last
	// live score.
	if (isPlayFrozen(game))
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
	const now = deriveNow(history);

	const closeness = getCloseness(game, config, progress);
	const lateGame = getLateGame(game, config);
	const momentum = getMomentum(game, history, config, now);
	const leadChanges = getLeadChanges(history, config, now);
	const comeback = getComeback(game, history, config, progress, now);
	const winProbVariance = computeWinProbVarianceScore(winProbabilityHistory);

	const signalsSubtotal = closeness.score + lateGame.score + momentum.score + leadChanges.score + comeback.score;
	const stallStep = stallPenaltySteps.find(s => stallCount >= s.minPolls);
	const stalled = stallStep !== undefined;
	// A flat deduction on the signals subtotal; winProbVariance sits on top and is unaffected.
	const stallPenalty = stalled ? stallStep.deduction : 0;
	const stalledSignalsTotal = Math.max(0, signalsSubtotal - stallPenalty);
	const rawTotal = stalledSignalsTotal + (winProbVariance ?? 0);

	const reason = [momentum.reason, comeback.reason, leadChanges.reason, lateGame.reason, closeness.reason]
		.filter(Boolean)
		.slice(0, 2)
		.join(', ') || scorerTunables.reasons.fallback;

	return normalizePowerScoreResult({
		gameId: game.id,
		total: rawTotal,
		closeness: closeness.score,
		lateGame: lateGame.score,
		momentum: momentum.score,
		leadChanges: leadChanges.score,
		comeback: comeback.score,
		...(winProbVariance !== undefined ? { winProbabilityVariance: winProbVariance } : {}),
		reason,
		stalled,
		stallPenalty,
		// Lets the breakdown show what the stall penalty changed.
		signalsSubtotal,
	});
};
