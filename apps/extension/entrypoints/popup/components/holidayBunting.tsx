const radius = 48;
const center = 50;
const fanCount = 3;
const pleatStep = 9;

// Outside in, the way a pleated fan is sewn: red hem, white, a blue band of stars, white, and a
// red rosette at the top.
const bands = [
	{ outer: 39, className: 'holiday-bunting-white' },
	{ outer: 29, className: 'holiday-bunting-blue' },
	{ outer: 17, className: 'holiday-bunting-white' },
	{ outer: 11, className: 'holiday-bunting-red' },
];

const polar = (distance: number, degrees: number): [number, number] => {
	const radians = (degrees * Math.PI) / 180;
	return [center + Math.cos(radians) * distance, Math.sin(radians) * distance];
};

const halfDisc = (distance: number): string => (
	`M ${center - distance} 0 A ${distance} ${distance} 0 0 0 ${center + distance} 0 Z`
);

// The hem is gathered at every pleat, so its edge scallops instead of running smooth.
const hemPath = (() => {
	const steps = 180 / pleatStep;
	let d = `M ${center + radius} 0`;
	for (let i = 1; i <= steps; i += 1) {
		const [x, y] = polar(radius, i * pleatStep);
		const [cx, cy] = polar(radius + 2.2, (i - 0.5) * pleatStep);
		d += ` Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)}`;
	}
	return `${d} Z`;
})();

const pleats = Array.from({ length: 180 / pleatStep - 1 }, (_, i) => {
	const [x, y] = polar(radius, (i + 1) * pleatStep);
	return `M ${center} 0 L ${x.toFixed(2)} ${y.toFixed(2)}`;
}).join(' ');

const starPath = (cx: number, cy: number, size: number): string => (
	Array.from({ length: 10 }, (_, i) => {
		const distance = i % 2 === 0 ? size : size * 0.42;
		const radians = ((i * 36 - 90) * Math.PI) / 180;
		return `${i === 0 ? 'M' : 'L'} ${(cx + Math.cos(radians) * distance).toFixed(2)} ${(cy + Math.sin(radians) * distance).toFixed(2)}`;
	}).join(' ') + ' Z'
);

const stars = Array.from({ length: 7 }, (_, i) => {
	const [x, y] = polar(23, 18 + i * 24);
	return starPath(x, y, 3.3);
}).join(' ');

const Fan = () => (
	<svg className='holiday-bunting-fan' viewBox={`0 0 100 ${radius + 3}`} aria-hidden='true'>
		<path d={hemPath} className='holiday-bunting-red' />
		{bands.map(band => <path key={band.outer} d={halfDisc(band.outer)} className={band.className} />)}
		<path d={stars} className='holiday-bunting-star' />
		<path d={pleats} className='holiday-bunting-pleat' />
	</svg>
);

const holidayBunting = () => (
	<div className='holiday-bunting' aria-hidden='true'>
		{Array.from({ length: fanCount }, (_, i) => <Fan key={i} />)}
	</div>
);

export default holidayBunting;
