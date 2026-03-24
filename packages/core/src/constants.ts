import pkg from '../package.json';

// App identity (sourced from package.json)
export const APP_NAME = pkg.name;
export const APP_VERSION = pkg.version;
export const APP_DESCRIPTION = pkg.description;

// Polling
export const POLL_INTERVAL_MS = 15_000;
export const MAX_HISTORY_SNAPSHOTS = 8;

// ESPN API — the only external network call this extension makes
export const ESPN_SCOREBOARD_URL =
	'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard';

// Excitement scoring — max points per signal (total possible: 110)
export const SCORE_MAX_CLOSENESS = 40;
export const SCORE_MAX_LATE_GAME = 35;
export const SCORE_MAX_MOMENTUM = 20;
export const SCORE_MAX_PREFERENCE = 15;

// Closeness thresholds (score margin in points)
export const CLOSENESS_TIER_1_MARGIN = 3;   // tied or nearly → max closeness
export const CLOSENESS_TIER_2_MARGIN = 7;   // close game
export const CLOSENESS_TIER_3_MARGIN = 12;  // still interesting

// Late game clock thresholds (seconds remaining in the period)
export const LATE_GAME_OT_PERIOD = 3;           // period 3+ = overtime
export const LATE_GAME_CRITICAL_SECS = 120;     // last 2 min of 2H
export const LATE_GAME_TENSE_SECS = 300;        // last 5 min of 2H
export const LATE_GAME_FIRST_HALF_SECS = 300;   // last 5 min of 1H

// Momentum — unanswered scoring run thresholds (points)
export const MOMENTUM_BIG_RUN = 8;    // → max momentum score
export const MOMENTUM_SMALL_RUN = 5;  // → half momentum score

// Switch behavior defaults
export const DEFAULT_SENSITIVITY = 3 as const;
export const DEFAULT_COOLDOWN_SECS = 90;

// Sensitivity level → score delta required to trigger a tab switch
export const SENSITIVITY_THRESHOLDS: Record<number, number> = {
	1: 50,  // only switch for truly critical moments
	2: 35,
	3: 20,  // default — good balance
	4: 10,
	5: 5,   // switch for any edge
};

// Closeness score → margin bands
export const CLOSENESS_SCORES: Record<number, number> = {
	[CLOSENESS_TIER_1_MARGIN]: SCORE_MAX_CLOSENESS - 5,  // 35
	[CLOSENESS_TIER_2_MARGIN]: 20,
	[CLOSENESS_TIER_3_MARGIN]: 8,
};
