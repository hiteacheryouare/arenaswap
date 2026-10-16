// `localStorage` rather than `storage.local`, like the open reveal's day stamp: a section reads it as
// it mounts, and an async read would paint it open and then snap it shut.
export const breakdownFoldsKey = 'arenaswap.breakdownCollapsed';

export type breakdownSectionId = 'signals' | 'general' | 'sport';

const readFolds = (): string[] => {
	try {
		const stored: unknown = JSON.parse(globalThis.localStorage?.getItem(breakdownFoldsKey) ?? '[]');
		return Array.isArray(stored) ? stored : [];
	} catch {
		return [];
	}
};

export const isSectionCollapsed = (id: breakdownSectionId): boolean => readFolds().includes(id);

export const rememberSectionCollapsed = (id: breakdownSectionId, collapsed: boolean) => {
	const others = readFolds().filter(other => other !== id);
	globalThis.localStorage?.setItem(breakdownFoldsKey, JSON.stringify(collapsed ? [...others, id] : others));
};
