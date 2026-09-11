import { pollWinProbabilityMs } from '@arenaswap/core';
import { createDefaultUserPreferences, createFavoriteTeamKey, historyWindowMs, normalizeUserPreferences, pollDormantMaxMs, pollHebetudinousMaxMs, pollIntervalMs, pollMaxEagerMs } from '@arenaswap/core/constants';
import { chartHistory, coversWholeGame } from '../entrypoints/popup/components/wrapCoverage';
import type { Game, LeagueId, TabRegistration, UserPreferences } from '@arenaswap/core/types';
import { prefsStorageUpdatedAtKey } from '../utils/prefsStorage';

jest.mock('@porkyproductions/hat', () => ({
	// Always the maximum of the range, so timer delays are deterministic.
	randomInRange: jest.fn().mockImplementation((_min: number, max: number) => max),
}));

jest.mock('@arenaswap/core', () => ({
	...jest.requireActual('@arenaswap/core'),
	fetchGamesWithLeagueLogos: jest.fn(),
	fetchNextScheduledStart: jest.fn().mockResolvedValue(null),
	fetchWinProbability: jest.fn().mockResolvedValue([]),
}));

const flushPromises = () => new Promise<void>(r => setImmediate(r));

// `loadBackground` resets the module registry, so the mock the background calls is a fresh instance
// on every load — one captured at spec load is a different function object and would record none of
// its calls. Read through the registry the same way `fetchMock` is.
const lookahead = (): jest.Mock => (
	(require('@arenaswap/core') as { fetchNextScheduledStart: jest.Mock }).fetchNextScheduledStart
);

// Multiple rounds because each resolved promise can schedule new microtasks.
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

const mockOpenTabIds = (openTabIds: number[], activeTabId: number) => {
	tabsQuery.mockImplementation((q: unknown) => {
		if ((q as { active?: boolean }).active) return Promise.resolve([{ id: activeTabId }]);
		return Promise.resolve(openTabIds.map(id => ({ id })));
	});
};

// Holds a win probability sweep open so the chain can be stopped or rebuilt underneath it.
const deferNextSweep = (winProbMock: jest.Mock): (() => void) => {
	let release!: () => void;
	winProbMock.mockImplementationOnce(() => new Promise<number[]>(resolve => {
		release = () => resolve([]);
	}));
	return () => release();
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
	openTabIds?: number[];
	activeTabId?: number;
}

const loadBackground = async (options: LoadOptions = {}) => {
	jest.resetModules();
	// setImmediate stays real so flushPromises() can still drain microtasks under fake timers.
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

	await drain();

	fetchMock.mockClear();
	tabsUpdate.mockClear();
};

afterEach(() => {
	jest.useRealTimers();
});

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
		postseasonRound: 0,
	};

	const regularGame: Game = {
		...postseasonGame,
		id: 'reg-game',
		isPostseason: false,
		postseasonRound: undefined,
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

	const boostForRound = async (postseasonRound: Game['postseasonRound']) => {
		await loadBackground({
			prefs: { enabledLeagues: ['nba' as LeagueId], postseasonBoostPoints: 8 },
			fetchReturnValue: { games: [{ ...postseasonGame, postseasonRound }], leagueLogos: {} },
		});
		jest.advanceTimersByTime(pollIntervalMs + 2000);
		await drain(12);
		const state = await sendMessage({ type: 'GET_STATE' }) as { scores: { gameId: string; postseasonBoost: number }[] };
		return state.scores.find(s => s.gameId === 'ps-game')?.postseasonBoost;
	};

	test.each<[NonNullable<Game['postseasonRound']>, number]>([[0, 8], [1, 6], [2, 4], [3, 2]])(
		'a game at distance %i from the trophy is worth %i of an 8-point ceiling', async (round, expected) => {
			expect(await boostForRound(round)).toBe(expected);
		});

	// A non-playoff bowl and the Pro Bowl reach here as postseason with no round. They must score
	// nothing rather than falling through to the bottom rung.
	test('a postseason game with no graded round scores nothing', async () => {
		expect(await boostForRound(undefined)).toBe(0);
	});

	test('every rung outscores the one below it at the shipping default', async () => {
		const ladder = [await boostForRound(3), await boostForRound(2), await boostForRound(1), await boostForRound(0)];
		for (let i = 1; i < ladder.length; i++) expect(ladder[i]!).toBeGreaterThan(ladder[i - 1]!);
	});
});

// Regression: a game at halftime scored 0 from the signals but still collected its favorite,
// postseason and manual boosts, so a frozen game out-scored games that were actually being played.
describe('frozen games', () => {
	const halftimeGame: Game = {
		id: 'frozen-game',
		league: 'nba' as LeagueId,
		sportType: 'basketball',
		status: 'in',
		homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 50 },
		awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 48 },
		period: 2,
		clockSeconds: 0,
		isPostseason: true,
		postseasonRound: 0,
		intermission: true,
	};

	interface ScoreState {
		scores: {
			gameId: string;
			total: number;
			favoriteBonus: number;
			gameBoost: number;
			postseasonBoost: number;
		}[];
	}

	const loadWithFrozenGame = async (game: Game) => {
		await loadBackground({
			prefs: {
				enabledLeagues: ['nba' as LeagueId],
				favoriteTeamIds: [createFavoriteTeamKey('nba' as LeagueId, 'h')],
				favoriteTeamBonusPoints: 10,
				postseasonBoostPoints: 8,
			},
			fetchReturnValue: { games: [game], leagueLogos: {} },
		});

		await sendMessage({ type: 'SET_GAME_BOOST', gameId: game.id, boost: 15 });

		jest.advanceTimersByTime(pollIntervalMs + 2000);
		await drain(12);

		const state = await sendMessage({ type: 'GET_STATE' }) as ScoreState;
		return state.scores.find(s => s.gameId === game.id);
	};

	test('scores 0 at halftime despite a favorite team, postseason and a manual boost', async () => {
		const score = await loadWithFrozenGame(halftimeGame);

		expect(score).toBeDefined();
		expect(score?.total).toBe(0);
		expect(score?.favoriteBonus).toBe(0);
		expect(score?.gameBoost).toBe(0);
		expect(score?.postseasonBoost).toBe(0);
	});

	test('scores 0 during a delay too', async () => {
		const score = await loadWithFrozenGame({ ...halftimeGame, intermission: false, delayed: true });

		expect(score?.total).toBe(0);
	});

	test('pays the boosts again once play resumes', async () => {
		const score = await loadWithFrozenGame({ ...halftimeGame, intermission: false, period: 3 });

		expect(score?.favoriteBonus).toBe(10);
		expect(score?.gameBoost).toBe(15);
		expect(score?.postseasonBoost).toBe(8);
		expect(score?.total).toBeGreaterThan(0);
	});
});

// Regression: tickLeague rescheduled itself unconditionally, so a stopLeaguePolling() during an
// in-flight fetch re-added the timer after the clear and polled a disabled league forever.
describe('tickLeague rescheduling', () => {
	test('does not reschedule a league that was disabled while its fetch was in flight', async () => {
		await loadBackground({ prefs: { enabledLeagues: ['nba' as LeagueId] } });

		// Deferred so the league can be disabled before the fetch resolves.
		let resolveDeferred!: (v: { games: never[]; leagueLogos: Record<string, never> }) => void;
		fetchMock.mockImplementationOnce(
			() => new Promise(resolve => { resolveDeferred = resolve; })
		);

		jest.advanceTimersByTime(pollIntervalMs + 2000);
		await drain();

		await sendMessage({
			type: 'UPDATE_PREFS',
			prefs: normalizeUserPreferences({ ...createDefaultUserPreferences(), enabledLeagues: [] }),
		});

		fetchMock.mockClear();
		fetchMock.mockResolvedValue({ games: [], leagueLogos: {} });

		resolveDeferred({ games: [], leagueLogos: {} });
		await drain();

		jest.advanceTimersByTime(pollIntervalMs * 2 + 5000);
		await drain();

		const nbaCalls = fetchMock.mock.calls.filter(
			(args: unknown[]) => Array.isArray(args[0]) && (args[0] as string[]).includes('nba')
		);
		expect(nbaCalls).toHaveLength(0);
	});
});

// Regression: the popup writes prefs to storage.sync then sends UPDATE_PREFS, so a popup
// destroyed between those two steps used to leave the background on stale in-memory prefs.
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

	// Reloading the prefs was only half the recovery: leagueTimers still held timers for the old
	// league set, so a league the popup had just enabled was fetched once by the re-score and then
	// never polled again until the next pref change or a worker restart.
	test('re-arms league polling for the league set it just recovered', async () => {
		await loadBackground({ prefs: { enabledLeagues: ['nba' as LeagueId] } });

		storageSyncGet.mockResolvedValue({
			prefs: normalizeUserPreferences({ ...createDefaultUserPreferences(), enabledLeagues: ['nhl' as LeagueId] }),
			[prefsStorageUpdatedAtKey]: 1,
		});

		await sendMessage({ type: 'GET_STATE', forceRefresh: true });

		fetchMock.mockClear();
		jest.advanceTimersByTime(pollIntervalMs * 2 + 5_000);
		await drain();

		const polledLeagues = fetchMock.mock.calls
			.flatMap((args: unknown[]) => (Array.isArray(args[0]) ? args[0] as string[] : []));
		expect(polledLeagues).toContain('nhl');
		expect(polledLeagues).not.toContain('nba');
	});

	// The review also flagged managed tabs keeping the old master toggle's mute state, but the
	// re-score at the end of this path runs afterFetch, which already syncs it. Pinned so the
	// guarantee survives whatever else moves around in here.
	test('leaves managed tab mute state matching the master toggle it just recovered', async () => {
		await loadBackground({
			prefs: { enabled: true, enabledLeagues: ['nba' as LeagueId] },
			tabRegistry: [{ gameId: 'g1', tabId: 2 }, { gameId: 'g2', tabId: 3 }],
			openTabIds: [1, 2, 3],
			activeTabId: 2,
		});

		tabsUpdate.mockClear();
		storageSyncGet.mockResolvedValue({
			prefs: normalizeUserPreferences({
				...createDefaultUserPreferences(),
				enabled: false,
				enabledLeagues: ['nba' as LeagueId],
			}),
			[prefsStorageUpdatedAtKey]: 1,
		});

		await sendMessage({ type: 'GET_STATE', forceRefresh: true });

		expect(tabsUpdate).toHaveBeenCalledWith(3, { muted: false });
	});
});

// Regression: run() reassigned winProbTimer unconditionally after its await, so clearTimeout could
// never reach a sweep that was already in flight. Stopping mid-sweep let the resolving run bring the
// chain back to life, and rescheduling mid-sweep orphaned a chain nothing held a handle to — each
// one worth an ESPN summary request per live game every 60 seconds, forever.
describe('win probability polling', () => {
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

	const loadWithLiveGame = async (): Promise<jest.Mock> => {
		await loadBackground({
			prefs: { enabledLeagues: ['nba' as LeagueId], notificationsEnabled: false },
			fetchReturnValue: { games: [liveGame], leagueLogos: {} },
		});
		// The startup seed already swept once, so the count starts from here.
		const winProbMock = (require('@arenaswap/core') as { fetchWinProbability: jest.Mock }).fetchWinProbability;
		winProbMock.mockClear();
		return winProbMock;
	};

	test('a sweep that resolves after polling stopped does not restart the chain', async () => {
		const winProbMock = await loadWithLiveGame();
		const releaseSweep = deferNextSweep(winProbMock);

		jest.advanceTimersByTime(pollWinProbabilityMs);
		await drain();
		expect(winProbMock).toHaveBeenCalledTimes(1);

		// Demo mode stops the chain while the sweep is still waiting on ESPN.
		await sendMessage({ type: 'SET_DEMO_MODE', enabled: true });
		releaseSweep();
		await drain();

		winProbMock.mockClear();
		jest.advanceTimersByTime(pollWinProbabilityMs * 3);
		await drain();

		expect(winProbMock).not.toHaveBeenCalled();
	});

	test('rescheduling during a sweep leaves exactly one live chain', async () => {
		const winProbMock = await loadWithLiveGame();
		const releaseSweep = deferNextSweep(winProbMock);

		jest.advanceTimersByTime(pollWinProbabilityMs);
		await drain();
		expect(winProbMock).toHaveBeenCalledTimes(1);

		// Off and straight back on while the first sweep is still waiting, so the chain is rebuilt
		// underneath it.
		await sendMessage({ type: 'SET_DEMO_MODE', enabled: true });
		await sendMessage({ type: 'SET_DEMO_MODE', enabled: false });
		releaseSweep();
		await drain();

		winProbMock.mockClear();
		jest.advanceTimersByTime(pollWinProbabilityMs);
		await drain();

		// One live game and one chain: a second chain would double every sweep from here on.
		expect(winProbMock).toHaveBeenCalledTimes(1);
	});
});

// Regression: lastSwitchTime survived a disable, so disabling just after a switch and re-enabling
// left the cooldown blocking the first switch of an otherwise fresh start.
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

	// Sensitivity 7 → a threshold of 1.
	const switchPrefs: Partial<UserPreferences> = {
		enabled: true,
		enabledLeagues: ['nba' as LeagueId],
		cooldownSeconds: 60,
		sensitivity: 7,
		switchDelaySeconds: 0,
		notificationsEnabled: false,
	};

	test('resets lastSwitchTime to 0 on disable so the cooldown does not suppress the first switch after re-enabling', async () => {
		await loadBackground({
			prefs: switchPrefs,
			tabRegistry: [{ gameId: 'g1', tabId: 2 }],
			fetchReturnValue: { games: [liveGame], leagueLogos: {} },
			initialSystemTime: 1_000_000,
		});

		// Tab 1 is active and unregistered; tab 2 holds the game.
		tabsQuery.mockImplementation((q: unknown) => {
			if ((q as { active?: boolean }).active) return Promise.resolve([{ id: 1 }]);
			return Promise.resolve([{ id: 1 }, { id: 2 }]);
		});

		jest.advanceTimersByTime(pollIntervalMs + 2000);
		await drain(12);
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

		// 5s after the switch, well inside the 60s cooldown.
		jest.setSystemTime(1_005_000);
		jest.advanceTimersByTime(pollIntervalMs + 2000);
		await drain(12);
		expect(tabsUpdate).not.toHaveBeenCalledWith(2, { active: true });

		tabsUpdate.mockClear();

		const makePrefs = (enabled: boolean) => normalizeUserPreferences({ ...createDefaultUserPreferences(), ...switchPrefs, enabled });
		await sendMessage({ type: 'UPDATE_PREFS', prefs: makePrefs(false) });
		await sendMessage({ type: 'UPDATE_PREFS', prefs: makePrefs(true) });

		// 10s after the switch: still inside the cooldown unless lastSwitchTime was reset.
		jest.setSystemTime(1_010_000);
		jest.advanceTimersByTime(pollIntervalMs + 2000);
		await drain(12);
		expect(tabsUpdate).toHaveBeenCalledWith(2, { active: true });
	});
});

// Regression: the standby tab is tracked outside the game registry, so mute syncing skipped it
// and it kept playing over whichever game tab the user was actually watching.
describe('standby stream tab mute state', () => {
	const standbyTabId = 5;
	const gameTabs: TabRegistration[] = [{ gameId: 'g1', tabId: 2 }, { gameId: 'g2', tabId: 3 }];

	const standbyPrefs: Partial<UserPreferences> = {
		enabled: true,
		enabledLeagues: ['nba' as LeagueId],
		standbyStreamEnabled: true,
		notificationsEnabled: false,
	};

	// Tab 1 is unmanaged, tabs 2/3 are game tabs, tab 5 is the standby stream.
	const mockOpenTabs = (activeTabId: number) => {
		tabsQuery.mockImplementation((q: unknown) => {
			if ((q as { active?: boolean }).active) return Promise.resolve([{ id: activeTabId }]);
			return Promise.resolve([{ id: 1 }, { id: 2 }, { id: 3 }, { id: standbyTabId }]);
		});
	};

	// UPDATE_REGISTRY re-syncs mute state without going through the switching logic.
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

		// Dropping the tab out of the managed set must not leave it silently muted.
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

// Regression: nothing pruned the registry when a tab closed, so a closed tab kept winning the
// switch selection and every switch then no-opped against a tab that wasn't there.

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
	const registry: TabRegistration[] = [{ gameId: 'thriller', tabId: 2 }, { gameId: 'close', tabId: 3 }];

	test('switches to the runner-up when the top game tab closed while the worker was asleep', async () => {
		// Tab 2 is absent from the very first query: the worker was torn down, the tab closed with
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

		// blowout scores 10, under the default standby threshold of 20, so a stale standby tab id
		// would park on a closed tab and return before considering any game.
		await runFirstPoll();

		expect(tabsUpdate).not.toHaveBeenCalledWith(5, { active: true });
		expect(tabsUpdate).toHaveBeenCalledWith(2, { active: true });
	});

	test('does not wipe the registry when tabs.query cannot see any tabs', async () => {
		await loadBackground({
			prefs: switchingPrefs,
			tabRegistry: registry,
			fetchReturnValue: { games: [thriller, closeGame], leagueLogos: {} },
			initialSystemTime: 1_000_000,
		});

		expect((await getDebugState()).tabRegistry).toEqual(registry);
	});
});

// Regression: a queued switch replayed the target it was created with, so after the delay it
// switched to a game that had since gone quiet, or ended.

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

		// The game falls apart: 78 → 10, under the standby threshold of 20.
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

// Regression: picking a game tab by hand left the cooldown untouched, so the next poll could
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

	test('switches on the very next poll when the cooldown is off', async () => {
		await loadBackground({
			prefs: { ...switchingPrefs, cooldownSeconds: 0 },
			tabRegistry: [{ gameId: 'thriller', tabId: 2 }],
			fetchReturnValue: { games: [thriller], leagueLogos: {} },
			openTabIds: [1, 2],
			activeTabId: 1,
			initialSystemTime: 1_000_000,
		});

		await activateTab(2);

		await runFirstPoll();
		expect(tabsUpdate).toHaveBeenCalledWith(2, { active: true });
	});

	test('switches when the cooldown is off and the evaluation lands in the same millisecond', async () => {
		await loadBackground({
			prefs: { ...switchingPrefs, cooldownSeconds: 0 },
			tabRegistry: [{ gameId: 'thriller', tabId: 2 }],
			fetchReturnValue: { games: [thriller], leagueLogos: {} },
			openTabIds: [1, 2],
			activeTabId: 1,
			initialSystemTime: 1_000_000,
		});

		await activateTab(2);
		const activatedAt = Date.now();

		// Elapsed time compared against a zero cooldown is only ever blocking when the two instants
		// are equal, so the clock is pinned back to the activation to reach that one case: a poll
		// evaluating in the same millisecond the user landed on a game tab.
		jest.advanceTimersByTime(pollIntervalMs + 2000);
		jest.setSystemTime(activatedAt);
		await drain(16);

		expect(tabsUpdate).toHaveBeenCalledWith(2, { active: true });
	});
});

// Regression: mute updates went out as one Promise.all, so a tab closing inside the
// query-to-update race window rejected the batch and aborted the switch evaluation after it.

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

const startedHoursAgo = (hours: number): string => (
	new Date(Date.now() - (hours * 60 * 60 * 1000)).toISOString()
);

describe('keeping finished games', () => {
	const finishedGame = (id: string, hoursAgo: number, league: LeagueId = 'nba'): Game => ({
		id,
		league,
		sportType: 'basketball',
		status: 'post',
		period: 4,
		clockSeconds: 0,
		startTime: startedHoursAgo(hoursAgo),
		homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 112 },
		awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 104 },
	});

	const liveGame = (id: string, league: LeagueId = 'nba'): Game => ({
		...finishedGame(id, 1, league),
		status: 'in',
		period: 3,
		clockSeconds: 300,
	});

	const stateGames = async (): Promise<Game[]> => (
		(await sendMessage({ type: 'GET_STATE' }) as { games: Game[] }).games
	);

	const fetchOptions = (): Record<string, unknown>[] => (
		fetchMock.mock.calls.map(([, options]) => options as Record<string, unknown>)
	);

	test('asks the fetch for finals only when the pref is on', async () => {
		await loadBackground({ prefs: { enabledLeagues: ['nba' as LeagueId], keepFinalGames: true } });
		await sendMessage({ type: 'GET_STATE', forceRefresh: true });
		expect(fetchOptions().length).toBeGreaterThan(0);
		for (const options of fetchOptions()) expect(options.includeFinal).toBe(true);
	});

	test('and never asks for them while it is off', async () => {
		await loadBackground({ prefs: { enabledLeagues: ['nba' as LeagueId], keepFinalGames: false } });
		await sendMessage({ type: 'GET_STATE', forceRefresh: true });
		expect(fetchOptions().length).toBeGreaterThan(0);
		for (const options of fetchOptions()) expect(options.includeFinal).toBe(false);
	});

	test('a finished game reaches the popup state', async () => {
		await loadBackground({
			prefs: { enabledLeagues: ['nba' as LeagueId], keepFinalGames: true },
			fetchReturnValue: { games: [finishedGame('done', 4), liveGame('playing')], leagueLogos: {} },
		});
		expect((await stateGames()).map(g => g.id).toSorted()).toEqual(['done', 'playing']);
	});

	// The per-league polls use the dateless scoreboard, which only carries the current Eastern day.
	// A game the range fetch found and this one cannot see has to survive the merge, exactly as a
	// scheduled game already does.
	test('survives a poll that no longer returns it', async () => {
		await loadBackground({
			prefs: { enabledLeagues: ['nba' as LeagueId], keepFinalGames: true },
			fetchReturnValue: { games: [finishedGame('yesterday', 20), liveGame('playing')], leagueLogos: {} },
		});
		expect((await stateGames()).map(g => g.id)).toContain('yesterday');

		// The next poll answers with the live game alone.
		fetchMock.mockResolvedValue({ games: [liveGame('playing')], leagueLogos: {} });
		await sendMessage({ type: 'GET_STATE', forceRefresh: true });
		expect((await stateGames()).map(g => g.id).toSorted()).toEqual(['playing', 'yesterday']);
	});

	test('is dropped once it has aged out, without waiting for another fetch', async () => {
		await loadBackground({
			prefs: { enabledLeagues: ['nba' as LeagueId], keepFinalGames: true },
			fetchReturnValue: { games: [finishedGame('ageing', 20), liveGame('playing')], leagueLogos: {} },
		});
		expect((await stateGames()).map(g => g.id)).toContain('ageing');

		// Nine hours on, the game is more than a day past its estimated wrap. The poll still cannot
		// see it, so nothing but the retention check can remove it.
		fetchMock.mockResolvedValue({ games: [liveGame('playing')], leagueLogos: {} });
		jest.setSystemTime(Date.now() + (9 * 60 * 60 * 1000));
		await sendMessage({ type: 'GET_STATE', forceRefresh: true });
		expect((await stateGames()).map(g => g.id)).toEqual(['playing']);
	});

	test('turning the setting off clears the finals already in state', async () => {
		await loadBackground({
			prefs: { enabledLeagues: ['nba' as LeagueId], keepFinalGames: true },
			fetchReturnValue: { games: [finishedGame('done', 4), liveGame('playing')], leagueLogos: {} },
		});
		expect((await stateGames()).map(g => g.id)).toContain('done');

		const prefs = normalizeUserPreferences({
			...createDefaultUserPreferences(),
			enabledLeagues: ['nba' as LeagueId],
			keepFinalGames: false,
		});
		fetchMock.mockResolvedValue({ games: [liveGame('playing')], leagueLogos: {} });
		await sendMessage({ type: 'UPDATE_PREFS', prefs });
		expect((await stateGames()).map(g => g.id)).toEqual(['playing']);
	});

	test('turning it on brings them in without waiting for the next poll', async () => {
		await loadBackground({
			prefs: { enabledLeagues: ['nba' as LeagueId], keepFinalGames: false },
			fetchReturnValue: { games: [liveGame('playing')], leagueLogos: {} },
		});
		expect((await stateGames()).map(g => g.id)).toEqual(['playing']);

		const prefs = normalizeUserPreferences({
			...createDefaultUserPreferences(),
			enabledLeagues: ['nba' as LeagueId],
			keepFinalGames: true,
		});
		fetchMock.mockResolvedValue({ games: [finishedGame('done', 4), liveGame('playing')], leagueLogos: {} });
		await sendMessage({ type: 'UPDATE_PREFS', prefs });
		expect((await stateGames()).map(g => g.id).toSorted()).toEqual(['done', 'playing']);
	});

	test('a finished game is never scored, so it cannot be switched to', async () => {
		await loadBackground({
			prefs: { enabledLeagues: ['nba' as LeagueId], keepFinalGames: true },
			fetchReturnValue: { games: [finishedGame('done', 4), liveGame('playing')], leagueLogos: {} },
		});
		const state = await sendMessage({ type: 'GET_STATE' }) as { scores: { gameId: string }[] };
		expect(state.scores.map(s => s.gameId)).toEqual(['playing']);
	});
});

// The two paths this PR shipped that no existing test could see: the history a wrap screen reads,
// and the scheduled per-league poll. Every other case in this file drives GET_STATE with
// forceRefresh, which routes through tick() — production polling is tickLeague, and the two merge
// their results differently.
const gameAt = (startMs: number, status: Game['status']): Game => ({
	id: 'wrapper',
	league: 'nba' as LeagueId,
	sportType: 'basketball',
	status,
	period: status === 'post' ? 4 : 3,
	clockSeconds: status === 'post' ? 0 : 300,
	startTime: new Date(startMs).toISOString(),
	homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 112 },
	awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 104 },
});

describe('a game that goes final while the worker is up', () => {
	const nbaOnly = { enabledLeagues: ['nba' as LeagueId], keepFinalGames: true };

	const stateIds = async (): Promise<string[]> => (
		((await sendMessage({ type: 'GET_STATE' }) as { games: Game[] }).games).map(g => g.id).toSorted()
	);

	// The failure this reproduces: retainedFinalGames was only ever written inside refreshSlate,
	// which runs at worker startup and on a preference change and never on a timer. So a game that
	// went final mid-session survived only as long as the dateless scoreboard kept returning it,
	// and vanished at the Eastern-day rollover a couple of hours old against a promised 24.
	// A second game in the same league, live throughout, so the league never drops to the dormant
	// poll interval and every advance below genuinely lands a tickLeague.
	const alsoPlaying: Game = {
		id: 'other', league: 'nba' as LeagueId, sportType: 'basketball', status: 'in',
		period: 2, clockSeconds: 400, startTime: new Date(Date.UTC(2026, 8, 7, 23, 30, 0)).toISOString(),
		homeTeam: { id: 'h2', name: 'H2', abbreviation: 'HH', score: 40 },
		awayTeam: { id: 'a2', name: 'A2', abbreviation: 'AA', score: 38 },
	};

	// Fires the scheduled per-league poll and proves it actually ran, so nothing below can pass by
	// virtue of no poll having happened at all. The interval is adaptive — computeLeagueIntervalMs
	// reads the best live score in the league — so this steps forward until one lands rather than
	// hardcoding a delay that a scoring change would silently invalidate.
	const pollOnce = async () => {
		fetchMock.mockClear();
		for (let step = 0; step < 40 && fetchMock.mock.calls.length === 0; step++) {
			jest.advanceTimersByTime(pollIntervalMs);
			await drain();
		}
		expect(fetchMock).toHaveBeenCalled();
	};

	test('is still there after the dateless scoreboard stops returning it', async () => {
		const startMs = Date.UTC(2026, 8, 7, 23, 0, 0);
		await loadBackground({
			prefs: nbaOnly,
			initialSystemTime: startMs,
			fetchReturnValue: { games: [gameAt(startMs, 'in'), alsoPlaying], leagueLogos: {} },
		});

		// The scheduled poll finds it final. This is the only place the game is ever seen as post.
		fetchMock.mockResolvedValue({ games: [gameAt(startMs, 'post'), alsoPlaying], leagueLogos: {} });
		jest.setSystemTime(startMs + (2.5 * 60 * 60 * 1000));
		await pollOnce();
		expect(await stateIds()).toEqual(['other', 'wrapper']);

		// Eastern midnight rolls over and the dateless scoreboard drops it. Nothing refetches the
		// range, because nothing restarted the worker.
		fetchMock.mockResolvedValue({ games: [alsoPlaying], leagueLogos: {} });
		jest.setSystemTime(startMs + (3 * 60 * 60 * 1000));
		await pollOnce();
		expect(await stateIds()).toEqual(['other', 'wrapper']);
	});

	test('and still ages out on its own schedule once it is past the window', async () => {
		const startMs = Date.UTC(2026, 8, 7, 23, 0, 0);
		await loadBackground({
			prefs: nbaOnly,
			initialSystemTime: startMs,
			fetchReturnValue: { games: [gameAt(startMs, 'post'), alsoPlaying], leagueLogos: {} },
		});
		await pollOnce();
		expect(await stateIds()).toEqual(['other', 'wrapper']);

		// 24 hours past the 2.5-hour estimated wrap, plus a few minutes.
		fetchMock.mockResolvedValue({ games: [alsoPlaying], leagueLogos: {} });
		jest.setSystemTime(startMs + (26.6 * 60 * 60 * 1000));
		await pollOnce();
		expect(await stateIds()).toEqual(['other']);
	});

	test('is never scored, so the switcher cannot reach it', async () => {
		const startMs = Date.UTC(2026, 8, 7, 23, 0, 0);
		await loadBackground({
			prefs: nbaOnly,
			initialSystemTime: startMs,
			fetchReturnValue: { games: [gameAt(startMs, 'post'), alsoPlaying], leagueLogos: {} },
		});
		await pollOnce();
		const state = await sendMessage({ type: 'GET_STATE' }) as { scores: { gameId: string }[] };
		expect(state.scores.map(score => score.gameId)).toEqual(['other']);
	});
});

describe('the history a wrap screen reads', () => {
	const startMs = Date.UTC(2026, 8, 7, 18, 0, 0);
	const basketballAllowanceMs = 2.5 * 60 * 60 * 1000;

	const walkAWholeGame = async (keepFinalGames = true): Promise<{ scoreHistory: Record<string, { timestamp: number }[]>; powerScoreHistory: Record<string, { timestamp: number }[]> }> => {
		await loadBackground({
			prefs: { enabledLeagues: ['nba' as LeagueId], keepFinalGames },
			initialSystemTime: startMs,
			fetchReturnValue: {
				games: [{
					id: 'played', league: 'nba' as LeagueId, sportType: 'basketball', status: 'in',
					period: 1, clockSeconds: 700, startTime: new Date(startMs).toISOString(),
					homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 0 },
					awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 0 },
				}],
				leagueLogos: {},
			},
		});
		// Two-minute polls from tip-off to a couple of minutes short of the estimated wrap. Real
		// polling is far denser; the point is the span, and the snapshots inside the scorer's own
		// five-minute window are kept at whatever density they arrive at.
		for (let minute = 2; minute <= 140; minute += 2) {
			jest.setSystemTime(startMs + (minute * 60 * 1000));
			await sendMessage({ type: 'GET_STATE', forceRefresh: true });
		}
		return await sendMessage({ type: 'GET_STATE' }) as never;
	};

	const finishedGame = {
		sportType: 'basketball' as const,
		startTime: new Date(startMs).toISOString(),
	};

	// This is the assertion the whole chart gate rests on, and nothing used to make it. Under a
	// rolling per-sport window the retained span was capped at five minutes for basketball, while
	// coversWholeGame needs 0.8 x the 2.5-hour allowance — two hours. It was unsatisfiable in every
	// sport by an order of magnitude, so the wrap screen's three charts could never draw.
	test('covers the whole game, so the wrap screen draws its charts', async () => {
		const { scoreHistory, powerScoreHistory } = await walkAWholeGame();
		const now = startMs + (140 * 60 * 1000);
		expect(coversWholeGame(scoreHistory.played!, finishedGame, now)).toBe(true);
		expect(coversWholeGame(powerScoreHistory.played!, finishedGame, now)).toBe(true);
	});

	test('reaches from tip-off to the end rather than from either one alone', async () => {
		const { powerScoreHistory } = await walkAWholeGame();
		const snapshots = powerScoreHistory.played!;
		expect(snapshots[0]!.timestamp).toBe(startMs);
		expect(snapshots[snapshots.length - 1]!.timestamp).toBe(startMs + (140 * 60 * 1000));
		expect(snapshots.length).toBeGreaterThan(2);
	});

	// The tail is thinned rather than kept whole, so a long game cannot fill session storage. The
	// cap is a backstop above this.
	test('thins the tail instead of growing without bound', async () => {
		const { powerScoreHistory } = await walkAWholeGame();
		expect(powerScoreHistory.played!.length).toBeLessThan(200);
	});

	// Both maps are written to session storage on every poll, so the tail is only paid for by the
	// setting that can display it. With Keep finished games off a finished game leaves the list
	// entirely, there is no wrap screen to draw on, and this is the window it has always been.
	test('is not kept at all when nothing could draw it', async () => {
		const { powerScoreHistory } = await walkAWholeGame(false);
		const snapshots = powerScoreHistory.played!;
		const end = startMs + (140 * 60 * 1000);
		expect(snapshots[0]!.timestamp).toBeGreaterThanOrEqual(end - historyWindowMs);
		expect(coversWholeGame(snapshots, finishedGame, end)).toBe(false);
	});

	// A live screen keeps drawing the window it always drew. Widening a running chart is a separate
	// decision from making the wrap's charts possible at all.
	test('is windowed back down for a game that is still being played', async () => {
		const { powerScoreHistory } = await walkAWholeGame();
		const now = startMs + (140 * 60 * 1000);
		const live = chartHistory(powerScoreHistory.played!, { sportType: 'basketball', status: 'in' }, now);
		expect(live.length).toBeLessThan(powerScoreHistory.played!.length);
		expect(live[0]!.timestamp).toBeGreaterThanOrEqual(now - historyWindowMs);
		expect(coversWholeGame(live, finishedGame, now)).toBe(false);

		const final = chartHistory(powerScoreHistory.played!, { sportType: 'basketball', status: 'post' }, now);
		expect(final).toEqual(powerScoreHistory.played!);
	});

	// A game the worker only started watching late still carries a stub, which is the case the gate
	// exists to catch and the one a length check misses.
	test('still reports a late start as not covering the game', async () => {
		const lateStart = { timestamp: startMs + (basketballAllowanceMs * 0.5) };
		const lateEnd = { timestamp: startMs + (basketballAllowanceMs * 0.95) };
		expect(coversWholeGame([lateStart, lateEnd], finishedGame, startMs + basketballAllowanceMs)).toBe(false);
	});
});

/* Dormant cannot tell a league quiet with a tip-off tonight from one quiet with nothing for nine
   weeks, because the dateless scoreboard it polls only carries the current Eastern day. These drive
   the real `tickLeague` rather than GET_STATE's forceRefresh, which routes through `tick()` and
   never reschedules anything. */
describe('polling a league with nothing on', () => {
	const nbaOnly = { enabledLeagues: ['nba' as LeagueId] };
	const emptySlate = { games: [], leagueLogos: {} };

	const debugState = async () => await sendMessage({ type: 'GET_DEBUG_STATE' }) as {
		pollModes: Record<string, string>;
		leagueIntervals: Record<string, number>;
	};

	// Steps forward until a poll actually lands, so nothing below can pass by virtue of no poll
	// having run at all. The interval under test is the thing being chosen, so it is never assumed.
	const pollOnce = async (limitMs = 10 * 60_000) => {
		fetchMock.mockClear();
		for (let waited = 0; waited < limitMs && fetchMock.mock.calls.length === 0; waited += 5_000) {
			jest.advanceTimersByTime(5_000);
			await drain();
		}
		expect(fetchMock).toHaveBeenCalled();
	};

	// Two empty polls is the dormant threshold, and the second is where the lookahead is spent.
	const goQuiet = async () => {
		await pollOnce();
		await pollOnce();
	};

	const liveGame: Game = {
		id: 'live', league: 'nba' as LeagueId, sportType: 'basketball', status: 'in',
		period: 3, clockSeconds: 400,
		homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 77 },
		awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 75 },
	};

	const scheduledGame = (startMs: number): Game => ({
		...liveGame, id: 'tonight', status: 'pre', period: 1, clockSeconds: 0,
		startTime: new Date(startMs).toISOString(),
		homeTeam: { ...liveGame.homeTeam, score: 0 },
		awayTeam: { ...liveGame.awayTeam, score: 0 },
	});

	const startMs = Date.UTC(2026, 0, 14, 17, 0, 0);

	test('an offseason league sleeps at the ceiling instead of polling every three minutes', async () => {
		await loadBackground({ prefs: nbaOnly, initialSystemTime: startMs, fetchReturnValue: emptySlate });
		await goQuiet();

		const state = await debugState();
		expect(state.pollModes.nba).toBe('hebetudinous');
		expect(state.leagueIntervals.nba).toBe(pollHebetudinousMaxMs);
	});

	// The interval is the claim; this is the behaviour. Dormant would have polled ten times by the
	// first assertion below.
	test('and genuinely does not poll again until the ceiling is up', async () => {
		await loadBackground({ prefs: nbaOnly, initialSystemTime: startMs, fetchReturnValue: emptySlate });
		await goQuiet();

		fetchMock.mockClear();
		jest.advanceTimersByTime(pollHebetudinousMaxMs - 60_000);
		await drain();
		expect(fetchMock).not.toHaveBeenCalled();

		jest.advanceTimersByTime(120_000);
		await drain();
		expect(fetchMock).toHaveBeenCalled();
	});

	test('a league with a tip-off tonight stays on the dormant beat', async () => {
		await loadBackground({ prefs: nbaOnly, initialSystemTime: startMs, fetchReturnValue: emptySlate });
		lookahead().mockResolvedValue(startMs + 45 * 60_000);
		await goQuiet();

		const state = await debugState();
		expect(state.pollModes.nba).toBe('dormant');
		expect(state.leagueIntervals.nba).toBe(pollDormantMaxMs);
	});

	// The whole economy of the feature: one request has to buy the right to skip dozens, so it must
	// not be spent on every tick the way the poll it replaces was.
	test('the lookahead is spent once on the way in, not on every tick', async () => {
		await loadBackground({ prefs: nbaOnly, initialSystemTime: startMs, fetchReturnValue: emptySlate });
		await goQuiet();
		expect(lookahead()).toHaveBeenCalledTimes(1);
		expect(lookahead()).toHaveBeenCalledWith('nba');

		await pollOnce(pollHebetudinousMaxMs + 60_000);
		await pollOnce(pollHebetudinousMaxMs + 60_000);
		expect(lookahead()).toHaveBeenCalledTimes(1);
	});

	/* The report this was reopened on: MLB sat in hebetudinous at midday with first pitch at seven.
	   A league with a game on today's card is having a day whatever hour the popup is opened in, so
	   it stays on the dormant beat however far off the first pitch is. Driven off the poll's own
	   payload, which is where a real slate's kickoff comes from. */
	test('a game later today keeps the league dormant, however many hours off it is', async () => {
		const hours = [1, 5, 19];
		const seen: { hoursOut: number; mode: string; intervalMs: number }[] = [];
		for (const hoursOut of hours) {
			await loadBackground({
				prefs: nbaOnly,
				initialSystemTime: startMs,
				fetchReturnValue: { games: [scheduledGame(startMs + hoursOut * 60 * 60_000)], leagueLogos: {} },
			});
			await goQuiet();

			const state = await debugState();
			seen.push({ hoursOut, mode: state.pollModes.nba!, intervalMs: state.leagueIntervals.nba! });
		}
		// Collected rather than asserted in the loop so a failure names the hour that broke.
		expect(seen).toEqual(hours.map(hoursOut => ({ hoursOut, mode: 'dormant', intervalMs: pollDormantMaxMs })));
	});

	// Today's card comes back on the poll's own payload, so a league with a game later today has
	// already answered the question and the request is never made.
	test('a kickoff the poll itself carried costs no lookahead at all', async () => {
		await loadBackground({
			prefs: nbaOnly,
			initialSystemTime: startMs,
			fetchReturnValue: { games: [scheduledGame(startMs + 6 * 60 * 60_000)], leagueLogos: {} },
		});
		await goQuiet();

		expect(lookahead()).not.toHaveBeenCalled();
	});

	// The other half of the same rule: a lookahead that comes back with tomorrow's game is still
	// inside the horizon, so an empty card today is not on its own enough to sleep.
	test('an empty card with a game tomorrow is dormant, not asleep', async () => {
		await loadBackground({ prefs: nbaOnly, initialSystemTime: startMs, fetchReturnValue: emptySlate });
		lookahead().mockResolvedValue(startMs + 20 * 60 * 60_000);
		await goQuiet();

		expect(lookahead()).toHaveBeenCalledTimes(1);
		expect((await debugState()).pollModes.nba).toBe('dormant');
	});

	test('a game starting drops it straight back to eager', async () => {
		await loadBackground({ prefs: nbaOnly, initialSystemTime: startMs, fetchReturnValue: emptySlate });
		await goQuiet();
		expect((await debugState()).pollModes.nba).toBe('hebetudinous');

		fetchMock.mockResolvedValue({ games: [liveGame], leagueLogos: {} });
		await pollOnce(pollHebetudinousMaxMs + 60_000);

		const state = await debugState();
		expect(state.pollModes.nba).toBe('eager');
		expect(state.leagueIntervals.nba).toBeLessThanOrEqual(pollMaxEagerMs + 2_000);
	});

	// Failing to reach ESPN is not the same as ESPN saying nobody plays for two months, and the
	// difference is 27 minutes of not looking.
	test('a failed lookahead leaves the league dormant rather than asleep', async () => {
		await loadBackground({ prefs: nbaOnly, initialSystemTime: startMs, fetchReturnValue: emptySlate });
		lookahead().mockRejectedValue(new Error('503'));
		await goQuiet();

		const state = await debugState();
		expect(state.pollModes.nba).toBe('dormant');
		expect(state.leagueIntervals.nba).toBe(pollDormantMaxMs);
	});
});
