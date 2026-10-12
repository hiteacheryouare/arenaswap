export type Random = () => number;

// mulberry32: tiny, fast and good enough for audio noise; the same seed always yields the same stream.
const createRandom = (seed: number): Random => {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let value = state;
		value = Math.imul(value ^ (value >>> 15), value | 1);
		value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
		return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
	};
};

export const hashSeed = (...parts: number[]): number => {
	let hash = 2166136261;
	for (const part of parts) {
		hash = Math.imul(hash ^ (part | 0), 16777619);
		hash ^= hash >>> 13;
	}
	return hash >>> 0;
};

export const bipolar = (random: Random): number => random() * 2 - 1;

export const between = (random: Random, min: number, max: number): number => min + (max - min) * random();

export default createRandom;
