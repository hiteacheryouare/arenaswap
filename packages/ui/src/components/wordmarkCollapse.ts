import applyWordmarkProgress from './wordmarkPose';

const collapseAt = 40;
const expandAt = 16;
const collapseMs = 450;
const shortestTripShare = 0.35;

interface collapsingBar {
	svg: SVGSVGElement;
	bar: HTMLElement;
	scroller?: HTMLElement | null;
	onScroll?: (top: number) => void;
}

const driveWordmarkCollapse = ({ svg, bar, scroller, onScroll }: collapsingBar) => {
	const port = scroller ?? document.scrollingElement;
	const source: EventTarget = scroller ?? window;
	if (!port) return () => {};

	const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	let collapsed = port.scrollTop > collapseAt;
	let progress = collapsed ? 1 : 0;
	let frame = 0;
	let from = progress;
	let startedAt = 0;

	const park = (top: number) => {
		if (scroller) scroller.scrollTo({ top });
		else window.scrollTo({ top });
	};

	// And the content must not move while that happens. Where the bar is in the flow, condensing
	// takes height out of it and the browser hands that height straight back to `scrollTop` so the
	// content under the reader holds still. That is the right instinct for a list whose cards
	// reorder on their own and the wrong one for a bar that resizes *because* of where the list is
	// scrolled to: it drops the offset back under the threshold and the header flutters open and
	// shut, and it loses the position the popup restores when you come back from a game. Reading
	// `scrollTop` flushes the layout the resize caused, so putting it back here is both necessary
	// and sufficient. A fixed bar never takes anything out of the flow, so this costs it a read.
	const pose = (value: number) => {
		progress = value;
		const parked = port.scrollTop;
		const closed = applyWordmarkProgress(svg, value);
		bar.style.setProperty('--collapse', String(Math.round(closed * 1000) / 1000));
		if (port.scrollTop !== parked) park(parked);
	};

	const step = (now: number) => {
		if (!startedAt) startedAt = now;
		const target = collapsed ? 1 : 0;
		const span = Math.max(shortestTripShare, Math.abs(target - from)) * collapseMs;
		const done = Math.min(1, (now - startedAt) / span);
		pose(from + (target - from) * done);
		frame = done < 1 ? requestAnimationFrame(step) : 0;
	};

	const onScrolled = () => {
		onScroll?.(port.scrollTop);
		const next = port.scrollTop > (collapsed ? expandAt : collapseAt);
		if (next === collapsed) return;
		collapsed = next;
		bar.classList.toggle('is-condensed', collapsed);
		if (reduced) {
			pose(collapsed ? 1 : 0);
			return;
		}
		from = progress;
		startedAt = 0;
		cancelAnimationFrame(frame);
		frame = requestAnimationFrame(step);
	};

	bar.classList.toggle('is-condensed', collapsed);
	onScroll?.(port.scrollTop);
	pose(progress);
	source.addEventListener('scroll', onScrolled, { passive: true });
	return () => {
		source.removeEventListener('scroll', onScrolled);
		cancelAnimationFrame(frame);
	};
};

export default driveWordmarkCollapse;
