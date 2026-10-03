import { i18n } from '#i18n';
import { resolveOffseason } from '@arenaswap/core';
import type { LeagueSchedule } from '@arenaswap/core/types';

const dayMs = 24 * 60 * 60 * 1000;

// Calendar days are stamped at Pacific midnight, which still falls on the same date in UTC.
const formatReturnDay = (ms: number): string => (
	new Date(ms).toLocaleDateString([], { month: 'short', day: 'numeric', timeZone: 'UTC' })
);

// Counted from the reader's own date to the date printed beside it, so the two never disagree.
const daysUntil = (ms: number, now: number): number => {
	const today = new Date(now);
	const fromDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
	const returnDate = new Date(ms);
	const toDay = Date.UTC(returnDate.getUTCFullYear(), returnDate.getUTCMonth(), returnDate.getUTCDate());
	return Math.max(1, Math.round((toDay - fromDay) / dayMs));
};

// Too long for one line in most locales, so the only space left breakable is the one before the
// count, which drops to the next line whole rather than splitting the date.
export const keepCountTogether = (text: string): string => text.replace(/ (?![(（])/g, '\u00a0');

export default (schedule: LeagueSchedule | undefined, now: number): string | null => {
	const offseason = resolveOffseason(schedule, now);
	if (!offseason) return null;
	if (offseason.returnsAt === undefined) return i18n.t('setup.leagueOffseason');
	return keepCountTogether(i18n.t('setup.leagueReturns', {
		date: formatReturnDay(offseason.returnsAt),
		days: i18n.t('setup.leagueReturnsDays', daysUntil(offseason.returnsAt, now)),
	}));
};
