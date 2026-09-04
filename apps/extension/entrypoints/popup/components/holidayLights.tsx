import { useLayoutEffect, useRef, useState } from 'react';

// ArenaSwap's own palette rather than a generic Christmas red and green — these are the five
// PowerScore colours, which happen to read as a string of bulbs.
const bulbColors = ['#d90368', '#00cc66', '#3e9bd1', '#f1c40f', '#f75c03'];

const frameWidth = 320;
const frameHeight = 560;
// Far enough in that the bulbs clear the popup edge, close enough that the content inset stays small.
const inset = 8;
const bulbSpacing = 38;

const left = inset;
const right = frameWidth - inset;
const top = inset;
const bottom = frameHeight - inset;

interface bulb {
	x: number;
	y: number;
	// Degrees clockwise. Every bulb hangs inward, so the cap stays against the popup edge and
	// the glass sits over the content rather than off the side of the window.
	rotation: number;
}

// Bulbs are spaced evenly along each run rather than around the whole perimeter, so the corners
// always land on a bulb and the string never ends mid-swag.
const runBulbs = (
	from: { x: number; y: number },
	to: { x: number; y: number },
	rotation: number,
): bulb[] => {
	const span = Math.hypot(to.x - from.x, to.y - from.y);
	const steps = Math.max(2, Math.round(span / bulbSpacing));
	return Array.from({ length: steps }, (_, i) => {
		const t = (i + 0.5) / steps;
		return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, rotation };
	});
};

const bulbs: bulb[] = [
	...runBulbs({ x: left, y: top }, { x: right, y: top }, 0),
	...runBulbs({ x: right, y: top }, { x: right, y: bottom }, 90),
	...runBulbs({ x: right, y: bottom }, { x: left, y: bottom }, 180),
	...runBulbs({ x: left, y: bottom }, { x: left, y: top }, -90),
];

// Horizontal runs sag between their bulbs the way a strung wire does. The vertical runs are drawn
// straight: a wire hanging down its own length does not bow sideways.
const sagPath = (y: number, fromX: number, toX: number): string => {
	const steps = Math.max(2, Math.round(Math.abs(toX - fromX) / bulbSpacing));
	const step = (toX - fromX) / steps;
	const dip = y < frameHeight / 2 ? 5 : -5;
	return Array.from({ length: steps }, (_, i) => {
		const startX = fromX + step * i;
		return `M ${startX} ${y} Q ${startX + step / 2} ${y + dip * 2} ${startX + step} ${y}`;
	}).join(' ');
};

const wirePath = [
	sagPath(top, left, right),
	`M ${right} ${top} L ${right} ${bottom}`,
	sagPath(bottom, right, left),
	`M ${left} ${bottom} L ${left} ${top}`,
].join(' ');

interface frameBox {
	top: number;
	left: number;
	width: number;
	height: number;
}

// Pinned to the scroll container's own padding box, measured, rather than to the window. `inset: 0`
// gets sliced by the scrollbar on the right and cannot be trusted for the height either, and a
// sticky wrapper cannot lift itself above its own flow position, which drops the bottom run
// off-screen until you scroll. clientWidth and clientHeight are exactly the box the frame wants:
// they exclude the scrollbar and include the padding the bulbs sit in.
const holidayLights = () => {
	const svgRef = useRef<SVGSVGElement | null>(null);
	const [box, setBox] = useState<frameBox | null>(null);

	// Layout effect rather than an effect: measured after the DOM is committed but before the paint
	// that would otherwise show one frame of a mis-sized string.
	useLayoutEffect(() => {
		const scroller = svgRef.current?.closest('.popup-container');
		if (!scroller) return;
		const rect = scroller.getBoundingClientRect();
		setBox({ top: rect.top, left: rect.left, width: scroller.clientWidth, height: scroller.clientHeight });
	}, []);

	return (
		<svg
			ref={svgRef}
			className='holiday-lights'
			style={box ? { top: box.top, left: box.left, width: box.width, height: box.height } : { visibility: 'hidden' }}
			viewBox={`0 0 ${frameWidth} ${frameHeight}`}
			preserveAspectRatio='none'
			aria-hidden='true'
		>
		<path d={wirePath} className='holiday-lights-wire' />
		{bulbs.map((b, i) => (
			<g
				key={`${b.x}-${b.y}`}
				className='holiday-bulb'
				transform={`translate(${b.x} ${b.y}) rotate(${b.rotation})`}
				style={{ color: bulbColors[i % bulbColors.length], animationDelay: `${(i % bulbColors.length) * 0.42}s` }}
			>
				<rect x={-1.4} y={0} width={2.8} height={2.4} className='holiday-bulb-cap' />
				<ellipse cx={0} cy={5.4} rx={2.9} ry={3.8} className='holiday-bulb-glass' />
			</g>
		))}
		</svg>
	);
};

export default holidayLights;
