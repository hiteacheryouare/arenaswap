import type { Game, LeagueId } from '@arenaswap/core/types';

export const guideSlateTtlMs = 10 * 60 * 1000;

export const slateRefreshMs = 60 * 60 * 1000;

export const guideSlateRetryMs = 60 * 1000;

export interface guideSlateOutcome {
	games: Game[];
	refused: boolean;
	write: boolean;
	holdMs: number;
}

export const keepRefusedLeagues = (previous: Game[], shedLeagues: LeagueId[]): Game[] => (
	previous.filter(game => shedLeagues.includes(game.league))
);

export const isEveryLeagueRefused = (enabledLeagues: LeagueId[], shedLeagues: LeagueId[]): boolean => (
	enabledLeagues.length > 0 && enabledLeagues.every(id => shedLeagues.includes(id))
);

export const resolveGuideSlateFailure = (previous: Game[]): guideSlateOutcome => (
	{ games: previous, refused: previous.length === 0, write: false, holdMs: guideSlateRetryMs }
);

export const resolveGuideSlate = (
	previous: Game[],
	fresh: Game[],
	enabledLeagues: LeagueId[],
	shedLeagues: LeagueId[],
): guideSlateOutcome => {
	if (isEveryLeagueRefused(enabledLeagues, shedLeagues)) return resolveGuideSlateFailure(previous);
	const games = [...keepRefusedLeagues(previous, shedLeagues), ...fresh];
	return {
		games,
		refused: games.length === 0 && shedLeagues.length > 0,
		write: true,
		holdMs: shedLeagues.length === 0 ? guideSlateTtlMs : guideSlateRetryMs,
	};
};
