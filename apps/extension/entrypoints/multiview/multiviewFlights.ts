export interface flightPoint {
	x: number;
	y: number;
}

export interface flightArea {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface flightBand extends flightArea {
	along: 'x' | 'y';
	outer: 'top' | 'bottom' | 'left' | 'right';
}

export interface flight {
	id: number;
	path: string;
	dashed: boolean;
	orange: boolean;
	strength: number;
	// Pixels a second, averaged over the draw.
	speed: number;
	// How long the line takes to pull in, as a share of how long it took to draw.
	retract: number;
}

type random = () => number;

// Past the window's edge by more than a head, so a flight starts and ends out of sight.
const offscreen = 40;
const cornerRadius = 8;
const thinnestBand = 60;

const between = (random: random, low: number, high: number) => low + random() * (high - low);
const pickFrom = <T>(random: random, items: readonly T[]) => items[Math.floor(random() * items.length)]!;

const toward = (from: flightPoint, to: flightPoint, distance: number) => {
	const length = Math.hypot(to.x - from.x, to.y - from.y);
	return { x: from.x + (to.x - from.x) * distance / length, y: from.y + (to.y - from.y) * distance / length };
};

const at = ({ x, y }: flightPoint) => `${x.toFixed(1)} ${y.toFixed(1)}`;

// The margins the grid leaves, where a flight can be seen end to end.
export const openBands = (page: flightArea, grid: flightArea | null): flightBand[] => {
	const box = grid ?? { x: page.width / 2, y: page.height / 2, width: 0, height: 0 };
	const bands: flightBand[] = [
		{ x: 0, y: 0, width: page.width, height: box.y, along: 'x', outer: 'top' },
		{ x: 0, y: box.y + box.height, width: page.width, height: page.height - box.y - box.height, along: 'x', outer: 'bottom' },
		{ x: 0, y: 0, width: box.x, height: page.height, along: 'y', outer: 'left' },
		{ x: box.x + box.width, y: 0, width: page.width - box.x - box.width, height: page.height, along: 'y', outer: 'right' },
	];
	return bands.filter(band => Math.min(band.width, band.height) >= thinnestBand);
};

// In from one end of a margin, zigzagging across its depth, and out the far end or the window's edge.
export const marginRun = (band: flightBand, page: flightArea, random: random): flightPoint[] => {
	const turnCount = pickFrom(random, [2, 3, 3, 4]);
	const forwards = random() < 0.5;
	const depth = band.along === 'x' ? band.height : band.width;
	const inset = Math.min(28, depth / 3);
	// Packed into part of the margin's length, so each bend is tight enough to read as a turn.
	const span = between(random, 0.45, 0.75);
	const start = between(random, 0.05, 0.95 - span);
	const startHigh = random() < 0.5;
	const across = (index: number, low: number) => (index % 2 === 0) === startHigh
		? between(random, low + inset, low + depth * 0.38)
		: between(random, low + depth * 0.62, low + depth - inset);

	const turns = Array.from({ length: turnCount }, (_, index) => {
		const share = start + span * (index + between(random, 0.7, 1.3)) / (turnCount + 1);
		const t = forwards ? share : 1 - share;
		return band.along === 'x'
			? { x: band.x + t * band.width, y: across(index, band.y) }
			: { x: across(index, band.x), y: band.y + t * band.height };
	});

	const first = turns[0]!;
	const last = turns[turns.length - 1]!;
	const ahead = forwards ? 1 : -1;
	const entry = band.along === 'x'
		? { x: forwards ? -offscreen : page.width + offscreen, y: first.y + between(random, -40, 40) }
		: { x: first.x + between(random, -40, 40), y: forwards ? -offscreen : page.height + offscreen };
	const outward = random() < 0.3;
	const exit = band.along === 'x'
		? outward
			? { x: last.x + ahead * between(random, 80, 200), y: band.outer === 'top' ? -offscreen : page.height + offscreen }
			: { x: forwards ? page.width + offscreen : -offscreen, y: last.y + between(random, -40, 40) }
		: outward
			? { x: band.outer === 'left' ? -offscreen : page.width + offscreen, y: last.y + ahead * between(random, 80, 200) }
			: { x: last.x + between(random, -40, 40), y: forwards ? page.height + offscreen : -offscreen };
	return [entry, ...turns, exit];
};

const sides = ['left', 'right', 'top', 'bottom'] as const;
const opposite = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' } as const;

// Across the whole window and behind the boxes, from one side to another.
export const crossing = (page: flightArea, random: random): flightPoint[] => {
	const entrySide = pickFrom(random, sides);
	const exitSide = pickFrom(random, [opposite[entrySide], opposite[entrySide], ...sides.filter(side => side !== entrySide && side !== opposite[entrySide])]);
	const edge = (side: typeof sides[number], t: number): flightPoint => ({
		left: { x: -offscreen, y: t * page.height },
		right: { x: page.width + offscreen, y: t * page.height },
		top: { x: t * page.width, y: -offscreen },
		bottom: { x: t * page.width, y: page.height + offscreen },
	})[side];

	const entry = edge(entrySide, between(random, 0.15, 0.85));
	const exit = edge(exitSide, between(random, 0.15, 0.85));
	const length = Math.hypot(exit.x - entry.x, exit.y - entry.y);
	const normal = { x: -(exit.y - entry.y) / length, y: (exit.x - entry.x) / length };
	const swing = Math.min(page.width, page.height) * between(random, 0.14, 0.3);
	const turnCount = pickFrom(random, [2, 3, 3, 4]);
	const flip = random() < 0.5 ? 1 : -1;
	const clamp = (value: number, size: number) => Math.min(size - offscreen, Math.max(offscreen, value));

	const turns = Array.from({ length: turnCount }, (_, index) => {
		const t = (index + 1 + between(random, -0.25, 0.25)) / (turnCount + 1);
		const side = (index % 2 === 0 ? 1 : -1) * flip * between(random, 0.6, 1.2);
		return {
			x: clamp(entry.x + (exit.x - entry.x) * t + normal.x * swing * side, page.width),
			y: clamp(entry.y + (exit.y - entry.y) * t + normal.y * swing * side, page.height),
		};
	});
	return [entry, ...turns, exit];
};

// Straight runs between the turns, each corner rounded just enough for the head to swing round it.
export const angularPath = (points: readonly flightPoint[], radius = cornerRadius): string => {
	let path = `M ${at(points[0]!)}`;
	for (let index = 1; index < points.length - 1; index++) {
		const [before, corner, after] = [points[index - 1]!, points[index]!, points[index + 1]!];
		const r = Math.min(radius, Math.hypot(corner.x - before.x, corner.y - before.y) / 2, Math.hypot(after.x - corner.x, after.y - corner.y) / 2);
		path += ` L ${at(toward(corner, before, r))} Q ${at(corner)} ${at(toward(corner, after, r))}`;
	}
	return `${path} L ${at(points[points.length - 1]!)}`;
};

export default (id: number, page: flightArea, grid: flightArea | null, random: random = Math.random): flight => {
	const bands = openBands(page, grid);
	const points = bands.length && random() < 0.5 ? marginRun(pickFrom(random, bands), page, random) : crossing(page, random);
	return {
		id,
		path: angularPath(points),
		dashed: random() < 0.5,
		orange: random() < 0.2,
		strength: between(random, 0.2, 0.35),
		speed: between(random, 520, 760),
		retract: between(random, 0.6, 0.8),
	};
};
