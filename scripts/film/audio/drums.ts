import { createStereo, type Stereo } from './buffers';
import { fadeIn, fadeOut, smoothStep } from './envelopes';
import { createTunedSvf, tickSvf, tuneSvf, type Svf } from './filters';
import { createMetalBank, tickMetalBank, twoPi, type MetalBank } from './oscillators';
import { bipolar, type Random } from './random';

interface Mode {
	ratio: number;
	level: number;
	decay: number;
}

const lengthOf = (seconds: number, sampleRate: number): number => Math.ceil(seconds * sampleRate);

// Per-sample multiplier for an exponential decay with this time constant.
const decayRate = (seconds: number, sampleRate: number): number => Math.exp(-1 / (seconds * sampleRate));

// Modes of a circular membrane, scaled so the fundamental is ratio 1.
const snareModes: Mode[] = [
	{ ratio: 1, level: 1, decay: 0.05 },
	{ ratio: 1.59, level: 0.55, decay: 0.034 },
	{ ratio: 2.14, level: 0.4, decay: 0.027 },
	{ ratio: 2.3, level: 0.3, decay: 0.022 },
	{ ratio: 2.65, level: 0.22, decay: 0.018 },
];

const hoopModes = [
	{ frequency: 1730, level: 0.5, decay: 0.045 },
	{ frequency: 2480, level: 0.32, decay: 0.032 },
	{ frequency: 3910, level: 0.2, decay: 0.022 },
];

export interface SnareStroke {
	velocity: number;
	rim: boolean;
	press: boolean;
	tune: number;
}

// A cranked Kevlar head over a fast pitch drop, the crack of the stick, and cable wires whose rattle
// follows the head. A rimshot adds the ring of the hoop. A press stroke is one bounce of a buzz roll:
// little head, mostly wire.
export const renderSnare = ({ velocity, rim, press, tune }: SnareStroke, sampleRate: number, random: Random): Float32Array => {
	const total = press ? 0.12 : rim ? 0.32 : 0.24;
	const output = new Float32Array(lengthOf(total, sampleRate));
	const pitch = 480 * tune;
	const force = velocity ** 1.5;
	const crack = createTunedSvf(4200 + 1800 * Math.min(1, velocity), 0.8, sampleRate);
	const wires = createTunedSvf(5600, 0.5, sampleRate);
	const wireFloor = createTunedSvf(2200, 0.7, sampleRate);
	const wireDecay = press ? 0.022 : 0.045 + 0.035 * Math.min(1, velocity);
	const headLevel = press ? 0.2 : 0.55;
	const crackLevel = press ? 0.25 : 0.35 + 0.9 * force;
	const phases = new Float64Array(snareModes.length);
	const levels = Float64Array.from(snareModes, mode => mode.level);
	const fades = Float64Array.from(snareModes, mode => decayRate(mode.decay, sampleRate));
	const hoopPhases = Float64Array.from(hoopModes, () => random() * twoPi);
	const hoopLevels = Float64Array.from(hoopModes, mode => mode.level);
	const hoopFades = Float64Array.from(hoopModes, mode => decayRate(mode.decay, sampleRate));
	const wireFade = decayRate(wireDecay, sampleRate);
	const stickFade = decayRate(0.0022, sampleRate);
	const bendFade = decayRate(0.004, sampleRate);
	const drive = 1.5;
	const normaliser = Math.tanh(drive);
	let bend = 0.06;
	let wireLevel = 1;
	let stickLevel = crackLevel;
	for (let i = 0; i < output.length; i++) {
		const time = i / sampleRate;
		let head = 0;
		for (let m = 0; m < snareModes.length; m++) {
			phases[m] += twoPi * pitch * snareModes[m].ratio * (1 + bend) / sampleRate;
			head += Math.sin(phases[m]) * levels[m];
			levels[m] *= fades[m];
		}
		bend *= bendFade;
		const noise = bipolar(random);
		tickSvf(crack, noise);
		tickSvf(wires, noise);
		tickSvf(wireFloor, wires.band * wires.k);
		const rattle = 0.6 + 0.4 * Math.min(1, Math.abs(head));
		const wire = wireFloor.high * rattle * fadeIn(time, 0.0008) * wireLevel;
		const stick = crack.band * crack.k * stickLevel;
		wireLevel *= wireFade;
		stickLevel *= stickFade;
		let hoop = 0;
		if (rim) {
			for (let m = 0; m < hoopModes.length; m++) {
				hoopPhases[m] += twoPi * hoopModes[m].frequency / sampleRate;
				hoop += Math.sin(hoopPhases[m]) * hoopLevels[m];
				hoopLevels[m] *= hoopFades[m];
			}
		}
		const sum = head * headLevel * (1 + 0.3 * Number(rim)) + stick + wire + hoop * fadeIn(time, 0.0004);
		output[i] = Math.tanh(drive * sum) / normaliser * fadeIn(time, 0.0002) * fadeOut(time, total, 0.02) * velocity;
	}
	return output;
};

// Stick laid across the rim: a short wooden knock with no wires.
export const renderClick = (velocity: number, sampleRate: number, random: Random): Float32Array => {
	const total = 0.05;
	const output = new Float32Array(lengthOf(total, sampleRate));
	const band = createTunedSvf(3200, 1.4, sampleRate);
	for (let i = 0; i < output.length; i++) {
		const time = i / sampleRate;
		tickSvf(band, bipolar(random));
		const knock = Math.sin(twoPi * 2150 * time) * 0.6 * Math.exp(-time / 0.007) + Math.sin(twoPi * 1180 * time) * 0.4 * Math.exp(-time / 0.005);
		output[i] = (band.band * band.k * 0.8 * Math.exp(-time / 0.0015) + knock) * fadeIn(time, 0.0002) * fadeOut(time, total, 0.01) * velocity;
	}
	return output;
};

// Quads tuned to the key, F4 down to F3, struck with hard mallets.
const tenorPitches = [349.2, 293.7, 233.1, 174.6];

const tenorModes: Mode[] = [
	{ ratio: 1, level: 1, decay: 1 },
	{ ratio: 1.52, level: 0.42, decay: 0.5 },
	{ ratio: 1.98, level: 0.26, decay: 0.35 },
	{ ratio: 2.47, level: 0.14, decay: 0.25 },
];

export const renderTenor = (drum: number, velocity: number, sampleRate: number, random: Random): Float32Array => {
	const total = 0.55;
	const output = new Float32Array(lengthOf(total, sampleRate));
	const pitch = tenorPitches[drum];
	const ring = 0.14 + 0.03 * drum;
	const mallet = createTunedSvf(2800, 0.9, sampleRate);
	const force = velocity ** 1.5;
	const phases = new Float64Array(tenorModes.length);
	const levels = Float64Array.from(tenorModes, mode => mode.level);
	const fades = Float64Array.from(tenorModes, mode => decayRate(ring * mode.decay, sampleRate));
	const bendFade = decayRate(0.012, sampleRate);
	const tickFade = decayRate(0.0018, sampleRate);
	const drive = 1.3;
	const normaliser = Math.tanh(drive);
	let bend = 0.08;
	let tickLevel = 0.25 + 0.6 * force;
	for (let i = 0; i < output.length; i++) {
		const time = i / sampleRate;
		let body = 0;
		for (let m = 0; m < tenorModes.length; m++) {
			phases[m] += twoPi * pitch * tenorModes[m].ratio * (1 + bend) / sampleRate;
			body += Math.sin(phases[m]) * levels[m];
			levels[m] *= fades[m];
		}
		bend *= bendFade;
		tickSvf(mallet, bipolar(random));
		const tick = mallet.band * mallet.k * tickLevel;
		tickLevel *= tickFade;
		output[i] = Math.tanh(drive * (body * 0.8 + tick)) / normaliser * fadeIn(time, 0.0003) * fadeOut(time, total, 0.05) * velocity;
	}
	return output;
};

// Five tuned bass drums, B-flat 2 down to F1, felt beaters.
const bassPitches = [116.5, 87.3, 73.4, 58.3, 43.7];

const bassModes: Mode[] = [
	{ ratio: 1, level: 1, decay: 1 },
	{ ratio: 1.59, level: 0.28, decay: 0.45 },
	{ ratio: 2.14, level: 0.14, decay: 0.3 },
];

export const renderBassDrum = (drum: number, velocity: number, sampleRate: number, random: Random): Float32Array => {
	const total = 0.9;
	const output = new Float32Array(lengthOf(total, sampleRate));
	const pitch = bassPitches[drum];
	const ring = 0.26 + 0.05 * drum;
	const felt = createTunedSvf(700, 0.7, sampleRate);
	const slap = createTunedSvf(1400, 1, sampleRate);
	const force = velocity ** 1.5;
	const phases = new Float64Array(bassModes.length);
	const levels = Float64Array.from(bassModes, mode => mode.level);
	const fades = Float64Array.from(bassModes, mode => decayRate(ring * mode.decay, sampleRate));
	const bendFade = decayRate(0.018, sampleRate);
	const feltFade = decayRate(0.007, sampleRate);
	const slapFade = decayRate(0.0025, sampleRate);
	const drive = 1.4;
	const normaliser = Math.tanh(drive);
	let bend = 0.25;
	let feltLevel = 0.4 + 0.6 * force;
	let slapLevel = 0.25 * force;
	for (let i = 0; i < output.length; i++) {
		const time = i / sampleRate;
		let body = 0;
		for (let m = 0; m < bassModes.length; m++) {
			phases[m] += twoPi * pitch * bassModes[m].ratio * (1 + bend) / sampleRate;
			body += Math.sin(phases[m]) * levels[m];
			levels[m] *= fades[m];
		}
		bend *= bendFade;
		const noise = bipolar(random);
		tickSvf(felt, noise);
		tickSvf(slap, noise);
		const beater = felt.low * feltLevel + slap.band * slap.k * slapLevel;
		feltLevel *= feltFade;
		slapLevel *= slapFade;
		output[i] = Math.tanh(drive * (body + beater)) / normaliser * fadeIn(time, 0.0008) * fadeOut(time, total, 0.1) * velocity;
	}
	return output;
};

const plateFrequencies = [
	[287, 431, 523, 739, 763, 1127],
	[342, 467, 601, 811, 997, 1349],
];

interface Plate {
	channel: Float32Array;
	banks: MetalBank[];
	highpass: Svf;
	lowpass: Svf;
}

const platesFor = (output: Stereo, cutoff: number, sampleRate: number, random: Random): Plate[] => [output.left, output.right].map((channel, side) => ({
	channel,
	banks: plateFrequencies.map(set => createMetalBank(set.map(frequency => frequency * (1 + side * 0.013)), sampleRate, set.map(() => random()))),
	highpass: createTunedSvf(cutoff, 0.7, sampleRate),
	lowpass: createTunedSvf(16000, 0.7, sampleRate),
}));

const metalOf = (plate: Plate): number => (tickMetalBank(plate.banks[0]) + tickMetalBank(plate.banks[1])) * 0.5;

// Hand cymbals clashed: a bright clang that blooms and darkens. A choke presses them to the chest
// a fifth of a second in.
export const renderCymbal = (velocity: number, choke: boolean, sampleRate: number, random: Random): Stereo => {
	const total = choke ? 0.26 : 3;
	const output = createStereo(lengthOf(total, sampleRate));
	const plates = platesFor(output, 3500, sampleRate, random);
	for (let i = 0; i < output.left.length; i++) {
		const time = i / sampleRate;
		const held = choke ? smoothStep((0.2 - time) / 0.06) : fadeOut(time, total, 0.4);
		const envelope = fadeIn(time, 0.001) * (0.55 * Math.exp(-time / 0.06) + 0.45 * Math.exp(-time / 1.1)) * held * velocity;
		for (const plate of plates) {
			if ((i & 15) === 0) tuneSvf(plate.lowpass, 7000 + 9000 * Math.exp(-time / 0.7), 0.7, sampleRate);
			tickSvf(plate.highpass, metalOf(plate) * 0.5 + bipolar(random) * 0.6);
			tickSvf(plate.lowpass, plate.highpass.high);
			plate.channel[i] = plate.lowpass.low * envelope;
		}
	}
	return output;
};

// The plates touched and let go: a short, bright "tss".
export const renderTap = (velocity: number, sampleRate: number, random: Random): Stereo => {
	const total = 0.28;
	const output = createStereo(lengthOf(total, sampleRate));
	const plates = platesFor(output, 6000, sampleRate, random);
	for (let i = 0; i < output.left.length; i++) {
		const time = i / sampleRate;
		const envelope = fadeIn(time, 0.0008) * Math.exp(-time / 0.07) * fadeOut(time, total, 0.05) * velocity;
		for (const plate of plates) {
			tickSvf(plate.highpass, metalOf(plate) * 0.4 + bipolar(random) * 0.7);
			plate.channel[i] = plate.highpass.high * envelope;
		}
	}
	return output;
};

// The plates rubbed together, rising into the hit that follows and stopping just short of it.
export const renderSizzle = (length: number, velocity: number, sampleRate: number, random: Random): Stereo => {
	const total = Math.max(0.1, length);
	const output = createStereo(lengthOf(total, sampleRate));
	const plates = platesFor(output, 5000, sampleRate, random);
	for (let i = 0; i < output.left.length; i++) {
		const time = i / sampleRate;
		const envelope = (time / total) ** 2 * fadeIn(time, 0.02) * fadeOut(time, total, 0.015) * velocity;
		for (const plate of plates) {
			tickSvf(plate.highpass, metalOf(plate) * 0.3 + bipolar(random) * 0.8);
			plate.channel[i] = plate.highpass.high * envelope;
		}
	}
	return output;
};

// Weight under the big arrivals: a sub that falls onto F1, a fifth under the band's B-flat.
export const renderBoom = (velocity: number, sampleRate: number): Float32Array => {
	const total = 0.9;
	const output = new Float32Array(lengthOf(total, sampleRate));
	let phase = 0;
	for (let i = 0; i < output.length; i++) {
		const time = i / sampleRate;
		phase += twoPi * (43.65 + 36 * Math.exp(-time / 0.09)) / sampleRate;
		output[i] = Math.sin(phase) * Math.exp(-time / 0.32) * fadeIn(time, 0.004) * fadeOut(time, total, 0.15) * velocity;
	}
	return output;
};
