// Types that live in @arenaswap/powerscore — re-exported here so existing import paths work
import type {
	SportType,
	LeagueId,
	SportId,
	ScoreSnapshot,
	PowerScoreResult,
	SportTypeConfig,
	ScorerTunables,
	BaseballInningScoreTier,
	LeagueConfig,
} from '@arenaswap/powerscore';
export type {
	SportType,
	LeagueId,
	SportId,
	ScoreSnapshot,
	PowerScoreResult,
	SportTypeConfig,
	ScorerTunables,
	BaseballInningScoreTier,
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

export interface UserPreferences {
	sensitivity: 1 | 2 | 3 | 4 | 5 | 6 | 7;
	cooldownSeconds: number;
	switchDelaySeconds: number;
	enabled: boolean;
	enabledLeagues: LeagueId[];
	favoriteTeamIds: string[];
	favoriteTeamBonusPoints: number;
	showUpcomingGames: boolean;
}

export interface TabRegistration {
	tabId: number;
	gameId: string;
}

export type LeagueLogoMap = Partial<Record<LeagueId, string>>;

export interface BackgroundState {
	games: Game[];
	scores: PowerScoreResult[];
	leagueLogos: LeagueLogoMap;
}

export type ScoresUpdatedMessage = {
	type: 'SCORES_UPDATED';
	scores: PowerScoreResult[];
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
