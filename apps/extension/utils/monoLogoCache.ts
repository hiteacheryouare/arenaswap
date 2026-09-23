import type { LeagueId, TeamMonoLogoMap } from '@arenaswap/core/types';

/* ESPN's white team marks live only on `/teams`, one request per league at `limit=1000`, and the
   background held the answer in a module-scope `let` described as lasting a worker lifetime. Under
   MV3 a worker lifetime ends after about thirty seconds idle, so in practice that cache was close to
   per-guide-open — 31 of the largest responses in the product, repeatedly — and `wxt dev` wipes it
   on every file save on top of that.

   Team artwork changes on the scale of a rebrand, so this is the same weekly `storage.local` shape
   the league logos use. Stored per league rather than as one blob keyed by the enabled set, because
   enabling a 32nd league should cost one request rather than re-fetching the 31 already held. */

export const monoLogoCacheKey = 'arenaswap.teamMonoLogos';

export const monoLogoCacheTtlMs = 7 * 24 * 60 * 60 * 1000;

export interface storedMonoLogos {
	fetchedAt: number;
	logos: TeamMonoLogoMap;
}

// A stamp in the future is stale rather than fresh forever, which is what a clock that moved
// backwards after a write would otherwise leave behind.
export const isMonoLogoCacheFresh = (stored: unknown, now: number): stored is storedMonoLogos => {
	if (typeof stored !== 'object' || stored === null) return false;
	const { fetchedAt, logos } = stored as Partial<storedMonoLogos>;
	if (typeof fetchedAt !== 'number' || !Number.isFinite(fetchedAt)) return false;
	if (typeof logos !== 'object' || logos === null) return false;
	return now >= fetchedAt && now - fetchedAt < monoLogoCacheTtlMs;
};

export const missingMonoLogoLeagues = (logos: TeamMonoLogoMap, leagueIds: LeagueId[]): LeagueId[] => (
	leagueIds.filter(leagueId => logos[leagueId] === undefined)
);
