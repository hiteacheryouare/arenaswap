import {
	pickRevealMode,
	revealBaseDurationMs,
	revealDayStamp,
	revealDelayMs,
	revealDurationMs,
	revealLeanRatio,
	revealMaxCards,
	revealModeForIndex,
	revealQuickRate,
	revealSettleMs,
	revealStaggerCapIndex,
	revealStaggerStepMs,
	revealSweepAngleDeg,
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

describe('the one angle the whole graphic is built on', () => {
	// The stylesheet skews the bars by this same figure by hand. If one moves without the other,
	// the bar stops being parallel to the edge it is supposed to be revealing along.
	it('is the tangent of the sweep angle', () => {
		expect(revealSweepAngleDeg).toBe(20.5);
		expect(revealLeanRatio).toBeCloseTo(Math.tan((20.5 * Math.PI) / 180), 10);
	});
});
