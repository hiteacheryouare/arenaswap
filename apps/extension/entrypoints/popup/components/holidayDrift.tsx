import { useEffect, useRef } from 'react';
import type { fallingKind } from '../../../utils/holidayDecorations';

interface holidayDriftProps {
	kind: fallingKind;
	// 0 to 1, from the resolver.
	depth: number;
}

const maxDriftPx = 96;
const driftWidth = 320;

const leafColors = ['#c2571a', '#d98324', '#a33b12', '#e0a539', '#6d3009', '#8f4b16', '#b8860b', '#94340f'];

// Deterministic, so the pile does not reshuffle itself every time the poll re-renders the screen.
const pseudoRandom = (seed: number): number => {
	const x = Math.sin(seed * 12.9898) * 43758.5453;
	return x - Math.floor(x);
};

// A crown of overlapping lumps rather than a single curve. Real drifts are piled, not poured, and a
// smooth sine reads as a gradient with a wavy edge instead of as snow.
const drawSnowDrift = (ctx: CanvasRenderingContext2D, width: number, height: number, driftHeight: number) => {
	const baseY = height - driftHeight;
	const lumps = 9;

	ctx.save();
	ctx.beginPath();
	ctx.moveTo(-4, height + 4);
	ctx.lineTo(-4, baseY + driftHeight * 0.5);
	for (let i = 0; i <= lumps; i += 1) {
		const x = (width / lumps) * i;
		const lift = 0.45 + pseudoRandom(i * 3.1) * 0.55;
		const y = baseY + driftHeight * (1 - lift) * 0.85;
		const controlX = x - width / lumps / 2;
		const controlY = y - driftHeight * 0.22;
		if (i === 0) ctx.lineTo(x, y);
		else ctx.quadraticCurveTo(controlX, controlY, x, y);
	}
	ctx.lineTo(width + 4, height + 4);
	ctx.closePath();

	// Bright along the crown, cooling into blue shadow at the foot. Snow is lit from above and its
	// shadows are blue, which is the whole reason a white gradient reads as fog instead.
	const body = ctx.createLinearGradient(0, baseY, 0, height);
	body.addColorStop(0, '#ffffff');
	body.addColorStop(0.45, '#eef5fd');
	body.addColorStop(1, '#c3d4e8');
	ctx.fillStyle = body;
	ctx.fill();

	// Contour shadows inside the pile so the lumps read as volume rather than as one flat shape.
	ctx.clip();
	ctx.globalAlpha = 0.5;
	ctx.strokeStyle = '#a8bcd4';
	ctx.lineWidth = 1.4;
	for (let i = 0; i < 5; i += 1) {
		const startX = pseudoRandom(i * 7.7) * width;
		const y = baseY + driftHeight * (0.35 + pseudoRandom(i * 2.3) * 0.5);
		ctx.beginPath();
		ctx.moveTo(startX - 34, y + 12);
		ctx.quadraticCurveTo(startX, y - 8, startX + 34, y + 12);
		ctx.stroke();
	}
	ctx.restore();
};

// A leaf, from its stem. Two arcs and a midrib: without the rib a shape this size is an almond,
// and a heap of almonds is the mush this replaces.
const drawLeaf = (ctx: CanvasRenderingContext2D, size: number, color: string) => {
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.moveTo(0, -size);
	ctx.quadraticCurveTo(size * 0.72, -size * 0.15, 0, size);
	ctx.quadraticCurveTo(-size * 0.72, -size * 0.15, 0, -size);
	ctx.closePath();
	ctx.fill();

	ctx.strokeStyle = 'rgba(48, 20, 4, 0.55)';
	ctx.lineWidth = 0.7;
	ctx.beginPath();
	ctx.moveTo(0, -size * 0.88);
	ctx.lineTo(0, size * 0.88);
	ctx.stroke();

	// Two ribs off the midrib, which is what stops a fallen leaf reading as a petal.
	ctx.lineWidth = 0.5;
	ctx.beginPath();
	ctx.moveTo(0, -size * 0.1);
	ctx.lineTo(size * 0.38, size * 0.3);
	ctx.moveTo(0, -size * 0.1);
	ctx.lineTo(-size * 0.38, size * 0.3);
	ctx.stroke();
};

// The pile is made of leaves and nothing else. There is no mound underneath: the shape comes from
// where the leaves are, and the gaps between them are the popup's own background rather than a
// brown wash standing in for depth.
const drawLeafDrift = (ctx: CanvasRenderingContext2D, width: number, height: number, driftHeight: number) => {
	const leafCount = Math.max(40, Math.round(driftHeight * 9));
	const placed: { x: number; y: number; up: number; size: number; angle: number; color: string }[] = [];

	for (let i = 0; i < leafCount; i += 1) {
		const seed = i * 37 + 11;
		const x = pseudoRandom(seed * 1.7) * (width + 26) - 13;
		// Mounded: deepest down the middle, thinning towards both edges the way a swept heap does.
		const profile = 0.58 + 0.42 * Math.cos((x / width - 0.5) * Math.PI);
		// Squared, so the leaves pack solid along the floor and thin out towards the top edge. A
		// uniform spread reads as leaves scattered on the ground rather than piled on it.
		const up = pseudoRandom(seed * 5.3) ** 2 * driftHeight * profile;
		placed.push({
			x,
			y: height - up,
			up,
			size: 4.2 + pseudoRandom(seed * 9.1) * 3.4,
			angle: pseudoRandom(seed * 4.4) * Math.PI * 2,
			color: leafColors[i % leafColors.length]!,
		});
	}

	// Highest first, so the ones nearer the front of the heap are drawn over the ones behind them.
	placed.sort((a, b) => a.y - b.y);

	for (const leaf of placed) {
		ctx.save();
		ctx.translate(leaf.x, leaf.y);
		ctx.rotate(leaf.angle);
		drawLeaf(ctx, leaf.size, leaf.color);
		ctx.restore();
	}

	// The deepest part of the heap is in its own shadow. Drawn over the leaves rather than under
	// them, so it darkens the pile instead of showing through its gaps as a brown field.
	const shade = ctx.createLinearGradient(0, height - driftHeight * 0.55, 0, height);
	shade.addColorStop(0, 'rgba(24, 11, 3, 0)');
	shade.addColorStop(1, 'rgba(24, 11, 3, 0.45)');
	ctx.fillStyle = shade;
	ctx.fillRect(0, height - driftHeight * 0.55, width, driftHeight * 0.55);
};

const holidayDrift = ({ kind, depth }: holidayDriftProps) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const ratio = window.devicePixelRatio || 1;
		const width = canvas.clientWidth || driftWidth;
		const height = canvas.clientHeight || maxDriftPx;
		canvas.width = Math.round(width * ratio);
		canvas.height = Math.round(height * ratio);
		ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
		ctx.clearRect(0, 0, width, height);

		const driftHeight = maxDriftPx * depth;
		if (driftHeight <= 0) return;
		if (kind === 'snow') drawSnowDrift(ctx, width, height, driftHeight);
		else drawLeafDrift(ctx, width, height, driftHeight);
	}, [kind, depth]);

	if (depth <= 0) return null;
	return <canvas ref={canvasRef} className='holiday-drift' aria-hidden='true' />;
};

export default holidayDrift;
