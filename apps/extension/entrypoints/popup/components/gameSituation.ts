import { sportTypeConfigMap } from '@arenaswap/core/constants';
import type { Game } from '@arenaswap/core/types';
import { formatGameClock, formatPeriod, isHalftime } from './gameCardShared';

// Injected rather than imported so the resolver stays pure and Jest-testable.
type Translate = (key: string, subsOrCount?: unknown, subs?: unknown) => string;

export interface GameStatus {
	text: string;
	// Lekton holds a running clock's digits still while it counts down. Everything else, an inning
	// or a "Halftime", takes the body face, since nothing in it moves.
	ticking: boolean;
}

// During an intermission or a delay the period and clock stop meaning anything, so those states
// say what is actually happening instead — except for the inning sports, where the half-inning
// change ESPN can report as an intermission is exactly what the inning line already says.
export const resolveStatus = (game: Game, isInningSport: boolean, t: Translate): GameStatus => {
	if (game.delayed === true) return { text: game.delayDescription ?? t('gameCard.delayFallback'), ticking: false };
	// The same token the list card and the Guide print, so a shootout reads "Final/SO" on all three.
	if (game.status === 'post') {
		return { text: game.finalPeriodSuffix ? `${t('detail.final')}/${game.finalPeriodSuffix}` : t('detail.final'), ticking: false };
	}
	if (game.status === 'pre') return { text: '', ticking: false };
	if (isInningSport) return { text: formatPeriod(game, t), ticking: false };
	if (game.intermission === true) {
		return { text: isHalftime(game) ? t('detail.halftime') : t('detail.intermission'), ticking: false };
	}

	const clockBased = sportTypeConfigMap[game.sportType]?.clockBased ?? false;
	return {
		text: clockBased ? `${formatPeriod(game, t)} • ${formatGameClock(game)}` : formatPeriod(game, t),
		ticking: clockBased,
	};
};
