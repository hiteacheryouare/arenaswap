import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';

const boxesIn = (grid: HTMLElement) => [...grid.querySelectorAll<HTMLElement>('.multiview-box')];

const measure = (grid: HTMLElement) => new Map(boxesIn(grid).map(box => [box.dataset.gameId, box.getBoundingClientRect()]));

// A box changes place by grid position alone, so the browser would jump it there. This starts each
// one back where it was and lets it slide and grow into its new place.
export default (grid: RefObject<HTMLElement | null>, layoutKey: string) => {
	const settled = useRef(new Map<string | undefined, DOMRect>());

	useLayoutEffect(() => {
		const root = grid.current;
		if (!root) return;
		const boxes = boxesIn(root);
		for (const box of boxes) {
			box.style.transition = 'none';
			box.style.transform = '';
		}
		const before = settled.current;
		settled.current = measure(root);
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		const moved = boxes.filter(box => {
			const from = before.get(box.dataset.gameId);
			const to = settled.current.get(box.dataset.gameId);
			if (!from || !to || (Math.abs(from.left - to.left) < 1 && Math.abs(from.top - to.top) < 1 && Math.abs(from.width - to.width) < 1)) return false;
			box.style.transform = `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`;
			return true;
		});
		// Reading layout makes the browser apply the starting transforms before the transition comes back on.
		root.getBoundingClientRect();
		for (const box of boxes) box.style.transition = '';
		for (const box of moved) box.style.transform = '';
	}, [grid, layoutKey]);

	useEffect(() => {
		const remeasure = () => {
			if (grid.current) settled.current = measure(grid.current);
		};
		addEventListener('resize', remeasure);
		return () => removeEventListener('resize', remeasure);
	}, [grid]);
};
