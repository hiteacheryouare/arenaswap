import type { LeagueId, SportType, SportTypeConfig, ScorerTunables, LeagueConfig } from './types';

export const breakPenalty = 15;

export const scoringOpportunityBaseRunnerBoosts: [number, number, number, number] = [0, 3, 6, 10];

export const scoringOpportunityRedZoneBoost = 10;
export const scoringOpportunityRedZoneFringeBoost = 5;

export const redZoneDownMultipliers = {
	fourthDownGoalToGo: 1.5,
	fourthDown: 1.35,
	thirdAndShort: 1.15,
	other: 1,
} as const;

export const thirdAndShortDistance = 3;

export const scoreMaxCloseness = 42;
export const scoreMaxLateGame = 38;
export const scoreMaxMomentum = 38;
export const scoreMaxLeadChanges = 18;
export const scoreMaxComeback = 20;
export const scoreWinProbVarianceMax = 5;
export const scoreMaxTotal = 100;

export const scoreMaxSignalsSubtotal =
	scoreMaxCloseness + scoreMaxLateGame + scoreMaxMomentum + scoreMaxLeadChanges + scoreMaxComeback;

const lateGameCloseCeiling = 36;

export const scorerTunables: ScorerTunables = {
	scores: {
		closeness: {
			tied: scoreMaxCloseness,
			tight: 34,
			zeroZero: 22,
			close: 20,
			fringe: 8,
			none: 0,
		},
		closenessFlatFloor: 12,
		lateGame: {
			overtime: scoreMaxLateGame,
			closeCeiling: lateGameCloseCeiling,
			fringeCeiling: 22,
			blowoutCeiling: 15,
			finalPeriodStart: 3,
			previousPeriodTouch: 3,
			otPreBoostMax: scoreMaxLateGame - lateGameCloseCeiling,
			none: 0,
		},
		momentum: {
			bigRun: scoreMaxMomentum,
			smallRun: 20,
			none: 0,
		},
		leadChanges: {
			multiple: scoreMaxLeadChanges,
			single: 12,
			none: 0,
		},
		comeback: {
			big: scoreMaxComeback,
			moderate: 11,
			flatFloor: 2,
			none: 0,
		},
		winProbabilityVariance: {
			halfLife: 0.1,
			swingWeight: 0.3,
			coinFlipZeroDistance: 0.175,
			openLead: 0.8,
			decidedLead: 0.97,
			penaltyFromProgress: 0.5,
			scales: { movementFullScale: 1.77, swingFullScale: 0.27, neutralBlend: 0.52 },
		},
	},
	reasons: {
		fallback: 'best game available',
	},
};

export const sportTypeConfigs: SportTypeConfig[] = [
	{
		id: 'basketball',
		clockBased: true,
		closenessMargins: [5, 10, 18],
		momentumBigRun: 8,
		momentumSmallRun: 4,
		clockCountsUp: false,
		zeroZeroAsFullTie: false,
		comebackThresholdBig: 6,
		comebackThresholdSmall: 3,
		decayHalfLifeMs: { momentum: 45_000, leadChange: 60_000, comeback: 60_000 },
		otPreBoostWindowSecs: 60,
		overtimeDurationSecs: 300,
		winProbabilityScales: { movementFullScale: 1.77, swingFullScale: 0.27, neutralBlend: 0.52 },
		historyWindowMs: 300_000,
	},
	{
		id: 'hockey',
		clockBased: true,
		closenessMargins: [1, 2, 3],
		momentumBigRun: 2,
		momentumSmallRun: 1,
		clockCountsUp: false,
		zeroZeroAsFullTie: true,
		zeroZeroPenaltyPeriods: [1, 2],
		comebackThresholdBig: 2,
		comebackThresholdSmall: 1,
		decayHalfLifeMs: { momentum: 180_000, leadChange: 240_000, comeback: 240_000 },
		otPreBoostWindowSecs: 60,
		overtimeDurationSecs: 300,
		historyWindowMs: 960_000,
	},
	{
		id: 'baseball',
		clockBased: false,
		closenessMargins: [1, 3, 5],
		lateGameCurve: {
			model: 'baseball',
			regulationInnings: 9,
			regulationStartInning: 6,
		},
		momentumBigRun: 3,
		momentumSmallRun: 1,
		clockCountsUp: false,
		zeroZeroAsFullTie: false,
		comebackThresholdBig: 2,
		comebackThresholdSmall: 1,
		decayHalfLifeMs: { momentum: 150_000, leadChange: 180_000, comeback: 180_000 },
		otPreBoostWindowSecs: 0,
		winProbabilityScales: { movementFullScale: 0.67, swingFullScale: 0.29, neutralBlend: 0.46 },
		historyWindowMs: 720_000,
	},
	{
		id: 'football',
		clockBased: true,
		closenessMargins: [3, 9, 14],
		momentumBigRun: 10,
		momentumSmallRun: 4,
		clockCountsUp: false,
		zeroZeroAsFullTie: false,
		comebackThresholdBig: 7,
		comebackThresholdSmall: 3,
		decayHalfLifeMs: { momentum: 135_000, leadChange: 180_000, comeback: 180_000 },
		otPreBoostWindowSecs: 60,
		overtimeDurationSecs: 600,
		winProbabilityScales: { movementFullScale: 0.77, swingFullScale: 0.23, neutralBlend: 0.54 },
		historyWindowMs: 720_000,
	},
	{
		id: 'softball',
		clockBased: false,
		closenessMargins: [1, 3, 5],
		lateGameCurve: {
			model: 'baseball',
			regulationInnings: 7,
			regulationStartInning: 5,
		},
		momentumBigRun: 3,
		momentumSmallRun: 1,
		clockCountsUp: false,
		zeroZeroAsFullTie: false,
		comebackThresholdBig: 2,
		comebackThresholdSmall: 1,
		decayHalfLifeMs: { momentum: 150_000, leadChange: 180_000, comeback: 180_000 },
		otPreBoostWindowSecs: 0,
		historyWindowMs: 720_000,
	},
	{
		id: 'soccer',
		clockBased: true,
		closenessMargins: [1, 2, 3],
		momentumBigRun: 2,
		momentumSmallRun: 1,
		clockCountsUp: true,
		clockIsFullGameElapsed: true,
		zeroZeroAsFullTie: true,
		zeroZeroPenaltyPeriods: [1],
		comebackThresholdBig: 2,
		comebackThresholdSmall: 1,
		decayHalfLifeMs: { momentum: 240_000, leadChange: 300_000, comeback: 300_000 },
		otPreBoostWindowSecs: 60,
		historyWindowMs: 1_200_000,
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
		runMinutes: { bar: 144, p25: 131, p99: 178 },
	},
	{
		id: 'wnba',
		label: 'WNBA',
		sportType: 'basketball',
		espnPath: 'basketball/wnba',
		regularPeriods: 4,
		periodDurationSecs: 600,
		periodFormat: 'quarters',
		runMinutes: { bar: 124, p25: 112, p99: 152 },
	},
	{
		id: 'ncaab',
		label: 'NCAA Basketball',
		sportType: 'basketball',
		espnPath: 'basketball/mens-college-basketball',
		regularPeriods: 2,
		periodDurationSecs: 1200,
		periodFormat: 'halves',
		runMinutes: { bar: 130, p25: 118, p99: 168 },
	},
	{
		id: 'nhl',
		label: 'NHL',
		sportType: 'hockey',
		espnPath: 'hockey/nhl',
		regularPeriods: 3,
		periodDurationSecs: 1200,
		periodFormat: 'periods',
		runMinutes: { bar: 156, p25: 144, p99: 195 },
	},
	{
		id: 'ncaamh',
		label: "NCAA Men's Hockey",
		sportType: 'hockey',
		espnPath: 'hockey/mens-college-hockey',
		regularPeriods: 3,
		periodDurationSecs: 1200,
		periodFormat: 'periods',
		runMinutes: { bar: 150, p25: 139, p99: 188 },
	},
	{
		id: 'mlb',
		label: 'MLB',
		sportType: 'baseball',
		espnPath: 'baseball/mlb',
		regularPeriods: 9,
		periodDurationSecs: 0,
		periodFormat: 'innings',
		runMinutes: { bar: 168, p25: 143, p99: 255 },
	},
	{
		id: 'nfl',
		label: 'NFL',
		sportType: 'football',
		espnPath: 'football/nfl',
		regularPeriods: 4,
		periodDurationSecs: 900,
		periodFormat: 'quarters',
		runMinutes: { bar: 195, p25: 176, p99: 240 },
	},
	{
		id: 'ncaaf',
		label: 'NCAA Football',
		sportType: 'football',
		espnPath: 'football/college-football',
		regularPeriods: 4,
		periodDurationSecs: 900,
		periodFormat: 'quarters',
		runMinutes: { bar: 210, p25: 182, p99: 265 },
		untimedOvertime: true,
	},
	{
		id: 'mls',
		label: 'MLS',
		sportType: 'soccer',
		espnPath: 'soccer/usa.1',
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: 'halves',
		runMinutes: { bar: 120, p25: 112, p99: 140 },
	},
	{
		id: 'ncaaw',
		label: "NCAA Women's Basketball",
		sportType: 'basketball',
		espnPath: 'basketball/womens-college-basketball',
		regularPeriods: 4,
		periodDurationSecs: 600,
		periodFormat: 'quarters',
		runMinutes: { bar: 122, p25: 111, p99: 152 },
	},
	{
		id: 'epl',
		label: 'English Premier League',
		sportType: 'soccer',
		espnPath: 'soccer/eng.1',
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: 'halves',
		runMinutes: { bar: 120, p25: 112, p99: 140 },
	},
	{
		id: 'fifawc',
		label: 'FIFA World Cup',
		sportType: 'soccer',
		espnPath: 'soccer/fifa.world',
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: 'halves',
		runMinutes: { bar: 124, p25: 114, p99: 145 },
		knockoutRunMinutes: { bar: 158, p25: 120, p99: 195 },
	},
	{
		id: 'cbase',
		label: 'NCAA Baseball',
		sportType: 'baseball',
		espnPath: 'baseball/college-baseball',
		regularPeriods: 9,
		periodDurationSecs: 0,
		periodFormat: 'innings',
		runMinutes: { bar: 192, p25: 160, p99: 275 },
	},
	{
		id: 'csoft',
		label: 'NCAA Softball',
		sportType: 'softball',
		espnPath: 'baseball/college-softball',
		regularPeriods: 7,
		periodDurationSecs: 0,
		periodFormat: 'innings',
		runMinutes: { bar: 128, p25: 103, p99: 195 },
	},
	{
		id: 'olybb',
		label: "Olympic Men's Baseball",
		sportType: 'baseball',
		espnPath: 'baseball/olympics-baseball',
		regularPeriods: 9,
		periodDurationSecs: 0,
		periodFormat: 'innings',
		runMinutes: { bar: 172, p25: 145, p99: 225 },
	},
	{
		id: 'wbbc',
		label: 'World Baseball Classic',
		sportType: 'baseball',
		espnPath: 'baseball/world-baseball-classic',
		regularPeriods: 9,
		periodDurationSecs: 0,
		periodFormat: 'innings',
		runMinutes: { bar: 178, p25: 145, p99: 235 },
	},
	{
		id: 'ufl',
		label: 'UFL',
		sportType: 'football',
		espnPath: 'football/ufl',
		regularPeriods: 4,
		periodDurationSecs: 900,
		periodFormat: 'quarters',
		runMinutes: { bar: 178, p25: 160, p99: 210 },
		untimedOvertime: true,
	},
	{
		id: 'olymih',
		label: "Olympic Men's Ice Hockey",
		sportType: 'hockey',
		espnPath: 'hockey/olympics-mens-ice-hockey',
		regularPeriods: 3,
		periodDurationSecs: 1200,
		periodFormat: 'periods',
		runMinutes: { bar: 142, p25: 131, p99: 185 },
	},
	{
		id: 'olywih',
		label: "Olympic Women's Ice Hockey",
		sportType: 'hockey',
		espnPath: 'hockey/olympics-womens-ice-hockey',
		regularPeriods: 3,
		periodDurationSecs: 1200,
		periodFormat: 'periods',
		runMinutes: { bar: 136, p25: 127, p99: 178 },
	},
	{
		id: 'olybkm',
		label: "Olympic Men's Basketball",
		sportType: 'basketball',
		espnPath: 'basketball/mens-olympics-basketball',
		regularPeriods: 4,
		periodDurationSecs: 600,
		periodFormat: 'quarters',
		runMinutes: { bar: 112, p25: 102, p99: 140 },
	},
	{
		id: 'olybkw',
		label: "Olympic Women's Basketball",
		sportType: 'basketball',
		espnPath: 'basketball/womens-olympics-basketball',
		regularPeriods: 4,
		periodDurationSecs: 600,
		periodFormat: 'quarters',
		runMinutes: { bar: 108, p25: 99, p99: 134 },
	},
	{
		id: 'olysocm',
		label: "Olympic Men's Soccer",
		sportType: 'soccer',
		espnPath: 'soccer/fifa.olympics',
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: 'halves',
		runMinutes: { bar: 122, p25: 113, p99: 140 },
		knockoutRunMinutes: { bar: 156, p25: 119, p99: 193 },
	},
	{
		id: 'olysocw',
		label: "Olympic Women's Soccer",
		sportType: 'soccer',
		espnPath: 'soccer/fifa.w.olympics',
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: 'halves',
		runMinutes: { bar: 122, p25: 113, p99: 140 },
		knockoutRunMinutes: { bar: 156, p25: 119, p99: 193 },
	},
	{
		id: 'laliga',
		label: 'La Liga',
		sportType: 'soccer',
		espnPath: 'soccer/esp.1',
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: 'halves',
		runMinutes: { bar: 120, p25: 112, p99: 140 },
	},
	{
		id: 'bundesliga',
		label: 'Bundesliga',
		sportType: 'soccer',
		espnPath: 'soccer/ger.1',
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: 'halves',
		runMinutes: { bar: 120, p25: 112, p99: 140 },
	},
	{
		id: 'seriea',
		label: 'Serie A',
		sportType: 'soccer',
		espnPath: 'soccer/ita.1',
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: 'halves',
		runMinutes: { bar: 120, p25: 112, p99: 140 },
	},
	{
		id: 'ligamx',
		label: 'Liga MX',
		sportType: 'soccer',
		espnPath: 'soccer/mex.1',
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: 'halves',
		runMinutes: { bar: 120, p25: 112, p99: 140 },
	},
	{
		id: 'ucl',
		label: 'UEFA Champions League',
		sportType: 'soccer',
		espnPath: 'soccer/uefa.champions',
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: 'halves',
		runMinutes: { bar: 122, p25: 113, p99: 180 },
	},
	{
		id: 'uel',
		label: 'UEFA Europa League',
		sportType: 'soccer',
		espnPath: 'soccer/uefa.europa',
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: 'halves',
		runMinutes: { bar: 122, p25: 113, p99: 180 },
	},
	{
		id: 'nwsl',
		label: 'NWSL',
		sportType: 'soccer',
		espnPath: 'soccer/usa.nwsl',
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: 'halves',
		runMinutes: { bar: 128, p25: 116, p99: 158 },
	},
	{
		id: 'fifawwc',
		label: "FIFA Women's World Cup",
		sportType: 'soccer',
		espnPath: 'soccer/fifa.wwc',
		regularPeriods: 2,
		periodDurationSecs: 2700,
		periodFormat: 'halves',
		runMinutes: { bar: 122, p25: 113, p99: 142 },
		knockoutRunMinutes: { bar: 150, p25: 118, p99: 190 },
	},
];

export const allLeagueIds = leagueConfigs.map(c => c.id) as LeagueId[];

export const leagueConfigMap = Object.fromEntries(
	leagueConfigs.map(c => [c.id, c])
) as Record<LeagueId, LeagueConfig>;

export const boostBucketCaps = {
	moment: 20,
	noHitter: 70,
	context: 16,
} as const;

export const goAheadRunTunables = { goAhead: 8, tyingRun: 5, earlyFactor: 0.5, lastChanceFactor: 1.25 } as const;

export const twoMinuteDrillTunables = { max: 12, oneScore: 8, peakYards: 35, ownTwentyFactor: 0.4 } as const;

export const noHitterTunables = {
	ladder: [10, 22, 38, 52] as const,
	finalStagePerOut: 5,
	battingFactor: 0.7,
	softballFactor: 0.6,
} as const;

export const redCardTunables = { fullMinutes: 2, fadeMinutes: 10, secondCardFactor: 1.5, siegeClosenessBump: 4, tiedMagnitude: 10 } as const;

export const upsetTunables = { max: 12 } as const;

export const stakesTunables = { max: 10, raceMax: 6 } as const;

export const hockeyTunables = { emptyNetWindowSecs: 240 } as const;
