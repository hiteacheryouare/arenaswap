// Raised cosine: a fade with no corner at either end, so it never clicks.
export const smoothStep = (x: number): number => {
	if (x <= 0) return 0;
	if (x >= 1) return 1;
	return 0.5 - 0.5 * Math.cos(Math.PI * x);
};

export const fadeIn = (time: number, length: number): number => smoothStep(time / length);

export const fadeOut = (time: number, end: number, length: number): number => smoothStep((end - time) / length);

export const gateEnvelope = (time: number, attack: number, gate: number, release: number): number => {
	const opening = fadeIn(time, attack);
	return time < gate ? opening : opening * Math.exp((gate - time) / release);
};

export const lerp = (from: number, to: number, amount: number): number => from + (to - from) * amount;

export interface Keyframe {
	time: number;
	value: number;
}

export interface ControlCurve {
	values: Float32Array;
	step: number;
}

const controlStep = 32;

const valueAt = (keyframes: Keyframe[], time: number, cursor: { index: number }): number => {
	while (cursor.index < keyframes.length - 1 && keyframes[cursor.index + 1].time <= time) cursor.index++;
	const current = keyframes[cursor.index];
	const next = keyframes[cursor.index + 1];
	if (time <= current.time || !next) return current.value;
	return lerp(current.value, next.value, (time - current.time) / (next.time - current.time));
};

// Piecewise-linear automation sampled every 32 samples, then eased with a one-pole so steps glide.
export const renderCurve = (keyframes: Keyframe[], length: number, sampleRate: number, smoothing = 0.02): ControlCurve => {
	const sorted = keyframes.toSorted((a, b) => a.time - b.time);
	const values = new Float32Array(Math.ceil(length / controlStep) + 2);
	if (sorted.length === 0) return { values, step: controlStep };
	const cursor = { index: 0 };
	const coefficient = Math.exp(-controlStep / (smoothing * sampleRate));
	let state = sorted[0].value;
	for (let i = 0; i < values.length; i++) {
		const target = valueAt(sorted, (i * controlStep) / sampleRate, cursor);
		state = target + (state - target) * coefficient;
		values[i] = state;
	}
	return { values, step: controlStep };
};

export const curveAt = (curve: ControlCurve, sampleIndex: number): number => {
	const position = Math.max(0, sampleIndex) / curve.step;
	const index = Math.min(curve.values.length - 2, Math.floor(position));
	return lerp(curve.values[index], curve.values[index + 1], position - index);
};
