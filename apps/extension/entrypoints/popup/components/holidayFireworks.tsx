import { useEffect, useRef } from 'react';
import type { scoringBurst } from '../../../utils/favoriteScoreFlash';

export interface fireworkVolley {
	id: number;
	bursts: scoringBurst[];
}

interface holidayFireworksProps {
	volley: fireworkVolley | null;
}

interface rocket {
	x: number;
	y: number;
	peakY: number;
	speed: number;
	colors: string[];
	launchAt: number;
}

interface spark {
	x: number;
	y: number;
	previousX: number;
	previousY: number;
	velocityX: number;
	velocityY: number;
	life: number;
	maxLife: number;
	color: string;
}

const sparksPerBurst = 34;
const launchGapMs = 380;
const gravity = 0.035;
const drag = 0.975;

const randomBetween = (min: number, max: number): number => min + Math.random() * (max - min);

// A navy or a forest green bursts invisibly on a dark hero, so every colour keeps its hue and is
// lifted to firework brightness.
export const fireworkColor = (hex: string): string => {
	const value = Number.parseInt(hex.replace('#', ''), 16);
	const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map(channel => channel / 255) as [number, number, number];
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const delta = max - min;
	if (delta === 0) return 'hsl(0 0% 92%)';
	const hue = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
	return `hsl(${Math.round(((hue * 60) + 360) % 360)} 90% 68%)`;
};

// Over the scorebug rather than the window. Idle until a run scores, and stops drawing the moment
// the last spark burns out.
const holidayFireworks = ({ volley }: holidayFireworksProps) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const rockets = useRef<rocket[]>([]);
	const sparks = useRef<spark[]>([]);
	const animationId = useRef(0);

	useEffect(() => () => cancelAnimationFrame(animationId.current), []);

	useEffect(() => {
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext('2d');
		if (!volley || !canvas || !ctx) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		const ratio = window.devicePixelRatio || 1;
		const width = canvas.clientWidth;
		const height = canvas.clientHeight;
		canvas.width = Math.round(width * ratio);
		canvas.height = Math.round(height * ratio);
		ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

		let nextLaunch = Math.max(performance.now(), ...rockets.current.map(r => r.launchAt + launchGapMs));
		volley.bursts
			.flatMap(burst => Array.from({ length: burst.count }, () => burst.colors))
			.forEach(colors => {
				rockets.current.push({
					x: randomBetween(width * 0.2, width * 0.8),
					y: height,
					peakY: randomBetween(height * 0.18, height * 0.42),
					speed: randomBetween(3.4, 4.4),
					colors: colors.map(fireworkColor),
					launchAt: nextLaunch,
				});
				nextLaunch += launchGapMs;
			});

		const explode = (from: rocket) => {
			for (let i = 0; i < sparksPerBurst; i += 1) {
				const angle = (Math.PI * 2 * i) / sparksPerBurst + randomBetween(-0.08, 0.08);
				const speed = randomBetween(1.1, 2.5);
				const maxLife = randomBetween(42, 64);
				sparks.current.push({
					x: from.x,
					y: from.peakY,
					previousX: from.x,
					previousY: from.peakY,
					velocityX: Math.cos(angle) * speed,
					velocityY: Math.sin(angle) * speed,
					life: maxLife,
					maxLife,
					color: from.colors[i % from.colors.length]!,
				});
			}
		};

		const tick = (time: number) => {
			ctx.clearRect(0, 0, width, height);
			ctx.lineCap = 'round';

			rockets.current = rockets.current.filter(r => {
				if (time < r.launchAt) return true;
				r.y -= r.speed;
				ctx.strokeStyle = 'rgba(255, 236, 200, 0.85)';
				ctx.lineWidth = 1.4;
				ctx.beginPath();
				ctx.moveTo(r.x, r.y);
				ctx.lineTo(r.x, r.y + 7);
				ctx.stroke();
				if (r.y > r.peakY) return true;
				explode(r);
				return false;
			});

			sparks.current = sparks.current.filter(s => {
				s.previousX = s.x;
				s.previousY = s.y;
				s.velocityX *= drag;
				s.velocityY = s.velocityY * drag + gravity;
				s.x += s.velocityX;
				s.y += s.velocityY;
				s.life -= 1;
				ctx.globalAlpha = Math.max(0, s.life / s.maxLife);
				ctx.strokeStyle = s.color;
				ctx.shadowColor = s.color;
				ctx.shadowBlur = 4;
				ctx.lineWidth = 1.8;
				ctx.beginPath();
				ctx.moveTo(s.previousX, s.previousY);
				ctx.lineTo(s.x, s.y);
				ctx.stroke();
				return s.life > 0;
			});
			ctx.globalAlpha = 1;
			ctx.shadowBlur = 0;

			animationId.current = rockets.current.length + sparks.current.length > 0 ? requestAnimationFrame(tick) : 0;
		};

		cancelAnimationFrame(animationId.current);
		animationId.current = requestAnimationFrame(tick);
	}, [volley]);

	return <canvas ref={canvasRef} className='holiday-fireworks' aria-hidden='true' />;
};

export default holidayFireworks;
