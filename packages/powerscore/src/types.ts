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
	// A poll ranking (1 is best). Leave it out for an unranked team, and for a bracket seed.
	rank?: number;
	// Baseball and softball.
	hits?: number;
	errors?: number;
	// Timeouts the team has left in the current half or game.
	timeouts?: number;
}

export interface SeriesState {
	homeWins: number;
	awayWins: number;
	// Games in the series, e.g. 7 for best-of-seven.
	bestOf: number;
}

export interface RedCard {
	side: Side;
	// Elapsed game minute the card was shown.
	minute: number;
}

// A feed with its own league ids uses Game<string>; an id the built-in table doesn't know is scored
// with its sport's defaults.
export interface Game<League extends string = LeagueId> {
	id: string;
	league: League;
	sportType: SportType;
	homeTeam: TeamState;
	awayTeam: TeamState;
	period?: number;
	// Absent means unknown, not 0:00: the late-game ramp holds at the period start rather than
	// paying out the buzzer ceiling.
	clockSeconds?: number;
	intermission?: boolean;
	// Scores 0, like an intermission.
	delayed?: boolean;
	status?: 'pre' | 'in' | 'post';
	// Baseball and softball. Top of the inning = true, bottom = false, absent = unknown.
	topOfInning?: boolean;
	baseRunners?: { first: boolean; second: boolean; third: boolean };
	outs?: number;
	// Football only. `down` scales the red-zone boost: a 4th-down snap decides something.
	isRedZone?: boolean;
	down?: number;
	distance?: number;
	isGoalToGo?: boolean;
	// Which team has the ball (football) or the puck/possession where a feed reports it.
	possession?: Side;
	// Football: yards the team with the ball needs to reach the end zone.
	yardsToEndZone?: number;
	// 0 decides the title, 1 a semifinal, 2 a quarterfinal, 3 anything earlier.
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
	// −5 to +5. Absent when no win-probability history was supplied.
	winProbabilityVariance?: number;
	reason: string;
	stalled?: boolean;
	// Points removed, always ≥ 0.
	stallPenalty?: number;
	// The pre-stall signals subtotal, so a breakdown can show what the penalty removed.
	signalsSubtotal?: number;
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
		// Soccer's extra time and shootout, which are not overtime.
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
		// Optional so a 2.x tunables object still type-checks; the built-in English fills the gaps.
		comebackBig?: string;
		comebackModerate?: string;
		fallback: string;
		// English label for each boost's reason fragment, keyed by boost id.
		boosts?: Record<string, string>;
		blowoutMarginSuffix?: string;
		leadHeld?: string;
		earlyRout?: string;
		pilingOn?: string;
	};
}

export interface SportTypeConfig {
	id: SportType;
	clockBased: boolean;
	// [tier1, tier2, tier3] score-margin thresholds.
	closenessMargins: [number, number, number];
	// Baseball only; clock sports derive their ramp from period + clock.
	lateGameCurve?: LateGameCurveConfig;
	// Score-differential swings that trigger the max and half momentum scores.
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
	// How long a broadcast of this league actually occupies a viewer, in minutes: first pitch or
	// kickoff through the final whistle, including halftime, intermissions, reviews and commercial
	// breaks. Deliberately NOT sportWrapAllowanceMs, which is six per-sport values tuned generously
	// for a 24-hour retention window — at that granularity the NBA and FIBA basketball draw the same
	// bar despite a real 32-minute gap, and generous lengths overstate concurrency.
	runMinutes: LeagueRunMinutes;
	// Only the competitions where a single match reaches extra time often enough to move p75. A
	// two-legged tie halves that rate by construction, which is why the UEFA competitions are absent.
	knockoutRunMinutes?: LeagueRunMinutes;
}

export interface LeagueRunMinutes {
	// ~p75, and the length that gets drawn. The failure modes are asymmetric: a bar that ends while
	// the game is still on is the one thing a TV guide must never do, and a slightly long bar only
	// overstates concurrency a little.
	bar: number;
	// Bounds on the occupancy taper — the probability the game is still running at a given moment.
	p25: number;
	p99: number;
}

// ── v3 ────────────────────────────────────────────────────────────────────────────────────────

// Late-season race flags for one team, regular season only.
export interface TeamStakes {
	// Winning this game clinches a playoff spot, a division or a title whatever else happens.
	canClinch?: boolean;
	// Losing this game knocks the team out of contention.
	canBeEliminated?: boolean;
	// Still in the playoff hunt, neither safe nor out.
	inRace?: boolean;
	// Within a few points of a table line: the title, relegation, the top European places, or any
	// other line (a lesser European place, a playoff cut).
	nearLine?: 'title' | 'relegation' | 'topQualification' | 'other';
}

// The line as it stood before the game: a live line moves with the score and would erase an upset.
export interface PregameLine {
	favorite: Side;
	// Points the favorite was laid (positive). Only read for basketball and football.
	spread?: number;
	// American moneylines, e.g. -240 and +190. With both, the vig is removed before use.
	favoriteMoneyline?: number;
	underdogMoneyline?: number;
	// Soccer's three-way line.
	drawMoneyline?: number;
}

// Football positions, plus a pitcher and a hitter for baseball and a generic player elsewhere.
export type FantasyPosition = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DST' | 'P' | 'H' | 'player';

export interface FantasyPlayerState {
	id: string;
	// For reasons, e.g. "Mahomes has the ball".
	name?: string;
	side: Side;
	position: FantasyPosition;
	// False when the feed says the player is out of the game (benched, injured, ejected).
	active?: boolean;
	// Baseball: where the player is in the inning.
	role?: 'atBat' | 'onDeck' | 'inHole' | 'pitching';
	// Fantasy points as they came in, so recent production can fade like any other event.
	pointEvents?: { at: number; points: number }[];
}

export interface ScoringContext {
	// Score snapshots, oldest first, ending at or before this poll. Event ages are measured from the
	// newest one, so a replay scores exactly like the live run did.
	history?: ScoreSnapshot[];
	// Consecutive polls with an unchanged clock (clock sports only).
	stallCount?: number;
	// Home win probability over the whole game, 0–1.
	winProbability?: number[];
	pregameLine?: PregameLine;
	stakes?: Partial<Record<Side, TeamStakes>>;
	// A side when the feed says who has it, `true` when it only says one is on.
	powerPlay?: Side | boolean;
	// Set only once the feed has reported it on two polls in a row: a goalie pulled for a delayed
	// penalty is back within seconds.
	emptyNet?: Side | boolean;
	// Lead changes inside the history window counted by the feed's own play log, which sees flips
	// that happen between polls, and when the latest one happened.
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
	// 0 at the start, 1 at the end of regulation and through overtime.
	progress: number;
	// Timestamp of the newest snapshot (0 with no history).
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
	// Anything a UI might want to say about the boost, e.g. { inning: 8 } for a no-hitter.
	meta?: Record<string, number>;
}

export interface BoostDefinition {
	id: string;
	// Boosts in one bucket share the mode's cap for that bucket.
	bucket?: string;
	compute: (input: SignalInput) => BoostOutput;
}

export type ClassicBlend =
	// total = max(own, factor × classic): the mode leads, ordinary games stay eligible below it.
	| { kind: 'floor'; factor: number }
	// total = weight × own + (1 − weight) × classic.
	| { kind: 'mix'; weight: number }
	// total = classic + weight × own, capped at 100: the mode can only lift a game, never sink it.
	| { kind: 'boost'; weight: number };

// How a blended mode reached its total, so a breakdown can show the arithmetic.
export interface BlendResult {
	kind: ClassicBlend['kind'];
	// The floor factor or the weight.
	weight: number;
	// The mode's own total and Classic's, each with their own boosts, before blending.
	ownTotal: number;
	classicTotal: number;
	// For a floor, whether Classic's share won.
	floorApplied?: boolean;
}

export interface PowerScoreMode {
	id: string;
	// In display order.
	signals: readonly SignalDefinition[];
	// Automatic boosts this mode pays, in display order.
	boosts: readonly BoostDefinition[];
	// Most a bucket of boosts may add together. Earlier boosts in the list are paid first.
	bucketCaps?: Readonly<Record<string, number>>;
	// Signal ids in the order their reasons are worth reading.
	reasonPriority: readonly string[];
	reasonLimit: number;
	usesStallPenalty: boolean;
	usesWinProbability: boolean;
	classicBlend?: ClassicBlend;
	// False for a mode that grades something other than the result, where a playoff game is no more
	// worth watching. Defaults to true.
	paysPostseason?: boolean;
	// The mode has nothing to say about this game (e.g. Fantasy with no rostered player in it), so
	// the game is scored as Classic.
	appliesTo?: (game: Game<string>, context: ScoringContext) => boolean;
}

export type BuiltInModeId = 'classic' | 'blowouts' | 'fantasy';

export interface ScoreOptions {
	mode?: BuiltInModeId | PowerScoreMode;
	// Signal ids of the active mode to switch off. The rest are rescaled to the mode's full range.
	disabledSignals?: readonly string[];
	// Signal ids to switch off in Classic when it's blended in or used as a floor.
	classicDisabledSignals?: readonly string[];
	// Overrides the mode's own blend, e.g. a user's Fantasy/Classic slider.
	classicBlend?: ClassicBlend;
	favoriteTeamCount?: number;
	// Points per favorite team in the game.
	favoriteBoostPoints?: number;
	// Points for a title-deciding game; earlier rounds get a share.
	postseasonBoostPoints?: number;
	// A manual boost. The only thing allowed to push the total past 100.
	gameBoost?: number;
	// For leagues or sports the built-in tables don't know, or to tune them.
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
}

export interface PowerScore {
	gameId: string;
	// The mode that actually scored the game: a mode that doesn't apply falls back to 'classic'.
	modeId: string;
	// 0–100, or above 100 only through gameBoost.
	total: number;
	signals: ScoredSignal[];
	// Sum of the enabled signals before any rescaling.
	signalsSubtotal: number;
	// The same after rescaling for disabled signals, capped at signalCeiling.
	scaledSubtotal: number;
	signalCeiling: number;
	// Halftime, an intermission or a delay: everything scores 0 until play resumes.
	frozen: boolean;
	stalled: boolean;
	stallPenalty: number;
	// −5 to +5; absent without enough win-probability data.
	winProbabilityVariance?: number;
	// Signals less stall plus variance, 0–100, before any boost.
	baseTotal: number;
	// Classic's own total when the mode blends with it or uses it as a floor.
	classicTotal?: number;
	blend?: BlendResult;
	boosts: ScoredBoost[];
	reasons: ReasonFragment[];
	// The reasons in English, joined. For display where the caller has no translations.
	reason: string;
}
