import wordmarkFrameAt, { type fadeSpan, type pose } from './wordmarkFrame';
import { chevronFrom, chevronTo, headFrom, headTo } from './wordmarkShapes';

// Poses a wordmark that has already been drawn. `wordmark.tsx` is the drawing; this is the writing.
//
// They are apart because the website drives the collapse from a plain module script in its header,
// and importing the component there would pull React into a bundle that has no other use for it —
// every page on the site carries that header, including the ones with no islands at all.

interface wordmarkParts {
	bar: SVGLineElement;
	dashes: SVGLineElement;
	head: SVGPathElement;
	a: SVGPathElement;
	s: SVGPathElement;
	wap: SVGPathElement;
	dot: SVGEllipseElement;
	chevron: SVGPathElement;
	arenFade: SVGLinearGradientElement;
	wapFade: SVGLinearGradientElement;
}

// Looked up once per element rather than per frame. A page carries one of these in its header and
// another inside every popup mockup on it, so a map keyed on the node is cheaper than ids and
// cannot collide between them.
const partsCache = new WeakMap<SVGSVGElement, wordmarkParts>();

const partsOf = (svg: SVGSVGElement): wordmarkParts => {
	const cached = partsCache.get(svg);
	if (cached) return cached;
	const find = <T extends Element>(name: string) => svg.querySelector(`[data-wm="${name}"]`) as T;
	const parts: wordmarkParts = {
		bar: find<SVGLineElement>('bar'),
		dashes: find<SVGLineElement>('dashes'),
		head: find<SVGPathElement>('head'),
		a: find<SVGPathElement>('a'),
		s: find<SVGPathElement>('s'),
		wap: find<SVGPathElement>('wap'),
		dot: find<SVGEllipseElement>('dot'),
		chevron: find<SVGPathElement>('chevron'),
		arenFade: find<SVGLinearGradientElement>('fade-aren'),
		wapFade: find<SVGLinearGradientElement>('fade-wap'),
	};
	partsCache.set(svg, parts);
	return parts;
};

const round = (value: number) => String(Math.round(value * 100) / 100);
// Scale factors need far more precision than positions do. These run from 1 to about 1.005, so two
// decimals rounds the whole journey to a single step and lands the letter three units wide of the
// icon — which is small enough to survive a glance and not a measurement.
const preciseRound = (value: number) => String(Math.round(value * 1e6) / 1e6);
const place = (node: Element, at: pose) => node.setAttribute(
	'transform',
	`translate(${round(at.x)} ${round(at.y)}) scale(${preciseRound(at.scaleX)} ${preciseRound(at.scaleY)})`,
);

// Walks one outline onto the other, point for point. A tenth of a unit is 0.008px at the size this
// renders, so the rounding here is well past the point of mattering and keeps the string short.
export const ringPath = (from: number[], to: number[], k: number) => {
	let d = '';
	for (let i = 0; i < from.length; i += 2) {
		// Asserted rather than guarded: the two rings are generated as one pair and are the same
		// length by construction, so a bounds check here would only ever be dead code.
		const fx = from[i] as number, fy = from[i + 1] as number;
		const tx = to[i] as number, ty = to[i + 1] as number;
		const x = Math.round((fx + (tx - fx) * k) * 10) / 10;
		const y = Math.round((fy + (ty - fy) * k) * 10) / 10;
		d += `${i ? 'L' : 'M'}${x},${y}`;
	}
	return `${d}Z`;
};

const setFade = (node: SVGLinearGradientElement, span: fadeSpan) => {
	node.setAttribute('x1', round(span.from));
	node.setAttribute('x2', round(span.to));
};

// 0 is the full wordmark, 1 is the favicon. Writes attributes directly rather than going back
// through React: the popup re-renders its whole game list on a state change, and this runs every
// frame for 450ms.
const applyWordmarkProgress = (svg: SVGSVGElement, progress: number) => {
	const frame = wordmarkFrameAt(progress);
	const parts = partsOf(svg);
	const { box } = frame;

	svg.setAttribute('viewBox', `${round(box.x)} ${round(box.y)} ${round(box.width)} ${round(box.height)}`);
	// The viewBox alone gives an inline SVG its intrinsic ratio, but only some of the time and not
	// on every engine. Stating it is what makes `height: 36px; width: auto` actually narrow.
	svg.style.aspectRatio = `${round(box.width)} / ${round(box.height)}`;

	place(parts.a, frame.a);
	place(parts.s, frame.s);
	place(parts.wap, frame.wap);

	// The dot is resized rather than transformed: a `scale` would take its stroke with it, and the
	// icon paints a lighter one than the wordmark does.
	parts.dot.setAttribute('cx', round(frame.dot.cx));
	parts.dot.setAttribute('cy', round(frame.dot.cy));
	parts.dot.setAttribute('rx', round(frame.dot.rx));
	parts.dot.setAttribute('ry', round(frame.dot.ry));
	parts.dot.setAttribute('stroke-width', round(frame.dot.stroke));

	parts.chevron.setAttribute('d', ringPath(chevronFrom, chevronTo, frame.chevronMorph));
	parts.head.setAttribute('d', ringPath(headFrom, headTo, frame.headMorph));

	parts.bar.setAttribute('x1', round(frame.barX1));
	parts.bar.setAttribute('x2', round(frame.barX2));
	parts.bar.setAttribute('y1', round(frame.barCentre));
	parts.bar.setAttribute('y2', round(frame.barCentre));
	parts.bar.setAttribute('stroke-width', round(frame.barStroke));

	parts.dashes.setAttribute('x1', round(frame.dashX1));
	parts.dashes.setAttribute('x2', round(frame.dashX2));
	parts.dashes.setAttribute('y1', round(frame.dashCentre));
	parts.dashes.setAttribute('y2', round(frame.dashCentre));
	parts.dashes.setAttribute('stroke-width', round(frame.dashStroke));
	parts.dashes.setAttribute('stroke-dasharray', frame.dashPattern);

	setFade(parts.arenFade, frame.arenFade);
	setFade(parts.wapFade, frame.wapFade);

	return frame.closed;
};

export default applyWordmarkProgress;
