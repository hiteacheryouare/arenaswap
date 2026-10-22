import { createDefaultUserPreferences, normalizeUserPreferences } from '@arenaswap/core/constants';
import type { DebugState, Game, LeagueId, TabRegistration, UserPreferences } from '@arenaswap/core/types';

jest.mock('@porkyproductions/hat', () => ({
	randomInRange: jest.fn().mockImplementation((_min: number, max: number) => max),
}));

jest.mock('@arenaswap/sideline', () => ({
	...jest.requireActual('@arenaswap/sideline'),
	fetchGamesWithLeagueLogos: jest.fn(),
	fetchNextScheduledStart: jest.fn().mockResolvedValue(null),
	fetchWinProbability: jest.fn().mockResolvedValue([]),
	fetchTeamMonoLogos: jest.fn().mockResolvedValue({}),
}));

const flushPromises = () => new Promise<void>(r => setImmediate(r));
const drain = async (rounds = 16) => {
	for (let i = 0; i < rounds; i++) await flushPromises();
};

const bootAt = 1_000_000;
const registry: TabRegistration[] = [{ gameId: 'watched', tabId: 2 }, { gameId: 'other', tabId: 3 }];

let tabsUpdate: jest.Mock;
let notify: jest.Mock;
let clearNotice: jest.Mock;
let runtimeSend: jest.Mock;
let onMessageHandler!: (msg: unknown) => unknown;

const nba = (id: string, home: number, away: number, period: number, clockSeconds: number, lastPlayId = '1'): Game => ({
	id,
	league: 'nba' as LeagueId,
	sportType: 'basketball',
	status: 'in',
	homeTeam: { id: `${id}-h`, name: 'Home', abbreviation: 'HOM', score: home },
	awayTeam: { id: `${id}-a`, name: 'Away', abbreviation: 'AWY', score: away },
	period,
	clockSeconds,
	lastPlayId,
	lastPlayType: 'Jump Shot',
});

// A sleepy second quarter on screen, and a one-point game with three minutes left in the other tab.
// The watched game's clock runs with the wall clock until `whistleAt`, then stops there.
const serveGames = (whistleAt = Infinity) => {
	const fetchMock = (require('@arenaswap/sideline') as { fetchGamesWithLeagueLogos: jest.Mock }).fetchGamesWithLeagueLogos;
	fetchMock.mockImplementation(() => {
		const running = Math.floor((Math.min(Date.now(), whistleAt) - bootAt) / 1000);
		return Promise.resolve({ games: [nba('watched', 40, 38, 2, 600 - running), nba('other', 100, 99, 4, 180)], leagueLogos: {}, shedLeagues: [] });
	});
};

const store = (initial: Record<string, unknown>) => ({
	get: jest.fn().mockImplementation((request: unknown) => {
		if (typeof request === 'string') return Promise.resolve(request in initial ? { [request]: initial[request] } : {});
		return Promise.resolve(Object.fromEntries(Object.entries(request as Record<string, unknown>).map(([key, fallback]) => [key, key in initial ? initial[key] : fallback])));
	}),
	set: jest.fn().mockImplementation((patch: Record<string, unknown>) => {
		Object.assign(initial, patch);
		return Promise.resolve();
	}),
});

const startWorker = async (prefs: Partial<UserPreferences>, whistleAt?: number) => {
	jest.resetModules();
	jest.useFakeTimers({ doNotFake: ['setImmediate'] });
	jest.setSystemTime(bootAt);

	tabsUpdate = jest.fn().mockResolvedValue(undefined);
	notify = jest.fn().mockResolvedValue(undefined);
	clearNotice = jest.fn().mockResolvedValue(true);
	runtimeSend = jest.fn().mockResolvedValue(undefined);

	(globalThis as { defineBackground?: unknown }).defineBackground = (fn: () => void) => fn();
	(globalThis as { browser?: unknown }).browser = {
		storage: {
			onChanged: { addListener: () => {} },
			sync: store({ prefs: normalizeUserPreferences({ ...createDefaultUserPreferences(), ...prefs }) }),
			session: store({ tabRegistry: registry }),
			local: store({ demoMode: false }),
		},
		runtime: {
			sendMessage: runtimeSend,
			onMessage: { addListener: (h: (msg: unknown) => unknown) => { onMessageHandler = h; } },
		},
		tabs: {
			query: jest.fn().mockImplementation((query: { active?: boolean }) => Promise.resolve(query.active ? [{ id: 2 }] : [1, 2, 3].map(id => ({ id, windowId: 1 })))),
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
		notifications: { create: notify, clear: clearNotice },
		i18n: { getUILanguage: () => 'en' },
	};

	serveGames(whistleAt);
	require('../entrypoints/background');
	await drain();
	tabsUpdate.mockClear();
};

const advance = async (ms: number) => {
	for (let elapsed = 0; elapsed < ms; elapsed += 1_000) {
		jest.advanceTimersByTime(1_000);
		await drain(4);
	}
	await drain(40);
};

const switchedToOther = () => tabsUpdate.mock.calls.some(([tabId, change]) => tabId === 3 && change.active === true);
const lastMessage = (): string => notify.mock.calls.at(-1)?.[1].message;
const lastTitle = (): string => notify.mock.calls.at(-1)?.[1].title;
// What the popup was last told about a held switch.
const broadcastHold = () => runtimeSend.mock.calls.map(([msg]) => msg).filter(msg => msg.type === 'SCORES_UPDATED').at(-1)?.heldSwitch;
const debugState = async () => {
	const state = onMessageHandler({ type: 'GET_DEBUG_STATE' }) as Promise<DebugState>;
	await drain();
	return state;
};

const switching: Partial<UserPreferences> = {
	enabled: true,
	enabledLeagues: ['nba' as LeagueId],
	sensitivity: 7,
	cooldownSeconds: 0,
	switchDelaySeconds: 0,
	notificationsEnabled: true,
	contentAwareSwitching: true,
};

afterEach(() => {
	jest.useRealTimers();
});

describe('content-aware switching in the worker', () => {
	test('holds the switch through a possession and makes it once the clock stops, saying it waited', async () => {
		await startWorker(switching, bootAt + 50_000);

		await advance(40_000);
		expect(switchedToOther()).toBe(false);
		expect((await debugState()).heldSwitch).toMatchObject({ gameId: 'other', tabId: 3, leavingGameId: 'watched' });
		expect(broadcastHold()).toEqual({ gameId: 'other', sport: 'basketball' });
		expect(lastTitle()).toBe('Up next → AWY 99–100 HOM');
		expect(lastMessage()).toMatch(/Switching at the next dead ball\.$/);

		await advance(60_000);
		expect(switchedToOther()).toBe(true);
		expect(lastTitle()).toBe('Switched → AWY 99–100 HOM');
		expect(lastMessage()).toMatch(/^Waited for a dead ball\. /);
		expect(broadcastHold()).toBeNull();
		expect(clearNotice).not.toHaveBeenCalled();
	});

	test('takes the up-next notice down when a held switch is called off', async () => {
		await startWorker(switching);
		await advance(40_000);
		expect(lastTitle()).toMatch(/^Up next/);

		onMessageHandler({ type: 'UPDATE_PREFS', prefs: normalizeUserPreferences({ ...createDefaultUserPreferences(), ...switching, enabled: false }) });
		await drain(40);
		expect(clearNotice).toHaveBeenCalledWith('arenaswap-switch');
		expect(broadcastHold()).toBeNull();
		expect(switchedToOther()).toBe(false);
	});

	test('gives up waiting at the cap when play never stops, and does not claim it waited', async () => {
		await startWorker(switching);

		await advance(75_000);
		expect(switchedToOther()).toBe(false);

		await advance(45_000);
		expect(switchedToOther()).toBe(true);
		expect(lastMessage()).not.toMatch(/Waited/);
	});

	test('counts down the switch delay after the break, for streams that run further behind', async () => {
		await startWorker({ ...switching, switchDelaySeconds: 30 }, bootAt + 20_000);

		let state = await debugState();
		for (let waited = 0; !state.pendingSwitch && waited < 120_000; waited += 5_000) {
			await advance(5_000);
			state = await debugState();
		}
		expect(state.heldSwitch).toBeNull();
		expect(state.pendingSwitch).toMatchObject({ gameId: 'other', waitedFor: 'basketball' });
		expect(switchedToOther()).toBe(false);

		await advance(31_000);
		expect(switchedToOther()).toBe(true);
	});

	test('switches straight away for anyone who turned it off', async () => {
		await startWorker({ ...switching, contentAwareSwitching: false });

		await advance(30_000);
		expect(switchedToOther()).toBe(true);
		expect(lastMessage()).not.toMatch(/Waited/);
	});
});
