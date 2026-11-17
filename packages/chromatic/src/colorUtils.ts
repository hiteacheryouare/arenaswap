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

const brighten = (value: string, factor: number): string => {
	const rgb = hexToRgb(value);
	if (!rgb) return value;
	return rgbToHex(rgb.red * factor, rgb.green * factor, rgb.blue * factor);
};

const minChannelForHue = 12;

const hasHue = (value: string): boolean => {
	const rgb = hexToRgb(value);
	return rgb !== null && Math.max(rgb.red, rgb.green, rgb.blue) >= minChannelForHue;
};

const darkChartBackground = '#0d1117';
const lightCardBackground = '#f8fafc';
const lightChartBackground = '#ffffff';
const nonTextContrast = 3;
const smallTextContrast = 4.5;

const seriesLuminanceFloor = nonTextContrast * (luminance(darkChartBackground) + 0.05) - 0.05;
const smallCardTextLuminanceCeiling = (luminance(lightCardBackground) + 0.05) / smallTextContrast - 0.05;
const seriesOnLightLuminanceCeiling = (luminance(lightChartBackground) + 0.05) / nonTextContrast - 0.05;

const maxColorSteps = 24;
const liftScale = 1.18;
const liftWhiteMix = 0.12;
const greyLiftMix = 0.48;
const darkenScale = 0.86;

const liftByScaling = (color: string): string => {
	let lifted = color;
	for (let step = 0; step < maxColorSteps && luminance(lifted) < seriesLuminanceFloor; step++) {
		lifted = brighten(lifted, liftScale);
	}
	return lifted;
};

const liftByWhiteMix = (color: string): string => {
	let lifted = color;
	for (let step = 0; step < maxColorSteps && luminance(lifted) < seriesLuminanceFloor; step++) {
		lifted = mixTowardWhite(lifted, liftWhiteMix);
	}
	return lifted;
};

const resolveReadableSeriesColor = (value: string | undefined, fallback: string): string => {
	if (!value || !hexToRgb(value)) return fallback;
	if (luminance(value) >= seriesLuminanceFloor) return value;
	if (!hasHue(value)) return mixTowardWhite(value, greyLiftMix);
	return liftByWhiteMix(liftByScaling(value));
};

const resolveReadableCardTextColor = (
	value: string | undefined,
	fallback: string,
	ceiling: number,
): string => {
	if (!value || !hexToRgb(value)) return fallback;
	let darkened = value;
	for (let step = 0; step < maxColorSteps && luminance(darkened) > ceiling; step++) {
		darkened = brighten(darkened, darkenScale);
	}
	return darkened;
};

const clashDifference = 11;
const blackSwitchBelow = 17;
const whiteSwitchFrom = 35;

const isNearWhite = (hex: string): boolean => {
	const lab = hexToLab(hex);
	return lab !== null && lab.lightness > 95 && labChroma(lab) < 5;
};

interface matchupTeam {
	color?: string;
	alternateColor?: string;
	logo?: string;
}

const usableAlternate = (team: matchupTeam): string | undefined => (
	isHex(team.alternateColor) && !isNearWhite(team.alternateColor) ? team.alternateColor : undefined
);

const primaryOf = (team: matchupTeam): string | undefined => {
	if (isHex(team.color) && isNearWhite(team.color)) return usableAlternate(team) ?? team.color;
	return isHex(team.color) ? team.color : isHex(team.alternateColor) ? team.alternateColor : undefined;
};

const neutralSwitch = (primary: string): string | undefined => {
	const lightness = hexToLab(primary)?.lightness ?? 0;
	if (lightness < blackSwitchBelow) return '#000000';
	return lightness >= whiteSwitchFrom ? '#ffffff' : undefined;
};

const switchColor = (team: matchupTeam, primary: string): string | undefined => {
	const alternate = usableAlternate(team);
	if (alternate && alternate !== primary) return alternate;
	const crest = teamLogoOnColor(team.logo);
	const crestColor = crest ? cachedLogoSwitchColor(crest, primary) : null;
	if (crestColor === undefined) return undefined;
	return crestColor ?? neutralSwitch(primary);
};

export const pendingSwitchCrest = (away: matchupTeam, home: matchupTeam): { crest: string; primary: string } | null => {
	const awayPrimary = primaryOf(away);
	const homePrimary = primaryOf(home);
	if (!awayPrimary || !homePrimary || colorDifference(awayPrimary, homePrimary) >= clashDifference) return null;
	const alternate = usableAlternate(away);
	if (alternate && alternate !== awayPrimary) return null;
	const crest = teamLogoOnColor(away.logo);
	if (!crest || cachedLogoSwitchColor(crest, awayPrimary) !== undefined) return null;
	return { crest, primary: awayPrimary };
};

const pickPair = (away: matchupTeam, home: matchupTeam, awayPrimary: string, homePrimary: string): [string, string] => {
	if (colorDifference(awayPrimary, homePrimary) >= clashDifference) return [awayPrimary, homePrimary];
	const awaySwitch = switchColor(away, awayPrimary);
	if (awaySwitch && colorDifference(awaySwitch, homePrimary) >= clashDifference) return [awaySwitch, homePrimary];
	return [awayPrimary, homePrimary];
};

export const readableInkOn = (background: string, light = '#ffffff', dark = '#111827'): string => {
	if (!isHex(background)) return light;
	const backdrop = luminance(background);
	return contrastBetween(backdrop, luminance(dark)) > contrastBetween(backdrop, luminance(light))
		? dark
		: light;
};

const displayInkContrast = 3;

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

const teamWashAlpha = '28';

export const crestBacking = (color: string | null | undefined): string => (
	isHex(color)
		? `linear-gradient(160deg, ${color}14, ${color}${teamWashAlpha}), #ffffff`
		: '#ffffff'
);

export const teamRowWash = (color: string | null | undefined): string | undefined => (
	isHex(color)
		? `linear-gradient(90deg, ${color}${teamWashAlpha}, ${color}00 72%)`
		: undefined
);

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

export const resolveChartLineColors = (
	away: matchupTeam,
	home: matchupTeam,
	surface: ResolvedTheme,
	awayFallback = '#60a5fa',
	homeFallback = '#f87171',
): [string, string] => {
	const lift = (color: string, fallback: string): string => (
		surface === 'dark'
			? resolveReadableSeriesColor(color, fallback)
			: resolveReadableCardTextColor(color, fallback, seriesOnLightLuminanceCeiling)
	);
	const [a, h] = resolveTeamColorPair(away, home, awayFallback, homeFallback);
	const awayLine = lift(a, awayFallback);
	const homeLine = lift(h, homeFallback);
	if (colorDifference(awayLine, homeLine) >= clashDifference) return [awayLine, homeLine];

	const awaySwitch = switchColor(away, primaryOf(away) ?? awayFallback);
	if (awaySwitch && awaySwitch !== a) {
		const switched = lift(awaySwitch, awayFallback);
		if (colorDifference(switched, homeLine) >= clashDifference) return [switched, homeLine];
	}
	const homeAlternate = usableAlternate(home);
	if (homeAlternate && homeAlternate !== h) {
		const switched = lift(homeAlternate, homeFallback);
		if (colorDifference(awayLine, switched) >= clashDifference) return [awayLine, switched];
	}
	return [awayLine, homeLine];
};

interface matchupScrim {
	rgb: Rgb;
	top: number;
	bottom: number;
}

const blendFrom = 30;
const blendTo = 70;

const liveScrim: matchupScrim = { rgb: { red: 3, green: 7, blue: 12 }, top: 0.18, bottom: 0.52 };
const delayedScrim: matchupScrim = { rgb: { red: 28, green: 22, blue: 3 }, top: 0.34, bottom: 0.62 };

const mixHex = (from: string, to: Rgb, amount: number): string => {
	const rgb = hexToRgb(from) ?? to;
	const toward = (channel: number, target: number): number => channel + ((target - channel) * amount);
	return rgbToHex(toward(rgb.red, to.red), toward(rgb.green, to.green), toward(rgb.blue, to.blue));
};

const textBandDepth = 0.85;

const inkSurfaces = (color: string, other: string, scrim: matchupScrim, blend: number): string[] => {
	const lower = scrim.top + ((scrim.bottom - scrim.top) * textBandDepth);
	const surface = mixHex(color, hexToRgb(other) ?? scrim.rgb, blend);
	return [scrim.top, lower].map(alpha => mixHex(surface, scrim.rgb, alpha));
};

const darkInk = '#111827';

const inkAcross = (surfaces: string[]): string => {
	const worst = (ink: string): number => Math.min(...surfaces.map(surface => contrastBetween(luminance(surface), luminance(ink))));
	return worst(darkInk) > worst('#ffffff') ? darkInk : '#ffffff';
};

export interface matchupInks {
	left: string;
	right: string;
	center: string;
}

export const matchupSurface = (leftColor: string, rightColor: string, delayed = false): { backgroundImage: string; inks: matchupInks } => {
	const scrim = delayed ? delayedScrim : liveScrim;
	const shade = `${scrim.rgb.red}, ${scrim.rgb.green}, ${scrim.rgb.blue}`;
	return {
		backgroundImage: `linear-gradient(180deg, rgba(${shade}, ${scrim.top}) 0%, rgba(${shade}, ${scrim.bottom}) 100%), `
			+ `linear-gradient(to right, ${leftColor} 0%, ${leftColor} ${blendFrom}%, ${rightColor} ${blendTo}%, ${rightColor} 100%)`,
		inks: {
			left: inkAcross(inkSurfaces(leftColor, rightColor, scrim, 0)),
			right: inkAcross(inkSurfaces(rightColor, leftColor, scrim, 0)),
			center: inkAcross(inkSurfaces(leftColor, rightColor, scrim, 0.5)),
		},
	};
};

