import { createStereo, type Stereo } from './buffers';
import { fadeIn, fadeOut } from './envelopes';
import { createTunedSvf, tickSvf, tuneSvf } from './filters';
import { createMetalBank, tickMetalBank, twoPi } from './oscillators';
import { bipolar, type Random } from './random';

const hatFrequencies = [205.3, 304.4, 369.6, 522.7, 540, 800];
const crashFrequencies = [289.4, 429.2, 521.1, 737, 761.4, 1128];

const lengthOf = (seconds: number, sampleRate: number): number => Math.ceil(seconds * sampleRate);

// A sine whose pitch falls from a click into the body: soft, short and tuned low so it sits under the bass.
export const renderKick = (velocity: number, sampleRate: number, random: Random): Float32Array => {
	const total = 0.42;
	const output = new Float32Array(lengthOf(total, sampleRate));
	const click = createTunedSvf(3500, 0.7, sampleRate);
	const drive = 1.3;
	const normaliser = Math.tanh(drive);
	let phase = 0;
	for (let i = 0; i < output.length; i++) {
		const time = i / sampleRate;
		const frequency = 47 + 95 * Math.exp(-time / 0.032) + 70 * Math.exp(-time / 0.005);
		phase += twoPi * frequency / sampleRate;
		const body = Math.sin(phase) * (time < 0.035 ? 1 : Math.exp(-(time - 0.035) / 0.15));
		tickSvf(click, bipolar(random));
		const transient = click.low * 0.25 * Math.exp(-time / 0.0018);
		output[i] = Math.tanh(drive * (body + transient)) / normaliser * fadeIn(time, 0.0006) * fadeOut(time, total, 0.04) * velocity;
	}
	return output;
};

// The drop's downbeat weight: a sub that falls from 70 to 38 Hz under the kick, with a soft thump.
export const renderBoom = (velocity: number, sampleRate: number): Float32Array => {
	const total = 0.9;
	const output = new Float32Array(lengthOf(total, sampleRate));
	let phase = 0;
	for (let i = 0; i < output.length; i++) {
		const time = i / sampleRate;
		phase += twoPi * (38 + 32 * Math.exp(-time / 0.09)) / sampleRate;
		output[i] = Math.sin(phase) * Math.exp(-time / 0.32) * fadeIn(time, 0.004) * fadeOut(time, total, 0.15) * velocity;
	}
	return output;
};

// Three quick hand slaps, then the main clap and a short room tail; left and right share most of
// their noise so it is wide without going hollow in mono.
export const renderClap = (velocity: number, sampleRate: number, random: Random): Stereo => {
	const total = 0.4;
	const output = createStereo(lengthOf(total, sampleRate));
	const slaps = [0, 0.0085, 0.0175];
	const main = 0.026;
	const bodies = [createTunedSvf(1250, 0.9, sampleRate), createTunedSvf(1320, 0.9, sampleRate)];
	const airs = [createTunedSvf(4000, 0.6, sampleRate), createTunedSvf(4200, 0.6, sampleRate)];
	for (let i = 0; i < output.left.length; i++) {
		const time = i / sampleRate;
		let envelope = 0;
		for (const at of slaps) if (time >= at) envelope += Math.exp(-(time - at) / 0.0032) * fadeIn(time - at, 0.0004);
		if (time >= main) envelope += fadeIn(time - main, 0.0005) * (Math.exp(-(time - main) / 0.05) + 0.12 * Math.exp(-(time - main) / 0.17));
		envelope *= fadeOut(time, total, 0.03) * velocity;
		const shared = bipolar(random);
		const channels = [output.left, output.right];
		for (let side = 0; side < 2; side++) {
			const noise = 0.75 * shared + 0.25 * bipolar(random);
			tickSvf(bodies[side], noise);
			tickSvf(airs[side], noise);
			channels[side][i] = (bodies[side].band * bodies[side].k + 0.6 * airs[side].band * airs[side].k) * envelope * 2.5;
		}
	}
	return output;
};

export const renderSnare = (velocity: number, sampleRate: number, random: Random): Float32Array => {
	const total = 0.22;
	const output = new Float32Array(lengthOf(total, sampleRate));
	const band = createTunedSvf(2200, 0.7, sampleRate);
	let phase = 0;
	for (let i = 0; i < output.length; i++) {
		const time = i / sampleRate;
		phase += twoPi * (175 + 30 * Math.exp(-time / 0.01)) / sampleRate;
		tickSvf(band, bipolar(random));
		const body = Math.sin(phase) * 0.5 * Math.exp(-time / 0.045);
		const noise = band.band * band.k * Math.exp(-time / 0.07);
		output[i] = (body + noise) * fadeIn(time, 0.0005) * fadeOut(time, total, 0.03) * velocity;
	}
	return output;
};

export const renderHat = (open: boolean, velocity: number, sampleRate: number, random: Random): Float32Array => {
	const total = open ? 0.38 : 0.09;
	const decay = open ? 0.11 : 0.022;
	const output = new Float32Array(lengthOf(total, sampleRate));
	const bank = createMetalBank(hatFrequencies, sampleRate, hatFrequencies.map(() => random()));
	const ring = createTunedSvf(8500, 1.1, sampleRate);
	const metalHighpass = createTunedSvf(6000, 0.7, sampleRate);
	const noiseBand = createTunedSvf(9000, 0.7, sampleRate);
	for (let i = 0; i < output.length; i++) {
		const time = i / sampleRate;
		tickSvf(ring, tickMetalBank(bank));
		tickSvf(metalHighpass, ring.band * ring.k);
		tickSvf(noiseBand, bipolar(random));
		const envelope = fadeIn(time, 0.0003) * Math.exp(-time / decay) * fadeOut(time, total, 0.01);
		output[i] = (metalHighpass.high * 1.05 + noiseBand.band * noiseBand.k * 0.75) * envelope * velocity;
	}
	return output;
};

// Metal and noise per side with independent phases, darkening as it rings out.
export const renderCrash = (velocity: number, sampleRate: number, random: Random): Stereo => {
	const total = 2.6;
	const output = createStereo(lengthOf(total, sampleRate));
	const sides = [output.left, output.right].map((channel, side) => ({
		channel,
		bank: createMetalBank(crashFrequencies.map(frequency => frequency * (1 + side * 0.013)), sampleRate, crashFrequencies.map(() => random())),
		highpass: createTunedSvf(4500, 0.7, sampleRate),
		lowpass: createTunedSvf(16000, 0.7, sampleRate),
	}));
	for (let i = 0; i < output.left.length; i++) {
		const time = i / sampleRate;
		const envelope = fadeIn(time, 0.0008) * (0.6 * Math.exp(-time / 0.05) + 0.4 * Math.exp(-time / 0.9)) * fadeOut(time, total, 0.3) * velocity;
		for (const side of sides) {
			if ((i & 15) === 0) tuneSvf(side.lowpass, 7000 + 9000 * Math.exp(-time / 0.6), 0.7, sampleRate);
			tickSvf(side.highpass, tickMetalBank(side.bank) * 0.5 + bipolar(random) * 0.6);
			tickSvf(side.lowpass, side.highpass.high);
			side.channel[i] = side.lowpass.low * envelope;
		}
	}
	return output;
};
