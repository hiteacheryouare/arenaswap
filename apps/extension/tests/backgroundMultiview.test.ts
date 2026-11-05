import { createDefaultUserPreferences, normalizeUserPreferences, pollIntervalMs } from '@arenaswap/core/constants';
import type { Game, LeagueId, MultiviewLineup, TabRegistration, UserPreferences } from '@arenaswap/core/types';
import { multiviewSoloGraceMs } from '../utils/multiview';

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

let sessionStore: Record<string, unknown> = {};
let syncStore: Record<string, unknown> = {};

const storageArea = (store: () => Record<string, unknown>) => ({
	get: jest.fn().mockImplementation((request: unknown) => {
		const defaults = request as Record<string, unknown>;
		return Promise.resolve(Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => [key, key in store() ? store()[key] : fallback])));
	}),
	set: jest.fn().mockImplementation((patch: Record<string, unknown>) => {
		Object.assign(store(), JSON.parse(JSON.stringify(patch)));
		return Promise.resolve();
	}),
});

const multiviewTabId = 50;
const watchedTabId = 1;

let fetchMock: jest.Mock;
let tabsUpdate: jest.Mock;
let tabsCreate: jest.Mock;
let tabsRemove: jest.Mock;
let tabsMove: jest.Mock;
let sessionRules: jest.Mock;
let registerScripts: jest.Mock;
let permissionsContains: jest.Mock;
let openTabIds: number[] = [];
let activeTabId = watchedTabId;
let onMessageHandler!: (msg: unknown, sender: unknown) => unknown;
let onRemovedHandler!: (tabId: number) => unknown;
let onUpdatedHandler!: (tabId: number, changeInfo: { url?: string }) => unknown;
let notificationsCreate: jest.Mock;

const tabFor = (id: number) => ({ id, windowId: 1, index: id, url: id === multiviewTabId ? 'chrome-extension://x/multiview.html' : `https://stream.example/${id}` });

const sendMessage = async (msg: unknown, senderTabId?: number): Promise<unknown> => {
	const result = await onMessageHandler(msg, { tab: senderTabId === undefined ? undefined : { id: senderTabId } });
	await drain();
	return result;
};

const startWorker = async (games: Game[], prefs: Partial<UserPreferences>) => {
	jest.resetModules();
	jest.useFakeTimers({ doNotFake: ['setImmediate'] });
	jest.setSystemTime(1_000_000);

	openTabIds = [watchedTabId, 2, 3];
	activeTabId = watchedTabId;
	tabsUpdate = jest.fn().mockImplementation((tabId: number, patch: { active?: boolean }) => {
		if (patch.active) activeTabId = tabId;
		return Promise.resolve();
	});
	tabsCreate = jest.fn().mockImplementation(() => {
		openTabIds.push(multiviewTabId);
		return Promise.resolve({ id: multiviewTabId });
	});
	tabsRemove = jest.fn().mockImplementation((tabId: number) => {
		openTabIds = openTabIds.filter(id => id !== tabId);
		return Promise.resolve();
	});
	tabsMove = jest.fn().mockResolvedValue(undefined);
	sessionRules = jest.fn().mockResolvedValue(undefined);
	registerScripts = jest.fn().mockResolvedValue(undefined);
	permissionsContains = jest.fn().mockResolvedValue(true);
	notificationsCreate = jest.fn().mockResolvedValue(undefined);

	sessionStore = { tabRegistry: [{ gameId: 'g2', tabId: 2 }, { gameId: 'g3', tabId: 3 }] satisfies TabRegistration[] };
	syncStore = { prefs: normalizeUserPreferences({ ...createDefaultUserPreferences(), ...prefs }) };

	(globalThis as { defineBackground?: unknown }).defineBackground = (fn: () => void) => fn();
	(globalThis as { browser?: unknown }).browser = {
		storage: {
			onChanged: { addListener: () => {} },
			sync: { ...storageArea(() => syncStore), onChanged: { addListener: () => {} } },
			session: storageArea(() => sessionStore),
			local: storageArea(() => ({ demoMode: false })),
		},
		runtime: {
			getPlatformInfo: jest.fn().mockResolvedValue({}),
			getManifest: () => ({ permissions: ['tabs', 'declarativeNetRequestWithHostAccess', 'scripting'] }),
			getURL: (path: string) => `chrome-extension://x${path}`,
			sendMessage: jest.fn().mockResolvedValue(undefined),
			onMessage: { addListener: (h: typeof onMessageHandler) => { onMessageHandler = h; } },
		},
		permissions: { contains: permissionsContains },
		declarativeNetRequest: { updateSessionRules: sessionRules },
		scripting: {
			getRegisteredContentScripts: jest.fn().mockResolvedValue([]),
			registerContentScripts: registerScripts,
			unregisterContentScripts: jest.fn().mockResolvedValue(undefined),
		},
		tabs: {
			query: jest.fn().mockImplementation((query: { active?: boolean }) => (
				Promise.resolve(query.active ? [{ id: activeTabId }] : openTabIds.map(tabFor))
			)),
			update: tabsUpdate,
			create: tabsCreate,
			remove: tabsRemove,
			move: tabsMove,
			onActivated: { addListener: () => {} },
			onRemoved: { addListener: (h: typeof onRemovedHandler) => { onRemovedHandler = h; } },
			onUpdated: { addListener: (h: typeof onUpdatedHandler) => { onUpdatedHandler = h; } },
		},
		windows: {
			update: jest.fn().mockResolvedValue(undefined),
			get: jest.fn().mockResolvedValue({ id: 1, state: 'normal' }),
			getLastFocused: jest.fn().mockResolvedValue({ id: 1, state: 'normal' }),
		},
		commands: { onCommand: { addListener: () => {} } },
		alarms: { create: jest.fn(), clear: jest.fn(), onAlarm: { addListener: () => {} } },
		notifications: { create: notificationsCreate, clear: jest.fn().mockResolvedValue(undefined) },
		i18n: { getUILanguage: () => 'en-US' },
	};

	fetchMock = (require('@arenaswap/sideline') as { fetchGamesWithLeagueLogos: jest.Mock }).fetchGamesWithLeagueLogos;
	fetchMock.mockResolvedValue({ games, leagueLogos: {}, shedLeagues: [] });

	require('../entrypoints/background');
	await drain();
};

const poll = async () => {
	jest.advanceTimersByTime(pollIntervalMs + 5_000);
	await drain();
};

const pollThrough = async (ms: number) => {
	for (let waited = 0; waited < ms; waited += pollIntervalMs + 5_000) await poll();
};

const mkGame = (id: string, home: number, away: number, clockSeconds: number): Game => ({
	id,
	league: 'nba' as LeagueId,
	sportType: 'basketball',
	status: 'in',
	homeTeam: { id: `${id}-h`, name: 'Home', abbreviation: 'HOM', score: home },
	awayTeam: { id: `${id}-a`, name: 'Away', abbreviation: 'AWY', score: away },
	period: 4,
	clockSeconds,
});

const thriller = (id: string) => mkGame(id, 100, 100, 20);
const runaway = (id: string) => mkGame(id, 120, 90, 300);
// A few points under the default Exciting line, inside the 10 that warm Multiview up.
const closeBehind = (id: string) => mkGame(id, 100, 96, 200);

const multiviewPrefs: Partial<UserPreferences> = {
	enabled: true,
	enabledLeagues: ['nba' as LeagueId],
	sensitivity: 7,
	cooldownSeconds: 0,
	switchDelaySeconds: 0,
	notificationsEnabled: false,
	multiviewEnabled: true,
	multiviewThreshold: 65,
};

const activations = (): number[] => tabsUpdate.mock.calls
	.filter(([, patch]) => (patch as { active?: boolean }).active)
	.map(([tabId]) => tabId as number);

const lastMute = (tabId: number) => tabsUpdate.mock.calls.filter(([id, patch]) => id === tabId && 'muted' in (patch as object)).at(-1)?.[1];

afterEach(() => {
	jest.useRealTimers();
});

describe('Multiview in the background', () => {
	test('switches to Multiview the moment two games are exciting, shows the one left alone when one cools, then hands back', async () => {
		await startWorker([thriller('g2'), thriller('g3')], multiviewPrefs);
		await poll();

		expect(tabsCreate).toHaveBeenCalledWith(expect.objectContaining({ url: 'chrome-extension://x/multiview.html', active: false, windowId: 1, index: 2 }));
		// The frame rule is held to the Multiview tab alone, and is in place before the tab is shown.
		expect(sessionRules).toHaveBeenCalledWith(expect.objectContaining({
			addRules: [expect.objectContaining({ id: multiviewTabId, condition: { tabIds: [multiviewTabId], resourceTypes: ['sub_frame'] } })],
		}));
		expect(registerScripts).toHaveBeenCalledWith([expect.objectContaining({ js: ['multiviewFrame.js'], allFrames: true })]);
		expect(activations()).toEqual([multiviewTabId]);
		expect(lastMute(multiviewTabId)).toEqual({ muted: false });
		expect(lastMute(2)).toEqual({ muted: true });
		expect(lastMute(3)).toEqual({ muted: true });

		const lineup = await sendMessage({ type: 'GET_MULTIVIEW' }, multiviewTabId) as MultiviewLineup;
		expect(lineup.boxes).toEqual([
			{ gameId: 'g2', url: 'https://stream.example/2' },
			{ gameId: 'g3', url: 'https://stream.example/3' },
		]);
		expect(await sendMessage({ type: 'GET_MULTIVIEW' }, 99)).toBeNull();

		await sendMessage({ type: 'MULTIVIEW_READY', gameIds: ['g2', 'g3'] }, multiviewTabId);
		tabsUpdate.mockClear();
		fetchMock.mockResolvedValue({ games: [thriller('g2'), runaway('g3')], leagueLogos: {}, shedLeagues: [] });
		await poll();

		expect(activations()).toEqual([]);
		expect(await sendMessage({ type: 'GET_MULTIVIEW' }, multiviewTabId)).toMatchObject({ featuredGameId: 'g2', solo: true });

		await pollThrough(multiviewSoloGraceMs);
		expect(activations()).toEqual([2]);
		expect(tabsRemove).toHaveBeenCalledWith(multiviewTabId);
		expect(sessionRules).toHaveBeenLastCalledWith({ removeRuleIds: [multiviewTabId] });
	});

	test('switches between game tabs as usual while Multiview stays shut', async () => {
		await startWorker([runaway('g2'), thriller('g3')], multiviewPrefs);
		await poll();
		expect(tabsCreate).not.toHaveBeenCalled();
		expect(activations()).toEqual([3]);
	});

	test('warms up muted at the end of the strip while switching carries on, then shows that tab', async () => {
		await startWorker([closeBehind('g2'), thriller('g3')], multiviewPrefs);
		await poll();

		expect(tabsCreate).toHaveBeenCalledWith({ url: 'chrome-extension://x/multiview.html', active: false, windowId: 1, index: undefined });
		expect(activations()).toEqual([3]);
		expect(lastMute(multiviewTabId)).toEqual({ muted: true });

		fetchMock.mockResolvedValue({ games: [thriller('g2'), thriller('g3')], leagueLogos: {}, shedLeagues: [] });
		await poll();

		expect(tabsCreate).toHaveBeenCalledTimes(1);
		expect(tabsMove).toHaveBeenCalledWith(multiviewTabId, { windowId: 1, index: 4 });
		expect(activations()).toEqual([3, multiviewTabId]);
		expect(lastMute(multiviewTabId)).toEqual({ muted: false });
	});

	test('stays out of the way once the permission it needs is taken back', async () => {
		await startWorker([thriller('g2'), thriller('g3')], multiviewPrefs);
		permissionsContains.mockResolvedValue(false);
		await poll();
		expect(tabsCreate).not.toHaveBeenCalled();
		expect(sessionRules).not.toHaveBeenCalled();
	});

	test('forgets a Multiview tab the user closes, and lets its frame rule go', async () => {
		await startWorker([thriller('g2'), thriller('g3')], multiviewPrefs);
		await poll();
		openTabIds = openTabIds.filter(id => id !== multiviewTabId);
		onRemovedHandler(multiviewTabId);
		await drain();
		expect(sessionRules).toHaveBeenLastCalledWith({ removeRuleIds: [multiviewTabId] });
		expect(await sendMessage({ type: 'GET_MULTIVIEW' }, multiviewTabId)).toBeNull();
	});
	describe('a framed site taking the tab', () => {
		const leftMessages = () => notificationsCreate.mock.calls.filter(([id]) => id === 'arenaswap-multiview-left').map(([, options]) => options);

		test('forgets the session, keeps the tab, and names the site that took it', async () => {
			await startWorker([thriller('g2'), thriller('g3')], multiviewPrefs);
			await poll();
			tabsRemove.mockClear();

			onUpdatedHandler(multiviewTabId, { url: 'https://ads.stream.example/offer?x=1' });
			await drain();

			expect(tabsRemove).not.toHaveBeenCalled();
			expect(sessionRules).toHaveBeenLastCalledWith({ removeRuleIds: [multiviewTabId] });
			expect(await sendMessage({ type: 'GET_MULTIVIEW' }, multiviewTabId)).toBeNull();
			expect(leftMessages()).toEqual([expect.objectContaining({ message: expect.stringContaining('ads.stream.example') })]);
		});

		test('holds off reopening the same games', async () => {
			await startWorker([thriller('g2'), thriller('g3')], multiviewPrefs);
			await poll();
			onUpdatedHandler(multiviewTabId, { url: 'https://ads.stream.example/' });
			await drain();
			tabsCreate.mockClear();
			await poll();
			expect(tabsCreate).not.toHaveBeenCalled();
		});

		test('says nothing while the tab stays on the Multiview page, or when it is closed from our side', async () => {
			await startWorker([thriller('g2'), thriller('g3')], multiviewPrefs);
			await poll();

			onUpdatedHandler(multiviewTabId, { url: 'chrome-extension://x/multiview.html' });
			onUpdatedHandler(multiviewTabId, { url: 'chrome-extension://x/multiview.html#reload' });
			onUpdatedHandler(multiviewTabId, {});
			onUpdatedHandler(2, { url: 'https://elsewhere.example/' });
			await drain();
			expect(leftMessages()).toEqual([]);
			expect(await sendMessage({ type: 'GET_MULTIVIEW' }, multiviewTabId)).not.toBeNull();

			fetchMock.mockResolvedValue({ games: [thriller('g2'), runaway('g3')], leagueLogos: {}, shedLeagues: [] });
			await pollThrough(multiviewSoloGraceMs);
			expect(tabsRemove).toHaveBeenCalledWith(multiviewTabId);
			onUpdatedHandler(multiviewTabId, { url: 'https://elsewhere.example/' });
			await drain();
			expect(leftMessages()).toEqual([]);
		});
	});
});
