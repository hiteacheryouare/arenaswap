import { useEffect, useRef, useState } from 'react';
import { motionDuration } from '../motion';

// The quintic ease-out that `cubic-bezier(0.22, 1, 0.36, 1)` approximates.
const easeOut = (progress: number) => 1 - (1 - progress) ** 5;

const prefersReducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// Counts from the number on screen to `target` whenever it changes. The first render shows `target`.
const useCountTo = (target: number, duration: number = motionDuration.slow): number => {
	const [shown, setShown] = useState(target);
	const shownRef = useRef(target);
	const still = prefersReducedMotion();

	useEffect(() => {
		const from = shownRef.current;
		if (from === target) return;
		if (still) {
			shownRef.current = target;
			return;
		}

		let frame = 0;
		let start: number | null = null;
		const step = (now: number) => {
			start ??= now;
			const progress = Math.min((now - start) / duration, 1);
			const value = progress === 1 ? target : Math.round(from + (target - from) * easeOut(progress));
			shownRef.current = value;
			setShown(value);
			if (progress < 1) frame = requestAnimationFrame(step);
		};
		frame = requestAnimationFrame(step);
		return () => cancelAnimationFrame(frame);
	}, [target, duration, still]);

	return still ? target : shown;
};

export default useCountTo;
