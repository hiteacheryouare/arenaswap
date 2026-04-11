export type SportType = 'basketball' | 'football' | 'hockey' | 'baseball' | 'soccer';
export type LeagueId = 'nba' | 'wnba' | 'nhl' | 'pwhl' | 'ncaamh' | 'mlb' | 'nfl' | 'ncaab' | 'ncaaf' | 'mls';
/** @deprecated Use LeagueId */
export type SportId = LeagueId;

/** Minimal game shape required by the PowerScore algorithm */
export interface Game {
	id: string;
	league: LeagueId;
	sportType: SportType;
	homeTeam: { score: number; abbreviation: string };
	awayTeam: { score: number; abbreviation: string };
	period: number;
	clockSeconds: number;
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
}

export interface BaseballInningScoreTier {
	minInning: number;
	score: number;
	includeReason: boolean;
}

export interface ExponentialLateGameCurve {
	/** Minimum late-game score returned when the curve activates */
	minScore: number;
	/** Maximum late-game score for this curve segment (pre-overtime) */
	maxScore: number;
	/** Exponential steepness; larger values ramp score faster near game end */
	growthRate: number;
}

export interface ClockLateGameCurveConfig {
	model: 'clock';
	/** Time-remaining window in the final period where the curve is active */
	finalPeriodWindowSecs: number;
	/** Time-remaining window in the previous period where mild pressure applies */
	previousPeriodWindowSecs: number;
	finalPeriodCurve: ExponentialLateGameCurve;
	previousPeriodCurve: ExponentialLateGameCurve;
}

export interface BaseballLateGameCurveConfig {
	model: 'baseball';
	/** Regulation innings for this sport (MLB = 9) */
	regulationInnings: number;
	/** First inning where regulation late-game pressure should begin */
	regulationStartInning: number;
	/** Extra-innings baseline inning (typically regulationInnings + 1) */
	extraInningsStartInning: number;
	regulationCurve: ExponentialLateGameCurve;
	extraInningsCurve: ExponentialLateGameCurve;
}

export type LateGameCurveConfig = ClockLateGameCurveConfig | BaseballLateGameCurveConfig;

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
		leadChanges: {
			multiple: number;
			single: number;
			none: number;
		};
		comeback: {
			big: number;
			moderate: number;
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
	/** Sport-aware exponential late-game model (future scorer path) */
	lateGameCurve: LateGameCurveConfig;
	/** @deprecated Legacy threshold tier (critical). Prefer lateGameCurve for new scorer logic. */
	lateGameCriticalSecs: number;
	/** @deprecated Legacy threshold tier (tense). Prefer lateGameCurve for new scorer logic. */
	lateGameTenseSecs: number;
	/** @deprecated Legacy threshold tier (previous period). Prefer lateGameCurve for new scorer logic. */
	lateGamePrevPeriodSecs: number;
	/** Unanswered-scoring-run size that triggers max momentum score */
	momentumBigRun: number;
	/** Unanswered-scoring-run size that triggers half momentum score */
	momentumSmallRun: number;
	/** true when ESPN reports elapsed time (counts up), e.g. soccer; false = countdown */
	clockCountsUp: boolean;
	/** if true, 0-0 scores the same as any other tied game (appropriate for soccer/hockey) */
	zeroZeroAsFullTie: boolean;
	/** Score-margin shrinkage (in the history window) that triggers a big comeback score */
	comebackThresholdBig: number;
	/** Score-margin shrinkage (in the history window) that triggers a moderate comeback score */
	comebackThresholdSmall: number;
	/** overrides MAX_HISTORY_SNAPSHOTS for momentum window; omit to use the global default */
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
