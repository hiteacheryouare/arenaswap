import type { LeagueId, LeagueLastGoodAt } from '@arenaswap/core/types';
import type { Translator } from './defaultStrings';

export type StaleLeagueMinutes = Partial<Record<LeagueId, number>>;

const minuteMs = 60_000;

// A league that never answered has no age to report, and no games either, so it is left out
// rather than guessed at.
export const staleLeagueMinutes = (shedLeagues: LeagueId[], lastGoodAt: LeagueLastGoodAt, nowMs: number): StaleLeagueMinutes => {
	const minutes: StaleLeagueMinutes = {};
	for (const leagueId of shedLeagues) {
		const answeredAt = lastGoodAt[leagueId];
		if (answeredAt === undefined) continue;
		// Clamped for a clock that stepped back between the worker's write and the popup's read.
		minutes[leagueId] = Math.max(0, Math.floor((nowMs - answeredAt) / minuteMs));
	}
	return minutes;
};

export const formatStaleNote = (minutes: number, t: Translator): string => (
	minutes < 1 ? t('gameCard.staleUnderMinute') : t('gameCard.staleMinutes', minutes)
);
