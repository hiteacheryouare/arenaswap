import { hexLuminance as luminance, hexToRgb, isHex, rgbToHex } from './colorMath';

const mixTowardWhite = (value: string, amount: number): string => {
	const rgb = hexToRgb(value);
	if (!rgb) return value;
	const toward = (channel: number): number => channel + (255 - channel) * amount;
	return rgbToHex(toward(rgb.red), toward(rgb.green), toward(rgb.blue));
};

// Scales every channel by the same factor, which raises lightness while leaving the ratios
// between the channels — and so the hue — where they were. Mixing toward white instead adds an
// equal amount to all three, which pulls them together and drains the colour: Mets navy came out
// #7a92b6 and Yankees navy came out #818d9c, two greys that read as the same non-colour.
const brighten = (value: string, factor: number): string => {
	const rgb = hexToRgb(value);
	if (!rgb) return value;
	return rgbToHex(rgb.red * factor, rgb.green * factor, rgb.blue * factor);
};

// A pure black or near-black has no hue to preserve, so scaling it does nothing at all. Only these
// fall back to a grey, and they are the one case where a grey is the honest answer.
const hasHue = (value: string): boolean => {
	const rgb = hexToRgb(value);
	return rgb !== null && Math.max(rgb.red, rgb.green, rgb.blue) >= 12;
};

// Chart lines are non-text, so WCAG wants 3:1 against the chart background. That background is
// #0d1117 (luminance 0.0055), which puts the 3:1 boundary at luminance 0.1164.
const seriesLuminanceFloor = 0.1164;

const resolveReadableSeriesColor = (value: string | undefined, fallback: string): string => {
	if (!value || !hexToRgb(value)) return fallback;
	if (luminance(value) >= seriesLuminanceFloor) return value;
	if (!hasHue(value)) return mixTowardWhite(value, 0.48);
	// Climbed rather than solved: luminance is not linear in the scale factor, and a loop of a
	// dozen steps is cheaper to read than the inverse of the sRGB transfer function.
	let brightened = value;
	for (let step = 0; step < 24 && luminance(brightened) < seriesLuminanceFloor; step++) {
		brightened = brighten(brightened, 1.18);
	}
	// Scaling has a ceiling, and a pure blue is sitting on it: its brightest channel is already 255
	// while the other two round straight back to themselves, so the loop above runs 24 times and
	// returns the colour it was given. Mixing toward white is the only way up from there, so a hue
	// that cannot clear the floor by scaling gives up some of its saturation rather than staying
	// unreadable. Nothing that already clears the floor reaches this — all five of the league navies
	// the scaling was written for finish the loop above with room to spare.
	for (let step = 0; step < 24 && luminance(brightened) < seriesLuminanceFloor; step++) {
		brightened = mixTowardWhite(brightened, 0.12);
	}
	return brightened;
};

// The mirror of the above, for team text printed on one of the light detail cards. Those are
// #f8fafc (luminance 0.9536) and the text is small, so it needs 4.5:1 rather than the 3:1 a chart
// line or a large score gets — which puts the ceiling at luminance 0.173. Half the league fails
// it, and the Penguins' and Bruins' gold reaches only 1.7:1 untouched.
const smallCardTextLuminanceCeiling = 0.173;

const resolveReadableCardTextColor = (
	value: string | undefined,
	fallback: string,
	ceiling: number,
): string => {
	if (!value || !hexToRgb(value)) return fallback;
	let darkened = value;
	for (let step = 0; step < 24 && luminance(darkened) > ceiling; step++) {
		darkened = brighten(darkened, 0.86);
	}
	return darkened;
};

const colorDistance = (a: string, b: string): number => {
	const ra = hexToRgb(a);
	const rb = hexToRgb(b);
	if (!ra || !rb) return 0;
	return Math.sqrt((ra.red - rb.red) ** 2 + (ra.green - rb.green) ** 2 + (ra.blue - rb.blue) ** 2);
};

const clashThreshold = 65;

const isUsable = (hex: string): boolean => { const l = luminance(hex); return l >= 0.03 && l <= 0.95; };

// Within a hair of pure black or pure white. `12` is the threshold `hasHue` already uses, and it is
// deliberately tight rather than luminance-based: the Yankees' #0C2340 is dark enough that a
// luminance test calls it unreadable, and it is still a navy rather than ink.
const isInk = (hex: string): boolean => {
	const rgb = hexToRgb(hex);
	if (!rgb) return false;
	const channels = [rgb.red, rgb.green, rgb.blue];
	return channels.every(channel => channel <= 12) || channels.every(channel => channel >= 245);
};

const inkPair = (away: string, home: string): boolean => isInk(away) && isInk(home);

// Every candidate below is a colour one of the two teams published, or the caller's own fallback for
// a team that published none. Nothing here lightens, darkens or otherwise invents a colour.
const pickPair = (ap: string, aa: string, hp: string, ha: string): [string, string] => {
	if (colorDistance(ap, hp) >= clashThreshold && !inkPair(ap, hp)) return [ap, hp];

	const candidates: [string, string][] = [[ap, ha], [aa, hp], [aa, ha]];
	const farthest = (pool: [string, string][]): [string, string] => pool.reduce(
		(best, candidate) => colorDistance(candidate[0], candidate[1]) > colorDistance(best[0], best[1]) ? candidate : best,
	);

	const usable = candidates.filter(([away, home]) => isUsable(away) && isUsable(home));
	if (usable.length > 0) {
		const best = farthest(usable);
		return colorDistance(best[0], best[1]) > colorDistance(ap, hp) ? best : [ap, hp];
	}

	// No substitution is readable on both sides. Ranking the *unfiltered* candidates by distance is
	// what this used to do, and that objective has exactly one global optimum: black against white is
	// 441.7 apart, the largest distance RGB contains, so it won by construction. Baltimore publish a
	// purple and Indianapolis a navy, and the card drew ink.
	//
	// So the teams' own primaries stand — unless they are themselves ink on both sides, in which case
	// any published combination that is not is worth more than the pair being maximally far apart.
	if (!inkPair(ap, hp)) return [ap, hp];
	const notInk = candidates.filter(([away, home]) => !inkPair(away, home));
	return notInk.length > 0 ? farthest(notInk) : [ap, hp];
};

// White on a team colour is fine for the navies and reds and unreadable on a gold. 0.1833 is where
// white stops clearing 4.5:1 — contrast is 1.05 / (L + 0.05) — and these labels are too small to
// qualify for the 3:1 large-text allowance.
export const readableInkOn = (background: string, light = '#ffffff', dark = '#111827'): string => (
	isHex(background) && luminance(background) > 0.1833 ? dark : light
);

// A crest sits on a white disc tinted with its own colour rather than on the surface behind it: a
// navy logo on a navy half of a poster is invisible, and every league has at least one. `28` is the
// alpha the matchup card already uses for its team-colour washes. No colour leaves the disc plain
// white, which still separates the crest from a dark background.
export const crestBacking = (color: string | null | undefined): string => (
	isHex(color)
		? `linear-gradient(160deg, ${color}14, ${color}28), #ffffff`
		: '#ffffff'
);

// A team-colour wash across a row, fading out to the right so whatever sits at the end of the row
// — a leader's stat line, a line score's R-H-E — lands on the plain card rather than on colour.
// `28` is the same alpha the matchup card and the crest disc use, so one team's colour reads the
// same weight everywhere it appears. Read by the pre-game leader rows and the box score's line
// score; a second copy of the formula is how the two would drift.
export const teamRowWash = (color: string | null | undefined): string | undefined => (
	isHex(color)
		? `linear-gradient(90deg, ${color}28, ${color}00 72%)`
		: undefined
);

// A team's own colour, darkened only as far as it must be to be read as a small label on the light
// detail cards — the line score's team abbreviations and the pre-game leader rows, both about
// 9px. Darkened rather than swapped for grey, so gold lands on a dark bronze and a navy or red
// that already clears the bar is left alone.
export const readableTeamInkOnCard = (color: string | null | undefined, fallback = '#111827'): string => (
	resolveReadableCardTextColor(color ?? undefined, fallback, smallCardTextLuminanceCeiling)
);

export const resolveTeamColorPair = (
	away: { color?: string; alternateColor?: string },
	home: { color?: string; alternateColor?: string },
	awayFallback = '#60a5fa',
	homeFallback = '#f87171',
	lighten = false,
): [string, string] => {
	const [a, h] = pickPair(
		away.color ?? awayFallback,
		away.alternateColor ?? awayFallback,
		home.color ?? homeFallback,
		home.alternateColor ?? homeFallback,
	);
	return lighten
		? [resolveReadableSeriesColor(a, awayFallback), resolveReadableSeriesColor(h, homeFallback)]
		: [a, h];
};

// The alpha the hero's scrim sits at where the crests are — the gradient ramps 0.18 to 0.52 down the
// block and the crests are in its upper third.
const heroScrimAlpha = 0.28;
const heroScrimColor = { red: 3, green: 7, blue: 12 };

// A team colour as it actually appears under the hero's scrim, which is the surface a crest drawn on
// that hero has to stand off — not the published colour, which is a good deal lighter.
export const underHeroScrim = (color: string): string => {
	const rgb = hexToRgb(color);
	if (!rgb) return '#0d1117';
	const mix = (ink: number, over: number): number => ink + (over - ink) * heroScrimAlpha;
	return rgbToHex(
		mix(rgb.red, heroScrimColor.red),
		mix(rgb.green, heroScrimColor.green),
		mix(rgb.blue, heroScrimColor.blue),
	);
};
