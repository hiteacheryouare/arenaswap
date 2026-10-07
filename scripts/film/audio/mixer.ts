import { chordAt, type Arrangement, type DrumHit, type DrumKind, type HarmonyChange, type ResolvedCue } from './arrangement';
import { brassSections, finishSection, renderBrassNote, type BrassSection } from './brass';
import { addMono, addStereo, createStereo, type Stereo } from './buffers';
import renderPingPong from './delay';
import { renderBassDrum, renderBoom, renderClick, renderCymbal, renderSizzle, renderSnare, renderTap, renderTenor } from './drums';
import { duck, sidechainKey } from './dynamics';
import { glockPluck, renderPluck } from './instruments';
import createRandom, { bipolar, hashSeed, type Random } from './random';
import renderReverb from './reverb';
import type { Cue } from './score';
import { renderConfetti, renderDot, renderImpact, renderRiser, renderSwap, renderSwell, renderTick, renderWhoosh } from './sfx';
import { midiToFrequency, type Chord } from './theory';

export interface Stems {
	drums: Stereo;
	brass: Stereo;
	lowBrass: Stereo;
	bells: Stereo;
	sfx: Stereo;
	delay: Stereo;
	reverb: Stereo;
}

export const stemNames: (keyof Stems)[] = ['drums', 'brass', 'lowBrass', 'bells', 'sfx', 'delay', 'reverb'];

export interface Sends {
	reverb: Stereo;
	delay: Stereo;
}

type Sound = Float32Array | Stereo;

interface Routing {
	gain: number;
	reverb: number;
}

// Where the whole band sits under the film's effects. The gains below only balance the band
// against itself; this keeps the effects at the level the sound-effect reels audition them at.
const bandTrim = 0.42;

const drumRouting: Record<DrumKind, Routing> = {
	snare: { gain: 0.75, reverb: 0.12 },
	rimshot: { gain: 0.85, reverb: 0.14 },
	buzz: { gain: 0.55, reverb: 0.1 },
	click: { gain: 0.55, reverb: 0.06 },
	tenor: { gain: 0.88, reverb: 0.12 },
	bass: { gain: 0.45, reverb: 0.05 },
	crash: { gain: 1.7, reverb: 0.1 },
	choke: { gain: 1.4, reverb: 0.06 },
	tap: { gain: 0.9, reverb: 0.08 },
	sizzle: { gain: 1, reverb: 0.1 },
	boom: { gain: 0.55, reverb: 0 },
};

// Three snares on every note, a hair apart and spread a little: the line, not one drummer.
const snareLine = [
	{ pan: -0.22, offset: 0.0014, tune: 0.985 },
	{ pan: 0.02, offset: 0, tune: 1 },
	{ pan: 0.24, offset: 0.0026, tune: 1.016 },
];

const tenorPans = [-0.45, -0.15, 0.15, 0.45];
const bassPans = [-0.5, -0.25, 0, 0.25, 0.5];
const cymbalPans = [-0.55, 0.55];

const brassRouting: Record<BrassSection, Routing & { stem: 'brass' | 'lowBrass' }> = {
	trumpet: { stem: 'brass', gain: 0.58, reverb: 0.16 },
	screamer: { stem: 'brass', gain: 0.45, reverb: 0.22 },
	mellophone: { stem: 'brass', gain: 0.52, reverb: 0.18 },
	trombone: { stem: 'lowBrass', gain: 0.42, reverb: 0.14 },
	baritone: { stem: 'lowBrass', gain: 0.38, reverb: 0.14 },
	sousaphone: { stem: 'lowBrass', gain: 0.55, reverb: 0.04 },
};

const bellRouting = { gain: 0.3, reverb: 0.3, delay: 0.08 };

const cueRouting: Record<Cue['kind'], { gain: number; reverb: number; delay: number }> = {
	dot: { gain: 1.2, reverb: 0.16, delay: 0.1 },
	swap: { gain: 1, reverb: 0.05, delay: 0 },
	whoosh: { gain: 0.45, reverb: 0.12, delay: 0 },
	tick: { gain: 0.3, reverb: 0.02, delay: 0 },
	confetti: { gain: 0.6, reverb: 0.28, delay: 0.08 },
	impact: { gain: 0.85, reverb: 0.35, delay: 0 },
	swell: { gain: 1.4, reverb: 0.18, delay: 0 },
	riser: { gain: 0.8, reverb: 0.22, delay: 0.05 },
};

const place = (sound: Sound, offset: number, bus: Stereo, sends: Sends, gain: number, pan: number, reverb: number, delay: number): void => {
	const add = sound instanceof Float32Array
		? (target: Stereo, amount: number): void => addMono(target, sound, offset, amount, pan)
		: (target: Stereo, amount: number): void => addStereo(target, sound, offset, amount, pan);
	add(bus, gain);
	if (reverb > 0) add(sends.reverb, gain * reverb);
	if (delay > 0) add(sends.delay, gain * delay);
};

const placeDrum = (hit: DrumHit, bus: Stereo, sends: Sends, sampleRate: number, random: Random): void => {
	const { reverb } = drumRouting[hit.kind];
	const gain = drumRouting[hit.kind].gain * bandTrim;
	const offset = Math.round(hit.time * sampleRate);
	const add = (sound: Sound, pan: number, at = offset): void => place(sound, at, bus, sends, gain, pan, reverb, 0);
	switch (hit.kind) {
		case 'snare':
		case 'rimshot':
			for (const player of snareLine) {
				const stroke = { velocity: hit.velocity * (0.93 + 0.07 * random()), rim: hit.kind === 'rimshot', press: false, tune: player.tune };
				add(renderSnare(stroke, sampleRate, random), player.pan, offset + Math.round(player.offset * sampleRate));
			}
			return;
		case 'buzz': return add(renderSnare({ velocity: hit.velocity, rim: false, press: true, tune: 0.97 + 0.06 * random() }, sampleRate, random), 0.3 * bipolar(random));
		case 'click': return add(renderClick(hit.velocity, sampleRate, random), 0.1);
		case 'tenor': return add(renderTenor(hit.drum, hit.velocity, sampleRate, random), tenorPans[hit.drum]);
		case 'bass': return add(renderBassDrum(hit.drum, hit.velocity, sampleRate, random), bassPans[hit.drum]);
		case 'crash': return add(renderCymbal(hit.velocity, false, sampleRate, random), cymbalPans[hit.drum]);
		case 'choke': return add(renderCymbal(hit.velocity, true, sampleRate, random), cymbalPans[hit.drum]);
		case 'tap': return add(renderTap(hit.velocity, sampleRate, random), cymbalPans[hit.drum] * 0.6);
		case 'sizzle': return add(renderSizzle(hit.length, hit.velocity, sampleRate, random), 0);
		case 'boom': return add(renderBoom(hit.velocity, sampleRate), 0);
	}
};

const renderCueSound = (cue: ResolvedCue, chord: Chord, sampleRate: number, random: Random, barLength: number): Sound => {
	switch (cue.kind) {
		case 'dot': return renderDot(midiToFrequency(chord.bell[cue.step % chord.bell.length]), sampleRate, random);
		case 'swap': return renderSwap(sampleRate, random);
		case 'whoosh': return renderWhoosh(cue.length ?? 0.5, cue.pan ?? 0, sampleRate, random);
		case 'tick': return renderTick(sampleRate, random);
		case 'confetti': return renderConfetti(chord, sampleRate, random);
		case 'impact': return renderImpact(sampleRate, random);
		case 'swell': return renderSwell(cue.length ?? 2, sampleRate, random);
		case 'riser': return renderRiser(cue.length ?? barLength, sampleRate, random);
	}
};

const cueKinds = Object.keys(cueRouting);

// Each cue's noise is seeded by its own time and kind, so editing one cue never re-rolls the others.
export const renderCueLayer = (cues: ResolvedCue[], harmony: HarmonyChange[], target: Stereo, sends: Sends, sampleRate: number, seed: number, barLength: number): void => {
	for (const cue of cues) {
		const routing = cueRouting[cue.kind];
		const random = createRandom(hashSeed(seed, 50, cueKinds.indexOf(cue.kind), Math.round(cue.at * 48000)));
		const sound = renderCueSound(cue, chordAt(harmony, cue.at), sampleRate, random, barLength);
		const pan = cue.kind === 'whoosh' ? 0 : cue.pan ?? 0;
		place(sound, Math.round(cue.at * sampleRate), target, sends, routing.gain * (cue.gain ?? 1), pan, routing.reverb, routing.delay);
	}
};

export const renderReturns = (sends: Sends, beat: number, sampleRate: number): Sends => {
	const delay = renderPingPong(sends.delay, sampleRate, { time: beat * 0.75, feedback: 0.38, lowpass: 4200, highpass: 280 });
	addStereo(sends.reverb, delay, 0, 0.3);
	const reverb = renderReverb(sends.reverb, sampleRate, {
		decay: 2.6,
		preDelay: 0.024,
		damping: 5500,
		size: 1,
		modulation: 0.25,
		lowCut: 160,
		highCut: 9000,
	});
	return { reverb, delay };
};

// The dot, the swap and the ticks are the film talking, so the band leans out of their way for a
// moment: the brass most, the drums a little.
const cueDucks: Partial<Record<Cue['kind'], number>> = { dot: 1, swap: 1, tick: 0.5 };

const renderStems = (arrangement: Arrangement, sampleRate: number, seed: number): Stems => {
	const length = Math.round(arrangement.duration * sampleRate);
	const [drums, brass, lowBrass, bells, sfx] = Array.from({ length: 5 }, () => createStereo(length));
	const stems = { brass, lowBrass };
	const sends: Sends = { reverb: createStereo(length), delay: createStereo(length) };
	const randomFor = (...parts: number[]): Random => createRandom(hashSeed(seed, ...parts));
	const offsetOf = (time: number): number => Math.round(time * sampleRate);

	arrangement.drums.forEach((hit, index) => placeDrum(hit, drums, sends, sampleRate, randomFor(6, index)));

	for (const section of brassSections) {
		const bus = createStereo(length);
		arrangement.brass.forEach((note, index) => {
			if (note.section === section) addStereo(bus, renderBrassNote(note, sampleRate, randomFor(10, index)), offsetOf(note.time), 1);
		});
		finishSection(bus, section, sampleRate);
		const routing = brassRouting[section];
		addStereo(stems[routing.stem], bus, 0, routing.gain * bandTrim);
		addStereo(sends.reverb, bus, 0, routing.gain * bandTrim * routing.reverb);
	}

	arrangement.bells.forEach((note, index) => {
		const voice = renderPluck(note, glockPluck, sampleRate, randomFor(4, index));
		place(voice, offsetOf(note.time), bells, sends, bellRouting.gain * bandTrim, note.pan, bellRouting.reverb, bellRouting.delay);
	});

	renderCueLayer(arrangement.cues, arrangement.harmony, sfx, sends, sampleRate, seed, arrangement.barLength);

	const returns = renderReturns(sends, arrangement.beat, sampleRate);
	const cueHits = arrangement.cues.flatMap(cue => {
		const depth = cueDucks[cue.kind];
		return depth === undefined ? [] : [{ time: cue.at - 0.005, velocity: depth }];
	});
	const cueKey = sidechainKey(cueHits, length, sampleRate, { attack: 0.005, hold: 0.07, release: 0.15 });
	duck(brass, cueKey, 0.4);
	duck(lowBrass, cueKey, 0.2);
	duck(drums, cueKey, 0.3);
	duck(bells, cueKey, 0.6);
	return { drums, brass, lowBrass, bells, sfx, delay: returns.delay, reverb: returns.reverb };
};

export default renderStems;
