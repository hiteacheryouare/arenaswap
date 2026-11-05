export type rgbColor = [number, number, number];

export const leafPalette: rgbColor[] = [
	[198, 56, 24], [216, 84, 28], [234, 124, 34], [242, 164, 46], [230, 192, 74],
	[172, 40, 30], [152, 80, 30], [204, 112, 46], [222, 100, 30],
];

export const leafShadow: rgbColor = [38, 15, 5];
export const leafSunlight: rgbColor = [255, 226, 160];

export const mixColor = (from: rgbColor, to: rgbColor, amount: number): rgbColor => [
	Math.round(from[0] + (to[0] - from[0]) * amount),
	Math.round(from[1] + (to[1] - from[1]) * amount),
	Math.round(from[2] + (to[2] - from[2]) * amount),
];

const mirroredOutline = (rightHalf: [number, number][]): Path2D => {
	const path = new Path2D();
	for (const [x, y] of rightHalf) path.lineTo(x, y);
	for (const [x, y] of rightHalf.toReversed()) path.lineTo(-x, y);
	path.closePath();
	return path;
};

// Traced around a radius that varies with the angle from the tip, so the lobes come from the
// radius function rather than from hand-placed points.
const polarOutline = (radius: (theta: number) => number, xScale: number): Path2D => {
	const path = new Path2D();
	const steps = 40;
	for (let i = 0; i <= steps; i += 1) {
		const theta = (i / steps) * Math.PI * 2;
		const r = radius(theta);
		path.lineTo(Math.sin(theta) * r * xScale, -Math.cos(theta) * r);
	}
	path.closePath();
	return path;
};

// Unit size, tip at y = -1 and stem at y = +1. Built on first use because Path2D only exists in
// a browser, and maple is listed twice so it is the most common leaf in the pile.
let shapes: Path2D[] | null = null;
const leafShapes = (): Path2D[] => {
	if (shapes) return shapes;
	const maple = mirroredOutline([
		[0, -1], [0.14, -0.7], [0.28, -0.74], [0.22, -0.4], [0.56, -0.6], [0.94, -0.54],
		[0.72, -0.24], [0.84, -0.08], [0.44, 0.04], [0.6, 0.34], [0.3, 0.3], [0.06, 0.5], [0.05, 1.05],
	]);
	const oak = polarOutline((theta) => 0.7 + 0.3 * Math.abs(Math.cos(theta * 3.5)) ** 0.55, 0.6);
	const aspen = polarOutline((theta) => 1 - 0.34 * Math.abs(Math.sin(theta)) - 0.14 * Math.sin(theta / 2) ** 8, 0.62);
	shapes = [maple, maple, oak, aspen];
	return shapes;
};

export const leafShapeCount = 4;

export interface leafStroke {
	x: number;
	y: number;
	size: number;
	// 1 is face-on, smaller is the leaf tipped away from the viewer.
	tilt: number;
	angle: number;
	shape: number;
	// Which half of the leaf sits in its own shadow: negative is the left.
	curl: number;
	color: rgbColor;
}

export const drawLeaf = (ctx: CanvasRenderingContext2D, leaf: leafStroke) => {
	const outline = leafShapes()[leaf.shape]!;
	ctx.save();
	ctx.translate(leaf.x, leaf.y);
	ctx.rotate(leaf.angle);
	ctx.scale(leaf.size, leaf.size * leaf.tilt);
	ctx.fillStyle = `rgb(${leaf.color[0]}, ${leaf.color[1]}, ${leaf.color[2]})`;
	ctx.fill(outline);

	ctx.save();
	ctx.clip(outline);
	ctx.fillStyle = 'rgba(40, 12, 2, 0.24)';
	ctx.fillRect(leaf.curl > 0 ? 0 : -1.2, -1.2, 1.2, 2.4);
	ctx.restore();

	ctx.lineWidth = 0.7 / leaf.size;
	ctx.strokeStyle = 'rgba(36, 12, 2, 0.4)';
	ctx.stroke(outline);
	ctx.beginPath();
	ctx.moveTo(0, 0.9);
	ctx.lineTo(0, -0.75);
	ctx.strokeStyle = 'rgba(60, 20, 4, 0.4)';
	ctx.stroke();
	ctx.restore();
};
