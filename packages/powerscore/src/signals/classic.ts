import {
	redCardTunables,
	scorerTunables,
	scoreMaxCloseness,
	scoreMaxLateGame,
	scoreMaxMomentum,
	scoreMaxLeadChanges,
	scoreMaxComeback,
} from '../constants';
import { ageSince, clamp, decayFactor } from '../math';
import { getClockSecondsRemaining } from '../progress';
import { shorthandedSide } from '../boosts/redCard';
import { formatClock } from '../reasons';
import type {
	BaseballLateGameCurveConfig,
	Game,
	ReasonFragment,
	ScoreSnapshot,
	SignalDefinition,
	SignalInput,
	SignalOutput,
	SportTypeConfig,
} from '../types';

// Concave (<1) so state signals reach most of their ceiling by mid-game rather than only at the
// final buzzer: a Q1 blowout still scores ~0, a mid-game nail-biter lands in a meaningful range.
const progressCurveExponent = 0.55;

// The floor always pays out; the rest of the tier ceiling is gated by curved game progress.
export const applyProgressFloor = (tierCeiling: number, flatFloor: number, progress: number): number => {
	if (tierCeiling <= 0) return 0;
	const floor = clamp(flatFloor, 0, tierCeiling);
	const curvedProgress = Math.pow(clamp(progress, 0, 1), progressCurveExponent);
	return Math.round(floor + (tierCeiling - floor) * curvedProgress);
};

const none: SignalOutput = { points: 0 };

const closenessUnit = (game: Game<string>): string => (
	scorerTunables.reasons.closenessUnitBySportType[game.sportType] ?? scorerTunables.reasons.defaultClosenessUnit
);

const shouldScoreZeroZeroAsFullTie = (game: Game<string>, sport: SportTypeConfig): boolean => (
	sport.zeroZeroAsFullTie && (game.period == null || sport.zeroZeroPenaltyPeriods?.includes(game.period) !== true)
);

export const computeCloseness = ({ game, sport, progress, margin }: SignalInput): SignalOutput => {
	const { scores } = scorerTunables;
	const [t1, t2, t3] = sport.closenessMargins;
	const marginReason: ReasonFragment = { key: 'margin', params: { margin, unit: closenessUnit(game) } };

	let tier: number;
	let reason: ReasonFragment | undefined;
	if (game.homeTeam.score === 0 && game.awayTeam.score === 0) {
		tier = shouldScoreZeroZeroAsFullTie(game, sport) ? scores.closeness.tied : scores.closeness.zeroZero;
		reason = { key: 'tied' };
	} else if (margin === 0) {
		tier = scores.closeness.tied;
		reason = { key: 'tied' };
	} else if (margin <= t1) {
		tier = scores.closeness.tight;
		reason = marginReason;
	} else if (margin <= t2) {
		tier = scores.closeness.close;
		reason = marginReason;
	} else if (margin <= t3) {
		tier = scores.closeness.fringe;
	} else {
		tier = scores.closeness.none;
	}

	const points = applyProgressFloor(tier, scores.closenessFlatFloor, progress);
	// Ten men protecting a one-goal lead concede far more often than a full side does, so the game
	// is closer than the score says.
	const shorthanded = margin === 1 ? shorthandedSide(game) : undefined;
	const underSiege = shorthanded !== undefined && (shorthanded === 'home' ? game.homeTeam.score > game.awayTeam.score : game.awayTeam.score > game.homeTeam.score);
	return { points: underSiege ? Math.min(scoreMaxCloseness, points + redCardTunables.siegeClosenessBump) : points, reason };
};

type LateGamePhase = 'previous' | 'final';

// Rises smoothly from the start of the final period to the tier ceiling, with no final-seconds
// spike; the prior period carries a gentle touch.
const mapLinearLateGame = (phase: LateGamePhase, fraction: number, ceiling: number): number => {
	const { lateGame } = scorerTunables.scores;
	const f = clamp(fraction, 0, 1);
	if (phase === 'previous') return clamp(Math.round(lateGame.previousPeriodTouch * f), 0, ceiling);
	return clamp(Math.round(lateGame.finalPeriodStart + (ceiling - lateGame.finalPeriodStart) * f), 0, ceiling);
};

// Tied games telegraph overtime. Clock sports only; disabled when otPreBoostWindowSecs is 0.
const getOtPreBoost = (game: Game<string>, sport: SportTypeConfig, secsRemaining: number): number => {
	const window = Math.max(0, sport.otPreBoostWindowSecs);
	if (window <= 0) return 0;
	if (game.homeTeam.score !== game.awayTeam.score) return 0;
	if (secsRemaining > window) return 0;
	const ramp = clamp((window - secsRemaining) / window, 0, 1);
	return Math.round(scorerTunables.scores.lateGame.otPreBoostMax * ramp);
};

const getBaseballRegulationProgress = (inning: number, curve: BaseballLateGameCurveConfig): number | null => {
	if (inning < curve.regulationStartInning) return null;
	const spanInnings = Math.max(1, curve.regulationInnings - curve.regulationStartInning);
	return clamp((inning - curve.regulationStartInning) / spanInnings, 0, 1);
};

// Late-game pressure scales with how close the game is: tied games earn the full closeCeiling,
// fringe games a moderate one, blowouts a small one.
const getLateGameCeiling = (margin: number, sport: SportTypeConfig): number => {
	const [, t2, t3] = sport.closenessMargins;
	const { lateGame } = scorerTunables.scores;
	if (margin <= t2) return lateGame.closeCeiling;
	if (margin <= t3) return lateGame.fringeCeiling;
	return lateGame.blowoutCeiling;
};

// Keyed on sportType the same way the card's period label is: soccer plays two extra-time halves
// and then a shootout, none of which is overtime.
const getOvertimeReason = (game: Game<string>, regularPeriods: number): ReasonFragment => {
	if (game.sportType !== 'soccer') return { key: 'overtime' };
	return { key: (game.period ?? 0) - regularPeriods > 2 ? 'shootout' : 'extraTime' };
};

// A count-up clock has no countdown to render — soccer's stoppage time is never published ahead of
// time — so it reports elapsed minutes instead of a 0:00 that never arrives.
const getFinalStretchReason = (
	game: Game<string>,
	sport: SportTypeConfig,
	periodDurationSecs: number,
	secsRemaining: number,
): ReasonFragment => {
	if (!sport.clockCountsUp) return { key: 'clockLeft', params: { clock: formatClock(secsRemaining) } };
	const elapsedSecs = sport.clockIsFullGameElapsed
		? Math.max(0, game.clockSeconds ?? 0)
		: Math.max(0, (game.period ?? 1) - 1) * periodDurationSecs + (periodDurationSecs - secsRemaining);
	return { key: 'minutesIn', params: { minutes: Math.floor(elapsedSecs / 60) } };
};

export const computeLateGame = ({ game, sport, league, margin }: SignalInput): SignalOutput => {
	const { scores } = scorerTunables;
	if (game.period == null) return none;
	const regularPeriods = league.regularPeriods;

	// Overtime and extra innings only happen from a tie, so they take the top of the range.
	if (game.period > regularPeriods)
		return {
			points: scores.lateGame.overtime,
			reason: sport.clockBased ? getOvertimeReason(game, regularPeriods) : { key: 'extraInnings' },
		};

	const tierCeiling = getLateGameCeiling(margin, sport);

	// No clock, so the ramp runs across regulation innings instead.
	if (!sport.clockBased) {
		const curve = sport.lateGameCurve;
		if (!curve || curve.model !== 'baseball') return none;
		const regulationProgress = getBaseballRegulationProgress(game.period, curve);
		if (regulationProgress === null) return none;
		return {
			points: mapLinearLateGame('final', regulationProgress, tierCeiling),
			reason: { key: 'inning', params: { inning: Math.min(game.period, curve.regulationInnings) } },
		};
	}

	const periodDuration = Math.max(1, league.periodDurationSecs);
	const secsRemaining = getClockSecondsRemaining(game, sport, periodDuration);
	const elapsedFraction = secsRemaining === null ? 0 : clamp((periodDuration - secsRemaining) / periodDuration, 0, 1);

	if (game.period < regularPeriods - 1) return none;
	if (game.period < regularPeriods) return { points: mapLinearLateGame('previous', elapsedFraction, tierCeiling) };

	const rampScore = mapLinearLateGame('final', elapsedFraction, tierCeiling);
	// An unknown clock cannot place the game inside the pre-overtime window, and there is no clock
	// position worth reporting, so the ramp holds where the period started.
	if (secsRemaining === null) return { points: rampScore };

	const otBoost = getOtPreBoost(game, sport, secsRemaining);
	const points = clamp(rampScore + otBoost, 0, scoreMaxLateGame);
	const reason: ReasonFragment = otBoost > 0
		? { key: game.sportType === 'soccer' ? 'levelLate' : 'overtimeLooming' }
		: secsRemaining < 60
			? getFinalStretchReason(game, sport, periodDuration, secsRemaining)
			: { key: 'underMinutes', params: { minutes: Math.ceil(secsRemaining / 60) } };
	return { points, reason };
};

export const lastScoreChangeTimestamp = (history: readonly ScoreSnapshot[]): number | null => {
	for (let i = history.length - 1; i >= 1; i--) {
		const cur = history[i]!;
		const prev = history[i - 1]!;
		if (cur.homeScore !== prev.homeScore || cur.awayScore !== prev.awayScore) return cur.timestamp;
	}
	return null;
};

// Ties are skipped rather than treated as their own sign. Comparing adjacent signs counted an
// ordinary "behind, level, ahead" sequence as two lead changes when it is one.
export const findLeadChanges = (history: readonly ScoreSnapshot[]): { count: number; lastTimestamp: number | null } => {
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
const decaySignal = (tier: number, reason: ReasonFragment, ageMs: number, halfLifeMs: number): SignalOutput => {
	const points = Math.round(tier * decayFactor(ageMs, halfLifeMs));
	return points <= 0 ? none : { points, reason };
};

const abbreviation = (team: Game<string>['homeTeam']): string => team.abbreviation ?? '?';

export const computeMomentum = ({ game, context, sport, now }: SignalInput): SignalOutput => {
	const { scores } = scorerTunables;
	const history = context.history ?? [];
	if (history.length < 3) return none;

	const oldest = history[0]!;
	const newest = history[history.length - 1]!;
	// Floored because feeds revise scores downward: an overturned goal, a reversed touchdown. Left
	// signed, a team losing points reads as the opponent outscoring them.
	const homeDelta = Math.max(0, newest.homeScore - oldest.homeScore);
	const awayDelta = Math.max(0, newest.awayScore - oldest.awayScore);
	const run = Math.abs(homeDelta - awayDelta);
	const homeIsRunning = homeDelta > awayDelta;
	const runTeam = abbreviation(homeIsRunning ? game.homeTeam : game.awayTeam);
	const chasingTeam = abbreviation(homeIsRunning ? game.awayTeam : game.homeTeam);

	let tier: number;
	let reason: ReasonFragment;
	if (run >= sport.momentumBigRun) {
		tier = scores.momentum.bigRun;
		// `run` is the differential, not an unanswered streak, so both scores are named.
		reason = {
			key: 'outscoring',
			params: { team: runTeam, other: chasingTeam, scoredFor: Math.max(homeDelta, awayDelta), scoredAgainst: Math.min(homeDelta, awayDelta) },
		};
	} else if (run >= sport.momentumSmallRun) {
		tier = scores.momentum.smallRun;
		reason = { key: 'onARoll', params: { team: runTeam } };
	} else {
		return none;
	}

	return decaySignal(tier, reason, ageSince(lastScoreChangeTimestamp(history), now), sport.decayHalfLifeMs.momentum);
};

export const computeLeadChanges = ({ context, sport, now }: SignalInput): SignalOutput => {
	const { scores } = scorerTunables;
	const history = context.history ?? [];
	if (history.length < 3) return none;

	const seen = findLeadChanges(history);
	// The feed's play log catches a lead that flips and flips back between two polls.
	const logged = context.recentLeadChanges;
	const fromLog = logged !== undefined && logged.count > seen.count;
	const count = fromLog ? logged.count : seen.count;
	// A change the snapshots saw keeps their timestamp; the log only dates the ones they missed.
	const lastTimestamp = fromLog ? (seen.lastTimestamp ?? logged.lastAt ?? now) : seen.lastTimestamp;
	let tier: number;
	let reason: ReasonFragment;
	if (count >= 2) {
		tier = scores.leadChanges.multiple;
		reason = { key: 'tradingLeads' };
	} else if (count === 1) {
		tier = scores.leadChanges.single;
		reason = { key: 'justTookLead' };
	} else {
		return none;
	}

	return decaySignal(tier, reason, ageSince(lastTimestamp, now), sport.decayHalfLifeMs.leadChange);
};

export const computeComeback = ({ game, context, sport, progress, now, margin }: SignalInput): SignalOutput => {
	const { scores } = scorerTunables;
	const history = context.history ?? [];
	if (history.length < 3) return none;

	const first = history[0]!;
	const shrinkage = Math.abs(first.homeScore - first.awayScore) - margin;
	const trailingTeam = abbreviation(first.homeScore < first.awayScore ? game.homeTeam : game.awayTeam);

	let tier: number;
	let reason: ReasonFragment;
	if (shrinkage >= sport.comebackThresholdBig) {
		tier = scores.comeback.big;
		reason = { key: 'cuttingIn', params: { team: trailingTeam } };
	} else if (shrinkage >= sport.comebackThresholdSmall) {
		tier = scores.comeback.moderate;
		reason = { key: 'closingGap', params: { team: trailingTeam } };
	} else {
		return none;
	}

	// Progress-scaled first, since a late rally matters more, then faded with the cluster.
	const floored = applyProgressFloor(tier, scores.comeback.flatFloor, progress);
	return decaySignal(floored, reason, ageSince(lastScoreChangeTimestamp(history), now), sport.decayHalfLifeMs.comeback);
};

export const closenessSignal: SignalDefinition = { id: 'closeness', ceiling: scoreMaxCloseness, compute: computeCloseness };
export const lateGameSignal: SignalDefinition = { id: 'lateGame', ceiling: scoreMaxLateGame, compute: computeLateGame };
export const momentumSignal: SignalDefinition = { id: 'momentum', ceiling: scoreMaxMomentum, compute: computeMomentum };
export const leadChangesSignal: SignalDefinition = { id: 'leadChanges', ceiling: scoreMaxLeadChanges, compute: computeLeadChanges };
export const comebackSignal: SignalDefinition = { id: 'comeback', ceiling: scoreMaxComeback, compute: computeComeback };

export const classicSignals: readonly SignalDefinition[] = [closenessSignal, lateGameSignal, momentumSignal, leadChangesSignal, comebackSignal];
