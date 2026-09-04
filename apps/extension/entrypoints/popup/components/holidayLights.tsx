// ArenaSwap's own palette rather than a generic Christmas red and green — these are the five
// PowerScore colours, which happen to read as a string of bulbs.
const bulbColors = ['#d90368', '#00cc66', '#3e9bd1', '#f1c40f', '#f75c03'];

const bulbCount = 9;
const stringWidth = 320;
const stringHeight = 22;
const swagSpan = stringWidth / bulbCount;
const swagDip = 8;
const pinY = 2;

// One sagging swag between each pair of pins. A quadratic with its control point at twice the dip
// passes through the dip itself, which is where the bulb hangs.
const wirePath = Array.from({ length: bulbCount }, (_, i) => {
	const startX = i * swagSpan;
	return `M ${startX} ${pinY} Q ${startX + swagSpan / 2} ${pinY + swagDip * 2} ${startX + swagSpan} ${pinY}`;
}).join(' ');

const holidayLights = () => (
	<svg
		className='holiday-lights'
		viewBox={`0 0 ${stringWidth} ${stringHeight}`}
		preserveAspectRatio='none'
		aria-hidden='true'
	>
		<path d={wirePath} className='holiday-lights-wire' />
		{Array.from({ length: bulbCount }, (_, i) => {
			const centerX = i * swagSpan + swagSpan / 2;
			const capY = pinY + swagDip;
			return (
				<g
					key={i}
					className='holiday-bulb'
					style={{ color: bulbColors[i % bulbColors.length], animationDelay: `${(i % bulbColors.length) * 0.42}s` }}
				>
					<rect x={centerX - 1.4} y={capY} width={2.8} height={2.4} className='holiday-bulb-cap' />
					<ellipse cx={centerX} cy={capY + 5.4} rx={2.9} ry={3.8} className='holiday-bulb-glass' />
				</g>
			);
		})}
	</svg>
);

export default holidayLights;
