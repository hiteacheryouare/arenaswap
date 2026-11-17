const arenRight = 711.08;
const aBox = { x: 732.63, y: 0.54, w: 165.37, h: 183.88 };
const sBox = { x: 914, y: 212.51, w: 154.76, h: 184.04 };
const wapBox = { x: 1070, y: 212.93, w: 648.75, h: 257.07 };
const dotRest = { cx: 1761.1208, cy: 368.38882, rx: 27.602106, ry: 26.288622, stroke: 1.13729 };

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

const aEnd = { x: 12.74, y: 0, w: 166.21, h: 183.94 };
const sEnd = { x: 268.34, y: 170.63, w: 155.25, h: 183.98 };
const dotEnd = { cx: 482.88, cy: 296.98, rx: 0, ry: 0, stroke: 0 };
const dotCloseFrom = 0.5;
const dotCloseTo = 0.74;
const barEnd = { left: 194.27, joint: 347.17, centre: 108.41, stroke: 28.33 };
const dashEnd = { firstCap: 80.26, lastCap: 249.42, stroke: 28.2, centre: 266.22, seg: 56.22, gap: 56.65 };

export const restBox = { x: 0, y: 0, width: 1790, height: 471 };
export const collapsedMargin = 36;
const iconContent = { width: 431.76, height: 354.61 };
export const collapsedBox = {
	x: -collapsedMargin,
	y: -collapsedMargin,
	width: iconContent.width + collapsedMargin * 2,
	height: iconContent.height + collapsedMargin * 2,
};

const marksEndAt = 0.72;
const boxStartAt = 0.1;
const boxEndAt = 0.85;

export const fadeWidth = 30;
const arenMaskLead = 14;
const wapEdgeRest = 1725;
const wapEdgeEnd = 384;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const seg = (t: number, from: number, to: number) => clamp01((t - from) / (to - from));
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - ((-2 * x + 2) ** 3) / 2);
const mix = (from: number, to: number, k: number) => from + (to - from) * k;

export interface fadeSpan {
	from: number;
	to: number;
}

export interface pose {
	x: number;
	y: number;
	scaleX: number;
	scaleY: number;
}

export interface wordmarkFrame {
	box: { x: number; y: number; width: number; height: number };
	closed: number;
	a: pose;
	s: pose;
	wap: pose;
	dot: { cx: number; cy: number; rx: number; ry: number; stroke: number };
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
	const marksProgress = easeInOut(seg(t, 0, marksEndAt));
	const boxProgress = easeInOut(seg(t, boxStartAt, boxEndAt));

	const a = boxPose(aBox, aEnd, marksProgress);
	const s = boxPose(sBox, sEnd, marksProgress);
	const wap = boxPose(wapBox, { ...wapBox, x: wapBox.x + (sEnd.x - sBox.x), y: wapBox.y + (sEnd.y - sBox.y) }, marksProgress);

	const aRight = mix(aBox.x, aEnd.x, marksProgress) + mix(aBox.w, aEnd.w, marksProgress);
	const barStroke = mix(barStrokeRest, barEnd.stroke, marksProgress);
	const barLeft = aRight + mix(barRest - (aBox.x + aBox.w), barEnd.left - (aEnd.x + aEnd.w), marksProgress);

	const closing = easeInOut(seg(t, dotCloseFrom, dotCloseTo));
	const arenEdge = mix(aBox.x, aEnd.x, marksProgress) - arenMaskLead;
	const wapEdge = mix(wapEdgeRest, wapEdgeEnd, marksProgress);

	return {
		box: {
			x: mix(restBox.x, collapsedBox.x, boxProgress),
			y: mix(restBox.y, collapsedBox.y, boxProgress),
			width: mix(restBox.width, collapsedBox.width, boxProgress),
			height: mix(restBox.height, collapsedBox.height, boxProgress),
		},
		closed: boxProgress,
		a,
		s,
		wap,
		dot: {
			cx: mix(dotRest.cx, dotEnd.cx, marksProgress),
			cy: mix(dotRest.cy, dotEnd.cy, marksProgress),
			rx: mix(dotRest.rx, dotEnd.rx, closing),
			ry: mix(dotRest.ry, dotEnd.ry, closing),
			stroke: mix(dotRest.stroke, dotEnd.stroke, closing),
		},
		chevronMorph: marksProgress,
		headMorph: marksProgress,
		barX1: barLeft + barStroke / 2,
		barX2: mix(barJoint, barEnd.joint, marksProgress),
		barStroke,
		barCentre: mix(barCentreRest, barEnd.centre, marksProgress),
		dashX1: mix(dashFirstCapRest, dashEnd.firstCap, marksProgress),
		dashX2: mix(dashLastCapRest, dashEnd.lastCap, marksProgress),
		dashStroke: mix(dashStrokeRest, dashEnd.stroke, marksProgress),
		dashCentre: mix(dashCentreRest, dashEnd.centre, marksProgress),
		dashPattern: `${mix(dashSegRest, dashEnd.seg, marksProgress)} ${mix(dashGapRest, dashEnd.gap, marksProgress)}`,
		arenFade: { from: arenEdge, to: arenEdge + fadeWidth },
		wapFade: { from: wapEdge, to: wapEdge + fadeWidth },
	};
};

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
