export type SportType = 'basketball' | 'football' | 'hockey' | 'baseball' | 'softball' | 'soccer';
export type LeagueId = 'nba' | 'wnba' | 'nhl' | 'ncaamh' | 'mlb' | 'nfl' | 'ncaab' | 'ncaaf' | 'mls' | 'ncaaw' | 'epl' | 'fifawc'
	| 'cbase' | 'csoft' | 'olybb' | 'wbbc'
	| 'ufl'
	| 'olymih' | 'olywih';
/** @deprecated Use LeagueId */
export type SportId = LeagueId;

/** Minimal game shape required by the PowerScore algorithm */
export interface Game {
	id: string;
	league: LeagueId;
	sportType: SportType;
	homeTeam: { score: number; abbreviation?: string };
	awayTeam: { score: number; abbreviation?: string };
	period?: number;
	clockSeconds?: number;
	intermission?: boolean;
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
	reason: string;
	stalled?: boolean;
	baseTotal?: number;
	favoriteBonus?: number;
	favoriteTeamCount?: number;
	gameBoost?: number;
}

/** Inning anchors for baseball's near-linear late-game ramp (clock sports derive theirs from the
 *  period + clock, so they need no curve config). */
export interface BaseballLateGameCurveConfig {
	model: 'baseball';
	/** Regulation innings for this sport (MLB = 9) */
	regulationInnings: number;
	/** First inning where regulation late-game pressure should begin */
	regulationStartInning: number;
	/** Extra-innings baseline inning (typically regulationInnings + 1) */
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
			/** ceiling the near-linear regulation ramp reaches at the end of the final period (pre-OT) */
			otEdgeMax: number;
			/** late-game score at the very start of the final period */
			finalPeriodStart: number;
			/** small constant pressure carried through the previous period's ramp */
			previousPeriodTouch: number;
			/** extra points (otEdgeMax → overtime) a tied game earns ramping through the OT pre-boost window */
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
			/** always-paid minimum for any active comeback tier (before progress scaling and decay) */
			flatFloor: number;
			none: number;
		};
		/** always-paid minimum for any active closeness tier (before progress scaling) */
		closenessFlatFloor: number;
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
		momentumRunPrefix: string;
		momentumRunSuffix: string;
		momentumRolling: string;
		leadChangeMultiple: string;
		leadChangeSingle: string;
		comebackBig: string;
		comebackModerate: string;
		fallback: string;
	};
}

export interface SportTypeConfig {
	id: SportType;
	/** false for sports without a game clock (MLB) */
	clockBased: boolean;
	/** [tier1, tier2, tier3] score-margin thresholds for closeness signal */
	closenessMargins: [number, number, number];
	/** Inning-based late-game model — baseball only. Clock sports derive their near-linear ramp
	 *  directly from period + clock, so they omit this. */
	lateGameCurve?: LateGameCurveConfig;
	/** Unanswered-scoring-run size that triggers max momentum score */
	momentumBigRun: number;
	/** Unanswered-scoring-run size that triggers half momentum score */
	momentumSmallRun: number;
	/** true when ESPN reports elapsed time (counts up), e.g. soccer; false = countdown */
	clockCountsUp: boolean;
	/** true when the clock reports total game elapsed time (not per-period). Soccer only: ESPN's
	 *  displayClock runs 0'→90'+ continuously; strip completed periods before computing secsRemaining. */
	clockIsFullGameElapsed?: boolean;
	/** if true, 0-0 scores the same as any other tied game outside configured penalty periods */
	zeroZeroAsFullTie: boolean;
	/** regulation periods where 0-0 should use reduced tie credit */
	zeroZeroPenaltyPeriods?: number[];
	/** Score-margin shrinkage (in the history window) that triggers a big comeback score */
	comebackThresholdBig: number;
	/** Score-margin shrinkage (in the history window) that triggers a moderate comeback score */
	comebackThresholdSmall: number;
	/** Half-lives (ms) for the live-action decay cluster. Longer for low-scoring sports so a single
	 *  scoring event keeps the PowerScore graph alive between rare scores. */
	decayHalfLifeMs: {
		momentum: number;
		leadChange: number;
		comeback: number;
	};
	/** Seconds-remaining window in the final regulation period during which a tied game earns the
	 *  ramping overtime pre-boost. 0 disables the pre-boost (e.g. clockless baseball). */
	otPreBoostWindowSecs: number;
	/** overrides maxHistorySnapshots for momentum window; omit to use the global default */
	maxHistorySnapshots?: number;
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
