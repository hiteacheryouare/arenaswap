import { i18n } from '#i18n';
import type { Browser } from 'wxt/browser';
import type { TabRegistration } from '@arenaswap/core/types';
import { assignTabToGame } from '../../../utils/tabSuggestions';
import SelectDropdown from './selectDropdown';

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
		// The placeholder is '', which Number turns into a falsy 0 — that is the unassign path.
		onChange(tabId
			? assignTabToGame(registry, tabId, gameId)
			: registry.filter(r => r.gameId !== gameId));
	};

	const assignedTabIds = new Set(
		registry.filter(r => r.gameId !== gameId).map(r => r.tabId),
	);

	return (
		<div className='game-card-tab-assign' data-card-control='true'>
			<SelectDropdown
				value={currentTabId === undefined ? '' : String(currentTabId)}
				onChange={onSelect}
				ariaLabel={i18n.t('tabAssign.placeholder')}
				options={[
					{ value: '', label: i18n.t('tabAssign.placeholder') },
					...openTabs.filter(tab => tab.id !== undefined).map(tab => {
						const inUse = assignedTabIds.has(tab.id!);
						return { value: String(tab.id), label: `${formatTabLabel(tab)}${inUse ? i18n.t('tabAssign.inUse') : ''}`, disabled: inUse };
					}),
				]}
			/>
		</div>
	);
};

export default tabAssignSelect;
