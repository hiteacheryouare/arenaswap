import { isFavoriteTeamGame } from '@arenaswap/core/constants';
import type { Game, LeagueId, PowerScoreSnapshot } from '@arenaswap/core/types';

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

const trendWindowMs = 60_000;
const trendFloorMs = 20_000;

// How far a game's PowerScore has moved over roughly the last minute. Null until there is a reading
// old enough to compare against, so a game that has just arrived says nothing rather than "Steady".
export const powerTrend = (history: PowerScoreSnapshot[] | undefined, now = Date.now()): number | null => {
	if (!history || history.length < 2) return null;
	const ordered = history.toSorted((a, b) => a.timestamp - b.timestamp);
	const latest = ordered.at(-1)!;
	const reference = ordered.findLast(snapshot => snapshot.timestamp <= latest.timestamp - trendWindowMs)
		?? ordered.find(snapshot => latest.timestamp - snapshot.timestamp >= trendFloorMs);
	if (!reference || now - latest.timestamp > 5 * trendWindowMs) return null;
	return Math.round(latest.total - reference.total);
};
