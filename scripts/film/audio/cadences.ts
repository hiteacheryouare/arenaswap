// One bar of drumline per cadence, sixteen steps, spaced by beat for reading.
//   snare    R rimshot  A accent  f flam  t tap  g ghost  d diddle  D accented diddle  x rim click  z buzz roll
//   tenors   a b c d    drums high to low; capitals are accents
//   basses   1 to 5     drums high to low; U is the whole line in unison
//   cymbals  C crash (both players)  k crash-choke  s tap  S sizzle rising into whatever comes next
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

// Laid over the second half of whatever bar leads into a peak or the outro.
export const rollOut: Cadence = {
	snare: 'zzzz zzzz',
	tenors: '.... DCBA',
	basses: '.... ....',
	cymbals: 'S... ....',
};

export default cadences;
