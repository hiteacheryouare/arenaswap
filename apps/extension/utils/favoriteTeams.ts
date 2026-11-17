import type { EspnTeamEntry } from '@arenaswap/sideline';
import { createFavoriteTeamKey, parseFavoriteTeamKey } from '@arenaswap/core/constants';
import type { LeagueId } from '@arenaswap/core/types';
import { leagueOrder } from './leagueOrder';
import { foldForSearch } from './searchText';

export interface favoriteTeamRow {
	key: string;
	team: EspnTeamEntry;
	isTracked: boolean;
}

export const leaguesForFavoritePicker = (
	enabledLeagues: readonly LeagueId[],
	favoriteTeamIds: readonly string[],
): LeagueId[] => {
	const leagues = new Set<LeagueId>(enabledLeagues);
	for (const favoriteTeamKey of favoriteTeamIds) {
		const parsed = parseFavoriteTeamKey(favoriteTeamKey);
		if (parsed) leagues.add(parsed.leagueId);
	}

	return [...leagues].toSorted((a, b) => (leagueOrder[a] ?? 99) - (leagueOrder[b] ?? 99));
};

export const matchesTeamQuery = (team: EspnTeamEntry, query: string): boolean => {
	const needle = foldForSearch(query);
	if (!needle) return true;

	return foldForSearch(team.name ?? '').includes(needle)
		|| foldForSearch(team.abbreviation ?? '').includes(needle);
};

export const favoriteTeamRows = (
	teams: readonly EspnTeamEntry[],
	favoriteTeamIds: ReadonlySet<string>,
	enabledLeagues: readonly LeagueId[],
): favoriteTeamRow[] => {
	const tracked = new Set(enabledLeagues);

	return teams
		.map(team => ({
			key: createFavoriteTeamKey(team.leagueId, team.id),
			team,
			isTracked: tracked.has(team.leagueId),
		}))
		.filter(row => favoriteTeamIds.has(row.key))
		.toSorted((a, b) => (
			Number(b.isTracked) - Number(a.isTracked)
			|| (leagueOrder[a.team.leagueId] ?? 99) - (leagueOrder[b.team.leagueId] ?? 99)
			|| a.team.name.localeCompare(b.team.name)
		));
};
