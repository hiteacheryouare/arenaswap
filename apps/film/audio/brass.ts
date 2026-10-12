import { createStereo, panGains, type Stereo } from './buffers';
import { fadeIn, fadeOut, lerp, smoothStep } from './envelopes';
import { createSvf, createTunedSvf, filterInPlace, highpassBiquad, peakingBiquad, tickSvf, tuneSvf } from './filters';
import { sawSample, twoPi } from './oscillators';
import { between, bipolar, type Random } from './random';
import { midiToFrequency } from './theory';

export type BrassSection = 'trumpet' | 'screamer' | 'mellophone' | 'trombone' | 'baritone' | 'sousaphone';

export type BrassShape = 'held' | 'swell' | 'ring';

export interface BrassNote {
	time: number;
	duration: number;
	midi: number;
	velocity: number;
	section: BrassSection;
	shape: BrassShape;
	scoop: number;
	fall: number;
	players?: number;
	attack?: number;
}

interface SectionVoice {
	players: number;
	detune: number;
	scatter: number;
	field: [number, number];
	dark: number;
	bright: number;
	ceiling: number;
	resonance: number;
	fundamental: number;
	blat: number;
	scoop: number;
	attack: number;
	release: number;
	breath: number;
	breathCentre: number;
	vibrato: number;
	level: number;
	bell: { centre: number; gain: number; q: number };
	highpass: number;
}

export const brassSections: BrassSection[] = ['trumpet', 'screamer', 'mellophone', 'trombone', 'baritone', 'sousaphone'];

// `dark` and `bright` set the low-pass as multiples of the note's pitch, at rest and at full
// intensity; `blat` is the extra brightness the attack spits out before it settles.
const voices: Record<BrassSection, SectionVoice> = {
	trumpet: {
		players: 5, detune: 9, scatter: 0.012, field: [-0.45, 0.05],
		dark: 1.6, bright: 9, ceiling: 9000, resonance: 1.1, fundamental: 0.15, blat: 6, scoop: 0.25,
		attack: 0.012, release: 0.06, breath: 0.05, breathCentre: 2600, vibrato: 9, level: 1,
		bell: { centre: 1400, gain: 4, q: 0.9 }, highpass: 180,
	},
	screamer: {
		players: 2, detune: 6, scatter: 0.008, field: [-0.15, 0.15],
		dark: 1.4, bright: 7, ceiling: 11000, resonance: 1.2, fundamental: 0.1, blat: 5, scoop: 0.6,
		attack: 0.01, release: 0.05, breath: 0.06, breathCentre: 3200, vibrato: 14, level: 0.6,
		bell: { centre: 2200, gain: 3, q: 1 }, highpass: 400,
	},
	mellophone: {
		players: 4, detune: 8, scatter: 0.012, field: [0.05, 0.5],
		dark: 1.4, bright: 6, ceiling: 6500, resonance: 0.9, fundamental: 0.25, blat: 4, scoop: 0.2,
		attack: 0.016, release: 0.07, breath: 0.035, breathCentre: 1800, vibrato: 6, level: 0.85,
		bell: { centre: 900, gain: 3, q: 0.8 }, highpass: 120,
	},
	trombone: {
		players: 4, detune: 8, scatter: 0.012, field: [0.15, 0.6],
		dark: 1.8, bright: 10, ceiling: 5000, resonance: 1.2, fundamental: 0.3, blat: 9, scoop: 0.4,
		attack: 0.014, release: 0.06, breath: 0.04, breathCentre: 1300, vibrato: 0, level: 0.9,
		bell: { centre: 650, gain: 4, q: 0.8 }, highpass: 70,
	},
	baritone: {
		players: 3, detune: 7, scatter: 0.014, field: [-0.6, -0.2],
		dark: 1.3, bright: 5, ceiling: 3500, resonance: 0.8, fundamental: 0.5, blat: 3, scoop: 0.2,
		attack: 0.02, release: 0.08, breath: 0.025, breathCentre: 900, vibrato: 0, level: 0.8,
		bell: { centre: 450, gain: 2.5, q: 0.7 }, highpass: 60,
	},
	sousaphone: {
		players: 3, detune: 6, scatter: 0.01, field: [-0.1, 0.1],
		dark: 1.6, bright: 6, ceiling: 2200, resonance: 0.9, fundamental: 0.9, blat: 4, scoop: 0.15,
		attack: 0.014, release: 0.05, breath: 0.02, breathCentre: 500, vibrato: 0, level: 1,
		bell: { centre: 260, gain: 3, q: 0.7 }, highpass: 28,
	},
};

const controlStep = 16;

// Held notes lean on the front a little; a swell is the band's crescendo into an arrival; a ring
// is the last chord, hit hard and left to die away.
const bodyOf = (note: BrassNote, time: number): number => {
	switch (note.shape) {
		case 'held': return 0.8 + 0.2 * Math.exp(-time / 0.09);
		case 'swell': return 0.22 + 0.78 * Math.min(1, time / note.duration) ** 1.8;
		case 'ring': return (0.5 + 0.5 * Math.exp(-time / 0.16)) * Math.exp(-time / 3.4);
	}
};

// Every player is a band-limited saw (plus some extra fundamental for the big horns) through a
// low-pass that opens with how hard they are blowing, so loud notes are brighter as well as louder.
// Each player is a few cents off, a few milliseconds late and somewhere else on the field.
export const renderBrassNote = (note: BrassNote, sampleRate: number, random: Random): Stereo => {
	const voice = voices[note.section];
	const players = note.players ?? voice.players;
	const attack = note.attack ?? voice.attack;
	const release = voice.release + (note.fall > 0 ? 0.12 : 0);
	const total = note.duration + release * 7;
	const length = Math.ceil(total * sampleRate);
	const scatter = Math.round(voice.scatter * sampleRate);
	const output = createStereo(length + scatter);
	const frequency = midiToFrequency(note.midi);
	const scoop = voice.scoop + note.scoop;
	const scoopTime = 0.025 + 0.03 * note.scoop;
	const level = voice.level * note.velocity / Math.sqrt(players);
	const envelope = new Float32Array(length);
	for (let i = 0; i < length; i++) {
		const time = i / sampleRate;
		const closing = time < note.duration ? 1 : Math.exp((note.duration - time) / release);
		envelope[i] = fadeIn(time, attack) * bodyOf(note, time) * closing * fadeOut(time, total, 0.01);
	}
	for (let player = 0; player < players; player++) {
		const spread = players === 1 ? 0 : player / (players - 1) * 2 - 1;
		const cents = voice.detune * (0.8 * spread + 0.25 * bipolar(random));
		const delay = Math.round(random() * scatter);
		const [gainLeft, gainRight] = panGains(lerp(voice.field[0], voice.field[1], (spread + 1) / 2) + 0.06 * bipolar(random));
		const lip = between(random, 0.75, 1.25);
		const vibratoRate = between(random, 4.6, 5.6);
		const vibratoOffset = random() * twoPi;
		const filter = createSvf();
		let phase = random();
		let increment = frequency / sampleRate;
		let drive = 1;
		let normaliser = Math.tanh(drive);
		for (let i = 0; i < length; i++) {
			if (i % controlStep === 0) {
				const time = i / sampleRate;
				const intensity = envelope[i] * note.velocity;
				let bend = cents - 100 * scoop * lip * Math.exp(-time / scoopTime);
				if (note.fall > 0 && time > note.duration) bend -= 100 * note.fall * smoothStep((time - note.duration) / 0.2);
				if (voice.vibrato > 0 && note.duration > 0.45) bend += voice.vibrato * smoothStep((time - 0.25) / 0.35) * Math.sin(twoPi * vibratoRate * time + vibratoOffset);
				increment = frequency * 2 ** (bend / 1200) / sampleRate;
				const cutoff = frequency * (voice.dark + voice.bright * intensity ** 1.5 + voice.blat * note.velocity * Math.exp(-time / 0.04));
				tuneSvf(filter, Math.min(voice.ceiling, cutoff), voice.resonance, sampleRate);
				drive = 1 + 1.4 * intensity;
				normaliser = Math.tanh(drive);
			}
			tickSvf(filter, sawSample(phase, increment) - voice.fundamental * Math.sin(twoPi * phase));
			phase += increment;
			if (phase >= 1) phase -= 1;
			const sample = Math.tanh(drive * filter.low) / normaliser * envelope[i] * level;
			output.left[i + delay] += sample * gainLeft;
			output.right[i + delay] += sample * gainRight;
		}
	}
	const breath = createTunedSvf(voice.breathCentre, 1.1, sampleRate);
	const breathLength = Math.min(length, Math.ceil(0.12 * sampleRate));
	const [breathLeft, breathRight] = panGains((voice.field[0] + voice.field[1]) / 2);
	for (let i = 0; i < breathLength; i++) {
		const time = i / sampleRate;
		tickSvf(breath, bipolar(random));
		const sample = breath.band * breath.k * voice.breath * note.velocity * fadeIn(time, 0.003) * Math.exp(-time / 0.03) * fadeOut(time, 0.12, 0.02);
		output.left[i] += sample * breathLeft;
		output.right[i] += sample * breathRight;
	}
	return output;
};

// The resonance of the bell, applied once to a whole section rather than to every player.
export const finishSection = (bus: Stereo, section: BrassSection, sampleRate: number): void => {
	const { bell, highpass } = voices[section];
	for (const channel of [bus.left, bus.right]) {
		filterInPlace(channel, highpassBiquad(highpass, Math.SQRT1_2, sampleRate));
		filterInPlace(channel, peakingBiquad(bell.centre, bell.q, bell.gain, sampleRate));
	}
};
