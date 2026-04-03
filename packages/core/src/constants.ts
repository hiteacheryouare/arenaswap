import pkg from '../package.json';
import type { LeagueId, SportType, UserPreferences } from './types';

// App identity (sourced from package.json)
export const APP_NAME = pkg.name;
export const APP_VERSION = pkg.version;
export const APP_DESCRIPTION = pkg.description;

export const POLL_INTERVAL_MS = 15_000;
export const MAX_HISTORY_SNAPSHOTS = 8;

// Clock stall detection — penalty applied when clock is frozen (commercial breaks, stoppages)
export const STALL_THRESHOLD_POLLS = 5; // ~75 seconds at 15s poll interval
export const STALL_PENALTY_MULTIPLIER = 0.7; // 30% PowerScore reduction

// Excitement scoring — max points per signal (total possible: 95, sport-agnostic)
export const SCORE_MAX_CLOSENESS = 40;
export const SCORE_MAX_LATE_GAME = 35;
export const SCORE_MAX_MOMENTUM = 25;
export const SCORE_MAX_TOTAL = SCORE_MAX_CLOSENESS + SCORE_MAX_LATE_GAME + SCORE_MAX_MOMENTUM;

export interface BaseballInningScoreTier {
	minInning: number;
	score: number;
	includeReason: boolean;
}

export interface ScorerTunables {
	scores: {
		closeness: {
			tied: number;
			zeroZero: number;
			tight: number;
			close: number;
			fringe: number;
			none: number;
		};
		lateGame: {
			overtime: number;
			clockBased: {
				critical: number;
				tense: number;
				previousPeriod: number;
			};
			baseballInningTiers: BaseballInningScoreTier[];
			none: number;
		};
		momentum: {
			bigRun: number;
			smallRun: number;
			none: number;
		};
	};
	reasons: {
		tied: string;
		closenessUnitBySportType: Partial<Record<SportType, string>>;
		defaultClosenessUnit: string;
		closenessGameSuffix: string;
		overtime: string;
		extraInnings: string;
		inningSuffix: string;
		clockLeftSuffix: string;
		underPrefix: string;
		minutesLeftSuffix: string;
		momentumRunPrefix: string;
		momentumRunSuffix: string;
		momentumRolling: string;
		fallback: string;
	};
}

export const SCORER_TUNABLES: ScorerTunables = {
	scores: {
		closeness: {
			tied: SCORE_MAX_CLOSENESS,
			zeroZero: 28,
			tight: 35,
			close: 20,
			fringe: 8,
			none: 0,
		},
		lateGame: {
			overtime: SCORE_MAX_LATE_GAME,
			clockBased: {
				critical: 30,
				tense: 20,
				previousPeriod: 10,
			},
			baseballInningTiers: [
				{ minInning: 9, score: 30, includeReason: true },
				{ minInning: 7, score: 20, includeReason: true },
				{ minInning: 6, score: 10, includeReason: false },
			],
			none: 0,
		},
		momentum: {
			bigRun: SCORE_MAX_MOMENTUM,
			smallRun: 10,
			none: 0,
		},
	},
	reasons: {
		tied: 'tied',
		closenessUnitBySportType: {
			hockey: 'goal',
		},
		defaultClosenessUnit: 'point',
		closenessGameSuffix: 'game',
		overtime: 'overtime',
		extraInnings: 'extra innings',
		inningSuffix: 'inning',
		clockLeftSuffix: 'left',
		underPrefix: 'under',
		minutesLeftSuffix: 'min left',
		momentumRunPrefix: 'on a',
		momentumRunSuffix: 'run',
		momentumRolling: 'rolling',
		fallback: 'exciting game',
	},
};

// Switch behavior defaults
export const DEFAULT_SENSITIVITY = 4 as const;
export const DEFAULT_COOLDOWN_SECS = 45;

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

// Per-sport scoring configuration used by the scorer
export interface SportTypeConfig {
	id: SportType;
	/** false for sports without a game clock (MLB) */
	clockBased: boolean;
	/** [tier1, tier2, tier3] score-margin thresholds for closeness signal */
	closenessMargins: [number, number, number];
	/** Seconds remaining in the final period to trigger "critical" late-game score */
	lateGameCriticalSecs: number;
	/** Seconds remaining in the final period to trigger "tense" late-game score */
	lateGameTenseSecs: number;
	/** Seconds remaining in the second-to-last period to trigger a mild late-game score */
	lateGamePrevPeriodSecs: number;
	/** Unanswered-scoring-run size that triggers max momentum score */
	momentumBigRun: number;
	/** Unanswered-scoring-run size that triggers half momentum score */
	momentumSmallRun: number;
}

export interface LeagueConfig {
	id: LeagueId;
	label: string;
	sportType: SportType;
	/** ESPN API path segment, e.g. 'basketball/nba' */
	espnPath: string;
	/** Number of regulation periods before overtime begins */
	regularPeriods: number;
	/** Seconds per period; 0 for sports without a game clock */
	periodDurationSecs: number;
	/** Human-readable period label style in UI */
	periodFormat: 'quarters' | 'halves' | 'periods' | 'innings';
}

export const SPORT_TYPE_CONFIGS: SportTypeConfig[] = [
	{
		id: 'basketball',
		clockBased: true,
		closenessMargins: [5, 10, 18],
		lateGameCriticalSecs: 120,
		lateGameTenseSecs: 300,
		lateGamePrevPeriodSecs: 300,
		momentumBigRun: 10,
		momentumSmallRun: 5,
	},
	{
		id: 'hockey',
		clockBased: true,
		closenessMargins: [1, 2, 3],
		lateGameCriticalSecs: 120,
		lateGameTenseSecs: 300,
		lateGamePrevPeriodSecs: 300,
		momentumBigRun: 3,
		momentumSmallRun: 2,
	},
	{
		id: 'baseball',
		clockBased: false,
		closenessMargins: [1, 3, 5],
		lateGameCriticalSecs: 0,
		lateGameTenseSecs: 0,
		lateGamePrevPeriodSecs: 0,
		momentumBigRun: 4,
		momentumSmallRun: 2,
	},
	{
		id: 'football',
		clockBased: true,
		closenessMargins: [3, 8, 14],
		lateGameCriticalSecs: 120,
		lateGameTenseSecs: 300,
		lateGamePrevPeriodSecs: 180,
		momentumBigRun: 14,
		momentumSmallRun: 7,
	},
];

export const LEAGUE_CONFIGS: LeagueConfig[] = [
	{
		id: 'nba',
		label: 'NBA',
		sportType: 'basketball',
		espnPath: 'basketball/nba',
		regularPeriods: 4,
		periodDurationSecs: 720,
		periodFormat: 'quarters',
	},
	{
		id: 'ncaab',
		label: 'NCAA Basketball',
		sportType: 'basketball',
		espnPath: 'basketball/mens-college-basketball',
		regularPeriods: 2,
		periodDurationSecs: 1200,
		periodFormat: 'halves',
	},
	{
		id: 'nhl',
		label: 'NHL',
		sportType: 'hockey',
		espnPath: 'hockey/nhl',
		regularPeriods: 3,
		periodDurationSecs: 1200,
		periodFormat: 'periods',
	},
	{
		id: 'mlb',
		label: 'MLB',
		sportType: 'baseball',
		espnPath: 'baseball/mlb',
		regularPeriods: 9,
		periodDurationSecs: 0,
		periodFormat: 'innings',
	},
	{
		id: 'nfl',
		label: 'NFL',
		sportType: 'football',
		espnPath: 'football/nfl',
		regularPeriods: 4,
		periodDurationSecs: 900,
		periodFormat: 'quarters',
	},
	{
		id: 'ncaaf',
		label: 'NCAA Football',
		sportType: 'football',
		espnPath: 'football/college-football',
		regularPeriods: 4,
		periodDurationSecs: 900,
		periodFormat: 'quarters',
	},
];

export const ALL_LEAGUE_IDS = LEAGUE_CONFIGS.map(c => c.id) as LeagueId[];

export const SPORT_TYPE_CONFIG_MAP = Object.fromEntries(
	SPORT_TYPE_CONFIGS.map(c => [c.id, c])
) as Record<SportType, SportTypeConfig>;

export const LEAGUE_CONFIG_MAP = Object.fromEntries(
	LEAGUE_CONFIGS.map(c => [c.id, c])
) as Record<LeagueId, LeagueConfig>;

export const LEAGUE_LOGO_FALLBACKS: Record<LeagueId, string> = {
	nba: 'https://a.espncdn.com/i/teamlogos/leagues/500/nba.png',
	ncaab: 'https://a.espncdn.com/redesign/assets/img/icons/ESPN-icon-basketball.png',
	nhl: 'https://a.espncdn.com/i/teamlogos/leagues/500/nhl.png',
	mlb: 'https://a.espncdn.com/i/teamlogos/leagues/500/mlb.png',
	nfl: 'https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png',
	ncaaf: 'https://a.espncdn.com/redesign/assets/img/icons/ESPN-icon-football-college.png',
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

export const createDefaultUserPreferences = (): UserPreferences => ({
	sensitivity: DEFAULT_SENSITIVITY,
	cooldownSeconds: DEFAULT_COOLDOWN_SECS,
	enabled: true,
	enabledLeagues: [],
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
		cooldownSeconds: typeof candidate.cooldownSeconds === 'number' && Number.isFinite(candidate.cooldownSeconds)
			? Math.max(0, Math.round(candidate.cooldownSeconds))
			: defaults.cooldownSeconds,
		enabled: typeof candidate.enabled === 'boolean' ? candidate.enabled : defaults.enabled,
		enabledLeagues: hasEnabledLeaguesField ? parsedEnabledLeagues : ALL_LEAGUE_IDS,
	};
};
