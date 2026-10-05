import { useState } from 'react';
import type { Game } from '@arenaswap/core/types';

type courtSide = NonNullable<Game['possessionSide']>;

interface heldPossession {
	gameId: string;
	period: number;
	side: courtSide;
}

// A timeout or a substitution says nothing about who has the ball, so the last side a play did
// name is held through them. A new period starts from nothing: the ball goes to whoever the
// alternating arrow or the tip says, and the next play will tell us.
const useBasketballPossession = (game: Pick<Game, 'id' | 'sportType' | 'status' | 'intermission' | 'period' | 'possessionSide'>): courtSide | undefined => {
	const [held, setHeld] = useState<heldPossession | null>(null);
	const live = game.sportType === 'basketball' && game.status === 'in' && game.intermission !== true;
	const named = live ? game.possessionSide : undefined;

	if (named && (held?.gameId !== game.id || held.period !== game.period || held.side !== named)) {
		setHeld({ gameId: game.id, period: game.period, side: named });
	} else if (!live && held) {
		setHeld(null);
	}

	if (!live) return undefined;
	if (named) return named;
	return held?.gameId === game.id && held.period === game.period ? held.side : undefined;
};

export default useBasketballPossession;
