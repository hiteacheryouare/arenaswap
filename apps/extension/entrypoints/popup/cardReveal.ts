export type revealMode = 'full' | 'quick' | 'none';

export interface cardRevealPlan {
	mode: revealMode;
	// Position down the rendered page, which is not the order of any one list: the page is four
	// sections and each of those is grouped by league before it is drawn.
	order: Map<string, number>;
	// Somebody has asked to be out of it. Carried on the plan rather than read per card, because the
	// whole list leaves together — a graphic that let go of one card at a time would be eight endings.
	skipping: boolean;
}

// One choreography, played at two speeds. Every delay in `global.scss` is written as a multiple of
// `--reveal-rate`, so the second open of the day is the same graphic in less time rather than a
// shorter graphic — there is no beat in this worth cutting, only beats worth taking quicker.
//
// Which is also what makes the long cut one number rather than a second timeline. The first open of
// the day wanted to be nearer five seconds and to carry more on the poster, and the temptation was a
// phase before the colour arrives and another after it resolves. Both were built on paper and both
// were wrong: they are a different graphic wearing this one's clothes. At 1.5 every beat this already
// has takes half again as long in the same proportion to every other, the stylesheet's timing does not
// move at all, and `quick` stays exactly what it plays today because only `full`'s rate changed.
export const revealBaseDurationMs = 3400;
export const revealFullRate = 1.5;
export const revealQuickRate = 0.8;

export const revealRate = (mode: revealMode) => {
	if (mode === 'full') return revealFullRate;
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

// How long the graphic gets to leave when somebody asks it to. Going straight to 'none' takes the
// wrapper away, and every beat of the card coming into focus fills `both` — so a cut mid-graphic is a
// card that blanks and then reappears, which is worse than the animation somebody was trying to
// escape. Short enough to read as leaving rather than as another beat.
export const revealSkipOutMs = 140;

// tan(20.5 degrees). The steepest the graphic ever leans, and on most cards the angle it holds: the
// bars are skewed by it, the seam between the two team colours leans by it, the edge each wipe
// reveals its crest along is cut to it, and that seam straightens back to vertical as the card
// resolves.
export const revealSweepAngleDeg = 20.5;
export const revealLeanRatio = Math.tan((revealSweepAngleDeg * Math.PI) / 180);

// How far the seam may cross the card's centre, as a share of the card's width.
//
// The lean is half the horizontal run of the angle across the card's height, and the seam pivots on
// the centre — so it crosses by one lean at the top and one at the bottom, and a taller card crosses
// further for no reason a viewer can see. Measured in the shipped popup: a live NBA card is 210px
// tall, which at the full angle is 39.7px of a 296px card, better than an eighth of the way across.
// The halves still hold exactly half the card each, but the bottom row of one is 63% the other
// team's colour, which reads as the right-hand block having been slid across into the left.
//
// A tenth of the width is what a 158px card reaches at the full angle, so the shorter cards in a
// list are untouched and the tall ones come down to meet them: the crossing becomes a fact about the
// card you are looking at rather than about how many rows it happens to carry.
export const revealLeanWidthCap = 0.1;

export const revealLean = (stageHeight: number, cardWidth: number) => Math.min(
	(stageHeight * revealLeanRatio) / 2,
	cardWidth * revealLeanWidthCap,
);

// And the bars are skewed by whatever angle that lean came out as, rather than by the constant above.
// Derived rather than named twice: the bar has to stay parallel to the edge it reveals along, and two
// figures that have to agree by hand are two figures that will not.
export const revealSkewDeg = (lean: number, stageHeight: number) => (
	stageHeight <= 0 ? revealSweepAngleDeg : (Math.atan((lean * 2) / stageHeight) * 180) / Math.PI
);

// How far the stage bleeds past the card, up and down. A cover of exactly the card's shape cannot
// hide the card's own edges — both are antialiased, so the two coverages fall short of 1 together
// and what is left of the card shows through as a light line. A pixel of bleed makes every pixel the
// card paints at all a pixel the cover paints entirely. `global.scss` names the same pixel twice,
// as the stage's `inset` and as the pixel its clip adds to the other two sides; the lean is measured
// across the bled height rather than the card's, so the seam leans over the box it is actually drawn
// on and stays parallel to the bar that reveals along it.
export const revealStageBleedPx = 1;

// The poster lettering is ESPN's own `abbreviation`, which is not capped: three characters for a
// professional club, four or five for a college. Drawn at one size the two sides collide over the
// seam — measured on a 296px card, ARMY against NAVY overlaps by 7px and UCONN by 52 — so the type
// is scaled by the length of the longer of the two. Scaled rather than truncated, because "ARM" at
// "NAV" is a worse answer than smaller type, and because these are the only words in the graphic.
export const revealAbbrBaseLength = 3;

export const revealAbbrScale = (away = '', home = '') => (
	revealAbbrBaseLength / Math.max(revealAbbrBaseLength, away.length, home.length)
);

// The width the stylesheet draws the leading bar at. Named here because the travel below is measured
// from it, and a bar has to clear its own width before it is off the card.
export const revealSweepBarPx = 22;

// How far a bar travels: from parked one bar width and one lean clear of the edge it comes in from,
// to one lean clear of the edge it leaves by. The lean is in it twice because a strip skewed about
// its own centre reaches that far to either side of where it is positioned, so the parked position
// that is genuinely off the card is a lean further out than it looks — 18% of the card's width used
// to be the figure, and on a card tall enough it was not enough, which put a white wedge in a corner
// for as long as the bar sat there. Carried as a length rather than left as the `left` offsets it
// reads as, because `left` is a layout property: a thirty-game Saturday opens with 32 bars on it and
// Blink cannot composite one of them. As a translation they all run off the compositor.
export const revealSweepRun = (cardWidth: number, lean: number) => cardWidth + revealSweepBarPx + lean * 2;

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
