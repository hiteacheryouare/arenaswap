import { useEffect, useRef } from 'react';
import type { fallingKind } from '../../../utils/holidayDecorations';

interface holidayFallProps {
	kind: fallingKind;
	// 0 to 1, from the resolver. Drives how far up the screen the drift reaches.
	depth: number;
}

interface particle {
	x: number;
	y: number;
	size: number;
	fallSpeed: number;
	swayPhase: number;
	swayRange: number;
	spin: number;
	angle: number;
	color: string;
}

const maxDriftPx = 88;
const leafColors = ['#c2571a', '#d98324', '#a33b12', '#e0a539', '#7d3b0e'];

const settings = {
	snow: { count: 70, minSize: 1, maxSize: 2.7, minSpeed: 0.22, maxSpeed: 0.78, swayRange: 12 },
	leaves: { count: 22, minSize: 4.5, maxSize: 8.5, minSpeed: 0.35, maxSpeed: 0.95, swayRange: 26 },
} as const;

const randomBetween = (min: number, max: number): number => min + Math.random() * (max - min);

const makeParticle = (kind: fallingKind, width: number, height: number, atTop: boolean): particle => {
	const config = settings[kind];
	return {
		x: Math.random() * width,
		y: atTop ? -randomBetween(0, height * 0.4) : Math.random() * height,
		size: randomBetween(config.minSize, config.maxSize),
		fallSpeed: randomBetween(config.minSpeed, config.maxSpeed),
		swayPhase: Math.random() * Math.PI * 2,
		swayRange: config.swayRange * randomBetween(0.4, 1),
		spin: randomBetween(-0.03, 0.03),
		angle: Math.random() * Math.PI * 2,
		color: leafColors[Math.floor(Math.random() * leafColors.length)]!,
	};
};

// The mound's top edge. Two sine waves of different wavelengths so it reads as wind-blown rather
// than as a graph of a sine wave.
const driftTopAt = (x: number, height: number, driftHeight: number): number => {
	const ripple = Math.sin(x / 37) * 0.5 + Math.sin(x / 13 + 1.7) * 0.22;
	return height - driftHeight * (0.82 + 0.18 * ripple);
};

const drawLeafShape = (ctx: CanvasRenderingContext2D, size: number) => {
	ctx.beginPath();
	ctx.moveTo(0, -size);
	ctx.quadraticCurveTo(size * 0.75, -size * 0.25, 0, size);
	ctx.quadraticCurveTo(-size * 0.75, -size * 0.25, 0, -size);
	ctx.closePath();
	ctx.fill();
};

const holidayFall = ({ kind, depth }: holidayFallProps) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const depthRef = useRef(depth);
	depthRef.current = depth;

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const ratio = window.devicePixelRatio || 1;
		const width = canvas.clientWidth;
		const height = canvas.clientHeight;
		canvas.width = Math.round(width * ratio);
		canvas.height = Math.round(height * ratio);
		ctx.scale(ratio, ratio);

		const drawDrift = () => {
			const driftHeight = maxDriftPx * depthRef.current;
			if (driftHeight <= 0) return;

			const topY = height - driftHeight;
			const gradient = ctx.createLinearGradient(0, topY, 0, height);
			if (kind === 'snow') {
				gradient.addColorStop(0, 'rgba(233, 244, 255, 0)');
				gradient.addColorStop(0.45, 'rgba(233, 244, 255, 0.62)');
				gradient.addColorStop(1, 'rgba(246, 251, 255, 0.92)');
			} else {
				gradient.addColorStop(0, 'rgba(163, 59, 18, 0)');
				gradient.addColorStop(0.45, 'rgba(178, 78, 25, 0.6)');
				gradient.addColorStop(1, 'rgba(122, 54, 16, 0.92)');
			}

			ctx.fillStyle = gradient;
			ctx.beginPath();
			ctx.moveTo(0, height);
			for (let x = 0; x <= width; x += 4) ctx.lineTo(x, driftTopAt(x, height, driftHeight));
			ctx.lineTo(width, height);
			ctx.closePath();
			ctx.fill();

			// A pile of leaves is individual leaves, so the mound alone reads as mud. Snow needs no
			// equivalent, being exactly as featureless in life as a gradient is on screen.
			if (kind !== 'leaves') return;
			for (let i = 0; i < 26; i += 1) {
				const x = ((i * 61) % Math.max(1, Math.round(width)));
				const y = driftTopAt(x, height, driftHeight) + ((i * 17) % Math.max(1, Math.round(driftHeight)));
				ctx.save();
				ctx.translate(x, y);
				ctx.rotate((i * 1.31) % Math.PI);
				ctx.fillStyle = leafColors[i % leafColors.length]!;
				ctx.globalAlpha = 0.85;
				drawLeafShape(ctx, 5);
				ctx.restore();
			}
		};

		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (reducedMotion) {
			drawDrift();
			return;
		}

		const particles = Array.from({ length: settings[kind].count }, () => makeParticle(kind, width, height, false));
		let frame = 0;
		let animationId = 0;

		const tick = () => {
			ctx.clearRect(0, 0, width, height);
			frame += 1;

			const driftHeight = maxDriftPx * depthRef.current;
			for (const p of particles) {
				p.y += p.fallSpeed;
				p.angle += p.spin;
				const x = p.x + Math.sin(frame / 60 + p.swayPhase) * p.swayRange;
				const landingY = driftHeight > 0 ? driftTopAt(x, height, driftHeight) : height;
				if (p.y > landingY) Object.assign(p, makeParticle(kind, width, height, true));

				if (kind === 'snow') {
					ctx.fillStyle = `rgba(238, 247, 255, ${0.45 + p.size / 6})`;
					ctx.beginPath();
					ctx.arc(x, p.y, p.size, 0, Math.PI * 2);
					ctx.fill();
				} else {
					ctx.save();
					ctx.translate(x, p.y);
					ctx.rotate(p.angle);
					ctx.fillStyle = p.color;
					ctx.globalAlpha = 0.9;
					drawLeafShape(ctx, p.size);
					ctx.restore();
				}
			}

			drawDrift();
			animationId = requestAnimationFrame(tick);
		};

		animationId = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(animationId);
	}, [kind]);

	return <canvas ref={canvasRef} className='holiday-fall' aria-hidden='true' />;
};

export default holidayFall;
