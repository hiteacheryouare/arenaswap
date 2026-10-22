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
	fetchTeamMonoLogos: jest.fn().mockResolvedValue({}),
	fetchCompetitionSituation: jest.fn().mockResolvedValue({}),
	fetchLeagueStandings: jest.fn().mockResolvedValue({}),
}));

const flushPromises = () => new Promise<void>(r => setImmediate(r));
const drain = async (rounds = 16) => {
	for (let i = 0; i < rounds; i++) await flushPromises();
};

/* Chrome's storage areas serialise what they are given: `undefined` properties vanish and NaN
   comes back as null. Every write here goes through the same JSON round trip, so a value the worker
   writes and cannot read back fails here the way it does in the browser. */
let sessionStore: Record<string, unknown> = {};
let localStore: Record<string, unknown> = {};
let syncStore: Record<string, unknown> = {};

const readStore = (store: Record<string, unknown>, request: unknown): Record<string, unknown> => {
	if (typeof request === 'string') return request in store ? { [request]: store[request] } : {};
	const defaults = request as Record<string, unknown>;
	return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => [key, key in store ? store[key] : fallback]));
};

const storageArea = (store: () => Record<string, unknown>) => ({
	get: jest.fn().mockImplementation((request: unknown) => Promise.resolve(readStore(store(), request))),
	set: jest.fn().mockImplementation((patch: Record<string, unknown>) => {
		Object.assign(store(), JSON.parse(JSON.stringify(patch)));
		return Promise.resolve();
	}),
});

let fetchMock: jest.Mock;
let tabsQuery: jest.Mock;
let tabsUpdate: jest.Mock;
let notificationsCreate: jest.Mock;
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
	notificationsCreate = jest.fn().mockResolvedValue(undefined);
	onActivatedHandler = undefined;
	mockTabs(openTabIds, activeTabId);

	(globalThis as { defineBackground?: unknown }).defineBackground = (fn: () => void) => fn();
	(globalThis as { browser?: unknown }).browser = {
		storage: {
			sync: storageArea(() => syncStore),
			session: storageArea(() => sessionStore),
			local: storageArea(() => localStore),
		},
		runtime: {
			sendMessage: jest.fn().mockResolvedValue(undefined),
			onMessage: { addListener: (h: (msg: unknown) => unknown) => { onMessageHandler = h; } },
		},
		tabs: {
			query: tabsQuery,
			update: tabsUpdate,
			create: jest.fn().mockResolvedValue(undefined),
			remove: jest.fn().mockResolvedValue(undefined),
			onActivated: { addListener: (h: (info: { tabId: number }) => unknown) => { onActivatedHandler = h; } },
			onRemoved: { addListener: () => {} },
		},
		windows: {
			update: jest.fn().mockResolvedValue(undefined),
			get: jest.fn().mockResolvedValue({ id: 1, state: 'normal' }),
			getLastFocused: jest.fn().mockResolvedValue({ id: 1, state: 'normal' }),
		},
		commands: { onCommand: { addListener: () => {} } },
		notifications: { create: notificationsCreate },
		i18n: { getUILanguage: () => 'en-US' },
	};

	fetchMock = (require('@arenaswap/sideline') as { fetchGamesWithLeagueLogos: jest.Mock }).fetchGamesWithLeagueLogos;
	fetchMock.mockResolvedValue({ games, leagueLogos: {}, shedLeagues: [] });

	require('../entrypoints/background');
	await drain();
	tabsUpdate.mockClear();
	notificationsCreate.mockClear();
};

const poll = async () => {
	jest.advanceTimersByTime(pollIntervalMs + 5_000);
	await drain();
};

const setGames = (games: Game[]) => {
	fetchMock.mockResolvedValue({ games, leagueLogos: {}, shedLeagues: [] });
};

const activations = (): number[] => tabsUpdate.mock.calls
	.filter(([, patch]) => (patch as { active?: boolean }).active)
	.map(([tabId]) => tabId as number);

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

const registry: TabRegistration[] = [{ gameId: 'g1', tabId: 2 }, { gameId: 'g2', tabId: 3 }];
const standbyTabId = 5;
const allTabs = [1, 2, 3, standbyTabId];

const standbyPrefs: Partial<UserPreferences> = {
	enabled: true,
	enabledLeagues: ['nba' as LeagueId],
	sensitivity: 7,
	switchDelaySeconds: 0,
	notificationsEnabled: false,
	cooldownSeconds: 600,
	standbyStreamEnabled: true,
	standbyStreamThreshold: 20,
};

const seedStorage = (prefs: Partial<UserPreferences>, session: Record<string, unknown> = {}) => {
	sessionStore = { tabRegistry: registry, standbyStreamTabId: standbyTabId, ...session };
	localStore = { demoMode: false };
	syncStore = { prefs: normalizeUserPreferences({ ...createDefaultUserPreferences(), ...prefs }) };
};

afterEach(() => {
	jest.useRealTimers();
});

describe('an evening parked on the standby stream', () => {
	test('stays put through a long quiet stretch instead of re-activating the standby tab every poll', async () => {
		seedStorage(standbyPrefs);
		await startWorker({ games: [runaway('g1'), runaway('g2')], openTabIds: allTabs, activeTabId: 1, atMs: 1_000_000 });

		await poll();
		expect(activations()).toEqual([standbyTabId]);

		mockTabs(allTabs, standbyTabId);
		tabsUpdate.mockClear();
		for (let i = 0; i < 4; i++) await poll();

		expect(activations()).toEqual([]);
		// The stream plays and both games stay silent behind it.
		const lastMute = (tabId: number) => tabsUpdate.mock.calls.filter(([id, patch]) => id === tabId && 'muted' in (patch as object)).at(-1)?.[1];
		expect(lastMute(standbyTabId)).toEqual({ muted: false });
		expect(lastMute(2)).toEqual({ muted: true });
		expect(lastMute(3)).toEqual({ muted: true });
	});

	test('tells the user it parked them, under the one notification id every switch shares', async () => {
		seedStorage({ ...standbyPrefs, notificationsEnabled: true });
		await startWorker({ games: [runaway('g1'), runaway('g2')], openTabIds: allTabs, activeTabId: 1, atMs: 1_000_000 });

		await poll();

		expect(activations()).toEqual([standbyTabId]);
		expect(notificationsCreate).toHaveBeenCalledWith('arenaswap-switch', expect.objectContaining({
			title: 'Parked on Standby Stream',
			message: 'Every game went quiet.',
		}));
	});

	test('lets a game that wakes up pull the user off standby without waiting out a cooldown', async () => {
		seedStorage(standbyPrefs);
		await startWorker({ games: [runaway('g1'), runaway('g2')], openTabIds: allTabs, activeTabId: 1, atMs: 1_000_000 });
		await poll();
		expect(activations()).toEqual([standbyTabId]);

		// Inside a ten-minute cooldown, g2 goes to the wire.
		mockTabs(allTabs, standbyTabId);
		setGames([runaway('g1'), thriller('g2')]);
		tabsUpdate.mockClear();
		for (let i = 0; i < 2; i++) await poll();

		expect(activations()).toEqual([3]);
	});

	test('a user who picks a quiet game by hand keeps it for the cooldown, then goes back to standby', async () => {
		seedStorage(standbyPrefs);
		await startWorker({ games: [runaway('g1'), runaway('g2')], openTabIds: allTabs, activeTabId: 1, atMs: 1_000_000 });
		await poll();
		expect(activations()).toEqual([standbyTabId]);

		// They would rather watch g1 anyway. Landing on a game tab by hand starts the cooldown, which
		// is what is supposed to stop the next poll overriding the choice.
		mockTabs(allTabs, 2);
		onActivatedHandler?.({ tabId: 2 });
		await drain();
		const { lastSwitchTime } = await sendMessage({ type: 'GET_DEBUG_STATE' }) as { lastSwitchTime: number };
		tabsUpdate.mockClear();

		for (let i = 0; i < 6; i++) await poll();
		expect(activations()).toEqual([]);

		jest.setSystemTime(lastSwitchTime + 601_000);
		for (let i = 0; i < 2; i++) await poll();
		expect(activations()).toEqual([standbyTabId]);
	});
});

describe('a switch waiting out its delay while the games go quiet', () => {
	test('is dropped when the popup refreshes the scores to quiet, instead of landing on the least boring game', async () => {
		seedStorage({ ...standbyPrefs, cooldownSeconds: 0, switchDelaySeconds: 10 });
		await startWorker({ games: [thriller('g1'), runaway('g2')], openTabIds: allTabs, activeTabId: 1, atMs: 1_000_000 });

		await poll();
		const queued = await sendMessage({ type: 'GET_DEBUG_STATE' }) as { pendingSwitch: { tabId: number } | null };
		expect(queued.pendingSwitch).toEqual(expect.objectContaining({ tabId: 2 }));

		// The user opens the popup inside the delay, which refreshes without switching, and g1 has
		// fallen apart since.
		setGames([runaway('g1'), runaway('g2')]);
		await sendMessage({ type: 'GET_STATE', forceRefresh: true });
		jest.advanceTimersByTime(10_000);
		await drain();

		expect(activations()).not.toContain(2);
		expect(activations()).not.toContain(3);
	});
});

const stamps = (history: unknown[]) => history.map(snapshot => (snapshot as { timestamp: number }).timestamp);

describe('the PowerScore chart across a worker restart', () => {
	const scoringModes = ['classic', 'blowouts', 'fantasy'] as const;

	test.each(scoringModes)('keeps every %s snapshot it wrote, through real storage serialisation', async scoringMode => {
		seedStorage({ ...standbyPrefs, standbyStreamEnabled: false, cooldownSeconds: 0, scoringMode });
		const quarter = [mkGame('g1', 88, 84, 3, 400), mkGame('g2', 70, 52, 3, 300)];
		await startWorker({ games: quarter, openTabIds: allTabs, activeTabId: 2, atMs: 1_000_000 });

		for (const [home, clock] of [[90, 360], [92, 300], [95, 240], [95, 180]] as const) {
			setGames([mkGame('g1', home, 84, 3, clock), mkGame('g2', 72, 52, 3, clock)]);
			await poll();
		}
		const before = await sendMessage({ type: 'GET_STATE' }) as { powerScoreHistory: Record<string, unknown[]> };
		expect(before.powerScoreHistory.g1!.length).toBeGreaterThanOrEqual(4);

		await startWorker({ games: [mkGame('g1', 95, 84, 3, 180), mkGame('g2', 72, 52, 3, 180)], openTabIds: allTabs, activeTabId: 2, atMs: Date.now() + 5_000 });
		const after = await sendMessage({ type: 'GET_STATE' }) as { powerScoreHistory: Record<string, unknown[]> };

		for (const gameId of ['g1', 'g2']) {
			expect(stamps(after.powerScoreHistory[gameId]!)).toEqual(expect.arrayContaining(stamps(before.powerScoreHistory[gameId]!)));
		}
	});
});
