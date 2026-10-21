import type { Game, TeamState } from './types';

export const teamName = (team: TeamState): string => team.nickname ?? team.abbreviation ?? '?';

// Boost details name a team by abbreviation, for the breakdown's own sentences.
export const teamNameFor = (game: Game<string>, abbreviation: unknown): string => {
	if (abbreviation === game.homeTeam.abbreviation) return teamName(game.homeTeam);
	if (abbreviation === game.awayTeam.abbreviation) return teamName(game.awayTeam);
	return String(abbreviation ?? '?');
};
