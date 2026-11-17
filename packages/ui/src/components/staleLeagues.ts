import type { LeagueId, LeagueLastGoodAt } from '@arenaswap/core/types';
import type { Translator } from './defaultStrings';

export type StaleLeagueMinutes = Partial<Record<LeagueId, number>>;

const minuteMs = 60_000;

export const staleLeagueMinutes = (shedLeagues: LeagueId[], lastGoodAt: LeagueLastGoodAt, nowMs: number): StaleLeagueMinutes => {
	const minutes: StaleLeagueMinutes = {};
	for (const leagueId of shedLeagues) {
		const answeredAt = lastGoodAt[leagueId];
		if (answeredAt === undefined) continue;
		const quietMinutes = Math.floor((nowMs - answeredAt) / minuteMs);
		if (quietMinutes >= 1) minutes[leagueId] = quietMinutes;
	}
	return minutes;
};

export const formatStaleNote = (minutes: number, t: Translator): string => (
	minutes < 60 ? t('gameCard.staleMinutes', minutes) : t('gameCard.staleHours', Math.floor(minutes / 60))
);
