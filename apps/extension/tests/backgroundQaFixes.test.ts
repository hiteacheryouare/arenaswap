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
	fetchCompetitionSituation: jest.fn().mockResolvedValue(undefined),
	fetchLeagueStandings: jest.fn().mockResolvedValue([]),
}));

const dayMs = 24 * 60 * 60 * 1000;
const flushPromises = () => new Promise<void>(r => setImmediate(r));
const drain = async (rounds = 24) => {
	for (let i = 0; i < rounds; i++) await flushPromises();
};

interface fakeTab {
	id: number;
	windowId: number;
	mutedInfo?: { muted: boolean };
}

let sessionStore: Record<string, unknown> = {};
let localStore: Record<string, unknown> = {};
let syncStore: Record<string, unknown> = {};
let openTabs: fakeTab[] = [];
let activeTabId = 1;
let onMessageHandler!: (msg: unknown) => unknown;
let tabsUpdate: jest.Mock;
let currentGames: Game[] = [];

const readStore = (store: Record<string, unknown>, request: unknown): Record<string, unknown> => {
	if (typeof request === 'string') return request in store ? { [request]: store[request] } : {};
	return Object.fromEntries(Object.entries(request as Record<string, unknown>).map(([key, fallback]) => [key, key in store ? store[key] : fallback]));
};

const storeApi = (store: () => Record<string, unknown>) => ({
	get: jest.fn().mockImplementation((request: unknown) => Promise.resolve(readStore(store(), request))),
	set: jest.fn().mockImplementation((patch: Record<string, unknown>) => {
		Object.assign(store(), structuredClone(patch));
		return Promise.resolve();
	}),
});

const sendMessage = async (msg: unknown): Promise<unknown> => {
	const [result] = await Promise.all([onMessageHandler(msg), drain()]);
	return result;
};

const sideline = () => require('@arenaswap/sideline') as {
	fetchGamesWithLeagueLogos: jest.Mock;
	fetchWinProbability: jest.Mock;
	fetchTeamMonoLogos: jest.Mock;
};

const localSet = () => (globalThis as unknown as { browser: { storage: { local: { set: jest.Mock } } } }).browser.storage.local.set;

const startWorker = async (atMs: number) => {
	jest.resetModules();
	jest.useFakeTimers({ doNotFake: ['setImmediate'] });
	jest.setSystemTime(atMs);
	tabsUpdate = jest.fn().mockResolvedValue(undefined);
	(globalThis as { defineBackground?: unknown }).defineBackground = (fn: () => void) => fn();
	(globalThis as { browser?: unknown }).browser = {
		storage: { sync: storeApi(() => syncStore), session: storeApi(() => sessionStore), local: storeApi(() => localStore) },
		runtime: {
			sendMessage: jest.fn().mockResolvedValue(undefined),
			onMessage: { addListener: (handler: (msg: unknown) => unknown) => { onMessageHandler = handler; } },
		},
		tabs: {
			query: jest.fn().mockImplementation((query: { active?: boolean }) => Promise.resolve(
				query.active ? openTabs.filter(tab => tab.id === activeTabId) : openTabs,
			)),
			update: tabsUpdate,
			create: jest.fn().mockResolvedValue(undefined),
			remove: jest.fn().mockResolvedValue(undefined),
			onActivated: { addListener: () => {} },
			onRemoved: { addListener: () => {} },
		},
		windows: {
			update: jest.fn().mockResolvedValue(undefined),
			get: jest.fn().mockResolvedValue({ id: 1, state: 'normal' }),
			getLastFocused: jest.fn().mockResolvedValue({ id: 1, state: 'normal' }),
		},
		commands: { onCommand: { addListener: () => {} } },
		notifications: { create: jest.fn().mockResolvedValue(undefined) },
		i18n: { getUILanguage: () => 'en-US' },
	};
	sideline().fetchGamesWithLeagueLogos.mockImplementation((leagues: LeagueId[]) => Promise.resolve({
		games: currentGames.filter(game => leagues.includes(game.league)),
		leagueLogos: {},
		shedLeagues: [],
	}));
	require('../entrypoints/background');
	await drain();
};

const poll = async () => {
	jest.advanceTimersByTime(pollIntervalMs + 5_000);
	await drain();
};

const mkGame = (id: string, league: LeagueId, sportType: Game['sportType'], status: Game['status'], startMs: number): Game => ({
	id,
	league,
	sportType,
	status,
	startTime: new Date(startMs).toISOString(),
	homeTeam: { id: `${id}-h`, name: 'Home', abbreviation: 'HOM', score: 50 },
	awayTeam: { id: `${id}-a`, name: 'Away', abbreviation: 'AWY', score: 49 },
	period: 4,
	clockSeconds: 120,
});

const seed = (prefs: Partial<UserPreferences>, session: Record<string, unknown> = {}) => {
	sessionStore = { tabRegistry: [], ...session };
	localStore = { demoMode: false };
	syncStore = { prefs: normalizeUserPreferences({ ...createDefaultUserPreferences(), ...prefs }) };
	openTabs = [{ id: 1, windowId: 1 }];
	activeTabId = 1;
};

afterEach(() => jest.useRealTimers());

describe('re-scoring games already in hand is not another poll', () => {
	// College hockey sends no plays, so its breaks come from a frozen clock: the one rule a re-score
	// counted as a poll could trip.
	test('a fresh worker does not count its own startup re-score as a frozen clock', async () => {
		seed({ enabledLeagues: ['ncaamh'], enabled: true });
		currentGames = [mkGame('g1', 'ncaamh', 'hockey', 'in', 0)];
		await startWorker(1_000_000);

		const debug = await sendMessage({ type: 'GET_DEBUG_STATE' }) as { commercialBreaks: Record<string, { kind?: string; clockStall?: { stallCount: number } }> };
		expect(debug.commercialBreaks.g1?.clockStall?.stallCount ?? 0).toBe(0);
		expect(debug.commercialBreaks.g1?.kind).toBeUndefined();
	});

	test('nudging a game boost up sixteen times puts no game on a break', async () => {
		seed({ enabledLeagues: ['ncaamh'], enabled: true });
		currentGames = [mkGame('g1', 'ncaamh', 'hockey', 'in', 0), mkGame('g2', 'ncaamh', 'hockey', 'in', 0)];
		await startWorker(1_000_000);

		for (let boost = 1; boost <= 16; boost++) await sendMessage({ type: 'SET_GAME_BOOST', gameId: 'g1', boost });

		const debug = await sendMessage({ type: 'GET_DEBUG_STATE' }) as { commercialBreaks: Record<string, { kind?: string; clockStall?: { stallCount: number } }>; scores: { gameId: string; onBreak?: boolean; gameBoost?: number }[] };
		expect(debug.commercialBreaks.g2?.clockStall?.stallCount ?? 0).toBe(0);
		expect(debug.scores.find(score => score.gameId === 'g1')?.onBreak).toBeFalsy();
		expect(debug.scores.find(score => score.gameId === 'g2')?.onBreak).toBeFalsy();
		expect(debug.scores.find(score => score.gameId === 'g1')?.gameBoost).toBe(16);
	});

	test('eight real polls on one college hockey clock are a break, and the score carries it', async () => {
		seed({ enabledLeagues: ['ncaamh'], enabled: true });
		currentGames = [mkGame('g1', 'ncaamh', 'hockey', 'in', 0)];
		await startWorker(1_000_000);
		for (let i = 0; i < 8; i++) await poll();

		const debug = await sendMessage({ type: 'GET_DEBUG_STATE' }) as { commercialBreaks: Record<string, { kind?: string }>; scores: { gameId: string; onBreak?: boolean; breakPenalty?: number }[] };
		expect(debug.commercialBreaks.g1?.kind).toBe('clockStall');
		expect(debug.scores.find(score => score.gameId === 'g1')).toMatchObject({ onBreak: true, breakPenalty: 15 });
	});

	test('an NFL TV timeout is a break from the first poll that shows it', async () => {
		seed({ enabledLeagues: ['nfl'], enabled: true });
		currentGames = [{ ...mkGame('g1', 'nfl', 'football', 'in', 0), lastPlayId: '4018729793513', lastPlayType: 'Official Timeout' }];
		await startWorker(1_000_000);

		const debug = await sendMessage({ type: 'GET_DEBUG_STATE' }) as { commercialBreaks: Record<string, { kind?: string }>; scores: { gameId: string; onBreak?: boolean }[] };
		expect(debug.commercialBreaks.g1?.kind).toBe('tvTimeout');
		expect(debug.scores.find(score => score.gameId === 'g1')?.onBreak).toBe(true);
	});

	test('a boost edit adds no score snapshot of its own', async () => {
		seed({ enabledLeagues: ['nba'], enabled: true });
		currentGames = [mkGame('g1', 'nba', 'basketball', 'in', 0)];
		await startWorker(1_000_000);
		const before = (sessionStore.scoreHistory as Record<string, unknown[]>).g1!.length;

		await sendMessage({ type: 'SET_GAME_BOOST', gameId: 'g1', boost: 5 });

		expect((sessionStore.scoreHistory as Record<string, unknown[]>).g1).toHaveLength(before);
	});
});

describe('switching a league off', () => {
	test('drops its live games at once and stops paying for their summaries', async () => {
		seed({ enabledLeagues: ['nba', 'nhl'], enabled: true });
		currentGames = [mkGame('g1', 'nba', 'basketball', 'in', 0), mkGame('g2', 'nhl', 'hockey', 'in', 0)];
		await startWorker(1_000_000);

		await sendMessage({ type: 'UPDATE_PREFS', prefs: normalizeUserPreferences({ ...createDefaultUserPreferences(), enabled: true, enabledLeagues: ['nba'] }) });
		const afterChange = await sendMessage({ type: 'GET_STATE' }) as { games: Game[]; scores: { gameId: string }[] };
		expect(afterChange.games.map(game => game.id)).toEqual(['g1']);
		expect(afterChange.scores.some(score => score.gameId === 'g2')).toBe(false);

		sideline().fetchWinProbability.mockClear();
		for (let i = 0; i < 6; i++) await poll();

		const state = await sendMessage({ type: 'GET_STATE' }) as { games: Game[] };
		expect(state.games.some(game => game.id === 'g2')).toBe(false);
		expect(sideline().fetchWinProbability.mock.calls.some(call => (call[0] as Game).id === 'g2')).toBe(false);
	});
});

describe('score history ages out', () => {
	const finishThenWait = async (waitMs: number, keepFinalGames: boolean) => {
		seed({ enabledLeagues: ['nba'], enabled: true, keepFinalGames });
		currentGames = [mkGame('g1', 'nba', 'basketball', 'in', 1_000_000)];
		await startWorker(1_000_000);
		await poll();
		currentGames = [{ ...currentGames[0]!, status: 'post' }];
		await poll();
		jest.setSystemTime(1_000_000 + waitMs);
		currentGames = [mkGame('g9', 'nba', 'basketball', 'in', 1_000_000 + waitMs)];
		return await sendMessage({ type: 'GET_STATE', forceRefresh: true }) as { scoreHistory: Record<string, unknown[]>; powerScoreHistory: Record<string, unknown[]> };
	};

	test.each([true, false])('a game the Guide can no longer reach leaves storage and state (keep finals %s)', async keepFinalGames => {
		const state = await finishThenWait(4 * dayMs, keepFinalGames);

		expect(Object.keys(state.scoreHistory)).not.toContain('g1');
		expect(Object.keys(state.powerScoreHistory)).not.toContain('g1');
		expect(Object.keys(sessionStore.scoreHistory as object)).not.toContain('g1');
		expect(Object.keys(sessionStore.powerScoreHistory as object)).not.toContain('g1');
		expect(Object.keys(state.scoreHistory)).toContain('g9');
	});

	test('a final from two days ago is still there for the Guide to draw', async () => {
		const state = await finishThenWait(2 * dayMs, true);

		expect(Object.keys(state.scoreHistory)).toContain('g1');
		expect(Object.keys(state.powerScoreHistory)).toContain('g1');
	});

	test('a fresh worker drops what it reads back if it is already too old', async () => {
		seed({ enabledLeagues: ['nba'], enabled: true }, {
			scoreHistory: { old: [{ gameId: 'old', timestamp: 0, homeScore: 1, awayScore: 0 }] },
		});
		currentGames = [mkGame('g1', 'nba', 'basketball', 'in', 4 * dayMs)];
		await startWorker(4 * dayMs);

		const state = await sendMessage({ type: 'GET_STATE' }) as { scoreHistory: Record<string, unknown[]> };
		expect(Object.keys(state.scoreHistory)).not.toContain('old');
	});
});

describe('team mono marks for a league that has none', () => {
	test('are asked for once, and nothing is rewritten on every Guide ask', async () => {
		seed({ enabledLeagues: ['nba', 'epl'], enabled: true });
		currentGames = [mkGame('g1', 'nba', 'basketball', 'in', 1_000_000)];
		await startWorker(1_000_000);
		sideline().fetchTeamMonoLogos.mockResolvedValue({ nba: { 'g1-h': { white: 'w.png' } } });

		const first = await sendMessage({ type: 'GET_GUIDE_SLATE' }) as { monoLogos: Record<string, unknown> };
		expect(first.monoLogos.nba).toEqual({ 'g1-h': { white: 'w.png' } });
		localSet().mockClear();
		for (let i = 0; i < 5; i++) await sendMessage({ type: 'GET_GUIDE_SLATE' });

		const monoWrites = localSet().mock.calls.filter(call => 'arenaswap.teamMonoLogos' in (call[0] as object));
		expect(monoWrites).toHaveLength(0);
		expect(sideline().fetchTeamMonoLogos).toHaveBeenCalledTimes(1);
	});
});

describe('mute sync', () => {
	test('leaves a tab alone when it is already in the state it should be in', async () => {
		const registry: TabRegistration[] = [
			{ tabId: 1, gameId: 'g1' } as TabRegistration,
			{ tabId: 2, gameId: 'g2' } as TabRegistration,
		];
		seed({ enabledLeagues: ['nba'], enabled: true }, { tabRegistry: registry });
		openTabs = [{ id: 1, windowId: 1, mutedInfo: { muted: false } }, { id: 2, windowId: 1, mutedInfo: { muted: true } }];
		currentGames = [mkGame('g1', 'nba', 'basketball', 'in', 0), mkGame('g2', 'nba', 'basketball', 'in', 0)];
		await startWorker(1_000_000);
		tabsUpdate.mockClear();

		await poll();

		expect(tabsUpdate.mock.calls.filter(call => 'muted' in (call[1] as object))).toEqual([]);
		expect(sessionStore.mutedTabIds).toEqual([2]);
	});

	test('still mutes a tab the user unmuted by hand', async () => {
		const registry: TabRegistration[] = [
			{ tabId: 1, gameId: 'g1' } as TabRegistration,
			{ tabId: 2, gameId: 'g2' } as TabRegistration,
		];
		seed({ enabledLeagues: ['nba'], enabled: true }, { tabRegistry: registry });
		openTabs = [{ id: 1, windowId: 1, mutedInfo: { muted: false } }, { id: 2, windowId: 1, mutedInfo: { muted: false } }];
		currentGames = [mkGame('g1', 'nba', 'basketball', 'in', 0), mkGame('g2', 'nba', 'basketball', 'in', 0)];
		await startWorker(1_000_000);
		tabsUpdate.mockClear();

		await poll();

		expect(tabsUpdate).toHaveBeenCalledWith(2, { muted: true });
		expect(tabsUpdate).not.toHaveBeenCalledWith(1, expect.objectContaining({ muted: expect.anything() }));
	});
});

describe('a switch to a tab that closed mid-switch', () => {
	test('is dropped quietly rather than left as an unhandled rejection', async () => {
		const registry: TabRegistration[] = [{ tabId: 2, gameId: 'g1' } as TabRegistration];
		seed({ enabledLeagues: ['nba'], enabled: true, switchDelaySeconds: 0, cooldownSeconds: 0 }, { tabRegistry: registry });
		openTabs = [{ id: 1, windowId: 1 }, { id: 2, windowId: 1 }];
		currentGames = [mkGame('g1', 'nba', 'basketball', 'in', 0)];
		const unhandled = jest.fn();
		process.on('unhandledRejection', unhandled);
		try {
			await startWorker(1_000_000);
			tabsUpdate.mockImplementation((_tabId: number, change: { active?: boolean }) => (
				change.active ? Promise.reject(new Error('No tab with id: 2.')) : Promise.resolve(undefined)
			));

			await poll();
			await drain();

			expect(tabsUpdate).toHaveBeenCalledWith(2, { active: true });
			expect(unhandled).not.toHaveBeenCalled();
		} finally {
			process.off('unhandledRejection', unhandled);
		}
	});
});
