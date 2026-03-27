export type SportId = 'nba' | 'nhl' | 'mlb' | 'nfl' | 'ncaab' | 'ncaaf';

export interface Team {
	id: string;
	name: string;
	abbreviation: string;
	score: number;
	logo?: string;
}

export interface Game {
	id: string;
	sport: SportId;
	homeTeam: Team;
	awayTeam: Team;
	venueName?: string;
	period: number;
	clockSeconds: number;
	status: 'pre' | 'in' | 'post';
	startTime?: string;
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
}

export interface UserPreferences {
	sensitivity: 1 | 2 | 3 | 4 | 5;
	cooldownSeconds: number;
	enabled: boolean;
}

export interface TabRegistration {
	tabId: number;
	gameId: string;
}

export type ScoresUpdatedMessage = {
	type: 'SCORES_UPDATED';
	scores: ExcitementResult[];
	games: Game[];
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
