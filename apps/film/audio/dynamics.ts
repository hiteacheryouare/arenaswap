import { createStereo, type Stereo } from './buffers';
import { highpassBiquad, tickBiquad } from './filters';
import { gainToDb, oversampledPeaks } from './loudness';

export interface KeyHit {
	time: number;
	velocity: number;
}

export interface KeyShape {
	attack: number;
	hold: number;
	release: number;
}

// The duck shape is drawn straight from the trigger times rather than followed from audio, so the
// pump is exactly on the grid and identical on every render.
export const sidechainKey = (hits: KeyHit[], length: number, sampleRate: number, shape: KeyShape): Float32Array => {
	const key = new Float32Array(length);
	const attack = shape.attack * sampleRate;
	const hold = shape.hold * sampleRate;
	const release = shape.release * sampleRate;
	const span = Math.ceil(attack + hold + release * 7);
	for (const hit of hits) {
		const start = Math.round(hit.time * sampleRate);
		for (let i = 0; i < span && start + i < length; i++) {
			if (start + i < 0) continue;
			const value = i < attack ? i / attack : i < attack + hold ? 1 : Math.exp(-(i - attack - hold) / release);
			key[start + i] = Math.max(key[start + i], value * hit.velocity);
		}
	}
	return key;
};

export const duck = (target: Stereo, key: Float32Array, depth: number): void => {
	for (let i = 0; i < target.left.length; i++) {
		const gain = 1 - depth * key[i];
		target.left[i] *= gain;
		target.right[i] *= gain;
	}
};

export interface CompressorOptions {
	thresholdDb: number;
	ratio: number;
	kneeDb: number;
	attack: number;
	release: number;
}

const softKneeReduction = (levelDb: number, options: CompressorOptions): number => {
	const over = levelDb - options.thresholdDb;
	const slope = 1 - 1 / options.ratio;
	const halfKnee = options.kneeDb / 2;
	if (over <= -halfKnee) return 0;
	if (over >= halfKnee) return over * slope;
	return slope * (over + halfKnee) ** 2 / (2 * options.kneeDb);
};

// Stereo-linked RMS glue compressor, in place. The detector is high-passed so sub hits do not pump
// the whole mix.
export const compress = (target: Stereo, sampleRate: number, options: CompressorOptions): void => {
	const detector = Math.exp(-1 / (0.01 * sampleRate));
	const attack = Math.exp(-1 / (options.attack * sampleRate));
	const release = Math.exp(-1 / (options.release * sampleRate));
	const keyFilters = [highpassBiquad(120, Math.SQRT1_2, sampleRate), highpassBiquad(120, Math.SQRT1_2, sampleRate)];
	let meanSquare = 0;
	let reduction = 0;
	for (let i = 0; i < target.left.length; i++) {
		const power = Math.max(tickBiquad(keyFilters[0], target.left[i]) ** 2, tickBiquad(keyFilters[1], target.right[i]) ** 2);
		meanSquare = power + (meanSquare - power) * detector;
		const wanted = softKneeReduction(10 * Math.log10(meanSquare + 1e-12), options);
		reduction = wanted + (reduction - wanted) * (wanted > reduction ? attack : release);
		const gain = 10 ** (-reduction / 20);
		target.left[i] *= gain;
		target.right[i] *= gain;
	}
};

export interface LimiterOptions {
	ceilingDb: number;
	kneeDb: number;
	lookahead: number;
	release: number;
}

const slidingMinimumAhead = (values: Float32Array, window: number): Float32Array => {
	const length = values.length;
	const result = new Float32Array(length);
	const queue = new Int32Array(length);
	let head = 0;
	let tail = 0;
	for (let j = 0; j < length + window; j++) {
		if (j < length) {
			while (tail > head && values[queue[tail - 1]] >= values[j]) tail--;
			queue[tail++] = j;
		}
		const start = j - window;
		if (start < 0) continue;
		while (queue[head] < start) head++;
		result[start] = values[queue[head]];
	}
	return result;
};

// Look-ahead limiter driven by 4x-oversampled peaks. The gain each sample needs is held over the
// look-ahead window, allowed to recover exponentially, then box-averaged over that same window: the
// average can never rise above what the peak needs, so the ceiling holds without a hard corner.
export const limit = (input: Stereo, inputGain: number, sampleRate: number, options: LimiterOptions): Stereo => {
	const length = input.left.length;
	const output = createStereo(length);
	for (let i = 0; i < length; i++) {
		output.left[i] = input.left[i] * inputGain;
		output.right[i] = input.right[i] * inputGain;
	}
	const peaksLeft = oversampledPeaks(output.left);
	const peaksRight = oversampledPeaks(output.right);
	const required = new Float32Array(length);
	const halfKnee = options.kneeDb / 2;
	for (let i = 0; i < length; i++) {
		const peak = Math.max(peaksLeft[i], peaksRight[i]);
		const level = gainToDb(peak);
		const over = level - options.ceilingDb;
		let reduction = 0;
		if (over >= halfKnee) reduction = over;
		else if (over > -halfKnee) reduction = (over + halfKnee) ** 2 / (2 * options.kneeDb);
		required[i] = Math.min(1, 10 ** (-reduction / 20));
	}
	const window = Math.max(1, Math.round(options.lookahead * sampleRate));
	const held = slidingMinimumAhead(required, window);
	const recover = 1 - Math.exp(-1 / (options.release * sampleRate));
	let state = 1;
	for (let i = 0; i < length; i++) {
		state = Math.min(held[i], state + (1 - state) * recover);
		held[i] = state;
	}
	const span = window + 1;
	let sum = span;
	for (let i = 0; i < length; i++) {
		sum += held[i] - (i >= span ? held[i - span] : 1);
		const gain = sum / span;
		output.left[i] *= gain;
		output.right[i] *= gain;
	}
	return output;
};
