import { createFavoriteTeamKey } from '@arenaswap/core/constants';
import type { LeagueId, SportType, UserPreferences } from '@arenaswap/core/types';
import { insertLeagueAtDefaultPosition, leagueOrder, leaguesBySportType, moveLeague } from './leagueOrder';

export const withLeagueToggled = (prefs: UserPreferences, leagueId: LeagueId): UserPreferences => {
	const enabledLeagues = prefs.enabledLeagues.includes(leagueId)
		? prefs.enabledLeagues.filter(id => id !== leagueId)
		: insertLeagueAtDefaultPosition(prefs.enabledLeagues, leagueId);
	return { ...prefs, enabledLeagues };
};

export const withSportToggled = (prefs: UserPreferences, sport: SportType, selectAll: boolean): UserPreferences => {
	const sportLeagueIds = leaguesBySportType[sport].map(l => l.id);
	const enabledLeagues = selectAll
		? sportLeagueIds.reduce(insertLeagueAtDefaultPosition, prefs.enabledLeagues)
		: prefs.enabledLeagues.filter(id => !sportLeagueIds.includes(id));
	return { ...prefs, enabledLeagues };
};

export const withLeagueMoved = (prefs: UserPreferences, fromIndex: number, toIndex: number): UserPreferences => ({
	...prefs,
	enabledLeagues: moveLeague(prefs.enabledLeagues, fromIndex, toIndex),
});

export const withLeagueOrderReset = (prefs: UserPreferences): UserPreferences => ({
	...prefs,
	enabledLeagues: prefs.enabledLeagues.toSorted((a, b) => leagueOrder[a] - leagueOrder[b]),
});

export const withFavoriteTeamToggled = (prefs: UserPreferences, leagueId: LeagueId, teamId: string): UserPreferences => {
	const favoriteTeamKey = createFavoriteTeamKey(leagueId, teamId);
	const current = new Set(prefs.favoriteTeamIds);
	if (current.has(favoriteTeamKey)) current.delete(favoriteTeamKey);
	else current.add(favoriteTeamKey);
	return { ...prefs, favoriteTeamIds: [...current], rivalTeamIds: prefs.rivalTeamIds.filter(key => key !== favoriteTeamKey) };
};

export const withRivalTeamToggled = (prefs: UserPreferences, leagueId: LeagueId, teamId: string): UserPreferences => {
	const rivalTeamKey = createFavoriteTeamKey(leagueId, teamId);
	const current = new Set(prefs.rivalTeamIds);
	if (current.has(rivalTeamKey)) current.delete(rivalTeamKey);
	else current.add(rivalTeamKey);
	return { ...prefs, rivalTeamIds: [...current], favoriteTeamIds: prefs.favoriteTeamIds.filter(key => key !== rivalTeamKey) };
};
