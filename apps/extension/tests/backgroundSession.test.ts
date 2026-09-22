import { createDefaultUserPreferences, normalizeUserPreferences, pollIntervalMs } from '@arenaswap/core/constants';
import type { Game, LeagueId, TabRegistration, UserPreferences } from '@arenaswap/core/types';

jest.mock('@porkyproductions/hat', () => ({
	// Always the maximum of the range, so timer delays are deterministic.
	randomInRange: jest.fn().mockImplementation((_min: number, max: number) => max),
}));

jest.mock('@arenaswap/core', () => ({
	...jest.requireActual('@arenaswap/core'),
	fetchGamesWithLeagueLogos: jest.fn(),
	fetchNextScheduledStart: jest.fn().mockResolvedValue(null),
	fetchWinProbability: jest.fn().mockResolvedValue([]),
	fetchTeamMonoLogos: jest.fn().mockResolvedValue({}),
}));

const flushPromises = () => new Promise<void>(r => setImmediate(r));
const drain = async (rounds = 12) => {
	for (let i = 0; i < rounds; i++) await flushPromises();
};

/* MV3 tears the service worker down whenever it goes idle — in practice within about thirty
   seconds of the last event — and builds a fresh one on the next wake. Everything the worker held
   in a closure is gone; only what it wrote to browser.storage comes back. `storage.session` in
   particular outlives the worker and dies with the browser, so this harness keeps one store across
   worker loads rather than handing each load a fixed snapshot. That is the difference between
   testing a restart and testing two unrelated boots. */
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

/** Boots a service worker against whatever the previous one left in storage. */
const startWorker = async ({ games, openTabIds, activeTabId, atMs }: StartOptions) => {
	jest.resetModules();
	jest.useFakeTimers({ doNotFake: ['setImmediate'] });
	jest.setSystemTime(atMs);

	tabsQuery = jest.fn();
	tabsUpdate = jest.fn().mockResolvedValue(undefined);
	onActivatedHandler = undefined;
	mockTabs(openTabIds, activeTabId);

	(globalThis as { defineBackground?: unknown }).defineBackground = (fn: () => void) => fn();
	(globalThis as { browser?: unknown }).browser = {
		storage: {
			sync: {
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
			sendMessage: jest.fn().mockResolvedValue(undefined),
			onMessage: { addListener: (h: (msg: unknown) => unknown) => { onMessageHandler = h; } },
		},
		tabs: {
			query: tabsQuery,
			update: tabsUpdate,
			remove: jest.fn().mockResolvedValue(undefined),
			onActivated: { addListener: (h: (info: { tabId: number }) => unknown) => { onActivatedHandler = h; } },
			onRemoved: { addListener: () => {} },
		},
		notifications: { create: jest.fn().mockResolvedValue(undefined) },
	};

	fetchMock = (require('@arenaswap/core') as { fetchGamesWithLeagueLogos: jest.Mock }).fetchGamesWithLeagueLogos;
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

// A one-possession game in the closing seconds against a thirty-point runaway with five minutes
// left: the gap is far wider than any sensitivity threshold, so only the cooldown can hold a
// switch back.
const thriller = (id: string) => mkGame(id, 100, 100, 4, 20);
const runaway = (id: string) => mkGame(id, 120, 90, 4, 300);

const earliestSnapshotMs = (history: unknown) => Math.min(
	...(history as Record<string, { timestamp: number }[]>).g1.map(snapshot => snapshot.timestamp),
);

const registry: TabRegistration[] = [{ gameId: 'g1', tabId: 2 }, { gameId: 'g2', tabId: 3 }];

const switchingPrefs: Partial<UserPreferences> = {
	enabled: true,
	enabledLeagues: ['nba' as LeagueId],
	// Sensitivity 7 is a threshold of 1 point, so the runaway/thriller gap always clears it.
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
	/* The user set a ten-minute cooldown because they hate being yanked between games. One minute
	   after a switch the worker idles out, which MV3 does constantly. The cooldown is the only
	   thing standing between them and another switch.

	   Green since `lastSwitchTime` started being written to and read back from session storage.
	   Delete the storage write or the rehydrate and this goes red again; both were checked. */
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

		// The user is now on g1's tab, and g1 falls apart while g2 becomes the game of the night.
		mockTabs([1, 2, 3], 2);
		setGames([runaway('g1'), thriller('g2')]);
		tabsUpdate.mockClear();

		jest.setSystemTime(1_060_000);
		await poll();
		expect(tabsUpdate).not.toHaveBeenCalledWith(3, { active: true });

		// The worker idles out here and a later event brings a fresh one up, two minutes into a
		// ten-minute cooldown.
		await startWorker({
			games: [runaway('g1'), thriller('g2')],
			openTabIds: [1, 2, 3],
			activeTabId: 2,
			atMs: 1_120_000,
		});

		await poll();

		expect(tabsUpdate).not.toHaveBeenCalledWith(3, { active: true });
	});

	/* The same user, a week later. Their clock ran an hour fast when a switch was recorded, then
	   NTP pulled it back. `Date.now() - lastSwitchTime` is now negative, which reads as a cooldown
	   that has not started counting yet, so every switch is refused for the whole hour of skew on
	   top of the ten minutes they asked for.

	   A finiteness check is not enough on its own: it rejects a string and lets a number through,
	   but a timestamp from the future is a finite number, and persisting the value means session
	   storage carries it across every worker restart rather than losing it on the next teardown.
	   Left unguarded the user sees auto-switching silently stop, with nothing in the UI to say why,
	   so anything negative or later than now reads as 0. */
	test('does not freeze switching when the stored switch time is in the future', async () => {
		seedStorage(switchingPrefs, { lastSwitchTime: 4_600_000 });

		await startWorker({
			games: [runaway('g1'), thriller('g2')],
			openTabIds: [1, 2, 3],
			activeTabId: 2,
			atMs: 1_700_000,
		});

		// Seven hundred seconds past the switch the clock misrecorded, so the ten-minute cooldown
		// is long over and g2 is the game of the night.
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

		// Watching g1 on tab 2: g2's tab is silenced, the watched one is not.
		expect(tabsUpdate).toHaveBeenCalledWith(3, { muted: true });
		expect(sessionStore.mutedTabIds).toEqual([3]);

		await startWorker({
			games: [thriller('g1'), runaway('g2')],
			openTabIds: [1, 2, 3],
			activeTabId: 2,
			atMs: 1_060_000,
		});

		// The user gives up and switches the extension off. Tab 3 was muted by a worker that no
		// longer exists, so only the session record can tell this one to let it speak again.
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

		// The popup drops g2's registration while the worker is down, so the new worker inherits a
		// muted tab that is no longer under its management.
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

	/* The boost is the user telling the extension "I care about this one". If it only lived in the
	   worker's memory it would evaporate minutes after they set it, and the switcher would quietly
	   go back to ignoring the game they asked for. */
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

		// g2 is the blowout. Only the restored boost can put it ahead of the one-possession game.
		expect(tabsUpdate).toHaveBeenCalledWith(3, { active: true });
		expect(tabsUpdate).not.toHaveBeenCalledWith(2, { active: true });
	});

	test('does not strand the user on the standby stream once a game wakes up again', async () => {
		seedStorage(
			{ ...switchingPrefs, cooldownSeconds: 0, standbyStreamEnabled: true, standbyStreamThreshold: 20 },
			{ standbyStreamTabId: 5 },
		);

		// Both games are runaways, under the threshold of 20, so the worker parks on standby.
		await startWorker({
			games: [runaway('g1'), runaway('g2')],
			openTabIds: [1, 2, 3, 5],
			activeTabId: 1,
			atMs: 1_000_000,
		});
		await poll();
		expect(tabsUpdate).toHaveBeenCalledWith(5, { active: true });

		// The worker dies while the user sits on standby. `onStandbyStream` was never written to
		// storage, so the fresh worker has to work out from the tab strip that it is parked.
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

	/* The wrap screen draws a chart of the whole game, and the worker will have been rebuilt
	   dozens of times before the final whistle. Re-applying the scorer's window on each wake would
	   shave the start off the chart every time, so by the end there would be nothing to draw. */
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

		// Two hours of play later, and a great many worker teardowns later.
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

		// Tab 2 holds the best game and closed with no worker alive to hear it.
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

		// A worker that wakes before the tab strip is queryable gets an empty answer. Treating
		// that as proof every tab closed would hand the user back a popup with nothing assigned.
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


/* One Saturday, four tabs, from the popup's point of view. Each of the rules below already has a
   test of its own; what this is for is the order they fire in when they all apply at once, which
   is the only way the user ever meets them. */
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

	// A late-and-level game against three that are not.
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
		// And silences the three it is not showing, while leaving the one on screen audible.
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

		// The tight game is settled and the other one goes to overtime, thirty seconds into a
		// two-minute cooldown.
		mockTabs([1, 2, 3, 4, 5], 3);
		setGames([runaway('blowout'), runaway('tight'), thriller('overtime'), mkGame('sleepy', 60, 52, 1, 700)]);
		tabsUpdate.mockClear();
		jest.setSystemTime(2_030_000);
		await poll();

		expect(tabsUpdate).not.toHaveBeenCalledWith(4, { active: true });

		// And takes it the moment the cooldown is up.
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

		// The user closes the tight game's tab and the extension has to stop offering it.
		mockTabs([1, 2, 4, 5], 1);
		setGames([runaway('blowout'), thriller('tight'), thriller('overtime'), mkGame('sleepy', 60, 52, 1, 700)]);
		tabsUpdate.mockClear();
		jest.setSystemTime(2_200_000);
		await poll();

		expect(tabsUpdate).not.toHaveBeenCalledWith(3, { active: true });
		expect(tabsUpdate).toHaveBeenCalledWith(4, { active: true });
	});

	// Two games reaching the same PowerScore in the same poll. Whichever way it breaks the tie, it
	// must not flip between the two on every tick — that is the thrash the cooldown exists to stop,
	// and a tie is the one case where the sensitivity threshold cannot separate them.
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
			// Still where the first poll put them, three polls later.
			expect(moved).toHaveLength(0);
		}
	});
});
