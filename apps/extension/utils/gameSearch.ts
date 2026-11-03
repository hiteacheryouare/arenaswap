import { isCollegeLeagueId, leagueLabels, leagueShortLabels } from '@arenaswap/core/constants';
import type { Game, Team } from '@arenaswap/core/types';
import { foldForSearch } from './searchText';

const teamTerms = (team: Team) => [team.name, team.shortName, team.nickname, team.abbreviation];

const searchableText = (game: Game): string => foldForSearch([
	...teamTerms(game.awayTeam),
	...teamTerms(game.homeTeam),
	leagueLabels[game.league],
	leagueShortLabels[game.league],
	isCollegeLeagueId(game.league) ? 'college' : undefined,
	...(game.broadcasts ?? []),
	game.venueName,
	game.venueLocation,
].filter(Boolean).join('\n'));

// Every word has to land somewhere, so "boston tnt" narrows to the Boston game on TNT rather than
// widening to every Boston game and every TNT game.
export const matchesGameQuery = (game: Game, query: string): boolean => {
	const words = foldForSearch(query).split(/\s+/).filter(Boolean);
	if (words.length === 0) return true;
	const text = searchableText(game);
	return words.every(word => text.includes(word));
};
