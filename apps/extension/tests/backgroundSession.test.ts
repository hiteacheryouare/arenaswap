import { createDefaultUserPreferences, normalizeUserPreferences, pollIntervalMs } from '@arenaswap/core/constants';
import type { Game, LeagueId, TabRegistration, UserPreferences } from '@arenaswap/core/types';

jest.mock('@porkyproductions/hat', () => ({
	randomInRange: jest.fn().mockImplementation((_min: number, max: number) => max),
}));

jest.mock('@arenaswap/sideline', () => ({
	...jest.requireActual('@arenaswap/sideline'),
	fetchGamesWithLeagueLogos: jest.fn(),
	fetchNextScheduledStart: jest.fn().mockResolvedValue(null),
	fetchWinProbability: jest.fn().mockResolvedValue([]),
	fetchCompetitionSituation: jest.fn().mockResolvedValue({}),
	fetchTeamMonoLogos: jest.fn().mockResolvedValue({}),
}));

const flushPromises = () => new Promise<void>(r => setImmediate(r));
const drain = async (rounds = 12) => {
	for (let i = 0; i < rounds; i++) await flushPromises();
};

let sessionStore: Record<string, unknown> = {};
let localStore: Record<string, unknown> = {};
let syncStore: Record<string, unknown> = {};

const readStore = (store: Record<string, unknown>, request: unknown): Record<string, unknown> => {
	if (typeof request === 'string') {
		return request in store ? { [request]: store[request] } : {};
	}
	const defaults = request as Record<string, unknown>;
	return Object.fromEntries(
		Object.entries(defaults).map(([key, fallback]) => [key, key in store ? store[key] : fallback]),
	);
};

let fetchMock: jest.Mock;
let tabsQuery: jest.Mock;
let tabsUpdate: jest.Mock;
let tabsCreate: jest.Mock;
let onCommandHandler: ((command: string) => unknown) | undefined;
let onMessageHandler!: (msg: unknown) => unknown;
let onActivatedHandler: ((info: { tabId: number }) => unknown) | undefined;

const mockTabs = (openTabIds: number[], activeTabId: number) => {
	tabsQuery.mockImplementation((query: unknown) => {
		if ((query as { active?: boolean }).active) return Promise.resolve([{ id: activeTabId }]);
		return Promise.resolve(openTabIds.map(id => ({ id, windowId: 1 })));
	});
};

const sendMessage = async (msg: unknown): Promise<unknown> => {
	const result = onMessageHandler(msg);
	await drain();
	return result;
};

interface StartOptions {
	games: Game[];
	openTabIds: number[];
	activeTabId: number;
	atMs: number;
}

const startWorker = async ({ games, openTabIds, activeTabId, atMs }: StartOptions) => {
	jest.resetModules();
	jest.useFakeTimers({ doNotFake: ['setImmediate'] });
	jest.setSystemTime(atMs);

	tabsQuery = jest.fn();
	tabsUpdate = jest.fn().mockResolvedValue(undefined);
	tabsCreate = jest.fn().mockResolvedValue(undefined);
	onActivatedHandler = undefined;
	mockTabs(openTabIds, activeTabId);

	(globalThis as { defineBackground?: unknown }).defineBackground = (fn: () => void) => fn();
	(globalThis as { browser?: unknown }).browser = {
		storage: {
			onChanged: { addListener: () => {} },
			sync: {
				onChanged: { addListener: () => {} },
				get: jest.fn().mockImplementation((request: unknown) => Promise.resolve(readStore(syncStore, request))),
				set: jest.fn().mockImplementation((patch: Record<string, unknown>) => {
					Object.assign(syncStore, patch);
					return Promise.resolve();
				}),
			},
			session: {
				get: jest.fn().mockImplementation((request: unknown) => Promise.resolve(readStore(sessionStore, request))),
				set: jest.fn().mockImplementation((patch: Record<string, unknown>) => {
					Object.assign(sessionStore, patch);
					return Promise.resolve();
				}),
			},
			local: {
				get: jest.fn().mockImplementation((request: unknown) => Promise.resolve(readStore(localStore, request))),
				set: jest.fn().mockImplementation((patch: Record<string, unknown>) => {
					Object.assign(localStore, patch);
					return Promise.resolve();
				}),
			},
		},
		runtime: {
			getPlatformInfo: jest.fn().mockResolvedValue({}),
			sendMessage: jest.fn().mockResolvedValue(undefined),
			onMessage: { addListener: (h: (msg: unknown) => unknown) => { onMessageHandler = h; } },
		},
		tabs: {
			query: tabsQuery,
			update: tabsUpdate,
			create: tabsCreate,
			remove: jest.fn().mockResolvedValue(undefined),
			onActivated: { addListener: (h: (info: { tabId: number }) => unknown) => { onActivatedHandler = h; } },
			onRemoved: { addListener: () => {} },
			onUpdated: { addListener: () => {} },
		},
		windows: {
			update: jest.fn().mockResolvedValue(undefined),
			get: jest.fn().mockResolvedValue({ id: 1, state: 'normal' }),
			getLastFocused: jest.fn().mockResolvedValue({ id: 1, state: 'normal' }),
		},
		commands: { onCommand: { addListener: (h: (command: string) => unknown) => { onCommandHandler = h; } } },
		alarms: { create: jest.fn(), clear: jest.fn(), onAlarm: { addListener: () => {} } },
		notifications: { create: jest.fn().mockResolvedValue(undefined) },
	};

	fetchMock = (require('@arenaswap/sideline') as { fetchGamesWithLeagueLogos: jest.Mock }).fetchGamesWithLeagueLogos;
	fetchMock.mockResolvedValue({ games, leagueLogos: {}, shedLeagues: [] });

	require('../entrypoints/background');
	await drain(16);
	tabsUpdate.mockClear();
};

const poll = async () => {
	jest.advanceTimersByTime(pollIntervalMs + 5_000);
	await drain(16);
};

const setGames = (games: Game[]) => {
	fetchMock.mockResolvedValue({ games, leagueLogos: {}, shedLeagues: [] });
};

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

const thriller = (id: string) => mkGame(id, 100, 100, 4, 20);
const runaway = (id: string) => mkGame(id, 120, 90, 4, 300);

const earliestSnapshotMs = (history: unknown) => Math.min(
	...(history as Record<string, { timestamp: number }[]>).g1.map(snapshot => snapshot.timestamp),
);

const registry: TabRegistration[] = [{ gameId: 'g1', tabId: 2 }, { gameId: 'g2', tabId: 3 }];

const switchingPrefs: Partial<UserPreferences> = {
	enabled: true,
	enabledLeagues: ['nba' as LeagueId],
	sensitivity: 7,
	switchDelaySeconds: 0,
	notificationsEnabled: false,
	cooldownSeconds: 600,
};

const seedStorage = (prefs: Partial<UserPreferences>, session: Record<string, unknown> = {}) => {
	sessionStore = { tabRegistry: registry, ...session };
	localStore = { demoMode: false };
	syncStore = { prefs: normalizeUserPreferences({ ...createDefaultUserPreferences(), ...prefs }) };
};

afterEach(() => {
	jest.useRealTimers();
});

describe('what survives the service worker being torn down', () => {
	test('keeps the cooldown running, so a restart does not hand back a free switch', async () => {
		seedStorage(switchingPrefs);

		await startWorker({
			games: [thriller('g1'), runaway('g2')],
			openTabIds: [1, 2, 3],
			activeTabId: 1,
			atMs: 1_000_000,
		});

		await poll();
		expect(tabsUpdate).toHaveBeenCalledWith(2, { active: true });

		mockTabs([1, 2, 3], 2);
		setGames([runaway('g1'), thriller('g2')]);
		tabsUpdate.mockClear();

		jest.setSystemTime(1_060_000);
		await poll();
		expect(tabsUpdate).not.toHaveBeenCalledWith(3, { active: true });

		await startWorker({
			games: [runaway('g1'), thriller('g2')],
			openTabIds: [1, 2, 3],
			activeTabId: 2,
			atMs: 1_120_000,
		});

		await poll();

		expect(tabsUpdate).not.toHaveBeenCalledWith(3, { active: true });
	});

	test('does not freeze switching when the stored switch time is in the future', async () => {
		seedStorage(switchingPrefs, { lastSwitchTime: 4_600_000 });

		await startWorker({
			games: [runaway('g1'), thriller('g2')],
			openTabIds: [1, 2, 3],
			activeTabId: 2,
			atMs: 1_700_000,
		});

		await poll();
		expect(tabsUpdate).toHaveBeenCalledWith(3, { active: true });
	});

	test('leaves the tabs it muted muted, and still knows to hand them back', async () => {
		seedStorage(switchingPrefs);

		await startWorker({
			games: [thriller('g1'), runaway('g2')],
			openTabIds: [1, 2, 3],
			activeTabId: 2,
			atMs: 1_000_000,
		});
		await poll();

		expect(tabsUpdate).toHaveBeenCalledWith(3, { muted: true });
		expect(sessionStore.mutedTabIds).toEqual([3]);

		await startWorker({
			games: [thriller('g1'), runaway('g2')],
			openTabIds: [1, 2, 3],
			activeTabId: 2,
			atMs: 1_060_000,
		});

		await sendMessage({
			type: 'UPDATE_PREFS',
			prefs: normalizeUserPreferences({ ...createDefaultUserPreferences(), ...switchingPrefs, enabled: false }),
		});

		expect(tabsUpdate).toHaveBeenCalledWith(3, { muted: false });
		expect(sessionStore.mutedTabIds).toEqual([]);
	});

	test('still hands a tab back unmuted when it stops being ours between workers', async () => {
		seedStorage(switchingPrefs);

		await startWorker({
			games: [thriller('g1'), runaway('g2')],
			openTabIds: [1, 2, 3],
			activeTabId: 2,
			atMs: 1_000_000,
		});
		await poll();
		expect(sessionStore.mutedTabIds).toEqual([3]);

		await startWorker({
			games: [thriller('g1')],
			openTabIds: [1, 2, 3],
			activeTabId: 2,
			atMs: 1_060_000,
		});
		await sendMessage({ type: 'UPDATE_REGISTRY', tabRegistry: [{ gameId: 'g1', tabId: 2 }] });

		expect(tabsUpdate).toHaveBeenCalledWith(3, { muted: false });
		expect(sessionStore.mutedTabIds).toEqual([]);
	});

	test('remembers a game boost the user set before the worker died', async () => {
		seedStorage(switchingPrefs);

		await startWorker({
			games: [thriller('g1'), runaway('g2')],
			openTabIds: [1, 2, 3],
			activeTabId: 1,
			atMs: 1_000_000,
		});
		await sendMessage({ type: 'SET_GAME_BOOST', gameId: 'g2', boost: 40 });

		await startWorker({
			games: [thriller('g1'), runaway('g2')],
			openTabIds: [1, 2, 3],
			activeTabId: 1,
			atMs: 1_060_000,
		});

		const state = await sendMessage({ type: 'GET_STATE' }) as { gameBoosts: Record<string, number> };
		expect(state.gameBoosts).toEqual({ g2: 40 });
	});

	test('and still lets that boost decide the switch after the restart', async () => {
		seedStorage(switchingPrefs);

		await startWorker({
			games: [thriller('g1'), runaway('g2')],
			openTabIds: [1, 2, 3],
			activeTabId: 1,
			atMs: 1_000_000,
		});
		await sendMessage({ type: 'SET_GAME_BOOST', gameId: 'g2', boost: 99 });

		await startWorker({
			games: [thriller('g1'), runaway('g2')],
			openTabIds: [1, 2, 3],
			activeTabId: 1,
			atMs: 1_060_000,
		});
		await poll();

		expect(tabsUpdate).toHaveBeenCalledWith(3, { active: true });
		expect(tabsUpdate).not.toHaveBeenCalledWith(2, { active: true });
	});

	test('does not strand the user on the standby stream once a game wakes up again', async () => {
		seedStorage(
			{ ...switchingPrefs, cooldownSeconds: 0, standbyStreamEnabled: true, standbyStreamThreshold: 20 },
			{ standbyStreamTabId: 5 },
		);

		await startWorker({
			games: [runaway('g1'), runaway('g2')],
			openTabIds: [1, 2, 3, 5],
			activeTabId: 1,
			atMs: 1_000_000,
		});
		await poll();
		expect(tabsUpdate).toHaveBeenCalledWith(5, { active: true });

		await startWorker({
			games: [runaway('g1'), thriller('g2')],
			openTabIds: [1, 2, 3, 5],
			activeTabId: 5,
			atMs: 1_060_000,
		});
		await poll();

		expect(tabsUpdate).toHaveBeenCalledWith(3, { active: true });
	});

	test('picks the standby stream back up rather than dropping the user into the least boring game', async () => {
		seedStorage(
			{ ...switchingPrefs, cooldownSeconds: 0, standbyStreamEnabled: true, standbyStreamThreshold: 20 },
			{ standbyStreamTabId: 5 },
		);

		await startWorker({
			games: [runaway('g1'), runaway('g2')],
			openTabIds: [1, 2, 3, 5],
			activeTabId: 5,
			atMs: 1_000_000,
		});
		await poll();

		expect(tabsUpdate).not.toHaveBeenCalledWith(2, { active: true });
		expect(tabsUpdate).not.toHaveBeenCalledWith(3, { active: true });
	});

	test('keeps tip-off in the chart history across a restart, so the wrap screen can draw it', async () => {
		const tipOff = 1_000_000;
		seedStorage({ ...switchingPrefs, keepFinalGames: true });

		await startWorker({
			games: [thriller('g1')],
			openTabIds: [1, 2],
			activeTabId: 1,
			atMs: tipOff,
		});
		await poll();
		await poll();

		expect(earliestSnapshotMs(sessionStore.scoreHistory)).toBeLessThanOrEqual(tipOff + 1_000);

		await startWorker({
			games: [thriller('g1')],
			openTabIds: [1, 2],
			activeTabId: 1,
			atMs: tipOff + 2 * 60 * 60 * 1000,
		});
		await poll();

		expect(earliestSnapshotMs(sessionStore.scoreHistory)).toBeLessThanOrEqual(tipOff + 1_000);
	});

	test('forgets a tab that closed while nothing was listening, before it can win a switch', async () => {
		seedStorage({ ...switchingPrefs, cooldownSeconds: 0 });

		await startWorker({
			games: [thriller('g1'), runaway('g2')],
			openTabIds: [1, 2, 3],
			activeTabId: 1,
			atMs: 1_000_000,
		});

		await startWorker({
			games: [thriller('g1'), runaway('g2')],
			openTabIds: [1, 3],
			activeTabId: 1,
			atMs: 1_060_000,
		});
		await poll();

		expect(tabsUpdate).not.toHaveBeenCalledWith(2, { active: true });
		expect(tabsUpdate).toHaveBeenCalledWith(3, { active: true });
		expect(sessionStore.tabRegistry).toEqual([{ gameId: 'g2', tabId: 3 }]);
	});

	test('does not wipe a registry it briefly could not see', async () => {
		seedStorage(switchingPrefs);

		await startWorker({
			games: [thriller('g1'), runaway('g2')],
			openTabIds: [1, 2, 3],
			activeTabId: 1,
			atMs: 1_000_000,
		});

		jest.resetModules();
		tabsQuery = jest.fn().mockResolvedValue([]);
		await startWorker({
			games: [thriller('g1'), runaway('g2')],
			openTabIds: [],
			activeTabId: 1,
			atMs: 1_060_000,
		});

		const state = await sendMessage({ type: 'GET_DEBUG_STATE' }) as { tabRegistry: TabRegistration[] };
		expect(state.tabRegistry).toEqual(registry);
	});

	test('starts the cooldown when the user lands on a game tab by hand after a restart', async () => {
		seedStorage(switchingPrefs);

		await startWorker({
			games: [thriller('g1'), runaway('g2')],
			openTabIds: [1, 2, 3],
			activeTabId: 1,
			atMs: 1_000_000,
		});

		onActivatedHandler?.({ tabId: 3 });
		await drain();

		const state = await sendMessage({ type: 'GET_DEBUG_STATE' }) as { lastSwitchTime: number };
		expect(state.lastSwitchTime).toBe(1_000_000);
	});
});

describe('a Saturday afternoon with four games on', () => {
	const fourGames: TabRegistration[] = [
		{ gameId: 'blowout', tabId: 2 },
		{ gameId: 'tight', tabId: 3 },
		{ gameId: 'overtime', tabId: 4 },
		{ gameId: 'sleepy', tabId: 5 },
	];

	const saturdayPrefs: Partial<UserPreferences> = {
		...switchingPrefs,
		cooldownSeconds: 120,
	};

	const seedSaturday = () => {
		sessionStore = { tabRegistry: fourGames };
		localStore = { demoMode: false };
		syncStore = { prefs: normalizeUserPreferences({ ...createDefaultUserPreferences(), ...saturdayPrefs }) };
	};

	const earlyAfternoon = () => [
		runaway('blowout'),
		thriller('tight'),
		mkGame('overtime', 88, 84, 2, 600),
		mkGame('sleepy', 60, 52, 1, 700),
	];

	test('lands on the one game that is actually worth watching', async () => {
		seedSaturday();
		await startWorker({
			games: earlyAfternoon(),
			openTabIds: [1, 2, 3, 4, 5],
			activeTabId: 1,
			atMs: 2_000_000,
		});

		await poll();

		expect(tabsUpdate).toHaveBeenCalledWith(3, { active: true });
		expect(tabsUpdate).toHaveBeenCalledWith(2, { muted: true });
		expect(tabsUpdate).toHaveBeenCalledWith(4, { muted: true });
		expect(tabsUpdate).toHaveBeenCalledWith(5, { muted: true });
	});

	test('sits still while the cooldown runs, however loud another game gets', async () => {
		seedSaturday();
		await startWorker({
			games: earlyAfternoon(),
			openTabIds: [1, 2, 3, 4, 5],
			activeTabId: 1,
			atMs: 2_000_000,
		});
		await poll();
		expect(tabsUpdate).toHaveBeenCalledWith(3, { active: true });

		mockTabs([1, 2, 3, 4, 5], 3);
		setGames([runaway('blowout'), runaway('tight'), thriller('overtime'), mkGame('sleepy', 60, 52, 1, 700)]);
		tabsUpdate.mockClear();
		jest.setSystemTime(2_030_000);
		await poll();

		expect(tabsUpdate).not.toHaveBeenCalledWith(4, { active: true });

		jest.setSystemTime(2_200_000);
		await poll();

		expect(tabsUpdate).toHaveBeenCalledWith(4, { active: true });
	});

	test('does not follow a game whose tab the user closed by hand', async () => {
		seedSaturday();
		await startWorker({
			games: earlyAfternoon(),
			openTabIds: [1, 2, 3, 4, 5],
			activeTabId: 1,
			atMs: 2_000_000,
		});
		await poll();

		mockTabs([1, 2, 4, 5], 1);
		setGames([runaway('blowout'), thriller('tight'), thriller('overtime'), mkGame('sleepy', 60, 52, 1, 700)]);
		tabsUpdate.mockClear();
		jest.setSystemTime(2_200_000);
		await poll();

		expect(tabsUpdate).not.toHaveBeenCalledWith(3, { active: true });
		expect(tabsUpdate).toHaveBeenCalledWith(4, { active: true });
	});

	test('settles on one of two games that peak together instead of bouncing between them', async () => {
		seedSaturday();
		const tiedSlate = () => [thriller('tight'), thriller('overtime'), runaway('blowout'), runaway('sleepy')];

		await startWorker({
			games: tiedSlate(),
			openTabIds: [1, 2, 3, 4, 5],
			activeTabId: 1,
			atMs: 2_000_000,
		});
		await poll();

		const firstPick = tabsUpdate.mock.calls
			.filter(([, patch]) => (patch as { active?: boolean }).active)
			.at(-1)?.[0] as number;
		expect([3, 4]).toContain(firstPick);

		mockTabs([1, 2, 3, 4, 5], firstPick);
		for (const at of [2_200_000, 2_400_000, 2_600_000]) {
			tabsUpdate.mockClear();
			setGames(tiedSlate());
			jest.setSystemTime(at);
			await poll();
			const moved = tabsUpdate.mock.calls.filter(([, patch]) => (patch as { active?: boolean }).active);
			expect(moved).toHaveLength(0);
		}
	});
});

describe('the boss button', () => {
	const bossIsComing = () => onCommandHandler!('boss-button');

	const startWatching = async (atMs = 1_000_000) => {
		seedStorage(switchingPrefs);
		await startWorker({ games: [thriller('g1'), runaway('g2')], openTabIds: [1, 2, 3], activeTabId: 2, atMs });
	};

	test('mutes every tab it manages, the one being watched included, and opens a plain tab', async () => {
		await startWatching();

		await bossIsComing();
		await drain();

		expect(tabsUpdate).toHaveBeenCalledWith(2, { muted: true });
		expect(tabsUpdate).toHaveBeenCalledWith(3, { muted: true });
		expect(tabsCreate).toHaveBeenCalledWith({});
	});

	test('pauses auto-switching, so the next poll does not jump back to a game', async () => {
		await startWatching();
		await bossIsComing();
		await drain();
		tabsUpdate.mockClear();

		mockTabs([1, 2, 3, 4], 4);
		await poll();

		expect(tabsUpdate).not.toHaveBeenCalledWith(expect.anything(), { active: true });
		expect(tabsUpdate).not.toHaveBeenCalledWith(expect.anything(), { muted: false });
		const stored = syncStore.prefs as { enabled: boolean };
		expect(stored.enabled).toBe(false);
	});

	test('stays quiet across a service worker restart', async () => {
		await startWatching();
		await bossIsComing();
		await drain();

		await startWorker({ games: [thriller('g1'), runaway('g2')], openTabIds: [1, 2, 3, 4], activeTabId: 4, atMs: 1_060_000 });
		await poll();
		await onActivatedHandler!({ tabId: 2 });
		await drain();

		expect(tabsUpdate).toHaveBeenCalledWith(2, { muted: true });
		expect(tabsUpdate).not.toHaveBeenCalledWith(expect.anything(), { muted: false });
	});

	test('keeps every tab muted while hushed, even one the user unmuted by hand', async () => {
		await startWatching();
		await bossIsComing();
		await drain();
		tabsUpdate.mockClear();

		mockTabs([1, 2, 3, 4], 2);
		await onActivatedHandler!({ tabId: 2 });
		await drain();

		expect(tabsUpdate).toHaveBeenCalledWith(2, { muted: true });
	});

	test('lets go of the hush when auto-switching came back on without a message reaching the worker', async () => {
		await startWatching();
		await bossIsComing();
		await drain();

		const resumed = { prefs: normalizeUserPreferences({ ...createDefaultUserPreferences(), ...switchingPrefs, enabled: true }), prefsUpdatedAt: 2_000_000 };
		syncStore = { ...resumed };
		localStore = { ...localStore, ...resumed };
		await startWorker({ games: [thriller('g1'), runaway('g2')], openTabIds: [1, 2, 3, 4], activeTabId: 2, atMs: 1_060_000 });
		await poll();

		expect(tabsUpdate).not.toHaveBeenCalledWith(2, { muted: true });
		expect(tabsUpdate).toHaveBeenCalledWith(3, { muted: true });
		expect(sessionStore.bossHushed).toBe(false);
	});

	test('is not undone by a switch that was already on its way when it was pressed', async () => {
		seedStorage(switchingPrefs);
		await startWorker({ games: [runaway('g1'), thriller('g2')], openTabIds: [1, 2, 3], activeTabId: 2, atMs: 1_000_000 });

		let tabListQueries = 0;
		tabsQuery.mockImplementation((query: unknown) => {
			if ((query as { active?: boolean }).active) return Promise.resolve([{ id: 2 }]);
			tabListQueries += 1;
			if (tabListQueries === 2) void bossIsComing();
			return Promise.resolve([1, 2, 3].map(id => ({ id, windowId: 1 })));
		});
		await poll();
		await drain();

		expect(tabsUpdate).not.toHaveBeenCalledWith(expect.anything(), { active: true });
		expect(tabsUpdate).toHaveBeenCalledWith(2, { muted: true });
		expect(tabsUpdate).toHaveBeenCalledWith(3, { muted: true });
		expect(sessionStore.bossHushed).toBe(true);

		tabsUpdate.mockClear();
		mockTabs([1, 2, 3, 4], 4);
		await poll();

		expect(tabsUpdate).not.toHaveBeenCalledWith(expect.anything(), { muted: false });
		expect(tabsUpdate).not.toHaveBeenCalledWith(expect.anything(), { active: true });
	});

	test('answers to the popup button the same way as to the shortcut', async () => {
		await startWatching();

		await sendMessage({ type: 'BOSS_BUTTON' });

		expect(tabsUpdate).toHaveBeenCalledWith(2, { muted: true });
		expect(tabsUpdate).toHaveBeenCalledWith(3, { muted: true });
	});

	test('goes back to normal when the user turns auto-switching back on', async () => {
		await startWatching();
		await bossIsComing();
		await drain();
		tabsUpdate.mockClear();
		mockTabs([1, 2, 3], 2);

		await sendMessage({ type: 'UPDATE_PREFS', prefs: normalizeUserPreferences({ ...createDefaultUserPreferences(), ...switchingPrefs, enabled: true }) });

		expect(tabsUpdate).toHaveBeenCalledWith(2, { muted: false });
		expect(sessionStore.bossHushed).toBe(false);
	});

	test('takes the user to a tab already on the decoy page instead of opening another', async () => {
		seedStorage({ ...switchingPrefs, bossDecoyUrl: 'docs.google.com/spreadsheets/d/abc123/edit' });
		await startWorker({ games: [thriller('g1'), runaway('g2')], openTabIds: [1, 2, 3], activeTabId: 2, atMs: 1_000_000 });
		tabsQuery.mockImplementation((query: unknown) => {
			if ((query as { active?: boolean }).active) return Promise.resolve([{ id: 2 }]);
			return Promise.resolve([
				{ id: 1, windowId: 1, url: 'https://example.com/' },
				{ id: 8, windowId: 5, url: 'https://docs.google.com/spreadsheets/d/abc123/edit#gid=2' },
			]);
		});

		await bossIsComing();
		await drain();

		expect(tabsUpdate).toHaveBeenCalledWith(8, { active: true });
		expect(tabsCreate).not.toHaveBeenCalled();
	});
});
