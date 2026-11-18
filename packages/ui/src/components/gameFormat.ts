import { leagueConfigMap } from '@arenaswap/core/constants';
import type { Game, LeagueId, SportType } from '@arenaswap/core/types';
import { defaultTranslate } from './defaultStrings';
import type { Translator } from './defaultStrings';

interface PeriodSource {
	league: LeagueId;
	period?: number;
	sportType: SportType;
	isPostseason?: boolean;
	postseasonLabel?: string;
}

const playoffOvertimeHockey = new Set<LeagueId>(['nhl', 'ncaamh']);
const olympicHockey = new Set<LeagueId>(['olymih', 'olywih']);
const medalGame = /\bmedal\b/i;

export const playsOvertimeUntilAGoal = (game: Pick<PeriodSource, 'league' | 'isPostseason' | 'postseasonLabel'>): boolean => (
	(game.isPostseason === true && playoffOvertimeHockey.has(game.league))
	|| (olympicHockey.has(game.league) && medalGame.test(game.postseasonLabel ?? ''))
);

export const formatPeriod = (game: PeriodSource, t: Translator = defaultTranslate): string => {
	const period = game.period ?? 1;
	const config = leagueConfigMap[game.league];
	if (!config) return t('gameCard.period', { count: period });
	const regular = config.regularPeriods;
	if (period > regular) {
		if (config.periodFormat === 'periods') {
			const overtime = period - regular;
			if (playsOvertimeUntilAGoal(game)) {
				return overtime === 1 ? t('gameCard.periodOvertime') : t('gameCard.periodOvertimeNumbered', { count: overtime });
			}
			return overtime === 1 ? t('gameCard.periodOvertime') : t('gameCard.periodHockeyShootout');
		}
		if (config.periodFormat === 'innings') return t('gameCard.periodInning', { count: period });
		if (game.sportType === 'soccer') {
			const extraTimeHalf = period - regular;
			if (extraTimeHalf === 1) return t('gameCard.periodExtraTimeFirst');
			return extraTimeHalf === 2 ? t('gameCard.periodExtraTimeSecond') : t('gameCard.periodShootout');
		}
		const overtime = period - regular;
		return overtime === 1 ? t('gameCard.periodOvertime') : t('gameCard.periodOvertimeNumbered', { count: overtime });
	}
	if (config.periodFormat === 'halves') return period === 1 ? t('gameCard.periodFirstHalf') : t('gameCard.periodSecondHalf');
	if (config.periodFormat === 'periods') return t('gameCard.period', { count: period });
	if (config.periodFormat === 'innings') return t('gameCard.periodInning', { count: period });
	return t('gameCard.periodQuarter', { count: period });
};

const postponedReasonLabel = (reason: NonNullable<Game['postponedReason']>, t: Translator): string => ({
	rain: t('gameCard.postponedRain'),
	weather: t('gameCard.postponedWeather'),
	airQuality: t('gameCard.postponedAirQuality'),
	travel: t('gameCard.postponedTravel'),
})[reason];

export const formatDisruption = (game: Pick<Game, 'disruption' | 'postponedReason'>, t: Translator = defaultTranslate): string | undefined => {
	if (game.disruption === 'postponed') {
		return game.postponedReason
			? `${t('gameCard.postponed')} · ${postponedReasonLabel(game.postponedReason, t)}`
			: t('gameCard.postponed');
	}
	if (game.disruption === 'suspended') return t('gameCard.suspended');
	if (game.disruption === 'forfeit') return t('gameCard.forfeit');
	if (game.disruption === 'canceled') return t('gameCard.canceled');
	if (game.disruption === 'abandoned') return t('gameCard.abandoned');
	return undefined;
};

export const isHalftime = (game: PeriodSource): boolean => {
	const regular = leagueConfigMap[game.league]?.regularPeriods;
	return regular !== undefined && regular % 2 === 0 && game.period === regular / 2;
};

export const formatBreak = (game: PeriodSource, t: Translator = defaultTranslate): string => {
	if (isHalftime(game)) return t('detail.halftime');
	return game.sportType === 'hockey' ? t('detail.intermission') : t('detail.endOfPeriod', { period: formatPeriod(game, t) });
};

interface ClockSource {
	sportType: SportType;
	clockSeconds?: number;
	clockStoppageMinutes?: number;
	clockTenths?: number;
}

export const formatClock = (seconds: number): string => {
	const minutes = Math.floor(seconds / 60);
	const remainder = String(seconds % 60).padStart(2, '0');
	return `${minutes}:${remainder}`;
};

export const formatGameClock = (game: ClockSource): string => {
	if (game.clockSeconds === undefined) return '';
	if (game.sportType === 'soccer') {
		const minutes = Math.floor(game.clockSeconds / 60);
		const added = game.clockStoppageMinutes ?? 0;
		return added > 0 && added <= minutes ? `${minutes - added}+${added}'` : `${minutes}'`;
	}
	if (game.clockTenths !== undefined) return (game.clockTenths / 10).toFixed(1);
	return formatClock(game.clockSeconds);
};
