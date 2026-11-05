const fanWidth = 32;
const fanRadius = 15;
const bands = [
	{ radius: fanRadius, className: 'holiday-bunting-red' },
	{ radius: 12.5, className: 'holiday-bunting-white' },
	{ radius: 10, className: 'holiday-bunting-red' },
	{ radius: 7.5, className: 'holiday-bunting-blue' },
];
const pleatAngles = [30, 60, 90, 120, 150];

const halfDisc = (center: number, radius: number): string => (
	`M ${center - radius} 0 A ${radius} ${radius} 0 0 0 ${center + radius} 0 Z`
);

const pleat = (center: number, degrees: number): string => {
	const radians = (degrees * Math.PI) / 180;
	return `M ${center} 0 L ${center + Math.cos(radians) * fanRadius} ${Math.sin(radians) * fanRadius}`;
};

const Fan = ({ center }: { center: number }) => (
	<>
		{bands.map(band => <path key={band.radius} d={halfDisc(center, band.radius)} className={band.className} />)}
		{pleatAngles.map(angle => <path key={angle} d={pleat(center, angle)} className='holiday-bunting-pleat' />)}
		<circle cx={center - 3} cy={2.2} r={0.8} className='holiday-bunting-star' />
		<circle cx={center} cy={4.4} r={0.8} className='holiday-bunting-star' />
		<circle cx={center + 3} cy={2.2} r={0.8} className='holiday-bunting-star' />
	</>
);

// A pattern rather than a viewBox, so a wider Guide window gets more fans instead of wider ones.
// The tile starts at the middle with a fan split across each of its edges, so whatever the width,
// one fan hangs dead centre and the two ends are cut by the same amount.
const holidayBunting = () => (
	<svg className='holiday-bunting' height={fanRadius + 1} aria-hidden='true'>
		<defs>
			<pattern id='holidayBuntingFan' x='50%' width={fanWidth} height={fanRadius + 1} patternUnits='userSpaceOnUse'>
				<Fan center={0} />
				<Fan center={fanWidth} />
			</pattern>
		</defs>
		<rect width='100%' height={fanRadius + 1} fill='url(#holidayBuntingFan)' />
	</svg>
);

export default holidayBunting;
