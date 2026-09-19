import { useId } from 'react';
import type { Ref } from 'react';
import {
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
} from './wordmarkFrame';
import { ringPath } from './wordmarkPose';
import { arenPath, aPath, chevronFrom, chevronTo, headFrom, headTo, sPath, wapPath } from './wordmarkShapes';

// The ArenaSwap wordmark, drawn inline so it can be taken apart. `wordmarkFrame` decides where the
// pieces go, `wordmarkPose` writes them, and this file is the pieces.
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
