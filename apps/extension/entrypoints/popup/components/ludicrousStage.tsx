import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { useLudicrousCanvas } from './ludicrousCanvasLoop';
import { makeStars } from './ludicrousPainters';
import { isTunnelPhase, paintSpace, type World } from './ludicrousSpace';
import { cockpitWindowRect, paintCockpitConsole, paintCockpitMullions, traceCockpitWindow } from './ludicrousCockpit';
import { paintStern, sternRecede } from './ludicrousRear';
import type { Phase, View } from './ludicrousScript';

const numStars = 210;

const entryMs = 1750;

const prewarmFrames = 10;

interface StageProps {
	viewRef: MutableRefObject<View>;
	phaseRef: MutableRefObject<Phase>;
	speedRef: MutableRefObject<number>;
	logosRef: MutableRefObject<boolean>;
	brakeArmed: boolean;
	brakePulled: boolean;
	logoImages: HTMLImageElement[];
	onMeasure: (w: number, h: number) => void;
}

const ludicrousStage = ({
	viewRef,
	phaseRef,
	speedRef,
	logosRef,
	brakeArmed,
	brakePulled,
	logoImages,
	onMeasure,
}: StageProps) => {
	const worldRef = useRef<World>({
		stars: makeStars(numStars),
		logos: [],
		logoCursor: 0,
		travel: 0,
		entry: 0,
	});

	const lastViewRef = useRef<View | null>(null);
	const lastPhaseRef = useRef<Phase | null>(null);
	const phaseStartRef = useRef(0);
	const phaseStartMsRef = useRef(0);
	const sternRecedeRef = useRef(0);

	const canvasRef = useLudicrousCanvas((ctx, { w, h, speed, phase, frame }) => {
		const world = worldRef.current;
		const view = viewRef.current;
		const now = performance.now();

		if (lastPhaseRef.current !== phase) {
			lastPhaseRef.current = phase;
			phaseStartRef.current = frame;
			phaseStartMsRef.current = now;
		}

		const cut = lastViewRef.current !== view;
		if (cut) {
			lastViewRef.current = view;
			ctx.fillStyle = '#000';
			ctx.fillRect(0, 0, w, h);
			for (const logo of world.logos) {
				logo.sx = null;
				logo.sy = null;
			}
		}

		if (phase === 'plaidentry') {
			world.entry = Math.min(1, (now - phaseStartMsRef.current) / entryMs);
		} else if (phase === 'plaid' || phase === 'panic') {
			world.entry = 1;
		} else {
			world.entry = 0;
		}
		if (isTunnelPhase(phase)) world.travel += speed * 0.0075 * (1 + world.entry * 1.6);

		const spaceFrame = { speed, phase, frame, logosOn: logosRef.current, logoImages };

		if (view === 'cockpit') {
			const win = cockpitWindowRect(w, h);
			ctx.fillStyle = '#0a0b0c';
			ctx.fillRect(0, 0, w, h);

			ctx.save();
			traceCockpitWindow(ctx, win);
			ctx.clip();
			if (!isTunnelPhase(phase)) {
				ctx.fillStyle = '#000';
				ctx.fillRect(win.x, win.y, win.w, win.h);
			}
			paintSpace(ctx, win, world, spaceFrame, { spread: 0.95, widthScale: 0.7 });
			ctx.restore();

			paintCockpitMullions(ctx, win);
			paintCockpitConsole(ctx, w, h, phase, frame - phaseStartRef.current, brakeArmed, brakePulled);
			return;
		}

		const full = { x: 0, y: 0, w, h };
		const options = view === 'rear' ? { spread: 1.1 } : {};
		const streaking = speed > 1 && phase !== 'plaid' && phase !== 'panic';
		if (cut && streaking) {
			const rewind = speed * 0.007 * prewarmFrames;
			for (const star of world.stars) star.z += rewind;
			for (let i = 0; i < prewarmFrames; i += 1) {
				paintSpace(ctx, full, world, { ...spaceFrame, logosOn: false }, options);
			}
		}
		paintSpace(ctx, full, world, spaceFrame, options);

		if (view === 'rear') {
			sternRecedeRef.current = Math.max(sternRecedeRef.current, sternRecede(speed));
			const braking = phase === 'stopping' ? frame - phaseStartRef.current : null;
			paintStern(ctx, w, h, { recede: sternRecedeRef.current, speed, braking });
		}
	}, { phaseRef, speedRef });

	useEffect(() => {
		const canvas = canvasRef.current;
		if (canvas) onMeasure(canvas.clientWidth, canvas.clientHeight);
	}, [canvasRef, onMeasure]);

	return <canvas ref={canvasRef} className='ls-canvas' />;
};

export default ludicrousStage;
