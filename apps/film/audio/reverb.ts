import { createStereo, type Stereo } from './buffers';
import { filterInPlace, highpassBiquad, lowpassBiquad, onePoleCoefficient } from './filters';

export interface ReverbOptions {
	decay: number;
	preDelay: number;
	damping: number;
	size: number;
	modulation: number;
	lowCut: number;
	highCut: number;
}

const lineMilliseconds = [29.7, 37.1, 41.1, 43.7, 53.3, 59.9, 67.7, 73.1];
const lfoRates = [0.31, 0.43, 0.53, 0.67, 0.71, 0.83, 0.97, 1.09];
const diffuserMilliseconds = [[4.7, 3.6, 12.7, 9.3], [5.1, 3.3, 11.9, 8.8]];

interface Allpass {
	buffer: Float32Array;
	index: number;
}

const diffusion = 0.6;

const tickAllpass = (allpass: Allpass, input: number): number => {
	const delayed = allpass.buffer[allpass.index];
	const written = input + diffusion * delayed;
	allpass.buffer[allpass.index] = written;
	allpass.index = (allpass.index + 1) % allpass.buffer.length;
	return delayed - diffusion * written;
};

// In-place 8-point fast Walsh-Hadamard transform: an orthogonal, lossless mixing matrix for the network.
const hadamard = (values: Float64Array): void => {
	for (let width = 1; width < 8; width <<= 1) {
		for (let block = 0; block < 8; block += width << 1) {
			for (let i = block; i < block + width; i++) {
				const a = values[i];
				const b = values[i + width];
				values[i] = a + b;
				values[i + width] = a - b;
			}
		}
	}
	for (let i = 0; i < 8; i++) values[i] *= Math.SQRT1_2 / 2;
};

// Eight-line feedback delay network: diffused stereo input, gently modulated lines so the tail does
// not ring metallic, a one-pole in every loop so highs die before lows, and per-line gains set from RT60.
const renderReverb = (input: Stereo, sampleRate: number, options: ReverbOptions): Stereo => {
	const length = input.left.length;
	const output = createStereo(length);
	const preDelay = Math.round(options.preDelay * sampleRate);
	const depth = options.modulation * sampleRate / 1000;
	const delays = lineMilliseconds.map(ms => ms * options.size * sampleRate / 1000);
	const gains = Float64Array.from(delays, delay => 10 ** (-3 * delay / (options.decay * sampleRate)));
	const lines = delays.map(delay => new Float32Array(Math.ceil(delay + depth) + 4));
	const lfoSteps = lfoRates.map(rate => 2 * Math.PI * rate / sampleRate);
	const lfoPhases = lfoRates.map((_, index) => index * 0.7);
	const damp = onePoleCoefficient(options.damping, sampleRate);
	const lowpassed = new Float64Array(8);
	const reads = new Float64Array(8);
	const mixed = new Float64Array(8);
	const diffusers = diffuserMilliseconds.map(set => set.map(ms => ({ buffer: new Float32Array(Math.round(ms * sampleRate / 1000)), index: 0 })));
	let write = 0;
	for (let n = 0; n < length; n++) {
		const source = n - preDelay;
		let left = source >= 0 ? input.left[source] : 0;
		let right = source >= 0 ? input.right[source] : 0;
		for (const allpass of diffusers[0]) left = tickAllpass(allpass, left);
		for (const allpass of diffusers[1]) right = tickAllpass(allpass, right);
		for (let line = 0; line < 8; line++) {
			const buffer = lines[line];
			const size = buffer.length;
			lfoPhases[line] += lfoSteps[line];
			const position = write - delays[line] - depth * (0.5 + 0.5 * Math.sin(lfoPhases[line]));
			const floor = Math.floor(position);
			const fraction = position - floor;
			const a = buffer[((floor % size) + size) % size];
			const b = buffer[(((floor + 1) % size) + size) % size];
			reads[line] = a + (b - a) * fraction;
			lowpassed[line] = reads[line] + (lowpassed[line] - reads[line]) * damp;
			mixed[line] = lowpassed[line] * gains[line];
		}
		hadamard(mixed);
		for (let line = 0; line < 8; line++) {
			lines[line][write % lines[line].length] = mixed[line] + (line % 2 === 0 ? left : right) * 0.5;
		}
		write++;
		output.left[n] = (reads[0] + reads[2] + reads[4] + reads[6]) * 0.5;
		output.right[n] = (reads[1] + reads[3] + reads[5] + reads[7]) * 0.5;
	}
	for (const channel of [output.left, output.right]) {
		filterInPlace(channel, highpassBiquad(options.lowCut, 0.707, sampleRate));
		filterInPlace(channel, lowpassBiquad(options.highCut, 0.707, sampleRate));
	}
	return output;
};

export default renderReverb;
