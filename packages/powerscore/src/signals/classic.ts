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
import { teamName } from '../teams';
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

const shouldScoreZeroZeroAsFullTie = (game: Game<string>, sport: SportTypeConfig): boolean => (
	sport.zeroZeroAsFullTie && (game.period == null || sport.zeroZeroPenaltyPeriods?.includes(game.period) !== true)
);

export const computeCloseness = ({ game, sport, progress, margin }: SignalInput): SignalOutput => {
	const { scores } = scorerTunables;
	const [t1, t2, t3] = sport.closenessMargins;

	let tier: number;
	if (game.homeTeam.score === 0 && game.awayTeam.score === 0) {
		tier = shouldScoreZeroZeroAsFullTie(game, sport) ? scores.closeness.tied : scores.closeness.zeroZero;
	} else if (margin === 0) {
		tier = scores.closeness.tied;
	} else if (margin <= t1) {
		tier = scores.closeness.tight;
	} else if (margin <= t2) {
		tier = scores.closeness.close;
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
	return { points: underSiege ? Math.min(scoreMaxCloseness, points + redCardTunables.siegeClosenessBump) : points };
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

export const computeLateGame = ({ game, sport, league, margin }: SignalInput): SignalOutput => {
	const { scores } = scorerTunables;
	if (game.period == null) return none;
	const regularPeriods = league.regularPeriods;

	// Overtime and extra innings start from a tie and take the top of the range, until a lead built
	// inside them (five runs in the top of the 10th) is past the sport's close margin.
	if (game.period > regularPeriods)
		return { points: margin <= sport.closenessMargins[1] ? scores.lateGame.overtime : getLateGameCeiling(margin, sport) };

	const tierCeiling = getLateGameCeiling(margin, sport);

	// No clock, so the ramp runs across regulation innings instead.
	if (!sport.clockBased) {
		const curve = sport.lateGameCurve;
		if (!curve || curve.model !== 'baseball') return none;
		const regulationProgress = getBaseballRegulationProgress(game.period, curve);
		if (regulationProgress === null) return none;
		return { points: mapLinearLateGame('final', regulationProgress, tierCeiling) };
	}

	const periodDuration = Math.max(1, league.periodDurationSecs);
	const secsRemaining = getClockSecondsRemaining(game, sport, periodDuration);
	const elapsedFraction = secsRemaining === null ? 0 : clamp((periodDuration - secsRemaining) / periodDuration, 0, 1);

	if (game.period < regularPeriods - 1) return none;
	if (game.period < regularPeriods) return { points: mapLinearLateGame('previous', elapsedFraction, tierCeiling) };

	const rampScore = mapLinearLateGame('final', elapsedFraction, tierCeiling);
	// An unknown clock cannot place the game inside the pre-overtime window, so the ramp holds where
	// the period started.
	if (secsRemaining === null) return { points: rampScore };

	return { points: clamp(rampScore + getOtPreBoost(game, sport, secsRemaining), 0, scoreMaxLateGame) };
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
const decaySignal = (tier: number, reason: ReasonFragment | undefined, ageMs: number, halfLifeMs: number): SignalOutput => {
	const points = Math.round(tier * decayFactor(ageMs, halfLifeMs));
	if (points <= 0) return none;
	return reason ? { points, reason } : { points };
};

// Wall-clock minutes the window covers, which is what "in the last 12 minutes" can honestly claim.
export const windowMinutes = (history: readonly ScoreSnapshot[]): number => (
	history.length < 2 ? 0 : Math.max(1, Math.round((history[history.length - 1]!.timestamp - history[0]!.timestamp) / 60_000))
);

// Basketball calls a lopsided stretch a 12–4 run; 10–6 is two teams trading baskets. Elsewhere only an
// unanswered stretch is a streak, and a single goal or run is just the score, which the score sentence
// already gives.
export const runReason = (
	game: Game<string>,
	team: Game<string>['homeTeam'],
	other: Game<string>['homeTeam'],
	scoredFor: number,
	scoredAgainst: number,
	history: readonly ScoreSnapshot[],
): ReasonFragment | undefined => {
	if (game.sportType === 'basketball' && scoredAgainst * 3 <= scoredFor) return { key: 'run', params: { team: teamName(team), scoredFor, scoredAgainst } };
	const lowScoring = game.sportType !== 'football' && game.sportType !== 'basketball';
	if (lowScoring && scoredFor - scoredAgainst < 2) return undefined;
	if (scoredAgainst === 0) return { key: 'scoredStraight', params: { team: teamName(team), count: scoredFor } };
	return { key: 'outscoring', params: { team: teamName(team), other: teamName(other), scoredFor, scoredAgainst, minutes: windowMinutes(history) } };
};

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

	let tier: number;
	if (run >= sport.momentumBigRun) tier = scores.momentum.bigRun;
	else if (run >= sport.momentumSmallRun) tier = scores.momentum.smallRun;
	else return none;

	// `run` is the differential, not an unanswered streak, so both scores are named.
	const reason = runReason(
		game,
		homeIsRunning ? game.homeTeam : game.awayTeam,
		homeIsRunning ? game.awayTeam : game.homeTeam,
		Math.max(homeDelta, awayDelta),
		Math.min(homeDelta, awayDelta),
		history,
	);
	return decaySignal(tier, reason, ageSince(lastScoreChangeTimestamp(history), now), sport.decayHalfLifeMs.momentum);
};

export const computeLeadChanges = ({ game, context, sport, now }: SignalInput): SignalOutput => {
	const { scores } = scorerTunables;
	const history = context.history ?? [];
	if (history.length < 3) return none;

	const seen = findLeadChanges(history);
	// The feed's play log catches a lead that flips and flips back between two polls.
	const logged = context.recentLeadChanges;
	const fromLog = logged !== undefined && logged.count > seen.count;
	const count = fromLog ? logged.count : seen.count;
	// The newer of the two: a flip the snapshots missed can be later than the last one they saw.
	const lastTimestamp = fromLog ? Math.max(seen.lastTimestamp ?? 0, logged.lastAt ?? seen.lastTimestamp ?? now) : seen.lastTimestamp;
	let tier: number;
	let reason: ReasonFragment | undefined;
	if (count >= 2) {
		tier = scores.leadChanges.multiple;
		reason = { key: 'leadChanges', params: { count, minutes: windowMinutes(history) } };
	} else if (count === 1) {
		tier = scores.leadChanges.single;
		// Level again since, so nobody has just taken it.
		const { homeTeam, awayTeam } = game;
		if (homeTeam.score !== awayTeam.score) reason = { key: 'tookLead', params: { team: teamName(homeTeam.score > awayTeam.score ? homeTeam : awayTeam) } };
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
	const deficit = Math.abs(first.homeScore - first.awayScore);
	const shrinkage = deficit - margin;

	let tier: number;
	if (shrinkage >= sport.comebackThresholdBig) tier = scores.comeback.big;
	else if (shrinkage >= sport.comebackThresholdSmall) tier = scores.comeback.moderate;
	else return none;

	const homeTrailed = first.homeScore < first.awayScore;
	const team = teamName(homeTrailed ? game.homeTeam : game.awayTeam);
	const nowLeads = homeTrailed ? game.homeTeam.score > game.awayTeam.score : game.awayTeam.score > game.homeTeam.score;
	let reason: ReasonFragment;
	if (margin === 0) reason = deficit === 1 ? { key: 'tiedIt', params: { team } } : { key: 'cameBack', params: { team, from: deficit } };
	else if (nowLeads) reason = { key: 'cameBackToLead', params: { team, from: deficit } };
	else reason = { key: 'cutDeficit', params: { team, from: deficit, to: margin } };

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
