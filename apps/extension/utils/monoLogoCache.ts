import type { LeagueId, TeamMonoLogoMap } from '@arenaswap/core/types';

export const monoLogoCacheKey = 'arenaswap.teamMonoLogos';

export const monoLogoCacheTtlMs = 7 * 24 * 60 * 60 * 1000;

export interface storedMonoLogos {
	fetchedAt: number;
	logos: TeamMonoLogoMap;
}

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
