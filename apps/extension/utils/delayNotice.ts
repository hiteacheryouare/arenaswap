import type { Game } from '@arenaswap/core/types';

type Translate = (key: string, subs?: Record<string, string>) => string;

// Where the game that stopped is, in the fewest words: the city out of "Boston, MA".
export const describeDelayLeft = (game: Pick<Game, 'delayKind' | 'venueLocation'>, t: Translate): string => {
	const kind = game.delayKind ?? 'other';
	const city = game.venueLocation?.split(',')[0]?.trim();
	return city ? t(`notification.leftDelay.${kind}`, { city }) : t(`notification.leftDelayNoCity.${kind}`);
};

// The game on the tab being left, when the reason for leaving is that its play has stopped.
export const findDelayedGameLeft = (
	games: readonly Game[],
	leavingGameId: string | undefined,
	arrivingGameId: string,
): Game | undefined => (
	leavingGameId && leavingGameId !== arrivingGameId
		? games.find(game => game.id === leavingGameId && game.status === 'in' && game.delayed === true)
		: undefined
);
