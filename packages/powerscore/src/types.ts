export type SportType = 'basketball' | 'football' | 'hockey' | 'baseball' | 'softball' | 'soccer';
export type LeagueId = 'nba' | 'wnba' | 'nhl' | 'ncaamh' | 'mlb' | 'nfl' | 'ncaab' | 'ncaaf' | 'mls' | 'ncaaw' | 'epl' | 'fifawc'
	| 'cbase' | 'csoft' | 'olybb' | 'wbbc'
	| 'ufl'
	| 'olymih' | 'olywih'
	| 'olybkm' | 'olybkw'
	| 'olysocm' | 'olysocw' | 'laliga' | 'bundesliga' | 'seriea' | 'ligamx' | 'ucl' | 'uel' | 'nwsl' | 'fifawwc';
/** @deprecated Use LeagueId */
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
	// Scores 0, like an intermission.
	delayed?: boolean;
	status?: 'pre' | 'in' | 'post';
	baseRunners?: { first: boolean; second: boolean; third: boolean };
	// Football only. `down` scales the red-zone boost: a 4th-down snap decides something.
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
	// −5 to +5. Absent when no win-probability history was supplied.
	winProbabilityVariance?: number;
	reason: string;
	stalled?: boolean;
	// Points removed, always ≥ 0.
	stallPenalty?: number;
	baseTotal?: number;
	favoriteBonus?: number;
	favoriteTeamCount?: number;
	gameBoost?: number;
	scoringOpportunityBoost?: number;
	postseasonBoost?: number;
}

// Clock sports derive their ramp from period + clock, so they need no curve config.
export interface BaseballLateGameCurveConfig {
	model: 'baseball';
	regulationInnings: number;
	regulationStartInning: number;
	extraInningsStartInning: number;
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
			// Final-period ramp ceilings, keyed off the closeness tier: margin ≤ t2, ≤ t3, above t3.
			closeCeiling: number;
			fringeCeiling: number;
			blowoutCeiling: number;
			finalPeriodStart: number;
			previousPeriodTouch: number;
			// Extra points (closeCeiling → overtime) a tied game earns through the pre-boost window.
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
			// Always paid for any active tier, before progress scaling and decay.
			flatFloor: number;
			none: number;
		};
		// Always paid for any active tier, before progress scaling.
		closenessFlatFloor: number;
		winProbabilityVariance: {
			// Average |p − 0.5| that saturates the −max penalty; above this it clamps.
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
		extraInnings: string;
		inningSuffix: string;
		clockLeftSuffix: string;
		underPrefix: string;
		minutesLeftSuffix: string;
		overtimeAnticipation: string;
		momentumRunSuffix: string;
		momentumRolling: string;
		leadChangeMultiple: string;
		leadChangeSingle: string;
		fallback: string;
	};
}

export interface SportTypeConfig {
	id: SportType;
	clockBased: boolean;
	// [tier1, tier2, tier3] score-margin thresholds.
	closenessMargins: [number, number, number];
	// Baseball only; clock sports derive their ramp from period + clock.
	lateGameCurve?: LateGameCurveConfig;
	// Unanswered-scoring-run sizes that trigger the max and half momentum scores.
	momentumBigRun: number;
	momentumSmallRun: number;
	clockCountsUp: boolean;
	// Soccer only: ESPN's displayClock runs 0'→90'+ continuously, so completed periods have to be
	// stripped before computing secsRemaining.
	clockIsFullGameElapsed?: boolean;
	zeroZeroAsFullTie: boolean;
	// Regulation periods where 0-0 uses reduced tie credit.
	zeroZeroPenaltyPeriods?: number[];
	// Score-margin shrinkage within the history window.
	comebackThresholdBig: number;
	comebackThresholdSmall: number;
	// Longer for low-scoring sports so a single scoring event keeps the graph alive between scores.
	decayHalfLifeMs: {
		momentum: number;
		leadChange: number;
		comeback: number;
	};
	// Window in the final regulation period where a tied game earns the ramping OT pre-boost.
	// 0 disables it, as for clockless baseball.
	otPreBoostWindowSecs: number;
	// Must be at least 4× the longest decayHalfLifeMs so signals fully fade before falling out of
	// the window, and the same regardless of poll frequency.
	historyWindowMs: number;
}

export interface LeagueConfig {
	id: LeagueId;
	label: string;
	sportType: SportType;
	// e.g. 'basketball/nba'
	espnPath: string;
	regularPeriods: number;
	// 0 for sports without a game clock.
	periodDurationSecs: number;
	periodFormat: 'quarters' | 'halves' | 'periods' | 'innings';
}
