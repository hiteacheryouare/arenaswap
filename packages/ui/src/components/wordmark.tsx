import { useId } from 'react';
import type { Ref } from 'react';
import wordmarkFrameAt, {
	barJoint,
	barCentreRest,
	barRest,
	barStrokeRest,
	dashCentreRest,
	dashFirstCapRest,
	dashLastCapRest,
	dashStrokeRest,
	fadeWidth,
	restBox,
	type fadeSpan,
	type pose,
} from './wordmarkFrame';
import { arenPath, aPath, chevronFrom, chevronTo, headFrom, headTo, sPath, wapPath } from './wordmarkShapes';

// The ArenaSwap wordmark, drawn inline so it can be taken apart. `wordmarkFrame` decides where the
// pieces go; this file is the pieces and the DOM writing that poses them.
//
// Two of them are not outlines. The bar on the top row and the dashed tail on the bottom are
// round-capped strokes, because both change length and weight between the two marks and a scaled
// outline turns its round ends into ellipses. They sit within a unit of the shapes they replace,
// which is 0.08px at the size the popup renders this.
//
// Only `aren` and `wap` are masked. Everything else — including the `a` and the `s`, which are the
// whole point — is on screen for the entire animation.

const white = '#ffffff';
const dotOrange = '#ff751f';

const restFades: Record<'aren' | 'wap', fadeSpan> = {
	aren: { from: 718.6, to: 718.6 + fadeWidth },
	wap: { from: 1725, to: 1725 + fadeWidth },
};

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

// Looked up once per element rather than per frame. The popup mounts one of these and the site
// mounts two, so a map keyed on the node is cheaper than ids and cannot collide between them.
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
const ringPath = (from: number[], to: number[], k: number) => {
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
export const applyWordmarkProgress = (svg: SVGSVGElement, progress: number) => {
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

const Wordmark = ({ className, ref }: { className?: string; ref?: Ref<SVGSVGElement> }) => {
	// The site renders the popup header twice on one page, so the gradient and mask ids cannot be
	// literals. Stripped of punctuation because React's own separators are not name characters.
	const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
	const fade = (name: 'aren' | 'wap') => `${uid}-fade-${name}`;

	return (
		<svg
			ref={ref}
			className={className}
			viewBox={`${restBox.x} ${restBox.y} ${restBox.width} ${restBox.height}`}
			style={{ aspectRatio: `${restBox.width} / ${restBox.height}` }}
			role='img'
			aria-label='ArenaSwap'
		>
			<defs>
				{(['aren', 'wap'] as const).map(name => (
					<linearGradient
						key={name}
						id={fade(name)}
						data-wm={`fade-${name}`}
						gradientUnits='userSpaceOnUse'
						x1={restFades[name].from}
						x2={restFades[name].to}
						y1={0}
						y2={0}
					>
						<stop offset='0' stopColor={white} />
						<stop offset='1' stopColor='#000000' />
					</linearGradient>
				))}
				{(['aren', 'wap'] as const).map(name => (
					// Wide enough to hold the mark where it runs off both sides mid-sweep. A mask
					// only covers what its own box covers; anything outside this is transparent.
					<mask key={name} id={`${uid}-mask-${name}`} maskUnits='userSpaceOnUse' x={-400} y={-150} width={3400} height={800}>
						<rect x={-400} y={-150} width={3400} height={800} fill={`url(#${fade(name)})`} />
					</mask>
				))}
			</defs>

			{/* The two doomed words, underneath, so the letters that replace them pass over rather
			    than through. */}
			<g mask={`url(#${uid}-mask-aren)`}><path d={arenPath} fill={white} /></g>
			<g mask={`url(#${uid}-mask-wap)`}><path data-wm='wap' d={wapPath} fill={white} /></g>

			<path data-wm='a' d={aPath} fill={white} />
			<path data-wm='s' d={sPath} fill={white} />
			{/* Fill and stroke in the same colour is how the source file draws it; the stroke is
			    half a unit of extra radius the dot would otherwise lose. */}
			<ellipse data-wm='dot' cx={1761.1208} cy={368.38882} rx={27.602106} ry={26.288622} fill={dotOrange} stroke={dotOrange} strokeWidth={1.13729} />

			<line
				data-wm='bar'
				x1={barRest + barStrokeRest / 2}
				x2={barJoint}
				y1={barCentreRest}
				y2={barCentreRest}
				stroke={white}
				strokeWidth={barStrokeRest}
				strokeLinecap='round'
			/>
			<path data-wm='head' d={ringPath(headFrom, headTo, 0)} fill={white} />

			<path data-wm='chevron' d={ringPath(chevronFrom, chevronTo, 0)} fill={white} />
			<line
				data-wm='dashes'
				x1={dashFirstCapRest}
				x2={dashLastCapRest}
				y1={dashCentreRest}
				y2={dashCentreRest}
				stroke={white}
				strokeWidth={dashStrokeRest}
				strokeLinecap='round'
				strokeDasharray='56.9 63.1'
			/>
		</svg>
	);
};

export default Wordmark;
