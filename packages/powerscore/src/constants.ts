import type { LeagueId, SportType, SportTypeConfig, ScorerTunables, LeagueConfig } from './types';

// Clock stall detection — penalty applied when clock is frozen (commercial breaks, stoppages)
export const STALL_THRESHOLD_POLLS = 5; // ~75 seconds at 15s poll interval
export const STALL_PENALTY_MULTIPLIER = 0.7; // 30% PowerScore reduction

// PowerScore signal maxes (total possible: 100, sport-agnostic)
export const SCORE_MAX_CLOSENESS = 35;
export const SCORE_MAX_LATE_GAME = 20;
export const SCORE_MAX_MOMENTUM = 20;
export const SCORE_MAX_LEAD_CHANGES = 15;
export const SCORE_MAX_COMEBACK = 10;
export const SCORE_MAX_TOTAL = SCORE_MAX_CLOSENESS + SCORE_MAX_LATE_GAME + SCORE_MAX_MOMENTUM + SCORE_MAX_LEAD_CHANGES + SCORE_MAX_COMEBACK;

export const SCORER_TUNABLES: ScorerTunables = {
	scores: {
		closeness: {
			tied: SCORE_MAX_CLOSENESS,
			tight: 30,
			zeroZero: 24,
			close: 16,
			fringe: 6,
			none: 0,
		},
		lateGame: {
			overtime: SCORE_MAX_LATE_GAME,
			clockBased: {
				critical: 18,
				tense: 12,
				previousPeriod: 6,
			},
			baseballInningTiers: [
				{ minInning: 9, score: 18, includeReason: true },
				{ minInning: 7, score: 12, includeReason: true },
				{ minInning: 6, score: 6, includeReason: false },
			],
			none: 0,
		},
		momentum: {
			bigRun: SCORE_MAX_MOMENTUM,
			smallRun: 8,
			none: 0,
		},
		leadChanges: {
			multiple: SCORE_MAX_LEAD_CHANGES,
			single: 8,
			none: 0,
		},
		comeback: {
			big: SCORE_MAX_COMEBACK,
			moderate: 5,
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
				minScore: 6,
				maxScore: 18,
				growthRate: 2.8,
			},
			previousPeriodCurve: {
				minScore: 2,
				maxScore: 6,
				growthRate: 1.8,
			},
		},
		lateGameCriticalSecs: 120,
		lateGameTenseSecs: 300,
		lateGamePrevPeriodSecs: 300,
		momentumBigRun: 10,
		momentumSmallRun: 5,
		clockCountsUp: false,
		zeroZeroAsFullTie: false,
		comebackThresholdBig: 8,
		comebackThresholdSmall: 4,
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
				minScore: 6,
				maxScore: 18,
				growthRate: 3,
			},
			previousPeriodCurve: {
				minScore: 2,
				maxScore: 6,
				growthRate: 1.9,
			},
		},
		lateGameCriticalSecs: 120,
		lateGameTenseSecs: 300,
		lateGamePrevPeriodSecs: 300,
		momentumBigRun: 3,
		momentumSmallRun: 2,
		clockCountsUp: false,
		zeroZeroAsFullTie: true,
		comebackThresholdBig: 2,
		comebackThresholdSmall: 1,
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
				minScore: 6,
				maxScore: 18,
				growthRate: 1.7,
			},
			extraInningsCurve: {
				minScore: 18,
				maxScore: SCORE_MAX_LATE_GAME,
				growthRate: 1.2,
			},
		},
		lateGameCriticalSecs: 0,
		lateGameTenseSecs: 0,
		lateGamePrevPeriodSecs: 0,
		momentumBigRun: 4,
		momentumSmallRun: 2,
		clockCountsUp: false,
		zeroZeroAsFullTie: false,
		comebackThresholdBig: 3,
		comebackThresholdSmall: 1,
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
				minScore: 6,
				maxScore: 18,
				growthRate: 2.7,
			},
			previousPeriodCurve: {
				minScore: 2,
				maxScore: 6,
				growthRate: 1.7,
			},
		},
		lateGameCriticalSecs: 120,
		lateGameTenseSecs: 300,
		lateGamePrevPeriodSecs: 180,
		momentumBigRun: 14,
		momentumSmallRun: 7,
		clockCountsUp: false,
		zeroZeroAsFullTie: false,
		comebackThresholdBig: 10,
		comebackThresholdSmall: 5,
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
				minScore: 6,
				maxScore: 18,
				growthRate: 2.2,
			},
			previousPeriodCurve: {
				minScore: 2,
				maxScore: 6,
				growthRate: 1.5,
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
