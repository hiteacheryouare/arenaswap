import type { HarmonyChange, ResolvedCue } from './arrangement';
import { createStereo, sumStereo } from './buffers';
import { masterReel } from './master';
import { renderCueLayer, renderReturns, type Sends } from './mixer';
import type { Cue, RenderedAudio } from './score';
import { eFlat, fSeven, tonic } from './theory';

type Kind = Cue['kind'];

export const reelKinds: Kind[] = ['dot', 'swap', 'whoosh', 'tick', 'confetti', 'impact', 'swell', 'riser'];

const reelSeconds = 6;
const beat = 60 / 128;

// Roughly the gain a demo cut's master applies to the raw mix, so a reel plays each effect at the
// level it will have in the film.
const reelGain = 0.33;

const hop = (at: number, step: number, pan = 0): ResolvedCue => ({ at, kind: 'dot', step, pan });
const at = (time: number, kind: Kind, extra: Partial<Cue> = {}): ResolvedCue => ({ at: time, kind, step: 0, ...extra });

const reels: Record<Kind, { cues: ResolvedCue[]; harmony: HarmonyChange[] }> = {
	dot: {
		cues: [
			hop(0.3, 0, -0.3), hop(0.77, 1, 0.1), hop(1.23, 2, 0.35), hop(1.7, 3, -0.15),
			hop(2.2, 0, -0.3), hop(2.67, 1, 0.1), hop(3.13, 2, 0.35),
			hop(3.6, 0, -0.3), hop(4.07, 2, 0.1), hop(4.53, 4, 0.35),
			hop(5.1, 0),
		],
		harmony: [{ time: 0, chord: tonic }, { time: 2.1, chord: eFlat }, { time: 3.5, chord: fSeven }, { time: 5, chord: tonic }],
	},
	swap: { cues: [0.4, 1.4, 2.4, 3.4, 4.4].map((time, index) => at(time, 'swap', { pan: [-0.3, 0.3, 0, -0.15, 0.15][index] })), harmony: [] },
	whoosh: {
		cues: [at(0.3, 'whoosh', { length: 0.47, pan: -0.5 }), at(1.6, 'whoosh', { length: 0.47, pan: 0.5 }), at(3, 'whoosh', { length: 1 })],
		harmony: [],
	},
	tick: {
		cues: [0.4, 0.55, 0.78, 0.9, 1.25, 1.31, 1.6, 2, 3, 3.12, 3.24, 3.36, 3.48, 3.6].map((time, index) => at(time, 'tick', { gain: 0.8, pan: ((index % 5) - 2) * 0.2 })),
		harmony: [],
	},
	confetti: { cues: [at(0.4, 'confetti'), at(3, 'confetti')], harmony: [{ time: 0, chord: tonic }, { time: 2.5, chord: eFlat }] },
	impact: { cues: [at(0.3, 'impact')], harmony: [] },
	swell: { cues: [at(0.3, 'swell', { length: 2.5 }), at(3.5, 'swell', { length: 1.875 })], harmony: [] },
	riser: { cues: [at(0.3, 'riser', { length: beat * 4 }), at(3.5, 'riser', { length: beat })], harmony: [] },
};

const renderSfxReel = (kind: Kind, sampleRate = 48000): RenderedAudio => {
	const length = reelSeconds * sampleRate;
	const reel = reels[kind];
	const harmony = reel.harmony.length > 0 ? reel.harmony : [{ time: 0, chord: tonic }];
	const target = createStereo(length);
	const sends: Sends = { reverb: createStereo(length), delay: createStereo(length) };
	renderCueLayer(reel.cues, harmony, target, sends, sampleRate, 1, beat * 4);
	const returns = renderReturns(sends, beat, sampleRate);
	const { left, right } = masterReel(sumStereo([target, returns.delay, returns.reverb], length), sampleRate, reelGain);
	return { sampleRate, left, right };
};

export default renderSfxReel;
