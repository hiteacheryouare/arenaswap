import { allLeagueIds, resolveLeagueLogoUrl } from '@arenaswap/core/constants';
import type { LeagueLogoMap, LeagueScheduleMap } from '@arenaswap/core/types';

export const seededLeagueLogos = (): LeagueLogoMap => Object.fromEntries(
	allLeagueIds.map(leagueId => [leagueId, resolveLeagueLogoUrl(leagueId)]),
) as LeagueLogoMap;

export const leagueLogoCacheKey = 'arenaswap.allLeagueLogos';

export const leagueLogoCacheTtlMs = 7 * 24 * 60 * 60 * 1000;

export interface storedLeagueLogos {
	fetchedAt: number;
	logos: LeagueLogoMap;
	schedules: LeagueScheduleMap;
}

export const isLeagueLogoCacheFresh = (stored: unknown, now: number): stored is storedLeagueLogos => {
	if (typeof stored !== 'object' || stored === null) return false;
	const { fetchedAt, logos, schedules } = stored as Partial<storedLeagueLogos>;
	if (typeof fetchedAt !== 'number' || !Number.isFinite(fetchedAt)) return false;
	if (typeof logos !== 'object' || logos === null) return false;
	if (typeof schedules !== 'object' || schedules === null) return false;
	return now >= fetchedAt && now - fetchedAt < leagueLogoCacheTtlMs;
};
