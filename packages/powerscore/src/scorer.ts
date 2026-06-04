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

// Concave weighting (<1) applied to game progress so state signals reach most of their ceiling by
// mid-game rather than only at the final buzzer. Keeps early games low (a Q1 blowout is still ~0)
// while letting a mid-game nail-biter score in a meaningful range. Tunable via the harness.
const progressCurveExponent = 0.55;

// Hybrid flat-floor + progress scaling for state-based signals (closeness, comeback).
// A small floor always pays out; the rest of the tier ceiling is gated by (curved) game progress,
// so early games sit low and tension builds toward the final buzzer.
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

// Late-game pressure only matters if the game is close — a blowout in the final minute has no
// tension. Scale the ramp by how close the game is: full credit for a one-score game, half for a
// fringe game, a sliver for a blowout. (The OT pre-boost is separate and already requires a tie.)
const getLatenessClosenessFactor = (game: Game, config: SportTypeConfig): number => {
	const [, t2, t3] = config.closenessMargins;
	const margin = Math.abs(game.homeTeam.score - game.awayTeam.score);
	if (margin <= t2) return 1;
	if (margin <= t3) return 0.5;
	return 0.12;
};

const getLateGame = (game: Game, config: SportTypeConfig): Signal => {
	const { scores, reasons } = scorerTunables;
	const leagueConfig = leagueConfigMap[game.league];
	const regularPeriods = leagueConfig.regularPeriods;
	const { clockBased } = config;

	// Overtime / extra innings → reserved top-of-range pressure (OT only happens from a tie).
	if (game.period > regularPeriods)
		return { score: scores.lateGame.overtime, reason: clockBased ? reasons.overtime : reasons.extraInnings };

	const closenessFactor = getLatenessClosenessFactor(game, config);

	// Baseball (no clock): near-linear ramp across regulation innings (6th → 9th), reusing the
	// inning-progress helper. Extra innings already returned above.
	if (!clockBased) {
		const curve = config.lateGameCurve;
		if (!curve || curve.model !== 'baseball')
			return { score: scores.lateGame.none, reason: '' };

		const regulationProgress = getBaseballRegulationProgress(game.period, curve);
		if (regulationProgress === null)
			return { score: scores.lateGame.none, reason: '' };

		const score = Math.round(mapLinearLateGame('final', regulationProgress) * closenessFactor);
		const inning = Math.min(game.period, curve.regulationInnings);
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
		return { score: Math.round(mapLinearLateGame('previous', elapsedFraction) * closenessFactor), reason: '' };

	// Final regulation period — whole-period linear ramp (closeness-gated) plus the tied OT pre-boost.
	const rampScore = Math.round(mapLinearLateGame('final', elapsedFraction) * closenessFactor);
	const otBoost = getOtPreBoost(game, config, secsRemaining);
	const score = clamp(rampScore + otBoost, 0, scoreMaxLateGame);
	const reason = otBoost > 0
		? reasons.overtimeAnticipation
		: secsRemaining < 60
			? `${formatClock(secsRemaining)} ${reasons.clockLeftSuffix}`
			: `${reasons.underPrefix} ${Math.ceil(secsRemaining / 60)} ${reasons.minutesLeftSuffix}`;

	return { score, reason };
};

// "Now" for decay is the newest snapshot's timestamp; all event ages are measured against it.
const deriveNow = (history: ScoreSnapshot[]): number => (
	history.length > 0 ? history[history.length - 1]!.timestamp : 0
);

// Exponential decay: 1 at the moment of the event, 0.5 after one half-life, fading toward 0.
// A null event timestamp (never happened) ages to Infinity → factor 0.
const decayFactor = (ageMs: number, halfLifeMs: number): number => {
	if (ageMs <= 0) return 1;
	if (halfLifeMs <= 0) return 0;
	return Math.pow(0.5, ageMs / halfLifeMs);
};

const ageSince = (timestamp: number | null, now: number): number => (
	timestamp === null ? Infinity : Math.max(0, now - timestamp)
);

// Newest snapshot whose score moved — the freshness anchor for momentum and comeback decay.
const lastScoreChangeTimestamp = (history: ScoreSnapshot[]): number | null => {
	for (let i = history.length - 1; i >= 1; i--) {
		const cur = history[i]!;
		const prev = history[i - 1]!;
		if (cur.homeScore !== prev.homeScore || cur.awayScore !== prev.awayScore)
			return cur.timestamp;
	}
	return null;
};

// Count lead changes in the window and capture the newest one's timestamp for recency decay.
const findLeadChanges = (history: ScoreSnapshot[]): { count: number; lastTimestamp: number | null } => {
	let count = 0;
	let lastTimestamp: number | null = null;
	for (let i = 1; i < history.length; i++) {
		const prevDiff = history[i - 1]!.homeScore - history[i - 1]!.awayScore;
		const currDiff = history[i]!.homeScore - history[i]!.awayScore;
		if (Math.sign(prevDiff) !== Math.sign(currDiff) && !(prevDiff === 0 && currDiff === 0)) {
			count++;
			lastTimestamp = history[i]!.timestamp;
		}
	}
	return { count, lastTimestamp };
};

// Apply sport-scaled decay to a freshly-spiked tier value; clears the reason once it fades to nothing.
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
	const runTeam = homeDelta > awayDelta ? game.homeTeam.abbreviation : game.awayTeam.abbreviation;

	let tier: number;
	let reason: string;
	if (run >= config.momentumBigRun) {
		tier = scores.momentum.bigRun;
		reason = `${runTeam} ${reasons.momentumRunPrefix} ${run}-0 ${reasons.momentumRunSuffix}`;
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

	// Progress-scale first (a late rally matters more), then fade with the live-action cluster.
	const floored = applyProgressFloor(tier, scores.comeback.flatFloor, progress);
	const ageMs = ageSince(lastScoreChangeTimestamp(history), now);
	return decaySignal(floored, reason, ageMs, config.decayHalfLifeMs.comeback);
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
	const now = deriveNow(history);

	const closeness = getCloseness(game, config, progress);
	const lateGame = getLateGame(game, config);
	const momentum = getMomentum(game, history, config, now);
	const leadChanges = getLeadChanges(history, config, now);
	const comeback = getComeback(game, history, config, progress, now);

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
