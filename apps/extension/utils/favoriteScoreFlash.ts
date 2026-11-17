import { createFavoriteTeamKey } from '@arenaswap/core/constants';
import type { Game } from '@arenaswap/core/types';

export interface gameScoreline {
	home: number;
	away: number;
}

export const scorelineOf = (game: Game): gameScoreline => ({
	home: game.homeTeam.score,
	away: game.awayTeam.score,
});

const isHex = (value: string | undefined): value is string => (
	typeof value === 'string' && /^#?[\da-fA-F]{6}$/.test(value.trim())
);

const withHash = (value: string): string => (value.trim().startsWith('#') ? value.trim() : `#${value.trim()}`);

// ESPN sends these without a leading hash about as often as with one.
export const teamColors = (color?: string, alternateColor?: string): string[] => {
	const colors = [color, alternateColor].filter(isHex).map(withHash);
	return colors.length > 0 ? colors : ['#ffffff'];
};

export const favoriteScoreFlashColors = (
	previous: gameScoreline | null,
	game: Game,
	favoriteTeamIds: ReadonlySet<string>,
): string[] | null => {
	if (!previous) return null;
	const next = scorelineOf(game);

	const scorer = next.home > previous.home
		? game.homeTeam
		: next.away > previous.away ? game.awayTeam : null;
	if (!scorer) return null;
	if (!favoriteTeamIds.has(createFavoriteTeamKey(game.league, scorer.id))) return null;

	return teamColors(scorer.color, scorer.alternateColor);
};

export interface scoringBurst {
	colors: string[];
	count: number;
}

export const maxBurstsPerPoll = 4;

export const scoringBursts = (previous: gameScoreline | null, game: Game): scoringBurst[] => {
	if (!previous) return [];
	const next = scorelineOf(game);
	return ([[game.homeTeam, next.home - previous.home], [game.awayTeam, next.away - previous.away]] as const)
		.filter(([, gained]) => gained > 0)
		.map(([team, gained]) => ({ colors: teamColors(team.color, team.alternateColor), count: Math.min(gained, maxBurstsPerPoll) }));
};
