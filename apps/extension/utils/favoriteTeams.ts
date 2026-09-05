import type { EspnTeamEntry } from '@arenaswap/core';
import { createFavoriteTeamKey, parseFavoriteTeamKey } from '@arenaswap/core/constants';
import type { LeagueId } from '@arenaswap/core/types';
import { leagueOrder } from '../entrypoints/popup/popupHelpers';

export interface favoriteTeamRow {
	key: string;
	team: EspnTeamEntry;
	isTracked: boolean;
}

// The picker offers the leagues being tracked, but a favorite outlives its league being switched
// off. Those leagues are fetched too, purely so what is already saved can still be named and
// un-starred — otherwise the only way to drop one would be to re-enable the league first.
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
	const needle = query.trim().toLowerCase();
	if (!needle) return true;

	return (team.name ?? '').toLowerCase().includes(needle)
		|| (team.abbreviation ?? '').toLowerCase().includes(needle);
};

// A stored key with no team behind it — a league whose fetch failed, or a team ESPN has since
// dropped — is left out rather than rendered as its raw id, which would name nothing anyone
// could act on. Untracked favorites sort last so the inert ones read as a tail.
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
