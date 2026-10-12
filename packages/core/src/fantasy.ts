import type { FantasyPosition, FantasySport } from 'powerscore';
import { isLeagueId } from './constants';
import type { Game, LeagueId } from './types';

// One rostered player, or a team defense (athleteId `dst:<teamId>`, position 'DST').
export interface FantasyRosterEntry {
	league: LeagueId;
	athleteId: string;
	name: string;
	teamId: string;
	position: FantasyPosition;
}

export const fantasyRosterLimit = 50;
export const fantasyRosterStorageKey = 'fantasyRoster';

const positions: readonly FantasyPosition[] = ['QB', 'RB', 'WR', 'TE', 'K', 'DST', 'P', 'H', 'player'];

export const normalizeFantasyRoster = (stored: unknown): FantasyRosterEntry[] => {
	if (!Array.isArray(stored)) return [];
	const seen = new Set<string>();
	const roster: FantasyRosterEntry[] = [];
	for (const entry of stored as Partial<FantasyRosterEntry>[]) {
		if (!entry || typeof entry !== 'object') continue;
		const { league, athleteId, name, teamId, position } = entry;
		if (!isLeagueId(league) || typeof athleteId !== 'string' || typeof name !== 'string' || typeof teamId !== 'string') continue;
		if (!positions.includes(position as FantasyPosition)) continue;
		const key = `${league}:${athleteId}`;
		if (seen.has(key)) continue;
		seen.add(key);
		roster.push({ league, athleteId, name: name.slice(0, 60), teamId, position: position as FantasyPosition });
		if (roster.length >= fantasyRosterLimit) break;
	}
	return roster;
};

export const rosterInGame = (roster: readonly FantasyRosterEntry[], game: Pick<Game, 'league' | 'homeTeam' | 'awayTeam'>): FantasyRosterEntry[] => (
	roster.filter(entry => entry.league === game.league && (entry.teamId === game.homeTeam.id || entry.teamId === game.awayTeam.id))
);

export type FantasyScoringOverrides = Partial<Record<FantasySport, Partial<Record<string, number>>>>;
