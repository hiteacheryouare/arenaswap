// Types that live in powerscore — re-exported here so existing import paths work
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

export interface Team {
	id: string;
	name: string;
	abbreviation: string;
	score: number;
	logo?: string;
	/** Primary team color as a CSS hex string (e.g. "#002B5C"), sourced from the API */
	color?: string;
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
	period: number;
	clockSeconds: number;
	status: 'pre' | 'in' | 'post';
	startTime?: string;
	broadcasts?: string[];
	odds?: GameOdds;
	/** True while the game is in halftime or between-period intermission */
	intermission?: boolean;
	/** Top of inning = true, bottom = false; undefined when unavailable (non-baseball or pre-game) */
	topOfInning?: boolean;
	/** Which bases have runners; undefined when unavailable (non-baseball or no active at-bat) */
	baseRunners?: { first: boolean; second: boolean; third: boolean };
	/** Live balls/strikes/outs count; only present for in-progress baseball/softball */
	bso?: { balls: number; strikes: number; outs: number };
	/** Down & distance string for gridiron football (e.g. "3rd & 5"); undefined for non-football */
	downDistance?: string;
	/** True when the offense is in the red zone (inside the 20); football only */
	isRedZone?: boolean;
}

export interface UserPreferences {
	sensitivity: 1 | 2 | 3 | 4 | 5 | 6 | 7;
	cooldownSeconds: number;
	switchDelaySeconds: number;
	enabled: boolean;
	enabledLeagues: LeagueId[];
	/** Stored as `${league}:${teamId}` keys (for example: `nba:20`) */
	favoriteTeamIds: string[];
	favoriteTeamBonusPoints: number;
	showUpcomingGames: boolean;
	proTipsEnabled: boolean;
	notificationsEnabled: boolean;
	standbyStreamEnabled: boolean;
	/** PowerScore threshold (0–100): switch to standby when ALL registered games fall below this */
	standbyStreamThreshold: number;
	/** Show betting odds (spread / O/U) on game cards */
	bettingEnabled: boolean;
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
	baseTotal: number;
	favoriteBonus: number;
	favoriteTeamCount: number;
	gameBoost?: number;
	scoringOpportunityBoost?: number;
	stalled: boolean;
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

export type ExtensionMessage =
	| ScoresUpdatedMessage
	| UpdatePrefsMessage
	| UpdateRegistryMessage
	| SetGameBoostMessage
	| GetStateMessage
	| SetDemoModeMessage
	| SetStandbyStreamTabMessage;
