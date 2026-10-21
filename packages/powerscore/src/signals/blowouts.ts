import { ageSince, clamp, decayFactor } from '../math';
import { lastScoreChangeTimestamp, runReason } from './classic';
import type { SignalDefinition, SignalInput, SignalOutput, SportType } from '../types';

// The margin that earns full credit: four scores in football, a 30-point game in basketball.
const fullMargin: Record<SportType, number> = { basketball: 30, football: 28, hockey: 5, baseball: 10, softball: 10, soccer: 5 };

const none: SignalOutput = { points: 0 };

// Closeness turned inside out: nothing until the game is two scores apart, then climbing to full
// credit at a rout, and surer as the game goes on.
// The score sentence already gives the margin and the time, so the first three signals have nothing to
// add to it.
export const computeBlowoutMargin = ({ sport, progress, margin }: SignalInput): SignalOutput => {
	const [, t2, t3] = sport.closenessMargins;
	if (margin <= t2) return none;
	const shape = margin <= t3
		? 0.3 * (margin - t2) / (t3 - t2)
		: 0.3 + 0.7 * Math.min(1, (margin - t3) / Math.max(1, fullMargin[sport.id] - t3));
	const certainty = 0.6 + 0.4 * Math.pow(clamp(progress, 0, 1), 0.55);
	return { points: Math.round(50 * shape * certainty) };
};

// Built and held, not a run that may revert: the share of the window the current leader has been
// more than two scores up, discounted while the window is still filling.
export const computeSustained = ({ game, context, sport, margin }: SignalInput): SignalOutput => {
	const history = context.history ?? [];
	const [, t2] = sport.closenessMargins;
	if (history.length < 3 || margin <= t2) return none;
	const homeLeads = game.homeTeam.score > game.awayTeam.score;
	const held = history.filter(snapshot => (homeLeads ? snapshot.homeScore - snapshot.awayScore : snapshot.awayScore - snapshot.homeScore) > t2).length / history.length;
	const span = history[history.length - 1]!.timestamp - history[0]!.timestamp;
	const coverage = Math.min(1, span / sport.historyWindowMs);
	return { points: Math.round(30 * held * coverage) };
};

// An early rout has more beatdown left to watch than one that is nearly over.
export const computeTiming = ({ sport, progress, margin, game }: SignalInput): SignalOutput => {
	if (margin <= sport.closenessMargins[2] || (game.period !== undefined && progress >= 1)) return none;
	return { points: Math.round(25 * Math.pow(1 - clamp(progress, 0, 1), 0.7)) };
};

// Momentum read only in the leader's direction: still extending, not hanging on.
export const computePileOn = ({ game, context, sport, now }: SignalInput): SignalOutput => {
	const history = context.history ?? [];
	if (history.length < 3) return none;
	const oldest = history[0]!;
	const newest = history[history.length - 1]!;
	const homeLeads = newest.homeScore >= newest.awayScore;
	const leaderGain = Math.max(0, homeLeads ? newest.homeScore - oldest.homeScore : newest.awayScore - oldest.awayScore);
	const trailerGain = Math.max(0, homeLeads ? newest.awayScore - oldest.awayScore : newest.homeScore - oldest.homeScore);
	const run = leaderGain - trailerGain;
	const tier = run >= sport.momentumBigRun ? 15 : run >= sport.momentumSmallRun ? 8 : 0;
	if (tier === 0) return none;
	const points = Math.round(tier * decayFactor(ageSince(lastScoreChangeTimestamp(history), now), sport.decayHalfLifeMs.momentum));
	if (points <= 0) return none;
	const reason = runReason(game, homeLeads ? game.homeTeam : game.awayTeam, homeLeads ? game.awayTeam : game.homeTeam, leaderGain, trailerGain, history);
	return reason ? { points, reason } : { points };
};

export const blowoutMarginSignal: SignalDefinition = { id: 'blowoutMargin', ceiling: 50, compute: computeBlowoutMargin };
export const sustainedSignal: SignalDefinition = { id: 'sustained', ceiling: 30, compute: computeSustained };
export const timingSignal: SignalDefinition = { id: 'timing', ceiling: 25, compute: computeTiming };
export const pileOnSignal: SignalDefinition = { id: 'pileOn', ceiling: 15, compute: computePileOn };

export const blowoutsSignals: readonly SignalDefinition[] = [blowoutMarginSignal, sustainedSignal, timingSignal, pileOnSignal];
