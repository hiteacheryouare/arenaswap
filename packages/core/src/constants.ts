import pkg from '../package.json';
import type { LeagueId, UserPreferences } from './types';
import {
	allLeagueIds,
	stallPenaltySteps,
	scoreMaxCloseness,
	scoreMaxLateGame,
	scoreMaxMomentum,
	scoreMaxLeadChanges,
	scoreMaxComeback,
	scoreMaxTotal,
	scoreWinProbVarianceMax,
	scorerTunables,
	sportTypeConfigs,
	sportTypeConfigMap,
	leagueConfigs,
	leagueConfigMap,
} from 'powerscore';

// Re-export powerscore constants so existing import paths work unchanged
export {
	allLeagueIds,
	stallPenaltySteps,
	scoreMaxCloseness,
	scoreMaxLateGame,
	scoreMaxMomentum,
	scoreMaxLeadChanges,
	scoreMaxComeback,
	scoreMaxTotal,
	scoreWinProbVarianceMax,
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
// Fallback window for sports not yet in sportTypeConfigMap (5 min).
// In practice every sport config defines historyWindowMs; this is a safety net.
export const historyWindowMs = 300_000;

// After this many consecutive empty polls a league switches to dormant mode
export const pollDormantThresholdPolls = 2;
export const pollDormantMinMs = 120_000;
export const pollDormantMaxMs = 180_000;

// Adaptive eager polling bounds — interval scales continuously with PowerScore.
// pollIntervalMs (15s) is kept for initial stagger, demo mode, and fallback.
// High PowerScore → pollMinEagerMs; low PowerScore → pollMaxEagerMs.
// All live games are polled at least every pollMaxEagerMs so a boring game can
// still catch a momentum shift. When all games in a league are in
// halftime/intermission, pollIntermissionMs is used instead.
export const pollMinEagerMs = 6_000;
export const pollMaxEagerMs = 25_000;
export const pollIntermissionMs = 40_000;

// Switch behavior defaults
export const defaultSensitivity = 4 as const;
export const defaultCooldownSecs = 45;
export const defaultSwitchDelaySecs = 0;
export const defaultFavoriteTeamBonusPoints = 10;
export const defaultPostseasonBoostPoints = 5;


// Sensitivity level → score delta required to trigger a tab switch.
// Recalibrated for the PowerScore v2 distribution (lower bases, more spread) via the simulation
// harness (npm run powerscore:simulate), then nudged ~25% stickier so the Balanced default is less
// jumpy. Level 4 (~11) sits just above the median best-vs-runner-up switch gap.
export const sensitivityThresholds: Record<number, number> = {
	1: 38,
	2: 26,
	3: 17,
	4: 10,
	5: 6,
	6: 3,
	7: 1
};

// Logos that always win over whatever ESPN's API returns. Use when ESPN only
// returns a generic sport icon and we have a better official league logo.
const leagueLogoOverrides: Partial<Record<LeagueId, string>> = {
	cbase: 'https://a.espncdn.com/i/espn/misc_logos/500/ncaa_baseball.png',
	csoft: 'https://a.espncdn.com/i/espn/misc_logos/500/ncaa_womens_softball.png',
	olybb: 'https://a.espncdn.com/i/espn/misc_logos/500-dark/olympics.png',
	olymih: 'https://a.espncdn.com/i/espn/misc_logos/500-dark/olympics.png',
	olywih: 'https://a.espncdn.com/i/espn/misc_logos/500-dark/olympics.png',
	olybkm: 'https://a.espncdn.com/i/espn/misc_logos/500-dark/olympics.png',
	olybkw: 'https://a.espncdn.com/i/espn/misc_logos/500-dark/olympics.png',
	olysocm: 'https://a.espncdn.com/i/espn/misc_logos/500-dark/olympics.png',
	olysocw: 'https://a.espncdn.com/i/espn/misc_logos/500-dark/olympics.png',
};

// Logos used when ESPN's API returns nothing for a league.
export const leagueLogoFallbacks: Partial<Record<LeagueId, string>> = {
	nba: 'https://a.espncdn.com/i/teamlogos/leagues/500/nba.png',
	wnba: 'https://a.espncdn.com/i/teamlogos/leagues/500/wnba.png',
	nhl: 'https://a.espncdn.com/i/teamlogos/leagues/500/nhl.png',
	mlb: 'https://a.espncdn.com/i/teamlogos/leagues/500/mlb.png',
	nfl: 'https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png',
	mls: 'https://a.espncdn.com/i/teamlogos/leagues/500/mls.png',
	epl: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/23.png',
	fifawc: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/4.png',
	wbbc: 'https://a.espncdn.com/redesign/assets/img/icons/ESPN-icon-baseball.png',
	ufl: 'https://a.espncdn.com/i/teamlogos/leagues/500/ufl.png',
	laliga: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/15.png',
	bundesliga: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/10.png',
	seriea: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/12.png',
	ligamx: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/22.png',
	ucl: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/2.png',
	uel: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/2310.png',
	nwsl: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/2323.png',
	fifawwc: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/60.png',
};

export const resolveLeagueLogoUrl = (leagueId: LeagueId, espnLogoUrl?: string): string => {
	const override = leagueLogoOverrides[leagueId];
	if (override) return override;
	return typeof espnLogoUrl === 'string' && espnLogoUrl.length > 0
		? espnLogoUrl
		: (leagueLogoFallbacks[leagueId] ?? '');
};

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
	proTipsEnabled: true,
	notificationsEnabled: true,
	standbyStreamEnabled: false,
	standbyStreamThreshold: 20,
	bettingEnabled: false,
	temperatureUnit: 'F' as const,
	postseasonBoostPoints: defaultPostseasonBoostPoints,
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
		proTipsEnabled: typeof candidate.proTipsEnabled === 'boolean' ? candidate.proTipsEnabled : defaults.proTipsEnabled,
		notificationsEnabled: typeof candidate.notificationsEnabled === 'boolean' ? candidate.notificationsEnabled : defaults.notificationsEnabled,
		standbyStreamEnabled: typeof candidate.standbyStreamEnabled === 'boolean' ? candidate.standbyStreamEnabled : defaults.standbyStreamEnabled,
		standbyStreamThreshold: typeof candidate.standbyStreamThreshold === 'number' && isFinite(candidate.standbyStreamThreshold)
			? Math.max(0, Math.min(100, Math.round(candidate.standbyStreamThreshold)))
			: defaults.standbyStreamThreshold,
		bettingEnabled: typeof candidate.bettingEnabled === 'boolean' ? candidate.bettingEnabled : defaults.bettingEnabled,
		temperatureUnit: candidate.temperatureUnit === 'C' ? 'C' : 'F',
		postseasonBoostPoints: normalizeSecondsPreference(candidate.postseasonBoostPoints, defaults.postseasonBoostPoints),
	};
};
