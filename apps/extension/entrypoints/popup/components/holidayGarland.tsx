import type { ReactNode } from 'react';

interface holidayGarlandProps {
	leftColor: string;
	rightColor: string;
}

const tileWidth = 28;
const height = 22;
const spine = height / 2;
const needleGreens = ['#173f27', '#215434', '#2c6b42', '#3b8452', '#4c9a60'];

const pseudoRandom = (seed: number): number => {
	const x = Math.sin(seed * 12.9898) * 43758.5453;
	return x - Math.floor(x);
};

// Each needle is drawn again a tile to either side, so the ones that cross a tile's edge carry on
// into the next tile instead of being cut off at a seam.
const needles = Array.from({ length: 52 }, (_, i) => {
	const x = pseudoRandom(i + 1) * tileWidth;
	const y = spine + (pseudoRandom(i + 41) - 0.5) * 6;
	const upward = i % 2 === 0 ? -1 : 1;
	const lean = pseudoRandom(i + 83) < 0.5 ? -1 : 1;
	const angle = (20 + pseudoRandom(i + 127) * 55) * (Math.PI / 180);
	const length = 5.5 + pseudoRandom(i + 211) * 5;
	const color = needleGreens[Math.floor(pseudoRandom(i + 307) * needleGreens.length)]!;
	const dx = Math.cos(angle) * length * lean;
	const dy = Math.sin(angle) * length * upward;
	const d = [-tileWidth, 0, tileWidth].map(offset => `M ${(x + offset).toFixed(2)} ${y.toFixed(2)} l ${dx.toFixed(2)} ${dy.toFixed(2)}`).join(' ');
	return { d, color };
}).toSorted((a, b) => needleGreens.indexOf(a.color) - needleGreens.indexOf(b.color));

// Trim sits at fractions of the width, so a wider Guide window spreads it out rather than adding more.
const At = ({ x, dy = 0, children }: { x: string; dy?: number; children: ReactNode }) => (
	<svg x={x} y={spine + dy} overflow='visible'>{children}</svg>
);

const Bauble = ({ fill, radius = 3.6 }: { fill: string; radius?: number }) => (
	<g className='holiday-bauble'>
		<rect x={-1} y={-radius - 1.4} width={2} height={1.6} className='holiday-bauble-cap' />
		<circle r={radius} fill={fill} className='holiday-bauble-glass' />
		<circle cx={-radius * 0.35} cy={-radius * 0.35} r={radius * 0.28} className='holiday-ornament-shine' />
	</g>
);

const Pinecone = () => (
	<g className='holiday-pinecone' transform='rotate(-20)'>
		<ellipse rx={2.3} ry={3.3} />
		<path d='M -1.8 -1.2 Q 0 -0.2 1.8 -1.2 M -2 0.6 Q 0 1.6 2 0.6 M -1.4 2.2 Q 0 3 1.4 2.2' className='holiday-pinecone-scales' />
	</g>
);

const Sprig = () => (
	<g className='holiday-sprig'>
		<path d='M 0 0 L -3.6 -4.4 M 0 0 L 0.6 -5.6 M 0 0 L 4.2 -3.8' />
		<circle cx={-3.6} cy={-4.4} r={0.7} />
		<circle cx={0.6} cy={-5.6} r={0.7} />
		<circle cx={4.2} cy={-3.8} r={0.7} />
	</g>
);

// The mantel the stockings hang from, laid along the bottom edge of the hero. Gold all the way
// along, with one bauble in each team's colour at its own end.
const holidayGarland = ({ leftColor, rightColor }: holidayGarlandProps) => (
	<svg className='holiday-garland' height={height} aria-hidden='true'>
		<defs>
			<pattern id='holidayGarlandNeedles' x='50%' width={tileWidth} height={height} patternUnits='userSpaceOnUse'>
				<rect y={spine - 4.5} width={tileWidth} height={9} rx={4.5} className='holiday-garland-body' />
				{needles.map(needle => <path key={needle.d} d={needle.d} stroke={needle.color} className='holiday-garland-needle' />)}
			</pattern>
			<radialGradient id='holidayGold' cx='35%' cy='35%' r='75%'>
				<stop offset='0%' stopColor='#fbe7a1' />
				<stop offset='55%' stopColor='#d9ab45' />
				<stop offset='100%' stopColor='#9c7424' />
			</radialGradient>
			<radialGradient id='holidayChampagne' cx='35%' cy='35%' r='75%'>
				<stop offset='0%' stopColor='#fff4e6' />
				<stop offset='60%' stopColor='#e8c9a6' />
				<stop offset='100%' stopColor='#b48f6a' />
			</radialGradient>
		</defs>
		<rect width='100%' height={height} fill='url(#holidayGarlandNeedles)' />
		<At x='4%'><Bauble fill={leftColor} radius={3.9} /></At>
		<At x='13%' dy={-2}><Sprig /></At>
		<At x='24%' dy={1}><Bauble fill='url(#holidayGold)' /></At>
		<At x='31%' dy={2}><Pinecone /></At>
		<At x='40%' dy={-1}><Bauble fill='url(#holidayChampagne)' radius={3} /></At>
		<At x='50%' dy={-2}><Sprig /></At>
		<At x='50%' dy={1.5}><Bauble fill='url(#holidayGold)' radius={4.2} /></At>
		<At x='60%' dy={-1}><Bauble fill='url(#holidayChampagne)' radius={3} /></At>
		<At x='69%' dy={2}><Pinecone /></At>
		<At x='76%' dy={1}><Bauble fill='url(#holidayGold)' /></At>
		<At x='87%' dy={-2}><Sprig /></At>
		<At x='96%'><Bauble fill={rightColor} radius={3.9} /></At>
	</svg>
);

export default holidayGarland;
