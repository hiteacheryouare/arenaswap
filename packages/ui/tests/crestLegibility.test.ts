import { crestInkReads, deadInkFraction, hexLuminance, pickMonoMark, strongInkFraction } from '../src/components/logoTint';

// One RGBA pixel per entry, at full alpha unless an alpha is given.
const pixels = (...entries: [number, number, number, number?][]): Uint8ClampedArray => (
	new Uint8ClampedArray(entries.flatMap(([r, g, b, a]) => [r, g, b, a ?? 255]))
);

const times = (count: number, pixel: [number, number, number]): [number, number, number][] => (
	Array.from({ length: count }, () => pixel)
);

const popup = hexLuminance('#0d1117');
const lightCard = hexLuminance('#f8fafc');
// A team colour under the hero's scrim: the Rangers' own navy, and the Phillies' own red.
const rangersBackdrop = hexLuminance('#01265a');
const philliesBackdrop = hexLuminance('#a81320');

describe('hexLuminance', () => {
	test('agrees with the values this project has pinned elsewhere', () => {
		expect(hexLuminance('#ffffff')).toBeCloseTo(1, 5);
		expect(hexLuminance('#000000')).toBeCloseTo(0, 5);
		expect(hexLuminance('#0d1117')).toBeCloseTo(0.0055, 3);
		expect(hexLuminance('#f8fafc')).toBeCloseTo(0.9536, 3);
	});

	test('reads an unparseable colour as black rather than throwing', () => {
		expect(hexLuminance('not-a-color')).toBe(0);
		expect(hexLuminance('#fff')).toBe(0);
	});
});

describe('strongInkFraction', () => {
	test('reports none of a navy crest standing off the popup', () => {
		expect(strongInkFraction(pixels([12, 35, 64], [12, 35, 64]), popup)).toBe(0);
	});

	test('reports all of a gold crest standing off it', () => {
		expect(strongInkFraction(pixels([255, 182, 18], [255, 182, 18]), popup)).toBe(1);
	});

	test('reports the share rather than a verdict', () => {
		expect(strongInkFraction(pixels([255, 182, 18], [12, 35, 64]), popup)).toBeCloseTo(0.5, 5);
	});

	// The same ink on a different surface is a different answer, which is the whole point: this is a
	// question about the pair rather than about the crest.
	test('answers differently for the same ink on a different surface', () => {
		const ink = pixels([12, 35, 64], [12, 35, 64]);
		expect(strongInkFraction(ink, popup)).toBe(0);
		expect(strongInkFraction(ink, lightCard)).toBe(1);
	});

	test('ignores the transparent background a cut-out crest is mostly made of', () => {
		expect(strongInkFraction(pixels([255, 182, 18], [12, 35, 64, 0], [12, 35, 64, 12]), popup)).toBe(1);
	});

	// Nothing to be unreadable. Treated as readable, so a crest that fails to decode is never swapped
	// for a monochrome mark on the strength of having no pixels.
	test('treats a crest with no ink at all as reading', () => {
		expect(strongInkFraction(pixels([12, 35, 64, 0]), popup)).toBe(1);
		expect(strongInkFraction(new Uint8ClampedArray(), popup)).toBe(1);
	});

	// The two cases the gentler measure got backwards, both on the team's own colour under the scrim.
	describe('the cases a gentle floor got the wrong way round', () => {
		// Rangers navy on Rangers navy. Every one of these clears 3:1 against that backdrop — 3.32,
		// 3.77 and 4.30 — and the real crest measured 3.73 at its very brightest. A floor at 3 calls
		// all of it strong ink and keeps a crest nothing in which is visible; 4.5 sees it for what it
		// is. These values sit in that band on purpose: the test fails at a floor of 3 or 4.
		test('finds no strong ink in a navy crest on its own navy', () => {
			expect(strongInkFraction(pixels([80, 120, 185], [90, 130, 190], [100, 140, 200]), rangersBackdrop)).toBe(0);
		});

		// Commanders gold on Commanders maroon: most of the mark is dark, and the part that is not
		// carries it. A measure that counts the dark majority calls this unreadable.
		test('finds the gold in a mark that is mostly dark', () => {
			const commanders = pixels([90, 20, 20], [90, 20, 20], [90, 20, 20], [255, 182, 18]);
			expect(strongInkFraction(commanders, hexLuminance('#421012'))).toBeCloseTo(0.25, 5);
		});

		// Phillies red on Phillies red.
		test('finds no strong ink in a red crest on its own red', () => {
			expect(strongInkFraction(pixels([232, 24, 40], [200, 30, 45]), philliesBackdrop)).toBe(0);
		});

		// The Diamondbacks are the other edge of the floor, and the reason it is not higher. Their
		// pale snake detail is what makes that crest readable on their own red, and it lands at 4.61
		// and 4.73 against it — a floor at 5 or above discards the one part of the mark that carries
		// it, and the crest goes monochrome for no reason a reader would recognise.
		test('counts the pale detail that carries a crest on its own red', () => {
			const dbacks = pixels([170, 170, 170], [175, 172, 165], [140, 20, 35], [140, 20, 35]);
			expect(strongInkFraction(dbacks, hexLuminance('#7b1323'))).toBeCloseTo(0.5, 5);
		});
	});
});

// A crest can carry a bright minority and still read badly, because the rest of it has gone. The
// Rockies' CR is white letters over a black mass: on their own purple 26% of that mark stands out
// and 61% of it is simply absent, so the letterform arrives as fragments with holes in it. The
// Commanders' gold is the same shape of mark at 51% absent, and that one is fine.
describe('deadInkFraction', () => {
	const rockiesPurple = hexLuminance('#260253');

	test('reports the share of a crest that has vanished into the surface', () => {
		// Three parts black, one part white: the Rockies' proportions.
		const rockies = pixels([8, 8, 12], [8, 8, 12], [8, 8, 12], [255, 255, 255]);
		expect(deadInkFraction(rockies, rockiesPurple)).toBeCloseTo(0.75, 5);
		expect(strongInkFraction(rockies, rockiesPurple)).toBeCloseTo(0.25, 5);
	});

	test('reports none for a crest drawn entirely in something visible', () => {
		expect(deadInkFraction(pixels([255, 182, 18], [255, 255, 255]), popup)).toBe(0);
	});

	test('ignores transparent pixels, and reports none for a crest with no ink', () => {
		expect(deadInkFraction(pixels([8, 8, 12], [255, 255, 255, 0]), popup)).toBe(1);
		expect(deadInkFraction(new Uint8ClampedArray(), popup)).toBe(0);
	});
});

describe('crestInkReads', () => {
	// Both conditions, and each one alone is not enough.
	test('wants a crest to stand out and to still be there', () => {
		const rockiesPurple = hexLuminance('#260253');
		// A quarter stands out, three quarters gone: bright enough, too much of it missing.
		expect(crestInkReads(pixels([8, 8, 12], [8, 8, 12], [8, 8, 12], [255, 255, 255]), rockiesPurple)).toBe(false);
		// Half gone, half standing out: reads.
		expect(crestInkReads(pixels([8, 8, 12], [255, 255, 255]), rockiesPurple)).toBe(true);
		// Nothing gone, but nothing standing out either — the Rangers on their own navy.
		expect(crestInkReads(pixels([80, 120, 185], [90, 130, 190]), hexLuminance('#01265a'))).toBe(false);
	});
});

// A share is an area, and an outline is not an area. Every crest below is a mass of near-black
// carrying a bright mark, which is the shape the rule has to sort, and no single measure does it:
// Miami has the least bright ink of the three and is the one that reads.
describe('a crest whose colour lives in a thin stroke', () => {
	const guideBar = hexLuminance('#21262d');
	const rockiesPurple = hexLuminance('#260253');

	// The floor first, because it is what separates the two teams that share a shape. Black on a
	// guide bar is 1.37:1 — faint, and the letterform you actually read — and the very same ink on
	// the Rockies' own purple is 1.21:1, which is a hole. That the surface decides it and not the
	// artwork is the point. Fails at a floor of 1.5, and again at 1.2.
	test('calls ink absent only where it really is', () => {
		expect(deadInkFraction(pixels([1, 1, 2]), guideBar)).toBe(0);
		expect(deadInkFraction(pixels([1, 1, 2]), rockiesPurple)).toBe(1);
	});

	// Miami on a guide bar, in the proportions the real crest measures at 48x48: a black M with a
	// thin blue-and-pink stroke round it. 5% of the ink clears 5.3:1, 18% of it has gone, and the M
	// between them is faint rather than absent. A tenth cuts straight through that stroke.
	test('keeps the colours of a mark carried by a thin bright stroke', () => {
		const marlinsOnBar = pixels(
			...times(5, [0, 163, 224]),
			...times(41, [1, 1, 2]),
			...times(18, [0, 41, 57]),
			...times(36, [0, 88, 120]),
		);
		expect(strongInkFraction(marlinsOnBar, guideBar)).toBeCloseTo(0.05, 5);
		expect(deadInkFraction(marlinsOnBar, guideBar)).toBeCloseTo(0.18, 5);
		expect(crestInkReads(marlinsOnBar, guideBar)).toBe(true);
	});

	// Colorado on their own purple, which is the case the dead share is set by: white letters over a
	// black mass, 29% of it standing out and 60% of it gone. Far more bright ink than Miami and it
	// still does not read, because what is left of it arrives as fragments.
	test('gives up a letterform with holes in it', () => {
		const rockiesOnPurple = pixels(
			...times(29, [255, 255, 255]),
			...times(60, [1, 1, 2]),
			...times(11, [120, 90, 160]),
		);
		expect(strongInkFraction(rockiesOnPurple, rockiesPurple)).toBeCloseTo(0.29, 5);
		expect(deadInkFraction(rockiesOnPurple, rockiesPurple)).toBeCloseTo(0.6, 5);
		expect(crestInkReads(rockiesOnPurple, rockiesPurple)).toBe(false);
	});

	// The other edge of the same share, three points below: the Mets on a guide bar keep their
	// colours at 55% gone. Without this the share could be set anywhere under 60 and nothing
	// would say so.
	test('keeps a mark that is merely half gone', () => {
		const metsOnBar = pixels(
			...times(15, [255, 89, 16]),
			...times(55, [0, 41, 57]),
			...times(30, [0, 88, 120]),
		);
		expect(deadInkFraction(metsOnBar, guideBar)).toBeCloseTo(0.55, 5);
		expect(crestInkReads(metsOnBar, guideBar)).toBe(true);
	});

	// Carolina on the popup, and the reason the dead share is here at all: 6% of that cat stands out
	// at 4.7:1 and 70% of it is gone. It passes the strong share and has to fail anyway.
	test('still gives up a crest that has mostly gone', () => {
		const panthersOnPopup = pixels(
			...times(6, [0, 133, 202]),
			...times(70, [16, 16, 16]),
			...times(24, [16, 80, 110]),
		);
		expect(strongInkFraction(panthersOnPopup, popup)).toBeCloseTo(0.06, 5);
		expect(deadInkFraction(panthersOnPopup, popup)).toBeCloseTo(0.7, 5);
		expect(crestInkReads(panthersOnPopup, popup)).toBe(false);
	});

	// The other side of the strong share, and the case that says it is still a threshold rather than
	// a formality: Memphis on a guide bar is a navy bear with a single catchlight in it — 0.3% of the
	// ink stands out and it is an empty box beside an abbreviation. The share has to stay above that,
	// which is what stops this being fixed by setting it near zero.
	test('gives up a crest whose only bright pixel is a catchlight', () => {
		const grizzliesOnBar = pixels(
			...times(1, [180, 190, 205]),
			...times(150, [12, 20, 40]),
			...times(149, [70, 90, 130]),
		);
		expect(strongInkFraction(grizzliesOnBar, guideBar)).toBeCloseTo(0.0033, 4);
		expect(crestInkReads(grizzliesOnBar, guideBar)).toBe(false);
	});

	// Neither share is a contrast floor, which is worth pinning because that is the knob somebody
	// will reach for first. Baltimore's orange on a guide bar reaches 3.77:1 and the Rangers'
	// brightest navy on their own navy reaches 3.73:1 — one of those crests reads and the other does
	// not, so no floor exists that can tell them apart.
	test('cannot be had by lowering the floor instead', () => {
		expect(strongInkFraction(pixels([223, 70, 1]), guideBar)).toBe(0);
		expect(strongInkFraction(pixels([100, 140, 200]), rangersBackdrop)).toBe(0);
	});
});

// A floor the surface cannot reach is not a judgement about the crest. The Marlins' own blue sits at
// luminance 0.17 under the hero's scrim, where pure black reaches 4.4:1 and only a near-white clears
// 4.5 — so an absolute floor finds no strong ink in any crest drawn on it, and sends every one of
// them to a monochrome mark for a reason the artwork had no part in.
describe('the floor is capped at what the surface can deliver', () => {
	const marlinsBlue = hexLuminance('#0177a5');

	test('finds the ink a mid-tone backdrop can actually show', () => {
		// Marlins navy on Marlins blue: 4.13:1, under the absolute floor and well over the capped one.
		const navyOnBlue = pixels([12, 35, 64], [12, 35, 64]);
		expect(strongInkFraction(navyOnBlue, marlinsBlue)).toBe(1);
	});

	test('leaves every dark surface exactly where it was', () => {
		// 3.2:1 on the popup, which that surface has ample room above — it stays unreadable there.
		const middling = pixels([70, 70, 70], [70, 70, 70]);
		expect(strongInkFraction(middling, popup)).toBe(0);
	});

	// The cap must not rescue a crest on a surface that could have shown it and did not. The Phillies'
	// own red reaches 7.6:1, so the floor stays at the full 4.5 there and their red-on-red stays gone.
	test('does not relax a floor a surface was capable of', () => {
		expect(strongInkFraction(pixels([232, 24, 40], [200, 30, 45]), philliesBackdrop)).toBe(0);
	});

	// A light alternate is a team's own other colour, which is the one backdrop the crest was drawn
	// against — and a club picks its two colours to be told apart, not to clear a text-contrast bar.
	// USC's cardinal on USC's gold is 2.62:1 and the Athletics' green on their gold is 3.72:1. Both
	// are large solid letterforms carrying their own outline and both are plainly legible; at 60% of
	// reach the floor was 4.27 and 3.59, so both were thrown away for a black mark that says less.
	// The test fails at a reach share of 0.4, and USC's alone fails at 0.37.
	test('finds a team drawn in its own second colour', () => {
		expect(strongInkFraction(pixels([157, 34, 53]), hexLuminance('#b89123'))).toBe(1);
		expect(strongInkFraction(pixels([0, 56, 49]), hexLuminance('#ad8219'))).toBe(1);
	});

	// The other bound, and the property the cap is sold on: it does not engage on a dark surface at
	// all. A guide bar reaches 15.2:1 and the popup 18.9:1, so both hold the full 4.5 — the bar until
	// the share drops under 0.296, which is what makes it the binding one. These greys sit just under
	// 4.5 against each and have to stay unreadable on both.
	test('still holds the full floor on the darkest surfaces', () => {
		expect(strongInkFraction(pixels([131, 131, 131]), hexLuminance('#21262d'))).toBe(0);
		expect(strongInkFraction(pixels([123, 123, 123]), popup)).toBe(0);
	});
});

describe('pickMonoMark', () => {
	const marks = { white: 'white.png', black: 'black.png' };

	// Every dark surface the product draws a crest on: the popup, a guide bar, the poster, and the
	// darkest team colours a hero can be painted in.
	test('takes the white mark on a dark surface', () => {
		for (const background of ['#0d1117', '#21262d', '#0b0f14', '#421012', '#01265a', '#a81320', '#05313b']) {
			expect(pickMonoMark(marks, background)).toBe('white.png');
		}
	});

	// The case this exists for. A team shown in its own gold puts the backdrop at luminance 0.27,
	// where white reaches 3.28:1 and is no more readable than the crest it would replace — the
	// Athletics and the Commanders both landed on the plate for exactly this reason. Black reaches
	// 6.4:1 there.
	test('takes the black mark on a light surface', () => {
		expect(pickMonoMark(marks, '#b88510')).toBe('black.png');
		expect(pickMonoMark(marks, '#ad8219')).toBe('black.png');
		expect(pickMonoMark(marks, '#ffffff')).toBe('black.png');
	});

	// The two ranges overlap — white clears the floor up to luminance 0.183 and black from 0.175 —
	// so there is no backdrop where a team with both marks is left without one. That overlap is what
	// keeps the plate for the clubs ESPN draws no marks for, rather than for a mid-tone backdrop.
	test('always finds a mark, whatever the backdrop', () => {
		for (let step = 0; step <= 100; step++) {
			const channel = Math.round((step / 100) * 255).toString(16).padStart(2, '0');
			expect(pickMonoMark(marks, `#${channel}${channel}${channel}`)).toBeDefined();
		}
	});

	test('offers nothing for a team that has no marks', () => {
		expect(pickMonoMark(undefined, '#0d1117')).toBeUndefined();
		expect(pickMonoMark({}, '#0d1117')).toBeUndefined();
	});

	// Only one of the pair. ESPN draws them together, but the shape allows one, and a mark that does
	// not clear the floor is worse than the crest it would replace.
	test('will not use the one mark it has if that mark does not read', () => {
		expect(pickMonoMark({ white: 'white.png' }, '#b88510')).toBeUndefined();
		expect(pickMonoMark({ black: 'black.png' }, '#0d1117')).toBeUndefined();
		expect(pickMonoMark({ black: 'black.png' }, '#b88510')).toBe('black.png');
	});

	test('treats a colour it cannot read as black, which is the darkest a surface can be', () => {
		expect(pickMonoMark(marks, 'not-a-color')).toBe('white.png');
	});
});
