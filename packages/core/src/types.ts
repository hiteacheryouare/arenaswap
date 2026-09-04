import type {
	SportType,
	LeagueId,
	SportId,
	ScoreSnapshot,
	PowerScoreResult,
	SportTypeConfig,
	ScorerTunables,
	LeagueConfig,
} from 'powerscore';

export type SignalName = 'closeness' | 'lateGame' | 'momentum' | 'leadChanges' | 'comeback';
export type {
	SportType,
	LeagueId,
	SportId,
	ScoreSnapshot,
	PowerScoreResult,
	SportTypeConfig,
	ScorerTunables,
	LeagueConfig,
};

// Baseball pitchers and hockey goalies arrive in the same `probables` structure, so this is not
// named for either one.
export interface ProbableStarter {
	name: string;
	// Present for 97% of pitchers and every goalie sampled. Soccer has almost none, which is why
	// the UI needs a fallback rather than treating absence as an edge case.
	headshot?: string;
	// Assembled from the separate wins and losses stats rather than parsed back out of `line`, so
	// each number can carry its own label. All 182 upcoming probables sampled had both, plus ERA.
	winLoss?: string;
	era?: string;
	// ESPN's own pre-formatted "(7-7, 5.17)". Rendered unlabelled, and only when the two above are
	// missing — which no baseball probable sampled was, and every goalie is.
	line?: string;
	// Hockey only. ESPN sends no starter status for baseball.
	status?: 'expected' | 'confirmed';
}

export interface TeamLeader {
	// ESPN's category name, normalized. The key a label is looked up by, never display text.
	category: string;
	// ESPN's own abbreviation, rendered only for a category we have no translation for.
	fallbackLabel: string;
	player: string;
	value: string;
	headshot?: string;
}

export interface Team {
	id: string;
	name: string;
	abbreviation: string;
	score: number;
	// Soccer only, once a match reaches a shootout: `score` stays frozen at the 120-minute
	// scoreline while this decides the tie.
	shootoutScore?: number;
	logo?: string;
	// CSS hex, from the API. `alternateColor` is used when the primary clashes with the opponent.
	color?: string;
	alternateColor?: string;
	// The overall record, e.g. "76-58". Carried in every status because the detail hero shows it
	// for live and finished games too.
	record?: string;
	// Pre-game only, and only where ESPN sends them. Leaders in particular are pre-game only for
	// correctness rather than economy: once a game starts, the same categories hold that game's box
	// line ("1-4, HR, 4 RBI") instead of a season total.
	probableStarter?: ProbableStarter;
	leaders?: TeamLeader[];
}

export interface GameCondition {
	// °F, as reported by ESPN.
	temperatureF: number;
	conditionLabel: string;
}

export interface GameOddsProvider {
	name: string;
	logoUrl?: string;
	darkLogoUrl?: string;
}

export interface GameOdds {
	details?: string;
	overUnder?: number;
	provider?: GameOddsProvider;
}


export interface Game {
	id: string;
	league: LeagueId;
	sportType: SportType;
	homeTeam: Team;
	awayTeam: Team;
	venueName?: string;
	// Already comma-joined for display, e.g. 'Inglewood, CA' or 'London, England'.
	venueLocation?: string;
	period: number;
	clockSeconds: number;
	status: 'pre' | 'in' | 'post';
	startTime?: string;
	broadcasts?: string[];
	odds?: GameOdds;
	intermission?: boolean;
	// Top of inning = true, bottom = false.
	topOfInning?: boolean;
	baseRunners?: { first: boolean; second: boolean; third: boolean };
	bso?: { balls: number; strikes: number; outs: number };
	// Football only, from here down. e.g. "3rd & 5".
	downDistance?: string;
	// ESPN's "ABBR yardLine" label; joined onto downDistance via gameCard.downDistanceAt.
	fieldPosition?: string;
	isRedZone?: boolean;
	// Weights the red-zone scoring-opportunity boost.
	down?: number;
	distance?: number;
	isGoalToGo?: boolean;
	weather?: GameCondition;
	// ESPN signals this three different ways — see resolvePostseason in apiClient.ts.
	isPostseason?: boolean;
	delayed?: boolean;
	delayDescription?: string;
}

export interface UserPreferences {
	sensitivity: 1 | 2 | 3 | 4 | 5 | 6 | 7;
	cooldownSeconds: number;
	switchDelaySeconds: number;
	enabled: boolean;
	enabledLeagues: LeagueId[];
	// Stored as `${league}:${teamId}`, e.g. `nba:20`.
	favoriteTeamIds: string[];
	favoriteTeamBonusPoints: number;
	showUpcomingGames: boolean;
	proTipsEnabled: boolean;
	notificationsEnabled: boolean;
	standbyStreamEnabled: boolean;
	// Switch to standby once every registered game falls below this.
	standbyStreamThreshold: number;
	bettingEnabled: boolean;
	temperatureUnit: 'F' | 'C' | 'Ro';
	// Rømer is not offered by the settings list, so the toggle needs to know whether this user
	// has found it before it will cycle through a third unit.
	romerUnlocked: boolean;
	// Seasonal decoration on the game detail screen. The parent gates all three.
	holidayDecorationsEnabled: boolean;
	holidaySnowEnabled: boolean;
	holidayLightsEnabled: boolean;
	holidayLeavesEnabled: boolean;
	postseasonBoostPoints: number;
	// 1–14.
	upcomingGamesDays: number;
	// The remaining signals are renormalized to 0–100.
	disabledSignals: SignalName[];
}

export interface TabRegistration {
	tabId: number;
	gameId: string;
}

export type LeagueLogoMap = Partial<Record<LeagueId, string>>;
export type ScoreHistoryMap = Record<string, ScoreSnapshot[]>;

export interface PowerScoreSnapshot {
	gameId: string;
	timestamp: number;
	total: number;
	closeness: number;
	lateGame: number;
	momentum: number;
	leadChanges: number;
	comeback: number;
	winProbabilityVariance?: number;
	signalsSubtotal: number;
	favoriteBonus: number;
	favoriteTeamCount: number;
	gameBoost?: number;
	scoringOpportunityBoost?: number;
	postseasonBoost?: number;
	stalled: boolean;
	stallPenalty?: number;
	reason: string;
}

export type PowerScoreHistoryMap = Record<string, PowerScoreSnapshot[]>;

export interface BackgroundState {
	games: Game[];
	scores: PowerScoreResult[];
	leagueLogos: LeagueLogoMap;
	scoreHistory: ScoreHistoryMap;
	powerScoreHistory: PowerScoreHistoryMap;
	gameBoosts: Record<string, number>;
	onStandbyStream: boolean;
	standbyStreamTabId: number | null;
}

export interface ScoresUpdatedMessage {
	type: 'SCORES_UPDATED';
	scores: PowerScoreResult[];
	games: Game[];
	leagueLogos: LeagueLogoMap;
	scoreHistory: ScoreHistoryMap;
	powerScoreHistory: PowerScoreHistoryMap;
	gameBoosts: Record<string, number>;
	onStandbyStream: boolean;
	standbyStreamTabId: number | null;
}

export interface UpdatePrefsMessage {
	type: 'UPDATE_PREFS';
	prefs: UserPreferences;
}

export interface UpdateRegistryMessage {
	type: 'UPDATE_REGISTRY';
	tabRegistry: TabRegistration[];
}

export interface SetGameBoostMessage {
	type: 'SET_GAME_BOOST';
	gameId: string;
	boost: number;
}

export interface GetStateMessage {
	type: 'GET_STATE';
	forceRefresh?: boolean;
}

export interface SetDemoModeMessage {
	type: 'SET_DEMO_MODE';
	enabled: boolean;
}

export interface SetStandbyStreamTabMessage {
	type: 'SET_STANDBY_STREAM_TAB';
	tabId: number | null;
}

export interface GetDebugStateMessage {
	type: 'GET_DEBUG_STATE';
}

export interface DebugState {
	pollModes: Record<string, 'eager' | 'dormant'>;
	leagueIntervals: Record<string, number>;
	demoMode: boolean;
	lastSwitchTime: number;
	pendingSwitch: { gameId: string; tabId: number; reason?: string } | null;
	liveGameCount: number;
	upcomingGameCount: number;
	totalGameCount: number;
	tabRegistry: TabRegistration[];
	onStandbyStream: boolean;
	standbyStreamTabId: number | null;
	clockStalls: Record<string, { lastClock: number; stallCount: number }>;
	scores: PowerScoreResult[];
	gameLabels: Record<string, string>;
	enabledLeagues: string[];
	sensitivity: number;
	cooldownSeconds: number;
	switchDelaySeconds: number;
}

export type ExtensionMessage =
	| ScoresUpdatedMessage
	| UpdatePrefsMessage
	| UpdateRegistryMessage
	| SetGameBoostMessage
	| GetStateMessage
	| SetDemoModeMessage
	| SetStandbyStreamTabMessage
	| GetDebugStateMessage;
