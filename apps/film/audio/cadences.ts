export const snareSymbols = {
	rimshot: 'R',
	accent: 'A',
	flam: 'f',
	tap: 't',
	ghost: 'g',
	diddle: 'd',
	accentedDiddle: 'D',
	rimClick: 'x',
	buzzRoll: 'z',
} as const;

export const tenorDrums = 'abcd';
export const bassDrums = '12345';
export const bassUnison = 'U';

export const cymbalSymbols = {
	crash: 'C',
	choke: 'k',
	tap: 's',
	sizzle: 'S',
} as const;

export interface Cadence {
	snare: string;
	tenors: string;
	basses: string;
	cymbals: string;
}

const cadences = {
	rollIn: {
		snare: 'zzzz zzzz R.td A.dd',
		tenors: '.... .... D..c ..ba',
		basses: '.... .... U... 3.45',
		cymbals: 'S... .... k... ....',
	},
	street: {
		snare: 'f.td A.td f.td A.tt',
		tenors: '..a. ..b. ..c. D...',
		basses: 'U... 3.4. U..2 .1..',
		cymbals: '.... s... .... s...',
	},
	streetTurn: {
		snare: 'f.td A.td f.dd RdRd',
		tenors: '..a. ..b. ABCD dcba',
		basses: 'U... 3.4. U.12 345.',
		cymbals: '.... s... k... ....',
	},
	climb: {
		snare: 'A.td R.td A.td R.td',
		tenors: '.... b.a. .... c.d.',
		basses: 'U..3 ..4. U..5 .432',
		cymbals: '.... s... .... s...',
	},
	climbHard: {
		snare: 'Agdg Rgdg Agdg Rtdd',
		tenors: '..ab ..cd ..ab .Dcb',
		basses: 'U..3 ..4. U.12 .345',
		cymbals: '.... s... .... s...',
	},
	groove: {
		snare: 'tgdg Rgtd tgdg AtRd',
		tenors: 'a... ..b. .... cbD.',
		basses: 'U..1 ..2. 3... U.U.',
		cymbals: '.... s... .... k...',
	},
	grooveAlt: {
		snare: 'tgdt Rgdt tgdg AtRd',
		tenors: '..a. ..b. a... cbD.',
		basses: 'U..2 .1.. 3.4. U.U.',
		cymbals: '.... s... .... k...',
	},
	turnaround: {
		snare: 'R..R ..R. tgdg AAAA',
		tenors: 'A..B ..C. .... dcba',
		basses: 'U..U ..U. ..5. 4321',
		cymbals: 'k..k ..k. .... ....',
	},
	peak: {
		snare: 'Agdt Rgdt Agdt RtRd',
		tenors: 'A.cb D.cb A.cb DcbA',
		basses: 'U.12 .3.4 U.5. U.U.',
		cymbals: 'C... s... .... k...',
	},
	peakTurn: {
		snare: 'R..R ..R. Agdg AAAA',
		tenors: 'A..B ..C. abcd dcba',
		basses: 'U..U ..U. 1.2. 4321',
		cymbals: 'k..k ..C. .... ....',
	},
	pulse: {
		snare: 'x.x. R.x. x.x. R.x.',
		tenors: '.... .... .... ....',
		basses: 'U... .... .... ....',
		cymbals: '.... .... .... ....',
	},
	setup: {
		snare: 'R..R ..R. zzzz zzzz',
		tenors: 'A..B ..C. .... DCBA',
		basses: 'U..U ..U. .... ....',
		cymbals: 'k..k ..k. S... ....',
	},
	hit: {
		snare: 'R... .... .... ....',
		tenors: 'D... .... .... ....',
		basses: 'U... .... .... ....',
		cymbals: 'C... .... .... ....',
	},
} satisfies Record<string, Cadence>;

export const rollOut: Cadence = {
	snare: 'zzzz zzzz',
	tenors: '.... DCBA',
	basses: '.... ....',
	cymbals: 'S... ....',
};

export default cadences;
