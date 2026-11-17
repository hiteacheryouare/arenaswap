import type { confettiStage } from './confettiLaunch';

export const popupConfettiStage: confettiStage = {
	locateTeam: (gameId, side) => {
		const card = document.querySelector<HTMLElement>(`.popup-container [data-glide-key="${CSS.escape(gameId)}"]`);
		const crest = card?.querySelector(`.team-column.is-${side} .team-crest`);
		if (!card || !crest) return null;
		const { m41: glideX, m42: glideY } = new DOMMatrixReadOnly(getComputedStyle(card).transform);
		const rect = crest.getBoundingClientRect();
		return { top: rect.top - glideY, right: rect.right - glideX, bottom: rect.bottom - glideY, left: rect.left - glideX };
	},
	visibleArea: () => {
		const scroller = document.querySelector<HTMLElement>('.popup-container');
		if (!scroller) return null;
		const view = scroller.getBoundingClientRect();
		const header = scroller.querySelector('.popup-header');
		return {
			top: header ? header.getBoundingClientRect().bottom : view.top,
			left: view.left,
			right: view.left + scroller.clientWidth,
			bottom: view.top + scroller.clientHeight,
		};
	},
};
