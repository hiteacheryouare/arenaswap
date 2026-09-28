import { useEffect, useLayoutEffect, type RefObject } from 'react';
import { gutterPx } from './guideLayout';

// What CSS cannot tell on its own: whether a pinned label still fits inside its block, and whether an
// hour label is half under the league column or half off the end of the scroll. Both are only ever
// true at the edges of the viewport, so this reads every box first and writes every flag after, once
// a frame, rather than re-rendering thirty blocks on each scroll event.
const sync = (canvas: HTMLElement) => {
	const scroller = canvas.parentElement;
	if (!scroller) return;
	const view = scroller.getBoundingClientRect();
	const plotLeft = view.left + gutterPx;

	const labels = [...canvas.querySelectorAll<HTMLElement>('.guide-ruler-label')];
	const clipped = labels.map(label => {
		const box = label.getBoundingClientRect();
		return box.left < plotLeft - 0.5 || box.right > view.right + 0.5;
	});

	// A pinned label slides along its block towards the far end. The PowerScore there steps aside
	// once the two would touch, the block goes once the label no longer fits in what is left of it,
	// and the label itself goes once the next game in its lane has pushed it under the league column.
	const bars = [...canvas.querySelectorAll<HTMLElement>('.guide-bar')];
	const edges = bars.map(bar => {
		const shape = bar.querySelector('.guide-bar-shape')?.getBoundingClientRect();
		const content = bar.querySelector('.guide-bar-content')?.getBoundingClientRect();
		const value = bar.querySelector('.guide-bar-value')?.getBoundingClientRect();
		if (!shape || !content) return { crowded: false, cut: false, tucked: false };
		return {
			crowded: value !== undefined && content.right > value.left + 0.5,
			cut: content.right > shape.right + 0.5,
			tucked: content.left < plotLeft - 0.5,
		};
	});

	labels.forEach((label, index) => label.toggleAttribute('data-clipped', clipped[index]));
	bars.forEach((bar, index) => {
		bar.toggleAttribute('data-crowded', edges[index]!.crowded);
		bar.toggleAttribute('data-cut', edges[index]!.cut);
		bar.toggleAttribute('data-tucked', edges[index]!.tucked);
	});
};

const overflows = (bar: HTMLElement) => [...bar.querySelectorAll<HTMLElement>('.guide-bar-line')].some(line => {
	const right = line.getBoundingClientRect().right;
	return [...line.children].some(child => child.getBoundingClientRect().right > right + 0.5);
});

// A block is as long as its game, and a label can be longer than that. Rather than clip a glyph, it
// sheds what the matchup can do without: the crests first, then the clock or network beside them,
// and only a label that still cannot fit fades out at its end.
const fitSteps = ['no-crests', 'bare', 'faded'] as const;

const fit = (canvas: HTMLElement) => {
	const bars = [...canvas.querySelectorAll<HTMLElement>('.guide-bar')];
	bars.forEach(bar => bar.removeAttribute('data-fit'));
	let tight = bars;
	for (const step of fitSteps) {
		tight = tight.filter(overflows);
		tight.forEach(bar => bar.setAttribute('data-fit', step));
	}
};

const useEdgeClipping = (canvasRef: RefObject<HTMLElement | null>) => {
	// Every render, since a poll can move a block's end or change what its label says.
	useLayoutEffect(() => {
		if (!canvasRef.current) return;
		fit(canvasRef.current);
		sync(canvasRef.current);
	});

	useEffect(() => {
		const canvas = canvasRef.current;
		const scroller = canvas?.parentElement;
		if (!canvas || !scroller) return;
		let frame = 0;
		const schedule = () => {
			if (frame) return;
			frame = requestAnimationFrame(() => {
				frame = 0;
				sync(canvas);
			});
		};
		scroller.addEventListener('scroll', schedule, { passive: true });
		const observer = new ResizeObserver(schedule);
		observer.observe(scroller);
		// Label widths change once the webfonts land, which resizes nothing the observer watches.
		void document.fonts?.ready.then(() => {
			fit(canvas);
			schedule();
		});
		return () => {
			scroller.removeEventListener('scroll', schedule);
			observer.disconnect();
			cancelAnimationFrame(frame);
		};
	}, [canvasRef]);
};

export default useEdgeClipping;
