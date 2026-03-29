import type { Tabs } from 'webextension-polyfill';
import type { TabRegistration } from '@arenaswap/core/types';

interface Props {
	gameId: string;
	openTabs: Tabs.Tab[];
	registry: TabRegistration[];
	onChange: (updated: TabRegistration[]) => void;
	formatTabLabel: (tab: Tabs.Tab) => string;
}

const TabAssignSelect = ({ gameId, openTabs, registry, onChange, formatTabLabel }: Props) => {
	const currentTabId = registry.find(r => r.gameId === gameId)?.tabId;

	const onSelect = (tabIdStr: string) => {
		const tabId = Number(tabIdStr);
		let updated = registry.filter(r => r.gameId !== gameId);
		if (tabId) {
			updated = updated.filter(r => r.tabId !== tabId);
			updated = [...updated, { tabId, gameId }];
		}
		onChange(updated);
	};

	const assignedTabIds = new Set(
		registry.filter(r => r.gameId !== gameId).map(r => r.tabId),
	);

	return (
		<div className='game-card__tab-assign'>
			<select
				className='form-select form-select-sm'
				value={currentTabId ?? ''}
				onChange={e => onSelect(e.target.value)}
			>
				<option value=''>— Assign a tab —</option>
				{openTabs.map(tab => {
					const inUse = tab.id !== undefined && assignedTabIds.has(tab.id);
					return (
						<option key={tab.id} value={tab.id} disabled={inUse}>
							{formatTabLabel(tab)}{inUse ? ' (in use)' : ''}
						</option>
					);
				})}
			</select>
		</div>
	);
};

export default TabAssignSelect;
