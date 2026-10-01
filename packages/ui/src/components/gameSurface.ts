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

// v2's plate: white under a wash of both teams' colours, each team's colour down its own side as a
// rail. A finished game steps back to a flat grey plate with no rails at all.
const plateWashShare = 0.16;
const plateWhite = '#ffffff';
const finalPlate = '#f4f6f8';

export interface gamePlate {
	away: string;
	home: string;
	crestAway: string;
	crestHome: string;
}

export const resolveGamePlate = (game: Pick<Game, 'awayTeam' | 'homeTeam' | 'delayed' | 'status'>): gamePlate => {
	const [away, home] = boardColors(game);
	const washed = (color: string) => (
		game.status === 'post' ? finalPlate : mixOver(hexToRgb(color) ?? hexToRgb(fallbackColor)!, plateWhite, plateWashShare)
	);
	return { away, home, crestAway: washed(away), crestHome: washed(home) };
};

export const gamePlateStyle = (plate: gamePlate): CSSProperties => ({
	'--plate-away': plate.away,
	'--plate-home': plate.home,
} as CSSProperties);

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
