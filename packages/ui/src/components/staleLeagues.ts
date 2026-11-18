import type { LeagueId, LeagueLastGoodAt } from '@arenaswap/core/types';
import type { Translator } from './defaultStrings';

export type StaleLeagueMinutes = Partial<Record<LeagueId, number>>;

const minuteMs = 60_000;
export const staleNoteAfterMinutes = 5;

export const staleLeagueMinutes = (shedLeagues: LeagueId[], lastGoodAt: LeagueLastGoodAt, nowMs: number): StaleLeagueMinutes => {
	const minutes: StaleLeagueMinutes = {};
	for (const leagueId of shedLeagues) {
		const answeredAt = lastGoodAt[leagueId];
		if (answeredAt === undefined) continue;
		const quietMinutes = Math.floor((nowMs - answeredAt) / minuteMs);
		if (quietMinutes >= staleNoteAfterMinutes) minutes[leagueId] = quietMinutes;
	}
	return minutes;
};

export const stuckGameMinutes = (stuckSince: Record<string, number>, nowMs: number): Record<string, number> => Object.fromEntries(
	Object.entries(stuckSince).map(([gameId, since]) => [gameId, Math.max(0, Math.floor((nowMs - since) / minuteMs))]),
);

export const formatStaleNote = (minutes: number, t: Translator): string => (
	minutes < 60 ? t('gameCard.staleMinutes', minutes) : t('gameCard.staleHours', Math.floor(minutes / 60))
);
