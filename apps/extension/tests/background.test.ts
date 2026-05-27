import { createDefaultUserPreferences, normalizeUserPreferences, pollIntervalMs } from '@arenaswap/core/constants';
import type { Game, LeagueId, TabRegistration, UserPreferences } from '@arenaswap/core/types';

jest.mock('@porkyproductions/hat', () => ({
	// Return the maximum of the range so timer delays are deterministic:
	// randomInRange(0, 15000) → 15000, randomInRange(-2000, 2000) → 2000
	randomInRange: jest.fn().mockImplementation((_min: number, max: number) => max),
}));

jest.mock('@arenaswap/core', () => ({
	...jest.requireActual('@arenaswap/core'),
	fetchGamesWithLeagueLogos: jest.fn(),
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
let tabsQuery: jest.Mock;
let tabsUpdate: jest.Mock;
let onMessageHandler!: (msg: unknown) => unknown;

const sendMessage = async (msg: unknown): Promise<unknown> => {
	const result = onMessageHandler(msg);
	await drain();
	return result;
};

interface LoadOptions {
	prefs?: Partial<UserPreferences>;
	tabRegistry?: TabRegistration[];
	fetchReturnValue?: { games: unknown[]; leagueLogos: Record<string, unknown> };
	initialSystemTime?: number;
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
	tabsQuery = jest.fn().mockResolvedValue([]);
	tabsUpdate = jest.fn().mockResolvedValue(undefined);

	(globalThis as { defineBackground?: unknown }).defineBackground = (fn: () => void) => fn();
	(globalThis as { browser?: unknown }).browser = {
		storage: {
			sync: { get: storageSyncGet, set: storageSyncSet },
			session: {
				get: jest.fn().mockResolvedValue({
					tabRegistry: options.tabRegistry ?? [],
					standbyStreamTabId: null,
					scoreHistory: {},
					powerScoreHistory: {},
					gameBoosts: {},
				}),
				set: jest.fn().mockResolvedValue(undefined),
			},
			local: {
				get: jest.fn().mockResolvedValue({ demoMode: false }),
				set: jest.fn().mockResolvedValue(undefined),
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
			onActivated: { addListener: jest.fn() },
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
		});

		await sendMessage({ type: 'GET_STATE', forceRefresh: true });

		expect(storageSyncGet).toHaveBeenCalledWith({ prefs: null });
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

	// Sensitivity 7 → threshold = 1: any non-trivial PowerScore triggers a switch
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
