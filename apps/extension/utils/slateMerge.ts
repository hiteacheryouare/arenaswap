import type { Game, LeagueId } from '@arenaswap/core/types';

export interface guideSlateOutcome {
	/** What the Guide is shown. */
	games: Game[];
	/** Nothing to vouch for: the Guide shows its error banner instead of a quiet day. */
	refused: boolean;
	/** Whether `games` replaces the slate the worker holds between opens. */
	write: boolean;
	/** Whether the ten-minute clock restarts. Only an answer from every league earns that. */
	stamp: boolean;
}

// A league that did not answer contributes nothing and says nothing, so its entries are carried over
// from the list we already had rather than dropped with the rest.
export const keepRefusedLeagues = (previous: Game[], shedLeagues: LeagueId[]): Game[] => (
	previous.filter(game => shedLeagues.includes(game.league))
);

export const isEveryLeagueRefused = (enabledLeagues: LeagueId[], shedLeagues: LeagueId[]): boolean => (
	enabledLeagues.length > 0 && enabledLeagues.every(id => shedLeagues.includes(id))
);

// The fetch threw outright, or every league refused. Hold what there is, and say so if there is nothing.
export const resolveGuideSlateFailure = (previous: Game[]): guideSlateOutcome => (
	{ games: previous, refused: previous.length === 0, write: false, stamp: false }
);

// The fetch resolves whatever happened, so this is where a refusal is told apart from a quiet day.
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
		stamp: shedLeagues.length === 0,
	};
};
