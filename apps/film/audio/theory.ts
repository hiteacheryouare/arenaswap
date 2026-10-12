export interface Chord {
	name: string;
	bass: number;
	low: number[];
	middle: number[];
	high: number[];
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
	scoop: number;
}

export const midiToFrequency = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

const note = (step: number, length: number, midi: number, scoop = 0): PhraseNote => ({ step, length, midi, scoop });

// Concert B-flat, where a band lives. `bass` is the sousaphones, `low` the trombones and baritones,
// `middle` the mellophones and `high` the trumpets. `bell` is the ladder the dot climbs: chord tones
// from B-flat 5, just above the trumpets, so a dot never lands inside the riff.
export const bFlat: Chord = {
	name: 'Bb',
	bass: 34,
	low: [46, 53, 58],
	middle: [62, 65],
	high: [70, 74, 77],
	bell: [82, 84, 86, 89, 91, 94],
};

export const eFlat: Chord = {
	name: 'Eb',
	bass: 39,
	low: [51, 55, 58],
	middle: [63, 67],
	high: [70, 75, 79],
	bell: [82, 84, 87, 89, 91, 94],
};

export const aFlat: Chord = {
	name: 'Ab',
	bass: 32,
	low: [44, 51, 56],
	middle: [60, 63],
	high: [68, 72, 75],
	bell: [82, 84, 87, 89, 92, 94],
};

export const fSeven: Chord = {
	name: 'F7',
	bass: 41,
	low: [53, 57, 63],
	middle: [65, 69],
	high: [72, 75, 81],
	bell: [81, 84, 87, 89, 91, 93],
};

// The last hit, with the screamers' D6 on top.
export const finale: Chord = {
	name: 'Bb',
	bass: 34,
	low: [46, 53, 58, 62],
	middle: [65, 70],
	high: [74, 77, 82, 86],
	bell: bFlat.bell,
};

// What the horns hold under the credits: B-flat with an added ninth, nothing above C5.
export const amen: Chord = {
	name: 'Bbadd9',
	bass: 34,
	low: [46, 53],
	middle: [58, 62, 65, 72],
	high: [],
	bell: bFlat.bell,
};

export const tonic = bFlat;

export const dominant = fSeven;

export const dominantSlot = 3;

// I, IV, then the rock-band bVII to IV, then V.
export const progression: ChordSpan[][] = [
	[{ offset: 0, chord: bFlat }],
	[{ offset: 0, chord: eFlat }],
	[{ offset: 0, chord: aFlat }, { offset: 0.5, chord: eFlat }],
	[{ offset: 0, chord: fSeven }],
];

export const run: PhraseNote[] = [note(12, 1, 72), note(13, 1, 74), note(14, 1, 75), note(15, 1, 76)];

// The stand tune, one bar per chord: short enough for a student section to shout back. The held
// note on step 8 smears up from the blue note a semitone under it. Steps 12 to 15 are left open for
// the low brass to answer, except on the V, which climbs into the next downbeat.
export const riff: PhraseNote[][] = [
	[note(0, 2, 77), note(3, 1, 77), note(4, 2, 79), note(6, 2, 77), note(8, 2, 74, 1), note(10, 2, 70)],
	[note(0, 2, 79), note(3, 1, 79), note(4, 2, 80), note(6, 2, 79), note(8, 2, 75, 1), note(10, 2, 70)],
	[note(0, 2, 75), note(3, 1, 75), note(4, 2, 77), note(6, 2, 75), note(8, 2, 79), note(10, 2, 77)],
	[note(0, 2, 77), note(3, 2, 79), note(6, 2, 81), note(8, 2, 75), note(10, 2, 69), ...run],
];

// The mellophones' line under the riff when the band goes big: a third or a fourth below.
export const riffHarmony: PhraseNote[][] = [
	[note(0, 2, 74), note(3, 1, 74), note(4, 2, 75), note(6, 2, 74), note(8, 2, 70, 1), note(10, 2, 65)],
	[note(0, 2, 75), note(3, 1, 75), note(4, 2, 77), note(6, 2, 75), note(8, 2, 70, 1), note(10, 2, 67)],
	[note(0, 2, 72), note(3, 1, 72), note(4, 2, 72), note(6, 2, 72), note(8, 2, 75), note(10, 2, 70)],
	[note(0, 2, 72), note(3, 2, 75), note(6, 2, 77), note(8, 2, 72), note(10, 2, 65), note(12, 1, 69), note(13, 1, 70), note(14, 1, 72), note(15, 1, 73)],
];

export const answers: PhraseNote[][] = [
	[note(12, 1, 53), note(13, 1, 55), note(14, 2, 58)],
	[note(12, 1, 58), note(13, 1, 60), note(14, 2, 63)],
	[note(12, 1, 55), note(13, 1, 56), note(14, 2, 57)],
	[],
];

// Root, third, fifth, sixth, flat seven and back down, one per eighth: the sousaphones' bounce.
export const boogie = [0, 4, 7, 9, 10, 9, 7, 4];

// The sousaphones on the V: E-flat and A after the hits, then down the scale onto the B-flat.
export const walkDown: PhraseNote[] = [note(8, 2, 39), note(10, 2, 45), note(12, 1, 41), note(13, 1, 39), note(14, 1, 38), note(15, 1, 36)];
