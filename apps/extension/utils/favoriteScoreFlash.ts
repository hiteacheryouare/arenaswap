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

// Both colours where a team has two, so the string alternates rather than reading as one flat wash.
// ESPN sends these without a leading hash about as often as with one.
const teamColors = (color?: string, alternateColor?: string): string[] => {
	const colors = [color, alternateColor].filter(isHex).map(withHash);
	return colors.length > 0 ? colors : ['#ffffff'];
};

// Returns the colours to flash the lights in, or null when nothing worth celebrating happened.
// Only the game on screen, and only a team this user follows.
export const favoriteScoreFlashColors = (
	previous: gameScoreline | null,
	game: Game,
	favoriteTeamIds: ReadonlySet<string>,
): string[] | null => {
	if (!previous) return null;
	const next = scorelineOf(game);

	// A home score and an away score cannot both arrive in one poll of a real game, and if they
	// somehow do, the home side is as good a pick as any.
	const scorer = next.home > previous.home
		? game.homeTeam
		: next.away > previous.away ? game.awayTeam : null;
	if (!scorer) return null;
	if (!favoriteTeamIds.has(createFavoriteTeamKey(game.league, scorer.id))) return null;

	return teamColors(scorer.color, scorer.alternateColor);
};
