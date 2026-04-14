import { createFavoriteTeamKey, leagueConfigMap } from '@arenaswap/core/constants';
import type { Game, LeagueId } from '@arenaswap/core/types';

interface liveGameSnapshot {
	league: LeagueId;
	period: number;
	homeTeamId: string;
	awayTeamId: string;
	homeScore: number;
	awayScore: number;
	homeColor?: string;
	awayColor?: string;
}

export interface confettiBurstSpec {
	particleCount: number;
	spread: number;
	colors: string[];
	origin: {
		x: number;
		y: number;
	};
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

const clampColorChannel = (value: number): number => (
	Math.max(0, Math.min(255, Math.round(value)))
);

const toHexChannel = (value: number): string => (
	clampColorChannel(value).toString(16).padStart(2, '0').toUpperCase()
);

const adjustHexShade = (hexColor: string, shadeOffset: number): string => {
	const red = parseInt(hexColor.slice(1, 3), 16);
	const green = parseInt(hexColor.slice(3, 5), 16);
	const blue = parseInt(hexColor.slice(5, 7), 16);
	const target = shadeOffset >= 0 ? 255 : 0;
	const amount = Math.abs(shadeOffset);

	const shadedRed = red + (target - red) * amount;
	const shadedGreen = green + (target - green) * amount;
	const shadedBlue = blue + (target - blue) * amount;

	return `#${toHexChannel(shadedRed)}${toHexChannel(shadedGreen)}${toHexChannel(shadedBlue)}`;
};

export const createTeamColorShadePalette = (teamColor: string | undefined): string[] => {
	const normalized = normalizeHexColor(teamColor) ?? defaultTeamColor;
	const shades = shadeOffsets.map(offset => adjustHexShade(normalized, offset));
	return [...new Set(shades)];
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
			homeColor: game.homeTeam.color,
			awayColor: game.awayTeam.color,
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

		const regularPeriods = leagueConfigMap[next.league].regularPeriods;
		const isOvertime = next.period > regularPeriods;

		const homeFavoriteTeamKey = createFavoriteTeamKey(next.league, next.homeTeamId);
		if (favoriteTeamIds.has(homeFavoriteTeamKey) && next.homeScore > previous.homeScore) {
			const didOvertake = previous.homeScore < previous.awayScore && next.homeScore > next.awayScore;
			const baseParticleCount = didOvertake ? overtakeParticleCount : normalParticleCount;
			bursts.push({
				particleCount: isOvertime ? baseParticleCount * overtimeParticleMultiplier : baseParticleCount,
				spread: didOvertake ? overtakeSpread : normalSpread,
				colors: createTeamColorShadePalette(next.homeColor),
				origin: { x: 0.75, y: 0.34 },
			});
		}

		const awayFavoriteTeamKey = createFavoriteTeamKey(next.league, next.awayTeamId);
		if (favoriteTeamIds.has(awayFavoriteTeamKey) && next.awayScore > previous.awayScore) {
			const didOvertake = previous.awayScore < previous.homeScore && next.awayScore > next.homeScore;
			const baseParticleCount = didOvertake ? overtakeParticleCount : normalParticleCount;
			bursts.push({
				particleCount: isOvertime ? baseParticleCount * overtimeParticleMultiplier : baseParticleCount,
				spread: didOvertake ? overtakeSpread : normalSpread,
				colors: createTeamColorShadePalette(next.awayColor),
				origin: { x: 0.25, y: 0.34 },
			});
		}
	}

	return bursts;
};
