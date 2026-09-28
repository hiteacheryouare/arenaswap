import type { KeyboardEvent, MouseEvent } from 'react';

// A stage, tile or row opens its game, except when the click or key landed on a control inside it.
export const isInteractiveCardTarget = (target: EventTarget | null): boolean => {
	if (!(target instanceof HTMLElement)) return false;
	return Boolean(target.closest('button, select, option, input, textarea, label, a, [data-card-control="true"]'));
};

export const buildCardHandlers = (onOpenGameDetail: (gameId: string) => void, gameId: string) => ({
	onClick: (event: MouseEvent<HTMLElement>) => {
		if (isInteractiveCardTarget(event.target)) return;
		onOpenGameDetail(gameId);
	},
	onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		if (isInteractiveCardTarget(event.target)) return;
		event.preventDefault();
		onOpenGameDetail(gameId);
	},
});
