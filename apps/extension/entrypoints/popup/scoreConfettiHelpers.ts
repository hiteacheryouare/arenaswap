import { createFavoriteTeamKey, leagueConfigMap } from '@arenaswap/core/constants';
import type { Game, LeagueId, Team } from '@arenaswap/core/types';
import { hexLuminance, rgbToHex } from '@arenaswap/chromatic';

interface liveGameSnapshot {
	league: LeagueId;
	period: number;
	homeTeamId: string;
	awayTeamId: string;
	homeScore: number;
	awayScore: number;
	homeColors: string[];
	awayColors: string[];
}

export type teamSide = 'home' | 'away';

export interface confettiBurstSpec {
	gameId: string;
	side: teamSide;
	particleCount: number;
	spread: number;
	colors: string[];
}

const defaultTeamColor = '#DEE2E6';
const normalParticleCount = 90;
const overtakeParticleCount = 170;
const overtimeParticleMultiplier = 2;
const normalSpread = 72;
const overtakeSpread = 95;
const shadeOffsets = [-0.32, -0.16, 0, 0.16, 0.32];

const normalizeHexColor = (value: string | undefined): string | null => {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	if (/^#[\da-fA-F]{6}$/.test(trimmed)) return trimmed.toUpperCase();
	if (!/^#[\da-fA-F]{3}$/.test(trimmed)) return null;
	return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toUpperCase();
};

const adjustHexShade = (hexColor: string, shadeOffset: number): string => {
	const packed = parseInt(hexColor.slice(1), 16);
	const red = packed >> 16;
	const green = (packed >> 8) & 255;
	const blue = packed & 255;
	const target = shadeOffset >= 0 ? 255 : 0;
	const amount = Math.abs(shadeOffset);

	const shadedRed = red + (target - red) * amount;
	const shadedGreen = green + (target - green) * amount;
	const shadedBlue = blue + (target - blue) * amount;

	return rgbToHex(shadedRed, shadedGreen, shadedBlue).toUpperCase();
};

export const createTeamColorShadePalette = (teamColor: string | undefined): string[] => {
	const normalized = normalizeHexColor(teamColor) ?? defaultTeamColor;
	const shades = shadeOffsets.map(offset => adjustHexShade(normalized, offset));
	return [...new Set(shades)];
};

export const createTeamConfettiPalette = (teamColors: string[]): string[] => (
	teamColors.length === 0
		? createTeamColorShadePalette(undefined)
		: [...new Set(teamColors.flatMap(createTeamColorShadePalette))]
);

// Confetti falls over the dark popup, where a black or near-black club colour is not there at all.
// A club with another colour to show leaves its black out: the Penguins and the Steelers go all gold.
const nearBlackLuminance = 0.04;

const confettiColors = (team: Team): string[] => {
	const colors = [...new Set([team.color, team.alternateColor].map(normalizeHexColor).filter(color => color !== null))];
	const visible = colors.filter(color => hexLuminance(color) >= nearBlackLuminance);
	return visible.length > 0 ? visible : colors;
};

export const buildLiveGameSnapshots = (games: Game[]): Map<string, liveGameSnapshot> => {
	const snapshots = new Map<string, liveGameSnapshot>();
	for (const game of games) {
		if (game.status !== 'in') continue;
		snapshots.set(game.id, {
			league: game.league,
			period: game.period,
			homeTeamId: game.homeTeam.id,
			awayTeamId: game.awayTeam.id,
			homeScore: game.homeTeam.score,
			awayScore: game.awayTeam.score,
			homeColors: confettiColors(game.homeTeam),
			awayColors: confettiColors(game.awayTeam),
		});
	}
	return snapshots;
};

export const findFavoriteTeamScoreConfettiBursts = (
	previousSnapshots: Map<string, liveGameSnapshot>,
	nextSnapshots: Map<string, liveGameSnapshot>,
	favoriteTeamIds: Set<string>,
): confettiBurstSpec[] => {
	const bursts: confettiBurstSpec[] = [];

	for (const [gameId, next] of nextSnapshots) {
		const previous = previousSnapshots.get(gameId);
		if (!previous) continue;

		const regularPeriods = leagueConfigMap[next.league]?.regularPeriods ?? 4;
		const isOvertime = next.period > regularPeriods;

		const homeFavoriteTeamKey = createFavoriteTeamKey(next.league, next.homeTeamId);
		if (favoriteTeamIds.has(homeFavoriteTeamKey) && next.homeScore > previous.homeScore) {
			const didOvertake = previous.homeScore < previous.awayScore && next.homeScore > next.awayScore;
			const baseParticleCount = didOvertake ? overtakeParticleCount : normalParticleCount;
			bursts.push({
				gameId,
				side: 'home',
				particleCount: isOvertime ? baseParticleCount * overtimeParticleMultiplier : baseParticleCount,
				spread: didOvertake ? overtakeSpread : normalSpread,
				colors: createTeamConfettiPalette(next.homeColors),
			});
		}

		const awayFavoriteTeamKey = createFavoriteTeamKey(next.league, next.awayTeamId);
		if (favoriteTeamIds.has(awayFavoriteTeamKey) && next.awayScore > previous.awayScore) {
			const didOvertake = previous.awayScore < previous.homeScore && next.awayScore > next.homeScore;
			const baseParticleCount = didOvertake ? overtakeParticleCount : normalParticleCount;
			bursts.push({
				gameId,
				side: 'away',
				particleCount: isOvertime ? baseParticleCount * overtimeParticleMultiplier : baseParticleCount,
				spread: didOvertake ? overtakeSpread : normalSpread,
				colors: createTeamConfettiPalette(next.awayColors),
			});
		}
	}

	return bursts;
};
