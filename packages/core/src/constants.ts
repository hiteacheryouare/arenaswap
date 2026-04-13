import pkg from '../package.json';
import type { LeagueId, UserPreferences } from './types';
import {
	allLeagueIds,
	stallThresholdPolls,
	stallPenaltyMultiplier,
	scoreMaxCloseness,
	scoreMaxLateGame,
	scoreMaxMomentum,
	scoreMaxLeadChanges,
	scoreMaxComeback,
	scoreMaxTotal,
	scorerTunables,
	sportTypeConfigs,
	sportTypeConfigMap,
	leagueConfigs,
	leagueConfigMap,
} from '@arenaswap/powerscore';

// Re-export powerscore constants so existing import paths work unchanged
export {
	allLeagueIds,
	stallThresholdPolls,
	stallPenaltyMultiplier,
	scoreMaxCloseness,
	scoreMaxLateGame,
	scoreMaxMomentum,
	scoreMaxLeadChanges,
	scoreMaxComeback,
	scoreMaxTotal,
	scorerTunables,
	sportTypeConfigs,
	sportTypeConfigMap,
	leagueConfigs,
	leagueConfigMap,
};

// App identity (sourced from package.json)
export const appName = pkg.name;
export const appVersion = pkg.version;
export const appDescription = pkg.description;

export const pollIntervalMs = 15_000;
export const maxHistorySnapshots = 20; // ~5 minutes of history at 15s poll interval

// Switch behavior defaults
export const defaultSensitivity = 4 as const;
export const defaultCooldownSecs = 45;
export const defaultSwitchDelaySecs = 0;
export const defaultFavoriteTeamBonusPoints = 10;

// Sensitivity level → score delta required to trigger a tab switch
export const sensitivityThresholds: Record<number, number> = {
	1: 100,
	2: 60,
	3: 45,
	4: 28,
	5: 16,
	6: 8,
	7: 3
};

export const leagueLogoFallbacks: Record<LeagueId, string> = {
	nba: 'https://a.espncdn.com/i/teamlogos/leagues/500/nba.png',
	wnba: 'https://a.espncdn.com/i/teamlogos/leagues/500/wnba.png',
	ncaab: 'https://a.espncdn.com/redesign/assets/img/icons/ESPN-icon-basketball.png',
	nhl: 'https://a.espncdn.com/i/teamlogos/leagues/500/nhl.png',
	pwhl: 'https://a.espncdn.com/i/teamlogos/leagues/500/nhl.png',
	ncaamh: 'https://a.espncdn.com/i/teamlogos/leagues/500/nhl.png',
	mlb: 'https://a.espncdn.com/i/teamlogos/leagues/500/mlb.png',
	nfl: 'https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png',
	ncaaf: 'https://a.espncdn.com/redesign/assets/img/icons/ESPN-icon-football-college.png',
	mls: 'https://a.espncdn.com/i/teamlogos/leagues/500/mls.png',
};

export const resolveLeagueLogoUrl = (leagueId: LeagueId, espnLogoUrl?: string): string => (
	typeof espnLogoUrl === 'string' && espnLogoUrl.length > 0
		? espnLogoUrl
		: leagueLogoFallbacks[leagueId]
);

const isLeagueId = (value: unknown): value is LeagueId => (
	typeof value === 'string' && allLeagueIds.includes(value as LeagueId)
);

const parseFavoriteTeamKey = (value: string): { leagueId: LeagueId; teamId: string } | null => {
	const trimmed = value.trim();
	const separatorIndex = trimmed.indexOf(':');
	if (separatorIndex <= 0 || separatorIndex >= trimmed.length - 1) return null;

	const leagueCandidate = trimmed.slice(0, separatorIndex);
	const teamCandidate = trimmed.slice(separatorIndex + 1).trim();
	if (!isLeagueId(leagueCandidate) || teamCandidate.length === 0) return null;

	return { leagueId: leagueCandidate, teamId: teamCandidate };
};

export const createFavoriteTeamKey = (leagueId: LeagueId, teamId: string): string => (
	`${leagueId}:${teamId.trim()}`
);

export const isFavoriteTeamKey = (value: unknown): value is string => (
	typeof value === 'string' && parseFavoriteTeamKey(value) !== null
);

const isSensitivityValue = (value: unknown): value is UserPreferences['sensitivity'] => (
	typeof value === 'number' && value >= 1 && value <= 7
);

const normalizeSecondsPreference = (value: unknown, fallback: number): number => (
	typeof value === 'number' && Number.isFinite(value)
		? Math.max(0, Math.round(value))
		: fallback
);

const normalizeFavoriteTeamIds = (value: unknown): string[] => {
	if (!Array.isArray(value)) return [];

	const deduped: string[] = [];
	const seen = new Set<string>();

	for (const candidate of value) {
		if (typeof candidate !== 'string') continue;
		const parsedFavoriteTeamKey = parseFavoriteTeamKey(candidate);
		if (!parsedFavoriteTeamKey) continue;

		const favoriteTeamKey = createFavoriteTeamKey(parsedFavoriteTeamKey.leagueId, parsedFavoriteTeamKey.teamId);
		if (seen.has(favoriteTeamKey)) continue;
		seen.add(favoriteTeamKey);
		deduped.push(favoriteTeamKey);
	}

	return deduped;
};

export const createDefaultUserPreferences = (): UserPreferences => ({
	sensitivity: defaultSensitivity,
	cooldownSeconds: defaultCooldownSecs,
	switchDelaySeconds: defaultSwitchDelaySecs,
	enabled: true,
	enabledLeagues: [],
	favoriteTeamIds: [],
	favoriteTeamBonusPoints: defaultFavoriteTeamBonusPoints,
	showUpcomingGames: true,
});

export const normalizeUserPreferences = (storedPrefs: unknown): UserPreferences => {
	const defaults = createDefaultUserPreferences();
	if (!storedPrefs || typeof storedPrefs !== 'object') return defaults;

	const candidate = storedPrefs as Partial<UserPreferences> & { enabledLeagues?: unknown; favoriteTeamIds?: unknown };
	const hasEnabledLeaguesField = Object.prototype.hasOwnProperty.call(candidate, 'enabledLeagues');
	const parsedEnabledLeagues = Array.isArray(candidate.enabledLeagues)
		? candidate.enabledLeagues.filter(isLeagueId)
		: [];

	return {
		sensitivity: isSensitivityValue(candidate.sensitivity) ? candidate.sensitivity : defaults.sensitivity,
		cooldownSeconds: normalizeSecondsPreference(candidate.cooldownSeconds, defaults.cooldownSeconds),
		switchDelaySeconds: normalizeSecondsPreference(candidate.switchDelaySeconds, defaults.switchDelaySeconds),
		enabled: typeof candidate.enabled === 'boolean' ? candidate.enabled : defaults.enabled,
		enabledLeagues: hasEnabledLeaguesField ? parsedEnabledLeagues : allLeagueIds,
		favoriteTeamIds: normalizeFavoriteTeamIds(candidate.favoriteTeamIds),
		favoriteTeamBonusPoints: normalizeSecondsPreference(candidate.favoriteTeamBonusPoints, defaults.favoriteTeamBonusPoints),
		showUpcomingGames: typeof candidate.showUpcomingGames === 'boolean' ? candidate.showUpcomingGames : defaults.showUpcomingGames,
	};
};
