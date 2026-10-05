import { lerp, type Keyframe } from './envelopes';
import createRandom, { bipolar, hashSeed, type Random } from './random';
import type { Cue, ScorePlan, ScoreSection } from './score';
import {
	arpEighths,
	arpSixteenths,
	bassPattern,
	dominantSlot,
	hookPhrases,
	progression,
	stabVoicing,
	tonic,
	type Chord,
	type ChordSpan,
} from './theory';

export type Part = ScoreSection['part'];
export type DrumKind = 'kick' | 'boom' | 'clap' | 'snare' | 'closedHat' | 'openHat' | 'crash';
export type Lead = 'none' | 'drop' | 'peak' | 'outro';

export interface Bar {
	index: number;
	start: number;
	end: number;
	part: Part;
	slot: number;
	sectionStart: boolean;
	progress: number;
	progressEnd: number;
	lead: Lead;
	gapFrom: number | null;
}

export interface NoteEvent {
	time: number;
	duration: number;
	midi: number;
	velocity: number;
	pan: number;
	delay: number;
}

export interface PadNote {
	time: number;
	duration: number;
	midi: number;
	release: number;
}

export interface DrumHit {
	time: number;
	kind: DrumKind;
	velocity: number;
}

export interface RiserEvent {
	time: number;
	length: number;
	gain: number;
}

export interface HarmonyChange {
	time: number;
	chord: Chord;
}

export interface ResolvedCue extends Cue {
	step: number;
}

export interface Arrangement {
	duration: number;
	beat: number;
	barLength: number;
	bars: Bar[];
	harmony: HarmonyChange[];
	pad: PadNote[];
	arp: NoteEvent[];
	hook: NoteEvent[];
	hookHigh: NoteEvent[];
	stab: NoteEvent[];
	bass: NoteEvent[];
	drums: DrumHit[];
	risers: RiserEvent[];
	cues: ResolvedCue[];
	padCutoff: Keyframe[];
	padGain: Keyframe[];
	arpCutoff: Keyframe[];
	fadeLength: number;
}

interface BarShape {
	part: Part;
	sectionStart: boolean;
	progress: number;
	progressEnd: number;
}

const grooveParts = new Set<Part>(['drop', 'groove', 'peak']);
const drumParts = new Set<Part>(['build', 'drop', 'groove', 'peak']);

const padCutoffRange: Record<Part, [number, number]> = {
	intro: [950, 1500],
	build: [1500, 4800],
	drop: [4800, 4800],
	groove: [4800, 4800],
	break: [2600, 2200],
	peak: [6000, 6000],
	outro: [2800, 1200],
};

const padGainRange: Record<Part, [number, number]> = {
	intro: [0.72, 0.78],
	build: [0.62, 0.78],
	drop: [0.62, 0.62],
	groove: [0.62, 0.62],
	break: [0.6, 0.6],
	peak: [0.75, 0.75],
	outro: [0.85, 0.85],
};

const arpCutoffRange: Record<Part, [number, number]> = {
	intro: [800, 1300],
	build: [1300, 5200],
	drop: [5200, 5200],
	groove: [5200, 5200],
	break: [2400, 2400],
	peak: [5200, 5200],
	outro: [1800, 1800],
};

const shapeBars = (plan: ScorePlan): BarShape[] => {
	const shapes: (BarShape | null)[] = Array.from({ length: plan.bars }, () => null);
	const sections = plan.sections.toSorted((a, b) => a.fromBar - b.fromBar);
	for (const section of sections) {
		const from = Math.max(1, Math.round(section.fromBar));
		const to = Math.min(plan.bars, Math.round(section.toBar));
		const length = to - from + 1;
		for (let bar = from; bar <= to; bar++) {
			shapes[bar - 1] = {
				part: section.part,
				sectionStart: bar === from,
				progress: (bar - from) / length,
				progressEnd: (bar - from + 1) / length,
			};
		}
	}
	// Bars no section claims carry on with whatever came before, so a sparse plan still plays.
	let previous: BarShape = { part: 'intro', sectionStart: true, progress: 0, progressEnd: 1 };
	return shapes.map((shape, index) => {
		previous = shape ?? { part: previous.part, sectionStart: index === 0, progress: 1, progressEnd: 1 };
		return previous;
	});
};

const leadFor = (shape: BarShape, next: BarShape | undefined): Lead => {
	if (shape.part === 'outro' || !next?.sectionStart) return 'none';
	if (next.part === 'drop' || next.part === 'peak' || next.part === 'outro') return next.part;
	return 'none';
};

// Drops and peaks restart the loop on the tonic, and whatever bar leads into them (or into the
// outro) is forced onto the V so every arrival is a resolution.
const buildBars = (shapes: BarShape[], barLength: number): Bar[] => {
	let slot = 0;
	return shapes.map((shape, index) => {
		const arrival = shape.sectionStart && (shape.part === 'drop' || shape.part === 'peak');
		if (index > 0) slot = arrival ? 0 : (slot + 1) % progression.length;
		const lead = leadFor(shape, shapes[index + 1]);
		if (lead !== 'none') slot = dominantSlot;
		if (shape.part === 'outro' || index === shapes.length - 1) slot = 0;
		const start = index * barLength;
		return {
			index,
			start,
			end: start + barLength,
			part: shape.part,
			slot,
			sectionStart: shape.sectionStart,
			progress: shape.progress,
			progressEnd: shape.progressEnd,
			lead,
			gapFrom: lead === 'drop' ? start + barLength / 2 : null,
		};
	});
};

const buildHarmony = (bars: Bar[], barLength: number): HarmonyChange[] => {
	const harmony: HarmonyChange[] = [];
	for (const bar of bars) {
		const final = bar.part === 'outro' || bar.index === bars.length - 1;
		const spans: ChordSpan[] = final ? [{ offset: 0, chord: tonic }] : progression[bar.slot];
		for (const span of spans) {
			if (harmony[harmony.length - 1]?.chord === span.chord) continue;
			harmony.push({ time: bar.start + span.offset * barLength, chord: span.chord });
		}
	}
	return harmony;
};

export const chordAt = (harmony: HarmonyChange[], time: number): Chord => {
	let low = 0;
	let high = harmony.length - 1;
	while (low < high) {
		const middle = (low + high + 1) >> 1;
		if (harmony[middle].time <= time + 1e-9) low = middle;
		else high = middle - 1;
	}
	return harmony[low].chord;
};

// Voices that keep their pitch across a chord change are held, not re-struck.
const buildPad = (harmony: HarmonyChange[], duration: number): PadNote[] => {
	const notes: PadNote[] = [];
	const open: { midi: number; time: number }[] = [];
	for (const change of harmony) {
		change.chord.pad.forEach((midi, voice) => {
			const current = open[voice];
			if (current?.midi === midi) return;
			if (current) notes.push({ time: current.time, duration: change.time - current.time + 0.04, midi: current.midi, release: 0.35 });
			open[voice] = { midi, time: change.time };
		});
	}
	const lastChange = harmony[harmony.length - 1].time;
	const end = Math.max(lastChange + 0.6, duration - 1.7);
	for (const current of open) notes.push({ time: current.time, duration: end - current.time, midi: current.midi, release: 0.42 });
	return notes;
};

const audible = (bar: Bar, time: number): boolean => bar.gapFrom === null || time < bar.gapFrom - 1e-6;

const clipToGap = (bar: Bar, time: number, duration: number): number => (
	bar.gapFrom === null ? duration : Math.min(duration, bar.gapFrom - time)
);

interface Voicing {
	bar: Bar;
	sixteenth: number;
	harmony: HarmonyChange[];
	random: Random;
}

const voiceDrums = ({ bar, sixteenth, random }: Voicing, drums: DrumHit[]): void => {
	const hit = (kind: DrumKind, step: number, velocity: number, jitter = 0): void => {
		const time = bar.start + step * sixteenth;
		if (audible(bar, time)) drums.push({ time, kind, velocity: velocity * (1 + jitter * bipolar(random)) });
	};
	const offbeats = [2, 6, 10, 14];
	const ghosts = [1, 3, 5, 7, 9, 11, 13, 15];
	const { part } = bar;
	if (part === 'build') {
		for (let beat = 0; beat < 4; beat++) hit('kick', beat * 4, 0.45 + 0.3 * bar.progress);
		for (const step of offbeats) hit('closedHat', step, 0.45, 0.08);
		if (bar.progress >= 0.5) for (const step of ghosts) hit('closedHat', step, 0.16, 0.15);
	}
	if (grooveParts.has(part)) {
		for (let beat = 0; beat < 4; beat++) hit('kick', beat * 4, 1);
		hit('clap', 4, 0.85);
		hit('clap', 12, 0.85);
		if (part === 'peak') {
			hit('snare', 4, 0.5);
			hit('snare', 12, 0.5);
		}
		for (const step of offbeats) hit(part === 'peak' ? 'openHat' : 'closedHat', step, part === 'peak' ? 0.55 : 0.75, 0.06);
		for (const step of ghosts) hit('closedHat', step, part === 'peak' ? 0.3 : 0.2, 0.2);
		if (bar.sectionStart && part !== 'groove') {
			hit('crash', 0, 0.7);
			hit('boom', 0, part === 'peak' ? 1 : 0.85);
		}
	}
	if (part === 'outro' && bar.sectionStart) {
		hit('kick', 0, 1);
		hit('crash', 0, 0.8);
	}
	if (!drumParts.has(part)) return;
	if (bar.lead === 'drop') [0, 2, 4, 5, 6, 7].forEach((step, index) => hit('snare', step, 0.3 + 0.09 * index));
	if (bar.lead === 'peak') [12, 13, 14, 15].forEach((step, index) => hit('snare', step, 0.45 + 0.13 * index));
};

const voiceBass = ({ bar, sixteenth, harmony }: Voicing, bass: NoteEvent[], barLength: number, duration: number): void => {
	if (bar.part === 'build') {
		const time = bar.start;
		bass.push({ time, duration: clipToGap(bar, time, barLength - 0.06), midi: chordAt(harmony, time).bass, velocity: 0.6 + 0.2 * bar.progress, pan: 0, delay: 0 });
	}
	if (grooveParts.has(bar.part)) {
		for (const note of bassPattern) {
			const time = bar.start + note.step * sixteenth;
			if (!audible(bar, time)) continue;
			bass.push({
				time,
				duration: clipToGap(bar, time, note.length * sixteenth * 0.85),
				midi: chordAt(harmony, time).bass + note.interval,
				velocity: note.velocity,
				pan: 0,
				delay: 0,
			});
		}
	}
	if (bar.part === 'outro' && bar.sectionStart) {
		bass.push({ time: bar.start, duration: Math.max(0.2, Math.min(barLength * 1.5, duration - bar.start - 1.2)), midi: tonic.bass, velocity: 0.8, pan: 0, delay: 0 });
	}
};

const voiceArp = ({ bar, sixteenth, harmony, random }: Voicing, arp: NoteEvent[]): void => {
	if (bar.part !== 'intro' && bar.part !== 'build') return;
	const sixteenths = bar.part === 'build' && bar.progress >= 0.5;
	const pattern = sixteenths ? arpSixteenths : arpEighths;
	const spacing = sixteenths ? 1 : 2;
	const level = bar.part === 'intro' ? 0.42 : 0.45 + 0.2 * bar.progress;
	pattern.forEach((rung, position) => {
		const step = position * spacing;
		const time = bar.start + step * sixteenth;
		if (!audible(bar, time)) return;
		const ladder = chordAt(harmony, time).arp;
		arp.push({
			time,
			duration: clipToGap(bar, time, spacing * sixteenth * 0.9),
			midi: ladder[Math.min(rung, ladder.length - 1)],
			velocity: level * (step % 4 === 0 ? 1 : 0.82) * (1 + 0.05 * bipolar(random)),
			pan: (rung / 6 - 0.5) * 0.7,
			delay: 0.22,
		});
	});
};

const voiceHook = ({ bar, sixteenth, random }: Voicing, hook: NoteEvent[], hookHigh: NoteEvent[]): void => {
	if (!grooveParts.has(bar.part) && bar.part !== 'break') return;
	hookPhrases[bar.slot].forEach((note, index) => {
		const time = bar.start + note.step * sixteenth;
		if (!audible(bar, time)) return;
		const pan = index % 2 === 0 ? -0.12 : 0.12;
		const event: NoteEvent = {
			time,
			duration: clipToGap(bar, time, note.length * sixteenth * 0.92),
			midi: note.midi,
			velocity: (note.step === 0 ? 0.92 : 0.8) * (bar.part === 'break' ? 0.7 : 1) * (1 + 0.04 * bipolar(random)),
			pan,
			delay: (note.length >= 6 ? 0.42 : 0.12) * (bar.part === 'break' ? 1.4 : 1),
		};
		hook.push(event);
		if (bar.part === 'peak') hookHigh.push({ ...event, midi: note.midi + 12, velocity: event.velocity * 0.55, pan: -pan * 3, delay: 0.2 });
	});
};

const voiceStab = (bar: Bar, stab: NoteEvent[], duration: number): void => {
	if (bar.part !== 'outro' || !bar.sectionStart) return;
	const top = stabVoicing.length - 1;
	stabVoicing.forEach((midi, index) => {
		const time = bar.start + index * 0.012;
		stab.push({
			time,
			duration: Math.max(0.4, duration - time - 1.4),
			midi,
			velocity: index === top ? 0.35 : 0.7,
			pan: (index / top - 0.5) * 0.8,
			delay: index === top ? 0.35 : 0.08,
		});
	});
};

const buildRisers = (bars: Bar[], beat: number, barLength: number, cues: Cue[]): RiserEvent[] => {
	const risers: RiserEvent[] = [];
	for (const bar of bars) {
		if (bar.lead === 'drop') risers.push({ time: bar.start, length: barLength / 2, gain: 0.6 });
		if (bar.lead === 'peak') {
			risers.push(drumParts.has(bar.part)
				? { time: bar.end - beat, length: beat, gain: 0.6 }
				: { time: bar.start, length: barLength, gain: 0.8 });
		}
	}
	// A riser the film already asked for wins over the automatic one in the same spot.
	const planned = cues.filter(cue => cue.kind === 'riser');
	return risers.filter(riser => !planned.some(cue => {
		const end = cue.at + (cue.length ?? barLength);
		return cue.at < riser.time + riser.length && end > riser.time;
	}));
};

const buildAutomation = (bars: Bar[]): { padCutoff: Keyframe[]; padGain: Keyframe[]; arpCutoff: Keyframe[] } => {
	const padCutoff: Keyframe[] = [];
	const padGain: Keyframe[] = [];
	const arpCutoff: Keyframe[] = [];
	const glide = 0.03;
	for (const bar of bars) {
		const [padFrom, padTo] = padCutoffRange[bar.part];
		const [arpFrom, arpTo] = arpCutoffRange[bar.part];
		const [gainFrom, gainTo] = padGainRange[bar.part];
		const settled = bar.end - glide;
		padCutoff.push({ time: bar.start, value: lerp(padFrom, padTo, bar.progress) });
		arpCutoff.push({ time: bar.start, value: lerp(arpFrom, arpTo, bar.progress) }, { time: settled, value: lerp(arpFrom, arpTo, bar.progressEnd) });
		padGain.push({ time: bar.start, value: lerp(gainFrom, gainTo, bar.progress) });
		if (bar.gapFrom === null) {
			padCutoff.push({ time: settled, value: lerp(padFrom, padTo, bar.progressEnd) });
			padGain.push({ time: settled, value: lerp(gainFrom, gainTo, bar.progressEnd) });
			continue;
		}
		// The half bar before a drop: everything else has stopped, and the pad sinks and darkens under it.
		const middle = (bar.progress + bar.progressEnd) / 2;
		padCutoff.push({ time: bar.gapFrom, value: lerp(padFrom, padTo, middle) }, { time: bar.gapFrom + 0.3, value: 700 }, { time: settled, value: 600 });
		padGain.push({ time: bar.gapFrom, value: lerp(gainFrom, gainTo, middle) }, { time: bar.gapFrom + 0.25, value: 0.22 }, { time: settled, value: 0.22 });
	}
	return { padCutoff, padGain, arpCutoff };
};

const sortByTime = (cues: Cue[]): Cue[] => cues
	.map((cue, index) => ({ cue, index }))
	.toSorted((a, b) => a.cue.at - b.cue.at || a.index - b.index)
	.map(({ cue }) => cue);

// Each hop takes the next chord tone above the previous hop, so the climb keeps rising across chord
// changes; past the top it starts again from the root, as does a gap longer than a bar. An explicit
// `step` picks that tone of the current chord directly. `step` comes out as an index into chord.bell.
const resolveCues = (plan: ScorePlan, bars: Bar[], harmony: HarmonyChange[], beat: number, barLength: number, duration: number): ResolvedCue[] => {
	const cues = sortByTime(plan.cues.filter(cue => Number.isFinite(cue.at) && cue.at >= 0 && cue.at < duration));
	const outroStart = bars.find(bar => bar.part === 'outro' && bar.sectionStart)?.start;
	const needsImpact = outroStart !== undefined && !cues.some(cue => cue.kind === 'impact' && Math.abs(cue.at - outroStart) <= beat);
	const withImpact = needsImpact ? sortByTime([...cues, { at: outroStart, kind: 'impact' }]) : cues;
	let lastPitch = -Infinity;
	let lastDot = -Infinity;
	return withImpact.map(cue => {
		if (cue.kind !== 'dot') return { ...cue, step: 0 };
		const ladder = chordAt(harmony, cue.at).bell;
		if (cue.at - lastDot > barLength + 1e-6) lastPitch = -Infinity;
		const above = ladder.findIndex(midi => midi > lastPitch);
		const step = cue.step === undefined ? Math.max(0, above) : Math.max(0, Math.round(cue.step)) % ladder.length;
		lastPitch = ladder[step];
		lastDot = cue.at;
		return { ...cue, step };
	});
};

const arrange = (plan: ScorePlan): Arrangement => {
	const beat = 60 / plan.bpm;
	const barLength = beat * 4;
	const sixteenth = beat / 4;
	const duration = plan.bars * barLength;
	const random = createRandom(hashSeed(plan.seed ?? 1, 7));
	const bars = buildBars(shapeBars(plan), barLength);
	const harmony = buildHarmony(bars, barLength);
	const arp: NoteEvent[] = [];
	const hook: NoteEvent[] = [];
	const hookHigh: NoteEvent[] = [];
	const stab: NoteEvent[] = [];
	const bass: NoteEvent[] = [];
	const drums: DrumHit[] = [];
	for (const bar of bars) {
		const voicing: Voicing = { bar, sixteenth, harmony, random };
		voiceDrums(voicing, drums);
		voiceBass(voicing, bass, barLength, duration);
		voiceArp(voicing, arp);
		voiceHook(voicing, hook, hookHigh);
		voiceStab(bar, stab, duration);
	}
	const lastPart = bars[bars.length - 1].part;
	return {
		duration,
		beat,
		barLength,
		bars,
		harmony,
		pad: buildPad(harmony, duration),
		arp,
		hook,
		hookHigh,
		stab,
		bass,
		drums,
		risers: buildRisers(bars, beat, barLength, plan.cues),
		cues: resolveCues(plan, bars, harmony, beat, barLength, duration),
		...buildAutomation(bars),
		fadeLength: lastPart === 'outro' ? 1.2 : barLength,
	};
};

const demoBpm = 128;
const beats = (count: number): number => count * 60 / demoBpm;

const sectionsOf = (layout: [number, number, Part][]): ScoreSection[] => layout.map(([fromBar, toBar, part]) => ({ fromBar, toBar, part }));

const ticks = (times: number[]): Cue[] => times.map((at, index) => ({ at, kind: 'tick', gain: 0.8, pan: [-0.4, 0.3, -0.1, 0.45, -0.3, 0.2][index % 6] }));

const dots = (beatTimes: number[]): Cue[] => beatTimes.map((at, index) => ({ at: beats(at), kind: 'dot', pan: [-0.3, 0.1, 0.35, -0.15][index % 4] }));

const transition = (beat: number, pan = 0): Cue[] => [
	{ at: beats(beat) - 0.47, kind: 'whoosh', length: 0.47, pan },
	{ at: beats(beat), kind: 'swap' },
];

// Into a drop the whoosh stays short and soft, so the half bar of near-silence before it survives.
const dropTransition = (beat: number, pan = 0): Cue[] => [
	{ at: beats(beat) - 0.3, kind: 'whoosh', length: 0.3, gain: 0.6, pan },
	{ at: beats(beat), kind: 'swap' },
];

export const demoPlans: Record<'15' | '30' | '60', ScorePlan> = {
	15: {
		bpm: demoBpm,
		bars: 8,
		seed: 15,
		sections: sectionsOf([[1, 2, 'intro'], [3, 3, 'drop'], [4, 6, 'groove'], [7, 8, 'outro']]),
		cues: [
			...ticks([0.62, 0.95, 1.41, 1.83, 2.34]),
			...dropTransition(8, 0.2),
			...dots([9, 11, 13]),
			...transition(16, -0.2),
			...dots([17, 18, 19]),
			{ at: beats(20), kind: 'confetti' },
			{ at: beats(24) - 0.47, kind: 'whoosh', length: 0.47 },
			{ at: beats(24), kind: 'impact' },
			{ at: beats(27), kind: 'dot', step: 0 },
		],
	},
	30: {
		bpm: demoBpm,
		bars: 16,
		seed: 30,
		sections: sectionsOf([[1, 3, 'intro'], [4, 7, 'build'], [8, 8, 'drop'], [9, 13, 'groove'], [14, 16, 'outro']]),
		cues: [
			...ticks([0.9, 1.25, 1.9, 2.6, 3.05, 3.7, 4.4, 4.9]),
			...transition(12, -0.25),
			...dots([14, 16, 18]),
			...transition(20, 0.25),
			...dots([22, 24, 25]),
			{ at: beats(26.5), kind: 'dot', step: 0 },
			...dropTransition(28),
			...dots([29, 31, 33, 35, 37]),
			...transition(40, -0.2),
			...dots([41, 43, 45]),
			{ at: beats(48), kind: 'confetti' },
			{ at: beats(52) - 0.47, kind: 'whoosh', length: 0.47 },
			{ at: beats(52), kind: 'impact' },
			{ at: beats(55), kind: 'dot', step: 0 },
		],
	},
	60: {
		bpm: demoBpm,
		bars: 32,
		seed: 60,
		sections: sectionsOf([
			[1, 6, 'intro'],
			[7, 12, 'build'],
			[13, 13, 'drop'],
			[14, 20, 'groove'],
			[21, 21, 'break'],
			[22, 28, 'peak'],
			[29, 32, 'outro'],
		]),
		cues: [
			...ticks([0.8, 1.3, 1.7, 2.45, 2.9, 3.6, 4.4, 4.75, 5.6, 6.3, 6.9, 7.7, 8.5, 9.2, 9.9, 10.6]),
			{ at: 3.9, kind: 'swap', gain: 0.6, pan: -0.3 },
			{ at: 6.05, kind: 'swap', gain: 0.6, pan: 0.35 },
			{ at: 8.2, kind: 'swap', gain: 0.6, pan: -0.1 },
			{ at: 10.1, kind: 'swap', gain: 0.6, pan: 0.2 },
			...transition(24, 0.2),
			...dots([26, 28, 30]),
			...transition(32, -0.2),
			...dots([34, 36, 38]),
			...transition(40),
			...dots([43, 44, 45]),
			...dropTransition(48, 0.15),
			...dots([49, 51, 53, 55, 57]),
			...transition(60, -0.25),
			...dots([61, 63, 65]),
			...transition(68, 0.25),
			...dots([70, 72, 74, 76]),
			{ at: beats(80), kind: 'swell', length: beats(4), gain: 0.9 },
			{ at: beats(84), kind: 'swap' },
			...dots([86, 88, 90, 92]),
			{ at: beats(96), kind: 'confetti' },
			...dots([98, 100, 102]),
			...transition(104, -0.15),
			...dots([106, 108, 110]),
			{ at: beats(112) - 0.47, kind: 'whoosh', length: 0.47 },
			{ at: beats(112), kind: 'impact' },
			{ at: beats(115), kind: 'dot', step: 0 },
		],
	},
};

export default arrange;
