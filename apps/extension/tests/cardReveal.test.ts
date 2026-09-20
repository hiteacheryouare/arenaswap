import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
	openRevealEnabledKey,
	pickRevealMode,
	readOpenRevealEnabled,
	revealAbbrBaseLength,
	revealAbbrScale,
	revealBaseDurationMs,
	revealDayStamp,
	revealDelayMs,
	revealDurationMs,
	revealFullRate,
	revealOpenBeatMs,
	revealOpenMs,
	revealHoldHeightShare,
	revealHoldScale,
	revealHoldWidthShare,
	revealLean,
	revealLeanRatio,
	revealLeanWidthCap,
	revealMaxCards,
	revealModeForIndex,
	revealNameBeatMs,
	revealNameFit,
	revealNameHeightShare,
	revealNameInkBottomEm,
	revealNameInkTopEm,
	revealNameLift,
	revealNameLineHeight,
	revealNameLines,
	revealNameMaxPx,
	revealNameSpread,
	revealPlateRatio,
	revealQuickRate,
	revealSettleMs,
	revealStaggerCapIndex,
	revealStaggerStepMs,
	revealSkewDeg,
	revealSweepAngleDeg,
	revealSpineStartMs,
	revealSweepBarPx,
	revealSweepRun,
	revealTotalMs,
	writeOpenRevealEnabled,
} from '../entrypoints/popup/cardReveal';

describe('which version of the open animation plays', () => {
	it('gives the full version the first time on a given day', () => {
		expect(pickRevealMode(null, '2026-09-15', false, true)).toBe('full');
		expect(pickRevealMode('2026-09-14', '2026-09-15', false, true)).toBe('full');
	});

	it('gives every open after that the same graphic, quicker', () => {
		expect(pickRevealMode('2026-09-15', '2026-09-15', false, true)).toBe('quick');
	});

	// Reduced motion wins over both, and deliberately leaves the stored day alone in
	// `resolveOpenRevealMode` — so turning the preference back off restores the full version that
	// day rather than a quick one against a day that was never actually shown.
	it('plays nothing at all under reduced motion', () => {
		expect(pickRevealMode(null, '2026-09-15', true, true)).toBe('none');
		expect(pickRevealMode('2026-09-15', '2026-09-15', true, true)).toBe('none');
	});

	// And the setting does exactly what the media query does, for the same reason: somebody who
	// switched it off gets the first open of the day back if they switch it on again.
	it('plays nothing at all with the setting off', () => {
		expect(pickRevealMode(null, '2026-09-15', false, false)).toBe('none');
		expect(pickRevealMode('2026-09-15', '2026-09-15', false, false)).toBe('none');
	});
});

// The prefs come back from `browser.storage` long after the first cards are drawn, so what the
// animation actually reads is this copy. A miss has to mean on: a profile that has never opened the
// settings, or one whose `localStorage` was cleared, should still get the graphic.
describe('the copy of the setting the first render can read', () => {
	// These tests run under the node environment, which has no `localStorage` at all. Two keys' worth
	// of one is enough, and standing it up by hand is also the only way to reach the case the popup
	// cannot produce — a browser that has the API turned off entirely.
	const store = new Map<string, string>();
	const stub = {
		getItem: (key: string) => store.get(key) ?? null,
		setItem: (key: string, value: string) => { store.set(key, value); },
	} as unknown as Storage;

	beforeEach(() => {
		store.clear();
		Object.defineProperty(globalThis, 'localStorage', { value: stub, configurable: true });
	});

	it('treats an unwritten setting as on', () => {
		expect(readOpenRevealEnabled()).toBe(true);
	});

	it('round trips both answers', () => {
		writeOpenRevealEnabled(false);
		expect(store.get(openRevealEnabledKey)).toBe('off');
		expect(readOpenRevealEnabled()).toBe(false);

		writeOpenRevealEnabled(true);
		expect(readOpenRevealEnabled()).toBe(true);
	});

	it('leaves the animation on where there is nowhere to store the answer', () => {
		Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true });
		expect(() => writeOpenRevealEnabled(false)).not.toThrow();
		expect(readOpenRevealEnabled()).toBe(true);
	});
});

describe('the two phases and the two speeds', () => {
	// The poster is one choreography at a rate. If these ever stop being the same number scaled, one of
	// the versions has become a different animation and the stylesheet's single `--reveal-rate` is a lie.
	it('runs the poster at a fixed fraction of the one timeline', () => {
		expect(revealDurationMs('full')).toBe(Math.round(revealBaseDurationMs * revealFullRate));
		expect(revealDurationMs('quick')).toBe(Math.round(revealBaseDurationMs * revealQuickRate));
		expect(revealFullRate).toBe(1.3);
		expect(revealQuickRate).toBe(0.8);
	});

	// Both opening scenes belong to the first open of the day alone, and both are scaled by the same
	// rate as the poster they run into — a scene at its own speed would be a second timeline.
	it('gives the two opening scenes only to the first open of the day', () => {
		expect(revealOpenMs('full')).toBe(Math.round((revealOpenBeatMs + revealNameBeatMs) * revealFullRate));
		expect(revealOpenMs('quick')).toBe(0);
		expect(revealOpenMs('none')).toBe(0);
	});

	// Stated outright as well as derived: this is the graphic's length, and the one the skip answers for.
	it('runs the whole of the first open in about six seconds a card', () => {
		expect(revealOpenMs('full')).toBe(3185);
		expect(revealDurationMs('full')).toBe(4420);
		expect(revealTotalMs('full')).toBe(7605);
	});

	// The regression guard the whole approach rests on, and the reason the opening beat is `full` only:
	// every open of the popup after the first of the day must be exactly the graphic it has always been.
	it('leaves every later open of the day exactly where it was', () => {
		expect(revealTotalMs('quick')).toBe(2720);
		expect(revealDurationMs('quick')).toBe(2720);
		expect(revealDelayMs(3, 'quick')).toBe(192);
		// Which means its poster starts on its cascade, with nothing ahead of it.
		expect(revealSpineStartMs(3, 'quick')).toBe(revealDelayMs(3, 'quick'));
	});

	// And on the first open it starts once both scenes have run, which is what `--reveal-spine`
	// carries onto the card.
	it('starts the poster after both opening scenes on the first open', () => {
		expect(revealSpineStartMs(0, 'full')).toBe(revealOpenMs('full'));
		expect(revealSpineStartMs(2, 'full')).toBe(revealDelayMs(2, 'full') + revealOpenMs('full'));
	});

	it('takes no time at all when nothing is going to play', () => {
		expect(revealTotalMs('none')).toBe(0);
		expect(revealDurationMs('none')).toBe(0);
		expect(revealDelayMs(3, 'none')).toBe(0);
	});
});

describe('the day a reveal is stamped against', () => {
	// Local, not UTC: the day that matters is the one the person is watching sport on.
	it('is the local calendar day, zero padded', () => {
		expect(revealDayStamp(new Date(2026, 8, 15, 23, 59))).toBe('2026-09-15');
		expect(revealDayStamp(new Date(2026, 0, 3, 0, 1))).toBe('2026-01-03');
	});
});

describe('the stagger down the list', () => {
	// Taken at the graphic's own rate like everything else, so the long cut's cascade is wider in the
	// same proportion rather than the same 80ms against beats that are now half again as long.
	it('steps once per card', () => {
		expect(revealDelayMs(0, 'full')).toBe(0);
		expect(revealDelayMs(1, 'full')).toBe(Math.round(revealStaggerStepMs * revealFullRate));
		expect(revealDelayMs(3, 'full')).toBe(Math.round(revealStaggerStepMs * 3 * revealFullRate));
		expect(revealDelayMs(1, 'full')).toBe(104);
	});

	// The cascade is part of the graphic, so it is taken at the graphic's own rate.
	it('tightens with the quick version', () => {
		expect(revealDelayMs(3, 'quick')).toBe(Math.round(revealStaggerStepMs * 3 * revealQuickRate));
	});

	// Everything past the cap starts together. Those cards are well below a 560px frame, so the
	// only thing further staggering buys is a longer wait for the whole thing to be over.
	it('stops lengthening past the cap', () => {
		const capped = revealDelayMs(revealStaggerCapIndex, 'full');
		expect(revealDelayMs(revealStaggerCapIndex + 1, 'full')).toBe(capped);
		expect(revealDelayMs(400, 'full')).toBe(capped);
	});
});

describe('how far down the list the graphic is drawn at all', () => {
	// Not a visual limit, a cost one: each revealed card is a dozen animated elements, and a full
	// Saturday slate is thirty cards none of which are on screen.
	it('stops after the cards anyone could see', () => {
		expect(revealModeForIndex('full', 0)).toBe('full');
		expect(revealModeForIndex('full', revealMaxCards - 1)).toBe('full');
		expect(revealModeForIndex('full', revealMaxCards)).toBe('none');
		expect(revealModeForIndex('quick', 99)).toBe('none');
	});
});

describe('when the popup stops being in its opening state', () => {
	// Both phases, not just the poster: a card is not finished until its opening beat and its poster
	// have both run, and the wrapper sitting over a clickable card is the thing this bounds.
	it('waits for the last card to start and then to finish both its phases', () => {
		expect(revealSettleMs('full')).toBe(revealDelayMs(revealStaggerCapIndex, 'full') + revealTotalMs('full'));
		expect(revealSettleMs('quick')).toBe(revealDelayMs(revealStaggerCapIndex, 'quick') + revealTotalMs('quick'));
	});

	it('holds the opening state for the whole graphic plus its own cascade', () => {
		expect(revealSettleMs('full')).toBe(8229);
		expect(revealSettleMs('quick')).toBe(3104);
	});

	it('is immediate when nothing is going to play', () => {
		expect(revealSettleMs('none')).toBe(0);
	});
});

// 304px by 148px is the live card in a 320px popup, and 64px is the crest it draws.
describe('how big the poster crest is drawn', () => {
	// Scale 1 is the card's own crest, so the walk down onto it ends there by construction. Anything
	// below 1 would have the poster walk backwards into place.
	it('never draws the poster smaller than the crest it resolves into', () => {
		expect(revealHoldScale(304, 20, 64)).toBe(1);
		expect(revealHoldScale(20, 148, 64)).toBe(1);
		expect(revealHoldScale(304, 148, 64)).toBeGreaterThan(1);
	});

	// The plate is 4/3 of the mark it carries everywhere the product draws one, so the bound is on
	// the plate and the mark follows it down. Sizing the mark and letting the plate fall where it
	// liked is what let a plate grow past the card it was drawn on.
	it('bounds the plate, not the mark inside it', () => {
		expect(revealPlateRatio).toBeCloseTo(4 / 3, 10);
		// Height binds on a short wide card.
		expect(revealHoldScale(1000, 148, 64) * 64 * revealPlateRatio)
			.toBeCloseTo(148 * revealHoldHeightShare, 6);
		// Width binds on a tall narrow one.
		expect(revealHoldScale(304, 1000, 64) * 64 * revealPlateRatio)
			.toBeCloseTo(304 * revealHoldWidthShare, 6);
	});

	// Which is the whole reason it is a function of the card rather than a figure: a pre-game card
	// carrying odds and weather is half again the height of a finished one, and one number cannot be
	// right on both without clipping one of them.
	it('stays inside the card it is drawn on, at any card height', () => {
		[96, 120, 148, 190, 240].forEach(height => {
			const plate = revealHoldScale(304, height, 64) * 64 * revealPlateRatio;
			expect(plate).toBeLessThanOrEqual(height);
			// And two of them cannot meet over the seam.
			expect(plate).toBeLessThanOrEqual(304 / 2);
		});
	});

	// Nothing to scale against before the card has been measured, and a crest of no size would
	// otherwise divide the scale to infinity.
	it('holds at one when there is no crest to measure', () => {
		expect(revealHoldScale(304, 148, 0)).toBe(1);
		expect(revealHoldScale(0, 0, 0)).toBe(1);
	});
});

describe('how the poster lettering is sized', () => {
	// Every professional club, and the size the graphic was drawn at.
	it('leaves a three-character tricode alone', () => {
		expect(revealAbbrScale('MIA', 'ARI')).toBe(1);
		expect(revealAbbrBaseLength).toBe(3);
	});

	// ESPN's abbreviation is not capped and college football is full of four and five. At one size
	// the two sides overlap over the seam — ARMY against NAVY by 7.4px on a 296px card.
	it('shrinks for the longer of the two, not for each side separately', () => {
		expect(revealAbbrScale('ARMY', 'NAVY')).toBeCloseTo(0.75, 10);
		// One long side pulls both down, or they arrive at different sizes.
		expect(revealAbbrScale('UCONN', 'SMU')).toBeCloseTo(0.6, 10);
		expect(revealAbbrScale('SMU', 'UCONN')).toBeCloseTo(0.6, 10);
	});

	// A shorter one than the base cannot make the type bigger, and a missing abbreviation — which
	// `Team.abbreviation` allows — must not divide by zero.
	it('never scales up, and survives an abbreviation that is not there', () => {
		expect(revealAbbrScale('LA', 'SF')).toBe(1);
		expect(revealAbbrScale()).toBe(1);
		expect(revealAbbrScale('', '')).toBe(1);
	});
});

// Two lines, and where they break. The nickname is the club's own answer to that question, which is
// why it is asked for rather than guessed at: a wrap would break "Penn State Nittany Lions" wherever
// the box ran out, and a split on the last space would turn the Nittany Lions into the Lions.
describe('how a club name is set on two lines', () => {
	it('breaks a name before its nickname', () => {
		expect(revealNameLines('Miami Marlins', 'Marlins')).toEqual(['Miami', 'Marlins']);
		expect(revealNameLines('Penn State Nittany Lions', 'Nittany Lions')).toEqual(['Penn State', 'Nittany Lions']);
		expect(revealNameLines('Portland Trail Blazers', 'Trail Blazers')).toEqual(['Portland', 'Trail Blazers']);
	});

	// ESPN sends a nickname for every club in every league we carry, but a game arriving without one
	// still has to be named: the last space is the right guess for the two-word clubs that is most of
	// them, and it is only ever a guess about where to break rather than about what to print.
	it('breaks at the last space when no nickname came with the game', () => {
		expect(revealNameLines('Washington Commanders')).toEqual(['Washington', 'Commanders']);
		expect(revealNameLines('Penn State Nittany Lions')).toEqual(['Penn State Nittany', 'Lions']);
	});

	// A club whose whole name is its nickname, which is most of soccer.
	it('leaves a one-word club on one line', () => {
		expect(revealNameLines('Barcelona', 'Barcelona')).toEqual(['Barcelona']);
		expect(revealNameLines('Juventus')).toEqual(['Juventus']);
	});

	it('survives a game with no name on it at all', () => {
		expect(revealNameLines()).toEqual([]);
		expect(revealNameLines('', '')).toEqual([]);
		expect(revealNameLines('  ')).toEqual([]);
	});

	// Whatever ESPN's spacing was, the lines are what gets measured and drawn.
	it('collapses the whitespace it was sent', () => {
		expect(revealNameLines(' Miami   Marlins ', ' Marlins ')).toEqual(['Miami', 'Marlins']);
	});
});

// And how big those lines come out. The ratios are what the component measured off the glyphs — a
// line's width in ems — so these are the real advances DM Sans bold produces, read out of canvas
// `TextMetrics`: 0.5168em a character for "Pittsburgh" and 0.6629 for "Commanders", which is a
// quarter more from the same count of letters and is why no arithmetic on `name.length` could ever
// have sized this.
// The ink of a stack, which is what the band has to hold: the line boxes, less the gap the first
// line's ink leaves at the top of its own box, plus the descender the last line hangs below the
// bottom of its. Written out here rather than imported, so the fit is checked against the geometry
// rather than against its own helper.
const inkHeight = (sizes: number[]) => {
	const boxes = sizes.reduce((total, size) => total + size * revealNameLineHeight, 0);
	const gap = (revealNameLineHeight / 2 - revealNameInkTopEm) * sizes[0]!;
	const hang = (revealNameInkBottomEm - revealNameLineHeight / 2) * sizes[sizes.length - 1]!;
	return boxes - gap + hang;
};

describe('how the club names are sized', () => {
	const marlins = [2.96, 3.5701];
	const commanders = [5.8298, 6.6293];
	// The popup's own numbers: a 296px card, and half of the live card's 167.
	const card = 296;
	const band = 84;

	// Justified rather than set at one size: every line of a name is drawn at whatever size makes it
	// span the same width as the others, which is what makes the naming read as a block of type.
	it('justifies every line of a name to one width', () => {
		const sizes = revealNameFit(marlins, card, band);
		expect(sizes).toHaveLength(2);
		expect(sizes[0]! * marlins[0]!).toBeCloseTo(sizes[1]! * marlins[1]!, 6);
	});

	// The block is as wide as the band lets it be, which on a name of two long lines is three quarters
	// of the card — and the type on it is drawn at 38px against the 17.6 the version before this could
	// reach, which is the thing three passes at this never managed. Not the whole card, and the reason
	// is mixed case: lowercase advances are a quarter narrower than caps, so the same type size covers
	// less width, and the leading a descender needs costs height that caps did not.
	it('names a long club across most of the card, at twice the size', () => {
		const sizes = revealNameFit(commanders, card, band);
		const drawn = sizes[0]! * commanders[0]!;
		expect(drawn).toBeGreaterThan(card * 0.7);
		expect(drawn).toBeLessThanOrEqual(card);
		expect(sizes[0]!).toBeGreaterThan(35);
	});

	// And the band's own height is what binds on the short cards, where two lines justified to the
	// full width of the card would be taller than half of it. Bounded on the ink rather than on the
	// line boxes: a box does not contain its own descender at this leading, and budgeting by boxes put
	// the bottom of a "g" within a pixel of the card's edge.
	it('comes down to the band on a card too short for the width', () => {
		const short = revealNameFit(marlins, card, 74);
		const tall = revealNameFit(marlins, card, band);
		expect(short[0]!).toBeLessThan(tall[0]!);
		expect(inkHeight(short)).toBeLessThanOrEqual(74 * revealNameHeightShare + 0.001);
		expect(inkHeight(short)).toBeGreaterThan(74 * revealNameHeightShare - 0.001);
	});

	// Nothing is drawn bigger than the cap, whatever the arithmetic says: a line of two letters
	// justified to a card's width is the height of the card, and "AC" over a small "Milan" reads as a
	// mistake rather than as a lockup. Both bounds bite here — the cap on the short line, the spread
	// between the two of them.
	it('will not draw one line of a name away from the other', () => {
		const sizes = revealNameFit([1.2, 2.8], card, 400);
		expect(Math.max(...sizes)).toBeLessThanOrEqual(revealNameMaxPx);
		expect(Math.max(...sizes) / Math.min(...sizes)).toBeLessThanOrEqual(revealNameSpread + 0.001);
	});

	it('answers nothing for a line it could not measure', () => {
		expect(revealNameFit([0, 4], card, band)).toEqual([0, 0]);
		expect(revealNameFit([], card, band)).toEqual([]);
	});

	// The lift is what centres the ink rather than the boxes, and the case that proves it is a name
	// whose lines are drawn at different sizes: the correction is half the ink's own offset at each
	// end, so lifting the block by it leaves the same clearance above the first line as below the last.
	it('lifts the block until the ink is what sits centred', () => {
		const sizes = revealNameFit(marlins, card, band);
		const lift = revealNameLift(sizes);
		const boxes = sizes.reduce((total, size) => total + size * revealNameLineHeight, 0);
		const gap = (revealNameLineHeight / 2 - revealNameInkTopEm) * sizes[0]!;
		const hang = (revealNameInkBottomEm - revealNameLineHeight / 2) * sizes[sizes.length - 1]!;
		// Where the ink lands once the block is centred in the band and then lifted.
		const blockTop = (band - boxes) / 2 - lift;
		// Equal clearance above the first line's ink and below the last line's.
		expect(blockTop + gap).toBeCloseTo(band - (blockTop + boxes + hang), 6);
	});

	it('lifts nothing it could not measure', () => {
		expect(revealNameLift([])).toBe(0);
		expect(revealNameLift([0, 10])).toBe(0);
	});
});

// The stylesheet writes these figures out by hand, because a keyframe cannot read a module. Every
// one of them is therefore two numbers that have to agree, and this file has been bitten by exactly
// that before — a version somebody had to remember to raise, left behind while the thing it
// versioned moved twice. So the agreement is asserted rather than trusted.
describe('the figures the stylesheet repeats by hand', () => {
	const stylesheet = readFileSync(path.join(__dirname, '../assets/global.scss'), 'utf8');

	it('runs every timeline over the base duration', () => {
		const durations = stylesheet.match(/calc\((\d+)ms \* var\(--reveal-rate\)\) linear var\(--reveal-spine\)/g) ?? [];
		expect(durations.length).toBeGreaterThan(0);
		durations.forEach(declaration => {
			expect(declaration).toContain(`${revealBaseDurationMs}ms`);
		});
	});

	// The bars are skewed by the angle the lean came out as, not by a constant of their own: the bar
	// and the edge it reveals along are one line, and the lean is no longer the same angle on every
	// card. A degree figure written into the stylesheet is the bug this pins.
	it('skews the bars by the angle the lean is derived from', () => {
		expect(stylesheet).not.toMatch(/skewX\(-?[\d.]+deg\)/);
		const skews = stylesheet.match(/skewX\([^)]*var\(--reveal-skew\)[^)]*\)/g) ?? [];
		// Both static offsets and both keyframe pairs.
		expect(skews).toHaveLength(6);
	});

	// The last beat of the card coming into focus has to be over before the wrapper is removed, or a
	// future easing turns the removal into a pop.
	it('finishes the last content beat before the wrapper is taken away', () => {
		// Every beat that reschedules itself off the card's own delay, which is the staggered run of
		// contents coming into focus plus the chasing bars.
		const beats = [...stylesheet.matchAll(/animation-delay:\s+calc\(var\(--reveal-spine\) \+ (\d+)ms/g)]
			.map(match => Number(match[1]));
		const contentBeatMs = Number(/cardRevealContent calc\((\d+)ms/.exec(stylesheet)?.[1]);
		expect(beats.length).toBeGreaterThan(0);
		expect(Number.isFinite(contentBeatMs)).toBe(true);
		expect(Math.max(...beats) + contentBeatMs).toBeLessThanOrEqual(revealBaseDurationMs);
	});

	// The lettering fills as the bar arrives to take it, and the bar is what makes it worth doing: a
	// wipe over a solid mark reads harder than one over a hollow one. Which only holds if the fill has
	// finished by the time the leading edge gets there — a bar crossing a half-filled glyph is a third
	// state nobody designed. Both figures are in the stylesheet and neither is derived from the other,
	// so the agreement is asserted.
	it('fills the lettering before the bar reaches it', () => {
		const fill = /cardRevealAbbrFill calc\((\d+)ms \* var\(--reveal-rate\)\) [\w-]+ calc\(var\(--reveal-spine\) \+ (\d+)ms/.exec(stylesheet);
		const sweep = /cardRevealSweepAway calc\(\d+ms \* var\(--reveal-rate\)\) linear calc\(var\(--reveal-spine\) \+ (\d+)ms/.exec(stylesheet);
		expect(fill).not.toBeNull();
		expect(sweep).not.toBeNull();
		expect(Number(fill![2]) + Number(fill![1])).toBeLessThanOrEqual(Number(sweep![1]));
	});

	// The pass is a group travelling one path, so they have to leave in the order they are stacked in:
	// the thick bar turns the ground over and the thin ones run behind it. A trailer that left first
	// would be a bar crossing colour that has not been revealed yet.
	it('sends the three bars of a pass out in order', () => {
		const chaser = /\.game-card-reveal-sweep\.is-away\.is-chaser,[\s\S]*?animation-delay:\s+calc\(var\(--reveal-spine\) \+ (\d+)ms/.exec(stylesheet);
		const trailer = /\.game-card-reveal-sweep\.is-away\.is-trailer,[\s\S]*?animation-delay:\s+calc\(var\(--reveal-spine\) \+ (\d+)ms/.exec(stylesheet);
		const sweep = /cardRevealSweepAway calc\(\d+ms \* var\(--reveal-rate\)\) linear calc\(var\(--reveal-spine\) \+ (\d+)ms/.exec(stylesheet);
		expect(Number(sweep![1])).toBeLessThan(Number(chaser![1]));
		expect(Number(chaser![1])).toBeLessThan(Number(trailer![1]));

		// And the group opens out as it crosses rather than holding formation, which means each one
		// takes longer over the same distance than the one ahead of it — and the last of them still has
		// to be off the card before the wrapper carrying it is taken away.
		const durationOf = (rule: RegExpExecArray) => Number(
			/animation-duration:\s+calc\((\d+)ms/.exec(stylesheet.slice(rule.index))![1],
		);
		expect(durationOf(chaser!)).toBeLessThan(durationOf(trailer!));
		expect(Number(trailer![1]) + durationOf(trailer!)).toBeLessThanOrEqual(revealBaseDurationMs);
	});

	// The opening beat's window is two figures written into the stylesheet by hand, and both of them
	// mean something. The first is the beat itself, which has to be the same length the component
	// reserves ahead of the poster or the pair would still be arriving when the colour starts. The
	// second is how far the layer stays alive into the poster, and it has to outlast the halves meeting
	// — they part again at the end, and anything still underneath would be uncovered a second time.
	it('keeps the two opening scenes alive until the colour has closed over them', () => {
		const window = (keyframes: string) => new RegExp(
			`animation:\\s+${keyframes} calc\\(\\((\\d+)ms \\+ (\\d+)ms \\+ (\\d+)ms\\) \\* var\\(--reveal-rate\\)\\)`,
		).exec(stylesheet)?.slice(1, 4).map(Number) ?? null;

		const layer = window('cardRevealOpeningIn');
		expect(layer).not.toBeNull();
		// The crests, then the naming, then however long the layer outlives both.
		expect(layer![0]).toBe(revealOpenBeatMs);
		expect(layer![1]).toBe(revealNameBeatMs);

		// 26% is where `cardRevealHalf` has the two halves meet, and from there the card is covered.
		// Anything less and the colour would part again at the end over a scene still sitting under it.
		expect(layer![2]).toBeGreaterThanOrEqual(revealBaseDurationMs * 0.26);

		// Both scenes share the layer's window, or they would be reading off different percentages —
		// and the percentages are the only thing holding the handover between them together.
		expect(window('cardRevealOpeningCrest')).toEqual(layer);
		expect(window('cardRevealOpeningBand')).toEqual(layer);
		expect(window('cardRevealOpeningName')).toEqual(layer);
	});

	// The two scenes are laid out on that shared window by percentage, and the one thing that has to
	// hold between them is that the naming has left by the frame the poster starts on. Written by hand
	// in the keyframes, so the arithmetic is asserted rather than trusted.
	//
	// Left, rather than held for the colour to cover. The poster's halves grow in from the outer edges,
	// so a name still standing there is eaten from its ends inward by colour in its own hue — letters
	// going out one at a time with nothing visible doing it, which is exactly how this beat used to end
	// and is the defect this percentage exists to prevent.
	it('has the naming gone by the frame the poster starts on', () => {
		const total = revealOpenBeatMs + revealNameBeatMs + 1050;
		const posterStartsAt = Math.round(((revealOpenBeatMs + revealNameBeatMs) / total) * 100);

		const collapsed = /@keyframes cardRevealOpeningName \{[\s\S]*?\n\t(\d+)%, 100% \{ opacity: 0;/.exec(stylesheet);
		expect(Number(collapsed![1])).toBe(posterStartsAt);

		// And the scene before it is over before the naming lands: the crests have cleared the field
		// and the bands have closed on the centre line, both of them well inside the poster's start.
		const crestGone = /@keyframes cardRevealOpeningCrest \{[\s\S]*?\n\t(\d+)%\s+\{ opacity: 0;/.exec(stylesheet);
		const bandShut = /@keyframes cardRevealOpeningBand \{[\s\S]*?\n\t(\d+)%, 100% \{ clip-path: inset\(0\)/.exec(stylesheet);
		const nameLanded = /@keyframes cardRevealOpeningName \{[\s\S]*?\n\t(\d+)%, \d+%\s+\{ opacity: 0\.9;/.exec(stylesheet);
		expect(Number(crestGone![1])).toBeLessThan(Number(bandShut![1]));
		expect(Number(bandShut![1])).toBeLessThanOrEqual(Number(nameLanded![1]));
		expect(Number(nameLanded![1])).toBeLessThan(posterStartsAt);
	});

	// The naming is the one beat of this graphic with something on it to read, which is what the
	// length of it is for: a first pass held the names for about a sixth of a second and the reading
	// of it was that it went by far too fast. Asserted in real milliseconds, at the rate the graphic
	// actually plays, because that is the quantity a person experiences.
	it('holds the naming still for long enough to read two clubs', () => {
		const total = revealOpenBeatMs + revealNameBeatMs + 1050;
		const landed = Number(/@keyframes cardRevealOpeningName \{[\s\S]*?\n\t(\d+)%, \d+%\s+\{ opacity: 0\.9;/.exec(stylesheet)![1]);
		const leaves = Number(/@keyframes cardRevealOpeningName \{[\s\S]*?\n\t\d+%, (\d+)%\s+\{ opacity: 0\.9;/.exec(stylesheet)![1]);
		const heldMs = ((leaves - landed) / 100) * total * revealFullRate;
		expect(heldMs).toBeGreaterThanOrEqual(1000);
	});

	// One seam, cut by one pair of shapes. The opening beat's colour fields are the poster's halves at
	// full width, so a crest clipped by one of those is clipped along the exact line the poster's own
	// half then grows into — and the two agree because they are the same rule, not because somebody
	// kept two of them in step. What this pins is that they have not been split apart again.
	it('cuts the opening fields and the poster halves along one seam', () => {
		const seam = (side: 'away' | 'home') => {
			const shared = `.game-card-reveal-half.is-${side},`;
			const at = stylesheet.indexOf(shared);
			if (at < 0) return null;
			const rule = stylesheet.slice(at, stylesheet.indexOf('}', at));
			// Both selectors on the one rule, and the shape it declares.
			if (!rule.includes(`.game-card-reveal-opening-field.is-${side}`)) return null;
			return /clip-path:\s*(polygon\([^;]+\));/.exec(rule)?.[1] ?? null;
		};

		expect(seam('away')).not.toBeNull();
		expect(seam('home')).not.toBeNull();
		// And each one leans, rather than the pair having quietly become a vertical split.
		expect(seam('away')).toContain('--reveal-lean');
		expect(seam('home')).toContain('--reveal-lean');
	});

	// The naming's own split is flat, and that is the whole reason it can name a club across the card:
	// a leaning split gives each side half the width and this one gives it all of it. What this pins
	// is that the bands are halves of the card wiped in from its own outer edges, with no lean in them
	// — the seam is the poster's business and the naming is the one beat that does not lean.
	it('splits the naming scene flat, and wipes each band in from its own edge', () => {
		const band = (side: 'away' | 'home') => {
			const at = stylesheet.indexOf(`.game-card-reveal-opening-band.is-${side} {`);
			if (at < 0) return null;
			return stylesheet.slice(at, stylesheet.indexOf('}', at));
		};

		expect(band('away')).toContain('--reveal-band-shut: 0 0 100% 0');
		expect(band('home')).toContain('--reveal-band-shut: 100% 0 0 0');
		expect(band('away')).not.toContain('--reveal-lean');
		expect(band('home')).not.toContain('--reveal-lean');
	});

	// And it leaves by collapsing onto the slot its tricode appears on, which is a quarter of the
	// card in from the centre on the centre line. Against a box that is the full width of the card and
	// half its height, that is a quarter of its width and half its height — the one place in here
	// where a percentage means something different on each axis, and worth pinning for it.
	it('collapses each name onto the slot its tricode uses', () => {
		const slot = (side: 'away' | 'home') => {
			const at = stylesheet.indexOf(`.game-card-reveal-opening-name.is-${side} {`);
			if (at < 0) return null;
			const rule = stylesheet.slice(at, stylesheet.indexOf('}', at));
			return [
				/--reveal-name-slot-x:\s*(-?\d+%)/.exec(rule)?.[1],
				/--reveal-name-slot-y:\s*(-?\d+%)/.exec(rule)?.[1],
			];
		};

		expect(slot('away')).toEqual(['-25%', '50%']);
		expect(slot('home')).toEqual(['25%', '-50%']);
	});

	// A bar is parked one bar width and one lean clear of the edge it comes in from, and leaves one
	// lean clear of the other — the lean because skewing a strip about its own centre reaches that far
	// to either side of where it is positioned, which is what a parked bar was showing in a corner
	// when the offsets were a flat 18% of the card. The stylesheet parks it at those two offsets and
	// the component measures the distance between them.
	it('translates a bar exactly as far as the offsets it is parked at', () => {
		const parked = [...stylesheet.matchAll(/\.game-card-reveal-sweep\.is-\w+ \{\s*\r?\n\s*left:\s*([^;]+);/g)]
			.map(match => match[1].trim());
		expect(parked).toEqual([
			`calc(-${revealSweepBarPx}px - var(--reveal-lean))`,
			'calc(100% + var(--reveal-lean))',
		]);
		// Which is the travel, once `100%` is a card width: the two offsets are a card width, a bar
		// width and two leans apart.
		const cardWidth = 296;
		const lean = 28.12;
		expect(revealSweepRun(cardWidth, lean)).toBeCloseTo((cardWidth + lean) - (-revealSweepBarPx - lean), 10);
	});
});

describe('the one angle the whole graphic is built on', () => {
	it('is the tangent of the sweep angle', () => {
		expect(revealSweepAngleDeg).toBe(20.5);
		expect(revealLeanRatio).toBeCloseTo(Math.tan((20.5 * Math.PI) / 180), 10);
	});

	// The seam pivots on the centre and crosses it by one lean at each end, so an unbounded lean puts
	// a tall card's join an eighth of the way into the other team's half — 39.7px on the 210px live
	// card the popup really draws. Short cards keep the full angle; tall ones come down to meet them.
	it('leans by the card\'s height until that would cross more than a tenth of its width', () => {
		const width = 296;
		expect(revealLean(158, width)).toBeCloseTo((158 * revealLeanRatio) / 2, 6);
		expect(revealLean(212, width)).toBeCloseTo(width * revealLeanWidthCap, 6);
		expect(revealLean(400, width)).toBeCloseTo(width * revealLeanWidthCap, 6);
	});

	// And whatever the lean came out as, the bars are skewed by exactly the angle it describes, or a
	// bar stops being the edge it reveals along.
	it('skews the bars by the angle the lean it was given actually leans at', () => {
		expect(revealSkewDeg(revealLean(150, 296), 150)).toBeCloseTo(revealSweepAngleDeg, 6);
		const tall = 300;
		const lean = revealLean(tall, 296);
		expect(revealSkewDeg(lean, tall)).toBeLessThan(revealSweepAngleDeg);
		expect(Math.tan((revealSkewDeg(lean, tall) * Math.PI) / 180) * (tall / 2)).toBeCloseTo(lean, 6);
	});
});
