// The wordmark turning into the favicon, as pure numbers. Nothing here touches the DOM, which is
// what lets `wordmarkFrame.test.ts` assert the parts that are easy to get wrong by eye.
//
// The end of this animation is the icon file, not an impression of it. Every target below was
// measured off `icon_white_on_transparent.svg` and mapped into the wordmark's units by the ratio of
// the two files' letter heights — 0.34545, which is exact to five places for both the `a` and the
// `s`, because the icon's letters *are* the wordmark's letters. Its arrows are not: the icon draws
// a wider arrowhead and a lighter chevron, so those two morph between point rings rather than
// scaling. See `wordmarkShapes.ts`.
//
// What the mark loses on the way is `aren` and `wap`. Neither is covered by an arrow sweeping over
// it — the surviving letters stay on screen the whole time, so nothing may pass across them.
// Instead each row is masked at the leading edge of the thing that replaces it:
//
//   top     the `a` slides left along its own row and the letters go as it reaches them
//   bottom  the dot sweeps left through `wap` to close up behind the `s`
//
// Both edges only ever close, so nothing that has gone can come back, and running `t` backwards is
// exactly the reverse animation.

// ─── where the wordmark puts things ──────────────────────────────────────────────────────────
// Flattened bounding boxes of the real outlines, not the control-point hulls, which run several
// units wide on every curve in this mark.
const arenRight = 711.08;
const aBox = { x: 732.63, y: 0.54, w: 165.37, h: 183.88 };
const sBox = { x: 914, y: 212.51, w: 154.76, h: 184.04 };
const wapBox = { x: 1070, y: 212.93, w: 648.75, h: 257.07 };
const dotRest = { cx: 1761.1208, cy: 368.38882, rx: 27.602106, ry: 26.288622, stroke: 1.13729 };

// The bar and the dashed tail are redrawn as round-capped strokes rather than kept as outlines,
// because both change length and weight between the two marks and a scaled outline would squash
// its round ends into ellipses. They sit within a unit of the shapes they replace.
export const barJoint = 1691;
export const barRest = 910;
export const barStrokeRest = 30;
export const barCentreRest = 115;
export const dashFirstCapRest = 115.8;
export const dashLastCapRest = 892.7;
export const dashStrokeRest = 31.8;
export const dashCentreRest = 304.75;
const dashSegRest = 56.9;
const dashGapRest = 63.1;

// ─── where the favicon puts them ─────────────────────────────────────────────────────────────
const aEnd = { x: 12.74, y: 0, w: 166.21, h: 183.94 };
const sEnd = { x: 268.34, y: 170.63, w: 155.25, h: 183.98 };
// The dot is a destination, not a resting place. `icon_white_on_transparent.svg` carries an orange
// period that the shipped icon does not have — every PNG under `apps/extension/public/icon` has
// zero orange pixels in it, and their white ink measures 1.212 wide for its height, which is this
// mark without the dot (1.218) and not with it (1.414). So the dot sweeps left through `wap`, doing
// the work of clearing it, and then closes to nothing behind the `s`.
const dotEnd = { cx: 482.88, cy: 296.98, rx: 0, ry: 0, stroke: 0 };
// Its own window, late and short. It has to stay full size long enough to be the thing visibly
// pushing `wap` off the row, and be gone before the box narrows past where it ends up.
const dotCloseFrom = 0.5;
const dotCloseTo = 0.74;
const barEnd = { left: 194.27, joint: 347.17, centre: 108.41, stroke: 28.33 };
const dashEnd = { firstCap: 80.26, lastCap: 249.42, stroke: 28.2, centre: 266.22, seg: 56.22, gap: 56.65 };

export const restBox = { x: 0, y: 0, width: 1790, height: 471 };
// The icon's own content box in the same units: its chevron across to the tip of its arrowhead,
// its `a`'s ascender down to its `s`'s baseline. Shorter than the wordmark's box because `p`'s
// descender leaves with `wap`, which is what makes the surviving marks grow by about half.
export const collapsedBox = { x: 0, y: 0, width: 431.76, height: 354.61 };

// ─── beats ───────────────────────────────────────────────────────────────────────────────────
// `lead` carries the letters, the bar's tail, the dot and both mask edges: the sweep. `follow`
// carries the arrowhead, and with it the box — so for the first third the arrow *lengthens*, its
// tail running inward across `aren` while its head is still out at the right, and only then does
// the whole thing close up. Tying the box to the head is also what keeps the head inside it.
const leadEnd = 0.72;
const followFrom = 0.18;

// Width of the soft edge the letters dissolve across. Small: at the end the top mask edge sits
// only 38 units clear of where `aren` starts, so a wide band would leave the first `a` showing.
export const fadeWidth = 30;
// How far the top edge runs ahead of the sliding `a`. At rest that puts the band in the gap between
// word and arrow, so the mark is pixel-identical to the file it came from.
const arenLead = 14;
const wapEdgeRest = 1725;
const wapEdgeEnd = 384;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const seg = (t: number, from: number, to: number) => clamp01((t - from) / (to - from));
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - ((-2 * x + 2) ** 3) / 2);
const mix = (from: number, to: number, k: number) => from + (to - from) * k;

// A two-stop gradient span, `from` opaque and `to` transparent. The stops beyond either end pad,
// which is what lets a 30-unit gradient mask an entire row.
export interface fadeSpan {
	from: number;
	to: number;
}

// Non-uniform on purpose. The icon's letters are half a percent wider for their height than the
// wordmark's, and allowing the two axes to differ is what makes the last frame the icon exactly
// rather than nearly.
export interface pose {
	x: number;
	y: number;
	scaleX: number;
	scaleY: number;
}

export interface wordmarkFrame {
	box: { x: number; y: number; width: number; height: number };
	// How far the collapse has closed, 0 to 1 and eased. The header reads it back to shrink itself
	// and bring its background up, so the bar and the mark move on one curve rather than two.
	closed: number;
	a: pose;
	s: pose;
	wap: pose;
	dot: { cx: number; cy: number; rx: number; ry: number; stroke: number };
	// How far along each point ring has walked, 0 at the wordmark's outline and 1 at the icon's.
	chevronMorph: number;
	headMorph: number;
	barX1: number;
	barX2: number;
	barStroke: number;
	barCentre: number;
	dashX1: number;
	dashX2: number;
	dashStroke: number;
	dashCentre: number;
	dashPattern: string;
	arenFade: fadeSpan;
	wapFade: fadeSpan;
}

const boxPose = (from: typeof aBox, to: typeof aEnd, k: number): pose => {
	const scaleX = mix(1, to.w / from.w, k);
	const scaleY = mix(1, to.h / from.h, k);
	return {
		scaleX,
		scaleY,
		x: mix(from.x, to.x, k) - from.x * scaleX,
		y: mix(from.y, to.y, k) - from.y * scaleY,
	};
};

const wordmarkFrameAt = (t: number): wordmarkFrame => {
	const lead = easeInOut(seg(t, 0, leadEnd));
	const follow = easeInOut(seg(t, followFrom, 1));

	const a = boxPose(aBox, aEnd, lead);
	const s = boxPose(sBox, sEnd, lead);
	// `wap` rides the `s`'s transform so the word never tears away from the letter it starts with
	// while the dot is eating it.
	const wap = boxPose(wapBox, { ...wapBox, x: wapBox.x + (sEnd.x - sBox.x), y: wapBox.y + (sEnd.y - sBox.y) }, lead);

	// The bar's tail is pinned just off the `a`'s shoulder, so extending inward is not a separate
	// animation — it is the bar keeping up with the letter while its head stays behind.
	const aRight = mix(aBox.x, aEnd.x, lead) + mix(aBox.w, aEnd.w, lead);
	const barStroke = mix(barStrokeRest, barEnd.stroke, follow);
	const barLeft = aRight + mix(barRest - (aBox.x + aBox.w), barEnd.left - (aEnd.x + aEnd.w), lead);

	const closing = easeInOut(seg(t, dotCloseFrom, dotCloseTo));
	const arenEdge = mix(aBox.x, aEnd.x, lead) - arenLead;
	const wapEdge = mix(wapEdgeRest, wapEdgeEnd, lead);

	return {
		box: {
			x: mix(restBox.x, collapsedBox.x, follow),
			y: mix(restBox.y, collapsedBox.y, follow),
			width: mix(restBox.width, collapsedBox.width, follow),
			height: mix(restBox.height, collapsedBox.height, follow),
		},
		closed: follow,
		a,
		s,
		wap,
		dot: {
			cx: mix(dotRest.cx, dotEnd.cx, lead),
			cy: mix(dotRest.cy, dotEnd.cy, lead),
			rx: mix(dotRest.rx, dotEnd.rx, closing),
			ry: mix(dotRest.ry, dotEnd.ry, closing),
			stroke: mix(dotRest.stroke, dotEnd.stroke, closing),
		},
		chevronMorph: lead,
		headMorph: follow,
		barX1: barLeft + barStroke / 2,
		barX2: mix(barJoint, barEnd.joint, follow),
		barStroke,
		barCentre: mix(barCentreRest, barEnd.centre, follow),
		dashX1: mix(dashFirstCapRest, dashEnd.firstCap, lead),
		dashX2: mix(dashLastCapRest, dashEnd.lastCap, lead),
		dashStroke: mix(dashStrokeRest, dashEnd.stroke, lead),
		dashCentre: mix(dashCentreRest, dashEnd.centre, lead),
		dashPattern: `${mix(dashSegRest, dashEnd.seg, lead)} ${mix(dashGapRest, dashEnd.gap, lead)}`,
		arenFade: { from: arenEdge, to: arenEdge + fadeWidth },
		wapFade: { from: wapEdge, to: wapEdge + fadeWidth },
	};
};

// Exported for the test, which needs to know what the mask edges are protecting.
export const wordmarkExtents = {
	arenLeft: 36.79,
	arenRight,
	aBox,
	sBox,
	wapBox,
	dotRest,
	aEnd,
	sEnd,
	dotEnd,
	barEnd,
	dashEnd,
};

export default wordmarkFrameAt;
