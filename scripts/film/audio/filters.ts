// Topology-preserving state-variable filter (Simper/Cytomic): stays stable while the cutoff moves.
export interface Svf {
	k: number;
	a1: number;
	a2: number;
	a3: number;
	ic1: number;
	ic2: number;
	low: number;
	band: number;
	high: number;
}

export const createSvf = (): Svf => ({ k: Math.SQRT2, a1: 0, a2: 0, a3: 0, ic1: 0, ic2: 0, low: 0, band: 0, high: 0 });

export const tuneSvf = (svf: Svf, cutoff: number, q: number, sampleRate: number): void => {
	const g = Math.tan(Math.PI * Math.min(Math.max(cutoff, 10), sampleRate * 0.48) / sampleRate);
	svf.k = 1 / q;
	svf.a1 = 1 / (1 + g * (g + svf.k));
	svf.a2 = g * svf.a1;
	svf.a3 = g * svf.a2;
};

export const tickSvf = (svf: Svf, input: number): void => {
	const v3 = input - svf.ic2;
	const v1 = svf.a1 * svf.ic1 + svf.a2 * v3;
	const v2 = svf.ic2 + svf.a2 * svf.ic1 + svf.a3 * v3;
	svf.ic1 = 2 * v1 - svf.ic1;
	svf.ic2 = 2 * v2 - svf.ic2;
	svf.low = v2;
	svf.band = v1;
	svf.high = input - svf.k * v1 - v2;
};

export const createTunedSvf = (cutoff: number, q: number, sampleRate: number): Svf => {
	const svf = createSvf();
	tuneSvf(svf, cutoff, q, sampleRate);
	return svf;
};

export interface Biquad {
	b0: number;
	b1: number;
	b2: number;
	a1: number;
	a2: number;
	z1: number;
	z2: number;
}

const normalise = (b0: number, b1: number, b2: number, a0: number, a1: number, a2: number): Biquad => ({
	b0: b0 / a0,
	b1: b1 / a0,
	b2: b2 / a0,
	a1: a1 / a0,
	a2: a2 / a0,
	z1: 0,
	z2: 0,
});

export const highpassBiquad = (cutoff: number, q: number, sampleRate: number): Biquad => {
	const w0 = 2 * Math.PI * cutoff / sampleRate;
	const cos = Math.cos(w0);
	const alpha = Math.sin(w0) / (2 * q);
	return normalise((1 + cos) / 2, -(1 + cos), (1 + cos) / 2, 1 + alpha, -2 * cos, 1 - alpha);
};

export const lowpassBiquad = (cutoff: number, q: number, sampleRate: number): Biquad => {
	const w0 = 2 * Math.PI * cutoff / sampleRate;
	const cos = Math.cos(w0);
	const alpha = Math.sin(w0) / (2 * q);
	return normalise((1 - cos) / 2, 1 - cos, (1 - cos) / 2, 1 + alpha, -2 * cos, 1 - alpha);
};

export const highShelfBiquad = (cutoff: number, q: number, gainDb: number, sampleRate: number): Biquad => {
	const a = 10 ** (gainDb / 40);
	const w0 = 2 * Math.PI * cutoff / sampleRate;
	const cos = Math.cos(w0);
	const alpha = Math.sin(w0) / (2 * q);
	const root = 2 * Math.sqrt(a) * alpha;
	return normalise(
		a * ((a + 1) + (a - 1) * cos + root),
		-2 * a * ((a - 1) + (a + 1) * cos),
		a * ((a + 1) + (a - 1) * cos - root),
		(a + 1) - (a - 1) * cos + root,
		2 * ((a - 1) - (a + 1) * cos),
		(a + 1) - (a - 1) * cos - root,
	);
};

export const peakingBiquad = (centre: number, q: number, gainDb: number, sampleRate: number): Biquad => {
	const a = 10 ** (gainDb / 40);
	const w0 = 2 * Math.PI * centre / sampleRate;
	const cos = Math.cos(w0);
	const alpha = Math.sin(w0) / (2 * q);
	return normalise(1 + alpha * a, -2 * cos, 1 - alpha * a, 1 + alpha / a, -2 * cos, 1 - alpha / a);
};

export const tickBiquad = (filter: Biquad, input: number): number => {
	const output = filter.b0 * input + filter.z1;
	filter.z1 = filter.b1 * input - filter.a1 * output + filter.z2;
	filter.z2 = filter.b2 * input - filter.a2 * output;
	return output;
};

export const filterInPlace = (buffer: Float32Array, filter: Biquad): void => {
	for (let i = 0; i < buffer.length; i++) buffer[i] = tickBiquad(filter, buffer[i]);
};

// Butterworth sections: two cascaded biquads with these Qs give a flat fourth-order response.
export const butterworthFourthOrderQs = [0.5411961, 1.3065630];

export const onePoleCoefficient = (cutoff: number, sampleRate: number): number => Math.exp(-2 * Math.PI * cutoff / sampleRate);
