// The 2.x API, kept so existing callers and npm users keep working. New code should call scoreGame.
import {
	scorerTunables,
	scoreMaxCloseness,
	scoreMaxLateGame,
	scoreMaxMomentum,
	scoreMaxLeadChanges,
	scoreMaxComeback,
	scoreMaxTotal,
	scoreMaxSignalsSubtotal,
	scoreWinProbVarianceMax,
} from './constants';
import { createSignalInput, scoreGame, signalPoints } from './compose';
import { clamp, toFiniteNumber } from './math';
import { classicMode } from './modes';
import { computeScoringOpportunity } from './boosts/scoringOpportunity';
import { getGameProgress, isPlayFrozen } from './progress';
import { resolveLeagueConfig, resolveSportConfig } from './config';
import type { Game, PowerScoreMode, PowerScoreResult, ScoreSnapshot } from './types';

export { isPlayFrozen };
export { computeWinProbVarianceScore } from './winProbability';

interface NormalizePowerScoreOptions { allowTotalOverflow?: boolean; }

const classicSignalsOnly: PowerScoreMode = { ...classicMode, boosts: [] };

/** @deprecated Use scoreGame, which returns every signal and boost as a list. */
export const computePowerScore = (
	game: Game,
	history: ScoreSnapshot[] = [],
	stallCount: number = 0,
	winProbabilityHistory: number[] = [],
): PowerScoreResult => {
	const score = scoreGame(game, { history, stallCount, winProbability: winProbabilityHistory }, { mode: classicSignalsOnly });
	const flat = {
		gameId: game.id,
		total: score.baseTotal,
		closeness: signalPoints(score, 'closeness'),
		lateGame: signalPoints(score, 'lateGame'),
		momentum: signalPoints(score, 'momentum'),
		leadChanges: signalPoints(score, 'leadChanges'),
		comeback: signalPoints(score, 'comeback'),
		reason: score.reason,
		stalled: score.stalled,
	};
	// A frozen game reports only the zeros, as 2.x did.
	if (isPlayFrozen(game)) return normalizePowerScoreResult(flat);
	return normalizePowerScoreResult({
		...flat,
		...(score.winProbabilityVariance !== undefined ? { winProbabilityVariance: score.winProbabilityVariance } : {}),
		stallPenalty: score.stallPenalty,
		signalsSubtotal: score.signalsSubtotal,
	});
};

/** @deprecated Use scoreGame; the boost is in its `boosts` list as 'scoringOpportunity'. */
export const computeScoringOpportunityBoost = (game: Game): number => {
	const input = createSignalInput(game, {});
	return computeScoringOpportunity(input);
};

// Public so a consumer drawing a game on a timeline projects its end from the same clock the
// lateGame signal reads, rather than from a second copy of it.
export const computeGameProgress = (game: Game): number => (
	getGameProgress(game, resolveSportConfig(game.sportType), resolveLeagueConfig(game))
);

/** @deprecated The flat 2.x shape. */
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
