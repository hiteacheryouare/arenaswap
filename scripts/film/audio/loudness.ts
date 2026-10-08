import type { Stereo } from './buffers';
import { highpassBiquad, highShelfBiquad, tickBiquad } from './filters';

export const gainToDb = (gain: number): number => 20 * Math.log10(Math.max(gain, 1e-12));

export const dbToGain = (db: number): number => 10 ** (db / 20);

// ITU-R BS.1770 K-weighting: the head-shelf and the RLB high-pass, in the pyloudnorm parameterisation.
const kWeighting = (sampleRate: number) => [
	highShelfBiquad(1681.974450955533, 0.7071752369554196, 3.999843853973347, sampleRate),
	highpassBiquad(38.13547087602444, 0.5003270373238773, sampleRate),
];

const loudnessOfPower = (power: number): number => -0.691 + 10 * Math.log10(power);

const mean = (values: number[]): number => values.reduce((sum, value) => sum + value, 0) / values.length;

// Gated integrated loudness (LUFS): 400 ms blocks every 100 ms, absolute gate at -70, relative at -10 LU.
export const integratedLoudness = (audio: Stereo, sampleRate: number): number => {
	const segment = Math.round(0.1 * sampleRate);
	const segments = Math.floor(audio.left.length / segment);
	const energy = new Float64Array(segments);
	for (const channel of [audio.left, audio.right]) {
		const [shelf, highpass] = kWeighting(sampleRate);
		for (let index = 0; index < segments; index++) {
			let sum = 0;
			for (let i = index * segment; i < (index + 1) * segment; i++) {
				const weighted = tickBiquad(highpass, tickBiquad(shelf, channel[i]));
				sum += weighted * weighted;
			}
			energy[index] += sum;
		}
	}
	const blocks: number[] = [];
	for (let index = 0; index + 4 <= segments; index++) {
		blocks.push((energy[index] + energy[index + 1] + energy[index + 2] + energy[index + 3]) / (4 * segment));
	}
	const aboveAbsolute = blocks.filter(power => power > 0 && loudnessOfPower(power) > -70);
	if (aboveAbsolute.length === 0) return -Infinity;
	const relativeGate = loudnessOfPower(mean(aboveAbsolute)) - 10;
	return loudnessOfPower(mean(aboveAbsolute.filter(power => loudnessOfPower(power) > relativeGate)));
};

const lanczos = (x: number, lobes: number): number => {
	if (x === 0) return 1;
	if (Math.abs(x) >= lobes) return 0;
	const px = Math.PI * x;
	return lobes * Math.sin(px) * Math.sin(px / lobes) / (px * px);
};

const tapOffsets = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];

const phaseTaps = [0.25, 0.5, 0.75].map(fraction => {
	const taps = tapOffsets.map(offset => lanczos(offset - fraction, 6));
	const sum = taps.reduce((total, tap) => total + tap, 0);
	return Float64Array.from(taps, tap => tap / sum);
});

// Per-sample peak including the three points 4x oversampling would add between each pair of samples,
// so the limiter and the meter both see inter-sample peaks.
export const oversampledPeaks = (channel: Float32Array): Float32Array => {
	const length = channel.length;
	const peaks = new Float32Array(length);
	const sampleAt = (index: number): number => (index >= 0 && index < length ? channel[index] : 0);
	for (let n = 0; n < length; n++) {
		let peak = Math.abs(channel[n]);
		const interior = n >= 5 && n + 6 < length;
		for (const taps of phaseTaps) {
			let value = 0;
			if (interior) {
				for (let k = 0; k < 12; k++) value += taps[k] * channel[n - 5 + k];
			} else {
				for (let k = 0; k < 12; k++) value += taps[k] * sampleAt(n - 5 + k);
			}
			const magnitude = Math.abs(value);
			if (magnitude > peak) peak = magnitude;
		}
		peaks[n] = peak;
	}
	return peaks;
};

const maxOf = (values: Float32Array): number => {
	let peak = 0;
	for (let i = 0; i < values.length; i++) if (values[i] > peak) peak = values[i];
	return peak;
};

export const truePeak = (audio: Stereo): number => Math.max(maxOf(oversampledPeaks(audio.left)), maxOf(oversampledPeaks(audio.right)));

export const samplePeak = (audio: Stereo): number => {
	let peak = 0;
	for (let i = 0; i < audio.left.length; i++) peak = Math.max(peak, Math.abs(audio.left[i]), Math.abs(audio.right[i]));
	return peak;
};
