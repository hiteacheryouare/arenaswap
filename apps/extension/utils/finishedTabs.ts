import type { FinishedTabAction, TabRegistration } from '@arenaswap/core/types';

export const finishedTabNoticeKey = 'finishedTabNotice';

// Both counts, rather than one number and the action that produced it: the setting can change
// between two polls, so a session can genuinely have freed some tabs and closed others.
export interface FinishedTabNotice {
	freed: number;
	closed: number;
}

export interface FinishedTabResolution {
	tabId: number;
	gameId: string;
	// A window's last tab cannot be closed without taking the window with it, so those degrade to
	// being freed. The setting still gets honoured everywhere it can be.
	close: boolean;
}

export interface ResolveFinishedTabsParams {
	registry: readonly TabRegistration[];
	action: FinishedTabAction;
	finishedGameIds: ReadonlySet<string>;
	openTabIds: ReadonlySet<number>;
	// The tab the user is looking at is left alone until they leave it, so a postgame nobody asked
	// to be pulled out of stays on screen. It comes back round on the next poll.
	activeTabId: number | null;
	// Window id per tab, and how many tabs each window holds. Only consulted when closing.
	windowIdByTabId?: ReadonlyMap<number, number>;
	tabCountByWindowId?: ReadonlyMap<number, number>;
}

export const resolveFinishedTabs = ({
	registry,
	action,
	finishedGameIds,
	openTabIds,
	activeTabId,
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
			&& entry.tabId !== activeTabId)
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

// Accumulates rather than replaces: the popup is usually shut while this is happening, and a
// second wave of finals before it opens should not erase the first.
export const mergeFinishedTabNotice = (
	current: FinishedTabNotice | null,
	freed: number,
	closed: number,
): FinishedTabNotice | null => normalizeFinishedTabNotice({
	freed: (current?.freed ?? 0) + countOf(freed),
	closed: (current?.closed ?? 0) + countOf(closed),
});
