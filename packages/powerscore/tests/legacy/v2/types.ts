export type SportType = 'basketball' | 'football' | 'hockey' | 'baseball' | 'softball' | 'soccer';
export type LeagueId = 'nba' | 'wnba' | 'nhl' | 'ncaamh' | 'mlb' | 'nfl' | 'ncaab' | 'ncaaf' | 'mls' | 'ncaaw' | 'epl' | 'fifawc'
	| 'cbase' | 'csoft' | 'olybb' | 'wbbc'
	| 'ufl'
	| 'olymih' | 'olywih'
	| 'olybkm' | 'olybkw'
	| 'olysocm' | 'olysocw' | 'laliga' | 'bundesliga' | 'seriea' | 'ligamx' | 'ucl' | 'uel' | 'nwsl' | 'fifawwc';
export type SportId = LeagueId;

export interface Game {
	id: string;
	league: LeagueId;
	sportType: SportType;
	homeTeam: { score: number; abbreviation?: string };
	awayTeam: { score: number; abbreviation?: string };
	period?: number;
	clockSeconds?: number;
	intermission?: boolean;
	delayed?: boolean;
	status?: 'pre' | 'in' | 'post';
	topOfInning?: boolean;
	baseRunners?: { first: boolean; second: boolean; third: boolean };
	isRedZone?: boolean;
	down?: number;
	distance?: number;
	isGoalToGo?: boolean;
}

export interface ScoreSnapshot {
	gameId: string;
	timestamp: number;
	homeScore: number;
	awayScore: number;
}

export interface PowerScoreResult {
	gameId: string;
	total: number;
	closeness: number;
	lateGame: number;
	momentum: number;
	leadChanges: number;
	comeback: number;
	winProbabilityVariance?: number;
	reason: string;
	stalled?: boolean;
	stallPenalty?: number;
	signalsSubtotal?: number;
	favoriteBonus?: number;
	favoriteTeamCount?: number;
	gameBoost?: number;
	scoringOpportunityBoost?: number;
	postseasonBoost?: number;
}

export interface BaseballLateGameCurveConfig {
	model: 'baseball';
	regulationInnings: number;
	regulationStartInning: number;
}

export type LateGameCurveConfig = BaseballLateGameCurveConfig;

export interface ScorerTunables {
	scores: {
		closeness: {
			tied: number;
			tight: number;
			zeroZero: number;
			close: number;
			fringe: number;
			none: number;
		};
		lateGame: {
			overtime: number;
			closeCeiling: number;
			fringeCeiling: number;
			blowoutCeiling: number;
			finalPeriodStart: number;
			previousPeriodTouch: number;
			otPreBoostMax: number;
			none: number;
		};
		momentum: {
			bigRun: number;
			smallRun: number;
			none: number;
		};
		leadChanges: {
			multiple: number;
			single: number;
			none: number;
		};
		comeback: {
			big: number;
			moderate: number;
			flatFloor: number;
			none: number;
		};
		closenessFlatFloor: number;
		winProbabilityVariance: {
			maxAvgDist: number;
			minDataPoints: number;
		};
	};
	reasons: {
		tied: string;
		closenessUnitBySportType: Partial<Record<SportType, string>>;
		defaultClosenessUnit: string;
		closenessGameSuffix: string;
		overtime: string;
		extraTime: string;
		shootout: string;
		extraInnings: string;
		inningSuffix: string;
		clockLeftSuffix: string;
		underPrefix: string;
		minutesLeftSuffix: string;
		minutesElapsedSuffix: string;
		overtimeAnticipation: string;
		drawAnticipation: string;
		momentumOutscoring: string;
		momentumRolling: string;
		leadChangeMultiple: string;
		leadChangeSingle: string;
		fallback: string;
	};
}

export interface SportTypeConfig {
	id: SportType;
	clockBased: boolean;
	closenessMargins: [number, number, number];
	lateGameCurve?: LateGameCurveConfig;
	momentumBigRun: number;
	momentumSmallRun: number;
	clockCountsUp: boolean;
	clockIsFullGameElapsed?: boolean;
	zeroZeroAsFullTie: boolean;
	zeroZeroPenaltyPeriods?: number[];
	comebackThresholdBig: number;
	comebackThresholdSmall: number;
	decayHalfLifeMs: {
		momentum: number;
		leadChange: number;
		comeback: number;
	};
	otPreBoostWindowSecs: number;
	historyWindowMs: number;
}

export interface LeagueConfig {
	id: LeagueId;
	label: string;
	sportType: SportType;
	espnPath: string;
	regularPeriods: number;
	periodDurationSecs: number;
	periodFormat: 'quarters' | 'halves' | 'periods' | 'innings';
	runMinutes: LeagueRunMinutes;
	knockoutRunMinutes?: LeagueRunMinutes;
}

export interface LeagueRunMinutes {
	bar: number;
	p25: number;
	p99: number;
}
