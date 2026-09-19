// The choreography of the wordmark collapsing into the favicon, as pure numbers. Nothing here
// touches the DOM, which is what lets `wordmarkFrame.test.ts` assert the parts of it that are easy
// to get wrong by eye: that the mark is untouched at rest, that a word is fully gone before the
// letter replacing it moves, and that nothing reappears on the way back out.
//
// The mark is two rows that mirror each other — `arena` with an arrow running right off the end,
// `swap.` with an arrow running left off the front — and the favicon is the same two rows with the
// words removed. So the collapse has two beats:
//
//   1. Swallow.  Each arrow's tail grows inward along its own row. The letters are masked off at
//      the tail's leading edge, so the arrow appears to absorb them rather than fade them.
//   2. Collapse. The arrows retract to favicon length, the surviving `a` and `s` slide into the
//      positions they hold there, and the viewBox closes around what is left.
//
// The beats overlap: the box starts closing before the last letter is gone. Everything is a pure
// function of `t`, so running `t` backwards is the reverse animation, exactly.

// Coordinates are the source viewBox of `full_logo_white_on_transparent.svg`. Measurements are
// flattened bounding boxes of the real outlines, not the control-point hulls, which run several
// units wide on every curve in this mark and would put the mask edges in the wrong place.
const arenRight = 898;        // right edge of the final `a`, and so of the whole top word
const aLeft = 732.6;          // that `a` on its own
const aWidth = 165.4;
const sLeft = 914;
const sWidth = 154.8;
const wapRight = 1789.3;      // outer edge of the orange dot, including its stroke
const dotCx = 1761.12;
const dotOuter = 28.17;

// The bar is redrawn as a round-capped stroke rather than kept as an outline, so its length can
// animate without the cap turning into an ellipse. Same for the dashed tail on the bottom row.
export const barHalfWidth = 15;       // half the bar's stroke, and so its cap radius
export const barJoint = 1691;         // where the bar meets the flat back of the arrowhead
export const barRest = 910;           // the bar's left edge in the full mark
export const dashHalfWidth = 15.9;
export const dashFirstCap = 115.8;    // centre of the first pill's left cap; the train starts here
export const dashRest = 908.6;        // right edge of the seventh and last pill
export const dashPattern = '56.9 63.1';

// Where each piece ends up in the favicon arrangement. Taken from `icon_white_on_transparent.svg`
// by scaling its letter heights onto this mark's, then keeping this mark's own outlines: the icon
// redraws the arrows ~5% heavier and the dot half again as large, and borrowing those proportions
// would mean the glyphs changing weight mid-animation for a difference invisible at 36px.
const aCollapsedLeft = 13.8;
const arrowCollapsedLeft = 194.6;
const arrowCollapsedLength = 237.4;
const sCollapsedLeft = 314;
const dotGap = 22;            // a round `s` wants more air before the dot than the flat `p` did
const headWidth = 88.9;       // 1691 -> 1779.9, the arrowhead's own extent

export const aShiftEnd = aCollapsedLeft - aLeft;
export const barEnd = arrowCollapsedLeft;
export const headShiftEnd = arrowCollapsedLeft + arrowCollapsedLength - headWidth - barJoint;
export const sShiftEnd = sCollapsedLeft - sLeft;
export const dashEnd = dashFirstCap + 120 + 56.9 + dashHalfWidth;   // two pills instead of seven
export const dotShiftEnd = sCollapsedLeft + sWidth + dotGap + dotOuter - dotCx;

// How far past the mark each tail runs before the beat turns around. Both overshoot: the top bar
// has to clear the collapsed `a`'s left edge by a full fade width before that `a` arrives there,
// and the bottom tail has to cover the dot early enough to give it a window to move in.
const barSwallowed = -70;
const dashSwallowed = 1950;

// Width of the soft edge the letters dissolve across, in viewBox units — about 4px at the 36px the
// popup renders this at. The band sits inside the arrow's leading end rather than ahead of it, so
// at rest it lands in the gap between word and arrow and the mark is pixel-identical to the source.
export const fadeWidth = 55;

// Beat boundaries. `swallowEnd` is the turnaround: before it every tail grows, after it every tail
// retracts. `shrinkStart` overlaps the two so the box is already closing as the last letter goes.
const shrinkStart = 0.38;
const swallowEnd = 0.47;
const aShiftStart = 0.27;
const rowTwoShiftStart = 0.35;

// The retraction is two stages rather than one glide, because the two rows have wildly different
// distances to cover: the top bar has 265 units to walk back, the bottom tail has 1641. Run both on
// one curve and the `s` surfaces a fifth of the animation after the `a`, which reads as the bottom
// row lagging rather than as a stagger.
//
// So each tail first returns to the edge of what it is still hiding — fast, and invisible, since
// nothing is uncovered by it — and only then walks off the letter underneath. The second stage is
// the same curve over the same window for both rows, so the two reveals land together.
const returnUntil = 0.16;
const uncoverFrom = 0.1;

export const restBox = { x: 0, y: 0, width: 1790, height: 471 };
// Closed around what survives: the chevron's left edge to the dot's right, and the `a`'s ascender
// to the `s`'s baseline. Dropping `p`'s descender is why this is shorter than the full box, and
// why the surviving marks grow about 19% on the way in — the same thing the favicon does.
export const collapsedBox = { x: 1.1, y: 0.5, width: 546.1, height: 396.1 };

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const seg = (t: number, from: number, to: number) => clamp01((t - from) / (to - from));
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - ((-2 * x + 2) ** 3) / 2);
const easeOut = (x: number) => 1 - (1 - x) ** 3;
const mix = (from: number, to: number, k: number) => from + (to - from) * k;

// A two-stop gradient span. The mask rect is filled with it, so `from` is the fully-opaque end and
// `to` the fully-transparent one; the stops beyond either end pad, which is what makes a 55-unit
// gradient mask an entire row.
export interface fadeSpan {
	from: number;
	to: number;
}

export interface wordmarkFrame {
	box: { x: number; y: number; width: number; height: number };
	barX1: number;
	barX2: number;
	headShift: number;
	dashX2: number;
	aShift: number;
	sShift: number;
	dotShift: number;
	// `aren` and `wap` are masked separately from the letters replacing them. They share an edge
	// during the swallow, then part ways: the arrows retract and would otherwise uncover the very
	// words they just ate.
	arenFade: fadeSpan;
	aFade: fadeSpan;
	wapFade: fadeSpan;
	sFade: fadeSpan;
}

const wordmarkFrameAt = (t: number): wordmarkFrame => {
	const swallow = easeInOut(seg(t, 0, swallowEnd));
	const retract = seg(t, swallowEnd, 1);
	const close = easeInOut(seg(t, shrinkStart, 1));

	// The monotone edges. These only ever close, which is what keeps the eaten words eaten.
	const arenEdge = mix(barRest, barSwallowed, swallow);
	const wapEdge = mix(dashRest, dashSwallowed, swallow);

	// The arrows themselves, which turn around and come back. `staged` is where each one has given
	// back every unit it can without uncovering anything: a fade width clear of the `a` on top, and
	// of the dot on the bottom, those being the outermost things each mask is still holding down.
	const returning = easeInOut(clamp01(retract / returnUntil));
	const uncover = easeOut(clamp01((retract - uncoverFrom) / (1 - uncoverFrom)));
	const walkBack = (swallowed: number, staged: number, end: number) =>
		mix(mix(swallowed, staged, returning), end, uncover);

	const barLeft = retract > 0
		? walkBack(barSwallowed, aCollapsedLeft - fadeWidth, barEnd)
		: arenEdge;
	const dashRight = retract > 0
		? walkBack(dashSwallowed, dotShiftEnd + dotCx + dotOuter + fadeWidth, dashEnd)
		: wapEdge;

	const headShift = mix(0, headShiftEnd, close);

	return {
		box: {
			x: mix(restBox.x, collapsedBox.x, close),
			y: mix(restBox.y, collapsedBox.y, close),
			width: mix(restBox.width, collapsedBox.width, close),
			height: mix(restBox.height, collapsedBox.height, close),
		},
		barX1: barLeft + barHalfWidth,
		barX2: barJoint + headShift,
		headShift,
		dashX2: dashRight - dashHalfWidth,
		aShift: mix(0, aShiftEnd, easeInOut(seg(t, aShiftStart, swallowEnd))),
		sShift: mix(0, sShiftEnd, easeInOut(seg(t, rowTwoShiftStart, swallowEnd))),
		dotShift: mix(0, dotShiftEnd, easeInOut(seg(t, rowTwoShiftStart, swallowEnd))),
		arenFade: { from: arenEdge, to: arenEdge + fadeWidth },
		aFade: { from: barLeft, to: barLeft + fadeWidth },
		wapFade: { from: wapEdge, to: wapEdge - fadeWidth },
		sFade: { from: dashRight, to: dashRight - fadeWidth },
	};
};

// Exported for the test, which needs to know what the mask edges are protecting.
export const wordmarkExtents = {
	arenRight,
	aLeft,
	aWidth,
	sLeft,
	sWidth,
	wapRight,
	dotCx,
	dotOuter,
	aCollapsedLeft,
	sCollapsedLeft,
};

export default wordmarkFrameAt;
