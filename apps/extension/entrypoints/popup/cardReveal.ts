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

// The poster — the two colours wiping in, the trade under the bars, the colour retreating. Every
// duration and delay in `global.scss` is a multiple of `--reveal-rate`, so a version of this graphic
// is the same choreography at a different speed rather than a different set of beats.
export const revealBaseDurationMs = 3400;

// And the beat that runs ahead of it on the first open of the day: the two crests oversized, bleeding
// off the card, settling as the colour arrives over them. Rate-scaled like everything else, so it is
// part of the graphic rather than a preamble to it, and `full` only.
//
// A phase was resisted twice before this and the objection was right both times: a light line drawing
// itself down the centre, and a flourish after the card resolves, were each a different graphic
// wearing this one's clothes. This one is not, because it is made of the two crests the poster already
// carries and it never stops moving — the oversized pair shrink straight into the hold the poster
// holds them at, under colour that is already covering them. There is no cut to hide.
export const revealOpenBeatMs = 800;

// 1.3 rather than the 1.5 the stretch alone needed. Once there is a beat carrying the extra time, the
// rest of it does not have to come out of playing the same thing slower: the graphic is longer than it
// was at 1.5 and less of that length is stretch.
export const revealFullRate = 1.3;
export const revealQuickRate = 0.8;

export const revealRate = (mode: revealMode) => {
	if (mode === 'full') return revealFullRate;
	if (mode === 'quick') return revealQuickRate;
	return 0;
};

// The poster's own length, which is what `3400ms * var(--reveal-rate)` resolves to in the stylesheet.
export const revealDurationMs = (mode: revealMode) => Math.round(revealBaseDurationMs * revealRate(mode));

// Nothing before the poster on any open but the first of the day: `quick` has to stay exactly the
// graphic it has always played, and a card that is not animating has no phases at all.
export const revealOpenMs = (mode: revealMode) => (
	mode === 'full' ? Math.round(revealOpenBeatMs * revealRate(mode)) : 0
);

// Both phases, which is what the card is removed after and what the popup counts its opening state in.
export const revealTotalMs = (mode: revealMode) => revealOpenMs(mode) + revealDurationMs(mode);

// Small on purpose: the cascade should read as one graphic arriving down the page rather than as
// each card taking its turn.
export const revealStaggerStepMs = 80;
// Roughly three cards fit the 560px frame, so past the sixth the start times are well off screen
// and staggering further only lengthens the whole thing to no visible end.
export const revealStaggerCapIndex = 6;

export const revealDelayMs = (index: number, mode: revealMode) => Math.round(
	Math.min(index, revealStaggerCapIndex) * revealStaggerStepMs * revealRate(mode),
);

// When this card's poster starts, which is once its opening beat has run. Written onto the card as
// `--reveal-spine` and the anchor every delay in the poster's half of the stylesheet is taken from —
// `--reveal-delay` is the cascade alone, and is what the opening beat itself starts on. The two are
// the same value in `quick`, which is how that version comes out unchanged.
export const revealSpineStartMs = (index: number, mode: revealMode) => (
	revealDelayMs(index, mode) + revealOpenMs(mode)
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
	mode === 'none' ? 0 : revealDelayMs(revealStaggerCapIndex, mode) + revealTotalMs(mode)
);

// How long the graphic gets to leave when somebody asks it to. Going straight to 'none' takes the
// wrapper away, and every beat of the card coming into focus fills `both` — so a cut mid-graphic is a
// card that blanks and then reappears, which is worse than the animation somebody was trying to
// escape. Short enough to read as leaving rather than as another beat.
export const revealSkipOutMs = 140;

// How big the opening pair are drawn, against the card's own height. Over 1, because the point of them
// is that they do not fit: at 1.34 a crest overhangs 17% of the card's height at the top and the same
// at the bottom, and the stage's clip cuts it at the card's edge, which is what reads as bleed rather
// than as a crest that happens to be large. Measured against height rather than width so the overhang
// is the same fraction on a finished card as on a live one — the two differ by half again in height
// and barely at all in width.
export const revealOpenCrestShare = 1.34;

// And how far out of the card's centre each of them sits, as a share of its width. Far enough that
// each bleeds off its own outer edge rather than sitting in the middle of its half, close enough that
// the pair still read as a pair.
export const revealOpenCrestOffsetShare = 0.32;

// The field the opening discs are drawn on, and the reason it is neither the dark plate the rest of
// the graphic builds over nor the white the card resolves into.
//
// The crests themselves are no longer the problem — each one sits on a disc now, and `teamCrest`
// settles the artwork against it. What has to read against this is the *disc*, and a disc is whatever
// colour a club publishes. A near-black field loses a navy disc's edge entirely; a white one loses the
// tinted plate a crest falls back to when its colours will not do. Neither end of the range holds for
// colours we do not get to choose.
//
// A mid tone needs no decision, because every colour sits far enough from the middle in one direction
// or the other. The figure was picked by rendering the four shapes real crest art takes against it —
// a navy monogram, a black mark with light interior detail, a mid colour and a near-white mark — back
// when this field carried them directly; it is kept because the discs it now carries span the same
// range and then some.
//
// Named here as well as in `global.scss`, which paints it, and pinned by a spec so the two cannot
// drift — including a bound on its luminance, which is the property that actually has to hold.
export const revealOpenSurfaceColor = '#5b6472';

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
