import { fantasyLeagues, fantasyRosterLimit } from '@arenaswap/core';
import type { FantasyRosterEntry, PlayerSearchResult } from '@arenaswap/core';
import type { LeagueId } from '@arenaswap/core/types';

export const rosterKey = (entry: Pick<FantasyRosterEntry | PlayerSearchResult, 'league' | 'athleteId'>): string => `${entry.league}:${entry.athleteId}`;

export const isRosterFull = (roster: readonly FantasyRosterEntry[]): boolean => roster.length >= fantasyRosterLimit;

export const addToRoster = (roster: readonly FantasyRosterEntry[], entry: FantasyRosterEntry): FantasyRosterEntry[] => {
	if (isRosterFull(roster) || roster.some(existing => rosterKey(existing) === rosterKey(entry))) return [...roster];
	return [...roster, entry];
};

export const removeFromRoster = (roster: readonly FantasyRosterEntry[], key: string): FantasyRosterEntry[] => (
	roster.filter(entry => rosterKey(entry) !== key)
);

export interface rosterLeagueGroup {
	league: LeagueId;
	entries: FantasyRosterEntry[];
}

// In the order the roster's leagues are listed everywhere else, each keeping the order players were added.
export const groupRosterByLeague = (roster: readonly FantasyRosterEntry[]): rosterLeagueGroup[] => (
	fantasyLeagues
		.map(league => ({ league, entries: roster.filter(entry => entry.league === league) }))
		.filter(group => group.entries.length > 0)
);

// The roster stores no image, but our sources file every headshot under the league and the athlete's id.
export const rosterHeadshot = (entry: Pick<FantasyRosterEntry, 'league' | 'athleteId' | 'position'>): string | undefined => (
	entry.position === 'DST' ? undefined : `https://a.espncdn.com/i/headshots/${entry.league}/players/full/${entry.athleteId}.png`
);
