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
