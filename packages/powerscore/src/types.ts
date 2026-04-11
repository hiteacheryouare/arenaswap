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
