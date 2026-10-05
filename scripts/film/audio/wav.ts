import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import createRandom from './random';
import type { RenderedAudio } from './score';

// Interleaved stereo PCM. 16-bit gets seeded TPDF dither (except on exact digital silence, so a
// faded-out ending stays at zero); 24-bit is rounded straight.
export const encodeWav = (audio: RenderedAudio, bitDepth: 16 | 24 = 24): Buffer => {
	const channels = 2;
	const frames = audio.left.length;
	const bytesPerSample = bitDepth / 8;
	const dataSize = frames * channels * bytesPerSample;
	const buffer = Buffer.alloc(44 + dataSize);
	buffer.write('RIFF', 0, 'ascii');
	buffer.writeUInt32LE(36 + dataSize, 4);
	buffer.write('WAVE', 8, 'ascii');
	buffer.write('fmt ', 12, 'ascii');
	buffer.writeUInt32LE(16, 16);
	buffer.writeUInt16LE(1, 20);
	buffer.writeUInt16LE(channels, 22);
	buffer.writeUInt32LE(audio.sampleRate, 24);
	buffer.writeUInt32LE(audio.sampleRate * channels * bytesPerSample, 28);
	buffer.writeUInt16LE(channels * bytesPerSample, 32);
	buffer.writeUInt16LE(bitDepth, 34);
	buffer.write('data', 36, 'ascii');
	buffer.writeUInt32LE(dataSize, 40);
	const scale = 2 ** (bitDepth - 1);
	const random = createRandom(0x5eed);
	let offset = 44;
	for (let i = 0; i < frames; i++) {
		for (const channel of [audio.left, audio.right]) {
			const sample = channel[i];
			const dither = bitDepth === 16 && sample !== 0 ? random() - random() : 0;
			const value = Math.max(-scale, Math.min(scale - 1, Math.round(sample * scale + dither)));
			if (bitDepth === 16) buffer.writeInt16LE(value, offset);
			else buffer.writeIntLE(value, offset, 3);
			offset += bytesPerSample;
		}
	}
	return buffer;
};

export const writeWav = (path: string, audio: RenderedAudio, bitDepth: 16 | 24 = 24): void => {
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, encodeWav(audio, bitDepth));
};

export default writeWav;
