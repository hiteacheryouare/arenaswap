import { teamLogoOnColor } from '@arenaswap/core/constants';
import type { ResolvedTheme } from '@arenaswap/core/types';
import type { Rgb } from './colorMath';
import { colorDifference, contrastBetween, hexLuminance as luminance, hexToLab, hexToRgb, isHex, labChroma, rgbToHex, whiteInkContrast } from './colorMath';
import { cachedLogoSwitchColor } from './logoSwitchColor';

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
	// unreadable.
	for (let step = 0; step < 24 && luminance(brightened) < seriesLuminanceFloor; step++) {
		brightened = mixTowardWhite(brightened, 0.12);
	}
	return brightened;
};

// The mirror of the above, for team text printed on one of the light detail cards. Those are
// #f8fafc (luminance 0.9536) and the text is small, so it needs 4.5:1 rather than the 3:1 a chart
// line gets — which puts the ceiling at luminance 0.173. Half the league fails
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

// A chart line on the light page, which is #ffffff, clears the same 3:1 at luminance 0.30 or under.
// So the light side is the card-text rule with a looser ceiling: gold goes bronze, navy is left alone.
const seriesOnLightLuminanceCeiling = 0.3;

// What Apple Sports does when two teams look alike, worked out from 44 of its matchups: the away
// team changes and the home team never does. "Alike" is CIEDE2000 under 11 — Sabres navy against
// Blue Jackets navy at 8.9 switched, Alabama crimson against Mississippi State maroon at 13.4
// did not. A team that switches takes its alternate, unless that is white: Apple never paints a
// side white, and goes to a colour out of the crest instead (Maryland's gold, Louisville's black).
const clashDifference = 11;

const isNearWhite = (hex: string): boolean => {
	const lab = hexToLab(hex);
	return lab !== null && lab.lightness > 95 && labChroma(lab) < 5;
};

interface matchupTeam {
	color?: string;
	alternateColor?: string;
	logo?: string;
}

const primaryOf = (team: matchupTeam): string | undefined => (
	isHex(team.color) ? team.color : isHex(team.alternateColor) ? team.alternateColor : undefined
);

const usableAlternate = (team: matchupTeam): string | undefined => (
	isHex(team.alternateColor) && !isNearWhite(team.alternateColor) ? team.alternateColor : undefined
);

// Undefined where the switch colour is still to be read off a crest, or the crest has none to give.
const switchColor = (team: matchupTeam, primary: string): string | undefined => {
	const alternate = usableAlternate(team);
	if (alternate) return alternate;
	const crest = teamLogoOnColor(team.logo);
	return crest ? cachedLogoSwitchColor(crest, primary) ?? undefined : undefined;
};

// The crest a card has to read before it can paint the away side, if any. Lets a component ask for
// the measurement without knowing anything about the rule above.
export const pendingSwitchCrest = (away: matchupTeam, home: matchupTeam): { crest: string; primary: string } | null => {
	const awayPrimary = primaryOf(away);
	const homePrimary = primaryOf(home);
	if (!awayPrimary || !homePrimary || colorDifference(awayPrimary, homePrimary) >= clashDifference) return null;
	if (usableAlternate(away)) return null;
	const crest = teamLogoOnColor(away.logo);
	if (!crest || cachedLogoSwitchColor(crest, awayPrimary) !== undefined) return null;
	return { crest, primary: awayPrimary };
};

const pickPair = (away: matchupTeam, home: matchupTeam, awayPrimary: string, homePrimary: string): [string, string] => {
	if (colorDifference(awayPrimary, homePrimary) >= clashDifference) return [awayPrimary, homePrimary];
	// A switch that still looks like the home side has not fixed anything.
	const awaySwitch = switchColor(away, awayPrimary);
	if (awaySwitch && colorDifference(awaySwitch, homePrimary) >= clashDifference) return [awaySwitch, homePrimary];
	// Apple's own data always has an away colour to give. Ours sometimes does not, and two identical
	// sides is worse than the home team stepping aside.
	return [awayPrimary, usableAlternate(home) ?? homePrimary];
};

// White on a team colour is fine for the navies and reds and unreadable on a gold. Neither ink
// clears 4.5:1 across the whole range, so this takes the better of the two rather than switching
// where white leaves the bar: 0.1833 is where white drops under 4.5:1, but #111827 is already
// under it there too, and between 0.1833 and 0.1993 — Atlanta's #E03A3E, the Chargers' #0080C6 —
// the old threshold threw away the more legible white. Comparing follows a caller's own inks.
export const readableInkOn = (background: string, light = '#ffffff', dark = '#111827'): string => {
	if (!isHex(background)) return light;
	const backdrop = luminance(background);
	return contrastBetween(backdrop, luminance(dark)) > contrastBetween(backdrop, luminance(light))
		? dark
		: light;
};

// Display type drawn on a team's own colour, which is what the opening graphic sets: a club named
// across the width of the card, and a tricode at 3.4rem. White is right for most of the league and
// wrong for the clubs whose published colour is a white or a silver, which would be named in white
// on a white band.
//
// 3:1 rather than `readableInkOn`'s 4.5:1, which is the allowance the size of this type earns: at
// the small-text bar a Carolina blue flips too, and inverting a card nobody struggled to read is a
// worse answer than the one it replaces.
const displayInkContrast = 3;

// And the ink a light band falls back to is the club's other published colour before it is any grey
// of ours: Penn State navy on Penn State white is what a broadcast would cut, and it is a colour
// they already own. The near-black is only for a club that has nothing else to offer — one colour,
// or two light ones.
export const teamDisplayInk = (
	team: { color?: string; alternateColor?: string },
	surface: string,
	dark = '#111827',
): string => {
	if (!isHex(surface)) return '#ffffff';
	const backdrop = luminance(surface);
	if (whiteInkContrast(backdrop) >= displayInkContrast) return '#ffffff';
	const other = [team.color, team.alternateColor]
		.find(color => isHex(color) && color.toUpperCase() !== surface.toUpperCase());
	return isHex(other) && contrastBetween(luminance(other), backdrop) >= displayInkContrast ? other : dark;
};

// A crest sits on a white disc tinted with its own colour rather than on the surface behind it: a
// navy logo on a navy half of a poster is invisible, and every league has at least one. `28` is the
// alpha the row washes below use. No colour leaves the disc plain white, which still separates the
// crest from a dark background.
export const crestBacking = (color: string | null | undefined): string => (
	isHex(color)
		? `linear-gradient(160deg, ${color}14, ${color}28), #ffffff`
		: '#ffffff'
);

// A team-colour wash across a row, fading out to the right so whatever sits at the end of the row
// — a leader's stat line, a line score's R-H-E — lands on the plain card rather than on colour.
// `28` is the same alpha the crest disc uses, so one team's colour reads the same weight everywhere
// it appears. Read by the pre-game leader rows and the box score's line
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
	away: matchupTeam,
	home: matchupTeam,
	awayFallback = '#60a5fa',
	homeFallback = '#f87171',
): [string, string] => {
	const awayPrimary = primaryOf(away) ?? awayFallback;
	const homePrimary = primaryOf(home) ?? homeFallback;
	return pickPair(away, home, awayPrimary, homePrimary);
};

// The one place a team's colour is adjusted rather than drawn as published: a chart line, which has
// to be seen against the chart it is drawn on. Navies are lifted on the dark chart and golds are
// darkened on the light one, keeping their hue.
export const resolveChartLineColors = (
	away: matchupTeam,
	home: matchupTeam,
	surface: ResolvedTheme,
	awayFallback = '#60a5fa',
	homeFallback = '#f87171',
): [string, string] => {
	const [a, h] = resolveTeamColorPair(away, home, awayFallback, homeFallback);
	if (surface === 'dark') return [resolveReadableSeriesColor(a, awayFallback), resolveReadableSeriesColor(h, homeFallback)];
	return [
		resolveReadableCardTextColor(a, awayFallback, seriesOnLightLuminanceCeiling),
		resolveReadableCardTextColor(h, homeFallback, seriesOnLightLuminanceCeiling),
	];
};

// ── A matchup painted in its two colours ─────────────────────────────────────
// The card and the detail hero share one surface: the away colour on the left, the home colour on
// the right, crossing between `blendFrom` and `blendTo`, under a shade that deepens toward the bottom. A delayed
// game turns the shade yellow instead of dimming the card.
interface matchupScrim {
	rgb: Rgb;
	top: number;
	bottom: number;
}

// Where the away colour starts giving way to the home colour, and where it is gone.
const blendFrom = 30;
const blendTo = 70;

const liveScrim: matchupScrim = { rgb: { red: 3, green: 7, blue: 12 }, top: 0.18, bottom: 0.52 };
const delayedScrim: matchupScrim = { rgb: { red: 28, green: 22, blue: 3 }, top: 0.34, bottom: 0.62 };

const mixHex = (from: string, to: Rgb, amount: number): string => {
	const rgb = hexToRgb(from) ?? to;
	const toward = (channel: number, target: number): number => channel + ((target - channel) * amount);
	return rgbToHex(toward(rgb.red, to.red), toward(rgb.green, to.green), toward(rgb.blue, to.blue));
};

// Text runs from the status row to the PowerScore line just above the tab picker, so it is judged
// under the shade from the top edge to most of the way down. A side's own text sits on its own
// colour; the middle's sits on the blend of the two, which is what `blend` mixes toward.
const inkSurfaces = (color: string, other: string, scrim: matchupScrim, blend: number): string[] => {
	const lower = scrim.top + ((scrim.bottom - scrim.top) * 0.85);
	const surface = mixHex(color, hexToRgb(other) ?? scrim.rgb, blend);
	return [scrim.top, lower].map(alpha => mixHex(surface, scrim.rgb, alpha));
};

const darkInk = '#111827';

// The ink that stays readable on the worst of the surfaces it crosses. White for most of the
// league; near-black where a team's colour is a gold, a light blue or a silver.
const inkAcross = (surfaces: string[]): string => {
	const worst = (ink: string): number => Math.min(...surfaces.map(surface => contrastBetween(luminance(surface), luminance(ink))));
	return worst(darkInk) > worst('#ffffff') ? darkInk : '#ffffff';
};

export interface matchupInks {
	away: string;
	home: string;
	center: string;
}

export const matchupSurface = (awayColor: string, homeColor: string, delayed = false): { backgroundImage: string; inks: matchupInks } => {
	const scrim = delayed ? delayedScrim : liveScrim;
	const shade = `${scrim.rgb.red}, ${scrim.rgb.green}, ${scrim.rgb.blue}`;
	return {
		backgroundImage: `linear-gradient(180deg, rgba(${shade}, ${scrim.top}) 0%, rgba(${shade}, ${scrim.bottom}) 100%), `
			+ `linear-gradient(to right, ${awayColor} 0%, ${awayColor} ${blendFrom}%, ${homeColor} ${blendTo}%, ${homeColor} 100%)`,
		inks: {
			away: inkAcross(inkSurfaces(awayColor, homeColor, scrim, 0)),
			home: inkAcross(inkSurfaces(homeColor, awayColor, scrim, 0)),
			center: inkAcross(inkSurfaces(awayColor, homeColor, scrim, 0.5)),
		},
	};
};

