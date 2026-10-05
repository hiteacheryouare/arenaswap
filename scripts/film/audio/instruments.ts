import type { NoteEvent, PadNote } from './arrangement';
import { createStereo, panGains, type Stereo } from './buffers';
import { curveAt, fadeIn, fadeOut, gateEnvelope, type ControlCurve } from './envelopes';
import { createSvf, createTunedSvf, tickSvf, tuneSvf } from './filters';
import { sawSample, twoPi } from './oscillators';
import { bipolar, type Random } from './random';
import { midiToFrequency } from './theory';

export interface PadCurves {
	cutoff: ControlCurve;
	gain: ControlCurve;
}

// Three detuned saws per note, spread left/centre/right, through a moving low-pass; an octave-up sine
// on the upper voices adds the glassy air on top.
export const renderPadNote = (note: PadNote, curves: PadCurves, sampleRate: number, random: Random): Stereo => {
	const attack = 0.5;
	const total = note.duration + note.release * 6;
	const length = Math.ceil(total * sampleRate);
	const output = createStereo(length);
	const start = Math.round(note.time * sampleRate);
	const frequency = midiToFrequency(note.midi);
	const increments = Float64Array.from([-11, 0, 11], cents => frequency * 2 ** ((cents + 2 * bipolar(random)) / 1200) / sampleRate);
	const phases = Float64Array.from(increments, () => random());
	const pans = [-0.8, 0, 0.8].map(panGains);
	const shimmerLevel = note.midi >= 60 ? 0.12 : 0;
	const shimmerIncrement = frequency * 2 * 2 ** (3 / 1200) / sampleRate;
	let shimmerPhase = random();
	const keyTrack = 2 ** ((note.midi - 57) / 24);
	const lfoOffset = random() * twoPi;
	const level = note.midi < 52 ? 0.075 : 0.1;
	const left = createSvf();
	const right = createSvf();
	for (let i = 0; i < length; i++) {
		if ((i & 15) === 0) {
			const wobble = 1 + 0.12 * Math.sin(twoPi * 0.13 * (start + i) / sampleRate + lfoOffset);
			const cutoff = curveAt(curves.cutoff, start + i) * keyTrack * wobble;
			tuneSvf(left, cutoff, 0.9, sampleRate);
			tuneSvf(right, cutoff, 0.9, sampleRate);
		}
		let sumLeft = 0;
		let sumRight = 0;
		for (let voice = 0; voice < 3; voice++) {
			const saw = sawSample(phases[voice], increments[voice]);
			phases[voice] += increments[voice];
			if (phases[voice] >= 1) phases[voice] -= 1;
			sumLeft += saw * pans[voice][0];
			sumRight += saw * pans[voice][1];
		}
		tickSvf(left, sumLeft);
		tickSvf(right, sumRight);
		const shimmer = shimmerLevel * Math.sin(twoPi * shimmerPhase);
		shimmerPhase += shimmerIncrement;
		if (shimmerPhase >= 1) shimmerPhase -= 1;
		const time = i / sampleRate;
		const envelope = gateEnvelope(time, attack, note.duration, note.release) * fadeOut(time, total, 0.02) * curveAt(curves.gain, start + i) * level;
		output.left[i] = (left.low + shimmer) * envelope;
		output.right[i] = (right.low + shimmer) * envelope;
	}
	return output;
};

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

const harmonicSeries = (count: number, stretch: number): number[] => Array.from({ length: count }, (_, index) => {
	const harmonic = index + 1;
	return harmonic * Math.sqrt(1 + stretch * harmonic * harmonic);
});

export const feltPluck: PluckPreset = {
	ratios: harmonicSeries(8, 0.00015),
	amplitudes: Array.from({ length: 8 }, (_, index) => 1 / (index + 1) ** 1.8),
	decays: Array.from({ length: 8 }, (_, index) => 0.55 / (1 + 1.3 * index)),
	attack: 0.004,
	release: 0.12,
	hammer: 0.08,
	hammerCutoff: 1200,
	brightness: 0.5,
};

export const glassPluck: PluckPreset = {
	ratios: [1, 2.002, 3.006, 4.013, 5.03, 6.05, 7.08],
	amplitudes: [1, 0.5, 0.32, 0.22, 0.14, 0.09, 0.05],
	decays: [1.1, 0.7, 0.45, 0.3, 0.2, 0.14, 0.1],
	attack: 0.0015,
	release: 0.14,
	hammer: 0.035,
	hammerCutoff: 3000,
	brightness: 0.6,
};

export const celestaPluck: PluckPreset = {
	ratios: [1, 2, 3.01],
	amplitudes: [1, 0.16, 0.05],
	decays: [0.75, 0.3, 0.12],
	attack: 0.002,
	release: 0.18,
	hammer: 0,
	hammerCutoff: 3000,
	brightness: 0.4,
};

export const stabPluck: PluckPreset = {
	...glassPluck,
	decays: glassPluck.decays.map(decay => decay * 2.4),
	attack: 0.003,
	release: 0.6,
};

// Additive pluck: each partial is a rotating phasor that decays on its own clock, so upper partials
// die first the way a struck bar or felted string does. Band-limited by construction.
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

// Sine sub with a little second and third harmonic, plus a low-passed saw so the line still reads on
// laptop speakers that cannot reproduce the fundamental.
export const renderBassNote = (note: NoteEvent, sampleRate: number): Float32Array => {
	const release = 0.045;
	const total = note.duration + release * 6;
	const length = Math.ceil(total * sampleRate);
	const output = new Float32Array(length);
	const frequency = midiToFrequency(note.midi);
	const increment = frequency / sampleRate;
	const body = createTunedSvf(Math.min(900, frequency * 6), 0.8, sampleRate);
	const drive = 1.4;
	const normaliser = Math.tanh(drive);
	let phase = 0;
	for (let i = 0; i < length; i++) {
		const time = i / sampleRate;
		const angle = twoPi * phase;
		const sub = Math.sin(angle) + 0.28 * Math.sin(2 * angle) + 0.06 * Math.sin(3 * angle);
		tickSvf(body, sawSample(phase, increment));
		phase += increment;
		if (phase >= 1) phase -= 1;
		const envelope = gateEnvelope(time, 0.004, note.duration, release) * (0.82 + 0.18 * Math.exp(-time / 0.12)) * fadeOut(time, total, 0.004);
		output[i] = Math.tanh(drive * (sub * 0.75 + body.low * 0.22) * envelope) / normaliser * note.velocity * fadeIn(time, 0.002);
	}
	return output;
};
