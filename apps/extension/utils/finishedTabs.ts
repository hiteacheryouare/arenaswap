import type { FinishedTabAction, TabRegistration } from '@arenaswap/core/types';

export const finishedTabNoticeKey = 'finishedTabNotice';

export interface FinishedTabNotice {
	freed: number;
	closed: number;
}

export interface FinishedTabResolution {
	tabId: number;
	gameId: string;
	close: boolean;
}

export interface ResolveFinishedTabsParams {
	registry: readonly TabRegistration[];
	action: FinishedTabAction;
	finishedGameIds: ReadonlySet<string>;
	openTabIds: ReadonlySet<number>;
	activeTabIds: ReadonlySet<number>;
	windowIdByTabId?: ReadonlyMap<number, number>;
	tabCountByWindowId?: ReadonlyMap<number, number>;
}

export const resolveFinishedTabs = ({
	registry,
	action,
	finishedGameIds,
	openTabIds,
	activeTabIds,
	windowIdByTabId,
	tabCountByWindowId,
}: ResolveFinishedTabsParams): FinishedTabResolution[] => {
	if (action === 'keep') return [];

	const isSoleTabInWindow = (tabId: number): boolean => {
		const windowId = windowIdByTabId?.get(tabId);
		if (windowId === undefined) return false;
		return (tabCountByWindowId?.get(windowId) ?? 0) <= 1;
	};

	return registry
		.filter(entry => finishedGameIds.has(entry.gameId)
			&& openTabIds.has(entry.tabId)
			&& !activeTabIds.has(entry.tabId))
		.map(entry => ({
			tabId: entry.tabId,
			gameId: entry.gameId,
			close: action === 'close' && !isSoleTabInWindow(entry.tabId),
		}));
};

const countOf = (value: unknown): number => (
	typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : 0
);

export const normalizeFinishedTabNotice = (value: unknown): FinishedTabNotice | null => {
	if (!value || typeof value !== 'object') return null;
	const candidate = value as Partial<FinishedTabNotice>;
	const notice = { freed: countOf(candidate.freed), closed: countOf(candidate.closed) };
	return notice.freed === 0 && notice.closed === 0 ? null : notice;
};

export const mergeFinishedTabNotice = (
	current: FinishedTabNotice | null,
	freed: number,
	closed: number,
): FinishedTabNotice | null => normalizeFinishedTabNotice({
	freed: (current?.freed ?? 0) + countOf(freed),
	closed: (current?.closed ?? 0) + countOf(closed),
});
