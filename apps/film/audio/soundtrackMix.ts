import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { musicBeats } from '../stage/timing';
import { createStereo, scaleStereo, sumStereo, type Stereo } from './buffers';
import { dbToGain, integratedLoudness } from './loudness';
import { masterSoundtrack } from './master';
import { renderCueLayer, renderReturns, type Sends } from './mixer';
import type { Cue, RenderedAudio } from './score';
import { soundtrack, stretch } from './soundtrack';

export const soundtrackPath = (filmDir: string) => join(filmDir, 'music', soundtrack.file);

// Where the recording sits under the effects before mastering.
const musicLufs = -19;

// The recording sped up like a record nudged faster, pitch and all, which keeps every moment of it
// exactly where the arithmetic puts it. Returns the audio and how much its seconds shrank.
const decode = (path: string, ffmpegPath: string, sampleRate: number): { audio: Stereo; stretch: number } => {
	const fastRate = Math.round(sampleRate / stretch);
	const speed = `aresample=${sampleRate},asetrate=${fastRate},aresample=${sampleRate}`;
	const { stdout, stderr, status } = spawnSync(ffmpegPath, ['-v', 'error', '-i', path, '-af', speed, '-ac', '2', '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
	if (status !== 0) throw new Error(`ffmpeg could not read ${path}: ${stderr.toString()}`);
	const samples = new Float32Array(stdout.buffer.slice(stdout.byteOffset, stdout.byteOffset + stdout.byteLength));
	const audio = createStereo(samples.length / 2);
	for (let i = 0; i < audio.left.length; i++) {
		audio.left[i] = samples[i * 2]!;
		audio.right[i] = samples[i * 2 + 1]!;
	}
	return { audio, stretch: sampleRate / fastRate };
};

const fade = (audio: Stereo, from: number, to: number, rising: boolean): void => {
	for (let i = Math.max(0, from); i < Math.min(audio.left.length, to); i++) {
		const amount = (i - from) / (to - from);
		const gain = rising ? amount : 1 - amount;
		audio.left[i] *= gain;
		audio.right[i] *= gain;
	}
};

interface Scored {
	duration: number;
	landsAt: number;
	cues: Cue[];
}

// The recording is lined up so its last hit falls where the dot lands; its beats then fall on the
// film's music grid, and whatever came before that point in the song plays from the first frame.
const renderSoundtrackMix = (cut: Scored, path: string, ffmpegPath: string, sampleRate = 48000): RenderedAudio => {
	const length = Math.round(cut.duration * sampleRate);
	const { audio: recording, stretch: shrink } = decode(path, ffmpegPath, sampleRate);
	const start = Math.round((soundtrack.finalHit * shrink - cut.landsAt) * sampleRate);
	if (start < 0) throw new Error(`The soundtrack is too short to land its last hit at ${cut.landsAt.toFixed(2)} s.`);
	const music = createStereo(length);
	const ends = Math.min(length, recording.left.length - start);
	music.left.set(recording.left.subarray(start, start + ends));
	music.right.set(recording.right.subarray(start, start + ends));
	fade(music, 0, Math.round(0.01 * sampleRate), true);
	fade(music, ends - Math.round(0.06 * sampleRate), ends, false);
	scaleStereo(music, dbToGain(musicLufs - integratedLoudness(music, sampleRate)));

	const effects = createStereo(length);
	const sends: Sends = { reverb: createStereo(length), delay: createStereo(length) };
	const cues = cut.cues
		.filter(cue => cue.at >= 0 && cue.at < cut.duration)
		.toSorted((a, b) => a.at - b.at)
		.map(cue => ({ ...cue, step: cue.step ?? 0 }));
	renderCueLayer(cues, effects, sends, sampleRate, 3, musicBeats(1));
	const returns = renderReturns(sends, musicBeats(1), sampleRate);
	const { left, right } = masterSoundtrack(sumStereo([music, effects, returns.delay, returns.reverb], length), sampleRate);
	return { sampleRate, left, right };
};

export default renderSoundtrackMix;
