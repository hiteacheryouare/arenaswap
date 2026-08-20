import { sportTypeConfigMap } from '@arenaswap/core/constants';
import type { Game } from '@arenaswap/core/types';
import { formatGameClock, formatPeriod, isHalftime } from './gameCardShared';

// Injected rather than imported so the resolver stays pure and Jest-testable.
type Translate = (key: string, subsOrCount?: unknown, subs?: unknown) => string;

// During an intermission or a delay the period and clock stop meaning anything, so those states
// say what is actually happening instead — except for the inning sports, where the half-inning
// change ESPN can report as an intermission is exactly what the inning line already says.
export const resolveStatusText = (game: Game, isInningSport: boolean, t: Translate): string => {
	if (game.delayed === true) return game.delayDescription ?? t('gameCard.delayFallback');
	if (game.status === 'post') return t('detail.final');
	if (game.status === 'pre') return '';
	if (isInningSport) return formatPeriod(game);
	if (game.intermission === true) return isHalftime(game) ? t('detail.halftime') : t('detail.intermission');

	const clockBased = sportTypeConfigMap[game.sportType]?.clockBased ?? false;
	return clockBased ? `${formatPeriod(game)} • ${formatGameClock(game)}` : formatPeriod(game);
};
