import type { Arrangement, DrumHit } from './arrangement';
import { gainToDb, integratedLoudness, samplePeak, truePeak } from './loudness';
import type { Cue, RenderedAudio } from './score';

export interface TimeWindow {
	from: number;
	to: number;
}

export interface AudioReport {
	samples: number;
	seconds: number;
	integratedLufs: number;
	truePeakDb: number;
	samplePeakDb: number;
	dcOffset: [number, number];
	maxJump: number;
	maxJumpAt: number;
	clicksOutside: number[];
	clicksInside: number;
	tailPeakDb: number;
	lastSample: [number, number];
}

const drumSpan = (hit: DrumHit): number => {
	switch (hit.kind) {
		case 'snare': return 0.25;
		case 'rimshot': return 0.33;
		case 'buzz': return 0.13;
		case 'click': return 0.05;
		case 'tenor': return 0.56;
		case 'bass': return 0.9;
		case 'crash': return 3;
		case 'choke': return 0.27;
		case 'tap': return 0.29;
		case 'sizzle': return hit.length + 0.02;
		case 'boom': return 0.9;
	}
};

const cueSpan = (cue: Cue, barLength: number): number => {
	switch (cue.kind) {
		case 'dot': return 0.01;
		case 'swap': return 0.14;
		case 'tick': return 0.035;
		case 'confetti': return 1;
		case 'impact': return 0.5;
		case 'whoosh': return cue.length ?? 0.5;
		case 'swell': return cue.length ?? 2;
		case 'riser': return cue.length ?? barLength;
	}
};

// Everything percussive or noise-based, for its full sounding length: a jump inside one of these is
// the sound itself, not a fault.
export const transientWindows = (arrangement: Arrangement): TimeWindow[] => [
	...arrangement.drums.map(hit => ({ from: hit.time - 0.002, to: hit.time + 0.003 + drumSpan(hit) })),
	...arrangement.cues.map(cue => ({ from: cue.at - 0.002, to: cue.at + cueSpan(cue, arrangement.barLength) })),
];

const maskOf = (windows: TimeWindow[], length: number, sampleRate: number): Uint8Array => {
	const mask = new Uint8Array(length);
	for (const window of windows) {
		const from = Math.max(0, Math.floor(window.from * sampleRate));
		const to = Math.min(length, Math.ceil(window.to * sampleRate));
		mask.fill(1, from, to);
	}
	return mask;
};

// A click is a second-difference spike far above its own neighbourhood: noise and bright content
// raise the neighbourhood with them, a discontinuity does not.
const findClicks = (channel: Float32Array, sampleRate: number): number[] => {
	const length = channel.length;
	const curvature = new Float64Array(length);
	for (let i = 2; i < length; i++) curvature[i] = channel[i] - 2 * channel[i - 1] + channel[i - 2];
	const energy = new Float64Array(length + 1);
	for (let i = 0; i < length; i++) energy[i + 1] = energy[i] + curvature[i] ** 2;
	const radius = Math.round(0.002 * sampleRate);
	const found: number[] = [];
	let lastFound = -Infinity;
	for (let i = radius + 2; i < length - radius - 2; i++) {
		const value = Math.abs(curvature[i]);
		if (value < 0.003) continue;
		const around = energy[i + radius + 1] - energy[i - radius] - (energy[i + 3] - energy[i - 2]);
		const rms = Math.sqrt(around / (2 * radius - 4));
		if (value > 12 * rms && i - lastFound > 0.005 * sampleRate) {
			found.push(i);
			lastFound = i;
		}
	}
	return found;
};

export interface ArcPoint {
	time: number;
	bar: number;
	part: string;
	lufs: number;
}

// Loudness of every half bar: the quickest way to see whether a plan's energy arc reads as intended.
export const loudnessArc = (audio: RenderedAudio, arrangement: Arrangement): ArcPoint[] => {
	const half = arrangement.barLength / 2;
	const points: ArcPoint[] = [];
	for (let index = 0; index < arrangement.bars.length * 2; index++) {
		const from = Math.round(index * half * audio.sampleRate);
		const to = Math.min(audio.left.length, Math.round((index + 1) * half * audio.sampleRate));
		const bar = arrangement.bars[index >> 1];
		const lufs = integratedLoudness({ left: audio.left.subarray(from, to), right: audio.right.subarray(from, to) }, audio.sampleRate);
		points.push({ time: index * half, bar: bar.index + 1, part: bar.part, lufs });
	}
	return points;
};

const analyzeAudio = (audio: RenderedAudio, windows: TimeWindow[]): AudioReport => {
	const { sampleRate, left, right } = audio;
	const length = left.length;
	const mask = maskOf(windows, length, sampleRate);
	let sumLeft = 0;
	let sumRight = 0;
	let maxJump = 0;
	let maxJumpAt = 0;
	for (let i = 0; i < length; i++) {
		sumLeft += left[i];
		sumRight += right[i];
		if (i === 0 || mask[i]) continue;
		const jump = Math.max(Math.abs(left[i] - left[i - 1]), Math.abs(right[i] - right[i - 1]));
		if (jump > maxJump) {
			maxJump = jump;
			maxJumpAt = i / sampleRate;
		}
	}
	const clicks = [...findClicks(left, sampleRate), ...findClicks(right, sampleRate)].toSorted((a, b) => a - b);
	const tailStart = length - Math.round(0.05 * sampleRate);
	let tailPeak = 0;
	for (let i = tailStart; i < length; i++) tailPeak = Math.max(tailPeak, Math.abs(left[i]), Math.abs(right[i]));
	return {
		samples: length,
		seconds: length / sampleRate,
		integratedLufs: integratedLoudness(audio, sampleRate),
		truePeakDb: gainToDb(truePeak(audio)),
		samplePeakDb: gainToDb(samplePeak(audio)),
		dcOffset: [sumLeft / length, sumRight / length],
		maxJump,
		maxJumpAt,
		clicksOutside: clicks.filter(index => !mask[index]).map(index => index / sampleRate),
		clicksInside: clicks.filter(index => mask[index]).length,
		tailPeakDb: gainToDb(tailPeak),
		lastSample: [left[length - 1], right[length - 1]],
	};
};

export default analyzeAudio;
