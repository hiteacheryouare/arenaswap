import { i18n } from '#i18n';
import type { Browser } from 'wxt/browser';
import type { TabRegistration } from '@arenaswap/core/types';

interface tabAssignSelectProps {
	gameId: string;
	openTabs: Browser.tabs.Tab[];
	registry: TabRegistration[];
	onChange: (updated: TabRegistration[]) => void;
	formatTabLabel: (tab: Browser.tabs.Tab) => string;
}

const tabAssignSelect = ({ gameId, openTabs, registry, onChange, formatTabLabel }: tabAssignSelectProps) => {
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
		<div className='game-card-tab-assign' data-card-control='true'>
			<select
				className='form-select form-select-sm'
				value={currentTabId ?? ''}
				onChange={e => onSelect(e.target.value)}
			>
				<option value=''>{i18n.t('tabAssign.placeholder')}</option>
				{openTabs.map(tab => {
					const inUse = tab.id !== undefined && assignedTabIds.has(tab.id);
					return (
						<option key={tab.id} value={tab.id} disabled={inUse}>
							{formatTabLabel(tab)}{inUse ? i18n.t('tabAssign.inUse') : ''}
						</option>
					);
				})}
			</select>
		</div>
	);
};

export default tabAssignSelect;
