import { useId } from 'react';
import type { Ref } from 'react';
import wordmarkFrameAt, {
	barHalfWidth,
	barJoint,
	barRest,
	dashFirstCap,
	dashHalfWidth,
	dashPattern,
	dashRest,
	fadeWidth,
	restBox,
	type fadeSpan,
} from './wordmarkFrame';
import { arenPath, aPath, arrowHeadPath, chevronPath, sPath, wapPath } from './wordmarkPaths';

// The ArenaSwap wordmark, drawn inline so it can be taken apart. `wordmarkFrame` decides where the
// pieces go; this file is only the pieces and the two lines of DOM writing that pose them.
//
// Two of them are not outlines at all. The bar on the top row and the dashed tail on the bottom are
// redrawn as round-capped strokes, because both have to change length: scaling the original
// outlines would squash their round ends into ellipses, while a stroke just gets shorter. They sit
// within a unit of the shapes they replace, which is 0.08px at the 36px the popup renders this at.
//
// The four gradients are the animation. Each one is a 55-unit ramp from opaque to transparent,
// padded at both ends, filling a mask over one group of letters — so moving the ramp wipes that
// group off at the arrow's leading edge. `aren` and `wap` get their own pair because they are gone
// for good, while the `a` and `s` replacing them have to come back out as the arrows retract.

const barCentreY = 115;
const barStroke = 30;
const dashCentreY = 304.75;
const dashStroke = 31.8;
const white = '#ffffff';
const dotOrange = '#ff751f';

const fadeIds = ['aren', 'a', 'wap', 's'] as const;
type fadeName = (typeof fadeIds)[number];

const restFades: Record<fadeName, fadeSpan> = {
	aren: { from: barRest, to: barRest + fadeWidth },
	a: { from: barRest, to: barRest + fadeWidth },
	wap: { from: dashRest, to: dashRest - fadeWidth },
	s: { from: dashRest, to: dashRest - fadeWidth },
};

interface wordmarkParts {
	bar: SVGLineElement;
	dashes: SVGLineElement;
	head: SVGPathElement;
	a: SVGPathElement;
	s: SVGPathElement;
	dot: SVGEllipseElement;
	fades: Record<fadeName, SVGLinearGradientElement>;
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
		dot: find<SVGEllipseElement>('dot'),
		fades: {
			aren: find<SVGLinearGradientElement>('fade-aren'),
			a: find<SVGLinearGradientElement>('fade-a'),
			wap: find<SVGLinearGradientElement>('fade-wap'),
			s: find<SVGLinearGradientElement>('fade-s'),
		},
	};
	partsCache.set(svg, parts);
	return parts;
};

const round = (value: number) => String(Math.round(value * 100) / 100);
const shiftX = (node: Element, x: number) => node.setAttribute('transform', `translate(${round(x)} 0)`);
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

	parts.bar.setAttribute('x1', round(frame.barX1));
	parts.bar.setAttribute('x2', round(frame.barX2));
	parts.dashes.setAttribute('x2', round(frame.dashX2));
	shiftX(parts.head, frame.headShift);
	shiftX(parts.a, frame.aShift);
	shiftX(parts.s, frame.sShift);
	shiftX(parts.dot, frame.dotShift);

	setFade(parts.fades.aren, frame.arenFade);
	setFade(parts.fades.a, frame.aFade);
	setFade(parts.fades.wap, frame.wapFade);
	setFade(parts.fades.s, frame.sFade);
};

const Wordmark = ({ className, ref }: { className?: string; ref?: Ref<SVGSVGElement> }) => {
	// The site renders the popup header twice on one page, so the gradient and mask ids cannot be
	// literals. Stripped of punctuation because React's own separators are not name characters.
	const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
	const fade = (name: fadeName) => `${uid}-fade-${name}`;
	const mask = (name: fadeName) => `url(#${uid}-mask-${name})`;

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
				{fadeIds.map(name => (
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
				{fadeIds.map(name => (
					// Wide enough to hold the arrows where they run off both sides mid-sweep. A mask
					// only covers what its own box covers, so anything outside this is transparent.
					<mask key={name} id={`${uid}-mask-${name}`} maskUnits='userSpaceOnUse' x={-400} y={-150} width={3400} height={800}>
						<rect x={-400} y={-150} width={3400} height={800} fill={`url(#${fade(name)})`} />
					</mask>
				))}
			</defs>

			<g mask={mask('aren')}><path d={arenPath} fill={white} /></g>
			<g mask={mask('a')}><path data-wm='a' d={aPath} fill={white} /></g>

			<g mask={mask('wap')}><path d={wapPath} fill={white} /></g>
			<g mask={mask('s')}>
				<path data-wm='s' d={sPath} fill={white} />
				{/* Fill and stroke in the same colour is how the source file draws it; the stroke is
				    half a unit of extra radius the dot would otherwise lose. */}
				<ellipse data-wm='dot' cx={1761.1208} cy={368.38882} rx={27.602106} ry={26.288622} fill={dotOrange} stroke={dotOrange} strokeWidth={1.13729} />
			</g>

			{/* The arrows last, so they pass over the words rather than under them. */}
			<line
				data-wm='bar'
				x1={barRest + barHalfWidth}
				x2={barJoint}
				y1={barCentreY}
				y2={barCentreY}
				stroke={white}
				strokeWidth={barStroke}
				strokeLinecap='round'
			/>
			<path data-wm='head' d={arrowHeadPath} fill={white} />

			<path d={chevronPath} fill={white} />
			<line
				data-wm='dashes'
				x1={dashFirstCap}
				x2={dashRest - dashHalfWidth}
				y1={dashCentreY}
				y2={dashCentreY}
				stroke={white}
				strokeWidth={dashStroke}
				strokeLinecap='round'
				strokeDasharray={dashPattern}
			/>
		</svg>
	);
};

export default Wordmark;
