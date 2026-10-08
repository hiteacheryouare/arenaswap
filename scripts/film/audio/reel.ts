import { musicBeats } from '../stage/timing';
import type { ResolvedCue } from './arrangement';
import { createStereo, sumStereo } from './buffers';
import { masterReel } from './master';
import { renderCueLayer, renderReturns, type Sends } from './mixer';
import type { Cue, RenderedAudio } from './score';

type Kind = Cue['kind'];

export const reelKinds: Kind[] = ['dot', 'swap', 'whoosh', 'tick', 'confetti', 'impact', 'swell', 'riser'];

const reelSeconds = 6;
const beat = musicBeats(1);

// Roughly the gain a demo cut's master applies to the raw mix, so a reel plays each effect at the
// level it will have in the film.
const reelGain = 0.33;

const hop = (at: number, step: number, pan = 0): ResolvedCue => ({ at, kind: 'dot', step, pan });
const at = (time: number, kind: Kind, extra: Partial<Cue> = {}): ResolvedCue => ({ at: time, kind, step: 0, ...extra });

const reels: Record<Kind, ResolvedCue[]> = {
	dot: [0, 1, 2, 3, 4, 5].map(step => hop(0.3 + step * beat, step, (step - 2.5) * 0.12)),
	swap: [0.4, 1.4, 2.4, 3.4, 4.4].map((time, index) => at(time, 'swap', { pan: [-0.3, 0.3, 0, -0.15, 0.15][index] })),
	whoosh: [at(0.3, 'whoosh', { length: beat }), at(1.6, 'whoosh', { length: beat / 2 }), at(3, 'whoosh', { length: beat * 2 })],
	tick: [0, 1, 2, 3, 4, 5, 6, 7].map(index => at(0.4 + index * beat / 2, 'tick', { gain: 0.8 })),
	confetti: [at(0.4, 'confetti'), at(3, 'confetti')],
	impact: [at(0.3, 'impact')],
	swell: [at(0.3, 'swell', { length: beat * 2 }), at(3.5, 'swell', { length: beat })],
	riser: [at(0.3, 'riser', { length: beat * 4 }), at(3.5, 'riser', { length: beat })],
};

const renderSfxReel = (kind: Kind, sampleRate = 48000): RenderedAudio => {
	const length = reelSeconds * sampleRate;
	const target = createStereo(length);
	const sends: Sends = { reverb: createStereo(length), delay: createStereo(length) };
	renderCueLayer(reels[kind], target, sends, sampleRate, 1, beat);
	const returns = renderReturns(sends, beat, sampleRate);
	const { left, right } = masterReel(sumStereo([target, returns.delay, returns.reverb], length), sampleRate, reelGain);
	return { sampleRate, left, right };
};

export default renderSfxReel;
