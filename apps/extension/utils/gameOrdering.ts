import { estimatedWrapMs, isFavoriteTeamGame } from '@arenaswap/core/constants';
import type { Game, LeagueId } from '@arenaswap/core/types';
import { leagueOrder } from './leagueOrder';

// Leagues absent from `enabledLeagues` sort after every enabled one, keeping their canonical
// order relative to each other.
export const buildLeagueRank = (enabledLeagues: LeagueId[]): Record<LeagueId, number> => {
	const ranks = {} as Record<LeagueId, number>;
	for (const [index, leagueId] of enabledLeagues.entries()) {
		if (ranks[leagueId] === undefined) ranks[leagueId] = index;
	}
	for (const leagueId of Object.keys(leagueOrder) as LeagueId[]) {
		if (ranks[leagueId] === undefined) ranks[leagueId] = enabledLeagues.length + leagueOrder[leagueId];
	}
	return ranks;
};

type gameComparator = (a: Game, b: Game) => number;

const firstDifference = (...comparators: (gameComparator | false)[]): gameComparator => (a, b) => {
	for (const comparator of comparators) {
		if (!comparator) continue;
		const difference = comparator(a, b);
		if (difference !== 0) return difference;
	}
	return 0;
};

const startMs = (game: Game): number => (
	game.startTime ? new Date(game.startTime).getTime() : Number.POSITIVE_INFINITY
);

const dayStart = (game: Game): number => {
	if (!game.startTime) return Number.POSITIVE_INFINITY;
	const date = new Date(game.startTime);
	return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
};

// Subtracting two infinities is NaN, which a sort reads as "equal" and then trips over.
const ascending = (a: number, b: number): number => (a === b ? 0 : a - b);

const byLeagueRank = (leagueRank: Record<LeagueId, number>): gameComparator => (a, b) => (
	(leagueRank[a.league] ?? Number.MAX_SAFE_INTEGER) - (leagueRank[b.league] ?? Number.MAX_SAFE_INTEGER)
);
const favoritesFirst = (favoriteTeamIds: Set<string>): gameComparator => (a, b) => (
	Number(isFavoriteTeamGame(b, favoriteTeamIds)) - Number(isFavoriteTeamGame(a, favoriteTeamIds))
);
const highestScoreFirst = (scoreByGameId: Map<string, number>): gameComparator => (a, b) => (
	(scoreByGameId.get(b.id) ?? 0) - (scoreByGameId.get(a.id) ?? 0)
);
const earliestStartFirst: gameComparator = (a, b) => ascending(startMs(a), startMs(b));
const earliestDayFirst: gameComparator = (a, b) => ascending(dayStart(a), dayStart(b));
const byId: gameComparator = (a, b) => a.id.localeCompare(b.id);

// Grouped, the league comes first so each league is one unbroken run under its header. Mixed, it
// drops to a tiebreaker and favorites are pinned above every other league's games.
export const buildLiveComparator = (
	leagueRank: Record<LeagueId, number>,
	favoriteTeamIds: Set<string>,
	scoreByGameId: Map<string, number>,
	grouped: boolean,
) => firstDifference(
	grouped && byLeagueRank(leagueRank),
	favoritesFirst(favoriteTeamIds),
	highestScoreFirst(scoreByGameId),
	earliestStartFirst,
	byLeagueRank(leagueRank),
	byId,
);

// Up Next pages by day, so the day comes before anything else in either mode.
export const buildUpcomingComparator = (
	leagueRank: Record<LeagueId, number>,
	favoriteTeamIds: Set<string>,
	grouped: boolean,
) => firstDifference(
	earliestDayFirst,
	grouped && byLeagueRank(leagueRank),
	favoritesFirst(favoriteTeamIds),
	earliestStartFirst,
	byLeagueRank(leagueRank),
	byId,
);

// Your teams first, then most recently wrapped. Finished games are read as a list of results
// rather than a set of choices, so PowerScore has no say here — the background stops scoring a game
// the moment it stops being live, and ranking results by how exciting they were would put
// yesterday's thriller above the game that ended ten minutes ago.
export const buildFinalComparator = (
	leagueRank: Record<LeagueId, number>,
	favoriteTeamIds: Set<string>,
	grouped: boolean,
) => {
	const now = Date.now();
	return firstDifference(
		grouped && byLeagueRank(leagueRank),
		favoritesFirst(favoriteTeamIds),
		(a, b) => estimatedWrapMs(b, now) - estimatedWrapMs(a, now),
		byLeagueRank(leagueRank),
		byId,
	);
};

// Up Next starts at today's midnight: a pregame game from an earlier day is a stale copy of one that
// has since been played, not a page worth flipping back to.
export const isInUpcomingWindow = (game: Game, days: number, now: Date): boolean => {
	if (!game.startTime) return true;
	const kickoffMs = startMs(game);
	return kickoffMs >= new Date(now).setHours(0, 0, 0, 0) && kickoffMs <= now.getTime() + days * 24 * 60 * 60 * 1000;
};
