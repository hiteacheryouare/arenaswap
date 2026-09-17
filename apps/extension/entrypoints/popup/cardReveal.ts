export type revealMode = 'full' | 'quick' | 'none';

export interface cardRevealPlan {
	mode: revealMode;
	// Position down the rendered page, which is not the order of any one list: the page is four
	// sections and each of those is grouped by league before it is drawn.
	order: Map<string, number>;
}

// One choreography, played at two speeds. Every delay in `global.scss` is written as a multiple of
// `--reveal-rate`, so the second open of the day is the same graphic in less time rather than a
// shorter graphic — there is no beat in this worth cutting, only beats worth taking quicker.
export const revealBaseDurationMs = 3400;
export const revealQuickRate = 0.8;

export const revealRate = (mode: revealMode) => {
	if (mode === 'full') return 1;
	if (mode === 'quick') return revealQuickRate;
	return 0;
};

export const revealDurationMs = (mode: revealMode) => Math.round(revealBaseDurationMs * revealRate(mode));

// Small on purpose: the cascade should read as one graphic arriving down the page rather than as
// each card taking its turn.
export const revealStaggerStepMs = 80;
// Roughly three cards fit the 560px frame, so past the sixth the start times are well off screen
// and staggering further only lengthens the whole thing to no visible end.
export const revealStaggerCapIndex = 6;

export const revealDelayMs = (index: number, mode: revealMode) => Math.round(
	Math.min(index, revealStaggerCapIndex) * revealStaggerStepMs * revealRate(mode),
);

// Past this the cards are not merely off screen, they are off screen and expensive: each one is a
// dozen animated elements, two of which animate width and four of which animate clip-path. Eight is
// well past the three a 560px frame holds, and past anything you could scroll to while it runs.
export const revealMaxCards = 8;

export const revealModeForIndex = (mode: revealMode, index: number): revealMode => (
	index < revealMaxCards ? mode : 'none'
);

// When the last card to start has finished, and so when the popup stops being in its opening state
// at all. Going to settings and back after this point must not replay anything.
export const revealSettleMs = (mode: revealMode) => (
	mode === 'none' ? 0 : revealDelayMs(revealStaggerCapIndex, mode) + revealDurationMs(mode)
);

// tan(20.5 degrees). One angle for the whole graphic: the wipes are skewed by it, the seam between
// the two team colours leans by it, the edge each wipe reveals its crest along is cut to it, and
// that seam straightens back to vertical as the card resolves.
export const revealSweepAngleDeg = 20.5;
export const revealLeanRatio = Math.tan((revealSweepAngleDeg * Math.PI) / 180);

// The poster lettering is ESPN's own `abbreviation`, which is not capped: three characters for a
// professional club, four or five for a college. Drawn at one size the two sides collide over the
// seam — measured on a 296px card, ARMY against NAVY overlaps by 7px and UCONN by 52 — so the type
// is scaled by the length of the longer of the two. Scaled rather than truncated, because "ARM" at
// "NAV" is a worse answer than smaller type, and because these are the only words in the graphic.
export const revealAbbrBaseLength = 3;

export const revealAbbrScale = (away = '', home = '') => (
	revealAbbrBaseLength / Math.max(revealAbbrBaseLength, away.length, home.length)
);

// How far a bar travels, as a multiple of the card's width: it starts its own 18% clear of one edge
// and leaves 18% clear of the other. Carried as a length rather than left as the `left: -18% → 118%`
// it reads as, because `left` is a layout property — a thirty-game Saturday opens with 32 bars on it
// and Blink cannot composite one of them. As a translation they all run off the compositor.
export const revealSweepRunShare = 1.36;

// What the product draws a crest plate at wherever it draws one: the mark fills three quarters of
// it, because a circle the size of a wordmark shaves the wordmark's ends off. The poster crest is
// sized so that the mark inside the plate — rather than the plate around it — is what lands on the
// card's own crest, so a team that gets a plate and a team that does not arrive at the same size.
export const revealPlateRatio = 4 / 3;

// How big the poster crest is at the hold, as the card sees it. Two bounds, because two things can
// be the binding one: the plate cannot be taller than the card it is drawn on, and it cannot be
// wider than the half of the card it stands in or the two of them collide over the seam. Measured
// rather than fixed — a pre-game card carrying odds and weather is half again the height of a
// finished one, and one scale cannot be right on both.
export const revealHoldHeightShare = 0.9;
export const revealHoldWidthShare = 0.42;

export const revealHoldScale = (cardWidth: number, cardHeight: number, crestSize: number) => {
	if (crestSize <= 0) return 1;
	const plate = Math.min(cardHeight * revealHoldHeightShare, cardWidth * revealHoldWidthShare);
	// Never below 1: the landing size is the card's own crest, and a poster smaller than the thing
	// it resolves into would walk backwards into place.
	return Math.max(1, plate / (crestSize * revealPlateRatio));
};

// `localStorage` rather than `storage.local`, for the same reason the crest legibility cache uses
// it: this is read while the first cards render and has to be synchronous. An async read races the
// slate, and losing that race means the animation starts over an already-painted list.
export const lastRevealDayKey = 'arenaswap.lastOpenReveal';

export const revealDayStamp = (now: Date) => [
	now.getFullYear(),
	String(now.getMonth() + 1).padStart(2, '0'),
	String(now.getDate()).padStart(2, '0'),
].join('-');

export const pickRevealMode = (lastDay: string | null, today: string, reducedMotion: boolean): revealMode => {
	if (reducedMotion) return 'none';
	return lastDay === today ? 'quick' : 'full';
};

// Memoised rather than guarded: a guard that answered 'none' the second time would be correct for
// its purpose and wrong under StrictMode, which calls every `useState` initialiser twice and would
// leave the development build the one build that never animates.
let resolved: revealMode | null = null;

export const resolveOpenRevealMode = (now = new Date()): revealMode => {
	if (resolved !== null) return resolved;
	const today = revealDayStamp(now);
	const lastDay = globalThis.localStorage?.getItem(lastRevealDayKey) ?? null;
	const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
	resolved = pickRevealMode(lastDay, today, reducedMotion);
	// Not written when the mode is 'none': somebody who has asked for less motion should still get
	// the full version on the day they turn that preference back off.
	if (resolved !== 'none') globalThis.localStorage?.setItem(lastRevealDayKey, today);
	return resolved;
};
