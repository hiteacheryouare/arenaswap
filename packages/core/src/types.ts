export type SportType = 'basketball' | 'football' | 'hockey' | 'baseball' | 'soccer';
export type LeagueId = 'nba' | 'wnba' | 'nhl' | 'pwhl' | 'ncaamh' | 'mlb' | 'nfl' | 'ncaab' | 'ncaaf' | 'mls';
/** @deprecated Use LeagueId */
export type SportId = LeagueId;

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
}

export interface ScoreSnapshot {
	gameId: string;
	timestamp: number;
	homeScore: number;
	awayScore: number;
}

export interface ExcitementResult {
	gameId: string;
	total: number;
	closeness: number;
	lateGame: number;
	momentum: number;
	reason: string;
	stalled?: boolean;
}

export interface UserPreferences {
	sensitivity: 1 | 2 | 3 | 4 | 5 | 6 | 7;
	cooldownSeconds: number;
	enabled: boolean;
	enabledLeagues: LeagueId[];
	showUpcomingGames: boolean;
}

export interface TabRegistration {
	tabId: number;
	gameId: string;
}

export type LeagueLogoMap = Partial<Record<LeagueId, string>>;

export interface BackgroundState {
	games: Game[];
	scores: ExcitementResult[];
	leagueLogos: LeagueLogoMap;
}

export type ScoresUpdatedMessage = {
	type: 'SCORES_UPDATED';
	scores: ExcitementResult[];
	games: Game[];
	leagueLogos: LeagueLogoMap;
};

export type UpdatePrefsMessage = {
	type: 'UPDATE_PREFS';
	prefs: UserPreferences;
};

export type UpdateRegistryMessage = {
	type: 'UPDATE_REGISTRY';
	tabRegistry: TabRegistration[];
};

export type ExtensionMessage = ScoresUpdatedMessage | UpdatePrefsMessage | UpdateRegistryMessage;
