import type { Arrangement } from './arrangement';
import { scaleStereo, sumStereo, type Stereo } from './buffers';
import { compress, limit, type LimiterOptions } from './dynamics';
import { smoothStep } from './envelopes';
import { butterworthFourthOrderQs, filterInPlace, highpassBiquad, highShelfBiquad, tickBiquad } from './filters';
import { dbToGain, integratedLoudness, truePeak } from './loudness';
import { stemNames, type Stems } from './mixer';

export const targetLufs = -16;
export const ceilingDb = -1;

// The limiter aims a little under the ceiling; the final true-peak check covers the rest.
const limiterOptions: LimiterOptions = { ceilingDb: ceilingDb - 0.15, kneeDb: 2, lookahead: 0.002, release: 0.12 };

const glue = { thresholdDb: -15, ratio: 2, kneeDb: 6, attack: 0.012, release: 0.2 };

const removeSubsonics = (mix: Stereo, sampleRate: number): void => {
	for (const channel of [mix.left, mix.right]) {
		for (const q of butterworthFourthOrderQs) filterInPlace(channel, highpassBiquad(25, q, sampleRate));
	}
};

const addAir = (mix: Stereo, sampleRate: number): void => {
	for (const channel of [mix.left, mix.right]) filterInPlace(channel, highShelfBiquad(8000, 0.7, 1.5, sampleRate));
};

// The side channel loses everything under ~120 Hz, so the low end stays mono and centred.
const monoLows = (mix: Stereo, sampleRate: number): void => {
	const filter = highpassBiquad(120, Math.SQRT1_2, sampleRate);
	for (let i = 0; i < mix.left.length; i++) {
		const mid = (mix.left[i] + mix.right[i]) / 2;
		const side = tickBiquad(filter, (mix.left[i] - mix.right[i]) / 2);
		mix.left[i] = mid + side;
		mix.right[i] = mid - side;
	}
};

// A long ease-out over the last stretch, times a 120 ms fade that lands on exact zero at the last sample.
export const applyTail = (mix: Stereo, fadeLength: number, sampleRate: number): void => {
	const length = mix.left.length;
	const long = Math.max(1, Math.min(length, Math.round(fadeLength * sampleRate)));
	const short = Math.max(1, Math.min(length, Math.round(0.12 * sampleRate)));
	for (let i = Math.max(0, length - long); i < length; i++) {
		const remaining = length - 1 - i;
		const gain = smoothStep(remaining / long) * smoothStep(remaining / short);
		mix.left[i] *= gain;
		mix.right[i] *= gain;
	}
};

const capTruePeak = (mix: Stereo): void => {
	const peak = truePeak(mix);
	const ceiling = dbToGain(ceilingDb);
	if (peak > ceiling) scaleStereo(mix, ceiling / peak * 0.999);
};

const masterMix = (stems: Stems, arrangement: Arrangement, sampleRate: number): Stereo => {
	const length = Math.round(arrangement.duration * sampleRate);
	const mix = sumStereo(stemNames.map(name => stems[name]), length);
	removeSubsonics(mix, sampleRate);
	addAir(mix, sampleRate);
	monoLows(mix, sampleRate);
	const raw = integratedLoudness(mix, sampleRate);
	if (!Number.isFinite(raw)) return mix;
	scaleStereo(mix, dbToGain(targetLufs - 3 - raw));
	compress(mix, sampleRate, glue);
	applyTail(mix, arrangement.fadeLength, sampleRate);
	let gain = dbToGain(targetLufs - integratedLoudness(mix, sampleRate));
	let mastered = limit(mix, gain, sampleRate, limiterOptions);
	for (let pass = 0; pass < 4; pass++) {
		const error = targetLufs - integratedLoudness(mastered, sampleRate);
		if (Math.abs(error) < 0.05) break;
		gain *= dbToGain(error);
		mastered = limit(mix, gain, sampleRate, limiterOptions);
	}
	capTruePeak(mastered);
	return mastered;
};

// The recording is mastered already, so the soundtrack only needs the effects tucked in under the
// same loudness target and ceiling as the score.
export const masterSoundtrack = (mix: Stereo, sampleRate: number): Stereo => {
	removeSubsonics(mix, sampleRate);
	applyTail(mix, 0.12, sampleRate);
	let gain = dbToGain(targetLufs - integratedLoudness(mix, sampleRate));
	let mastered = limit(mix, gain, sampleRate, limiterOptions);
	for (let pass = 0; pass < 4; pass++) {
		const error = targetLufs - integratedLoudness(mastered, sampleRate);
		if (Math.abs(error) < 0.05) break;
		gain *= dbToGain(error);
		mastered = limit(mix, gain, sampleRate, limiterOptions);
	}
	capTruePeak(mastered);
	return mastered;
};

// Isolated sound-effect reels skip loudness matching: they play at the level the effects sit at in a
// mastered cut, so each one can be judged as the film will present it.
export const masterReel = (mix: Stereo, sampleRate: number, gain: number): Stereo => {
	removeSubsonics(mix, sampleRate);
	applyTail(mix, 0.12, sampleRate);
	const mastered = limit(mix, gain, sampleRate, limiterOptions);
	capTruePeak(mastered);
	return mastered;
};

export default masterMix;
