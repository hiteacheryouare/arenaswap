import { isFavoriteTeamGame } from '@arenaswap/core/constants';
import type { Game, LeagueId } from '@arenaswap/core/types';

// Size is the score: the hottest live game takes the stage, anything at or above the tile floor is
// a tile, and everything else is a row.
export const tileFloor = 70;

export interface boardLayout {
	all: Game[];
	stage: Game | null;
	tiles: Game[];
	rows: Game[];
}

interface arrangeOptions {
	favoriteTeamIds?: Set<string>;
	leagueRank?: Partial<Record<LeagueId, number>>;
}

export const arrangeLive = (live: Game[], scores: Map<string, number>, { favoriteTeamIds = new Set(), leagueRank = {} }: arrangeOptions = {}): boardLayout => {
	const scoreOf = (game: Game) => scores.get(game.id) ?? 0;
	const all = live.toSorted((a, b) => {
		const diff = scoreOf(b) - scoreOf(a);
		if (diff !== 0) return diff;
		const aFavorite = isFavoriteTeamGame(a, favoriteTeamIds);
		const bFavorite = isFavoriteTeamGame(b, favoriteTeamIds);
		if (aFavorite !== bFavorite) return aFavorite ? -1 : 1;
		return (leagueRank[a.league] ?? 99) - (leagueRank[b.league] ?? 99) || a.id.localeCompare(b.id);
	});
	const [stage = null, ...rest] = all;
	return {
		all,
		stage,
		tiles: rest.filter(game => scoreOf(game) >= tileFloor),
		rows: rest.filter(game => scoreOf(game) < tileFloor),
	};
};
