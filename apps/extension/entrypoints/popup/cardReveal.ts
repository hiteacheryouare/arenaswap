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

// And the two scenes that run ahead of it on the first open of the day, both built out of the same
// two team colours: the crests oversized and bleeding off the card on the leaning split, and then
// that split laid flat as a pair of bands with the clubs named in full across them. Rate-scaled like
// everything else, so they are part of the graphic rather than a preamble to it, and `full` only.
//
// Two scenes rather than two layers, which is the whole reason this stays cheap. The colour fields
// are up for both and never move — the naming's bands are the same two colours re-cut over them, and
// the poster's own halves then wipe the leaning split back in — so what changes between the scenes is
// only what is drawn on them, and neither scene ever has to cut to the other.
//
// 1750 is the naming, and it is long because it is the one beat of this graphic that has something to
// read on it: 800 was the first version and left the names standing for about a sixth of a second,
// which is not long enough to read one club's name never mind two. It buys a full second of hold at
// the front of the poster, and the whole of it is skippable.
//
// A phase was resisted twice before any of this and the objection was right both times: a light line
// drawing itself down the centre, and a flourish after the card resolves, were each a different
// graphic wearing this one's clothes. These are not, because they are made of what the poster already
// carries — its two crests, and the two clubs it is about.
export const revealOpenBeatMs = 700;
export const revealNameBeatMs = 1750;

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

// Everything ahead of the poster, which is both scenes. Nothing on any open but the first of the day:
// `quick` has to stay exactly the graphic it has always played, and a card that is not animating has
// no phases at all.
export const revealOpenMs = (mode: revealMode) => (
	mode === 'full' ? Math.round((revealOpenBeatMs + revealNameBeatMs) * revealRate(mode)) : 0
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

// How the club named in full is set, now that the naming scene splits the card horizontally and
// gives each club a band of its own colour the full width of the card.
//
// The name breaks onto two lines or stays on one, and which of those draws it bigger is a fact about
// the name and the card rather than a rule: "Washington Commanders" on one line is 21px of type and
// on two it is 38, while "Miami Marlins" is 40 on one line and 35 on two — and the one-line version
// of it covers the whole card where the two-line version covers a third. So both are fitted and the
// bigger is drawn. `revealNameSpaceEm` is what makes that free: DM Sans bold advances are additive to
// the last decimal, measured, so the joined line's width is the two lines' plus a space and the
// component never has to render a candidate to measure it.
//
// Two lines at most, and the break is the club's own rather than a wrap: everything ahead of the
// nickname, then the nickname. ESPN carries both — `displayName` as `Team.name` and `team.name` as
// `Team.nickname` — so "Penn State Nittany Lions" breaks after "State" rather than inside "Nittany
// Lions", which is the break a wrap would take and the one that turns the Nittany Lions into the
// Lions. A club whose whole name is its nickname ("Barcelona") is one line, and a name we were sent
// no nickname for breaks at its last space, which is the right guess for every two-word club.
//
// One word per line was the version before this, and it is what capped the type: the longest word
// had to fit the box, so "COMMANDERS" sized the whole card and a three-word club came out as three
// small lines. Two lines of whatever length read as a lockup and leave the type twice the size.
export const revealNameLines = (name = '', nickname = ''): string[] => {
	const full = name.trim().replace(/\s+/g, ' ');
	if (!full) return [];
	const tail = nickname.trim().replace(/\s+/g, ' ');
	const breakAt = tail && tail.length < full.length && full.endsWith(tail)
		? full.length - tail.length
		: full.lastIndexOf(' ') + 1;
	if (breakAt <= 0) return [full];
	return [full.slice(0, breakAt).trim(), full.slice(breakAt)];
};

// And how big those lines are drawn, which is measured rather than counted. An advance is a property
// of the letters and not of their number — DM Sans bold caps run 0.637em a character for "MARLINS"
// and 0.739em for "COMMANDERS", a sixth more from the same count — so every version of this that
// sized the type off `name.length` either clipped the wide names or left the narrow ones small. The
// component reads each line's own advance off the DOM and hands the ratios in here, so nothing in
// this file has to know what a letter is worth.
//
// Every line of a club's name is justified to one block width, which is what makes the naming read
// as a lockup rather than as a sentence: "MIAMI" and "MARLINS" are drawn at different sizes so that
// the two of them span the same width. Each club is fitted to its own band rather than the pair
// being fitted together, because the bands are separated by a colour change and each one should be
// as full as its own name allows — sharing a width would let the shorter name's height budget cap
// the longer name's type.
//
// Bound three ways, and which bound bites depends on the name and on the card. The band's width is
// the obvious one. The band's height is what binds on short cards, because two lines justified to
// the full width of a 296px card are taller than half a finished card. And the cap is what stops a
// two-letter line ("AC", of "AC Milan") being drawn at the height of the card for no reason but its
// own shortness — a little over the tricode's 3.4rem, which is as big as anything in this graphic
// ever needs to be.
// The leading, which the fit has to know because the stack's height is the sum of the line boxes
// rather than of the sizes. It is the one figure in here that the type's case decides. A block of
// caps sets happily at 0.82 and this was drawn that way for a pass; mixed case cannot, because a
// line box tighter than the glyphs it holds puts the descenders of one line through the ascenders of
// the next — measured on "Washington" over "Commanders", 0.92 overlapped them by 3.5px. 1.06 leaves
// a gap at every size ratio two lines of one name can take, and costs about a tenth of the type's
// height against the version that had no descenders to clear.
export const revealNameLineHeight = 1.06;
export const revealNameMaxPx = 72;
export const revealNameInsetPx = 12;
// And the share of the band the stack's ink may fill, the rest being margin. The band's edge is a
// hard colour boundary rather than a margin of its own — past it is the other club's colour on one
// side and the popup's background on the other — so this is the only clearance there is.
export const revealNameHeightShare = 0.86;

// Where the ink sits inside a line box, per em, measured off DM Sans 700 with canvas `TextMetrics`
// rather than guessed: `fontBoundingBox` ascent 0.99 and descent 0.31, ink ascent 0.725 (which is an
// ascender — caps stop at 0.712) and ink descent 0.232. A line box of height L puts its baseline at
// `L / 2 + 0.34`, so the ink runs from `L / 2 - 0.385` to `L / 2 + 0.572` measured from the top of
// the box — which is to say the box neither starts nor ends where the letters do, and at any leading
// under 1.144 the descenders of the last line hang below the box entirely.
//
// Two things need that. The height budget is against the ink rather than against the boxes, or the
// bottom of a "g" lands outside the band it belongs to — measured, it came within a pixel of the
// card's own edge. And the block is lifted so that the ink is centred in the band rather than the
// boxes being: the ink sits low in its boxes, by 0.145em at the top and 0.042 at the bottom at this
// leading, which is 3px of a 5px margin handed from one side to the other.
export const revealNameInkTopEm = 0.385;
export const revealNameInkBottomEm = 0.572;

// The space, from the same measurement: 0.2355em, and `measureText('Miami Marlins')` comes to
// `measureText('Miami') + measureText('Marlins')` plus exactly that.
export const revealNameSpaceEm = 0.2355;

export const revealNameJoinedRatio = (ratios: number[]) => (
	ratios.reduce((total, ratio) => total + ratio, 0) + revealNameSpaceEm * Math.max(0, ratios.length - 1)
);

const inkGapEm = () => Math.max(0, revealNameLineHeight / 2 - revealNameInkTopEm);
const inkHangEm = () => Math.max(0, revealNameInkBottomEm - revealNameLineHeight / 2);

// And how far apart two lines of one name are allowed to be drawn. Justification alone sizes a line
// by the reciprocal of its length, so a two-letter line beside a five-letter one comes out two and a
// half times the height of it — "AC" set over a small "MILAN", which reads as a mistake rather than
// as a lockup. Past 1.8 the longer line keeps its size and the shorter one stops growing, so the
// block goes ragged instead: which is what type does, and only ever makes the block shorter than the
// bound it was already inside.
export const revealNameSpread = 1.8;

export const revealNameFit = (ratios: number[], boxWidth: number, boxHeight: number) => {
	if (!ratios.length || ratios.some(ratio => !(ratio > 0))) return ratios.map(() => 0);
	const width = Math.max(0, boxWidth - revealNameInsetPx * 2);
	const height = Math.max(0, boxHeight * revealNameHeightShare);
	// The ink's height per pixel of block width. A line justified to the block is `block / ratio`
	// tall, so the stack of boxes is `block` times the sum of the reciprocals — and then the ink
	// starts inside the first box and ends outside the last one.
	const stacked = ratios.reduce((total, ratio) => total + revealNameLineHeight / ratio, 0);
	const ink = stacked - inkGapEm() / ratios[0]! + inkHangEm() / ratios[ratios.length - 1]!;
	const block = Math.min(width, height / ink);
	const justified = ratios.map(ratio => block / ratio);
	const spread = Math.min(...justified) * revealNameSpread;
	return justified.map(size => Math.min(size, spread, revealNameMaxPx));
};

// How far up the block is drawn from where its boxes would centre it, so that the ink is what ends
// up centred in the band. The ink is low in its boxes at both ends — a gap at the top of the first,
// a hang below the bottom of the last — so half the difference is the correction.
export const revealNameLift = (sizes: number[]) => (
	sizes.length && sizes.every(size => size > 0)
		? (inkGapEm() * sizes[0]! + inkHangEm() * sizes[sizes.length - 1]!) / 2
		: 0
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
