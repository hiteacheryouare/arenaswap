import { i18n } from '#i18n';
import { resolveOffseason } from '@arenaswap/core';
import { leagueLabels } from '@arenaswap/core/constants';
import { displayLocale } from '../../../utils/displayLocale';
import type { LeagueId, LeagueSchedule, LeagueScheduleMap } from '@arenaswap/core/types';

const dayMs = 24 * 60 * 60 * 1000;

const formatReturnDay = (ms: number): string => (
	new Date(ms).toLocaleDateString(displayLocale(), { month: 'short', day: 'numeric', timeZone: 'UTC' })
);

const daysUntil = (ms: number, now: number): number => {
	const today = new Date(now);
	const fromDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
	const returnDate = new Date(ms);
	const toDay = Date.UTC(returnDate.getUTCFullYear(), returnDate.getUTCMonth(), returnDate.getUTCDate());
	return Math.max(1, Math.round((toDay - fromDay) / dayMs));
};

export const keepCountTogether = (text: string): string => text.replace(/ (?![(（])/g, '\u00a0');

export const offseasonReturnLine = (enabledLeagues: LeagueId[], schedules: LeagueScheduleMap, now: number): string | null => {
	if (enabledLeagues.length === 0) return null;
	const offseasons = enabledLeagues.map(league => ({ league, offseason: resolveOffseason(schedules[league], now) }));
	if (offseasons.some(({ offseason }) => offseason === null)) return null;
	const returning = offseasons
		.flatMap(({ league, offseason }) => offseason?.returnsAt === undefined ? [] : [{ league, returnsAt: offseason.returnsAt }])
		.toSorted((a, b) => a.returnsAt - b.returnsAt);
	if (returning.length === 0) return null;
	const leagues = returning
		.map(({ league, returnsAt }) => keepCountTogether(i18n.t('empty.offseasonLeague', { league: leagueLabels[league] ?? league.toUpperCase(), date: formatReturnDay(returnsAt) })))
		.join(' · ');
	return i18n.t('empty.offseasonReturns', { leagues });
};

export default (schedule: LeagueSchedule | undefined, now: number): string | null => {
	const offseason = resolveOffseason(schedule, now);
	if (!offseason) return null;
	if (offseason.returnsAt === undefined) return i18n.t('setup.leagueOffseason');
	return keepCountTogether(i18n.t('setup.leagueReturns', {
		date: formatReturnDay(offseason.returnsAt),
		days: i18n.t('setup.leagueReturnsDays', daysUntil(offseason.returnsAt, now)),
	}));
};
