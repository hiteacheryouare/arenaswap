import { addMono, createStereo, panGains, type Stereo } from './buffers';
import { fadeIn, fadeOut, smoothStep } from './envelopes';
import { createSvf, createTunedSvf, tickSvf, tuneSvf } from './filters';
import { sawSample, twoPi } from './oscillators';
import { between, bipolar, type Random } from './random';
import { midiToFrequency, type Chord } from './theory';

const lengthOf = (seconds: number, sampleRate: number): number => Math.ceil(seconds * sampleRate);

// The signature hop: a soft mallet (ratio-1 FM whose index collapses in ~15 ms) that blips a
// semitone sharp into pitch, with a quiet marimba-like overtone and a breath of click.
export const renderDot = (frequency: number, sampleRate: number, random: Random): Float32Array => {
	const total = 0.9;
	const output = new Float32Array(lengthOf(total, sampleRate));
	const brightness = Math.min(1, Math.sqrt(800 / frequency));
	const overtoneLevel = 0.14 * Math.min(1, 700 / frequency);
	const click = createTunedSvf(3000, 1.2, sampleRate);
	let phase = 0;
	let overtonePhase = 0;
	for (let i = 0; i < output.length; i++) {
		const time = i / sampleRate;
		const pitch = frequency * (1 + 0.07 * Math.exp(-time / 0.009));
		phase += twoPi * pitch / sampleRate;
		overtonePhase += twoPi * pitch * 3.98 / sampleRate;
		const index = brightness * (1.4 * Math.exp(-time / 0.014) + 0.1 * Math.exp(-time / 0.22));
		const body = Math.sin(phase + index * Math.sin(phase)) * (0.78 * Math.exp(-time / 0.13) + 0.22 * Math.exp(-time / 0.42));
		const overtone = Math.sin(overtonePhase) * overtoneLevel * Math.exp(-time / 0.025);
		tickSvf(click, bipolar(random));
		const transient = click.band * click.k * 0.12 * Math.exp(-time / 0.0015) * fadeIn(time, 0.0003);
		output[i] = ((body + overtone) * fadeIn(time, 0.0012) + transient) * fadeOut(time, total, 0.05);
	}
	return output;
};

// A muted woody knock: a low body that drops in pitch, two hollow upper partials so it still reads
// over a kick, and a tiny click.
export const renderSwap = (sampleRate: number, random: Random): Float32Array => {
	const total = 0.14;
	const output = new Float32Array(lengthOf(total, sampleRate));
	const click = createTunedSvf(3400, 1.4, sampleRate);
	let lowPhase = 0;
	let woodPhase = 0;
	let shellPhase = 0;
	for (let i = 0; i < output.length; i++) {
		const time = i / sampleRate;
		lowPhase += twoPi * (170 + 90 * Math.exp(-time / 0.01)) / sampleRate;
		woodPhase += twoPi * (660 + 80 * Math.exp(-time / 0.006)) / sampleRate;
		shellPhase += twoPi * 1870 / sampleRate;
		tickSvf(click, bipolar(random));
		const low = Math.sin(lowPhase) * Math.exp(-time / 0.026);
		const wood = Math.sin(woodPhase) * 0.7 * Math.exp(-time / 0.014);
		const shell = Math.sin(shellPhase) * 0.22 * Math.exp(-time / 0.006);
		const transient = click.band * click.k * 0.5 * Math.exp(-time / 0.0012);
		output[i] = ((low + wood + shell) * fadeIn(time, 0.0008) + transient * fadeIn(time, 0.0002)) * fadeOut(time, total, 0.02);
	}
	return output;
};

export const renderTick = (sampleRate: number, random: Random): Float32Array => {
	const total = 0.035;
	const output = new Float32Array(lengthOf(total, sampleRate));
	const air = createTunedSvf(6000, 0.7, sampleRate);
	for (let i = 0; i < output.length; i++) {
		const time = i / sampleRate;
		tickSvf(air, bipolar(random));
		const tone = Math.sin(twoPi * 2900 * time) * Math.exp(-time / 0.005) + 0.5 * Math.sin(twoPi * 4700 * time) * Math.exp(-time / 0.003);
		output[i] = (tone + air.high * 0.3 * Math.exp(-time / 0.0008)) * fadeIn(time, 0.0003) * fadeOut(time, total, 0.006);
	}
	return output;
};

// Something passing close by: brightest and loudest just past the middle, travelling across the field.
export const renderWhoosh = (length: number, pan: number, sampleRate: number, random: Random): Stereo => {
	const total = Math.max(0.15, length);
	const output = createStereo(lengthOf(total, sampleRate));
	const peak = 0.55;
	const bands = [createSvf(), createSvf()];
	const airs = [createSvf(), createSvf()];
	let swell = 0;
	for (let i = 0; i < output.left.length; i++) {
		const time = i / sampleRate;
		const progress = time / total;
		swell = progress < peak ? smoothStep(progress / peak) ** 1.5 : smoothStep((1 - progress) / (1 - peak)) ** 1.2;
		if ((i & 15) === 0) {
			const centre = 350 + 3600 * swell ** 1.3 * (progress < peak ? 1 : 0.8);
			bands.forEach((band, side) => tuneSvf(band, centre * (1 + side * 0.06), 1.3, sampleRate));
			airs.forEach((band, side) => tuneSvf(band, centre * 2.4 * (1 + side * 0.04), 0.9, sampleRate));
		}
		const [gainLeft, gainRight] = panGains(Math.max(-1, Math.min(1, pan + (progress - 0.5) * 0.8)));
		const values = [0, 0];
		for (let side = 0; side < 2; side++) {
			const noise = bipolar(random);
			tickSvf(bands[side], noise);
			tickSvf(airs[side], noise);
			values[side] = (bands[side].band * bands[side].k + 0.35 * airs[side].band * airs[side].k) * swell;
		}
		output.left[i] = values[0] * gainLeft;
		output.right[i] = values[1] * gainRight;
	}
	return output;
};

const renderBellPing = (frequency: number, decay: number, sampleRate: number): Float32Array => {
	const total = decay * 6;
	const output = new Float32Array(lengthOf(total, sampleRate));
	for (let i = 0; i < output.length; i++) {
		const time = i / sampleRate;
		const index = 1.1 * Math.exp(-time / 0.012);
		const modulator = Math.sin(twoPi * frequency * 3.5 * time);
		output[i] = Math.sin(twoPi * frequency * time + index * modulator) * Math.exp(-time / decay) * fadeIn(time, 0.0006) * fadeOut(time, total, 0.02);
	}
	return output;
};

// A handful of chord-tuned bell pings scattered across the field, over a glitter of resonant sparks.
export const renderConfetti = (chord: Chord, sampleRate: number, random: Random): Stereo => {
	const total = 1;
	const output = createStereo(lengthOf(total, sampleRate));
	const pings = 11;
	for (let n = 0; n < pings; n++) {
		const at = 0.42 * (n / (pings - 1)) ** 1.5 + 0.012 * random();
		const tone = chord.bell[Math.floor(random() * chord.bell.length)];
		const midi = tone + 12 > 100 ? tone : tone + 12;
		const level = (1 - 0.5 * n / pings) * between(random, 0.5, 1);
		const ping = renderBellPing(midiToFrequency(midi), between(random, 0.12, 0.26), sampleRate);
		addMono(output, ping, Math.round(at * sampleRate), level * 0.5, bipolar(random) * 0.8);
	}
	const glitter = [createTunedSvf(8500, 4, sampleRate), createTunedSvf(9800, 4, sampleRate)];
	const hiss = [createTunedSvf(7000, 0.7, sampleRate), createTunedSvf(7400, 0.7, sampleRate)];
	const channels = [output.left, output.right];
	for (let i = 0; i < output.left.length; i++) {
		const time = i / sampleRate;
		const density = 900 * Math.exp(-time / 0.25) / sampleRate;
		const envelope = fadeIn(time, 0.01) * Math.exp(-time / 0.3);
		for (let side = 0; side < 2; side++) {
			tickSvf(glitter[side], random() < density ? bipolar(random) : 0);
			tickSvf(hiss[side], bipolar(random));
			channels[side][i] += (glitter[side].band * 0.6 + hiss[side].high * 0.04) * envelope;
		}
		output.left[i] *= fadeOut(time, total, 0.08);
		output.right[i] *= fadeOut(time, total, 0.08);
	}
	return output;
};

// Sub drop, a short thud, a noise body that closes down fast and a low rumble; the reverb send
// supplies the long tail.
export const renderImpact = (sampleRate: number, random: Random): Float32Array => {
	const total = 2.4;
	const output = new Float32Array(lengthOf(total, sampleRate));
	const body = createSvf();
	const rumble = createTunedSvf(140, 0.7, sampleRate);
	const drive = 1.5;
	const normaliser = Math.tanh(drive);
	let subPhase = 0;
	let thudPhase = 0;
	for (let i = 0; i < output.length; i++) {
		const time = i / sampleRate;
		if ((i & 15) === 0) tuneSvf(body, 180 + 2600 * Math.exp(-time / 0.06), 0.7, sampleRate);
		subPhase += twoPi * (36 + 58 * Math.exp(-time / 0.11)) / sampleRate;
		thudPhase += twoPi * (62 + 70 * Math.exp(-time / 0.02)) / sampleRate;
		const noise = bipolar(random);
		tickSvf(body, noise);
		tickSvf(rumble, noise);
		const sum = Math.sin(subPhase) * Math.exp(-time / 0.65)
			+ Math.sin(thudPhase) * 0.5 * Math.exp(-time / 0.09)
			+ body.low * 0.55 * Math.exp(-time / 0.16)
			+ rumble.low * 0.6 * fadeIn(time, 0.05) * Math.exp(-time / 0.8);
		output[i] = Math.tanh(drive * sum) / normaliser * fadeIn(time, 0.001) * fadeOut(time, total, 0.3);
	}
	return output;
};

const crowdBands = [
	{ centre: 330, q: 1.3, gain: 0.8 },
	{ centre: 620, q: 1.6, gain: 1 },
	{ centre: 1050, q: 2, gain: 0.85 },
	{ centre: 1700, q: 2.2, gain: 0.55 },
	{ centre: 2700, q: 2.2, gain: 0.3 },
];

// A stadium rising: vowel-ish noise bands that each flutter on their own (thousands of voices never
// move together), a low rumble for the size of the room, and formants that brighten as it builds.
export const renderSwell = (length: number, sampleRate: number, random: Random): Stereo => {
	const total = Math.max(0.5, length);
	const output = createStereo(lengthOf(total, sampleRate));
	const channels = [output.left, output.right];
	const glide = 1 - Math.exp(-1 / (0.03 * sampleRate));
	const sides = channels.map(() => ({
		filters: crowdBands.map(() => createSvf()),
		murmur: crowdBands.map(() => ({ level: 0.6, target: 0.6, countdown: 0 })),
		rumble: createTunedSvf(220, 0.7, sampleRate),
	}));
	for (let i = 0; i < output.left.length; i++) {
		const time = i / sampleRate;
		const progress = time / total;
		const rise = progress < 0.88 ? (progress / 0.88) ** 2.2 : 1;
		const envelope = (0.06 + 0.94 * rise) * (1 + 0.12 * Math.sin(twoPi * 0.55 * time)) * fadeIn(time, 0.08) * fadeOut(time, total, total * 0.12);
		sides.forEach((side, sideIndex) => {
			if ((i & 15) === 0) side.filters.forEach((filter, band) => tuneSvf(filter, crowdBands[band].centre * (1 + 0.2 * rise) * (1 + sideIndex * 0.03), crowdBands[band].q, sampleRate));
			const noise = bipolar(random);
			let sum = 0;
			side.filters.forEach((filter, band) => {
				const murmur = side.murmur[band];
				murmur.countdown -= 1;
				if (murmur.countdown <= 0) {
					murmur.target = between(random, 0.35, 1);
					murmur.countdown = Math.round(between(random, 0.06, 0.14) * sampleRate);
				}
				murmur.level += (murmur.target - murmur.level) * glide;
				tickSvf(filter, noise);
				sum += filter.band * filter.k * crowdBands[band].gain * murmur.level;
			});
			tickSvf(side.rumble, noise);
			channels[sideIndex][i] = (sum + side.rumble.low * 0.5) * envelope;
		});
	}
	return output;
};

// Noise sweeping up through a tightening band, two detuned saws climbing two octaves from A, and a
// tremolo that speeds up as it goes. Cuts off clean at the end so the hit after it lands on silence.
export const renderRiser = (length: number, sampleRate: number, random: Random): Stereo => {
	const total = Math.max(0.2, length);
	const output = createStereo(lengthOf(total, sampleRate));
	const channels = [output.left, output.right];
	const sides = channels.map((_, side) => ({
		band: createSvf(),
		tone: createSvf(),
		phase: random(),
		detune: 2 ** ((side === 0 ? -10 : 10) / 1200),
	}));
	let tremoloPhase = 0;
	for (let i = 0; i < output.left.length; i++) {
		const time = i / sampleRate;
		const progress = time / total;
		const frequency = midiToFrequency(57 + 24 * progress ** 1.6);
		tremoloPhase += twoPi * (4 + 14 * progress) / sampleRate;
		const tremolo = 1 - 0.45 * progress * (0.5 + 0.5 * Math.sin(tremoloPhase));
		const envelope = fadeIn(time, 0.02) * fadeOut(time, total, 0.008) * tremolo;
		sides.forEach((side, sideIndex) => {
			if ((i & 15) === 0) {
				tuneSvf(side.band, 300 * 30 ** (progress ** 1.4), 0.9 + 1.6 * progress, sampleRate);
				tuneSvf(side.tone, frequency * 3, 0.8, sampleRate);
			}
			tickSvf(side.band, bipolar(random));
			const increment = frequency * side.detune / sampleRate;
			tickSvf(side.tone, sawSample(side.phase, increment));
			side.phase += increment;
			if (side.phase >= 1) side.phase -= 1;
			const noise = side.band.band * side.band.k * progress ** 2;
			const tone = side.tone.low * 0.3 * progress ** 1.8;
			channels[sideIndex][i] = (noise + tone) * envelope;
		});
	}
	return output;
};
