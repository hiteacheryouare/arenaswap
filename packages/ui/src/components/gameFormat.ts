// The period label, the halftime predicate and the game clock, split out of `gameCardShared` so
// the docs site
// can read them without pulling Crest, the tooltip and the rest of the card's React tree into a
// marketing-page island. `gameCardShared` re-exports both, so its own callers are unchanged.
import { leagueConfigMap } from '@arenaswap/core/constants';
import type { LeagueId, SportType } from '@arenaswap/core/types';
import { defaultTranslate } from './defaultStrings';
import type { Translator } from './defaultStrings';

// Only the three fields the label actually reads. `powerscore` publishes a narrower `Game` than
// `@arenaswap/core` does, and the docs site holds that one — naming the fields lets both pass.
interface PeriodSource {
	league: LeagueId;
	// Optional because `powerscore`'s Game declares it so: a game with no period yet is period 1.
	period?: number;
	sportType: SportType;
}

// Overtime reads the way the box score heads its columns: OT, then 2OT, 3OT.
export const formatPeriod = (game: PeriodSource, t: Translator = defaultTranslate): string => {
	const period = game.period ?? 1;
	const config = leagueConfigMap[game.league];
	if (!config) return t('gameCard.period', { count: period });
	const regular = config.regularPeriods;
	if (period > regular) {
		if (config.periodFormat === 'periods') return t('gameCard.periodOvertime');
		if (config.periodFormat === 'innings') return t('gameCard.periodInning', { count: period });
		// Soccer plays two extra-time halves (periods 3 and 4) and then a shootout (period 5), so
		// "OT/2OT/3OT" is the wrong vocabulary and flatly wrong for the shootout. Keyed on
		// sportType, not periodFormat, so NCAA basketball's halves keep their OT numbering.
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

export const isHalftime = (game: PeriodSource): boolean => {
	const regular = leagueConfigMap[game.league]?.regularPeriods;
	return regular !== undefined && regular % 2 === 0 && game.period === regular / 2;
};

// Only the two fields the clock reads. Same reason as PeriodSource: the docs island holds
// `powerscore`'s Game, which declares clockSeconds optional.
interface ClockSource {
	sportType: SportType;
	clockSeconds?: number;
}

export const formatClock = (seconds: number): string => {
	const minutes = Math.floor(seconds / 60);
	const remainder = String(seconds % 60).padStart(2, '0');
	return `${minutes}:${remainder}`;
};

// Soccer counts up in whole minutes and is written with a prime, never as mm:ss. The docs site
// kept its own mm:ss-only copy of this and printed 95:00 where the popup prints 95'.
export const formatGameClock = (game: ClockSource): string => {
	if (game.clockSeconds === undefined) return '';
	if (game.sportType === 'soccer') return `${Math.floor(game.clockSeconds / 60)}'`;
	return formatClock(game.clockSeconds);
};
