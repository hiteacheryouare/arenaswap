import { clearSharedRequests, prefetchGameDetail } from '@arenaswap/sideline';
import type { Game } from '@arenaswap/core/types';

export const hoverPrefetchWaitMs = 100;

type prefetchGame = Pick<Game, 'id' | 'league' | 'status'>;

// One timer for the whole list: a pointer is only ever over one card, so entering the next card
// replaces the last card's wait rather than queueing behind it.
let hoverTimer: ReturnType<typeof setTimeout> | undefined;

const cancelHover = () => clearTimeout(hoverTimer);

export const resetPrefetchIntent = () => {
	cancelHover();
	clearSharedRequests();
};

export const prefetchOnIntent = (game: prefetchGame) => {
	const start = () => {
		cancelHover();
		hoverTimer = setTimeout(() => prefetchGameDetail(game), hoverPrefetchWaitMs);
	};
	return { onPointerEnter: start, onPointerLeave: cancelHover, onFocus: start, onBlur: cancelHover };
};
