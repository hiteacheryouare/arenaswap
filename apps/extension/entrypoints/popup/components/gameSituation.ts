import { leagueConfigMap, sportTypeConfigMap } from '@arenaswap/core/constants';
import type { Game } from '@arenaswap/core/types';
import { formatGameClock, formatPeriod } from './gameCardShared';

/** Minimal `i18n.t` shape — injected so the resolver stays pure and Jest-testable. */
type Translate = (key: string, subsOrCount?: unknown, subs?: unknown) => string;

const isHalftime = (game: Game): boolean => {
	const regular = leagueConfigMap[game.league]?.regularPeriods;
	return regular !== undefined && regular % 2 === 0 && game.period === regular / 2;
};

/**
 * Where the game is, as plain text: "Q3 6:40", "Inn 7", "Halftime", "Final".
 *
 * A frozen clock is the reason this exists — during an intermission or a delay the period
 * and clock stop meaning anything, so those states say what is actually happening instead.
 */
export const resolveStatusText = (game: Game, isInningSport: boolean, t: Translate): string => {
	if (game.delayed === true) return game.delayDescription ?? t('gameCard.delayFallback');
	if (game.status === 'post') return t('detail.final');
	if (game.status === 'pre') return '';
	if (game.intermission === true) return isHalftime(game) ? t('detail.halftime') : t('detail.intermission');

	if (isInningSport) return formatPeriod(game);
	const clockBased = sportTypeConfigMap[game.sportType]?.clockBased ?? false;
	return clockBased ? `${formatPeriod(game)} • ${formatGameClock(game)}` : formatPeriod(game);
};
