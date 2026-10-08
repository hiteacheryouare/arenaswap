import arrange from './arrangement';
import masterMix from './master';
import renderStems from './mixer';

export interface Cue {
	at: number;
	kind: 'dot' | 'swap' | 'whoosh' | 'tick' | 'confetti' | 'impact' | 'swell' | 'riser';
	gain?: number;
	pan?: number;
	length?: number;
	step?: number;
}

export interface ScoreSection {
	fromBar: number;
	toBar: number;
	part: 'intro' | 'build' | 'drop' | 'groove' | 'break' | 'peak' | 'outro' | 'tail';
}

export interface ScorePlan {
	bpm: number;
	bars: number;
	sections: ScoreSection[];
	cues: Cue[];
	seed?: number;
}

export interface RenderedAudio {
	sampleRate: number;
	left: Float32Array;
	right: Float32Array;
}

const renderScore = (plan: ScorePlan, sampleRate = 48000): RenderedAudio => {
	const arrangement = arrange(plan);
	const stems = renderStems(arrangement, sampleRate, plan.seed ?? 1);
	const { left, right } = masterMix(stems, arrangement, sampleRate);
	return { sampleRate, left, right };
};

export default renderScore;
