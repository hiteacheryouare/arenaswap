import type { CSSProperties } from 'react';
import type { Game, ResolvedTheme } from '@arenaswap/core/types';
import { resolveTeamColorPair } from './colorUtils';
import { contrastBetween, hexLuminance, hexToRgb, rgbToHex, type Rgb } from './colorMath';

// The stage and the tiles are the teams' own colours under a dark veil. The veil is the least that
// keeps small white type readable on the lightest part of the field, which is a pure team colour
// under the thinner top of the veil, so a navy or a red gets almost none and a gold gets enough.

const veilInk: Rgb = { red: 8, green: 10, blue: 12 };
const delayVeilInk: Rgb = { red: 28, green: 22, blue: 3 };
const ink = '#ffffff';
export const veilTopShare = 0.8;
const veilMin = 0.1;
const veilMax = 0.9;
const veilStep = 0.02;
const noteAlpha = 0.88;
const behindAlphaFloor = 0.6;
const textContrast = 4.5;
const largeContrast = 3;
const fallbackColor = '#5a6370';
// Where a crest sits down the field, as a share of the veil's run from top to bottom.
const crestDepth = 0.45;

const mixOver = (over: Rgb, under: string, share: number): string => {
	const base = hexToRgb(under) ?? { red: 90, green: 99, blue: 112 };
	return rgbToHex(
		over.red * share + base.red * (1 - share),
		over.green * share + base.green * (1 - share),
		over.blue * share + base.blue * (1 - share),
	);
};

const inkOver = (surface: string, alpha: number) => mixOver({ red: 255, green: 255, blue: 255 }, surface, alpha);

const contrast = (a: string, b: string) => contrastBetween(hexLuminance(a), hexLuminance(b));

const veilFor = (color: string, veil: Rgb): number => {
	let strength = veilMin;
	const top = () => mixOver(veil, color, strength * veilTopShare);
	while (strength < veilMax && Math.min(contrast(ink, top()), contrast(inkOver(top(), noteAlpha), top())) < textContrast) {
		strength += veilStep;
	}
	return Math.min(strength, veilMax);
};

const behindFor = (color: string, veil: Rgb, strength: number): number => {
	const top = mixOver(veil, color, strength * veilTopShare);
	let alpha = behindAlphaFloor;
	while (alpha < 1 && contrast(inkOver(top, alpha), top) < largeContrast) alpha += 0.02;
	return Math.min(1, alpha);
};

const round = (value: number) => Math.round(value * 100) / 100;

export interface gameSurface {
	away: string;
	home: string;
	veil: number;
	veilRgb: string;
	crestAway: string;
	crestHome: string;
	behindAlpha: number;
}

// The pair today's cards have always drawn, from the same picker, so a team is the same colour on
// the stage, on a tile and in a chart. `surface` is for a colour drawn as a thin mark on the page
// rather than as a field under a veil, where a navy has to be lifted to be seen at all.
export const resolveGameColors = (game: Pick<Game, 'awayTeam' | 'homeTeam'>, surface?: ResolvedTheme): [string, string] => (
	resolveTeamColorPair(game.awayTeam, game.homeTeam, fallbackColor, fallbackColor, surface)
);

// A delay takes both teams' colours away, as v2's card did, so it reads from across the room.
const delayColor = '#f1c40f';

const boardColors = (game: Pick<Game, 'awayTeam' | 'homeTeam' | 'delayed' | 'status'>): [string, string] => (
	game.delayed === true && game.status === 'in' ? [delayColor, delayColor] : resolveGameColors(game)
);

export const resolveGameSurface = (game: Pick<Game, 'awayTeam' | 'homeTeam' | 'delayed' | 'status'>): gameSurface => {
	const [away, home] = boardColors(game);
	const veilInkForGame = game.delayed === true ? delayVeilInk : veilInk;
	const veil = Math.max(veilFor(away, veilInkForGame), veilFor(home, veilInkForGame));
	const behindAlpha = Math.max(behindFor(away, veilInkForGame, veil), behindFor(home, veilInkForGame, veil));
	const crestShare = veil * veilTopShare + (veil - veil * veilTopShare) * crestDepth;
	return {
		away,
		home,
		veil: round(veil),
		veilRgb: `${veilInkForGame.red}, ${veilInkForGame.green}, ${veilInkForGame.blue}`,
		crestAway: mixOver(veilInkForGame, away, crestShare),
		crestHome: mixOver(veilInkForGame, home, crestShare),
		behindAlpha: round(behindAlpha),
	};
};

export const gameSurfaceStyle = (surface: gameSurface): CSSProperties => ({
	'--stage-away': surface.away,
	'--stage-home': surface.home,
	'--stage-veil': surface.veil,
	'--stage-veil-top': round(surface.veil * veilTopShare),
	'--stage-veil-rgb': surface.veilRgb,
	'--stage-note': `rgba(255, 255, 255, ${noteAlpha})`,
	'--stage-behind': `rgba(255, 255, 255, ${surface.behindAlpha})`,
} as CSSProperties);

// A row is a quieter version of the same two colours: each team's colour holds its own end and they
// meet through the page itself, under a veil of the page sized for the ink. Dark ink on the light
// page, white on the dark one. Games you aren't deciding anything from (upcoming and final) sit
// under more of it.
const rowVeils = {
	dark: { page: { red: 14, green: 16, blue: 19 }, ink: '#ffffff', note: '#ffffff', noteAlpha: 0.74, floor: 0.5, quietFloor: 0.66 },
	light: { page: { red: 244, green: 245, blue: 247 }, ink: '#0e1013', note: '#0e1013', noteAlpha: 0.7, floor: 0.62, quietFloor: 0.76 },
} as const;

export interface rowSurface {
	away: string;
	home: string;
	near: number;
	veilRgb: string;
	crestAway: string;
	crestHome: string;
	theme: ResolvedTheme;
}

const noteOver = (note: string, surface: string, alpha: number) => {
	const rgb = hexToRgb(note) ?? { red: 255, green: 255, blue: 255 };
	return mixOver(rgb, surface, alpha);
};

export const resolveRowSurface = (game: Pick<Game, 'awayTeam' | 'homeTeam' | 'delayed' | 'status'>, theme: ResolvedTheme, quiet = false): rowSurface => {
	const [away, home] = boardColors(game);
	const tone = rowVeils[theme];
	const holds = (color: string, share: number) => {
		const under = mixOver(tone.page, color, share);
		return contrast(tone.ink, under) >= textContrast && contrast(noteOver(tone.note, under, tone.noteAlpha), under) >= textContrast;
	};
	const nearFor = (color: string) => {
		let share: number = quiet ? tone.quietFloor : tone.floor;
		while (share < 0.96 && !holds(color, share)) share += veilStep;
		return Math.min(share, 0.96);
	};
	const near = Math.max(nearFor(away), nearFor(home));
	return {
		away,
		home,
		near: round(near),
		veilRgb: `${tone.page.red}, ${tone.page.green}, ${tone.page.blue}`,
		crestAway: mixOver(tone.page, away, near),
		crestHome: mixOver(tone.page, home, near),
		theme,
	};
};

export const rowSurfaceStyle = (surface: rowSurface): CSSProperties => {
	const tone = rowVeils[surface.theme];
	const note = hexToRgb(tone.note) ?? { red: 255, green: 255, blue: 255 };
	return {
		'--row-away': surface.away,
		'--row-home': surface.home,
		'--row-near': surface.near,
		'--row-veil-rgb': surface.veilRgb,
		'--row-ink': tone.ink,
		'--row-note': `rgba(${note.red}, ${note.green}, ${note.blue}, ${tone.noteAlpha})`,
	} as CSSProperties;
};

// The lettered disc a team gets when its crest never arrives: its own colour, lettered in its
// alternate when that reads, otherwise in whichever of white or black reads better.
export const monogramInk = (team: { alternateColor?: string }, color: string): string => {
	const alt = team.alternateColor;
	if (alt && hexToRgb(alt) && contrast(alt, color) >= textContrast) return alt;
	return contrast('#ffffff', color) >= contrast('#000000', color) ? '#ffffff' : '#000000';
};

export const monogramScale = (abbreviation: string): number => {
	const letters = abbreviation.length;
	if (letters <= 2) return 0.36;
	if (letters === 3) return 0.3;
	if (letters === 4) return 0.24;
	return 0.2;
};
