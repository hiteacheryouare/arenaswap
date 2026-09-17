import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
	pickRevealMode,
	revealAbbrBaseLength,
	revealAbbrScale,
	revealBaseDurationMs,
	revealDayStamp,
	revealDelayMs,
	revealDurationMs,
	revealHoldHeightShare,
	revealHoldScale,
	revealHoldWidthShare,
	revealLeanRatio,
	revealMaxCards,
	revealModeForIndex,
	revealPlateRatio,
	revealQuickRate,
	revealSettleMs,
	revealStaggerCapIndex,
	revealStaggerStepMs,
	revealSweepAngleDeg,
	revealSweepBarPx,
	revealSweepRun,
} from '../entrypoints/popup/cardReveal';

describe('which version of the open animation plays', () => {
	it('gives the full version the first time on a given day', () => {
		expect(pickRevealMode(null, '2026-09-15', false)).toBe('full');
		expect(pickRevealMode('2026-09-14', '2026-09-15', false)).toBe('full');
	});

	it('gives every open after that the same graphic, quicker', () => {
		expect(pickRevealMode('2026-09-15', '2026-09-15', false)).toBe('quick');
	});

	// Reduced motion wins over both, and deliberately leaves the stored day alone in
	// `resolveOpenRevealMode` — so turning the preference back off restores the full version that
	// day rather than a quick one against a day that was never actually shown.
	it('plays nothing at all under reduced motion', () => {
		expect(pickRevealMode(null, '2026-09-15', true)).toBe('none');
		expect(pickRevealMode('2026-09-15', '2026-09-15', true)).toBe('none');
	});
});

describe('the two speeds', () => {
	// One choreography, not two. If these ever stop being the same number scaled, the quick version
	// has become a different animation and the stylesheet's single `--reveal-rate` is a lie.
	it('runs the quick version at a fixed fraction of the full one', () => {
		expect(revealDurationMs('full')).toBe(revealBaseDurationMs);
		expect(revealDurationMs('quick')).toBe(Math.round(revealBaseDurationMs * revealQuickRate));
		expect(revealQuickRate).toBe(0.8);
	});

	it('takes no time at all when nothing is going to play', () => {
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
	it('steps once per card', () => {
		expect(revealDelayMs(0, 'full')).toBe(0);
		expect(revealDelayMs(1, 'full')).toBe(revealStaggerStepMs);
		expect(revealDelayMs(3, 'full')).toBe(revealStaggerStepMs * 3);
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
	it('waits for the last card to start and then to finish', () => {
		expect(revealSettleMs('full')).toBe(revealDelayMs(revealStaggerCapIndex, 'full') + revealDurationMs('full'));
		expect(revealSettleMs('quick')).toBe(revealDelayMs(revealStaggerCapIndex, 'quick') + revealDurationMs('quick'));
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

// The stylesheet writes these figures out by hand, because a keyframe cannot read a module. Every
// one of them is therefore two numbers that have to agree, and this file has been bitten by exactly
// that before — a version somebody had to remember to raise, left behind while the thing it
// versioned moved twice. So the agreement is asserted rather than trusted.
describe('the figures the stylesheet repeats by hand', () => {
	const stylesheet = readFileSync(path.join(__dirname, '../assets/global.scss'), 'utf8');

	it('runs every timeline over the base duration', () => {
		const durations = stylesheet.match(/calc\((\d+)ms \* var\(--reveal-rate\)\) linear var\(--reveal-delay\)/g) ?? [];
		expect(durations.length).toBeGreaterThan(0);
		durations.forEach(declaration => {
			expect(declaration).toContain(`${revealBaseDurationMs}ms`);
		});
	});

	// The bars are skewed by a figure written into the stylesheet, and the edge they reveal along is
	// cut by `--reveal-lean`, which comes off this constant. They stop being one line if either moves.
	it('skews the bars by the angle the lean is derived from', () => {
		const skews = stylesheet.match(/skewX\(-?([\d.]+)deg\)/g) ?? [];
		expect(skews.length).toBeGreaterThan(0);
		skews.forEach(skew => {
			expect(skew.replace('-', '')).toBe(`skewX(${revealSweepAngleDeg}deg)`);
		});
	});

	// The last beat of the card coming into focus has to be over before the wrapper is removed, or a
	// future easing turns the removal into a pop.
	it('finishes the last content beat before the wrapper is taken away', () => {
		// Every beat that reschedules itself off the card's own delay, which is the staggered run of
		// contents coming into focus plus the chasing bars.
		const beats = [...stylesheet.matchAll(/animation-delay: calc\(var\(--reveal-delay\) \+ (\d+)ms/g)]
			.map(match => Number(match[1]));
		const contentBeatMs = Number(/cardRevealContent calc\((\d+)ms/.exec(stylesheet)?.[1]);
		expect(beats.length).toBeGreaterThan(0);
		expect(Number.isFinite(contentBeatMs)).toBe(true);
		expect(Math.max(...beats) + contentBeatMs).toBeLessThanOrEqual(revealBaseDurationMs);
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
	// The stylesheet skews the bars by this same figure by hand. If one moves without the other,
	// the bar stops being parallel to the edge it is supposed to be revealing along.
	it('is the tangent of the sweep angle', () => {
		expect(revealSweepAngleDeg).toBe(20.5);
		expect(revealLeanRatio).toBeCloseTo(Math.tan((20.5 * Math.PI) / 180), 10);
	});
});
