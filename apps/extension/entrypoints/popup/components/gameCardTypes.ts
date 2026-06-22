import type { Browser } from 'wxt/browser';
import type { Game, GameBettingData, LeagueId, PowerScoreResult, TabRegistration } from '@arenaswap/core/types';

export interface BettingDisplayPrefs {
	bettingEnabled: boolean;
	showGameOdds: boolean;
	showWinProbability: boolean;
	showEspnPredictor: boolean;
	preferredOddsProvider: string;
}

export interface gameCardProps {
	game: Game | undefined;
	excitementResult: PowerScoreResult | undefined;
	favoriteTeamIds: Set<string>;
	onToggleFavoriteTeam: (leagueId: LeagueId, teamId: string) => void;
	gameBoosts: Record<string, number>;
	openTabs: Browser.tabs.Tab[];
	registry: TabRegistration[];
	onRegistryChange: (updated: TabRegistration[]) => void;
	formatTabLabel: (tab: Browser.tabs.Tab) => string;
	onOpenGameDetail: (gameId: string) => void;
	bettingPrefs: BettingDisplayPrefs;
	bettingData: Record<string, GameBettingData>;
}
