import type { LeagueId, SportType, SportTypeConfig, ScorerTunables, LeagueConfig } from './types';

// Clock stall detection — penalty applied when clock is frozen (commercial breaks, stoppages)
export const STALL_THRESHOLD_POLLS = 5; // ~75 seconds at 15s poll interval
export const STALL_PENALTY_MULTIPLIER = 0.7; // 30% PowerScore reduction

// PowerScore signal maxes (total possible: 100, sport-agnostic)
export const SCORE_MAX_CLOSENESS = 30;
export const SCORE_MAX_LATE_GAME = 30;
export const SCORE_MAX_MOMENTUM = 20;
export const SCORE_MAX_LEAD_CHANGES = 12;
export const SCORE_MAX_COMEBACK = 8;
export const SCORE_MAX_TOTAL = SCORE_MAX_CLOSENESS + SCORE_MAX_LATE_GAME + SCORE_MAX_MOMENTUM + SCORE_MAX_LEAD_CHANGES + SCORE_MAX_COMEBACK;

export const SCORER_TUNABLES: ScorerTunables = {
	scores: {
		closeness: {
			tied: SCORE_MAX_CLOSENESS,
			tight: 26,
			zeroZero: 20,
			close: 14,
			fringe: 5,
			none: 0,
		},
		lateGame: {
			overtime: SCORE_MAX_LATE_GAME,
			clockBased: {
				critical: 26,
				tense: 18,
				previousPeriod: 10,
			},
			baseballInningTiers: [
				{ minInning: 9, score: 26, includeReason: true },
				{ minInning: 7, score: 18, includeReason: true },
				{ minInning: 6, score: 10, includeReason: false },
			],
			none: 0,
		},
		momentum: {
			bigRun: SCORE_MAX_MOMENTUM,
			smallRun: 10,
			none: 0,
		},
		leadChanges: {
			multiple: SCORE_MAX_LEAD_CHANGES,
			single: 10,
			none: 0,
		},
		comeback: {
			big: SCORE_MAX_COMEBACK,
			moderate: 6,
			none: 0,
		},
	},
	reasons: {
		tied: 'tied',
		closenessUnitBySportType: {
			hockey: 'goal',
			soccer: 'goal',
			baseball: 'run'
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
		leadChangeMultiple: 'back and forth scoring',
		leadChangeSingle: 'lead change',
		comebackBig: 'comeback',
		comebackModerate: 'rallying',
		fallback: 'Best Available',
	},
};

export const SPORT_TYPE_CONFIGS: SportTypeConfig[] = [
	{
		id: 'basketball',
		clockBased: true,
		closenessMargins: [5, 10, 18],
		lateGameCurve: {
			model: 'clock',
			finalPeriodWindowSecs: 300,
			previousPeriodWindowSecs: 300,
			finalPeriodCurve: {
				minScore: 8,
				maxScore: 28,
				growthRate: 3,
			},
			previousPeriodCurve: {
				minScore: 3,
				maxScore: 10,
				growthRate: 2,
			},
		},
		lateGameCriticalSecs: 120,
		lateGameTenseSecs: 300,
		lateGamePrevPeriodSecs: 300,
		momentumBigRun: 8,
		momentumSmallRun: 4,
		clockCountsUp: false,
		zeroZeroAsFullTie: false,
		comebackThresholdBig: 6,
		comebackThresholdSmall: 3,
		maxHistorySnapshots: 32,
	},
	{
		id: 'hockey',
		clockBased: true,
		closenessMargins: [1, 2, 3],
		lateGameCurve: {
			model: 'clock',
			finalPeriodWindowSecs: 300,
			previousPeriodWindowSecs: 300,
			finalPeriodCurve: {
				minScore: 8,
				maxScore: 28,
				growthRate: 3.1,
			},
			previousPeriodCurve: {
				minScore: 3,
				maxScore: 10,
				growthRate: 2,
			},
		},
		lateGameCriticalSecs: 120,
		lateGameTenseSecs: 300,
		lateGamePrevPeriodSecs: 300,
		momentumBigRun: 2,
		momentumSmallRun: 1,
		clockCountsUp: false,
		zeroZeroAsFullTie: true,
		comebackThresholdBig: 2,
		comebackThresholdSmall: 1,
		maxHistorySnapshots: 30,
	},
	{
		id: 'baseball',
		clockBased: false,
		closenessMargins: [1, 3, 5],
		lateGameCurve: {
			model: 'baseball',
			regulationInnings: 9,
			regulationStartInning: 6,
			extraInningsStartInning: 10,
			regulationCurve: {
				minScore: 8,
				maxScore: 24,
				growthRate: 1.8,
			},
			extraInningsCurve: {
				minScore: 24,
				maxScore: SCORE_MAX_LATE_GAME,
				growthRate: 1.25,
			},
		},
		lateGameCriticalSecs: 0,
		lateGameTenseSecs: 0,
		lateGamePrevPeriodSecs: 0,
		momentumBigRun: 3,
		momentumSmallRun: 1,
		clockCountsUp: false,
		zeroZeroAsFullTie: false,
		comebackThresholdBig: 2,
		comebackThresholdSmall: 1,
		maxHistorySnapshots: 36,
	},
	{
		id: 'football',
		clockBased: true,
		closenessMargins: [3, 8, 14],
		lateGameCurve: {
			model: 'clock',
			finalPeriodWindowSecs: 300,
			previousPeriodWindowSecs: 180,
			finalPeriodCurve: {
				minScore: 8,
				maxScore: 28,
				growthRate: 2.9,
			},
			previousPeriodCurve: {
				minScore: 3,
				maxScore: 10,
				growthRate: 1.9,
			},
		},
		lateGameCriticalSecs: 120,
		lateGameTenseSecs: 300,
		lateGamePrevPeriodSecs: 180,
		momentumBigRun: 10,
		momentumSmallRun: 4,
		clockCountsUp: false,
		zeroZeroAsFullTie: false,
		comebackThresholdBig: 7,
		comebackThresholdSmall: 3,
		maxHistorySnapshots: 32,
	},
	{
		id: 'soccer',
		clockBased: true,
		closenessMargins: [1, 2, 3],
		lateGameCurve: {
			model: 'clock',
			finalPeriodWindowSecs: 600,
			previousPeriodWindowSecs: 600,
			finalPeriodCurve: {
				minScore: 8,
				maxScore: 28,
				growthRate: 2.4,
			},
			previousPeriodCurve: {
				minScore: 3,
				maxScore: 10,
				growthRate: 1.7,
			},
		},
		lateGameCriticalSecs: 180,
		lateGameTenseSecs: 600,
		lateGamePrevPeriodSecs: 600,
		momentumBigRun: 2,
		momentumSmallRun: 1,
		clockCountsUp: true,
		zeroZeroAsFullTie: true,
		comebackThresholdBig: 2,
		comebackThresholdSmall: 1,
		maxHistorySnapshots: 40,
	},
];

export const SPORT_TYPE_CONFIG_MAP = Object.fromEntries(
	SPORT_TYPE_CONFIGS.map(c => [c.id, c])
) as Record<SportType, SportTypeConfig>;

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
		id: 'wnba',
		label: 'WNBA',
		sportType: 'basketball',
		espnPath: 'basketball/wnba',
		regularPeriods: 4,
		periodDurationSecs: 600,
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
		id: 'pwhl',
		label: 'PWHL',
		sportType: 'hockey',
		espnPath: 'hockey/pwhl',
		regularPeriods: 3,
		periodDurationSecs: 1200,
		periodFormat: 'periods',
	},
	{
		id: 'ncaamh',
		label: "NCAA Men's Hockey",
		sportType: 'hockey',
		espnPath: 'hockey/mens-college-hockey',
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
	{
		id: 'mls',
		label: 'MLS',
		sportType: 'soccer',
		espnPath: 'soccer/usa.1',
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: 'halves',
	},
];

export const ALL_LEAGUE_IDS = LEAGUE_CONFIGS.map(c => c.id) as LeagueId[];

export const LEAGUE_CONFIG_MAP = Object.fromEntries(
	LEAGUE_CONFIGS.map(c => [c.id, c])
) as Record<LeagueId, LeagueConfig>;
