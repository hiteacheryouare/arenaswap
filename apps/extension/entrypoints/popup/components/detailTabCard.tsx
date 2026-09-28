import { i18n } from '#i18n';
import type { Browser } from 'wxt/browser';
import type { TabRegistration } from '@arenaswap/core/types';
import TabAssignSelect from './tabAssignSelect';

interface detailTabCardProps {
	gameId: string;
	hasTab: boolean;
	openTabs: Browser.tabs.Tab[];
	registry: TabRegistration[];
	onRegistryChange: (updated: TabRegistration[]) => void;
	formatTabLabel: (tab: Browser.tabs.Tab) => string;
}

// The popup can't bring a tab forward on its own, so a live game gets the picker rather than a
// "watch this" button: give it a tab, or move it to another one.
const detailTabCard = ({ gameId, hasTab, openTabs, registry, onRegistryChange, formatTabLabel }: detailTabCardProps) => (
	<section className='card dt-card dt-assign' aria-labelledby='dt-assign-title'>
		<h3 className='dt-card-title' id='dt-assign-title'>{i18n.t('board.assignTab')}</h3>
		<TabAssignSelect
			gameId={gameId}
			openTabs={openTabs}
			registry={registry}
			onChange={onRegistryChange}
			formatTabLabel={formatTabLabel}
		/>
		{!hasTab && <p className='dt-row-help'>{i18n.t('detail.liveTabExplainer')}</p>}
	</section>
);

export default detailTabCard;
