import type { LeagueId, SportType, SportTypeConfig, ScorerTunables, LeagueConfig } from './types';

// Clock stall detection — graduated penalty based on how long the clock has been frozen.
// Sorted descending so the first matching step wins.
// At 15s poll interval: 8 polls ≈ 120s (commercial starts), 15 polls ≈ 225s (extended break / halftime).
export const stallPenaltySteps: { minPolls: number; multiplier: number }[] = [
	{ minPolls: 15, multiplier: 0.70 },
	{ minPolls: 8,  multiplier: 0.85 },
];

// PowerScore signal maxes (total possible: 100, sport-agnostic)
export const scoreMaxCloseness = 30;
export const scoreMaxLateGame = 30;
export const scoreMaxMomentum = 20;
export const scoreMaxLeadChanges = 12;
export const scoreMaxComeback = 8;
export const scoreMaxTotal = scoreMaxCloseness + scoreMaxLateGame + scoreMaxMomentum + scoreMaxLeadChanges + scoreMaxComeback;

export const scorerTunables: ScorerTunables = {
	scores: {
		closeness: {
			tied: scoreMaxCloseness,
			tight: 26,
			zeroZero: 20,
			close: 14,
			fringe: 5,
			none: 0,
		},
		lateGame: {
			overtime: scoreMaxLateGame,
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
			bigRun: scoreMaxMomentum,
			smallRun: 10,
			none: 0,
		},
		leadChanges: {
			multiple: scoreMaxLeadChanges,
			single: 10,
			none: 0,
		},
		comeback: {
			big: scoreMaxComeback,
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
		momentumRolling: 'heating up',
		leadChangeMultiple: 'back and forth scoring',
		leadChangeSingle: 'just took the lead',
		comebackBig: 'comeback',
		comebackModerate: 'rallying',
		fallback: 'Top game right now',
	},
};

export const sportTypeConfigs: SportTypeConfig[] = [
	{
		id: 'basketball',
		clockBased: true,
		closenessMargins: [5, 10, 18],
		lateGameCurve: {
			model: 'clock',
			finalPeriodWindowSecs: 300,
			previousPeriodWindowSecs: 300,
			finalPeriodCurve: {
				minScore: 5,
				maxScore: 28,
				growthRate: 1.5,
			},
			previousPeriodCurve: {
				minScore: 3,
				maxScore: 10,
				growthRate: 1.1,
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
				growthRate: 1.6,
			},
			previousPeriodCurve: {
				minScore: 3,
				maxScore: 10,
				growthRate: 1.1,
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
				minScore: 5,
				maxScore: 24,
				growthRate: 1,
			},
			extraInningsCurve: {
				minScore: 24,
				maxScore: scoreMaxLateGame,
				growthRate: 0.9,
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
				minScore: 5,
				maxScore: 28,
				growthRate: 1.5,
			},
			previousPeriodCurve: {
				minScore: 3,
				maxScore: 10,
				growthRate: 1,
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
				minScore: 5,
				maxScore: 28,
				growthRate: 1.3,
			},
			previousPeriodCurve: {
				minScore: 3,
				maxScore: 10,
				growthRate: 0.9,
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

export const sportTypeConfigMap = Object.fromEntries(
	sportTypeConfigs.map(c => [c.id, c])
) as Record<SportType, SportTypeConfig>;

export const leagueConfigs: LeagueConfig[] = [
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
	{
		id: 'ncaaw',
		label: "NCAA Women's Basketball",
		sportType: 'basketball',
		espnPath: 'basketball/womens-college-basketball',
		regularPeriods: 4,
		periodDurationSecs: 600,
		periodFormat: 'quarters',
	},
	{
		id: 'epl',
		label: 'English Premier League',
		sportType: 'soccer',
		espnPath: 'soccer/eng.1',
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: 'halves',
	},
	{
		id: 'fifawc',
		label: 'FIFA World Cup',
		sportType: 'soccer',
		espnPath: 'soccer/fifa.world',
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: 'halves',
	},
];

export const allLeagueIds = leagueConfigs.map(c => c.id) as LeagueId[];

export const leagueConfigMap = Object.fromEntries(
	leagueConfigs.map(c => [c.id, c])
) as Record<LeagueId, LeagueConfig>;
