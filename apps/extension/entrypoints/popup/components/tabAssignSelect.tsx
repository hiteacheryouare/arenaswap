import { i18n } from '#i18n';
import type { Browser } from 'wxt/browser';
import type { TabRegistration } from '@arenaswap/core/types';
import { assignTabToGame } from '../../../utils/tabSuggestions';
import SelectDropdown from './selectDropdown';
import TabFavicon from '@arenaswap/ui/src/components/tabFavicon';

interface tabAssignSelectProps {
	gameId: string;
	openTabs: Browser.tabs.Tab[];
	registry: TabRegistration[];
	onChange: (updated: TabRegistration[]) => void;
	formatTabLabel: (tab: Browser.tabs.Tab) => string;
	standbyStreamTabId?: number | null;
}

const unassignedValue = '';

const tabAssignSelect = ({ gameId, openTabs, registry, onChange, formatTabLabel, standbyStreamTabId = null }: tabAssignSelectProps) => {
	const currentTabId = registry.find(r => r.gameId === gameId)?.tabId;

	const onSelect = (tabIdStr: string) => {
		onChange(tabIdStr === unassignedValue
			? registry.filter(r => r.gameId !== gameId)
			: assignTabToGame(registry, Number(tabIdStr), gameId));
	};

	const assignedTabIds = new Set(
		registry.filter(r => r.gameId !== gameId).map(r => r.tabId),
	);

	return (
		<div className='game-card-tab-assign' data-card-control='true'>
			<SelectDropdown
				value={currentTabId === undefined ? unassignedValue : String(currentTabId)}
				onChange={onSelect}
				ariaLabel={i18n.t('tabAssign.placeholder')}
				options={[
					{ value: unassignedValue, label: i18n.t('tabAssign.placeholder') },
					...openTabs.filter(tab => tab.id !== undefined).map(tab => {
						const inUse = assignedTabIds.has(tab.id!);
						const isStandby = tab.id === standbyStreamTabId;
						const hint = inUse ? i18n.t('tabAssign.inUse') : isStandby ? i18n.t('tabAssign.standby') : undefined;
						return {
							value: String(tab.id),
							label: formatTabLabel(tab),
							hint: hint?.trim(),
							image: <TabFavicon url={tab.favIconUrl} />,
							disabled: inUse || isStandby,
						};
					}),
				]}
			/>
		</div>
	);
};

export default tabAssignSelect;
