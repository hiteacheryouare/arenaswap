export const bpm = 128;
export const beatSeconds = 60 / bpm;
export const barSeconds = beatSeconds * 4;
export const fps = 60;

export const bar = (number: number) => (number - 1) * barSeconds;
export const beats = (count: number) => count * beatSeconds;

export const musicBpm = 96;
export const musicBeats = (count: number) => count * 60 / musicBpm;

export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;

export const progress = (t: number, from: number, to: number) => (to === from ? (t >= to ? 1 : 0) : clamp((t - from) / (to - from)));

const sample = (a1: number, a2: number, t: number) => ((1 - 3 * a2 + 3 * a1) * t + (3 * a2 - 6 * a1)) * t * t + 3 * a1 * t;
const slope = (a1: number, a2: number, t: number) => 3 * (1 - 3 * a2 + 3 * a1) * t * t + 2 * (3 * a2 - 6 * a1) * t + 3 * a1;

const cubicBezier = (x1: number, y1: number, x2: number, y2: number) => (
	(x: number) => {
		if (x <= 0) return 0;
		if (x >= 1) return 1;
		let t = x;
		for (let step = 0; step < 8; step++) {
			const error = sample(x1, x2, t) - x;
			const derivative = slope(x1, x2, t);
			if (Math.abs(error) < 1e-6 || derivative === 0) break;
			t -= error / derivative;
		}
		return sample(y1, y2, t);
	}
);

export const easeSignature = cubicBezier(0.22, 1, 0.36, 1);
export const easeInOut = cubicBezier(0.65, 0, 0.35, 1);
export const easeIn = cubicBezier(0.55, 0, 1, 0.45);
export const easeOut = cubicBezier(0, 0, 0.58, 1);
export const easeStandard = cubicBezier(0.4, 0, 0.2, 1);

export const spring = (t: number, duration: number) => {
	if (t <= 0) return 0;
	const omega = (2 * Math.PI) / duration;
	return 1 - (1 + omega * t) * Math.exp(-omega * t);
};

export const window01 = (t: number, from: number, to: number, edge: number) => (
	Math.min(easeSignature(progress(t, from, from + edge)), 1 - easeIn(progress(t, to - edge, to)))
);
