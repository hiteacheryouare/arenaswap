export interface Chord {
	name: string;
	bass: number;
	pad: number[];
	arp: number[];
	bell: number[];
}

export interface ChordSpan {
	offset: number;
	chord: Chord;
}

export interface PhraseNote {
	step: number;
	length: number;
	midi: number;
}

export interface BassStep {
	step: number;
	length: number;
	interval: number;
	velocity: number;
}

export const midiToFrequency = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

// Pad voicings keep A3 and F#4 as common tones so only the inner voice and root move between bars.
// `bell` is the ladder the dot climbs: step 0 is the root, and every ladder tops out at F#6.
export const dMajor9: Chord = {
	name: 'Dmaj9',
	bass: 38,
	pad: [50, 57, 61, 64, 66],
	arp: [62, 66, 69, 73, 76, 78, 81],
	bell: [74, 78, 81, 85, 88, 90],
};

export const bMinor11: Chord = {
	name: 'Bm11',
	bass: 35,
	pad: [47, 57, 62, 64, 66],
	arp: [59, 62, 66, 69, 73, 76, 78],
	bell: [71, 74, 78, 81, 85, 86, 90],
};

export const gMajor9: Chord = {
	name: 'Gmaj9',
	bass: 31,
	pad: [43, 57, 59, 62, 66],
	arp: [55, 59, 62, 66, 69, 71, 74],
	bell: [67, 71, 74, 78, 81, 83, 86, 90],
};

export const aSixSus4: Chord = {
	name: 'A6sus4',
	bass: 33,
	pad: [45, 57, 62, 64, 66],
	arp: [57, 62, 64, 66, 69, 74, 76],
	bell: [69, 74, 76, 78, 81, 86, 88, 90],
};

export const aSix: Chord = {
	name: 'A6',
	bass: 33,
	pad: [45, 57, 61, 64, 66],
	arp: [57, 61, 64, 66, 69, 73, 76],
	bell: [69, 73, 76, 78, 81, 85, 88, 90],
};

export const tonic = dMajor9;

export const dominantSlot = 3;

export const progression: ChordSpan[][] = [
	[{ offset: 0, chord: dMajor9 }],
	[{ offset: 0, chord: bMinor11 }],
	[{ offset: 0, chord: gMajor9 }],
	[{ offset: 0, chord: aSixSus4 }, { offset: 0.5, chord: aSix }],
];

// A call on the I and IV bars, an answer that hangs (and throws into the delay) on the vi and V.
// The V answer holds the sus4 over the resolution and only lands on C# at step 10.
export const hookPhrases: PhraseNote[][] = [
	[
		{ step: 0, length: 3, midi: 78 },
		{ step: 3, length: 3, midi: 76 },
		{ step: 6, length: 4, midi: 81 },
		{ step: 10, length: 2, midi: 78 },
		{ step: 12, length: 4, midi: 76 },
	],
	[
		{ step: 0, length: 3, midi: 74 },
		{ step: 3, length: 3, midi: 78 },
		{ step: 6, length: 10, midi: 76 },
	],
	[
		{ step: 0, length: 3, midi: 78 },
		{ step: 3, length: 3, midi: 74 },
		{ step: 6, length: 4, midi: 81 },
		{ step: 10, length: 2, midi: 78 },
		{ step: 12, length: 4, midi: 83 },
	],
	[
		{ step: 0, length: 3, midi: 76 },
		{ step: 3, length: 3, midi: 78 },
		{ step: 6, length: 4, midi: 74 },
		{ step: 10, length: 6, midi: 73 },
	],
];

export const bassPattern: BassStep[] = [
	{ step: 0, length: 2, interval: 0, velocity: 0.95 },
	{ step: 3, length: 2, interval: 0, velocity: 0.8 },
	{ step: 6, length: 2, interval: 0, velocity: 0.85 },
	{ step: 10, length: 1, interval: 12, velocity: 0.6 },
	{ step: 11, length: 2, interval: 0, velocity: 0.8 },
	{ step: 14, length: 2, interval: 0, velocity: 0.85 },
];

export const arpEighths = [0, 2, 1, 3, 2, 4, 3, 5];

export const arpSixteenths = [0, 2, 4, 2, 1, 3, 5, 3, 2, 4, 6, 4, 3, 5, 4, 2];

export const stabVoicing = [62, 69, 73, 76, 78, 86];
