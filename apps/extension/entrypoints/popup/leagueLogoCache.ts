import { allLeagueIds, resolveLeagueLogoUrl } from '@arenaswap/core/constants';
import type { LeagueLogoMap } from '@arenaswap/core/types';

/* Filling the league pickers used to cost 31 parallel scoreboard requests on every popup open, with
   the answer held in component state and thrown away when the popup closed. That is more than
   ESPN's burst allowance in a single call — see `espnRequestPoolSize` — so the pickers were the
   thing spending the budget the slate needed, and the slate came back short.

   Nothing about it needed the network. `resolveLeagueLogoUrl` answers for all 31 leagues offline:
   nine are pinned to an override it returns without ever looking at ESPN's, and the other 22 have a
   hardcoded fallback on the same CDN. So the pickers are drawn from that immediately and the fetch
   became an upgrade — run at most weekly, written down, and merged over the seed so a league that
   gets shed keeps the URL it would have had anyway. */

export const seededLeagueLogos = (): LeagueLogoMap => Object.fromEntries(
	allLeagueIds.map(leagueId => [leagueId, resolveLeagueLogoUrl(leagueId)]),
) as LeagueLogoMap;

export const leagueLogoCacheKey = 'arenaswap.allLeagueLogos';

// League artwork changes on the scale of a rebrand. A week is short enough that one lands within a
// season and long enough that opening the popup is free.
export const leagueLogoCacheTtlMs = 7 * 24 * 60 * 60 * 1000;

export interface storedLeagueLogos {
	fetchedAt: number;
	logos: LeagueLogoMap;
}

// A stamp in the future is treated as stale rather than as fresh forever, which is what a clock that
// moved backwards after a write would otherwise leave behind.
export const isLeagueLogoCacheFresh = (stored: unknown, now: number): stored is storedLeagueLogos => {
	if (typeof stored !== 'object' || stored === null) return false;
	const { fetchedAt, logos } = stored as Partial<storedLeagueLogos>;
	if (typeof fetchedAt !== 'number' || !Number.isFinite(fetchedAt)) return false;
	if (typeof logos !== 'object' || logos === null) return false;
	return now >= fetchedAt && now - fetchedAt < leagueLogoCacheTtlMs;
};
