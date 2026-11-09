import type { confettiStage } from '../popup/confettiLaunch';

export const guideConfettiStage: confettiStage = {
	locateTeam: (gameId, side) => {
		const crest = document.querySelector(`.guide-scroller [data-game-id="${CSS.escape(gameId)}"] .guide-bar-side.is-${side} .guide-crest-disc`);
		return crest?.getBoundingClientRect() ?? null;
	},
	visibleArea: () => {
		const scroller = document.querySelector<HTMLElement>('.guide-scroller');
		const corner = scroller?.querySelector('.guide-ruler-corner');
		if (!scroller || !corner) return null;
		const view = scroller.getBoundingClientRect();
		const { bottom: rulerBottom, right: gutterRight } = corner.getBoundingClientRect();
		return {
			top: rulerBottom,
			left: gutterRight,
			right: view.left + scroller.clientWidth,
			bottom: view.top + scroller.clientHeight,
		};
	},
};
