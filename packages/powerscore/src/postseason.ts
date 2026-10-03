import type { PostseasonRound } from './types';

// Shares of the postseason boost, indexed by distance from the trophy. Even quarters: at a ceiling
// of 8 the ladder is 2/4/6/8, which never rounds two rungs onto the same integer.
const roundShares: Record<PostseasonRound, number> = { 0: 1, 1: 0.75, 2: 0.5, 3: 0.25 };

export const postseasonBoostShare = (round: PostseasonRound | undefined): number =>
	round === undefined ? 0 : roundShares[round] ?? 0;
