import pkg from '../package.json';
import type { LeagueId, UserPreferences } from './types';
import {
	ALL_LEAGUE_IDS,
	STALL_THRESHOLD_POLLS,
	STALL_PENALTY_MULTIPLIER,
	SCORE_MAX_CLOSENESS,
	SCORE_MAX_LATE_GAME,
	SCORE_MAX_MOMENTUM,
	SCORE_MAX_LEAD_CHANGES,
	SCORE_MAX_COMEBACK,
	SCORE_MAX_TOTAL,
	SCORER_TUNABLES,
	SPORT_TYPE_CONFIGS,
	SPORT_TYPE_CONFIG_MAP,
	LEAGUE_CONFIGS,
	LEAGUE_CONFIG_MAP,
} from '@arenaswap/powerscore';

// Re-export powerscore constants so existing import paths work unchanged
export {
	ALL_LEAGUE_IDS,
	STALL_THRESHOLD_POLLS,
	STALL_PENALTY_MULTIPLIER,
	SCORE_MAX_CLOSENESS,
	SCORE_MAX_LATE_GAME,
	SCORE_MAX_MOMENTUM,
	SCORE_MAX_LEAD_CHANGES,
	SCORE_MAX_COMEBACK,
	SCORE_MAX_TOTAL,
	SCORER_TUNABLES,
	SPORT_TYPE_CONFIGS,
	SPORT_TYPE_CONFIG_MAP,
	LEAGUE_CONFIGS,
	LEAGUE_CONFIG_MAP,
};

// App identity (sourced from package.json)
export const APP_NAME = pkg.name;
export const APP_VERSION = pkg.version;
export const APP_DESCRIPTION = pkg.description;

export const POLL_INTERVAL_MS = 15_000;
export const MAX_HISTORY_SNAPSHOTS = 20; // ~5 minutes of history at 15s poll interval

// Switch behavior defaults
export const DEFAULT_SENSITIVITY = 4 as const;
export const DEFAULT_COOLDOWN_SECS = 45;
export const DEFAULT_SWITCH_DELAY_SECS = 0;

// Sensitivity level → score delta required to trigger a tab switch
export const SENSITIVITY_THRESHOLDS: Record<number, number> = {
	1: 100,
	2: 50,
	3: 35,
	4: 20,
	5: 10,
	6: 5,
	7: 1
};

export const LEAGUE_LOGO_FALLBACKS: Record<LeagueId, string> = {
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
		: LEAGUE_LOGO_FALLBACKS[leagueId]
);

const isLeagueId = (value: unknown): value is LeagueId => (
	typeof value === 'string' && ALL_LEAGUE_IDS.includes(value as LeagueId)
);

const isSensitivityValue = (value: unknown): value is UserPreferences['sensitivity'] => (
	typeof value === 'number' && value >= 1 && value <= 7
);

const normalizeSecondsPreference = (value: unknown, fallback: number): number => (
	typeof value === 'number' && Number.isFinite(value)
		? Math.max(0, Math.round(value))
		: fallback
);

export const createDefaultUserPreferences = (): UserPreferences => ({
	sensitivity: DEFAULT_SENSITIVITY,
	cooldownSeconds: DEFAULT_COOLDOWN_SECS,
	switchDelaySeconds: DEFAULT_SWITCH_DELAY_SECS,
	enabled: true,
	enabledLeagues: [],
	showUpcomingGames: true,
});

export const normalizeUserPreferences = (storedPrefs: unknown): UserPreferences => {
	const defaults = createDefaultUserPreferences();
	if (!storedPrefs || typeof storedPrefs !== 'object') return defaults;

	const candidate = storedPrefs as Partial<UserPreferences> & { enabledLeagues?: unknown };
	const hasEnabledLeaguesField = Object.prototype.hasOwnProperty.call(candidate, 'enabledLeagues');
	const parsedEnabledLeagues = Array.isArray(candidate.enabledLeagues)
		? candidate.enabledLeagues.filter(isLeagueId)
		: [];

	return {
		sensitivity: isSensitivityValue(candidate.sensitivity) ? candidate.sensitivity : defaults.sensitivity,
		cooldownSeconds: normalizeSecondsPreference(candidate.cooldownSeconds, defaults.cooldownSeconds),
		switchDelaySeconds: normalizeSecondsPreference(candidate.switchDelaySeconds, defaults.switchDelaySeconds),
		enabled: typeof candidate.enabled === 'boolean' ? candidate.enabled : defaults.enabled,
		enabledLeagues: hasEnabledLeaguesField ? parsedEnabledLeagues : ALL_LEAGUE_IDS,
		showUpcomingGames: typeof candidate.showUpcomingGames === 'boolean' ? candidate.showUpcomingGames : defaults.showUpcomingGames,
	};
};
