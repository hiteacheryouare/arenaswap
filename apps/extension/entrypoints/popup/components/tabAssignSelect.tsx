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
	variant?: 'field' | 'inline';
	// A tile has half the width, so it names the tab rather than the page.
	compact?: boolean;
	// The tab ArenaSwap has the window on, which the inline picker names as the one being watched.
	watchedTabId?: number | null;
	disabled?: boolean;
}

// A tab's place in its window, which is how the list names it: "Tab 2".
export const tabNumberLabel = (tab: Browser.tabs.Tab | undefined): string => (
	tab && typeof tab.index === 'number'
		? i18n.t('board.tab', { number: tab.index + 1 })
		: i18n.t('board.tabUnknown')
);

const tabAssignSelect = ({ gameId, openTabs, registry, onChange, formatTabLabel, variant = 'field', compact = false, watchedTabId = null, disabled = false }: tabAssignSelectProps) => {
	const currentTabId = registry.find(r => r.gameId === gameId)?.tabId;
	const assignedTabIds = new Set(registry.filter(r => r.gameId !== gameId).map(r => r.tabId));

	const onSelect = (tabIdStr: string) => {
		const tabId = Number(tabIdStr);
		// The placeholder is '', which Number turns into a falsy 0 — that is the unassign path.
		onChange(tabId
			? assignTabToGame(registry, tabId, gameId)
			: registry.filter(r => r.gameId !== gameId));
	};

	const currentTab = openTabs.find(tab => tab.id === currentTabId);
	const inline = variant === 'inline';
	const tabName = currentTabId === watchedTabId
		? i18n.t('board.watching', { tab: tabNumberLabel(currentTab) })
		: tabNumberLabel(currentTab);
	// A tile's select is too narrow for a page title, so it names the tab by its place instead.
	const toggleLabel = currentTabId === undefined
		? i18n.t(inline && compact ? 'board.noTab' : 'board.assignTab')
		: inline || compact ? tabName : undefined;

	return (
		<div className={`game-card-tab-assign${inline ? ' is-inline' : ''}`} data-card-control='true'>
			<SelectDropdown
				value={currentTabId === undefined ? '' : String(currentTabId)}
				onChange={onSelect}
				ariaLabel={i18n.t('board.assignTab')}
				variant={variant}
				toggleLabel={toggleLabel}
				toggleHint={!inline && !compact && currentTabId !== undefined ? tabName : undefined}
				disabled={disabled}
				className={inline && currentTabId === undefined ? 'is-offer' : undefined}
				options={[
					{ value: '', label: i18n.t('board.noTab') },
					...openTabs.filter(tab => tab.id !== undefined).map(tab => {
						const inUse = assignedTabIds.has(tab.id!);
						return {
							value: String(tab.id),
							label: `${formatTabLabel(tab)}${inUse ? i18n.t('tabAssign.inUse') : ''}`,
							hint: tabNumberLabel(tab),
							disabled: inUse,
						};
					}),
				]}
			/>
		</div>
	);
};

export default tabAssignSelect;
