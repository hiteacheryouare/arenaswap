// ESPN's `displayClock`, read into seconds. Its own module, with no imports, because the docs
// site needs it too and everything else in `apiClient` drags zod and the whole ESPN client onto a
// marketing page. Anything unreadable answers 0 — the honest value for "we do not know how much
// time is left" — rather than throwing or leaking a NaN into the score.
export const parseClockToSeconds = (clock: string): number => {
	// Soccer prime notation: "85'" or "90'+8'" (base minutes + optional stoppage)
	if (clock.includes("'")) {
		const primeMatch = /^(\d+)'\+(\d+)'$/.exec(clock) ?? /^(\d+)'$/.exec(clock);
		if (primeMatch) {
			const base = parseInt(primeMatch[1]!, 10);
			const stoppage = primeMatch[2] ? parseInt(primeMatch[2], 10) : 0;
			return (base + stoppage) * 60;
		}
		return 0;
	}
	const parts = clock.split(':');
	// A clock with no colon is seconds, decimals and all. The basketball leagues switch to this
	// form under a minute and never send `0:xx`; hockey and gridiron stay on `M:SS` the whole way
	// down. Checked against ESPN on 2026-09-21: a WNBA play-by-play carries `1.0` and `0.3` in the
	// same period, and an NBA one runs `40.8` down to `0.1`.
	//
	// This used to read anything under 1 as decimal *minutes*, which made `0.3` eighteen seconds
	// and put the clock 0:18 wrong at the one moment the product exists to catch.
	//
	// A fraction of a second still on the clock reads as 1, not 0: `0.8` flooring to the buzzer made
	// PowerScore treat a one-point game with a possession left as decided.
	if (parts.length === 1) {
		const n = Number(parts[0]);
		if (!Number.isFinite(n) || n <= 0) return 0;
		return Math.max(1, Math.floor(n));
	}
	if (parts.length !== 2) return 0;
	const min = Number(parts[0]);
	const sec = Number(parts[1]);
	// Finite rather than nullish: "--:--" splits into two parts that are both NaN, which `??`
	// lets straight through. Every other branch here answers unreadable input with 0.
	if (!Number.isFinite(min) || !Number.isFinite(sec)) return 0;
	return (min * 60) + Math.floor(sec);
};

// A colon-free clock in tenths, so a card can print 45.3 or 0.8 the way a broadcast does. Undefined
// for every other format, which already reads exactly as a broadcast writes it.
export const parseClockTenths = (clock: string): number | undefined => {
	if (!/^\d+(?:\.\d+)?$/.test(clock)) return undefined;
	return Math.round(Number(clock) * 10);
};

// The added minutes in soccer's "90'+4'", or undefined when the clock is inside the regular half.
export const parseStoppageMinutes = (clock: string): number | undefined => {
	const added = /^\d+'\+(\d+)'$/.exec(clock)?.[1];
	return added ? parseInt(added, 10) || undefined : undefined;
};
