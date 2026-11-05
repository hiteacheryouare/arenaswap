import { useEffect, useRef } from 'react';
import type { fallingKind } from '../../../utils/holidayDecorations';
import type { ResolvedTheme } from '@arenaswap/core/types';
import { drawLeaf, leafPalette, leafShadow, leafShapeCount, leafSunlight, mixColor } from './leafArt';

interface holidayDriftProps {
	kind: fallingKind;
	// 0 to 1, from the resolver.
	depth: number;
	theme?: ResolvedTheme;
}

// Crown, middle and foot of the pile, then the contour lines. A white crown vanishes into a white
// page, so light starts at pale frost and ends in the same blue-grey the falling flakes use there.
const snowTones: Record<ResolvedTheme, [string, string, string, string]> = {
	dark: ['#ffffff', '#eef5fd', '#c3d4e8', '#a8bcd4'],
	light: ['#e4ecf5', '#c9d7e6', '#9fb3c8', '#8ea3bb'],
};

const maxDriftPx = 96;
const driftWidth = 320;

// Deterministic, so the pile does not reshuffle itself every time the poll re-renders the screen.
const pseudoRandom = (seed: number): number => {
	const x = Math.sin(seed * 12.9898) * 43758.5453;
	return x - Math.floor(x);
};

// A crown of overlapping lumps rather than a single curve. Real drifts are piled, not poured, and a
// smooth sine reads as a gradient with a wavy edge instead of as snow.
const drawSnowDrift = (ctx: CanvasRenderingContext2D, width: number, height: number, driftHeight: number, theme: ResolvedTheme) => {
	const [crown, middle, foot, contour] = snowTones[theme];
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
	body.addColorStop(0, crown);
	body.addColorStop(0.45, middle);
	body.addColorStop(1, foot);
	ctx.fillStyle = body;
	ctx.fill();

	// Contour shadows inside the pile so the lumps read as volume rather than as one flat shape.
	ctx.clip();
	ctx.globalAlpha = 0.5;
	ctx.strokeStyle = contour;
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

// A raked heap: one big pile a little right of centre, a smaller spill on the left, and a low bank
// running out to both edges. Returns how high the top of the pile is, as a share of driftHeight.
const leafHeapProfile = (across: number): number => {
	const heap = Math.exp(-(((across - 0.52) / 0.3) ** 2));
	const spill = 0.42 * Math.exp(-(((across - 0.1) / 0.18) ** 2));
	const ripple = 0.025 * Math.sin(across * 41) + 0.02 * Math.sin(across * 83 + 1.3);
	return 0.26 + 0.62 * (heap + spill * (1 - heap)) + ripple;
};

// A solid brown mound first, so whatever shows between the leaves reads as shadow inside the pile
// rather than the page behind it. Leaves deeper in are darker, the crown along the top is sunlit.
const drawLeafDrift = (ctx: CanvasRenderingContext2D, width: number, height: number, driftHeight: number) => {
	const surfaceAt = (x: number) => height - driftHeight * leafHeapProfile(x / width);

	const traceMound = () => {
		ctx.beginPath();
		ctx.moveTo(-2, height + 2);
		for (let x = -2; x <= width + 2; x += 4) ctx.lineTo(x, surfaceAt(x) + 3);
		ctx.lineTo(width + 2, height + 2);
		ctx.closePath();
	};
	const inside = ctx.createLinearGradient(0, height - driftHeight, 0, height);
	inside.addColorStop(0, '#83401a');
	inside.addColorStop(1, '#2c1306');
	ctx.fillStyle = inside;
	traceMound();
	ctx.fill();

	const leaves: { x: number; y: number; depthIn: number; seed: number }[] = [];
	const bodyCount = Math.round((width * driftHeight * 0.62) / 13);
	for (let i = 0; i < bodyCount; i += 1) {
		const seed = i * 37 + 11;
		const x = pseudoRandom(seed * 1.7) * (width + 16) - 8;
		const surface = surfaceAt(x);
		const depthIn = pseudoRandom(seed * 5.3) ** 0.8;
		leaves.push({ x, y: surface + depthIn * (height - surface + 4), depthIn, seed });
	}
	const crownCount = Math.round(width / 3.2);
	for (let i = 0; i < crownCount; i += 1) {
		const seed = i * 53 + 7;
		const x = (i / crownCount) * (width + 12) - 6 + pseudoRandom(seed) * 3;
		leaves.push({ x, y: surfaceAt(x) + pseudoRandom(seed * 2.9) * 5 - 1, depthIn: 0, seed });
	}

	for (const leaf of leaves) {
		const seed = leaf.seed;
		const hue = leafPalette[Math.floor(pseudoRandom(seed * 3.3) * leafPalette.length)]!;
		const lift = (pseudoRandom(seed * 6.1) - 0.5) * 0.3;
		const shade = Math.min(0.65, Math.max(0, leaf.depthIn ** 1.8 * 0.58 - lift));
		const lit = leaf.depthIn < 0.15 ? mixColor(hue, leafSunlight, 0.14) : hue;
		drawLeaf(ctx, {
			x: leaf.x,
			y: leaf.y,
			size: 4.4 + pseudoRandom(seed * 9.1) * 3.8,
			tilt: 0.5 + pseudoRandom(seed * 2.2) * 0.5,
			angle: pseudoRandom(seed * 4.4) * Math.PI * 2,
			shape: Math.floor(pseudoRandom(seed * 8.8) * leafShapeCount),
			curl: pseudoRandom(seed * 7.7) - 0.5,
			color: mixColor(lit, leafShadow, shade),
		});
	}

	ctx.save();
	traceMound();
	ctx.clip();
	const floor = ctx.createLinearGradient(0, height - 14, 0, height);
	floor.addColorStop(0, 'rgba(20, 8, 2, 0)');
	floor.addColorStop(1, 'rgba(20, 8, 2, 0.5)');
	ctx.fillStyle = floor;
	ctx.fillRect(0, height - 14, width, 14);
	ctx.restore();
};

const holidayDrift = ({ kind, depth, theme = 'dark' }: holidayDriftProps) => {
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
		if (kind === 'snow') drawSnowDrift(ctx, width, height, driftHeight, theme);
		else drawLeafDrift(ctx, width, height, driftHeight);
	}, [kind, depth, theme]);

	if (depth <= 0) return null;
	return <canvas ref={canvasRef} className='holiday-drift' aria-hidden='true' />;
};

export default holidayDrift;
