import type { Game, PostseasonRound, ReasonFragment } from './types';

// Shares of the postseason boost, indexed by distance from the trophy. Even quarters: at a ceiling
// of 8 the ladder is 2/4/6/8, which never rounds two rungs onto the same integer.
const roundShares: Record<PostseasonRound, number> = { 0: 1, 1: 0.75, 2: 0.5, 3: 0.25 };

export const postseasonBoostShare = (round: PostseasonRound | undefined): number =>
	round === undefined ? 0 : roundShares[round] ?? 0;

// A postseason game the feed gave no round for says nothing: there is no rule to point at.
// The off sentence reads the setting, not the points: a setting of 1 rounds an early round to 0.
export const postseasonDetails = (game: Game<string>, setting: number): ReasonFragment[] => {
	const round = game.postseasonRound;
	if (round === undefined) return game.seasonType === 'postseason' ? [] : [{ key: 'regularSeason' }];
	if (setting <= 0) return [{ key: 'postseasonBoostOff' }];
	return [{ key: 'postseasonRound', params: { round } }];
};
