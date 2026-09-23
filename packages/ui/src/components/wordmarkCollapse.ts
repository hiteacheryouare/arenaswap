import applyWordmarkProgress from './wordmarkPose';

// Collapses a wordmark into the favicon as its bar is scrolled past, and plays it back on the way
// up. No framework: the extension reaches this through a hook and the website through a module
// script in its header, and neither the maths nor the DOM writing cares which.

// Scroll offsets that start and undo the collapse. The gap between them is deliberate: one
// threshold means a list resting a pixel either side of it flickers on every wheel nudge.
export const collapseAt = 40;
export const expandAt = 16;
const collapseMs = 450;

interface collapsingBar {
	svg: SVGSVGElement;
	// The bar the mark sits in. Takes `--collapse` every frame — already eased, so anything the bar
	// does on the way in is a `calc()` off it — and `is-condensed` the moment the threshold goes.
	bar: HTMLElement;
	// The element that scrolls. Absent is the page itself, which is how the website scrolls.
	scroller?: HTMLElement | null;
	// Runs on every scroll and once at setup, for whatever else the bar answers scroll with.
	onScroll?: (top: number) => void;
}

const driveWordmarkCollapse = ({ svg, bar, scroller, onScroll }: collapsingBar) => {
	const port = scroller ?? document.scrollingElement;
	const source: EventTarget = scroller ?? window;
	if (!port) return () => {};

	const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	// The popup restores its scroll offset on mount, so the opening pose is read rather than
	// assumed; coming back to a list that was left halfway down must not replay the collapse.
	let collapsed = port.scrollTop > collapseAt;
	let progress = collapsed ? 1 : 0;
	let frame = 0;
	let from = progress;
	let startedAt = 0;

	const park = (top: number) => {
		if (scroller) scroller.scrollTo({ top });
		else window.scrollTo({ top });
	};

	// One number drives everything, and the bar reads the eased result back out of `--collapse` —
	// so the chrome and the mark move on one curve instead of a CSS transition racing a rAF tween.
	//
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
		// Scaled by how far there is left to go, so reversing a collapse that is already most of
		// the way home takes the time that trip deserves rather than the full 450ms.
		const span = Math.max(0.35, Math.abs(target - from)) * collapseMs;
		const done = Math.min(1, (now - startedAt) / span);
		pose(from + (target - from) * done);
		frame = done < 1 ? requestAnimationFrame(step) : 0;
	};

	const onScrolled = () => {
		// Before the early return: whatever else the bar does with scroll has to answer every one
		// of them, not just the two that cross a threshold.
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
