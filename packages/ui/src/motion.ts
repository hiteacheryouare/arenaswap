export const motionDuration = {
	instant: 100,
	snap: 140,
	quick: 180,
	base: 240,
	slow: 400,
	deliberate: 700,
	epic: 1000,
} as const;

export const motionLoop = {
	urgent: 500,
	pulse: 1500,
	ambient: 3000,
} as const;

// ECharts takes an easing by name and has no cubic-bezier input, so the signature curve is named
// rather than spelled: `cubic-bezier(0.22, 1, 0.36, 1)` is the usual approximation of a quintic
// ease-out, and `quinticOut` is the closest thing ECharts draws to it.
export const chartEasing = 'quinticOut';

export const motionEase = 'cubic-bezier(0.22, 1, 0.36, 1)';

export const prefersReducedMotion = (): boolean => (
	typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
);

export default motionDuration;
