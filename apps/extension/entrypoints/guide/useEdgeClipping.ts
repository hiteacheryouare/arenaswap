import { useEffect, useLayoutEffect, type RefObject } from 'react';
import { gutterPx } from './guideLayout';

// What CSS cannot tell on its own: whether a pinned label still fits inside its bar, and whether an
// hour label is half under the league column or half off the end of the scroll. Both are only ever
// true at the edges of the viewport, so this reads every box first and writes every flag after, once
// a frame, rather than re-rendering thirty bars on each scroll event.
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

	const bars = [...canvas.querySelectorAll<HTMLElement>('.guide-bar')];
	const cut = bars.map(bar => {
		const shape = bar.querySelector('.guide-bar-shape')?.getBoundingClientRect();
		const content = bar.querySelector('.guide-bar-content')?.getBoundingClientRect();
		return shape !== undefined && content !== undefined && content.right > shape.right + 0.5;
	});

	labels.forEach((label, index) => label.toggleAttribute('data-clipped', clipped[index]));
	bars.forEach((bar, index) => bar.toggleAttribute('data-cut', cut[index]));
};

const useEdgeClipping = (canvasRef: RefObject<HTMLElement | null>) => {
	// Every render, since a poll can move a bar's end or change what its label says.
	useLayoutEffect(() => {
		if (canvasRef.current) sync(canvasRef.current);
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
		void document.fonts?.ready.then(schedule);
		return () => {
			scroller.removeEventListener('scroll', schedule);
			observer.disconnect();
			cancelAnimationFrame(frame);
		};
	}, [canvasRef]);
};

export default useEdgeClipping;
