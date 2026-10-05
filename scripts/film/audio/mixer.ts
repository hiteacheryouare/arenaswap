import { chordAt, type Arrangement, type DrumHit, type DrumKind, type HarmonyChange, type ResolvedCue } from './arrangement';
import { addMono, addStereo, createStereo, type Stereo } from './buffers';
import renderPingPong from './delay';
import { renderBoom, renderClap, renderCrash, renderHat, renderKick, renderSnare } from './drums';
import { duck, sidechainKey } from './dynamics';
import { curveAt, renderCurve } from './envelopes';
import { celestaPluck, feltPluck, glassPluck, renderBassNote, renderPadNote, renderPluck, stabPluck } from './instruments';
import createRandom, { hashSeed, type Random } from './random';
import renderReverb from './reverb';
import type { Cue } from './score';
import { renderConfetti, renderDot, renderImpact, renderRiser, renderSwap, renderSwell, renderTick, renderWhoosh } from './sfx';
import { midiToFrequency, type Chord } from './theory';

export interface Stems {
	drums: Stereo;
	bass: Stereo;
	pad: Stereo;
	lead: Stereo;
	fx: Stereo;
	sfx: Stereo;
	delay: Stereo;
	reverb: Stereo;
}

export const stemNames: (keyof Stems)[] = ['drums', 'bass', 'pad', 'lead', 'fx', 'sfx', 'delay', 'reverb'];

export interface Sends {
	reverb: Stereo;
	delay: Stereo;
}

type Sound = Float32Array | Stereo;

interface Routing {
	gain: number;
	pan: number;
	reverb: number;
}

const levels = {
	pad: 1,
	arp: 0.32,
	hook: 0.32,
	hookHigh: 0.3,
	stab: 0.3,
	bass: 0.65,
	riser: 0.8,
};

const drumRouting: Record<DrumKind, Routing> = {
	kick: { gain: 0.75, pan: 0, reverb: 0 },
	boom: { gain: 0.55, pan: 0, reverb: 0 },
	clap: { gain: 0.55, pan: 0, reverb: 0.12 },
	snare: { gain: 0.3, pan: 0.05, reverb: 0.15 },
	closedHat: { gain: 0.85, pan: 0.18, reverb: 0.02 },
	openHat: { gain: 0.75, pan: -0.15, reverb: 0.05 },
	crash: { gain: 0.3, pan: 0, reverb: 0.1 },
};

const cueRouting: Record<Cue['kind'], { gain: number; reverb: number; delay: number }> = {
	dot: { gain: 1.2, reverb: 0.16, delay: 0.1 },
	swap: { gain: 1, reverb: 0.05, delay: 0 },
	whoosh: { gain: 0.45, reverb: 0.12, delay: 0 },
	tick: { gain: 0.22, reverb: 0.02, delay: 0 },
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

const renderDrumHit = (hit: DrumHit, sampleRate: number, random: Random): Sound => {
	switch (hit.kind) {
		case 'kick': return renderKick(hit.velocity, sampleRate, random);
		case 'boom': return renderBoom(hit.velocity, sampleRate);
		case 'clap': return renderClap(hit.velocity, sampleRate, random);
		case 'snare': return renderSnare(hit.velocity, sampleRate, random);
		case 'closedHat': return renderHat(false, hit.velocity, sampleRate, random);
		case 'openHat': return renderHat(true, hit.velocity, sampleRate, random);
		case 'crash': return renderCrash(hit.velocity, sampleRate, random);
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

const renderStems = (arrangement: Arrangement, sampleRate: number, seed: number): Stems => {
	const length = Math.round(arrangement.duration * sampleRate);
	const [drums, bass, pad, lead, fx, sfx] = Array.from({ length: 6 }, () => createStereo(length));
	const sends: Sends = { reverb: createStereo(length), delay: createStereo(length) };
	const randomFor = (...parts: number[]): Random => createRandom(hashSeed(seed, ...parts));
	const offsetOf = (time: number): number => Math.round(time * sampleRate);

	const padCurves = {
		cutoff: renderCurve(arrangement.padCutoff, length, sampleRate, 0.05),
		gain: renderCurve(arrangement.padGain, length, sampleRate, 0.08),
	};
	arrangement.pad.forEach((note, index) => {
		place(renderPadNote(note, padCurves, sampleRate, randomFor(1, index)), offsetOf(note.time), pad, sends, levels.pad, 0, 0.45, 0);
	});

	const arpCutoff = renderCurve(arrangement.arpCutoff, length, sampleRate);
	arrangement.arp.forEach((note, index) => {
		const voice = renderPluck(note, feltPluck, sampleRate, randomFor(2, index), curveAt(arpCutoff, offsetOf(note.time)));
		place(voice, offsetOf(note.time), lead, sends, levels.arp, note.pan, 0.3, note.delay);
	});
	arrangement.hook.forEach((note, index) => {
		place(renderPluck(note, glassPluck, sampleRate, randomFor(3, index), 10000), offsetOf(note.time), lead, sends, levels.hook, note.pan, 0.22, note.delay);
	});
	arrangement.hookHigh.forEach((note, index) => {
		place(renderPluck(note, celestaPluck, sampleRate, randomFor(4, index), 5000), offsetOf(note.time), lead, sends, levels.hookHigh, note.pan, 0.3, note.delay);
	});
	arrangement.stab.forEach((note, index) => {
		place(renderPluck(note, stabPluck, sampleRate, randomFor(5, index), 7000), offsetOf(note.time), lead, sends, levels.stab, note.pan, 0.55, note.delay);
	});
	for (const note of arrangement.bass) place(renderBassNote(note, sampleRate), offsetOf(note.time), bass, sends, levels.bass, 0, 0, 0);

	arrangement.drums.forEach((hit, index) => {
		const routing = drumRouting[hit.kind];
		place(renderDrumHit(hit, sampleRate, randomFor(6, index)), offsetOf(hit.time), drums, sends, routing.gain, routing.pan, routing.reverb, 0);
	});
	arrangement.risers.forEach((riser, index) => {
		place(renderRiser(riser.length, sampleRate, randomFor(7, index)), offsetOf(riser.time), fx, sends, levels.riser * riser.gain, 0, 0.25, 0);
	});
	renderCueLayer(arrangement.cues, arrangement.harmony, sfx, sends, sampleRate, seed, arrangement.barLength);

	const returns = renderReturns(sends, arrangement.beat, sampleRate);
	const kicks = arrangement.drums.filter(hit => hit.kind === 'kick');
	const kickKey = sidechainKey(kicks, length, sampleRate, { attack: 0.003, hold: 0.02, release: 0.07 });
	duck(bass, kickKey, 0.75);
	duck(pad, kickKey, 0.3);
	duck(lead, kickKey, 0.12);
	duck(returns.reverb, kickKey, 0.25);
	duck(returns.delay, kickKey, 0.2);
	const impacts = arrangement.cues.filter(cue => cue.kind === 'impact').map(cue => ({ time: cue.at, velocity: Math.min(1, cue.gain ?? 1) }));
	const impactKey = sidechainKey(impacts, length, sampleRate, { attack: 0.005, hold: 0.1, release: 0.5 });
	for (const stem of [pad, lead, bass]) duck(stem, impactKey, 0.35);
	return { drums, bass, pad, lead, fx, sfx, delay: returns.delay, reverb: returns.reverb };
};

export default renderStems;
