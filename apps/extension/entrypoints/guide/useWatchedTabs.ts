import type { TabRegistration } from '@arenaswap/core/types';
import { useEffect, useState } from 'react';
import { browser, type Browser } from 'wxt/browser';
import { tabNumberLabel } from '../popup/components/tabAssignSelect';

const noneWatched: ReadonlyMap<string, string> = new Map();

// A game is being watched when its registered tab is the one showing in its window. With the Guide
// in that same window nothing is, which is true: the reader is looking at the Guide.
const readWatching = async (): Promise<ReadonlyMap<string, string>> => {
	const [stored, activeTabs] = await Promise.all([
		browser.storage.session.get({ tabRegistry: [] }),
		browser.tabs.query({ active: true }),
	]);
	const activeById = new Map(activeTabs.map((tab: Browser.tabs.Tab) => [tab.id, tab]));
	return new Map((stored.tabRegistry as TabRegistration[]).flatMap(registration => {
		const tab = activeById.get(registration.tabId);
		return tab ? [[registration.gameId, tabNumberLabel(tab)] as const] : [];
	}));
};

const refreshInto = (set: (next: ReadonlyMap<string, string>) => void) => {
	void readWatching().then(set, () => {});
};

// Game id to its tab's label. Re-read on every poll as well as on a switch, which is what catches a
// tab being dragged to a new position.
const useWatchedTabs = (poll: unknown): ReadonlyMap<string, string> => {
	const [watching, setWatching] = useState(noneWatched);

	// oxlint-disable-next-line react/exhaustive-effect-dependencies -- the poll is the trigger, not an input
	useEffect(() => refreshInto(setWatching), [poll]);

	useEffect(() => {
		const refresh = () => refreshInto(setWatching);
		const onStorage = (changes: Record<string, Browser.storage.StorageChange>, area: string) => {
			if (area === 'session' && 'tabRegistry' in changes) refresh();
		};
		browser.tabs.onActivated.addListener(refresh);
		browser.storage.onChanged.addListener(onStorage);
		return () => {
			browser.tabs.onActivated.removeListener(refresh);
			browser.storage.onChanged.removeListener(onStorage);
		};
	}, []);

	return watching;
};

export default useWatchedTabs;
