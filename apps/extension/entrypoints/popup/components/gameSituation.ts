import { sportTypeConfigMap } from '@arenaswap/core/constants';
import type { Game } from '@arenaswap/core/types';
import { formatGameClock, formatPeriod, isHalftime } from './gameCardShared';

// Injected rather than imported so the resolver stays pure and Jest-testable.
type Translate = (key: string, subsOrCount?: unknown, subs?: unknown) => string;

export interface GameStatus {
	text: string;
	// Lekton is for figures read against each other — a clock that ticks, an inning that climbs.
	// The states that replace those with a word take the body face instead, so "Halftime" is not
	// set in the face the 4:21 above it needed.
	tabular: boolean;
}

// During an intermission or a delay the period and clock stop meaning anything, so those states
// say what is actually happening instead — except for the inning sports, where the half-inning
// change ESPN can report as an intermission is exactly what the inning line already says.
export const resolveStatus = (game: Game, isInningSport: boolean, t: Translate): GameStatus => {
	if (game.delayed === true) return { text: game.delayDescription ?? t('gameCard.delayFallback'), tabular: false };
	if (game.status === 'post') return { text: t('detail.final'), tabular: false };
	if (game.status === 'pre') return { text: '', tabular: false };
	if (isInningSport) return { text: formatPeriod(game), tabular: true };
	if (game.intermission === true) {
		return { text: isHalftime(game) ? t('detail.halftime') : t('detail.intermission'), tabular: false };
	}

	const clockBased = sportTypeConfigMap[game.sportType]?.clockBased ?? false;
	return {
		text: clockBased ? `${formatPeriod(game)} • ${formatGameClock(game)}` : formatPeriod(game),
		tabular: true,
	};
};
