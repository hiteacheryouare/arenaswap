export type SportType = 'basketball' | 'football' | 'hockey' | 'baseball' | 'softball' | 'soccer';
export type LeagueId = 'nba' | 'wnba' | 'nhl' | 'ncaamh' | 'mlb' | 'nfl' | 'ncaab' | 'ncaaf' | 'mls' | 'ncaaw' | 'epl' | 'fifawc'
	| 'cbase' | 'csoft' | 'olybb' | 'wbbc'
	| 'ufl'
	| 'olymih' | 'olywih'
	| 'olybkm' | 'olybkw'
	| 'olysocm' | 'olysocw' | 'laliga' | 'bundesliga' | 'seriea' | 'ligamx' | 'ucl' | 'uel' | 'nwsl' | 'fifawwc';
/** @deprecated Use LeagueId */
export type SportId = LeagueId;

export type Side = 'home' | 'away';

export interface TeamState {
	score: number;
	abbreviation?: string;
	nickname?: string;
	rank?: number;
	hits?: number;
	errors?: number;
	timeouts?: number;
	shootoutScore?: number;
}

export interface SeriesState {
	homeWins: number;
	awayWins: number;
	bestOf: number;
}

export interface RedCard {
	side: Side;
	minute: number;
}

export interface Game<League extends string = LeagueId> {
	id: string;
	league: League;
	sportType: SportType;
	homeTeam: TeamState;
	awayTeam: TeamState;
	period?: number;
	clockSeconds?: number;
	intermission?: boolean;
	delayed?: boolean;
	status?: 'pre' | 'in' | 'post';
	topOfInning?: boolean;
	baseRunners?: { first: boolean; second: boolean; third: boolean };
	outs?: number;
	isRedZone?: boolean;
	down?: number;
	distance?: number;
	isGoalToGo?: boolean;
	possession?: Side;
	yardsToEndZone?: number;
	postseasonRound?: PostseasonRound;
	series?: SeriesState;
	redCards?: RedCard[];
	seasonType?: 'regular' | 'postseason';
}

export type PostseasonRound = 0 | 1 | 2 | 3;

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
	onBreak?: boolean;
	breakPenalty?: number;
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
			halfLife: number;
			swingWeight: number;
			coinFlipZeroDistance: number;
			openLead: number;
			decidedLead: number;
			penaltyFromProgress: number;
			scales: WinProbabilityScales;
		};
	};
	reasons: {
		fallback: string;
	};
}

export interface WinProbabilityScales {
	movementFullScale: number;
	swingFullScale: number;
	neutralBlend: number;
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
	overtimeDurationSecs?: number;
	winProbabilityScales?: WinProbabilityScales;
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
	untimedOvertime?: boolean;
}

export interface LeagueRunMinutes {
	bar: number;
	p25: number;
	p99: number;
}

export interface TeamStakes {
	canClinch?: boolean;
	canBeEliminated?: boolean;
	inRace?: boolean;
	nearLine?: 'title' | 'relegation' | 'topQualification' | 'other';
}

export interface PregameLine {
	favorite: Side;
	spread?: number;
	favoriteMoneyline?: number;
	underdogMoneyline?: number;
	drawMoneyline?: number;
}

export type FantasyPosition = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DST' | 'P' | 'H' | 'player';

export interface FantasyPlayerState {
	id: string;
	name?: string;
	side: Side;
	position: FantasyPosition;
	active?: boolean;
	role?: 'atBat' | 'onDeck' | 'inHole' | 'pitching';
	pointEvents?: { at: number; points: number }[];
}

export type GameClockState = Pick<Game<string>, 'period' | 'clockSeconds' | 'topOfInning'>;

export interface WinProbabilityReading {
	homeWinProbability: number;
	progress: number;
}

export interface ScoringContext {
	history?: ScoreSnapshot[];
	onBreak?: boolean;
	winProbability?: readonly WinProbabilityReading[] | readonly number[];
	pregameLine?: PregameLine;
	stakes?: Partial<Record<Side, TeamStakes>>;
	powerPlay?: Side | boolean;
	emptyNet?: Side | boolean;
	recentLeadChanges?: { count: number; lastAt?: number };
	fantasy?: FantasyPlayerState[];
}

export interface ReasonFragment {
	key: string;
	params?: Record<string, string | number>;
}

export interface SignalInput {
	game: Game<string>;
	context: ScoringContext;
	sport: SportTypeConfig;
	league: LeagueConfig;
	progress: number;
	now: number;
	margin: number;
}

export interface SignalOutput {
	points: number;
	reason?: ReasonFragment;
}

export interface SignalDefinition {
	id: string;
	ceiling: number;
	compute: (input: SignalInput) => SignalOutput;
}

export interface BoostOutput extends SignalOutput {
	meta?: Record<string, number>;
	details?: ReasonFragment[];
}

export interface BoostDefinition {
	id: string;
	bucket?: string;
	compute: (input: SignalInput) => BoostOutput;
}

export type ClassicBlend =
	| { kind: 'floor'; factor: number }
	| { kind: 'mix'; weight: number }
	| { kind: 'boost'; weight: number };

export interface BlendResult {
	kind: ClassicBlend['kind'];
	weight: number;
	ownTotal: number;
	classicTotal: number;
	floorApplied?: boolean;
}

export interface RivalryResult {
	kind: 'beatdown' | 'winning' | 'ordinary';
	side?: Side;
	blownLead?: boolean;
	before: number;
	after: number;
}

export interface PowerScoreMode {
	id: string;
	signals: readonly SignalDefinition[];
	boosts: readonly BoostDefinition[];
	bucketCaps?: Readonly<Record<string, number>>;
	reasonPriority: readonly string[];
	usesBreakPenalty: boolean;
	usesWinProbability: boolean;
	classicBlend?: ClassicBlend;
	paysPostseason?: boolean;
	appliesTo?: (game: Game<string>, context: ScoringContext) => boolean;
	rivals?: RivalBand;
}

export interface RivalBand {
	ordinaryCeiling: number;
}

export type BuiltInModeId = 'classic' | 'blowouts' | 'fantasy';

export interface ScoreOptions {
	mode?: BuiltInModeId | PowerScoreMode;
	disabledSignals?: readonly string[];
	classicDisabledSignals?: readonly string[];
	classicBlend?: ClassicBlend;
	favoriteTeamCount?: number;
	favoriteBoostPoints?: number;
	postseasonBoostPoints?: number;
	gameBoost?: number;
	rivalSides?: readonly Side[];
	sport?: Partial<SportTypeConfig>;
	league?: Partial<LeagueConfig>;
}

export interface ScoredSignal {
	id: string;
	points: number;
	ceiling: number;
	disabled: boolean;
}

export interface ScoredBoost {
	id: string;
	points: number;
	meta?: Record<string, number>;
	details?: ReasonFragment[];
}

export interface PowerScore {
	gameId: string;
	modeId: string;
	total: number;
	signals: ScoredSignal[];
	signalsSubtotal: number;
	scaledSubtotal: number;
	signalCeiling: number;
	frozen: boolean;
	onBreak: boolean;
	breakPenalty: number;
	winProbabilityVariance?: number;
	baseTotal: number;
	classicTotal?: number;
	blend?: BlendResult;
	rivalry?: RivalryResult;
	boosts: ScoredBoost[];
	reasons: ReasonFragment[];
	reason: string;
}
