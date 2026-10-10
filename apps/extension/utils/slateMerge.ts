import type { Game, LeagueId } from '@arenaswap/core/types';

// How long the guide will draw the slate the last wide fetch produced. Generous because the live
// polls merge their answers into it, so what ages here is only the roster of games — a kickoff
// being added to the day — rather than any score or clock on screen.
export const guideSlateTtlMs = 10 * 60 * 1000;

// How long a slate that lost leagues, or one every league refused, is trusted before the next open
// asks again. Short, but not zero: every poll broadcast makes an open Guide ask, and a refusal that
// was asked about again each time would add a wide fetch to the very quota that caused it.
export const guideSlateRetryMs = 60 * 1000;

export interface guideSlateOutcome {
	/** What the Guide is shown. */
	games: Game[];
	/** Nothing to vouch for: the Guide shows its error banner instead of a quiet day. */
	refused: boolean;
	/** Whether `games` replaces the slate the worker holds between opens. */
	write: boolean;
	/** How long before the next open asks again. Only an answer from every league earns the full TTL. */
	holdMs: number;
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
	{ games: previous, refused: previous.length === 0, write: false, holdMs: guideSlateRetryMs }
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
		holdMs: shedLeagues.length === 0 ? guideSlateTtlMs : guideSlateRetryMs,
	};
};
