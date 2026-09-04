import { useEffect, useRef } from 'react';
import type { fallingKind } from '../../../utils/holidayDecorations';

interface holidayFallProps {
	kind: fallingKind;
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

const drawLeafShape = (ctx: CanvasRenderingContext2D, size: number) => {
	ctx.beginPath();
	ctx.moveTo(0, -size);
	ctx.quadraticCurveTo(size * 0.75, -size * 0.25, 0, size);
	ctx.quadraticCurveTo(-size * 0.75, -size * 0.25, 0, -size);
	ctx.closePath();
	ctx.fill();
};

// Falling only. The pile it lands in lives at the foot of the page in holidayDrift, which is a
// different place in a different coordinate system — this canvas is pinned to the window.
const holidayFall = ({ kind }: holidayFallProps) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		const ratio = window.devicePixelRatio || 1;
		const width = canvas.clientWidth;
		const height = canvas.clientHeight;
		canvas.width = Math.round(width * ratio);
		canvas.height = Math.round(height * ratio);
		ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

		const particles = Array.from({ length: settings[kind].count }, () => makeParticle(kind, width, height, false));
		let frame = 0;
		let animationId = 0;

		const tick = () => {
			ctx.clearRect(0, 0, width, height);
			frame += 1;

			for (const p of particles) {
				p.y += p.fallSpeed;
				p.angle += p.spin;
				const x = p.x + Math.sin(frame / 60 + p.swayPhase) * p.swayRange;
				if (p.y > height + p.size) Object.assign(p, makeParticle(kind, width, height, true));

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

			animationId = requestAnimationFrame(tick);
		};

		animationId = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(animationId);
	}, [kind]);

	return <canvas ref={canvasRef} className='holiday-fall' aria-hidden='true' />;
};

export default holidayFall;
