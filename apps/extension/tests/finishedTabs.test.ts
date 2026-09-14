import {
	mergeFinishedTabNotice,
	normalizeFinishedTabNotice,
	resolveFinishedTabs,
	type ResolveFinishedTabsParams,
} from '../utils/finishedTabs';

// Two tabs in one window and a third alone in its own, which is the layout every closing rule
// below turns on.
const windowIdByTabId = new Map([[1, 100], [2, 100], [3, 200]]);
const tabCountByWindowId = new Map([[100, 2], [200, 1]]);

const base: ResolveFinishedTabsParams = {
	registry: [{ tabId: 1, gameId: 'g1' }, { tabId: 2, gameId: 'g2' }],
	action: 'free',
	finishedGameIds: new Set(['g1']),
	openTabIds: new Set([1, 2, 3]),
	activeTabId: null,
	windowIdByTabId,
	tabCountByWindowId,
};

describe('resolveFinishedTabs', () => {
	test('takes the registration whose game is over and leaves the rest alone', () => {
		expect(resolveFinishedTabs(base)).toEqual([{ tabId: 1, gameId: 'g1', close: false }]);
	});

	test('answers with nothing while the setting says to keep', () => {
		expect(resolveFinishedTabs({ ...base, action: 'keep', finishedGameIds: new Set(['g1', 'g2']) })).toEqual([]);
	});

	test('leaves the tab the user is looking at', () => {
		expect(resolveFinishedTabs({ ...base, activeTabId: 1 })).toEqual([]);
	});

	test('still takes the other tabs when one of them is active', () => {
		expect(resolveFinishedTabs({
			...base,
			finishedGameIds: new Set(['g1', 'g2']),
			activeTabId: 1,
		})).toEqual([{ tabId: 2, gameId: 'g2', close: false }]);
	});

	test('skips a registration whose tab has already closed', () => {
		expect(resolveFinishedTabs({ ...base, openTabIds: new Set([2, 3]) })).toEqual([]);
	});

	test('marks a tab for closing when the setting says close', () => {
		expect(resolveFinishedTabs({ ...base, action: 'close' })).toEqual([{ tabId: 1, gameId: 'g1', close: true }]);
	});

	// tabs.remove on a window's last tab takes the window with it, so the setting degrades to
	// freeing rather than shutting a window nobody asked to close.
	test('frees rather than closes the only tab in its window', () => {
		expect(resolveFinishedTabs({
			...base,
			action: 'close',
			registry: [{ tabId: 3, gameId: 'g1' }],
		})).toEqual([{ tabId: 3, gameId: 'g1', close: false }]);
	});

	test('closes a tab whose window holds another tab', () => {
		expect(resolveFinishedTabs({
			...base,
			action: 'close',
			registry: [{ tabId: 3, gameId: 'g1' }, { tabId: 1, gameId: 'g1' }],
			tabCountByWindowId: new Map([[100, 2], [200, 2]]),
		}).every(entry => entry.close)).toBe(true);
	});

	// Without the window maps there is no way to know a tab is alone, and refusing to close
	// anything would make the setting silently inert.
	test('closes when the window layout is unknown', () => {
		expect(resolveFinishedTabs({
			...base,
			action: 'close',
			windowIdByTabId: undefined,
			tabCountByWindowId: undefined,
		})).toEqual([{ tabId: 1, gameId: 'g1', close: true }]);
	});

	test('returns every finished registration at once', () => {
		expect(resolveFinishedTabs({ ...base, finishedGameIds: new Set(['g1', 'g2']) })).toHaveLength(2);
	});
});

describe('normalizeFinishedTabNotice', () => {
	test('reads a stored notice back', () => {
		expect(normalizeFinishedTabNotice({ freed: 2, closed: 1 })).toEqual({ freed: 2, closed: 1 });
	});

	test('treats an all-zero notice as no news', () => {
		expect(normalizeFinishedTabNotice({ freed: 0, closed: 0 })).toBeNull();
	});

	test.each([null, undefined, 'two', 7, []])('discards %p', value => {
		expect(normalizeFinishedTabNotice(value)).toBeNull();
	});

	test('drops a count that is not a whole positive number', () => {
		expect(normalizeFinishedTabNotice({ freed: -3, closed: 1.5 })).toBeNull();
	});
});

describe('mergeFinishedTabNotice', () => {
	// The popup is usually shut while this is happening, so a second wave of finals before it
	// opens must add to the first rather than replace it.
	test('adds to what was already waiting', () => {
		expect(mergeFinishedTabNotice({ freed: 1, closed: 0 }, 2, 1)).toEqual({ freed: 3, closed: 1 });
	});

	test('starts from nothing', () => {
		expect(mergeFinishedTabNotice(null, 0, 4)).toEqual({ freed: 0, closed: 4 });
	});

	test('stays null when there is nothing to report', () => {
		expect(mergeFinishedTabNotice(null, 0, 0)).toBeNull();
	});
});
