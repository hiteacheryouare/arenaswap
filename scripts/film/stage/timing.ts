// The films are cut to the soundtrack, so time is counted in bars. At 128 BPM a bar is 1.875s and
// 8, 16 and 32 bars come out at exactly 15, 30 and 60 seconds.
export const bpm = 128;
export const beatSeconds = 60 / bpm;
export const barSeconds = beatSeconds * 4;
export const fps = 60;

// Bars are 1-based, like a score: bar 1 starts at 0s.
export const bar = (number: number) => (number - 1) * barSeconds;
export const beats = (count: number) => count * beatSeconds;

// The soundtrack plays at 96 BPM, so three of its beats fill one of our bars and every beat of ours
// lands on one of its sixteenths. Anything the audience hears as a hit sits on its grid.
export const musicBpm = 96;
export const musicBeats = (count: number) => count * 60 / musicBpm;

export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;

// Where `t` sits between `from` and `to`, clamped to 0..1.
export const progress = (t: number, from: number, to: number) => (to === from ? (t >= to ? 1 : 0) : clamp((t - from) / (to - from)));

const sample = (a1: number, a2: number, t: number) => ((1 - 3 * a2 + 3 * a1) * t + (3 * a2 - 6 * a1)) * t * t + 3 * a1 * t;
const slope = (a1: number, a2: number, t: number) => 3 * (1 - 3 * a2 + 3 * a1) * t * t + 2 * (3 * a2 - 6 * a1) * t + 3 * a1;

// The extension's signature curve, cubic-bezier(0.22, 1, 0.36, 1), solved for y at a given x.
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
// Lattice & Company's own curve, which its rosette draws on.
export const easeStandard = cubicBezier(0.4, 0, 0.2, 1);

// A spring with no bounce, in closed form: settles in about `duration` seconds and never overshoots.
export const spring = (t: number, duration: number) => {
	if (t <= 0) return 0;
	const omega = (2 * Math.PI) / duration;
	return 1 - (1 + omega * t) * Math.exp(-omega * t);
};

// 0 → 1 → 0 over a window, with `edge` seconds of fade on each side.
export const window01 = (t: number, from: number, to: number, edge: number) => (
	Math.min(easeSignature(progress(t, from, from + edge)), 1 - easeIn(progress(t, to - edge, to)))
);
