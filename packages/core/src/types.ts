export interface Team {
	id: string;
	name: string;
	abbreviation: string;
	score: number;
}

export interface Game {
	id: string;
	homeTeam: Team;
	awayTeam: Team;
	period: number;        // 1 = 1st half, 2 = 2nd half, 3+ = OT
	clockSeconds: number;  // seconds remaining in current period
	status: 'pre' | 'in' | 'post';
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
	preference: number;
	reason: string;  // human-readable, used verbatim in notifications
}

export interface UserPreferences {
	sensitivity: 1 | 2 | 3 | 4 | 5;
	favoriteTeamIds: string[];
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
