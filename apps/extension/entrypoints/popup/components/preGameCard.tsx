import type { Browser } from 'wxt/browser';
import type { TabRegistration } from '@arenaswap/core/types';
import type { GameCardDisplayProps } from '@arenaswap/ui/src/components/gameCardTypes';
import PreGameCard from '@arenaswap/ui/src/components/preGameCard';
import TabAssignSelect from './tabAssignSelect';

interface ExtPreGameCardProps extends GameCardDisplayProps {
	openTabs: Browser.tabs.Tab[];
	registry: TabRegistration[];
	onRegistryChange: (updated: TabRegistration[]) => void;
	formatTabLabel: (tab: Browser.tabs.Tab) => string;
	gameBoosts?: Record<string, number>;
}

const preGameCard = ({ openTabs, registry, onRegistryChange, formatTabLabel, game, gameBoosts: _gameBoosts, ...rest }: ExtPreGameCardProps) => (
	<PreGameCard
		{...rest}
		game={game}
		tabSlot={
			<TabAssignSelect
				gameId={game?.id ?? ''}
				openTabs={openTabs}
				registry={registry}
				onChange={onRegistryChange}
				formatTabLabel={formatTabLabel}
			/>
		}
	/>
);

export default preGameCard;
