import { scoreMaxTotal, stallPenaltySteps } from './constants';
import { resolveLeagueConfig, resolveSportConfig } from './config';
import { clamp, isFiniteNumber, sum, toFiniteNumber } from './math';
import { classicMode, getMode } from './modes';
import { postseasonBoostShare, postseasonDetails } from './postseason';
import { getGameProgress, isPlayFrozen, scoreMargin } from './progress';
import { renderReasonsEnglish } from './reasons';
import { computeWinProbVarianceScore } from './winProbability';
import type {
	BlendResult,
	ClassicBlend,
	Game,
	PowerScore,
	PowerScoreMode,
	ReasonFragment,
	ScoredBoost,
	ScoredSignal,
	ScoreOptions,
	ScoringContext,
	SignalInput,
} from './types';

interface ModeRun {
	signals: ScoredSignal[];
	signalsSubtotal: number;
	scaledSubtotal: number;
	signalCeiling: number;
	stalled: boolean;
	stallPenalty: number;
	winProbabilityVariance?: number;
	baseTotal: number;
	reasons: ReasonFragment[];
	boosts: ScoredBoost[];
	// baseTotal plus the mode's own boosts, capped at 100.
	automaticTotal: number;
}

const newestTimestamp = (context: ScoringContext): number => {
	const history = context.history;
	return history && history.length > 0 ? history[history.length - 1]!.timestamp : 0;
};

export const createSignalInput = (game: Game<string>, context: ScoringContext, options: ScoreOptions = {}): SignalInput => {
	const sport = resolveSportConfig(game.sportType, options.sport);
	const league = resolveLeagueConfig(game, options.league);
	return {
		game,
		context,
		sport,
		league,
		progress: getGameProgress(game, sport, league),
		now: newestTimestamp(context),
		margin: scoreMargin(game),
	};
};

const stallPenaltyFor = (stallCount: number | undefined): number | undefined => (
	stallPenaltySteps.find(step => (stallCount ?? 0) >= step.minPolls)?.deduction
);

// Disabled signals score nothing and the survivors are rescaled to the mode's full signal ceiling,
// not to 100: the subtotal is pre-cap and the total is capped at 100 afterwards, so scaling to 100
// here would cap twice and deflate every score. Disabling everything disables nothing.
// Switching every signal off switches none of them off.
const disabledSetFor = (mode: PowerScoreMode, disabledSignals: readonly string[] = []): ReadonlySet<string> => {
	const disabled = new Set(disabledSignals);
	return mode.signals.every(signal => disabled.has(signal.id)) ? new Set() : disabled;
};

const runMode = (mode: PowerScoreMode, input: SignalInput, disabledSignals?: readonly string[]): ModeRun => {
	const disabled = disabledSetFor(mode, disabledSignals);
	const isOff = (id: string) => disabled.has(id);

	const outputs = mode.signals.map(signal => ({ signal, output: signal.compute(input) }));
	const signals: ScoredSignal[] = outputs.map(({ signal, output }) => ({
		id: signal.id,
		points: isOff(signal.id) ? 0 : clamp(Math.round(toFiniteNumber(output.points)), 0, signal.ceiling),
		ceiling: signal.ceiling,
		disabled: isOff(signal.id),
	}));

	const signalCeiling = sum(mode.signals.map(signal => signal.ceiling));
	const enabledCeiling = sum(signals.filter(signal => !signal.disabled).map(signal => signal.ceiling));
	const signalsSubtotal = sum(signals.map(signal => signal.points));
	const scale = enabledCeiling === signalCeiling ? 1 : signalCeiling / enabledCeiling;
	const scaledSubtotal = scale === 1 ? signalsSubtotal : Math.min(Math.round(signalsSubtotal * scale), signalCeiling);

	const deduction = mode.usesStallPenalty ? stallPenaltyFor(input.context.stallCount) : undefined;
	const stalled = deduction !== undefined;
	const stallPenalty = stalled ? Math.round(deduction * scale) : 0;
	const winProbabilityVariance = mode.usesWinProbability
		? computeWinProbVarianceScore(input.context.winProbability ?? [])
		: undefined;
	const baseTotal = clamp(Math.max(0, scaledSubtotal - stallPenalty) + (winProbabilityVariance ?? 0), 0, scoreMaxTotal);

	const reasonById = new Map(outputs.map(({ signal, output }) => [signal.id, output.reason]));
	const reasons = mode.reasonPriority
		.filter(id => !isOff(id))
		.map(id => reasonById.get(id))
		.filter((reason): reason is ReasonFragment => reason !== undefined)
		.slice(0, mode.reasonLimit);

	const bucketRoom = new Map(Object.entries(mode.bucketCaps ?? {}));
	const boosts = mode.boosts.map((boost): ScoredBoost => {
		const output = boost.compute(input);
		let points = Math.max(0, Math.round(toFiniteNumber(output.points)));
		const room = boost.bucket === undefined ? undefined : bucketRoom.get(boost.bucket);
		if (room !== undefined) {
			points = Math.min(points, room);
			bucketRoom.set(boost.bucket!, room - points);
		}
		return {
			id: boost.id,
			points,
			...(output.meta ? { meta: output.meta } : {}),
			...(output.details?.length ? { details: output.details } : {}),
		};
	});

	return {
		signals,
		signalsSubtotal,
		scaledSubtotal,
		signalCeiling,
		stalled,
		stallPenalty,
		...(winProbabilityVariance !== undefined ? { winProbabilityVariance } : {}),
		baseTotal,
		reasons,
		boosts,
		automaticTotal: Math.min(scoreMaxTotal, baseTotal + sum(boosts.map(boost => boost.points))),
	};
};

const blendWithClassic = (own: number, classic: number, blend: ClassicBlend): { total: number; result: BlendResult } => {
	if (blend.kind === 'floor') {
		const factor = clamp(blend.factor, 0, 1);
		const floor = Math.round(factor * classic);
		return { total: Math.max(own, floor), result: { kind: 'floor', weight: factor, ownTotal: own, classicTotal: classic, floorApplied: floor > own } };
	}
	const weight = clamp(blend.weight, 0, 1);
	const total = blend.kind === 'boost'
		? Math.min(scoreMaxTotal, classic + Math.round(weight * own))
		: Math.round(weight * own + (1 - weight) * classic);
	return { total, result: { kind: blend.kind, weight, ownTotal: own, classicTotal: classic } };
};

const postseasonScoredBoost = (game: Game<string>, points: number, setting: number): ScoredBoost => {
	const details = postseasonDetails(game, setting);
	return details.length > 0 ? { id: 'postseasonBoost', points, details } : { id: 'postseasonBoost', points };
};

const nonNegative = (value: number | undefined): number => (isFiniteNumber(value) ? Math.max(0, Math.round(value)) : 0);

const frozenScore = (game: Game<string>, mode: PowerScoreMode, options: ScoreOptions, disabledSignals?: readonly string[]): PowerScore => ({
	gameId: game.id,
	modeId: mode.id,
	total: 0,
	signals: mode.signals.map(signal => ({ id: signal.id, points: 0, ceiling: signal.ceiling, disabled: disabledSetFor(mode, disabledSignals).has(signal.id) })),
	signalsSubtotal: 0,
	scaledSubtotal: 0,
	signalCeiling: sum(mode.signals.map(signal => signal.ceiling)),
	frozen: true,
	stalled: false,
	stallPenalty: 0,
	baseTotal: 0,
	boosts: [
		...(options.favoriteTeamCount !== undefined ? [{ id: 'favoriteBoost', points: 0, meta: { teams: nonNegative(options.favoriteTeamCount) } }] : []),
		...(options.gameBoost !== undefined ? [{ id: 'gameBoost', points: 0 }] : []),
		...mode.boosts.map(boost => ({ id: boost.id, points: 0 })),
		...(options.postseasonBoostPoints !== undefined && mode.paysPostseason !== false ? [{ id: 'postseasonBoost', points: 0 }] : []),
	],
	reasons: [],
	reason: '',
});

/*
	Scores one game. The order is fixed: signals → disabled-signal rescale → stall penalty → win
	probability (clamped 0–100) → the mode's own boosts (capped at 100) → blend with Classic →
	favorite and postseason boosts (capped at 100) → the manual game boost, the only thing allowed
	past 100.
*/
export const scoreGame = (game: Game<string>, context: ScoringContext = {}, options: ScoreOptions = {}): PowerScore => {
	const requested = getMode(options.mode);
	const fellBack = requested.appliesTo !== undefined && !requested.appliesTo(game, context);
	const mode = fellBack ? classicMode : requested;
	// A game scored as Classic in place of another mode takes Classic's own switches.
	const disabledSignals = fellBack ? options.classicDisabledSignals : options.disabledSignals;
	if (isPlayFrozen(game)) return frozenScore(game, mode, options, disabledSignals);

	const input = createSignalInput(game, context, options);
	const run = runMode(mode, input, disabledSignals);

	const blend = mode === classicMode ? undefined : (options.classicBlend ?? mode.classicBlend);
	const classicRun = blend ? runMode(classicMode, input, options.classicDisabledSignals) : undefined;
	const blended = blend && classicRun ? blendWithClassic(run.automaticTotal, classicRun.automaticTotal, blend) : undefined;
	const combinedTotal = blended?.total ?? run.automaticTotal;
	const paysPostseason = mode.paysPostseason !== false;

	const favoriteBoost = nonNegative((options.favoriteTeamCount ?? 0) * (options.favoriteBoostPoints ?? 0));
	const postseasonBoost = paysPostseason ? nonNegative((options.postseasonBoostPoints ?? 0) * postseasonBoostShare(game.postseasonRound)) : 0;
	const gameBoost = nonNegative(options.gameBoost);
	const automaticTotal = Math.min(scoreMaxTotal, combinedTotal + favoriteBoost + postseasonBoost);

	const boosts: ScoredBoost[] = [
		...(options.favoriteTeamCount !== undefined ? [{ id: 'favoriteBoost', points: favoriteBoost, meta: { teams: nonNegative(options.favoriteTeamCount) } }] : []),
		...(options.gameBoost !== undefined ? [{ id: 'gameBoost', points: gameBoost }] : []),
		...run.boosts,
		...(options.postseasonBoostPoints !== undefined && paysPostseason ? [postseasonScoredBoost(game, postseasonBoost, options.postseasonBoostPoints)] : []),
	];

	const signalReasons = run.reasons.length > 0 ? run.reasons : [{ key: 'fallback' }];
	const reasons: ReasonFragment[] = [
		...signalReasons,
		...boosts.filter(boost => boost.points > 0).map(boost => ({ key: boost.id, params: { points: boost.points } })),
	];

	return {
		gameId: game.id,
		modeId: mode.id,
		total: automaticTotal + gameBoost,
		signals: run.signals,
		signalsSubtotal: run.signalsSubtotal,
		scaledSubtotal: run.scaledSubtotal,
		signalCeiling: run.signalCeiling,
		frozen: false,
		stalled: run.stalled,
		stallPenalty: run.stallPenalty,
		...(run.winProbabilityVariance !== undefined ? { winProbabilityVariance: run.winProbabilityVariance } : {}),
		baseTotal: run.baseTotal,
		...(classicRun ? { classicTotal: classicRun.automaticTotal } : {}),
		...(blended ? { blend: blended.result } : {}),
		boosts,
		reasons,
		reason: renderReasonsEnglish(reasons),
	};
};

export const signalPoints = (score: Pick<PowerScore, 'signals'>, id: string): number => (
	score.signals.find(signal => signal.id === id)?.points ?? 0
);

export const boostPoints = (score: Pick<PowerScore, 'boosts'>, id: string): number => (
	score.boosts.find(boost => boost.id === id)?.points ?? 0
);
