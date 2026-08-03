import { createDefaultUserPreferences, normalizeUserPreferences, pollIntervalMs } from '@arenaswap/core/constants';
import type { Game, LeagueId, TabRegistration, UserPreferences } from '@arenaswap/core/types';
import { prefsStorageUpdatedAtKey } from '../utils/prefsStorage';

jest.mock('@porkyproductions/hat', () => ({
	// Return the maximum of the range so timer delays are deterministic:
	// randomInRange(0, 15000) → 15000, randomInRange(-2000, 2000) → 2000
	randomInRange: jest.fn().mockImplementation((_min: number, max: number) => max),
}));

jest.mock('@arenaswap/core', () => ({
	...jest.requireActual('@arenaswap/core'),
	fetchGamesWithLeagueLogos: jest.fn(),
	// Volatility rides on a separate summary endpoint; these tests cover the scoreboard path,
	// so it resolves empty rather than reaching for the network.
	fetchWinProbability: jest.fn().mockResolvedValue([]),
}));

const flushPromises = () => new Promise<void>(r => setImmediate(r));

// Drain all pending microtasks — multiple rounds because each resolved promise can
// schedule new microtasks (async/await chains create multiple ticks).
const drain = async (rounds = 8) => {
	for (let i = 0; i < rounds; i++) await flushPromises();
};

let fetchMock: jest.Mock;
let storageSyncGet: jest.Mock;
let storageSyncSet: jest.Mock;
let storageLocalGet: jest.Mock;
let storageLocalSet: jest.Mock;
let tabsQuery: jest.Mock;
let tabsUpdate: jest.Mock;
let storageSessionSet: jest.Mock;
let onMessageHandler!: (msg: unknown) => unknown;
let onActivatedHandler: ((info: { tabId: number }) => unknown) | undefined;
let onRemovedHandler: ((tabId: number) => unknown) | undefined;

/** Resolves `tabs.query`: `{ active: true }` → the active tab, `{}` → every open tab. */
const mockOpenTabIds = (openTabIds: number[], activeTabId: number) => {
	tabsQuery.mockImplementation((q: unknown) => {
		if ((q as { active?: boolean }).active) return Promise.resolve([{ id: activeTabId }]);
		return Promise.resolve(openTabIds.map(id => ({ id })));
	});
};

const closeTab = async (tabId: number) => {
	onRemovedHandler?.(tabId);
	await drain();
};

const activateTab = async (tabId: number) => {
	onActivatedHandler?.({ tabId });
	await drain();
};

const sendMessage = async (msg: unknown): Promise<unknown> => {
	const result = onMessageHandler(msg);
	await drain();
	return result;
};

interface LoadOptions {
	prefs?: Partial<UserPreferences>;
	tabRegistry?: TabRegistration[];
	standbyStreamTabId?: number | null;
	fetchReturnValue?: { games: unknown[]; leagueLogos: Record<string, unknown> };
	initialSystemTime?: number;
	/** Open tab ids visible to `tabs.query` from the moment the worker starts. */
	openTabIds?: number[];
	activeTabId?: number;
}

const loadBackground = async (options: LoadOptions = {}) => {
	jest.resetModules();
	// Keep setImmediate real so flushPromises() (which uses setImmediate) can drain microtasks
	// while still faking setTimeout/setInterval for timer control in tests.
	jest.useFakeTimers({ doNotFake: ['setImmediate'] });
	if (options.initialSystemTime !== undefined) jest.setSystemTime(options.initialSystemTime);

	const prefs = normalizeUserPreferences({
		...createDefaultUserPreferences(),
		...options.prefs,
	});

	storageSyncGet = jest.fn().mockResolvedValue({ prefs });
	storageSyncSet = jest.fn().mockResolvedValue(undefined);
	storageLocalGet = jest.fn().mockResolvedValue({ demoMode: false, reviewPromptState: null });
	storageLocalSet = jest.fn().mockResolvedValue(undefined);
	tabsQuery = jest.fn().mockResolvedValue([]);
	tabsUpdate = jest.fn().mockResolvedValue(undefined);
	storageSessionSet = jest.fn().mockResolvedValue(undefined);
	onActivatedHandler = undefined;
	onRemovedHandler = undefined;
	if (options.openTabIds) mockOpenTabIds(options.openTabIds, options.activeTabId ?? options.openTabIds[0]!);

	(globalThis as { defineBackground?: unknown }).defineBackground = (fn: () => void) => fn();
	(globalThis as { browser?: unknown }).browser = {
		storage: {
			sync: { get: storageSyncGet, set: storageSyncSet },
			session: {
				get: jest.fn().mockResolvedValue({
					tabRegistry: options.tabRegistry ?? [],
					standbyStreamTabId: options.standbyStreamTabId ?? null,
					scoreHistory: {},
					powerScoreHistory: {},
					gameBoosts: {},
				}),
				set: storageSessionSet,
			},
			local: {
				get: storageLocalGet,
				set: storageLocalSet,
			},
		},
		runtime: {
			sendMessage: jest.fn().mockResolvedValue(undefined),
			onMessage: {
				addListener: (h: (msg: unknown) => unknown) => { onMessageHandler = h; },
			},
		},
		tabs: {
			query: tabsQuery,
			update: tabsUpdate,
			onActivated: {
				addListener: (h: (info: { tabId: number }) => unknown) => { onActivatedHandler = h; },
			},
			onRemoved: {
				addListener: (h: (tabId: number) => unknown) => { onRemovedHandler = h; },
			},
		},
		notifications: { create: jest.fn().mockResolvedValue(undefined) },
	};

	fetchMock = (require('@arenaswap/core') as { fetchGamesWithLeagueLogos: jest.Mock }).fetchGamesWithLeagueLogos;
	fetchMock.mockResolvedValue(options.fetchReturnValue ?? { games: [], leagueLogos: {} });

	require('../entrypoints/background');

	// Let stateReady → refreshUpcomingGames → tick → startLeaguePolling finish
	await drain();

	fetchMock.mockClear();
	tabsUpdate.mockClear();
};

afterEach(() => {
	jest.useRealTimers();
});

// ─── Postseason boost ─────────────────────────────────────────────────────────

describe('postseason boost', () => {
	const postseasonGame: Game = {
		id: 'ps-game',
		league: 'nba' as LeagueId,
		sportType: 'basketball',
		status: 'in',
		homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 50 },
		awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 48 },
		period: 4,
		clockSeconds: 120,
		isPostseason: true,
	};

	const regularGame: Game = {
		...postseasonGame,
		id: 'reg-game',
		isPostseason: false,
	};

	test('adds postseasonBoostPoints to score total for a postseason game', async () => {
		const postseasonBoostPoints = 8;
		await loadBackground({
			prefs: { enabledLeagues: ['nba' as LeagueId], postseasonBoostPoints },
			fetchReturnValue: { games: [postseasonGame], leagueLogos: {} },
		});

		jest.advanceTimersByTime(pollIntervalMs + 2000);
		await drain(12);

		const state = await sendMessage({ type: 'GET_STATE' }) as { scores: { gameId: string; total: number; postseasonBoost: number }[] };
		const score = state.scores.find(s => s.gameId === 'ps-game');
		expect(score).toBeDefined();
		expect(score?.postseasonBoost).toBe(postseasonBoostPoints);
	});

	test('does not apply postseason boost to a regular season game', async () => {
		await loadBackground({
			prefs: { enabledLeagues: ['nba' as LeagueId], postseasonBoostPoints: 10 },
			fetchReturnValue: { games: [regularGame], leagueLogos: {} },
		});

		jest.advanceTimersByTime(pollIntervalMs + 2000);
		await drain(12);

		const state = await sendMessage({ type: 'GET_STATE' }) as { scores: { gameId: string; postseasonBoost: number }[] };
		const score = state.scores.find(s => s.gameId === 'reg-game');
		expect(score?.postseasonBoost).toBe(0);
	});

	test('postseason boost of 0 adds nothing to the total', async () => {
		await loadBackground({
			prefs: { enabledLeagues: ['nba' as LeagueId], postseasonBoostPoints: 0 },
			fetchReturnValue: { games: [postseasonGame], leagueLogos: {} },
		});

		jest.advanceTimersByTime(pollIntervalMs + 2000);
		await drain(12);

		const state = await sendMessage({ type: 'GET_STATE' }) as { scores: { gameId: string; postseasonBoost: number }[] };
		const score = state.scores.find(s => s.gameId === 'ps-game');
		expect(score?.postseasonBoost).toBe(0);
	});
});

// ─── Bug #3 ───────────────────────────────────────────────────────────────────
// tickLeague rescheduled itself unconditionally. If stopLeaguePolling() ran
// while a fetch was in flight, the disabled league's timer was re-added after
// the clear — creating a perpetual polling loop for a league the user turned off.

describe('tickLeague rescheduling', () => {
	test('does not reschedule a league that was disabled while its fetch was in flight', async () => {
		await loadBackground({ prefs: { enabledLeagues: ['nba' as LeagueId] } });

		// Defer the next fetch so we can disable the league before it resolves
		let resolveDeferred!: (v: { games: never[]; leagueLogos: Record<string, never> }) => void;
		fetchMock.mockImplementationOnce(
			() => new Promise(resolve => { resolveDeferred = resolve; })
		);

		// Fire the scheduleLeagueTick timer set during startLeaguePolling
		jest.advanceTimersByTime(pollIntervalMs + 2000);
		await drain();
		// tickLeague('nba') is now suspended, awaiting the deferred fetch

		// Disable 'nba' — this calls startLeaguePolling → stopLeaguePolling, clearing all timers
		await sendMessage({
			type: 'UPDATE_PREFS',
			prefs: normalizeUserPreferences({ ...createDefaultUserPreferences(), enabledLeagues: [] }),
		});

		fetchMock.mockClear();
		fetchMock.mockResolvedValue({ games: [], leagueLogos: {} });

		// Resolve the in-flight fetch — tickLeague resumes and should skip rescheduling
		resolveDeferred({ games: [], leagueLogos: {} });
		await drain();

		// Advance well past the next poll interval — if nba was rescheduled, fetchMock fires again
		jest.advanceTimersByTime(pollIntervalMs * 2 + 5000);
		await drain();

		const nbaCalls = fetchMock.mock.calls.filter(
			(args: unknown[]) => Array.isArray(args[0]) && (args[0] as string[]).includes('nba')
		);
		expect(nbaCalls).toHaveLength(0);
	});
});

// ─── Bug #4 ───────────────────────────────────────────────────────────────────
// The popup writes prefs to storage.sync then sends UPDATE_PREFS. If the popup
// context is destroyed between those two steps, the background keeps stale
// in-memory prefs. A forceRefresh GET_STATE now re-reads from storage.sync so
// the next popup open always picks up whatever was actually persisted.

describe('GET_STATE with forceRefresh', () => {
	test('re-reads prefs from storage.sync to recover from a popup that closed before UPDATE_PREFS arrived', async () => {
		await loadBackground({ prefs: { enabledLeagues: ['nba' as LeagueId] } });

		storageSyncGet.mockClear();
		storageSyncGet.mockResolvedValue({
			prefs: normalizeUserPreferences({ ...createDefaultUserPreferences(), cooldownSeconds: 999 }),
			[prefsStorageUpdatedAtKey]: 1,
		});

		await sendMessage({ type: 'GET_STATE', forceRefresh: true });

		expect(storageSyncGet).toHaveBeenCalledWith({ prefs: null, [prefsStorageUpdatedAtKey]: 0 });
	});

});

// ─── Bug #5 ───────────────────────────────────────────────────────────────────
// lastSwitchTime was never reset when the extension was disabled. If the
// extension was disabled shortly after a switch and then re-enabled, the
// cooldown would block the first switch attempt even though the user had
// effectively "started fresh".

describe('lastSwitchTime reset on disable', () => {
	const liveGame: Game = {
		id: 'g1',
		league: 'nba' as LeagueId,
		sportType: 'basketball',
		status: 'in',
		homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 5 },
		awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 4 },
		period: 4,
		clockSeconds: 60,
	};

	// Sensitivity 7 → threshold = 1 with >=: gap >= 1 required, notWatchingAGame bypasses for score-0 edge case
	const switchPrefs: Partial<UserPreferences> = {
		enabled: true,
		enabledLeagues: ['nba' as LeagueId],
		cooldownSeconds: 60,
		sensitivity: 7,
		switchDelaySeconds: 0,
		notificationsEnabled: false,
	};

	test('resets lastSwitchTime to 0 on disable so the cooldown does not suppress the first switch after re-enabling', async () => {
		// T0 is well above any cooldown so the initial check (Date.now() - 0 > cooldown) always passes
		await loadBackground({
			prefs: switchPrefs,
			tabRegistry: [{ gameId: 'g1', tabId: 2 }],
			fetchReturnValue: { games: [liveGame], leagueLogos: {} },
			initialSystemTime: 1_000_000,
		});

		// Return the right tabs: tab 1 is active (not the game tab), tab 2 is the game tab
		tabsQuery.mockImplementation((q: unknown) => {
			if ((q as { active?: boolean }).active) return Promise.resolve([{ id: 1 }]);
			return Promise.resolve([{ id: 1 }, { id: 2 }]);
		});

		// ── Tick 1: initial switch (cooldown OK: lastSwitchTime = 0) ──────────────
		jest.advanceTimersByTime(pollIntervalMs + 2000);
		await drain(12);
		// Switch should have fired; lastSwitchTime is now T0 = 1_000_000
		expect(tabsUpdate).toHaveBeenCalledWith(2, { active: true });
		expect(storageLocalSet).toHaveBeenCalledWith({
			reviewPromptState: {
				successfulSwitchCount: 1,
				firstSuccessfulSwitchAt: expect.any(Number),
				dismissedAt: null,
				reviewedAt: null,
			},
		});

		tabsUpdate.mockClear();

		// ── Tick 2: cooldown is active — 5s after T0, well within 60s ─────────────
		jest.setSystemTime(1_005_000);
		jest.advanceTimersByTime(pollIntervalMs + 2000);
		await drain(12);
		// Cooldown should block the switch
		expect(tabsUpdate).not.toHaveBeenCalledWith(2, { active: true });

		tabsUpdate.mockClear();

		// ── Disable → re-enable: fix resets lastSwitchTime to 0 ──────────────────
		const makePrefs = (enabled: boolean) => normalizeUserPreferences({ ...createDefaultUserPreferences(), ...switchPrefs, enabled });
		await sendMessage({ type: 'UPDATE_PREFS', prefs: makePrefs(false) });
		await sendMessage({ type: 'UPDATE_PREFS', prefs: makePrefs(true) });

		// ── Tick 3: 10s after T0 — still within cooldown if lastSwitchTime was NOT reset ──
		jest.setSystemTime(1_010_000);
		jest.advanceTimersByTime(pollIntervalMs + 2000);
		await drain(12);

		// With the fix: lastSwitchTime = 0, so cooldown = 1_010_000 - 0 >> 60_000 → switch fires
		// Without the fix: lastSwitchTime = 1_000_000, cooldown = 10_000 < 60_000 → blocked
		expect(tabsUpdate).toHaveBeenCalledWith(2, { active: true });
	});
});

// ─── Issue #72 ────────────────────────────────────────────────────────────────
// The standby stream tab is tracked outside the game registry, so mute syncing
// skipped it entirely: it kept playing audio over whichever game tab the user was
// actually watching, and was never unmuted when standby took over.

describe('standby stream tab mute state', () => {
	const standbyTabId = 5;
	const gameTabs: TabRegistration[] = [{ gameId: 'g1', tabId: 2 }, { gameId: 'g2', tabId: 3 }];

	const standbyPrefs: Partial<UserPreferences> = {
		enabled: true,
		enabledLeagues: ['nba' as LeagueId],
		standbyStreamEnabled: true,
		notificationsEnabled: false,
	};

	// Tab 1 is an unmanaged tab, tabs 2/3 are game tabs, tab 5 is the standby stream.
	const mockOpenTabs = (activeTabId: number) => {
		tabsQuery.mockImplementation((q: unknown) => {
			if ((q as { active?: boolean }).active) return Promise.resolve([{ id: activeTabId }]);
			return Promise.resolve([{ id: 1 }, { id: 2 }, { id: 3 }, { id: standbyTabId }]);
		});
	};

	// UPDATE_REGISTRY re-syncs mute state without going through the switching logic
	const triggerSync = () => sendMessage({ type: 'UPDATE_REGISTRY', tabRegistry: gameTabs });

	test('mutes the standby stream tab while a game tab is being watched', async () => {
		await loadBackground({
			prefs: standbyPrefs,
			tabRegistry: gameTabs,
			standbyStreamTabId: standbyTabId,
		});
		mockOpenTabs(2);

		await triggerSync();

		expect(tabsUpdate).toHaveBeenCalledWith(2, { muted: false });
		expect(tabsUpdate).toHaveBeenCalledWith(3, { muted: true });
		expect(tabsUpdate).toHaveBeenCalledWith(standbyTabId, { muted: true });
	});

	test('unmutes the standby stream tab and mutes every game tab while parked on standby', async () => {
		await loadBackground({
			prefs: standbyPrefs,
			tabRegistry: gameTabs,
			standbyStreamTabId: standbyTabId,
		});
		mockOpenTabs(standbyTabId);

		await triggerSync();

		expect(tabsUpdate).toHaveBeenCalledWith(standbyTabId, { muted: false });
		expect(tabsUpdate).toHaveBeenCalledWith(2, { muted: true });
		expect(tabsUpdate).toHaveBeenCalledWith(3, { muted: true });
	});

	test('leaves the standby tab alone when Standby Stream is switched off', async () => {
		await loadBackground({
			prefs: { ...standbyPrefs, standbyStreamEnabled: false },
			tabRegistry: gameTabs,
			standbyStreamTabId: standbyTabId,
		});
		mockOpenTabs(2);

		await triggerSync();

		expect(tabsUpdate).not.toHaveBeenCalledWith(standbyTabId, expect.anything());
	});

	test('never mutes a tab it does not manage', async () => {
		await loadBackground({
			prefs: standbyPrefs,
			tabRegistry: gameTabs,
			standbyStreamTabId: standbyTabId,
		});
		mockOpenTabs(2);

		await triggerSync();

		expect(tabsUpdate).not.toHaveBeenCalledWith(1, expect.anything());
	});

	test('mutes a newly designated standby tab immediately instead of waiting for the next poll', async () => {
		await loadBackground({ prefs: standbyPrefs, tabRegistry: gameTabs });
		mockOpenTabs(2);

		await sendMessage({ type: 'SET_STANDBY_STREAM_TAB', tabId: standbyTabId });

		expect(tabsUpdate).toHaveBeenCalledWith(standbyTabId, { muted: true });
	});

	test('hands the standby tab back unmuted when Standby Stream is turned off', async () => {
		await loadBackground({
			prefs: standbyPrefs,
			tabRegistry: gameTabs,
			standbyStreamTabId: standbyTabId,
		});
		mockOpenTabs(2);

		await triggerSync();
		expect(tabsUpdate).toHaveBeenCalledWith(standbyTabId, { muted: true });

		tabsUpdate.mockClear();

		// Turning the feature off drops the standby tab out of the managed set — it must not
		// be left silently muted with nothing in the UI explaining why.
		await sendMessage({
			type: 'UPDATE_PREFS',
			prefs: normalizeUserPreferences({
				...createDefaultUserPreferences(),
				...standbyPrefs,
				standbyStreamEnabled: false,
			}),
		});

		expect(tabsUpdate).toHaveBeenCalledWith(standbyTabId, { muted: false });
	});

	test('unmutes every managed tab, standby included, when the extension is disabled', async () => {
		await loadBackground({
			prefs: standbyPrefs,
			tabRegistry: gameTabs,
			standbyStreamTabId: standbyTabId,
		});
		mockOpenTabs(2);

		await triggerSync();
		tabsUpdate.mockClear();

		await sendMessage({
			type: 'UPDATE_PREFS',
			prefs: normalizeUserPreferences({
				...createDefaultUserPreferences(),
				...standbyPrefs,
				enabled: false,
			}),
		});

		expect(tabsUpdate).toHaveBeenCalledWith(standbyTabId, { muted: false });
		expect(tabsUpdate).toHaveBeenCalledWith(2, { muted: false });
		expect(tabsUpdate).toHaveBeenCalledWith(3, { muted: false });
	});
});

// ─── Closed tabs ──────────────────────────────────────────────────────────────
// Nothing pruned the registry when a tab closed, so a closed tab kept winning the
// switch selection whenever its game held the top PowerScore — and every switch then
// no-opped against a tab that wasn't there, killing auto-switching outright.

const mkGame = (id: string, home: number, away: number, period: number, clockSeconds: number): Game => ({
	id,
	league: 'nba' as LeagueId,
	sportType: 'basketball',
	status: 'in',
	homeTeam: { id: `${id}-h`, name: 'Home', abbreviation: 'HOM', score: home },
	awayTeam: { id: `${id}-a`, name: 'Away', abbreviation: 'AWY', score: away },
	period,
	clockSeconds,
});

// Measured PowerScores with no history: thriller 78, closeGame 69, blowout 10.
const thriller = mkGame('thriller', 100, 100, 4, 20);
const closeGame = mkGame('close', 100, 97, 4, 20);
const blowout = mkGame('thriller', 120, 90, 4, 300);

const switchingPrefs: Partial<UserPreferences> = {
	enabled: true,
	enabledLeagues: ['nba' as LeagueId],
	notificationsEnabled: false,
};

/** Advances past the initial staggered league tick so one poll lands. */
const runFirstPoll = async () => {
	jest.advanceTimersByTime(pollIntervalMs + 2000);
	await drain(16);
};

const getDebugState = async () => await sendMessage({ type: 'GET_DEBUG_STATE' }) as {
	lastSwitchTime: number;
	tabRegistry: TabRegistration[];
	standbyStreamTabId: number | null;
	pendingSwitch: { gameId: string; tabId: number } | null;
};

describe('closed tab handling', () => {
	// thriller is the higher-scoring game, so it wins the selection; when its tab is gone the
	// runner-up has to get the switch instead of the whole thing stalling.
	const registry: TabRegistration[] = [{ gameId: 'thriller', tabId: 2 }, { gameId: 'close', tabId: 3 }];

	test('switches to the runner-up when the top game tab closed while the worker was asleep', async () => {
		// Tab 2 is absent from the very first query: MV3 tore the worker down, the tab closed with
		// no onRemoved listener alive, and session storage handed the stale registration back.
		await loadBackground({
			prefs: switchingPrefs,
			tabRegistry: registry,
			fetchReturnValue: { games: [thriller, closeGame], leagueLogos: {} },
			openTabIds: [1, 3],
			activeTabId: 1,
			initialSystemTime: 1_000_000,
		});

		expect((await getDebugState()).tabRegistry).toEqual([{ gameId: 'close', tabId: 3 }]);

		await runFirstPoll();

		expect(tabsUpdate).toHaveBeenCalledWith(3, { active: true });
		expect(tabsUpdate).not.toHaveBeenCalledWith(2, { active: true });
	});

	test('drops a registration as soon as its tab closes', async () => {
		await loadBackground({
			prefs: switchingPrefs,
			tabRegistry: registry,
			fetchReturnValue: { games: [thriller, closeGame], leagueLogos: {} },
			openTabIds: [1, 2, 3],
			activeTabId: 1,
			initialSystemTime: 1_000_000,
		});

		mockOpenTabIds([1, 3], 1);
		await closeTab(2);

		expect((await getDebugState()).tabRegistry).toEqual([{ gameId: 'close', tabId: 3 }]);
		expect(storageSessionSet).toHaveBeenCalledWith(
			expect.objectContaining({ tabRegistry: [{ gameId: 'close', tabId: 3 }] }),
		);

		await runFirstPoll();

		expect(tabsUpdate).toHaveBeenCalledWith(3, { active: true });
		expect(tabsUpdate).not.toHaveBeenCalledWith(2, { active: true });
	});

	test('ignores a registration whose tab vanished without an onRemoved event', async () => {
		await loadBackground({
			prefs: switchingPrefs,
			tabRegistry: registry,
			fetchReturnValue: { games: [thriller, closeGame], leagueLogos: {} },
			openTabIds: [1, 2, 3],
			activeTabId: 1,
			initialSystemTime: 1_000_000,
		});

		// The tab is gone but no event fired, so only the per-poll existence filter can catch it.
		mockOpenTabIds([1, 3], 1);
		await runFirstPoll();

		expect(tabsUpdate).toHaveBeenCalledWith(3, { active: true });
		expect(tabsUpdate).not.toHaveBeenCalledWith(2, { active: true });
	});

	test('forgets the standby stream tab when it closes', async () => {
		await loadBackground({
			prefs: { ...switchingPrefs, standbyStreamEnabled: true },
			tabRegistry: [{ gameId: 'thriller', tabId: 2 }],
			standbyStreamTabId: 5,
			fetchReturnValue: { games: [blowout], leagueLogos: {} },
			openTabIds: [1, 2, 5],
			activeTabId: 1,
			initialSystemTime: 1_000_000,
		});

		mockOpenTabIds([1, 2], 1);
		await closeTab(5);

		expect((await getDebugState()).standbyStreamTabId).toBeNull();

		// blowout scores 10, under the default standby threshold of 20 — with a stale standby tab
		// id this poll would try to park on the closed tab and return before considering any game.
		await runFirstPoll();

		expect(tabsUpdate).not.toHaveBeenCalledWith(5, { active: true });
		expect(tabsUpdate).toHaveBeenCalledWith(2, { active: true });
	});

	test('does not wipe the registry when tabs.query cannot see any tabs', async () => {
		// An empty query result means we cannot read the tab strip, not that every tab closed.
		await loadBackground({
			prefs: switchingPrefs,
			tabRegistry: registry,
			fetchReturnValue: { games: [thriller, closeGame], leagueLogos: {} },
			initialSystemTime: 1_000_000,
		});

		expect((await getDebugState()).tabRegistry).toEqual(registry);
	});
});

// ─── Delayed switches ─────────────────────────────────────────────────────────
// A queued switch replayed the target it was created with, so after the delay it
// switched to a game that had since gone quiet — or ended.

describe('pending switch re-validation', () => {
	test('re-targets when the queued game ends during the delay', async () => {
		await loadBackground({
			prefs: { ...switchingPrefs, switchDelaySeconds: 60 },
			tabRegistry: [{ gameId: 'thriller', tabId: 2 }, { gameId: 'close', tabId: 3 }],
			fetchReturnValue: { games: [thriller, closeGame], leagueLogos: {} },
			openTabIds: [1, 2, 3],
			activeTabId: 1,
			initialSystemTime: 1_000_000,
		});

		await runFirstPoll();

		// thriller (78) beats close (69), so it is the queued target.
		expect((await getDebugState()).pendingSwitch).toEqual(
			expect.objectContaining({ gameId: 'thriller', tabId: 2 }),
		);
		expect(tabsUpdate).not.toHaveBeenCalledWith(2, { active: true });

		// Buzzer sounds on the queued game while the delay is still running.
		fetchMock.mockResolvedValue({
			games: [{ ...thriller, status: 'post' }, closeGame],
			leagueLogos: {},
		});
		jest.advanceTimersByTime(30_000);
		await drain(16);

		// Delay elapses: the switch must land on the game that is still being played.
		jest.advanceTimersByTime(40_000);
		await drain(16);

		expect(tabsUpdate).toHaveBeenCalledWith(3, { active: true });
		expect(tabsUpdate).not.toHaveBeenCalledWith(2, { active: true });
	});

	test('drops a queued switch when standby takes over', async () => {
		await loadBackground({
			prefs: { ...switchingPrefs, switchDelaySeconds: 60, standbyStreamEnabled: true },
			tabRegistry: [{ gameId: 'thriller', tabId: 2 }],
			standbyStreamTabId: 5,
			fetchReturnValue: { games: [thriller], leagueLogos: {} },
			openTabIds: [1, 2, 5],
			activeTabId: 1,
			initialSystemTime: 1_000_000,
		});

		await runFirstPoll();
		expect((await getDebugState()).pendingSwitch).not.toBeNull();

		// The game falls apart: 78 → 10, under the default standby threshold of 20. Standby is
		// evaluated ahead of the pending-switch guard, so a queued switch cannot freeze it out.
		fetchMock.mockResolvedValue({ games: [blowout], leagueLogos: {} });
		jest.advanceTimersByTime(30_000);
		await drain(16);

		expect(tabsUpdate).toHaveBeenCalledWith(5, { active: true });
		expect((await getDebugState()).pendingSwitch).toBeNull();

		jest.advanceTimersByTime(60_000);
		await drain(16);

		expect(tabsUpdate).not.toHaveBeenCalledWith(2, { active: true });
	});
});

// ─── Manual switches ──────────────────────────────────────────────────────────
// Picking a game tab by hand left the cooldown untouched, so the next poll could
// override a deliberate choice within seconds.

describe('manual tab activation', () => {
	test('starts the cooldown when the user lands on a registered game tab', async () => {
		await loadBackground({
			prefs: switchingPrefs,
			tabRegistry: [{ gameId: 'thriller', tabId: 2 }],
			fetchReturnValue: { games: [thriller], leagueLogos: {} },
			openTabIds: [1, 2],
			activeTabId: 1,
			initialSystemTime: 1_000_000,
		});

		expect((await getDebugState()).lastSwitchTime).toBe(0);

		await activateTab(2);
		expect((await getDebugState()).lastSwitchTime).toBe(Date.now());
	});

	test('leaves the cooldown alone for a tab that is not a game tab', async () => {
		await loadBackground({
			prefs: switchingPrefs,
			tabRegistry: [{ gameId: 'thriller', tabId: 2 }],
			fetchReturnValue: { games: [thriller], leagueLogos: {} },
			openTabIds: [1, 2],
			activeTabId: 1,
			initialSystemTime: 1_000_000,
		});

		await activateTab(1);
		expect((await getDebugState()).lastSwitchTime).toBe(0);
	});

	test('holds off auto-switching for the length of the cooldown, then resumes', async () => {
		await loadBackground({
			prefs: { ...switchingPrefs, cooldownSeconds: 45 },
			tabRegistry: [{ gameId: 'thriller', tabId: 2 }],
			fetchReturnValue: { games: [thriller], leagueLogos: {} },
			openTabIds: [1, 2],
			activeTabId: 1,
			initialSystemTime: 1_000_000,
		});

		await activateTab(2);

		await runFirstPoll();
		expect(tabsUpdate).not.toHaveBeenCalledWith(2, { active: true });

		jest.advanceTimersByTime(45_000);
		await drain(16);
		expect(tabsUpdate).toHaveBeenCalledWith(2, { active: true });
	});
});

// ─── Mute sync resilience ─────────────────────────────────────────────────────
// Mute updates went out as one Promise.all, so a tab closing inside the query→update
// race window rejected the batch and aborted the switch evaluation that follows it.

describe('mute sync resilience', () => {
	test('still evaluates the switch when one tab rejects its mute update', async () => {
		await loadBackground({
			prefs: switchingPrefs,
			tabRegistry: [{ gameId: 'thriller', tabId: 2 }, { gameId: 'close', tabId: 3 }],
			fetchReturnValue: { games: [thriller, closeGame], leagueLogos: {} },
			openTabIds: [1, 2, 3],
			activeTabId: 1,
			initialSystemTime: 1_000_000,
		});

		tabsUpdate.mockImplementation((tabId: number, props: Record<string, unknown>) => (
			tabId === 3 && 'muted' in props
				? Promise.reject(new Error('No tab with id: 3.'))
				: Promise.resolve(undefined)
		));

		await runFirstPoll();

		expect(tabsUpdate).toHaveBeenCalledWith(2, { active: true });
		// Tab 3 never actually muted, so it must not be recorded as ours to unmute later.
		expect(storageSessionSet).toHaveBeenCalledWith({ mutedTabIds: [2] });
	});
});
