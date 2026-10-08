import type { NoteEvent } from './arrangement';
import { fadeOut, gateEnvelope } from './envelopes';
import { createTunedSvf, tickSvf } from './filters';
import { twoPi } from './oscillators';
import { bipolar, type Random } from './random';
import { midiToFrequency } from './theory';

export interface PluckPreset {
	ratios: number[];
	amplitudes: number[];
	decays: number[];
	attack: number;
	release: number;
	hammer: number;
	hammerCutoff: number;
	brightness: number;
}

// A bell lyre: the partials of a free bar, and a hard mallet.
export const glockPluck: PluckPreset = {
	ratios: [1, 2.756, 5.404, 8.933],
	amplitudes: [1, 0.32, 0.12, 0.05],
	decays: [1.1, 0.32, 0.12, 0.06],
	attack: 0.001,
	release: 0.3,
	hammer: 0.05,
	hammerCutoff: 6000,
	brightness: 0.3,
};

// Additive pluck: each partial is a rotating phasor that decays on its own clock, so upper partials
// die first the way a struck bar does. Band-limited by construction.
export const renderPluck = (note: NoteEvent, preset: PluckPreset, sampleRate: number, random: Random, cutoff = 20000): Float32Array => {
	const frequency = midiToFrequency(note.midi);
	const decayScale = (440 / frequency) ** 0.3;
	const longest = Math.max(...preset.decays) * decayScale;
	const total = Math.max(preset.attack + 0.05, Math.min(note.duration + preset.release * 7, longest * 7));
	const length = Math.ceil(total * sampleRate);
	const output = new Float32Array(length);
	preset.ratios.forEach((ratio, index) => {
		const partial = frequency * ratio;
		if (partial > Math.min(18000, sampleRate * 0.45)) return;
		const rolloff = 1 / Math.sqrt(1 + (partial / cutoff) ** 4);
		let amplitude = preset.amplitudes[index] * rolloff * note.velocity ** (1 + preset.brightness * index);
		const decay = Math.exp(-1 / (preset.decays[index] * decayScale * sampleRate));
		const omega = twoPi * partial / sampleRate;
		const cos = Math.cos(omega);
		const sin = Math.sin(omega);
		let x = 1;
		let y = 0;
		for (let i = 0; i < length; i++) {
			output[i] += amplitude * y;
			const nextX = x * cos - y * sin;
			y = x * sin + y * cos;
			x = nextX;
			amplitude *= decay;
		}
	});
	const hammer = preset.hammer > 0 ? createTunedSvf(preset.hammerCutoff, 0.7, sampleRate) : null;
	const hammerLength = Math.min(length, Math.ceil(0.03 * sampleRate));
	for (let i = 0; i < length; i++) {
		const time = i / sampleRate;
		if (hammer && i < hammerLength) {
			tickSvf(hammer, bipolar(random));
			output[i] += hammer.low * preset.hammer * note.velocity * Math.exp(-time / 0.005);
		}
		output[i] *= gateEnvelope(time, preset.attack, note.duration, preset.release) * fadeOut(time, total, 0.006);
	}
	return output;
};
