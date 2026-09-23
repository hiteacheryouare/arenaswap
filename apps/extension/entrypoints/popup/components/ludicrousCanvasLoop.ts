import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { Phase } from './ludicrousScript';

export interface FrameState {
	w: number;
	h: number;
	speed: number;
	phase: Phase;
	frame: number;
}

interface LoopOptions {
	phaseRef: MutableRefObject<Phase>;
	speedRef: MutableRefObject<number>;
}

export const useLudicrousCanvas = (
	draw: (ctx: CanvasRenderingContext2D, state: FrameState) => void,
	{ phaseRef, speedRef }: LoopOptions,
) => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const drawRef = useRef(draw);

	useEffect(() => {
		drawRef.current = draw;
	});

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const w = canvas.clientWidth;
		const h = canvas.clientHeight;
		canvas.width = Math.round(w * dpr);
		canvas.height = Math.round(h * dpr);
		ctx.scale(dpr, dpr);

		ctx.fillStyle = '#000';
		ctx.fillRect(0, 0, w, h);

		let raf = 0;
		let frame = 0;
		let current = speedRef.current;

		const step = () => {
			const phase = phaseRef.current;
			// Slower coming down than going up. The ship has to be seen to come off its speed.
			const lerp = phase === 'stopping' ? 0.028 : 0.04;
			current += (speedRef.current - current) * lerp;

			drawRef.current(ctx, { w, h, speed: current, phase, frame });
			frame += 1;

			// Parks the loop once nothing is moving. Closing is the script's job, not this one's.
			if (phase === 'stopping' && current < 0.006) return;
			raf = requestAnimationFrame(step);
		};

		raf = requestAnimationFrame(step);
		return () => cancelAnimationFrame(raf);
	}, [phaseRef, speedRef]);

	return canvasRef;
};
