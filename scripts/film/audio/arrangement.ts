import type { BrassNote, BrassSection, BrassShape } from './brass';
import cadences, { rollOut, type Cadence } from './cadences';
import { lerp } from './envelopes';
import createRandom, { bipolar, hashSeed, type Random } from './random';
import type { Cue, ScorePlan, ScoreSection } from './score';
import {
	amen,
	answers,
	boogie,
	dominant,
	dominantSlot,
	finale,
	progression,
	riff,
	riffHarmony,
	run,
	walkDown,
	type Chord,
	type ChordSpan,
	type PhraseNote,
} from './theory';

export type Part = ScoreSection['part'];
export type Lead = 'none' | 'drop' | 'peak' | 'outro';
export type DrumKind = 'snare' | 'rimshot' | 'buzz' | 'click' | 'tenor' | 'bass' | 'crash' | 'choke' | 'tap' | 'sizzle' | 'boom';

export interface Bar {
	index: number;
	start: number;
	end: number;
	part: Part;
	slot: number;
	sectionStart: boolean;
	sectionEnd: number;
	progress: number;
	progressEnd: number;
	lead: Lead;
}

export interface NoteEvent {
	time: number;
	duration: number;
	midi: number;
	velocity: number;
	pan: number;
}

// `drum` is the tenor (0 to 3, high to low), the bass drum (0 to 4) or the cymbal player (0 or 1).
// `length` is how long a sizzle rises.
export interface DrumHit {
	time: number;
	kind: DrumKind;
	velocity: number;
	drum: number;
	length: number;
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
	drums: DrumHit[];
	brass: BrassNote[];
	bells: NoteEvent[];
	cues: ResolvedCue[];
	fadeLength: number;
}

interface BarShape {
	part: Part;
	sectionStart: boolean;
	progress: number;
	progressEnd: number;
}

const restarts = new Set<Part>(['build', 'drop', 'peak']);
const homeParts = new Set<Part>(['intro', 'outro', 'tail']);

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
	if (shape.part === 'outro' || shape.part === 'tail' || !next?.sectionStart) return 'none';
	if (next.part === 'drop' || next.part === 'peak' || next.part === 'outro') return next.part;
	return 'none';
};

// Builds, drops and peaks start the loop on the I, and whatever bar leads into a drop, a peak or the
// outro is pulled onto the V so every arrival is a resolution. The intro, outro and tail stay home.
const buildBars = (shapes: BarShape[], barLength: number): Bar[] => {
	let slot = 0;
	const bars = shapes.map((shape, index): Bar => {
		slot = index === 0 || (shape.sectionStart && restarts.has(shape.part)) ? 0 : (slot + 1) % progression.length;
		const lead = leadFor(shape, shapes[index + 1]);
		const arrival = shape.sectionStart && (shape.part === 'drop' || shape.part === 'peak');
		if (homeParts.has(shape.part) || index === shapes.length - 1) slot = 0;
		if (lead !== 'none' && !arrival) slot = dominantSlot;
		const start = index * barLength;
		return {
			index,
			start,
			end: start + barLength,
			part: shape.part,
			slot,
			sectionStart: shape.sectionStart,
			sectionEnd: start + barLength,
			progress: shape.progress,
			progressEnd: shape.progressEnd,
			lead,
		};
	});
	for (let index = bars.length - 2; index >= 0; index--) {
		if (!bars[index + 1].sectionStart) bars[index].sectionEnd = bars[index + 1].sectionEnd;
	}
	return bars;
};

// A bar leading into a peak or the outro turns to the V halfway; the bar before a drop is all V.
const spansOf = (bar: Bar): ChordSpan[] => {
	if (bar.lead === 'drop') return [{ offset: 0, chord: dominant }];
	const spans = progression[bar.slot];
	if (bar.lead === 'none') return spans;
	return [...spans.filter(span => span.offset < 0.5), { offset: 0.5, chord: dominant }];
};

const buildHarmony = (bars: Bar[], barLength: number): HarmonyChange[] => {
	const harmony: HarmonyChange[] = [];
	for (const bar of bars) {
		for (const span of spansOf(bar)) {
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

interface Voicing {
	bar: Bar;
	sixteenth: number;
	random: Random;
}

interface Stroke {
	at: number;
	velocity: number;
	kind: DrumKind;
}

const snareStrokes: Record<string, Stroke[]> = {
	R: [{ at: 0, velocity: 1, kind: 'rimshot' }],
	A: [{ at: 0, velocity: 0.9, kind: 'snare' }],
	f: [{ at: -0.24, velocity: 0.3, kind: 'snare' }, { at: 0, velocity: 0.92, kind: 'snare' }],
	t: [{ at: 0, velocity: 0.46, kind: 'snare' }],
	g: [{ at: 0, velocity: 0.24, kind: 'snare' }],
	d: [{ at: 0, velocity: 0.5, kind: 'snare' }, { at: 0.5, velocity: 0.42, kind: 'snare' }],
	D: [{ at: 0, velocity: 0.88, kind: 'snare' }, { at: 0.5, velocity: 0.55, kind: 'snare' }],
	x: [{ at: 0, velocity: 0.6, kind: 'click' }],
};

const stepsOf = (pattern: string): string[] => [...pattern.replaceAll(' ', '')];

const cadenceFor = (bar: Bar): Cadence | null => {
	if (bar.lead === 'drop') return cadences.setup;
	switch (bar.part) {
		case 'intro':
			if (bar.index === 0) return cadences.rollIn;
			return bar.progressEnd === 1 ? cadences.streetTurn : cadences.street;
		case 'build':
			return bar.progress < 0.4 ? cadences.climb : cadences.climbHard;
		case 'drop':
		case 'groove':
			if (bar.slot === dominantSlot) return cadences.turnaround;
			return bar.slot === 1 ? cadences.grooveAlt : cadences.groove;
		case 'break':
			return cadences.pulse;
		case 'peak':
			return bar.slot === dominantSlot ? cadences.peakTurn : cadences.peak;
		case 'outro':
			return bar.sectionStart ? cadences.hit : null;
		case 'tail':
			return null;
	}
};

const linesOf = (bar: Bar): Record<keyof Cadence, string[]> | null => {
	const cadence = cadenceFor(bar);
	if (!cadence) return null;
	const rolling = bar.lead === 'peak' || bar.lead === 'outro';
	const line = (name: keyof Cadence): string[] => (rolling ? [...stepsOf(cadence[name]).slice(0, 8), ...stepsOf(rollOut[name])] : stepsOf(cadence[name]));
	return { snare: line('snare'), tenors: line('tenors'), basses: line('basses'), cymbals: line('cymbals') };
};

const drumLevel = (bar: Bar): number => {
	switch (bar.part) {
		case 'intro': return lerp(1.05, 1.1, bar.progress);
		case 'build': return lerp(0.95, 1, bar.progress);
		case 'break': return 0.85;
		case 'peak': return 1.08;
		case 'outro': return 1.15;
		default: return 1;
	}
};

const runsOf = (line: string[], symbol: string): [number, number][] => {
	const runs: [number, number][] = [];
	line.forEach((value, step) => {
		if (value !== symbol) return;
		const last = runs[runs.length - 1];
		if (last && last[1] === step) last[1] = step + 1;
		else runs.push([step, step + 1]);
	});
	return runs;
};

// A press roll: bounces about 17 ms apart, swelling from piano to forte when it is long enough to
// be heading somewhere.
const voiceRoll = ({ bar, sixteenth, random }: Voicing, [from, to]: [number, number], level: number, drums: DrumHit[]): void => {
	const start = bar.start + from * sixteenth;
	const end = bar.start + to * sixteenth;
	const swelling = to - from >= 4;
	for (let time = start; time < end - 0.008; time += 0.017 * (0.75 + 0.5 * random())) {
		const progress = (time - start) / (end - start);
		const velocity = swelling ? 0.28 + 0.67 * progress ** 1.6 : 0.5;
		drums.push({ time, kind: 'buzz', velocity: velocity * level * (0.85 + 0.3 * random()), drum: 0, length: 0 });
	}
};

const voiceDrums = (voicing: Voicing, drums: DrumHit[]): void => {
	const { bar, sixteenth, random } = voicing;
	const lines = linesOf(bar);
	if (!lines) return;
	const level = drumLevel(bar);
	const hit = (kind: DrumKind, step: number, velocity: number, drum = 0, length = 0): void => {
		const time = Math.max(0, bar.start + step * sixteenth + 0.0008 * bipolar(random));
		drums.push({ time, kind, velocity: velocity * level * (1 + 0.04 * bipolar(random)), drum, length });
	};
	lines.snare.forEach((symbol, step) => {
		for (const stroke of snareStrokes[symbol] ?? []) hit(stroke.kind, step + stroke.at, stroke.velocity);
	});
	for (const span of runsOf(lines.snare, 'z')) voiceRoll(voicing, span, level, drums);
	lines.tenors.forEach((symbol, step) => {
		const drum = 'abcd'.indexOf(symbol.toLowerCase());
		if (drum >= 0) hit('tenor', step, symbol === symbol.toUpperCase() ? 0.95 : 0.55, drum);
	});
	lines.basses.forEach((symbol, step) => {
		if (symbol === 'U') for (let drum = 0; drum < 5; drum++) hit('bass', step, 1, drum);
		const drum = '12345'.indexOf(symbol);
		if (drum >= 0) hit('bass', step, 0.85, drum);
	});
	let player = bar.index % 2;
	lines.cymbals.forEach((symbol, step) => {
		if (symbol === 'C') {
			hit('crash', step, 0.9, 0);
			hit('crash', step, 0.9, 1);
		}
		if (symbol === 'k') hit('choke', step, 0.85, player++ % 2);
		if (symbol === 's') hit('tap', step, 0.4, player++ % 2);
		if (symbol === 'S') {
			const next = lines.cymbals.findIndex((other, index) => index > step && other !== '.');
			hit('sizzle', step, 0.7, 0, ((next < 0 ? 16 : next) - step) * sixteenth);
		}
	});
	const arrival = bar.sectionStart && (bar.part === 'drop' || bar.part === 'peak' || bar.part === 'outro');
	if (arrival) {
		hit('boom', 0, 1);
		if (lines.cymbals[0] !== 'C') {
			hit('crash', 0, 0.9, 0);
			hit('crash', 0, 0.9, 1);
		}
	} else if (bar.part === 'groove' && bar.slot === 0) {
		hit('crash', 0, 0.65, bar.index % 2);
	}
};

interface Player {
	section: BrassSection;
	transpose: number;
	velocity: number;
}

const articulate = (length: number, sixteenth: number): number => length * sixteenth * (length === 1 ? 0.62 : 0.78);

const playPhrase = (bar: Bar, sixteenth: number, phrase: PhraseNote[], players: Player[], brass: BrassNote[], until = 16, fallAt = -1): void => {
	for (const note of phrase) {
		if (note.step >= until) continue;
		const time = bar.start + note.step * sixteenth;
		const duration = articulate(Math.min(note.length, until - note.step), sixteenth);
		const accent = note.step % 4 === 0 ? 1.06 : 1;
		for (const player of players) {
			brass.push({
				time,
				duration,
				midi: note.midi + player.transpose,
				velocity: player.velocity * accent,
				section: player.section,
				shape: 'held',
				scoop: note.scoop,
				fall: note.step === fallAt ? 3 : 0,
			});
		}
	}
};

type Choir = 'bass' | 'low' | 'middle' | 'high';

// A chord split across the band the way an arranger would: two players to a note, the baritones
// doubling the bottom, the screamers taking anything above C6.
const voiceChord = (time: number, duration: number, chord: Chord, choirs: Choir[], velocity: number, shape: BrassShape, brass: BrassNote[]): void => {
	const push = (section: BrassSection, midi: number, players?: number): void => {
		brass.push({ time, duration, midi, velocity, section, shape, scoop: 0, fall: 0, players });
	};
	if (choirs.includes('bass')) push('sousaphone', chord.bass);
	if (choirs.includes('low')) {
		chord.low.forEach((midi, index) => {
			push('trombone', midi, 2);
			if (index === 0) push('baritone', midi);
		});
	}
	if (choirs.includes('middle')) for (const midi of chord.middle) push('mellophone', midi, 2);
	if (choirs.includes('high')) for (const midi of chord.high) push(midi > 84 ? 'screamer' : 'trumpet', midi, midi > 84 ? undefined : 2);
};

const hemiola = [0, 3, 6];

const playBoogie = (bar: Bar, sixteenth: number, velocity: number, brass: BrassNote[], until: number): void => {
	const spans = spansOf(bar);
	for (let eighth = 0; eighth * 2 < until; eighth++) {
		const span = spans.findLast(candidate => candidate.offset * 8 <= eighth) ?? spans[0];
		brass.push({
			time: bar.start + eighth * 2 * sixteenth,
			duration: sixteenth * 1.5,
			midi: span.chord.bass + boogie[(eighth - span.offset * 8) % boogie.length],
			velocity: velocity * (eighth % 2 === 0 ? 1 : 0.82),
			section: 'sousaphone',
			shape: 'held',
			scoop: 0,
			fall: 0,
		});
	}
};

const playBass = (bar: Bar, sixteenth: number, velocity: number, brass: BrassNote[], until: number): void => {
	if (bar.slot !== dominantSlot) {
		playBoogie(bar, sixteenth, velocity, brass, until);
		return;
	}
	for (const step of hemiola) voiceChord(bar.start + step * sixteenth, articulate(2, sixteenth), dominant, ['bass'], velocity, 'held', brass);
	playPhrase(bar, sixteenth, walkDown, [{ section: 'sousaphone', transpose: 0, velocity }], brass, until);
};

// The second half of any bar that leads somewhere: the band swells on the V while the trumpets
// climb into the downbeat.
const voiceSwell = (bar: Bar, sixteenth: number, brass: BrassNote[]): void => {
	const half = bar.start + 8 * sixteenth;
	voiceChord(half, bar.end - 0.03 - half, dominant, ['bass', 'low', 'middle'], 1, 'swell', brass);
	voiceChord(half, 4 * sixteenth - 0.02, dominant, ['high'], 0.9, 'swell', brass);
	playPhrase(bar, sixteenth, run, [{ section: 'trumpet', transpose: 0, velocity: 1 }], brass);
};

// The bar before a drop: three hemiola hits on the V, then the swell.
const voiceSetup = (bar: Bar, sixteenth: number, brass: BrassNote[]): void => {
	playPhrase(bar, sixteenth, riff[dominantSlot], [{ section: 'trumpet', transpose: 0, velocity: 1 }], brass, 8);
	for (const step of hemiola) voiceChord(bar.start + step * sixteenth, articulate(2, sixteenth), dominant, ['bass', 'low', 'middle'], 1, 'held', brass);
	voiceSwell(bar, sixteenth, brass);
};

// The last hit rings on into the tail (or past the end, where the master's fade takes it).
const voiceFinale = (bar: Bar, brass: BrassNote[]): void => {
	voiceChord(bar.start, bar.sectionEnd - bar.start + 0.8, finale, ['bass', 'low', 'middle', 'high'], 1.1, 'ring', brass);
};

const voiceAmen = (bar: Bar, brass: BrassNote[]): void => {
	const duration = Math.max(1, bar.sectionEnd - bar.start - 0.4);
	const hold = (section: BrassSection, midi: number, velocity: number, players?: number): void => {
		brass.push({ time: bar.start, duration, midi, velocity, section, shape: 'held', scoop: 0, fall: 0, players, attack: 0.9 });
	};
	hold('sousaphone', amen.bass, 0.3);
	for (const midi of amen.low) hold('baritone', midi, 0.32, 2);
	for (const midi of amen.middle) hold('mellophone', midi, 0.3, 2);
};

const voiceBrass = ({ bar, sixteenth }: Voicing, brass: BrassNote[], bells: NoteEvent[]): void => {
	if (bar.lead === 'drop') {
		voiceSetup(bar, sixteenth, brass);
		return;
	}
	const until = bar.lead === 'none' ? 16 : 8;
	const phrase = riff[bar.slot];
	const fallAt = bar.slot === 1 ? 10 : -1;
	switch (bar.part) {
		case 'build': {
			const level = lerp(0.6, 0.85, bar.progress);
			playPhrase(bar, sixteenth, phrase, [{ section: 'trombone', transpose: -24, velocity: level }, { section: 'baritone', transpose: -24, velocity: level }], brass, until);
			if (bar.progress >= 0.4) playPhrase(bar, sixteenth, phrase, [{ section: 'mellophone', transpose: -12, velocity: level - 0.05 }], brass, until);
			playBass(bar, sixteenth, level, brass, until);
			break;
		}
		case 'drop':
		case 'groove':
			playPhrase(bar, sixteenth, phrase, [{ section: 'trumpet', transpose: 0, velocity: 0.92 }, { section: 'mellophone', transpose: -12, velocity: 0.78 }], brass, until, fallAt);
			if (bar.slot === dominantSlot) {
				for (const step of hemiola) voiceChord(bar.start + step * sixteenth, articulate(2, sixteenth), dominant, ['low'], 0.95, 'held', brass);
			} else {
				playPhrase(bar, sixteenth, answers[bar.slot], [{ section: 'trombone', transpose: 0, velocity: 0.9 }, { section: 'baritone', transpose: 0, velocity: 0.85 }], brass, until);
			}
			playBass(bar, sixteenth, 0.85, brass, until);
			break;
		case 'break':
			voiceChord(bar.start, articulate(3, sixteenth), spansOf(bar)[0].chord, ['bass'], 0.65, 'held', brass);
			break;
		case 'peak':
			playPhrase(bar, sixteenth, phrase, [
				{ section: 'trumpet', transpose: 0, velocity: 1 },
				{ section: 'trombone', transpose: -24, velocity: 0.9 },
				{ section: 'baritone', transpose: -24, velocity: 0.9 },
			], brass, until, fallAt);
			playPhrase(bar, sixteenth, phrase.filter(note => note.length >= 2), [{ section: 'screamer', transpose: 12, velocity: 0.7 }], brass, until);
			playPhrase(bar, sixteenth, riffHarmony[bar.slot], [{ section: 'mellophone', transpose: 0, velocity: 0.9 }], brass, until);
			playPhrase(bar, sixteenth, answers[bar.slot], [{ section: 'trombone', transpose: 0, velocity: 1 }, { section: 'baritone', transpose: 0, velocity: 0.95 }], brass, until);
			playBass(bar, sixteenth, 0.95, brass, until);
			for (const note of phrase) {
				if (note.step % 4 === 0 && note.step < until) bells.push({ time: bar.start + note.step * sixteenth, duration: 0.3, midi: note.midi + 24, velocity: 0.6, pan: 0.3 });
			}
			break;
		case 'outro':
			if (bar.sectionStart) voiceFinale(bar, brass);
			break;
		case 'tail':
			if (bar.sectionStart) voiceAmen(bar, brass);
			break;
		case 'intro':
			break;
	}
	if (bar.lead !== 'none') voiceSwell(bar, sixteenth, brass);
};

const tickMaskers = new Set<DrumKind>(['snare', 'rimshot', 'buzz', 'click', 'tenor', 'tap']);

// The ticks share the snare's top end, so right under one the soft strokes are left out and the
// accents are played at half strength, off the rim.
const clearForTicks = (drums: DrumHit[], cues: Cue[]): DrumHit[] => {
	const ticks = cues.filter(cue => cue.kind === 'tick').map(cue => cue.at);
	return drums.flatMap(hit => {
		if (!tickMaskers.has(hit.kind)) return [hit];
		if (!ticks.some(at => hit.time > at - 0.03 && hit.time < at + 0.05)) return [hit];
		if (hit.velocity < 0.6) return [];
		return [{ ...hit, kind: hit.kind === 'rimshot' ? 'snare' : hit.kind, velocity: hit.velocity * 0.5 }];
	});
};

const sortByTime = (cues: Cue[]): Cue[] => cues
	.map((cue, index) => ({ cue, index }))
	.toSorted((a, b) => a.cue.at - b.cue.at || a.index - b.index)
	.map(({ cue }) => cue);

// Each hop takes the next chord tone above the previous hop, so the climb keeps rising across chord
// changes; past the top it starts again from the bottom rung, as does a gap longer than a bar. An
// explicit `step` picks that rung of the current chord directly. `step` comes out as an index into
// chord.bell.
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

// The credits fade the whole tail away; an outro ends on a short fade; anything else gets a bar.
const fadeLengthOf = (bars: Bar[], barLength: number, duration: number): number => {
	const last = bars[bars.length - 1];
	if (last.part === 'tail') return duration - (bars.findLast(bar => bar.part === 'tail' && bar.sectionStart)?.start ?? last.start);
	return last.part === 'outro' ? 1.2 : barLength;
};

const arrange = (plan: ScorePlan): Arrangement => {
	const beat = 60 / plan.bpm;
	const barLength = beat * 4;
	const sixteenth = beat / 4;
	const duration = plan.bars * barLength;
	const random = createRandom(hashSeed(plan.seed ?? 1, 7));
	const bars = buildBars(shapeBars(plan), barLength);
	const harmony = buildHarmony(bars, barLength);
	const drums: DrumHit[] = [];
	const brass: BrassNote[] = [];
	const bells: NoteEvent[] = [];
	for (const bar of bars) {
		const voicing: Voicing = { bar, sixteenth, random };
		voiceDrums(voicing, drums);
		voiceBrass(voicing, brass, bells);
	}
	return {
		duration,
		beat,
		barLength,
		bars,
		harmony,
		drums: clearForTicks(drums, plan.cues),
		brass,
		bells,
		cues: resolveCues(plan, bars, harmony, beat, barLength, duration),
		fadeLength: fadeLengthOf(bars, barLength, duration),
	};
};

const demoBpm = 128;
const beats = (count: number): number => count * 60 / demoBpm;
const atBar = (number: number): number => beats((number - 1) * 4);

const sectionsOf = (layout: [number, number, Part][]): ScoreSection[] => layout.map(([fromBar, toBar, part]) => ({ fromBar, toBar, part }));

const flick = (from: number, count: number): Cue[] => Array.from({ length: count }, (_, index) => ({ at: from + beats(index * 0.5), kind: 'tick', gain: 0.8 }));

// The sign-off: five dots climbing the ladder over the end card, then the last one home.
const signOff = (endAt: number, squeeze = 1): Cue[] => [
	...[9.4, 8.4, 7.4, 6.4, 5.4].map((count, step): Cue => ({ at: endAt - beats(count * squeeze), kind: 'dot', step })),
	{ at: endAt - beats(3.6 * squeeze), kind: 'dot', step: 0, gain: 1.2 },
];

// Laid out the way the cuts in stage/cuts lay theirs out, so an audition sounds like the film.
export const demoPlans: Record<'15' | '30' | '60', ScorePlan> = {
	15: {
		bpm: demoBpm,
		bars: 8,
		seed: 15,
		sections: sectionsOf([[1, 3, 'intro'], [4, 4, 'drop'], [5, 5, 'groove'], [6, 6, 'peak'], [7, 8, 'outro']]),
		cues: [
			{ at: 0.15, kind: 'dot', step: 0 },
			{ at: 0.7, kind: 'whoosh', length: 0.5, gain: 0.5 },
			{ at: atBar(2) - 0.2, kind: 'whoosh', length: 0.6 },
			...flick(atBar(2) + beats(2), 4),
			{ at: atBar(3), kind: 'whoosh', length: 0.5, pan: 0.4 },
			{ at: atBar(4), kind: 'dot', step: 1 },
			{ at: atBar(4) + 0.2, kind: 'whoosh', length: 0.5 },
			{ at: atBar(5) - 0.6, kind: 'whoosh', length: 0.4, gain: 0.6, pan: 0.3 },
			{ at: atBar(5), kind: 'swap' },
			{ at: atBar(6) + beats(1.8), kind: 'swell', length: 1.8 },
			{ at: atBar(6) + beats(2), kind: 'confetti', gain: 1.2 },
			{ at: atBar(7), kind: 'dot', step: 4 },
			...signOff(atBar(9), 8 / 12),
		],
	},
	30: {
		bpm: demoBpm,
		bars: 16,
		seed: 30,
		sections: sectionsOf([[1, 3, 'intro'], [4, 7, 'build'], [8, 8, 'drop'], [9, 11, 'groove'], [12, 12, 'break'], [13, 13, 'peak'], [14, 16, 'outro']]),
		cues: [
			{ at: 0.2, kind: 'dot', step: 0 },
			{ at: 1, kind: 'whoosh', length: 0.6, gain: 0.5 },
			{ at: atBar(3) - 0.25, kind: 'whoosh', length: 0.7 },
			...flick(atBar(4), 8),
			{ at: atBar(5), kind: 'whoosh', length: 0.5, pan: 0.4 },
			{ at: atBar(7) + beats(0.5), kind: 'tick' },
			{ at: atBar(7) + beats(2.5), kind: 'tick' },
			{ at: atBar(8), kind: 'dot', step: 1 },
			{ at: atBar(8) + 0.2, kind: 'whoosh', length: 0.5 },
			{ at: atBar(9) + beats(3) - 0.6, kind: 'whoosh', length: 0.4, gain: 0.6, pan: 0.3 },
			{ at: atBar(9) + beats(3), kind: 'swap' },
			{ at: atBar(11) - 0.15, kind: 'whoosh', length: 0.35, gain: 0.55 },
			{ at: atBar(12), kind: 'dot', step: 5 },
			{ at: atBar(13) + beats(1.8), kind: 'swell', length: 2 },
			{ at: atBar(13) + beats(2), kind: 'confetti', gain: 1.2 },
			{ at: atBar(14), kind: 'dot', step: 4 },
			{ at: atBar(14) + beats(0.4), kind: 'whoosh', length: 0.7 },
			...signOff(atBar(17)),
		],
	},
	60: {
		bpm: demoBpm,
		bars: 37,
		seed: 60,
		sections: sectionsOf([
			[1, 2, 'intro'],
			[3, 7, 'build'],
			[8, 8, 'drop'],
			[9, 24, 'groove'],
			[25, 25, 'break'],
			[26, 29, 'peak'],
			[30, 32, 'outro'],
			[33, 37, 'tail'],
		]),
		cues: [
			{ at: 0.2, kind: 'dot', step: 0 },
			{ at: 1, kind: 'whoosh', length: 0.6, gain: 0.5 },
			{ at: atBar(2) - 0.25, kind: 'whoosh', length: 0.7 },
			...flick(atBar(2) + beats(0.5), 7),
			{ at: atBar(3), kind: 'whoosh', length: 0.5, pan: 0.4 },
			{ at: atBar(6) + beats(0.5), kind: 'tick' },
			{ at: atBar(6) + beats(2.5), kind: 'tick' },
			{ at: atBar(8), kind: 'dot', step: 1 },
			{ at: atBar(8) + 0.2, kind: 'whoosh', length: 0.5 },
			{ at: atBar(9) + beats(1) - 0.6, kind: 'whoosh', length: 0.4, gain: 0.6, pan: 0.3 },
			...[atBar(9) + beats(1), atBar(10) + beats(3), atBar(12) + beats(1), atBar(13) + beats(3)].map((at): Cue => ({ at, kind: 'swap' })),
			{ at: atBar(12) + beats(2.6), kind: 'swell', length: 1.2, gain: 0.6 },
			...[15, 16, 17, 18, 20, 21, 23, 24].map((number): Cue => ({ at: atBar(number) - 0.15, kind: 'whoosh', length: 0.35, gain: 0.55 })),
			{ at: atBar(21) + beats(0.5), kind: 'tick' },
			{ at: atBar(21) + beats(2.5), kind: 'swap' },
			{ at: atBar(24) + 1, kind: 'dot', step: 2 },
			{ at: atBar(25), kind: 'dot', step: 3 },
			{ at: atBar(25) + 0.2, kind: 'whoosh', length: 0.5 },
			{ at: atBar(26) + beats(1.5), kind: 'dot', step: 5 },
			{ at: atBar(28) + beats(1), kind: 'confetti' },
			{ at: atBar(29) + beats(0.3), kind: 'swell', length: 2 },
			{ at: atBar(29) + beats(0.5), kind: 'confetti', gain: 1.2 },
			{ at: atBar(30), kind: 'dot', step: 4 },
			{ at: atBar(30) + beats(0.5), kind: 'whoosh', length: 0.7 },
			...signOff(atBar(33)),
		],
	},
};

export default arrange;
