import type { Browser } from 'wxt/browser';
import type { TabRegistration } from '@arenaswap/core/types';
export type { BettingDisplayPrefs, WeatherDisplayPrefs, GameCardDisplayProps } from '@arenaswap/ui/src/components/gameCardTypes';
import type { GameCardDisplayProps } from '@arenaswap/ui/src/components/gameCardTypes';

export interface gameCardProps extends GameCardDisplayProps {
	openTabs: Browser.tabs.Tab[];
	registry: TabRegistration[];
	onRegistryChange: (updated: TabRegistration[]) => void;
	formatTabLabel: (tab: Browser.tabs.Tab) => string;
	gameBoosts: Record<string, number>;
}
