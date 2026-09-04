import { useEffect, useRef } from 'react';
import type { fallingKind } from '../../../utils/holidayDecorations';

interface holidayDriftProps {
	kind: fallingKind;
	// 0 to 1, from the resolver.
	depth: number;
}

const maxDriftPx = 96;
const driftWidth = 320;

const leafColors = ['#c2571a', '#d98324', '#a33b12', '#e0a539', '#7d3b0e', '#8f4b16'];

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

const drawLeaf = (ctx: CanvasRenderingContext2D, size: number, color: string) => {
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.moveTo(0, -size);
	ctx.quadraticCurveTo(size * 0.78, -size * 0.2, 0, size);
	ctx.quadraticCurveTo(-size * 0.78, -size * 0.2, 0, -size);
	ctx.closePath();
	ctx.fill();

	// The midrib. Without it a leaf at this size is an almond, and a pile of almonds is a pile of mush.
	ctx.strokeStyle = 'rgba(60, 26, 6, 0.45)';
	ctx.lineWidth = 0.7;
	ctx.beginPath();
	ctx.moveTo(0, -size * 0.85);
	ctx.lineTo(0, size * 0.85);
	ctx.stroke();
};

// A pile of leaves is leaves. The only thing under them is a shadow deep enough that the gaps do
// not show the page through.
const drawLeafDrift = (ctx: CanvasRenderingContext2D, width: number, height: number, driftHeight: number) => {
	const baseY = height - driftHeight;

	ctx.save();
	ctx.fillStyle = 'rgba(46, 22, 8, 0.82)';
	ctx.beginPath();
	ctx.moveTo(-4, height + 4);
	ctx.lineTo(-4, baseY + driftHeight * 0.55);
	for (let x = 0; x <= width; x += 8) {
		const ripple = Math.sin(x / 41) * 0.5 + Math.sin(x / 17 + 1.4) * 0.3;
		ctx.lineTo(x, baseY + driftHeight * (0.28 - 0.16 * ripple));
	}
	ctx.lineTo(width + 4, height + 4);
	ctx.closePath();
	ctx.fill();
	ctx.restore();

	// Back to front, so the near leaves overlap the far ones and the pile has a front face.
	const leafCount = Math.max(14, Math.round(driftHeight * 1.9));
	for (let i = 0; i < leafCount; i += 1) {
		const depthRatio = i / leafCount;
		const x = pseudoRandom(i * 1.7) * (width + 20) - 10;
		const spread = 0.18 + pseudoRandom(i * 5.3) * 0.82;
		const y = height - driftHeight * spread * (0.35 + depthRatio * 0.75);
		const size = 4.4 + pseudoRandom(i * 9.1) * 3.6;

		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(pseudoRandom(i * 4.4) * Math.PI * 2);
		// Far leaves sit in the shade of the ones in front of them.
		ctx.globalAlpha = 0.72 + depthRatio * 0.28;
		drawLeaf(ctx, size, leafColors[i % leafColors.length]!);
		ctx.restore();
	}
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
