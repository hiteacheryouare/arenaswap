import { addMono, addStereo, createStereo, type Stereo } from './buffers';
import { renderBassDrum, renderBoom, renderClick, renderCymbal, renderSizzle, renderSnare, renderTenor } from './drums';
import type { Random } from './random';

// The film's sound effects, played by the drumline: a tenor for a dot, the basses for a switch, a
// stick on the rim for a click, cymbals rubbed into a cut and clashed on the big arrivals.

const lengthOf = (seconds: number, sampleRate: number): number => Math.ceil(seconds * sampleRate);

// Each dot steps down the quads and back up, so a run of them is a sweep around the drums.
const tenorSteps = [0, 1, 2, 3, 2, 1];

export const renderDot = (step: number, sampleRate: number, random: Random): Float32Array => renderTenor(tenorSteps[step % tenorSteps.length]!, 1, sampleRate, random);

// Two basses in unison, the middle of the line and its bottom.
export const renderSwap = (sampleRate: number, random: Random): Stereo => {
	const output = createStereo(lengthOf(0.9, sampleRate));
	addMono(output, renderBassDrum(1, 1, sampleRate, random), 0, 0.75, -0.2);
	addMono(output, renderBassDrum(3, 1, sampleRate, random), 0, 0.75, 0.2);
	return output;
};

export const renderTick = (sampleRate: number, random: Random): Float32Array => renderClick(0.9, sampleRate, random);

export const renderWhoosh = (length: number, sampleRate: number, random: Random): Stereo => renderSizzle(length, 0.75, sampleRate, random);

export const renderSwell = (length: number, sampleRate: number, random: Random): Stereo => renderSizzle(length, 1, sampleRate, random);

const snarePans = [-0.25, 0, 0.25];

// The whole line on one note: snares on the rim, the basses, and the cymbals clashed and let ring.
const renderBandHit = (basses: number[], boom: boolean, sampleRate: number, random: Random): Stereo => {
	const output = createStereo(lengthOf(3, sampleRate));
	snarePans.forEach((pan, index) => addMono(output, renderSnare({ velocity: 1, rim: true, press: false, tune: 0.985 + index * 0.015 }, sampleRate, random), 0, 0.4, pan));
	basses.forEach((drum, index) => addMono(output, renderBassDrum(drum, 1, sampleRate, random), 0, 0.55, (index / Math.max(1, basses.length - 1) - 0.5) * 0.8));
	addStereo(output, renderCymbal(1, false, sampleRate, random), 0, 0.9);
	if (boom) addMono(output, renderBoom(1, sampleRate), 0, 0.5);
	return output;
};

export const renderConfetti = (sampleRate: number, random: Random): Stereo => renderBandHit([1, 3], false, sampleRate, random);

export const renderImpact = (sampleRate: number, random: Random): Stereo => renderBandHit([0, 1, 2, 3, 4], true, sampleRate, random);

// A snare roll: buzz strokes thirty-second notes apart, growing into whatever comes next.
export const renderRiser = (length: number, beat: number, sampleRate: number, random: Random): Float32Array => {
	const output = new Float32Array(lengthOf(length + 0.15, sampleRate));
	const spacing = beat / 8;
	for (let time = 0; time < length - spacing / 2; time += spacing) {
		const growth = time / length;
		const stroke = renderSnare({ velocity: 0.35 + 0.6 * growth ** 1.5, rim: false, press: true, tune: 0.98 + 0.04 * random() }, sampleRate, random);
		const offset = Math.round(time * sampleRate);
		for (let i = 0; i < stroke.length && offset + i < output.length; i++) output[offset + i] += stroke[i];
	}
	return output;
};
