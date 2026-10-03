import { scoreGame } from '../../../packages/powerscore/src/compose';
import { createDefaultUserPreferences } from '../../../packages/core/src/constants';
import { scoreOptionsFor, scoringContextFor, toScoringGame } from '../../../packages/core/src/scoring';
import { scoreGameV2 } from '../../../packages/powerscore/tests/legacy/v2/compose';
import type { Game as V2Game } from '../../../packages/powerscore/tests/legacy/v2/types';
import type { BuiltInModeId } from '../../../packages/powerscore/src/types';
import type { Scorer } from './session';

export const replayPrefs = createDefaultUserPreferences();

const universalBoosts = new Set(['favoriteBoost', 'gameBoost', 'postseasonBoost']);

// 2.2.0 exactly as it shipped: the frozen scorer plus the arithmetic background.ts did after it.
export const v2Scorer: Scorer = {
	name: 'v2',
	score: input => {
		const context = scoringContextFor(input);
		const result = scoreGameV2(input.game as unknown as V2Game, context.history ?? [], context.stallCount ?? 0, context.winProbability ?? [], {
			disabledSignals: replayPrefs.disabledSignals,
			favoriteTeamCount: 0,
			favoriteBonusPoints: replayPrefs.favoriteTeamBonusPoints,
			postseasonBoostPoints: replayPrefs.postseasonBoostPoints,
			postseasonRound: input.game.postseasonRound,
			gameBoost: 0,
		});
		return { gameId: result.gameId, total: result.total, reason: result.reason };
	},
};

// The working tree's engine through core's adapter, as the background calls it.
export const createV3Scorer = (mode: BuiltInModeId = 'classic', name = `v3-${mode}`): Scorer => ({
	name,
	score: input => {
		const score = scoreGame(toScoringGame(input.game), scoringContextFor(input), { ...scoreOptionsFor(input.game, replayPrefs, 0), mode });
		const boosts = Object.fromEntries(score.boosts.filter(boost => boost.points > 0 && !universalBoosts.has(boost.id)).map(boost => [boost.id, boost.points]));
		return { gameId: score.gameId, total: score.total, reason: score.reason, boosts };
	},
});
