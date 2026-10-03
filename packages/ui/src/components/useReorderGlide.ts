import { useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { motionDuration, motionEase } from '../motion';

interface point {
	x: number;
	y: number;
}

interface glide {
	card: HTMLElement;
	dx: number;
	dy: number;
}

const glideKeyAttribute = 'data-glide-key';

const isGlideWorthy = ({ dx, dy }: glide) => Math.abs(dx) >= 0.5 || Math.abs(dy) >= 0.5;

// Only the cards present on both sides are compared. A card arriving or leaving shifts everything
// below it without reordering anything, and that stays a plain jump, the same as a banner appearing.
export const keepsRelativeOrder = (previous: string[], next: string[]) => {
	const nextKeys = new Set(next);
	const before = previous.filter(key => nextKeys.has(key));
	const beforeKeys = new Set(before);
	const after = next.filter(key => beforeKeys.has(key));
	return before.every((key, index) => key === after[index]);
};

const useReorderGlide = (scrollerRef: RefObject<HTMLElement | null>) => {
	const positionsRef = useRef(new Map<string, point>());
	const orderRef = useRef<string[]>([]);

	useLayoutEffect(() => {
		const scroller = scrollerRef.current;
		if (!scroller) return;

		const origin = scroller.getBoundingClientRect();
		const cards = [...scroller.querySelectorAll<HTMLElement>(`[${glideKeyAttribute}]`)]
			.map(card => ({ card, key: card.getAttribute(glideKeyAttribute)! }));
		const keys = cards.map(({ key }) => key);
		const reordered = !keepsRelativeOrder(orderRef.current, keys);
		const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

		const positions = new Map<string, point>();
		const glides: glide[] = [];
		cards.forEach(({ card, key }) => {
			const rect = card.getBoundingClientRect();
			// A card caught mid-glide is drawn away from its layout box by the running transform, so
			// that offset is taken out to find where it sits, and added back to find where it starts.
			const { m41: offsetX, m42: offsetY } = new DOMMatrixReadOnly(getComputedStyle(card).transform);
			const position = {
				x: rect.left - origin.left + scroller.scrollLeft - offsetX,
				y: rect.top - origin.top + scroller.scrollTop - offsetY,
			};
			positions.set(key, position);

			const previous = positionsRef.current.get(key);
			if (!reordered || reduced || !previous) return;
			glides.push({ card, dx: previous.x + offsetX - position.x, dy: previous.y + offsetY - position.y });
		});

		glides.filter(isGlideWorthy).forEach(({ card, dx, dy }) => {
			card.getAnimations().forEach(animation => animation.cancel());
			card.animate(
				[{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
				{ duration: motionDuration.slow, easing: motionEase },
			);
		});

		positionsRef.current = positions;
		orderRef.current = keys;
	});
};

export default useReorderGlide;
