import type { Browser } from 'wxt/browser';
import type { Game, PowerScoreResult, TabRegistration } from '@arenaswap/core/types';

export interface gameCardProps {
	game: Game | undefined;
	excitementResult: PowerScoreResult | undefined;
	favoriteTeamIds: Set<string>;
	onToggleFavoriteTeam: (teamId: string) => void;
	openTabs: Browser.tabs.Tab[];
	registry: TabRegistration[];
	onRegistryChange: (updated: TabRegistration[]) => void;
	formatTabLabel: (tab: Browser.tabs.Tab) => string;
}
