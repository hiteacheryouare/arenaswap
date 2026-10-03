// The v2 pipeline as it shipped in 2.2.0: the scorer in this folder, then the arithmetic that lived
// in packages/core (applyDisabledSignals, postseasonBoostShare) and apps/extension
// (background.ts afterFetch, boostReasonParts). Frozen so v3 can be pinned against it.
import { computePowerScore, isPlayFrozen, computeScoringOpportunityBoost, normalizePowerScoreResult } from './scorer';
import {
	scoreMaxCloseness,
	scoreMaxLateGame,
	scoreMaxMomentum,
	scoreMaxLeadChanges,
	scoreMaxComeback,
	scoreMaxSignalsSubtotal,
	scoreMaxTotal,
} from './constants';
import type { Game, PowerScoreResult, ScoreSnapshot } from './types';

export type V2SignalName = 'closeness' | 'lateGame' | 'momentum' | 'leadChanges' | 'comeback';
export type V2PostseasonRound = 0 | 1 | 2 | 3;

const allSignalNames: readonly V2SignalName[] = ['closeness', 'lateGame', 'momentum', 'leadChanges', 'comeback'];

const signalMaxMap: Record<V2SignalName, number> = {
	closeness: scoreMaxCloseness,
	lateGame: scoreMaxLateGame,
	momentum: scoreMaxMomentum,
	leadChanges: scoreMaxLeadChanges,
	comeback: scoreMaxComeback,
};

export const applyDisabledSignals = (result: PowerScoreResult, disabledSignals: readonly V2SignalName[]): PowerScoreResult => {
	if (disabledSignals.length === 0) return result;
	const disabled = new Set<V2SignalName>(disabledSignals);
	const enabledMax = allSignalNames.filter(s => !disabled.has(s)).reduce((sum, s) => sum + signalMaxMap[s], 0);
	if (enabledMax === 0) return result;

	const closeness = disabled.has('closeness') ? 0 : result.closeness;
	const lateGame = disabled.has('lateGame') ? 0 : result.lateGame;
	const momentum = disabled.has('momentum') ? 0 : result.momentum;
	const leadChanges = disabled.has('leadChanges') ? 0 : result.leadChanges;
	const comeback = disabled.has('comeback') ? 0 : result.comeback;

	const enabledSum = closeness + lateGame + momentum + leadChanges + comeback;
	const scalingFactor = scoreMaxSignalsSubtotal / enabledMax;
	const newSignalsSubtotal = Math.min(Math.round(enabledSum * scalingFactor), scoreMaxSignalsSubtotal);
	const scaledStallPenalty = Math.round((result.stallPenalty ?? 0) * scalingFactor);
	const variance = result.winProbabilityVariance ?? 0;
	const newTotal = Math.min(Math.max(newSignalsSubtotal - scaledStallPenalty + variance, 0), scoreMaxTotal);

	return {
		...result,
		closeness,
		lateGame,
		momentum,
		leadChanges,
		comeback,
		signalsSubtotal: newSignalsSubtotal,
		total: newTotal,
		...(result.stallPenalty !== undefined ? { stallPenalty: scaledStallPenalty } : {}),
	};
};

const roundShares: Record<V2PostseasonRound, number> = { 0: 1, 1: 0.75, 2: 0.5, 3: 0.25 };

export const postseasonBoostShare = (round: V2PostseasonRound | undefined): number =>
	round === undefined ? 0 : roundShares[round];

const boostReasonParts = (favoriteBonus: number, gameBoost: number, scoringOpportunityBoost: number, postseasonBoost: number): string[] => [
	favoriteBonus > 0 && `favorite bonus (+${favoriteBonus})`,
	gameBoost > 0 && `game boost (+${gameBoost})`,
	scoringOpportunityBoost > 0 && `scoring opportunity (+${scoringOpportunityBoost})`,
	postseasonBoost > 0 && `postseason (+${postseasonBoost})`,
].filter((part): part is string => typeof part === 'string');

export interface V2ComposeOptions {
	disabledSignals?: readonly V2SignalName[];
	favoriteTeamCount?: number;
	favoriteBonusPoints?: number;
	postseasonBoostPoints?: number;
	postseasonRound?: V2PostseasonRound;
	gameBoost?: number;
}

export const scoreGameV2 = (
	game: Game,
	history: ScoreSnapshot[],
	stallCount: number,
	winProbability: number[],
	options: V2ComposeOptions = {},
): PowerScoreResult => {
	const baseScore = applyDisabledSignals(
		normalizePowerScoreResult(computePowerScore(game, history, stallCount, winProbability)),
		options.disabledSignals ?? [],
	);
	const frozen = isPlayFrozen(game);
	const favoriteTeamCount = options.favoriteTeamCount ?? 0;
	const favoriteBonus = frozen ? 0 : favoriteTeamCount * (options.favoriteBonusPoints ?? 0);
	const gameBoost = frozen ? 0 : (options.gameBoost ?? 0);
	const scoringOpportunityBoost = computeScoringOpportunityBoost(game);
	const postseasonBoost = frozen ? 0 : Math.round((options.postseasonBoostPoints ?? 0) * postseasonBoostShare(options.postseasonRound));
	const automaticTotal = Math.min(scoreMaxTotal, baseScore.total + favoriteBonus + scoringOpportunityBoost + postseasonBoost);
	const reasonParts = [
		baseScore.reason,
		...boostReasonParts(favoriteBonus, gameBoost, scoringOpportunityBoost, postseasonBoost),
	].filter(Boolean);

	return normalizePowerScoreResult(
		{
			...baseScore,
			signalsSubtotal: baseScore.signalsSubtotal ?? baseScore.total,
			favoriteBonus,
			favoriteTeamCount,
			gameBoost,
			scoringOpportunityBoost,
			postseasonBoost,
			total: automaticTotal + gameBoost,
			reason: reasonParts.join(', '),
		},
		{ allowTotalOverflow: true },
	);
};
