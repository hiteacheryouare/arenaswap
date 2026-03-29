import pkg from '../package.json';
import type { SportId } from './types';

// App identity (sourced from package.json)
export const APP_NAME = pkg.name;
export const APP_VERSION = pkg.version;
export const APP_DESCRIPTION = pkg.description;

export const POLL_INTERVAL_MS = 15_000;
export const MAX_HISTORY_SNAPSHOTS = 8;

// Excitement scoring — max points per signal (total possible: 95, sport-agnostic)
export const SCORE_MAX_CLOSENESS = 40;
export const SCORE_MAX_LATE_GAME = 35;
export const SCORE_MAX_MOMENTUM = 25;
export const SCORE_MAX_TOTAL = SCORE_MAX_CLOSENESS + SCORE_MAX_LATE_GAME + SCORE_MAX_MOMENTUM;

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

// Per-sport configuration used by the scorer and API client
export interface SportConfig {
	id: SportId;
	/** ESPN API path segment, e.g. 'basketball/nba' */
	espnPath: string;
	/** Number of regulation periods before overtime begins */
	regularPeriods: number;
	/** false for sports without a game clock (MLB) */
	clockBased: boolean;
	/** Seconds per period — used only by the mock simulator */
	periodDurationSecs: number;
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

export const SPORT_CONFIGS: SportConfig[] = [
	{
		id: 'nba',
		espnPath: 'basketball/nba',
		regularPeriods: 4,
		clockBased: true,
		periodDurationSecs: 720, // 12 min quarters
		closenessMargins: [5, 10, 18],
		lateGameCriticalSecs: 120,
		lateGameTenseSecs: 300,
		lateGamePrevPeriodSecs: 300,
		momentumBigRun: 10,
		momentumSmallRun: 5,
	},
	{
		id: 'ncaab',
		espnPath: 'basketball/mens-college-basketball',
		regularPeriods: 2,
		clockBased: true,
		periodDurationSecs: 1200, // 20 min halves
		closenessMargins: [5, 10, 18],
		lateGameCriticalSecs: 120,
		lateGameTenseSecs: 300,
		lateGamePrevPeriodSecs: 300,
		momentumBigRun: 10,
		momentumSmallRun: 5,
	},
	{
		id: 'nhl',
		espnPath: 'hockey/nhl',
		regularPeriods: 3,
		clockBased: true,
		periodDurationSecs: 1200, // 20 min periods
		closenessMargins: [1, 2, 3],
		lateGameCriticalSecs: 120,
		lateGameTenseSecs: 300,
		lateGamePrevPeriodSecs: 300,
		momentumBigRun: 3,
		momentumSmallRun: 2,
	},
	{
		id: 'mlb',
		espnPath: 'baseball/mlb',
		regularPeriods: 9,
		clockBased: false,
		periodDurationSecs: 0, // no clock
		closenessMargins: [1, 3, 5],
		lateGameCriticalSecs: 0,
		lateGameTenseSecs: 0,
		lateGamePrevPeriodSecs: 0,
		momentumBigRun: 4,
		momentumSmallRun: 2,
	},
	{
		id: 'nfl',
		espnPath: 'football/nfl',
		regularPeriods: 4,
		clockBased: true,
		periodDurationSecs: 900, // 15 min quarters
		closenessMargins: [3, 8, 14],
		lateGameCriticalSecs: 120,
		lateGameTenseSecs: 300,
		lateGamePrevPeriodSecs: 180,
		momentumBigRun: 14,
		momentumSmallRun: 7,
	},
	{
		id: 'ncaaf',
		espnPath: 'football/college-football',
		regularPeriods: 4,
		clockBased: true,
		periodDurationSecs: 900, // 15 min quarters
		closenessMargins: [3, 8, 14],
		lateGameCriticalSecs: 120,
		lateGameTenseSecs: 300,
		lateGamePrevPeriodSecs: 180,
		momentumBigRun: 14,
		momentumSmallRun: 7,
	},
];

// O(1) lookup by sport id
export const SPORT_CONFIG_MAP = Object.fromEntries(
	SPORT_CONFIGS.map(c => [c.id, c])
) as Record<SportId, SportConfig>;
