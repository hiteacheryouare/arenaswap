import type { Game, PostseasonRound, ReasonFragment } from './types';

const roundShares: Record<PostseasonRound, number> = { 0: 1, 1: 0.75, 2: 0.5, 3: 0.25 };

export const postseasonBoostShare = (round: PostseasonRound | undefined): number =>
	round === undefined ? 0 : roundShares[round] ?? 0;

export const postseasonDetails = (game: Game<string>, setting: number): ReasonFragment[] => {
	const round = game.postseasonRound;
	if (round === undefined) return game.seasonType === 'postseason' ? [] : [{ key: 'regularSeason' }];
	if (setting <= 0) return [{ key: 'postseasonBoostOff' }];
	return [{ key: 'postseasonRound', params: { round } }];
};
