import type { Browser } from 'wxt/browser';
import type { TabRegistration } from '@arenaswap/core/types';
import type { GameCardDisplayProps } from '@arenaswap/ui/src/components/gameCardTypes';
import LiveGameCard from '@arenaswap/ui/src/components/liveGameCard';
import TabAssignSelect from './tabAssignSelect';

interface ExtLiveGameCardProps extends GameCardDisplayProps {
	openTabs: Browser.tabs.Tab[];
	registry: TabRegistration[];
	onRegistryChange: (updated: TabRegistration[]) => void;
	formatTabLabel: (tab: Browser.tabs.Tab) => string;
	gameBoosts?: Record<string, number>;
}

const liveGameCard = ({ openTabs, registry, onRegistryChange, formatTabLabel, game, gameBoosts: _gameBoosts, ...rest }: ExtLiveGameCardProps) => (
	<LiveGameCard
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

export default liveGameCard;
