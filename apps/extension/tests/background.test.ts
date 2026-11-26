import { pollWinProbabilityMs } from '@arenaswap/core';
import { gameEndTimesKey } from '../utils/gameEndTimes';
import { slateRefreshMs } from '../utils/slateMerge';
import { monoLogoCacheKey, monoLogoCacheTtlMs } from '../utils/monoLogoCache';
import { createDefaultUserPreferences, createFavoriteTeamKey, guideMinUpcomingDays, historyWindowMs, normalizeUserPreferences, pollDormantMaxMs, pollHebetudinousMaxMs, pollIntervalMs, pollLookaheadTtlMs, pollMaxEagerMs } from '@arenaswap/core/constants';
import { chartHistory, coversWholeGame } from '../entrypoints/popup/components/wrapCoverage';
import type { Game, LeagueId, TabRegistration, UserPreferences, WinProbabilityReading } from '@arenaswap/core/types';
import { prefsStorageUpdatedAtKey } from '../utils/prefsStorage';

jest.mock('@porkyproductions/hat', () => ({
	randomInRange: jest.fn().mockImplementation((_min: number, max: number) => max),
}));

jest.mock('@arenaswap/sideline', () => ({
	...jest.requireActual('@arenaswap/sideline'),
	fetchGamesWithLeagueLogos: jest.fn(),
	fetchNextScheduledStart: jest.fn().mockResolvedValue(null),
	fetchWinProbability: jest.fn().mockResolvedValue([]),
	fetchCompetitionSituation: jest.fn().mockResolvedValue({}),
	fetchLeagueStandings: jest.fn().mockResolvedValue({}),
	fetchTeamMonoLogos: jest.fn().mockResolvedValue({}),
	fetchGameDurationMins: jest.fn().mockResolvedValue(null),
	fetchConferenceDirectory: jest.fn().mockRejectedValue(new Error('offline')),
}));

const flushPromises = () => new Promise<void>(r => setImmediate(r));

const lookahead = (): jest.Mock => (
	(require('@arenaswap/sideline') as { fetchNextScheduledStart: jest.Mock }).fetchNextScheduledStart
);

const monoFetch = (): jest.Mock => (
	(require('@arenaswap/sideline') as { fetchTeamMonoLogos: jest.Mock }).fetchTeamMonoLogos
);

const durationFetch = (): jest.Mock => (
	(require('@arenaswap/sideline') as { fetchGameDurationMins: jest.Mock }).fetchGameDurationMins
);

const situationFetch = (): jest.Mock => (
	(require('@arenaswap/sideline') as { fetchCompetitionSituation: jest.Mock }).fetchCompetitionSituation
);

const runtimeSendMessage = (): jest.Mock => (
	(globalThis as unknown as { browser: { runtime: { sendMessage: jest.Mock } } }).browser.runtime.sendMessage
);

const lastWideFetchOptions = () => fetchMock.mock.calls
	.filter(([, options]) => (options as { includeUpcoming?: boolean } | undefined)?.includeUpcoming === true)
	.at(-1)?.[1] as { upcomingDays?: number; includeFinal?: boolean } | undefined;

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
let windowsUpdate: jest.Mock;
let windowsGet: jest.Mock;
let windowsGetLastFocused: jest.Mock;
let notificationsCreate: jest.Mock;
let tabsRemove: jest.Mock;
let storageSessionSet: jest.Mock;
let onMessageHandler!: (msg: unknown) => unknown;
let onActivatedHandler: ((info: { tabId: number }) => unknown) | undefined;
let onRemovedHandler: ((tabId: number) => unknown) | undefined;
let onSyncChangedHandlers: ((changes: Record<string, unknown>) => unknown)[] = [];

const mockOpenTabIds = (openTabIds: number[], activeTabId: number, windowIds?: Record<number, number>) => {
	tabsQuery.mockImplementation((q: unknown) => {
		if ((q as { active?: boolean }).active) return Promise.resolve([{ id: activeTabId }]);
		return Promise.resolve(openTabIds.map(id => (
			windowIds?.[id] === undefined ? { id } : { id, windowId: windowIds[id] }
		)));
	});
};

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
	fetchReturnValue?: { games: unknown[]; leagueLogos: Record<string, unknown>; shedLeagues?: LeagueId[] };
	initialSystemTime?: number;
	storedLocal?: Record<string, unknown>;
	openTabIds?: number[];
	activeTabId?: number;
	windowIds?: Record<number, number>;
	storedSession?: Record<string, unknown>;
}

const loadBackground = async (options: LoadOptions = {}) => {
	jest.resetModules();
	jest.useFakeTimers({ doNotFake: ['setImmediate'] });
	if (options.initialSystemTime !== undefined) jest.setSystemTime(options.initialSystemTime);

	const prefs = normalizeUserPreferences({
		...createDefaultUserPreferences(),
		...options.prefs,
	});

	storageSyncGet = jest.fn().mockResolvedValue({ prefs });
	storageSyncSet = jest.fn().mockResolvedValue(undefined);
	storageLocalGet = jest.fn().mockResolvedValue({ demoMode: false, reviewPromptState: null, ...options.storedLocal });
	storageLocalSet = jest.fn().mockResolvedValue(undefined);
	tabsQuery = jest.fn().mockResolvedValue([]);
	tabsUpdate = jest.fn().mockResolvedValue(undefined);
	windowsUpdate = jest.fn().mockResolvedValue(undefined);
	windowsGet = jest.fn().mockResolvedValue({ id: 1, state: 'normal' });
	windowsGetLastFocused = jest.fn().mockResolvedValue({ id: 1, state: 'normal' });
	notificationsCreate = jest.fn().mockResolvedValue(undefined);
	tabsRemove = jest.fn().mockResolvedValue(undefined);
	storageSessionSet = jest.fn().mockResolvedValue(undefined);
	onActivatedHandler = undefined;
	onRemovedHandler = undefined;
	onSyncChangedHandlers = [];
	if (options.openTabIds) mockOpenTabIds(options.openTabIds, options.activeTabId ?? options.openTabIds[0]!, options.windowIds);

	(globalThis as { defineBackground?: unknown }).defineBackground = (fn: () => void) => fn();
	(globalThis as { browser?: unknown }).browser = {
		storage: {
			onChanged: { addListener: () => {} },
			sync: {
				get: storageSyncGet,
				set: storageSyncSet,
				onChanged: { addListener: (h: (changes: Record<string, unknown>) => unknown) => { onSyncChangedHandlers.push(h); } },
			},
			session: {
				get: jest.fn().mockResolvedValue({
					tabRegistry: options.tabRegistry ?? [],
					standbyStreamTabId: options.standbyStreamTabId ?? null,
					scoreHistory: {},
					powerScoreHistory: {},
					gameBoosts: {},
					...options.storedSession,
				}),
				set: storageSessionSet,
			},
			local: {
				get: storageLocalGet,
				set: storageLocalSet,
			},
		},
		runtime: {
			getPlatformInfo: jest.fn().mockResolvedValue({}),
			sendMessage: jest.fn().mockResolvedValue(undefined),
			onMessage: {
				addListener: (h: (msg: unknown) => unknown) => { onMessageHandler = h; },
			},
		},
		tabs: {
			query: tabsQuery,
			update: tabsUpdate,
			remove: tabsRemove,
			onActivated: {
				addListener: (h: (info: { tabId: number }) => unknown) => { onActivatedHandler = h; },
			},
			onRemoved: {
				addListener: (h: (tabId: number) => unknown) => { onRemovedHandler = h; },
			},
			onUpdated: { addListener: () => {} },
		},
		notifications: { create: notificationsCreate },
		windows: { update: windowsUpdate, get: windowsGet, getLastFocused: windowsGetLastFocused },
		commands: { onCommand: { addListener: jest.fn() } },
		alarms: { create: jest.fn(), clear: jest.fn(), onAlarm: { addListener: () => {} } },
		i18n: { getUILanguage: () => 'en-US' },
	};

	fetchMock = (require('@arenaswap/sideline') as { fetchGamesWithLeagueLogos: jest.Mock }).fetchGamesWithLeagueLogos;
	fetchMock.mockResolvedValue(options.fetchReturnValue ?? { games: [], leagueLogos: {}, shedLeagues: [] });

	require('../entrypoints/background');

	await drain();

	fetchMock.mockClear();
	tabsUpdate.mockClear();
	tabsRemove.mockClear();
	storageSessionSet.mockClear();
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
			fetchReturnValue: { games: [postseasonGame], leagueLogos: {}, shedLeagues: [] },
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
			fetchReturnValue: { games: [regularGame], leagueLogos: {}, shedLeagues: [] },
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
			fetchReturnValue: { games: [postseasonGame], leagueLogos: {}, shedLeagues: [] },
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
			fetchReturnValue: { games: [{ ...postseasonGame, postseasonRound }], leagueLogos: {}, shedLeagues: [] },
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

	test('a postseason game with no graded round scores nothing', async () => {
		expect(await boostForRound(undefined)).toBe(0);
	});

	test('every rung outscores the one below it at the shipping default', async () => {
		const ladder = [await boostForRound(3), await boostForRound(2), await boostForRound(1), await boostForRound(0)];
		for (let i = 1; i < ladder.length; i++) expect(ladder[i]!).toBeGreaterThan(ladder[i - 1]!);
	});
});

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
			fetchReturnValue: { games: [game], leagueLogos: {}, shedLeagues: [] },
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

describe('tickLeague rescheduling', () => {
	test('does not reschedule a league that was disabled while its fetch was in flight', async () => {
		await loadBackground({ prefs: { enabledLeagues: ['nba' as LeagueId] } });

		let resolveDeferred!: (v: { games: never[]; leagueLogos: Record<string, never>; shedLeagues: never[] }) => void;
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
		fetchMock.mockResolvedValue({ games: [], leagueLogos: {}, shedLeagues: [] });

		resolveDeferred({ games: [], leagueLogos: {}, shedLeagues: [] });
		await drain();

		jest.advanceTimersByTime(pollIntervalMs * 2 + 5000);
		await drain();

		const nbaCalls = fetchMock.mock.calls.filter(
			(args: unknown[]) => Array.isArray(args[0]) && (args[0] as string[]).includes('nba')
		);
		expect(nbaCalls).toHaveLength(0);
	});
});

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
			fetchReturnValue: { games: [liveGame], leagueLogos: {}, shedLeagues: [] },
		});
		const winProbMock = (require('@arenaswap/sideline') as { fetchWinProbability: jest.Mock }).fetchWinProbability;
		winProbMock.mockClear();
		return winProbMock;
	};

	test('a sweep that resolves after polling stopped does not restart the chain', async () => {
		const winProbMock = await loadWithLiveGame();
		const releaseSweep = deferNextSweep(winProbMock);

		jest.advanceTimersByTime(pollWinProbabilityMs);
		await drain();
		expect(winProbMock).toHaveBeenCalledTimes(1);

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

		await sendMessage({ type: 'SET_DEMO_MODE', enabled: true });
		await sendMessage({ type: 'SET_DEMO_MODE', enabled: false });
		releaseSweep();
		await drain();

		winProbMock.mockClear();
		jest.advanceTimersByTime(pollWinProbabilityMs);
		await drain();

		expect(winProbMock).toHaveBeenCalledTimes(1);
	});
});

const summaryLine = Array.from({ length: 20 }, (_, i) => ({ homeWinProbability: i % 2 === 0 ? 0.35 : 0.65, progress: 0.3 + i * 0.014 }));

const summaryMock = () => {
	const mock = (require('@arenaswap/sideline') as { fetchWinProbability: jest.Mock }).fetchWinProbability;
	mock.mockImplementation(async () => summaryLine);
	mock.mockClear();
	return mock;
};

describe('win probability read off the scoreboard', () => {
	const footballGame: Game = {
		id: 'nfl-1',
		league: 'nfl' as LeagueId,
		sportType: 'football',
		status: 'in',
		homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 14 },
		awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 10 },
		period: 3,
		clockSeconds: 600,
		homeWinProbability: 0.55,
		lastPlayId: 'play-1',
	};

	const loadWith = async (game: Game, storedSession?: Record<string, unknown>, playMoves = false) => {
		await loadBackground({
			prefs: { enabledLeagues: [game.league], notificationsEnabled: false },
			fetchReturnValue: { games: [game], leagueLogos: {}, shedLeagues: [] },
			storedSession,
		});
		let play = 1;
		if (playMoves) fetchMock.mockImplementation(async () => ({ games: [{ ...game, lastPlayId: `play-${++play}` }], leagueLogos: {}, shedLeagues: [] }));
	};

	const sweepsLater = async (sweeps: number) => {
		for (let i = 0; i < sweeps; i++) {
			jest.advanceTimersByTime(pollWinProbabilityMs);
			await drain();
		}
	};

	const persistedLine = (gameId: string) => {
		const writes = storageSessionSet.mock.calls.map(([value]) => value as { scoreboardWinProbHistory?: Record<string, WinProbabilityReading[]> });
		return writes.filter(write => write.scoreboardWinProbHistory !== undefined).at(-1)?.scoreboardWinProbHistory?.[gameId]
			?.map(reading => reading.homeWinProbability);
	};

	test('a football game is summarised once for its full line and then left to the scoreboard', async () => {
		await loadWith(footballGame);
		const winProbMock = summaryMock();
		await sweepsLater(1);
		expect(winProbMock).toHaveBeenCalledTimes(1);

		await sweepsLater(4);
		expect(winProbMock).toHaveBeenCalledTimes(1);
	});

	test('a football game the scoreboard gives no line for keeps its summary every sweep', async () => {
		await loadWith({ ...footballGame, homeWinProbability: undefined }, undefined, true);
		const winProbMock = summaryMock();

		await sweepsLater(3);
		expect(winProbMock).toHaveBeenCalledTimes(3);
	});

	test('a league whose scoreboard was not checked keeps its summary every sweep', async () => {
		await loadWith({
			...footballGame,
			id: 'hockey-1',
			league: 'nhl' as LeagueId,
			sportType: 'hockey',
			homeTeam: { ...footballGame.homeTeam, score: 2 },
			awayTeam: { ...footballGame.awayTeam, score: 1 },
		}, undefined, true);
		const winProbMock = summaryMock();

		await sweepsLater(3);
		expect(winProbMock).toHaveBeenCalledTimes(3);
	});

	test('basketball keeps its summary every sweep, for the lead-change count in the box score', async () => {
		await loadWith({ ...footballGame, id: 'nba-1', league: 'nba' as LeagueId, sportType: 'basketball' }, undefined, true);
		const winProbMock = summaryMock();

		await sweepsLater(3);
		expect(winProbMock).toHaveBeenCalledTimes(3);
	});

	test('a game stuck on the same play is not summarised again until the next one', async () => {
		const stalled = { ...footballGame, id: 'nba-2', league: 'nba' as LeagueId, sportType: 'basketball' as const };
		await loadWith(stalled, undefined, false);
		const winProbMock = summaryMock();

		await sweepsLater(3);
		expect(winProbMock).toHaveBeenCalledTimes(1);

		fetchMock.mockResolvedValue({ games: [{ ...stalled, lastPlayId: 'play-2' }], leagueLogos: {}, shedLeagues: [] });
		jest.advanceTimersByTime(pollMaxEagerMs + 2000);
		await drain();
		await sweepsLater(1);
		expect(winProbMock).toHaveBeenCalledTimes(2);
	});

	test('a summary that comes back without a line is asked for again on the same play', async () => {
		const stalled = { ...footballGame, id: 'nba-3', league: 'nba' as LeagueId, sportType: 'basketball' as const };
		await loadWith(stalled, undefined, false);
		const winProbMock = (require('@arenaswap/sideline') as { fetchWinProbability: jest.Mock }).fetchWinProbability;
		winProbMock.mockResolvedValue([]);
		winProbMock.mockClear();

		await sweepsLater(3);
		expect(winProbMock).toHaveBeenCalledTimes(3);
	});

	test('a game picked up mid-play is scored on the summary\'s full line, not just the plays since', async () => {
		await loadWith(footballGame);
		summaryMock();
		await sweepsLater(1);
		jest.advanceTimersByTime(pollMaxEagerMs + 2000);
		await drain(12);

		const state = await sendMessage({ type: 'GET_STATE' }) as { scores: { gameId: string; winProbabilityVariance?: number }[] };
		expect(state.scores.find(s => s.gameId === 'nfl-1')?.winProbabilityVariance).toBeGreaterThanOrEqual(3);
		expect(persistedLine('nfl-1')).toHaveLength(summaryLine.length);
	});

	test('the summary comes back while the scoreboard has stopped sending the line', async () => {
		await loadWith(footballGame);
		const winProbMock = summaryMock();
		await sweepsLater(1);
		await sweepsLater(1);
		expect(winProbMock).toHaveBeenCalledTimes(1);

		fetchMock.mockResolvedValue({ games: [{ ...footballGame, homeWinProbability: undefined, lastPlayId: 'play-2' }], leagueLogos: {}, shedLeagues: [] });
		jest.advanceTimersByTime(pollMaxEagerMs + 2000);
		await drain(12);
		await sweepsLater(1);
		expect(winProbMock).toHaveBeenCalledTimes(2);
	});

	test('a trip through demo mode mid-game starts the line over from the summary', async () => {
		await loadWith(footballGame);
		const winProbMock = summaryMock();
		await sweepsLater(1);
		expect(winProbMock).toHaveBeenCalledTimes(1);

		await sendMessage({ type: 'SET_DEMO_MODE', enabled: true });
		await sendMessage({ type: 'SET_DEMO_MODE', enabled: false });
		await sweepsLater(1);
		expect(winProbMock).toHaveBeenCalledTimes(2);
	});

	test('a line stored for a game that is no longer live is not kept', async () => {
		await loadWith(footballGame, { scoreboardWinProbHistory: { 'old-game': [0.4, 0.5, 0.6], 'nfl-1': [0.5, 0.5] } });
		summaryMock();
		await sweepsLater(1);
		jest.advanceTimersByTime(pollIntervalMs + 2000);
		await drain(12);

		expect(persistedLine('old-game')).toBeUndefined();
		expect(persistedLine('nfl-1')).toBeDefined();
	});

	test('the line is written to session storage with the score history', async () => {
		await loadWith(footballGame);
		jest.advanceTimersByTime(pollIntervalMs + 2000);
		await drain(12);

		expect(persistedLine('nfl-1')).toEqual([0.55]);
	});

	test('a restarted worker scores from the line it stored', async () => {
		const swings = Array.from({ length: 12 }, (_, i) => (i % 2 === 0 ? 0.35 : 0.65));
		const stored = { 'nfl-1': swings.map((homeWinProbability, i) => ({ homeWinProbability, progress: 0.4 + i * 0.015 })) };
		await loadWith({ ...footballGame, homeWinProbability: 0.52, lastPlayId: 'play-9' }, { scoreboardWinProbHistory: stored });
		jest.advanceTimersByTime(pollIntervalMs + 2000);
		await drain(12);

		const state = await sendMessage({ type: 'GET_STATE' }) as { scores: { gameId: string; winProbabilityVariance?: number }[] };
		expect(state.scores.find(s => s.gameId === 'nfl-1')?.winProbabilityVariance).toBeGreaterThan(0);
		expect(persistedLine('nfl-1')).toEqual([...swings, 0.52]);
	});

	test('without the stored line the same game has too little history to boost', async () => {
		await loadWith({ ...footballGame, homeWinProbability: 0.52, lastPlayId: 'play-9' });
		jest.advanceTimersByTime(pollIntervalMs + 2000);
		await drain(12);

		const state = await sendMessage({ type: 'GET_STATE' }) as { scores: { gameId: string; winProbabilityVariance?: number }[] };
		expect(state.scores.find(s => s.gameId === 'nfl-1')?.winProbabilityVariance).toBeUndefined();
	});
});

describe('a switch fills the screen the way the last game did', () => {
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

	const switchToGameIn = async (gameWindowId: number) => {
		await loadBackground({
			prefs: {
				enabled: true,
				enabledLeagues: ['nba' as LeagueId],
				cooldownSeconds: 0,
				sensitivity: 7,
				switchDelaySeconds: 0,
				notificationsEnabled: false,
			},
			tabRegistry: [{ gameId: 'g1', tabId: 2 }],
			fetchReturnValue: { games: [liveGame], leagueLogos: {}, shedLeagues: [] },
			openTabIds: [1, 2],
			activeTabId: 1,
			windowIds: { 1: 1, 2: gameWindowId },
		});
	};

	const poll = async () => {
		jest.advanceTimersByTime(pollIntervalMs + 2000);
		await drain(12);
	};

	test('puts the window back in full screen when the player was full screen', async () => {
		await switchToGameIn(1);
		windowsGetLastFocused.mockResolvedValue({ id: 1, state: 'fullscreen' });
		windowsGet.mockResolvedValue({ id: 1, state: 'normal' });

		await poll();

		expect(tabsUpdate).toHaveBeenCalledWith(2, { active: true });
		expect(windowsUpdate).toHaveBeenCalledWith(1, { state: 'fullscreen' });
		expect(windowsUpdate).not.toHaveBeenCalledWith(1, { focused: true });
	});

	test('leaves a window that stayed full screen alone', async () => {
		await switchToGameIn(1);
		windowsGetLastFocused.mockResolvedValue({ id: 1, state: 'fullscreen' });
		windowsGet.mockResolvedValue({ id: 1, state: 'fullscreen' });

		await poll();

		expect(tabsUpdate).toHaveBeenCalledWith(2, { active: true });
		expect(windowsUpdate).not.toHaveBeenCalled();
	});

	test('brings a game in another window to the front', async () => {
		await switchToGameIn(2);
		windowsGet.mockResolvedValue({ id: 2, state: 'normal' });

		await poll();

		expect(tabsUpdate).toHaveBeenCalledWith(2, { active: true });
		expect(windowsUpdate).toHaveBeenCalledWith(2, { focused: true });
		expect(windowsUpdate).not.toHaveBeenCalledWith(2, { state: 'fullscreen' });
	});

	test('takes a game in another window full screen when the last one was', async () => {
		await switchToGameIn(2);
		windowsGetLastFocused.mockResolvedValue({ id: 1, state: 'fullscreen' });
		windowsGet.mockResolvedValue({ id: 2, state: 'normal' });

		await poll();

		expect(windowsUpdate).toHaveBeenCalledWith(2, { focused: true });
		expect(windowsUpdate).toHaveBeenCalledWith(2, { state: 'fullscreen' });
	});

	test('still counts the switch when the window cannot be brought forward', async () => {
		await switchToGameIn(2);
		windowsUpdate.mockRejectedValue(new Error('No window with id: 2.'));

		await poll();

		expect(tabsUpdate).toHaveBeenCalledWith(2, { active: true });
		expect(storageLocalSet).toHaveBeenCalledWith({ reviewPromptState: expect.objectContaining({ successfulSwitchCount: 1 }) });
	});
});

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
			fetchReturnValue: { games: [liveGame], leagueLogos: {}, shedLeagues: [] },
			initialSystemTime: 1_000_000,
		});

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

		jest.setSystemTime(1_005_000);
		jest.advanceTimersByTime(pollIntervalMs + 2000);
		await drain(12);
		expect(tabsUpdate).not.toHaveBeenCalledWith(2, { active: true });

		tabsUpdate.mockClear();

		const makePrefs = (enabled: boolean) => normalizeUserPreferences({ ...createDefaultUserPreferences(), ...switchPrefs, enabled });
		await sendMessage({ type: 'UPDATE_PREFS', prefs: makePrefs(false) });
		await sendMessage({ type: 'UPDATE_PREFS', prefs: makePrefs(true) });

		jest.setSystemTime(1_010_000);
		jest.advanceTimersByTime(pollIntervalMs + 2000);
		await drain(12);
		expect(tabsUpdate).toHaveBeenCalledWith(2, { active: true });
	});
});

describe('standby stream tab mute state', () => {
	const standbyTabId = 5;
	const gameTabs: TabRegistration[] = [{ gameId: 'g1', tabId: 2 }, { gameId: 'g2', tabId: 3 }];

	const standbyPrefs: Partial<UserPreferences> = {
		enabled: true,
		enabledLeagues: ['nba' as LeagueId],
		standbyStreamEnabled: true,
		notificationsEnabled: false,
	};

	const mockOpenTabs = (activeTabId: number) => {
		tabsQuery.mockImplementation((q: unknown) => {
			if ((q as { active?: boolean }).active) return Promise.resolve([{ id: activeTabId }]);
			return Promise.resolve([{ id: 1 }, { id: 2 }, { id: 3 }, { id: standbyTabId }]);
		});
	};

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
		await loadBackground({
			prefs: switchingPrefs,
			tabRegistry: registry,
			fetchReturnValue: { games: [thriller, closeGame], leagueLogos: {}, shedLeagues: [] },
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
			fetchReturnValue: { games: [thriller, closeGame], leagueLogos: {}, shedLeagues: [] },
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
			fetchReturnValue: { games: [thriller, closeGame], leagueLogos: {}, shedLeagues: [] },
			openTabIds: [1, 2, 3],
			activeTabId: 1,
			initialSystemTime: 1_000_000,
		});

		mockOpenTabIds([1, 3], 1);
		await runFirstPoll();

		expect(tabsUpdate).toHaveBeenCalledWith(3, { active: true });
		expect(tabsUpdate).not.toHaveBeenCalledWith(2, { active: true });
	});

	test('keeps a stale registry from an open popup from bringing back a closed tab', async () => {
		await loadBackground({
			prefs: switchingPrefs,
			tabRegistry: [{ gameId: 'close', tabId: 3 }],
			fetchReturnValue: { games: [thriller, closeGame], leagueLogos: {}, shedLeagues: [] },
			openTabIds: [1, 3],
			activeTabId: 1,
			initialSystemTime: 1_000_000,
		});

		await sendMessage({ type: 'UPDATE_REGISTRY', tabRegistry: registry });

		expect((await getDebugState()).tabRegistry).toEqual([{ gameId: 'close', tabId: 3 }]);

		await runFirstPoll();

		expect(tabsUpdate).toHaveBeenCalledWith(3, { active: true });
		expect(tabsUpdate).not.toHaveBeenCalledWith(2, { active: true });
	});

	test('forgets the standby stream tab when it closes', async () => {
		await loadBackground({
			prefs: { ...switchingPrefs, standbyStreamEnabled: true },
			tabRegistry: [{ gameId: 'thriller', tabId: 2 }],
			standbyStreamTabId: 5,
			fetchReturnValue: { games: [blowout], leagueLogos: {}, shedLeagues: [] },
			openTabIds: [1, 2, 5],
			activeTabId: 1,
			initialSystemTime: 1_000_000,
		});

		mockOpenTabIds([1, 2], 1);
		await closeTab(5);

		expect((await getDebugState()).standbyStreamTabId).toBeNull();

		await runFirstPoll();

		expect(tabsUpdate).not.toHaveBeenCalledWith(5, { active: true });
		expect(tabsUpdate).toHaveBeenCalledWith(2, { active: true });
	});

	test('does not wipe the registry when tabs.query cannot see any tabs', async () => {
		await loadBackground({
			prefs: switchingPrefs,
			tabRegistry: registry,
			fetchReturnValue: { games: [thriller, closeGame], leagueLogos: {}, shedLeagues: [] },
			initialSystemTime: 1_000_000,
		});

		expect((await getDebugState()).tabRegistry).toEqual(registry);
	});
});

describe('settings synced from another browser', () => {
	const load = async (prefs: Partial<UserPreferences>) => {
		await loadBackground({
			prefs,
			tabRegistry: [{ gameId: 'thriller', tabId: 2 }],
			fetchReturnValue: { games: [thriller], leagueLogos: {}, shedLeagues: [] },
			openTabIds: [1, 2],
			activeTabId: 1,
			initialSystemTime: 1_000_000,
		});
	};

	const syncChange = async (prefs: Partial<UserPreferences>, updatedAt: number) => {
		storageSyncGet.mockResolvedValue({
			prefs: normalizeUserPreferences({ ...createDefaultUserPreferences(), ...prefs }),
			[prefsStorageUpdatedAtKey]: updatedAt,
		});
		for (const handler of onSyncChangedHandlers) handler({ prefs: {} });
		await drain();
	};

	test('a running worker stops switching when another browser turns ArenaSwap off', async () => {
		await load(switchingPrefs);

		await syncChange({ ...switchingPrefs, enabled: false }, 2_000_000);
		await runFirstPoll();

		expect(tabsUpdate).not.toHaveBeenCalledWith(2, { active: true });
	});

	test('an echo of this browser\'s own prefs leaves a queued switch alone', async () => {
		const prefs = { ...switchingPrefs, switchDelaySeconds: 60 };
		await load(prefs);
		await runFirstPoll();
		expect((await getDebugState()).pendingSwitch).not.toBeNull();

		await syncChange(prefs, 2_000_000);

		expect((await getDebugState()).pendingSwitch).not.toBeNull();
	});
});

describe('a poll in flight when its league is switched off', () => {
	test('drops the late answer and never switches to a game from it', async () => {
		const mlbGame = { ...mkGame('mlb-live', 100, 100, 9, 20), league: 'mlb' as LeagueId, sportType: 'baseball' };
		const bothLeagues = { ...switchingPrefs, enabledLeagues: ['nba' as LeagueId, 'mlb' as LeagueId] };
		await loadBackground({
			prefs: bothLeagues,
			tabRegistry: [{ gameId: 'mlb-live', tabId: 2 }],
			openTabIds: [1, 2],
			activeTabId: 1,
			initialSystemTime: 1_000_000,
		});

		let answerMlb!: () => void;
		let held = false;
		fetchMock.mockImplementation(async (leagues: LeagueId[], options?: { includeUpcoming?: boolean }) => {
			if (leagues[0] === 'mlb' && options?.includeUpcoming === false && !held) {
				held = true;
				await new Promise<void>(resolve => { answerMlb = resolve; });
				return { games: [mlbGame], leagueLogos: {}, shedLeagues: [] };
			}
			return { games: [], leagueLogos: {}, shedLeagues: [] };
		});
		await runFirstPoll();
		expect(held).toBe(true);

		await sendMessage({
			type: 'UPDATE_PREFS',
			prefs: normalizeUserPreferences({ ...createDefaultUserPreferences(), ...bothLeagues, enabledLeagues: ['nba' as LeagueId] }),
		});
		answerMlb();
		await drain(16);

		const state = await sendMessage({ type: 'GET_STATE' }) as { games: Game[] };
		expect(state.games.map(g => g.id)).not.toContain('mlb-live');
		expect(tabsUpdate).not.toHaveBeenCalledWith(2, { active: true });
	});
	test('drops a late failure too, so the league is not marked shed', async () => {
		const bothLeagues = { ...switchingPrefs, enabledLeagues: ['nba' as LeagueId, 'mlb' as LeagueId] };
		await loadBackground({ prefs: bothLeagues, openTabIds: [1], activeTabId: 1, initialSystemTime: 1_000_000 });

		let failMlb!: () => void;
		let held = false;
		fetchMock.mockImplementation(async (leagues: LeagueId[], options?: { includeUpcoming?: boolean }) => {
			if (leagues[0] === 'mlb' && options?.includeUpcoming === false && !held) {
				held = true;
				await new Promise<void>((_, reject) => { failMlb = () => reject(new Error('offline')); });
			}
			return { games: [thriller], leagueLogos: {}, shedLeagues: [] };
		});
		await runFirstPoll();
		expect(held).toBe(true);

		await sendMessage({
			type: 'UPDATE_PREFS',
			prefs: normalizeUserPreferences({ ...createDefaultUserPreferences(), ...bothLeagues, enabledLeagues: ['nba' as LeagueId] }),
		});
		failMlb();
		await drain(16);

		const state = await sendMessage({ type: 'GET_STATE' }) as { slateShedLeagues: LeagueId[] };
		expect(state.slateShedLeagues).not.toContain('mlb');
	});

});

describe('a queued switch when the user changes course', () => {
	const queue = async () => {
		await loadBackground({
			prefs: { ...switchingPrefs, switchDelaySeconds: 10 },
			tabRegistry: [{ gameId: 'thriller', tabId: 2 }, { gameId: 'close', tabId: 3 }],
			fetchReturnValue: { games: [thriller, closeGame], leagueLogos: {}, shedLeagues: [] },
			openTabIds: [1, 2, 3],
			activeTabId: 1,
			initialSystemTime: 1_000_000,
		});
		await runFirstPoll();
		expect((await getDebugState()).pendingSwitch).toEqual(expect.objectContaining({ tabId: 2 }));
	};

	const waitOutTheDelay = async () => {
		jest.advanceTimersByTime(15_000);
		await drain(16);
	};

	test('turning ArenaSwap off drops it', async () => {
		await queue();
		await sendMessage({
			type: 'UPDATE_PREFS',
			prefs: normalizeUserPreferences({ ...createDefaultUserPreferences(), ...switchingPrefs, switchDelaySeconds: 10, enabled: false }),
		});
		await waitOutTheDelay();

		expect(tabsUpdate).not.toHaveBeenCalledWith(2, { active: true });
	});

	test('a registry without the target tab drops it', async () => {
		await queue();
		await sendMessage({ type: 'UPDATE_REGISTRY', tabRegistry: [{ gameId: 'close', tabId: 3 }] });
		await waitOutTheDelay();

		expect(tabsUpdate).not.toHaveBeenCalledWith(2, { active: true });
	});

	test('starting demo mode drops it', async () => {
		await queue();
		await sendMessage({ type: 'SET_DEMO_MODE', enabled: true });
		await waitOutTheDelay();

		expect(tabsUpdate).not.toHaveBeenCalledWith(2, { active: true });
	});

	test('choosing a standby stream drops it', async () => {
		await queue();
		await sendMessage({ type: 'SET_STANDBY_STREAM_TAB', tabId: 9 });
		expect((await getDebugState()).pendingSwitch).toBeNull();

		await waitOutTheDelay();
		expect(tabsUpdate).not.toHaveBeenCalledWith(2, { active: true });
	});
});

describe('pending switch re-validation', () => {
	test('re-targets when the queued game ends during the delay', async () => {
		await loadBackground({
			prefs: { ...switchingPrefs, switchDelaySeconds: 60 },
			tabRegistry: [{ gameId: 'thriller', tabId: 2 }, { gameId: 'close', tabId: 3 }],
			fetchReturnValue: { games: [thriller, closeGame], leagueLogos: {}, shedLeagues: [] },
			openTabIds: [1, 2, 3],
			activeTabId: 1,
			initialSystemTime: 1_000_000,
		});

		await runFirstPoll();

		expect((await getDebugState()).pendingSwitch).toEqual(
			expect.objectContaining({ gameId: 'thriller', tabId: 2 }),
		);
		expect(tabsUpdate).not.toHaveBeenCalledWith(2, { active: true });

		fetchMock.mockResolvedValue({
			games: [{ ...thriller, status: 'post' }, closeGame],
			leagueLogos: {},
			shedLeagues: [],
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
			fetchReturnValue: { games: [thriller], leagueLogos: {}, shedLeagues: [] },
			openTabIds: [1, 2, 5],
			activeTabId: 1,
			initialSystemTime: 1_000_000,
		});

		await runFirstPoll();
		expect((await getDebugState()).pendingSwitch).not.toBeNull();

		fetchMock.mockResolvedValue({ games: [blowout], leagueLogos: {}, shedLeagues: [] });
		jest.advanceTimersByTime(30_000);
		await drain(16);

		expect(tabsUpdate).toHaveBeenCalledWith(5, { active: true });
		expect((await getDebugState()).pendingSwitch).toBeNull();

		jest.advanceTimersByTime(60_000);
		await drain(16);

		expect(tabsUpdate).not.toHaveBeenCalledWith(2, { active: true });
	});
});

describe('manual tab activation', () => {
	test('starts the cooldown when the user lands on a registered game tab', async () => {
		await loadBackground({
			prefs: switchingPrefs,
			tabRegistry: [{ gameId: 'thriller', tabId: 2 }],
			fetchReturnValue: { games: [thriller], leagueLogos: {}, shedLeagues: [] },
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
			fetchReturnValue: { games: [thriller], leagueLogos: {}, shedLeagues: [] },
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
			fetchReturnValue: { games: [thriller], leagueLogos: {}, shedLeagues: [] },
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
			fetchReturnValue: { games: [thriller], leagueLogos: {}, shedLeagues: [] },
			openTabIds: [1, 2],
			activeTabId: 1,
			initialSystemTime: 1_000_000,
		});

		await activateTab(2);

		await runFirstPoll();
		expect(tabsUpdate).toHaveBeenCalledWith(2, { active: true });
	});

	test('posts every switch notification under the same id', async () => {
		await loadBackground({
			prefs: { ...switchingPrefs, cooldownSeconds: 0, notificationsEnabled: true },
			tabRegistry: [{ gameId: 'thriller', tabId: 2 }],
			fetchReturnValue: { games: [thriller], leagueLogos: {}, shedLeagues: [] },
			openTabIds: [1, 2],
			activeTabId: 1,
			initialSystemTime: 1_000_000,
		});

		await activateTab(2);
		await runFirstPoll();
		expect(tabsUpdate).toHaveBeenCalledWith(2, { active: true });
		expect(notificationsCreate).toHaveBeenCalledWith('arenaswap-switch', expect.objectContaining({ type: 'basic' }));
	});

	test('switches when the cooldown is off and the evaluation lands in the same millisecond', async () => {
		await loadBackground({
			prefs: { ...switchingPrefs, cooldownSeconds: 0 },
			tabRegistry: [{ gameId: 'thriller', tabId: 2 }],
			fetchReturnValue: { games: [thriller], leagueLogos: {}, shedLeagues: [] },
			openTabIds: [1, 2],
			activeTabId: 1,
			initialSystemTime: 1_000_000,
		});

		await activateTab(2);
		const activatedAt = Date.now();

		jest.advanceTimersByTime(pollIntervalMs + 2000);
		jest.setSystemTime(activatedAt);
		await drain(16);

		expect(tabsUpdate).toHaveBeenCalledWith(2, { active: true });
	});
});

describe('mute sync resilience', () => {
	test('still evaluates the switch when one tab rejects its mute update', async () => {
		await loadBackground({
			prefs: switchingPrefs,
			tabRegistry: [{ gameId: 'thriller', tabId: 2 }, { gameId: 'close', tabId: 3 }],
			fetchReturnValue: { games: [thriller, closeGame], leagueLogos: {}, shedLeagues: [] },
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

	test('and the poll still asks for them while it is off', async () => {
		await loadBackground({ prefs: { enabledLeagues: ['nba' as LeagueId], keepFinalGames: false, finishedTabAction: 'keep' } });
		await sendMessage({ type: 'GET_STATE', forceRefresh: true });
		const pollOptions = fetchOptions().filter(options => options.includeUpcoming === false);
		expect(pollOptions.length).toBeGreaterThan(0);
		for (const options of pollOptions) expect(options.includeFinal).toBe(true);
	});

	test('and keeps them off the popup', async () => {
		await loadBackground({
			prefs: { enabledLeagues: ['nba' as LeagueId], keepFinalGames: false },
			fetchReturnValue: { games: [finishedGame('done', 1), liveGame('playing')], leagueLogos: {}, shedLeagues: [] },
		});
		await sendMessage({ type: 'GET_STATE', forceRefresh: true });
		expect((await stateGames()).map(game => game.id)).toEqual(['playing']);
	});

	test('a finished game reaches the popup state', async () => {
		await loadBackground({
			prefs: { enabledLeagues: ['nba' as LeagueId], keepFinalGames: true },
			fetchReturnValue: { games: [finishedGame('done', 4), liveGame('playing')], leagueLogos: {}, shedLeagues: [] },
		});
		expect((await stateGames()).map(g => g.id).toSorted()).toEqual(['done', 'playing']);
	});

	test('survives a poll that no longer returns it', async () => {
		await loadBackground({
			prefs: { enabledLeagues: ['nba' as LeagueId], keepFinalGames: true },
			fetchReturnValue: { games: [finishedGame('yesterday', 20), liveGame('playing')], leagueLogos: {}, shedLeagues: [] },
		});
		expect((await stateGames()).map(g => g.id)).toContain('yesterday');

		fetchMock.mockResolvedValue({ games: [liveGame('playing')], leagueLogos: {}, shedLeagues: [] });
		await sendMessage({ type: 'GET_STATE', forceRefresh: true });
		expect((await stateGames()).map(g => g.id).toSorted()).toEqual(['playing', 'yesterday']);
	});

	test('is dropped once it has aged out, without waiting for another fetch', async () => {
		await loadBackground({
			prefs: { enabledLeagues: ['nba' as LeagueId], keepFinalGames: true },
			fetchReturnValue: { games: [finishedGame('ageing', 20), liveGame('playing')], leagueLogos: {}, shedLeagues: [] },
		});
		expect((await stateGames()).map(g => g.id)).toContain('ageing');

		fetchMock.mockResolvedValue({ games: [liveGame('playing')], leagueLogos: {}, shedLeagues: [] });
		jest.setSystemTime(Date.now() + (9 * 60 * 60 * 1000));
		await sendMessage({ type: 'GET_STATE', forceRefresh: true });
		expect((await stateGames()).map(g => g.id)).toEqual(['playing']);
	});

	test('turning the setting off clears the finals already in state', async () => {
		await loadBackground({
			prefs: { enabledLeagues: ['nba' as LeagueId], keepFinalGames: true },
			fetchReturnValue: { games: [finishedGame('done', 4), liveGame('playing')], leagueLogos: {}, shedLeagues: [] },
		});
		expect((await stateGames()).map(g => g.id)).toContain('done');

		const prefs = normalizeUserPreferences({
			...createDefaultUserPreferences(),
			enabledLeagues: ['nba' as LeagueId],
			keepFinalGames: false,
		});
		fetchMock.mockResolvedValue({ games: [liveGame('playing')], leagueLogos: {}, shedLeagues: [] });
		await sendMessage({ type: 'UPDATE_PREFS', prefs });
		expect((await stateGames()).map(g => g.id)).toEqual(['playing']);
	});

	test('turning it on brings them in without waiting for the next poll', async () => {
		await loadBackground({
			prefs: { enabledLeagues: ['nba' as LeagueId], keepFinalGames: false },
			fetchReturnValue: { games: [liveGame('playing')], leagueLogos: {}, shedLeagues: [] },
		});
		expect((await stateGames()).map(g => g.id)).toEqual(['playing']);

		const prefs = normalizeUserPreferences({
			...createDefaultUserPreferences(),
			enabledLeagues: ['nba' as LeagueId],
			keepFinalGames: true,
		});
		fetchMock.mockResolvedValue({ games: [finishedGame('done', 4), liveGame('playing')], leagueLogos: {}, shedLeagues: [] });
		await sendMessage({ type: 'UPDATE_PREFS', prefs });
		expect((await stateGames()).map(g => g.id).toSorted()).toEqual(['done', 'playing']);
	});

	test('a finished game is never scored, so it cannot be switched to', async () => {
		await loadBackground({
			prefs: { enabledLeagues: ['nba' as LeagueId], keepFinalGames: true },
			fetchReturnValue: { games: [finishedGame('done', 4), liveGame('playing')], leagueLogos: {}, shedLeagues: [] },
		});
		const state = await sendMessage({ type: 'GET_STATE' }) as { scores: { gameId: string }[] };
		expect(state.scores.map(s => s.gameId)).toEqual(['playing']);
	});
});

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

	const alsoPlaying: Game = {
		id: 'other', league: 'nba' as LeagueId, sportType: 'basketball', status: 'in',
		period: 2, clockSeconds: 400, startTime: new Date(Date.UTC(2026, 8, 7, 23, 30, 0)).toISOString(),
		homeTeam: { id: 'h2', name: 'H2', abbreviation: 'HH', score: 40 },
		awayTeam: { id: 'a2', name: 'A2', abbreviation: 'AA', score: 38 },
	};

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
			fetchReturnValue: { games: [gameAt(startMs, 'in'), alsoPlaying], leagueLogos: {}, shedLeagues: [] },
		});

		fetchMock.mockResolvedValue({ games: [gameAt(startMs, 'post'), alsoPlaying], leagueLogos: {}, shedLeagues: [] });
		jest.setSystemTime(startMs + (2.5 * 60 * 60 * 1000));
		await pollOnce();
		expect(await stateIds()).toEqual(['other', 'wrapper']);

		fetchMock.mockResolvedValue({ games: [alsoPlaying], leagueLogos: {}, shedLeagues: [] });
		jest.setSystemTime(startMs + (3 * 60 * 60 * 1000));
		await pollOnce();
		expect(await stateIds()).toEqual(['other', 'wrapper']);
	});

	test('and still ages out on its own schedule once it is past the window', async () => {
		const startMs = Date.UTC(2026, 8, 7, 23, 0, 0);
		await loadBackground({
			prefs: nbaOnly,
			initialSystemTime: startMs,
			fetchReturnValue: { games: [gameAt(startMs, 'post'), alsoPlaying], leagueLogos: {}, shedLeagues: [] },
		});
		await pollOnce();
		expect(await stateIds()).toEqual(['other', 'wrapper']);

		fetchMock.mockResolvedValue({ games: [alsoPlaying], leagueLogos: {}, shedLeagues: [] });
		jest.setSystemTime(startMs + (26.6 * 60 * 60 * 1000));
		await pollOnce();
		expect(await stateIds()).toEqual(['other']);
	});

	test('is never scored, so the switcher cannot reach it', async () => {
		const startMs = Date.UTC(2026, 8, 7, 23, 0, 0);
		await loadBackground({
			prefs: nbaOnly,
			initialSystemTime: startMs,
			fetchReturnValue: { games: [gameAt(startMs, 'post'), alsoPlaying], leagueLogos: {}, shedLeagues: [] },
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
				shedLeagues: [],
			},
		});
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

	test('thins the tail instead of growing without bound', async () => {
		const { powerScoreHistory } = await walkAWholeGame();
		expect(powerScoreHistory.played!.length).toBeLessThan(200);
	});

	test('is not kept at all when nothing could draw it', async () => {
		const { powerScoreHistory } = await walkAWholeGame(false);
		const snapshots = powerScoreHistory.played!;
		const end = startMs + (140 * 60 * 1000);
		expect(snapshots[0]!.timestamp).toBeGreaterThanOrEqual(end - historyWindowMs);
		expect(coversWholeGame(snapshots, finishedGame, end)).toBe(false);
	});

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

	test('still reports a late start as not covering the game', async () => {
		const lateStart = { timestamp: startMs + (basketballAllowanceMs * 0.5) };
		const lateEnd = { timestamp: startMs + (basketballAllowanceMs * 0.95) };
		expect(coversWholeGame([lateStart, lateEnd], finishedGame, startMs + basketballAllowanceMs)).toBe(false);
	});
});

describe('polling a league with nothing on', () => {
	const nbaOnly = { enabledLeagues: ['nba' as LeagueId] };
	const emptySlate = { games: [], leagueLogos: {}, shedLeagues: [] };

	const debugState = async () => await sendMessage({ type: 'GET_DEBUG_STATE' }) as {
		pollModes: Record<string, string>;
		leagueIntervals: Record<string, number>;
	};

	const pollOnce = async (limitMs = 10 * 60_000) => {
		fetchMock.mockClear();
		for (let waited = 0; waited < limitMs && fetchMock.mock.calls.length === 0; waited += 5_000) {
			jest.advanceTimersByTime(5_000);
			await drain();
		}
		expect(fetchMock).toHaveBeenCalled();
	};

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

	test('the lookahead is spent once on the way in, not on every tick', async () => {
		await loadBackground({ prefs: nbaOnly, initialSystemTime: startMs, fetchReturnValue: emptySlate });
		await goQuiet();
		expect(lookahead()).toHaveBeenCalledTimes(1);
		expect(lookahead()).toHaveBeenCalledWith('nba', { groups: [] });

		await pollOnce(pollHebetudinousMaxMs + 60_000);
		await pollOnce(pollHebetudinousMaxMs + 60_000);
		expect(lookahead()).toHaveBeenCalledTimes(1);
	});

	test('a game later today keeps the league dormant, however many hours off it is', async () => {
		const hours = [1, 5, 19];
		const seen: { hoursOut: number; mode: string; intervalMs: number }[] = [];
		for (const hoursOut of hours) {
			await loadBackground({
				prefs: nbaOnly,
				initialSystemTime: startMs,
				fetchReturnValue: { games: [scheduledGame(startMs + hoursOut * 60 * 60_000)], leagueLogos: {}, shedLeagues: [] },
			});
			await goQuiet();

			const state = await debugState();
			seen.push({ hoursOut, mode: state.pollModes.nba!, intervalMs: state.leagueIntervals.nba! });
		}
		expect(seen).toEqual(hours.map(hoursOut => ({ hoursOut, mode: 'dormant', intervalMs: pollDormantMaxMs })));
	});

	test('a kickoff the poll itself carried costs no lookahead at all', async () => {
		await loadBackground({
			prefs: nbaOnly,
			initialSystemTime: startMs,
			fetchReturnValue: { games: [scheduledGame(startMs + 6 * 60 * 60_000)], leagueLogos: {}, shedLeagues: [] },
		});
		await goQuiet();

		expect(lookahead()).not.toHaveBeenCalled();
	});

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

		fetchMock.mockResolvedValue({ games: [liveGame], leagueLogos: {}, shedLeagues: [] });
		await pollOnce(pollHebetudinousMaxMs + 60_000);

		const state = await debugState();
		expect(state.pollModes.nba).toBe('eager');
		expect(state.leagueIntervals.nba).toBeLessThanOrEqual(pollMaxEagerMs + 2_000);
	});

	test('a failed lookahead leaves the league dormant rather than asleep', async () => {
		await loadBackground({ prefs: nbaOnly, initialSystemTime: startMs, fetchReturnValue: emptySlate });
		lookahead().mockRejectedValue(new Error('503'));
		await goQuiet();

		const state = await debugState();
		expect(state.pollModes.nba).toBe('dormant');
		expect(state.leagueIntervals.nba).toBe(pollDormantMaxMs);
	});

	describe('when the poll keeps failing', () => {
		const refused = { games: [], leagueLogos: {}, shedLeagues: ['nba' as LeagueId] };
		const retryDelays = async (count: number) => {
			const delays: number[] = [];
			for (let attempt = 0; attempt < count; attempt += 1) {
				await pollOnce(40 * 60_000);
				delays.push((await debugState()).leagueIntervals.nba!);
			}
			return delays;
		};

		test('each retry waits twice as long as the last, up to the interval the league was on', async () => {
			await loadBackground({ prefs: nbaOnly, initialSystemTime: startMs, fetchReturnValue: emptySlate });
			await goQuiet();
			fetchMock.mockResolvedValue(refused);

			expect(await retryDelays(9)).toEqual([
				17_000, 32_000, 62_000, 122_000, 242_000, 482_000, 962_000, pollHebetudinousMaxMs, pollHebetudinousMaxMs,
			]);
		});

		test('a dormant league stops backing off at its own beat', async () => {
			await loadBackground({ prefs: nbaOnly, initialSystemTime: startMs, fetchReturnValue: emptySlate });
			lookahead().mockResolvedValue(startMs + 45 * 60_000);
			await goQuiet();
			fetchMock.mockResolvedValue(refused);

			expect(await retryDelays(6)).toEqual([17_000, 32_000, 62_000, 122_000, pollDormantMaxMs, pollDormantMaxMs]);
		});

		test('a league that has never answered backs off to the dormant beat, not the live one', async () => {
			await loadBackground({ prefs: nbaOnly, initialSystemTime: startMs, fetchReturnValue: refused });

			expect(await retryDelays(6)).toEqual([17_000, 32_000, 62_000, 122_000, pollDormantMaxMs, pollDormantMaxMs]);
		});

		test('a league with a game on never retries slower than the live cadence', async () => {
			await loadBackground({
				prefs: nbaOnly,
				initialSystemTime: startMs,
				fetchReturnValue: { games: [liveGame], leagueLogos: {}, shedLeagues: [] },
			});
			await pollOnce();
			fetchMock.mockResolvedValue(refused);

			const delays = await retryDelays(6);
			expect(Math.max(...delays)).toBeLessThanOrEqual(pollMaxEagerMs + 2_000);
			expect(Math.min(...delays)).toBeGreaterThanOrEqual(17_000);
		});

		test('a sleeping league keeps its ceiling after the lookahead it slept on has expired', async () => {
			await loadBackground({ prefs: nbaOnly, initialSystemTime: startMs, fetchReturnValue: emptySlate });
			await goQuiet();
			expect((await debugState()).pollModes.nba).toBe('hebetudinous');
			fetchMock.mockResolvedValue(refused);
			await retryDelays(9);

			jest.setSystemTime(startMs + pollLookaheadTtlMs + 60 * 60_000);
			expect(await retryDelays(2)).toEqual([pollHebetudinousMaxMs, pollHebetudinousMaxMs]);
			expect((await debugState()).pollModes.nba).toBe('dormant');
		});

		test('really does wait that long before asking again', async () => {
			await loadBackground({ prefs: nbaOnly, initialSystemTime: startMs, fetchReturnValue: emptySlate });
			await goQuiet();
			fetchMock.mockResolvedValue(refused);
			await retryDelays(2);

			fetchMock.mockClear();
			jest.advanceTimersByTime(30_000);
			await drain();
			expect(fetchMock).not.toHaveBeenCalled();

			jest.advanceTimersByTime(3_000);
			await drain();
			expect(fetchMock).toHaveBeenCalled();
		});

		test('the first answer puts the league back on its own beat and the count back to zero', async () => {
			await loadBackground({ prefs: nbaOnly, initialSystemTime: startMs, fetchReturnValue: emptySlate });
			await goQuiet();
			fetchMock.mockResolvedValue(refused);
			expect(await retryDelays(3)).toEqual([17_000, 32_000, 62_000]);

			fetchMock.mockResolvedValue(emptySlate);
			await pollOnce();
			expect((await debugState()).leagueIntervals.nba).toBe(pollHebetudinousMaxMs);

			fetchMock.mockResolvedValue(refused);
			expect(await retryDelays(2)).toEqual([17_000, 32_000]);
		});
	});
});

const game = (id: string, status: Game['status']): Game => ({
	id,
	league: 'nba' as LeagueId,
	sportType: 'basketball',
	status,
	homeTeam: { id: `${id}-h`, name: 'Home', abbreviation: 'HOM', score: 0 },
	awayTeam: { id: `${id}-a`, name: 'Away', abbreviation: 'AWY', score: 0 },
	period: 0,
	clockSeconds: 0,
});

describe('GET_GUIDE_SLATE', () => {
	const nbaOnly: Partial<UserPreferences> = { enabledLeagues: ['nba' as LeagueId], enabled: false };

	const guideSlate = () => onMessageHandler({ type: 'GET_GUIDE_SLATE' }) as Promise<{ games: Game[]; refused?: boolean }>;

	const guideDebugState = async () => await onMessageHandler({ type: 'GET_DEBUG_STATE' }) as {
		totalGameCount: number;
		upcomingGameCount: number;
	};

	test('asks for scheduled games and finals even with both display preferences off', async () => {
		await loadBackground({
			prefs: { ...nbaOnly, showUpcomingGames: false, keepFinalGames: false },
			fetchReturnValue: { games: [game('live', 'in')], leagueLogos: {}, shedLeagues: [] },
		});
		fetchMock.mockClear();
		await guideSlate();

		const options = fetchMock.mock.calls.at(-1)![1];
		expect(options.includeUpcoming).toBe(true);
		expect(options.includeFinal).toBe(true);
	});

	test('spans as many days ahead as Up Next is set to', async () => {
		await loadBackground({
			prefs: { ...nbaOnly, upcomingGamesDays: 9 },
			fetchReturnValue: { games: [game('live', 'in')], leagueLogos: {}, shedLeagues: [] },
		});
		fetchMock.mockClear();
		await guideSlate();

		expect(lastWideFetchOptions()?.upcomingDays).toBe(9);
	});

	test('still reaches a few days out when Up Next is set to one day', async () => {
		await loadBackground({
			prefs: { ...nbaOnly, upcomingGamesDays: 1 },
			fetchReturnValue: { games: [game('live', 'in')], leagueLogos: {}, shedLeagues: [] },
		});
		fetchMock.mockClear();
		await guideSlate();

		expect(lastWideFetchOptions()?.upcomingDays).toBe(guideMinUpcomingDays);
		expect(guideMinUpcomingDays).toBeGreaterThan(1);
	});

	test('spends nothing on a repeat open', async () => {
		await loadBackground({
			prefs: nbaOnly,
			fetchReturnValue: { games: [game('live', 'in')], leagueLogos: {}, shedLeagues: [] },
		});
		await guideSlate();
		fetchMock.mockClear();

		const slate = await guideSlate();
		expect(fetchMock).not.toHaveBeenCalled();
		expect(slate.games.map(g => g.id)).toEqual(['live']);
	});

	test('keeps drawing the slate it holds when ESPN goes down under it', async () => {
		await loadBackground({
			prefs: nbaOnly,
			fetchReturnValue: { games: [game('live', 'in')], leagueLogos: {}, shedLeagues: [] },
		});
		await guideSlate();
		fetchMock.mockRejectedValue(new Error('503'));

		const slate = await guideSlate();
		expect(slate.games.map(g => g.id)).toEqual(['live']);
	});

	test('returns the finals the popup would have thrown away', async () => {
		await loadBackground({
			prefs: { ...nbaOnly, showUpcomingGames: false, keepFinalGames: false },
			fetchReturnValue: { games: [game('live', 'in')], leagueLogos: {}, shedLeagues: [] },
		});
		fetchMock.mockResolvedValue({ games: [game('done', 'post'), game('later', 'pre')], leagueLogos: {}, shedLeagues: [] });

		const slate = await guideSlate();
		expect(slate.games.map(g => g.id).toSorted()).toEqual(['done', 'later']);
	});

	test('does not leak its wider slate into the state the switcher scores', async () => {
		await loadBackground({
			prefs: { ...nbaOnly, showUpcomingGames: false, keepFinalGames: false },
			fetchReturnValue: { games: [game('live', 'in')], leagueLogos: {}, shedLeagues: [] },
		});
		fetchMock.mockResolvedValue({ games: [game('done', 'post'), game('later', 'pre')], leagueLogos: {}, shedLeagues: [] });
		await guideSlate();

		const state = await guideDebugState();
		expect(state.totalGameCount).toBe(1);
		expect(state.upcomingGameCount).toBe(0);
	});

	test('answers with an error rather than throwing when it has nothing and ESPN cannot be reached', async () => {
		await loadBackground({
			prefs: { ...nbaOnly, showUpcomingGames: false, keepFinalGames: false },
			fetchReturnValue: { games: [game('live', 'in')], leagueLogos: {}, shedLeagues: [] },
		});
		fetchMock.mockRejectedValue(new Error('503'));

		await expect(guideSlate()).resolves.toMatchObject({ games: [], refused: true });
	});

	test('does not cache a slate every league refused, and asks again once the retry window passes', async () => {
		await loadBackground({
			prefs: { ...nbaOnly, showUpcomingGames: false, keepFinalGames: false },
			fetchReturnValue: { games: [game('live', 'in')], leagueLogos: {}, shedLeagues: [] },
		});
		fetchMock.mockResolvedValue({ games: [], leagueLogos: {}, shedLeagues: ['nba'] });
		await expect(guideSlate()).resolves.toMatchObject({ games: [], refused: true });

		jest.setSystemTime(Date.now() + 61_000);
		fetchMock.mockClear();
		fetchMock.mockResolvedValue({ games: [game('later', 'pre')], leagueLogos: {}, shedLeagues: [] });
		const slate = await guideSlate();

		expect(fetchMock).toHaveBeenCalled();
		expect(slate.games.map(g => g.id)).toEqual(['later']);
		expect(slate.refused).toBe(false);
	});

	test('costs one wide fetch, not one per open, while a partial refusal is held', async () => {
		const nflGame = (id: string): Game => ({ ...game(id, 'pre'), league: 'nfl' as LeagueId });
		await loadBackground({
			prefs: { enabledLeagues: ['nba' as LeagueId, 'nfl' as LeagueId], enabled: false, showUpcomingGames: false, keepFinalGames: false },
			fetchReturnValue: { games: [game('live', 'in')], leagueLogos: {}, shedLeagues: [] },
		});
		fetchMock.mockResolvedValue({ games: [game('nba-new', 'pre')], leagueLogos: {}, shedLeagues: ['nfl'] });
		fetchMock.mockClear();

		await guideSlate();
		await guideSlate();
		await guideSlate();
		expect(fetchMock).toHaveBeenCalledTimes(1);

		jest.setSystemTime(Date.now() + 61_000);
		fetchMock.mockResolvedValue({ games: [game('nba-new', 'pre'), nflGame('nfl-back')], leagueLogos: {}, shedLeagues: [] });
		const slate = await guideSlate();
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(slate.games.map(g => g.id).toSorted()).toEqual(['nba-new', 'nfl-back']);
	});

	test('costs one wide fetch for three asks made while the first is still running, force included', async () => {
		await loadBackground({
			prefs: { ...nbaOnly, showUpcomingGames: false, keepFinalGames: false },
			fetchReturnValue: { games: [game('live', 'in')], leagueLogos: {}, shedLeagues: [] },
		});
		const pending = Promise.withResolvers<unknown>();
		fetchMock.mockClear();
		fetchMock.mockImplementation(() => pending.promise);

		const asks = [
			guideSlate(),
			guideSlate(),
			onMessageHandler({ type: 'GET_GUIDE_SLATE', force: true }) as Promise<{ games: Game[] }>,
		];
		await drain(16);
		pending.resolve({ games: [game('later', 'pre')], leagueLogos: {}, shedLeagues: [] });
		const replies = await Promise.all(asks);

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(replies.map(reply => reply.games.map(g => g.id))).toEqual([['later'], ['later'], ['later']]);

		fetchMock.mockClear();
		jest.setSystemTime(Date.now() + 11 * 60_000);
		fetchMock.mockResolvedValue({ games: [game('next', 'pre')], leagueLogos: {}, shedLeagues: [] });
		expect((await guideSlate()).games.map(g => g.id)).toEqual(['next']);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	test('keeps saying so, without asking again, while a refusal with nothing held is waited out', async () => {
		await loadBackground({
			prefs: { ...nbaOnly, showUpcomingGames: false, keepFinalGames: false },
			fetchReturnValue: { games: [game('live', 'in')], leagueLogos: {}, shedLeagues: [] },
		});
		fetchMock.mockResolvedValue({ games: [], leagueLogos: {}, shedLeagues: ['nba'] });
		fetchMock.mockClear();

		const replies = [await guideSlate(), await guideSlate(), await guideSlate()];

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(replies.map(reply => reply.refused)).toEqual([true, true, true]);
	});

	test('lets Retry skip the wait', async () => {
		await loadBackground({
			prefs: { ...nbaOnly, showUpcomingGames: false, keepFinalGames: false },
			fetchReturnValue: { games: [game('live', 'in')], leagueLogos: {}, shedLeagues: [] },
		});
		fetchMock.mockResolvedValue({ games: [], leagueLogos: {}, shedLeagues: ['nba'] });
		await guideSlate();

		fetchMock.mockClear();
		fetchMock.mockResolvedValue({ games: [game('later', 'pre')], leagueLogos: {}, shedLeagues: [] });
		const slate = await onMessageHandler({ type: 'GET_GUIDE_SLATE', force: true }) as { games: Game[]; refused?: boolean };

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(slate.games.map(g => g.id)).toEqual(['later']);
		expect(slate.refused).toBe(false);
	});

	test('keeps the held games of a league that refused while the others are replaced', async () => {
		const nflGame = (id: string): Game => ({ ...game(id, 'pre'), league: 'nfl' as LeagueId });
		await loadBackground({
			prefs: { enabledLeagues: ['nba' as LeagueId, 'nfl' as LeagueId], enabled: false, showUpcomingGames: false, keepFinalGames: false },
			fetchReturnValue: { games: [game('live', 'in')], leagueLogos: {}, shedLeagues: [] },
		});
		fetchMock.mockResolvedValue({ games: [game('nba-old', 'pre'), nflGame('nfl-old')], leagueLogos: {}, shedLeagues: [] });
		await guideSlate();
		jest.setSystemTime(Date.now() + 11 * 60_000);

		fetchMock.mockResolvedValue({ games: [game('nba-new', 'pre')], leagueLogos: {}, shedLeagues: ['nfl'] });
		const slate = await guideSlate();

		expect(slate.games.map(g => g.id).toSorted()).toEqual(['nba-new', 'nfl-old']);
		expect(slate.refused).toBe(false);
	});
});

describe('when a guide game actually ended', () => {
	const nbaOnly: Partial<UserPreferences> = { enabledLeagues: ['nba' as LeagueId] };
	const guideSlate = () => onMessageHandler({ type: 'GET_GUIDE_SLATE' }) as Promise<{ endTimes: Record<string, number> }>;

	const poll = async (limitMs = 10 * 60_000) => {
		fetchMock.mockClear();
		for (let waited = 0; waited < limitMs && fetchMock.mock.calls.length === 0; waited += 5_000) {
			jest.advanceTimersByTime(5_000);
			await drain(16);
		}
		expect(fetchMock).toHaveBeenCalled();
	};

	const mlbFinal: Game = {
		...game('mlb-final', 'post'),
		league: 'mlb' as LeagueId,
		sportType: 'baseball',
		startTime: '2026-09-21T17:10:00Z',
	};
	const mlbFinalEvening = new Date('2026-09-21T22:00:00Z').getTime();

	test('stamps a game with the poll that first saw it final', async () => {
		await loadBackground({ prefs: nbaOnly, fetchReturnValue: { games: [game('g', 'in')], leagueLogos: {}, shedLeagues: [] } });
		await guideSlate();

		fetchMock.mockResolvedValue({ games: [game('g', 'post')], leagueLogos: {}, shedLeagues: [] });
		await poll();
		const sawFinalAt = Date.now();

		const { endTimes } = await guideSlate();
		expect(endTimes.g).toBeLessThanOrEqual(sawFinalAt);
		expect(endTimes.g).toBeGreaterThan(sawFinalAt - 5_000);
	});

	test('stamps the end from the poll with finished games hidden from the popup', async () => {
		await loadBackground({
			prefs: { ...nbaOnly, keepFinalGames: false, finishedTabAction: 'keep' },
			fetchReturnValue: { games: [game('g', 'in')], leagueLogos: {}, shedLeagues: [] },
		});
		await guideSlate();

		fetchMock.mockImplementation(async (_leagues: unknown, options?: { includeFinal?: boolean }) => (
			{ games: options?.includeFinal ? [game('g', 'post')] : [], leagueLogos: {}, shedLeagues: [] }
		));
		await poll();
		const sawFinalAt = Date.now();
		jest.advanceTimersByTime(8 * 60 * 60_000);

		const { endTimes } = await guideSlate();
		expect(endTimes.g).toBeLessThanOrEqual(sawFinalAt);
		expect(endTimes.g).toBeGreaterThan(sawFinalAt - 5_000);
	});

	test('leaves a game it only ever saw final without an end time', async () => {
		await loadBackground({ prefs: nbaOnly, fetchReturnValue: { games: [game('g', 'post')], leagueLogos: {}, shedLeagues: [] } });

		expect((await guideSlate()).endTimes).toEqual({});
	});

	test('remembers seeing a game live across a worker restart', async () => {
		await loadBackground({
			prefs: nbaOnly,
			storedLocal: { [gameEndTimesKey]: { g: { seenLiveAt: Date.now() - 2 * 60_000 } } },
			fetchReturnValue: { games: [game('g', 'post')], leagueLogos: {}, shedLeagues: [] },
		});

		expect((await guideSlate()).endTimes.g).toBeDefined();
	});

	test('asks baseball how long a final it never saw end took, then tells the guide', async () => {
		await loadBackground({ prefs: nbaOnly, initialSystemTime: mlbFinalEvening, fetchReturnValue: { games: [mlbFinal, game('nba-final', 'post')], leagueLogos: {}, shedLeagues: [] } });
		durationFetch().mockResolvedValue(196);

		await guideSlate();
		await drain();

		expect(durationFetch()).toHaveBeenCalledTimes(1);
		expect(durationFetch().mock.calls[0]![0].id).toBe('mlb-final');
		expect(runtimeSendMessage()).toHaveBeenCalledWith({ type: 'GUIDE_SLATE_UPDATED' });
		expect((await guideSlate()).endTimes['mlb-final']).toBe(new Date('2026-09-21T17:10:00Z').getTime() + 196 * 60_000);
	});

	test('asks only once for a final whose summary has no duration', async () => {
		await loadBackground({ prefs: nbaOnly, initialSystemTime: mlbFinalEvening, fetchReturnValue: { games: [mlbFinal], leagueLogos: {}, shedLeagues: [] } });

		await guideSlate();
		await drain();
		await guideSlate();
		await drain();

		expect(durationFetch()).toHaveBeenCalledTimes(1);
	});
});

describe('handing a tab back once its game finishes', () => {
	const nbaOnly = { enabledLeagues: ['nba' as LeagueId] };

	const finishedTabGame = (id: string, status: Game['status']): Game => ({
		id,
		league: 'nba' as LeagueId,
		sportType: 'basketball',
		status,
		period: status === 'post' ? 4 : 3,
		clockSeconds: status === 'post' ? 0 : 300,
		startTime: startedHoursAgo(2),
		homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 101 },
		awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 99 },
	});

	const load = async (finishedTabAction: UserPreferences['finishedTabAction'], overrides: Partial<LoadOptions> = {}) => (
		loadBackground({
			prefs: { ...nbaOnly, finishedTabAction, keepFinalGames: false },
			tabRegistry: [{ tabId: 7, gameId: 'wrapped' }],
			fetchReturnValue: { games: [finishedTabGame('wrapped', 'in')], leagueLogos: {}, shedLeagues: [] },
			openTabIds: [7, 8],
			activeTabId: 8,
			windowIds: { 7: 1, 8: 1 },
			...overrides,
		})
	);

	const poll = async (limitMs = 10 * 60_000) => {
		fetchMock.mockClear();
		for (let waited = 0; waited < limitMs && fetchMock.mock.calls.length === 0; waited += 5_000) {
			jest.advanceTimersByTime(5_000);
			await drain(16);
		}
		expect(fetchMock).toHaveBeenCalled();
	};

	const whistle = async () => {
		fetchMock.mockResolvedValue({ games: [finishedTabGame('wrapped', 'post')], leagueLogos: {}, shedLeagues: [] });
		await poll();
	};

	const registry = async (): Promise<TabRegistration[]> => (await getDebugState()).tabRegistry;

	const notice = (): unknown => storageSessionSet.mock.calls
		.map(([written]) => (written as Record<string, unknown>).finishedTabNotice)
		.findLast(value => value !== undefined);

	test('leaves the registration alone by default', async () => {
		expect(createDefaultUserPreferences().finishedTabAction).toBe('keep');
		await load('keep');
		await whistle();

		expect(await registry()).toEqual([{ tabId: 7, gameId: 'wrapped' }]);
		expect(tabsRemove).not.toHaveBeenCalled();
	});

	test('frees the tab without closing it', async () => {
		await load('free');
		await whistle();

		expect(await registry()).toEqual([]);
		expect(tabsRemove).not.toHaveBeenCalled();
		expect(notice()).toEqual({ freed: 1, closed: 0 });
	});

	test('closes the tab when the setting says close', async () => {
		await load('close');
		await whistle();

		expect(tabsRemove).toHaveBeenCalledWith(7);
		expect(await registry()).toEqual([]);
		expect(notice()).toEqual({ freed: 0, closed: 1 });
	});

	test('does nothing while the game is still being played', async () => {
		await load('close');
		await poll();

		expect(await registry()).toEqual([{ tabId: 7, gameId: 'wrapped' }]);
		expect(tabsRemove).not.toHaveBeenCalled();
	});

	test('leaves the tab the user is sitting on', async () => {
		await load('close', { activeTabId: 7 });
		await whistle();

		expect(await registry()).toEqual([{ tabId: 7, gameId: 'wrapped' }]);
		expect(tabsRemove).not.toHaveBeenCalled();
	});

	test('leaves a tab that is showing in another window', async () => {
		await load('close', { windowIds: { 7: 2, 8: 1 } });
		tabsQuery.mockImplementation((q: unknown) => Promise.resolve(
			(q as { active?: boolean }).active
				? [{ id: 8 }]
				: [{ id: 7, windowId: 2, active: true }, { id: 8, windowId: 1, active: true }, { id: 9, windowId: 1, active: false }],
		));
		await whistle();

		expect(await registry()).toEqual([{ tabId: 7, gameId: 'wrapped' }]);
		expect(tabsRemove).not.toHaveBeenCalled();
	});

	test('and takes it on the poll after they move away', async () => {
		await load('close', { activeTabId: 7 });
		await whistle();
		expect(tabsRemove).not.toHaveBeenCalled();

		mockOpenTabIds([7, 8], 8, { 7: 1, 8: 1 });
		await poll();

		expect(tabsRemove).toHaveBeenCalledWith(7);
	});

	test('frees rather than closes the only tab in its window', async () => {
		await load('close', { openTabIds: [7, 8], activeTabId: 8, windowIds: { 7: 2, 8: 1 } });
		await whistle();

		expect(tabsRemove).not.toHaveBeenCalled();
		expect(await registry()).toEqual([]);
		expect(notice()).toEqual({ freed: 1, closed: 0 });
	});

	test('asks the poll for finals even with Keep finished games off', async () => {
		await load('free');
		await whistle();

		expect(fetchMock.mock.calls.length).toBeGreaterThan(0);
		for (const [, options] of fetchMock.mock.calls) {
			expect((options as { includeFinal: boolean }).includeFinal).toBe(true);
		}
	});

	test('and still keeps the finished game out of the popup list', async () => {
		await load('free');
		await whistle();

		const state = await sendMessage({ type: 'GET_STATE' }) as { games: Game[] };
		expect(state.games).toEqual([]);
	});

	test('accumulates across polls rather than overwriting what is waiting', async () => {
		await load('free', {
			tabRegistry: [{ tabId: 7, gameId: 'wrapped' }, { tabId: 8, gameId: 'other' }],
			fetchReturnValue: { games: [finishedTabGame('wrapped', 'in'), finishedTabGame('other', 'in')], leagueLogos: {}, shedLeagues: [] },
			openTabIds: [7, 8, 9],
			activeTabId: 9,
			windowIds: { 7: 1, 8: 1, 9: 1 },
		});

		fetchMock.mockResolvedValue({ games: [finishedTabGame('wrapped', 'post'), finishedTabGame('other', 'in')], leagueLogos: {}, shedLeagues: [] });
		await poll();
		expect(notice()).toEqual({ freed: 1, closed: 0 });

		(globalThis as { browser: { storage: { session: { get: jest.Mock } } } }).browser.storage.session.get =
			jest.fn().mockResolvedValue({ finishedTabNotice: { freed: 1, closed: 0 } });
		fetchMock.mockResolvedValue({ games: [finishedTabGame('wrapped', 'post'), finishedTabGame('other', 'post')], leagueLogos: {}, shedLeagues: [] });
		await poll();

		expect(notice()).toEqual({ freed: 2, closed: 0 });
	});

	test('never touches a tab in demo mode', async () => {
		await loadBackground({
			prefs: { ...nbaOnly, finishedTabAction: 'close' },
			tabRegistry: [{ tabId: 7, gameId: 'mock-20' }],
			openTabIds: [7, 8],
			activeTabId: 8,
			windowIds: { 7: 1, 8: 1 },
		});
		await sendMessage({ type: 'SET_DEMO_MODE', enabled: true });
		await runFirstPoll();

		const state = await sendMessage({ type: 'GET_STATE' }) as { games: Game[] };
		expect(state.games.find(g => g.id === 'mock-20')?.status).toBe('post');
		expect(tabsRemove).not.toHaveBeenCalled();
		expect(await registry()).toEqual([{ tabId: 7, gameId: 'mock-20' }]);
	});
});

describe('a scoreboard ESPN refused', () => {
	const nbaOnly: Partial<UserPreferences> = { enabledLeagues: ['nba' as LeagueId], enabled: false };

	const liveGame: Game = {
		id: 'playing', league: 'nba' as LeagueId, sportType: 'basketball', status: 'in',
		period: 3, clockSeconds: 400,
		homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 77 },
		awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 75 },
	};

	const state = async () => await sendMessage({ type: 'GET_STATE' }) as {
		games: Game[];
		slateShedLeagues: string[];
		leagueLastGoodAt: Record<string, number>;
	};

	const pollOnce = async () => {
		fetchMock.mockClear();
		for (let waited = 0; waited < 120_000 && fetchMock.mock.calls.length === 0; waited += 1_000) {
			jest.advanceTimersByTime(1_000);
			await drain();
		}
	};

	const loadWithLiveGame = () => loadBackground({
		prefs: nbaOnly,
		fetchReturnValue: { games: [liveGame], leagueLogos: {}, shedLeagues: [] },
	});

	test('is named in the state so the popup can say so instead of reporting a quiet night', async () => {
		await loadWithLiveGame();
		fetchMock.mockResolvedValue({ games: [], leagueLogos: {}, shedLeagues: ['nba'] });
		await pollOnce();

		expect((await state()).slateShedLeagues).toEqual(['nba']);
	});

	test('does not take the games already on screen down with it', async () => {
		await loadWithLiveGame();
		fetchMock.mockResolvedValue({ games: [], leagueLogos: {}, shedLeagues: ['nba'] });
		await pollOnce();

		expect((await state()).games.map(g => g.id)).toContain('playing');
	});

	test('stops being reported once the league answers again', async () => {
		await loadWithLiveGame();
		fetchMock.mockResolvedValue({ games: [], leagueLogos: {}, shedLeagues: ['nba'] });
		await pollOnce();
		expect((await state()).slateShedLeagues).toEqual(['nba']);

		fetchMock.mockResolvedValue({ games: [liveGame], leagueLogos: {}, shedLeagues: [] });
		await pollOnce();

		expect((await state()).slateShedLeagues).toEqual([]);
	});

	test('remembers when the league last answered, and a refusal does not move it', async () => {
		await loadWithLiveGame();
		await pollOnce();
		const answeredAt = (await state()).leagueLastGoodAt.nba;
		expect(answeredAt).toBeGreaterThan(0);

		fetchMock.mockResolvedValue({ games: [], leagueLogos: {}, shedLeagues: ['nba'] });
		await pollOnce();
		await pollOnce();
		expect((await state()).leagueLastGoodAt.nba).toBe(answeredAt);

		fetchMock.mockResolvedValue({ games: [liveGame], leagueLogos: {}, shedLeagues: [] });
		await pollOnce();
		expect((await state()).leagueLastGoodAt.nba).toBeGreaterThan(answeredAt);
	});

	test('is not reported when a league genuinely has nothing on', async () => {
		await loadBackground({
			prefs: nbaOnly,
			fetchReturnValue: { games: [], leagueLogos: {}, shedLeagues: [] },
		});
		await pollOnce();

		expect((await state()).slateShedLeagues).toEqual([]);
	});

	test('does not spend a lookahead on its way to a sleep it has not earned', async () => {
		await loadWithLiveGame();
		fetchMock.mockResolvedValue({ games: [], leagueLogos: {}, shedLeagues: ['nba'] });
		lookahead().mockClear();

		await pollOnce();
		await pollOnce();
		await pollOnce();

		expect(lookahead()).not.toHaveBeenCalled();
	});
});

describe('a live game the feed has left behind', () => {
	const nbaOnly: Partial<UserPreferences> = { enabledLeagues: ['nba' as LeagueId], enabled: false };
	const startedAt = Date.UTC(2026, 10, 17, 0, 0);
	const pastItsEnd = startedAt + (5 * 60 * 60_000);

	const lingering = (over: Partial<Game> = {}): Game => ({
		id: 'lingering', league: 'nba' as LeagueId, sportType: 'basketball', status: 'in',
		period: 4, clockSeconds: 0, startTime: new Date(startedAt).toISOString(),
		homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 101 },
		awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 99 },
		...over,
	});

	const stuckSince = async () => (await sendMessage({ type: 'GET_STATE' }) as { stuckSince: Record<string, number> }).stuckSince;

	const pollOnce = async () => {
		fetchMock.mockClear();
		for (let waited = 0; waited < 120_000 && fetchMock.mock.calls.length === 0; waited += 1_000) {
			jest.advanceTimersByTime(1_000);
			await drain();
		}
	};

	const quietFor = async (quietGame: Game, minutes: number) => {
		await loadBackground({ prefs: nbaOnly, initialSystemTime: pastItsEnd, fetchReturnValue: { games: [quietGame], leagueLogos: {}, shedLeagues: [] } });
		await pollOnce();
		jest.setSystemTime(Date.now() + (minutes * 60_000));
		await pollOnce();
	};

	test('is reported once it has sat unchanged for half an hour past its expected end', async () => {
		await quietFor(lingering(), 31);
		expect(Object.keys(await stuckSince())).toEqual(['lingering']);
	});

	test('is not reported after a shorter quiet spell', async () => {
		await quietFor(lingering(), 20);
		expect(await stuckSince()).toEqual({});
	});

	test('is never reported while it is in a delay', async () => {
		await quietFor(lingering({ delayed: true, delayDescription: 'Rain Delay' }), 90);
		expect(await stuckSince()).toEqual({});
	});

	test('stops being reported the moment the score moves again', async () => {
		await quietFor(lingering(), 31);
		fetchMock.mockResolvedValue({ games: [lingering({ homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 103 } })], leagueLogos: {}, shedLeagues: [] });
		await pollOnce();
		expect(await stuckSince()).toEqual({});
	});
});

describe('the team marks the guide draws', () => {
	const nbaOnly: Partial<UserPreferences> = { enabledLeagues: ['nba' as LeagueId], enabled: false };
	const marks = { dark: 'dark.png', scoreboard: 'scoreboard.png' };

	const guideMonoLogos = async () => (
		await onMessageHandler({ type: 'GET_GUIDE_SLATE' }) as { monoLogos: Record<string, unknown> }
	).monoLogos;

	const storeMarks = (stored: unknown) => {
		storageLocalGet.mockResolvedValue({
			demoMode: false,
			reviewPromptState: null,
			[monoLogoCacheKey]: stored,
		});
	};

	const loadForGuide = (enabledLeagues: LeagueId[] = ['nba' as LeagueId]) => loadBackground({
		prefs: { ...nbaOnly, enabledLeagues },
		fetchReturnValue: { games: [], leagueLogos: {}, shedLeagues: [] },
	});

	test('come out of storage rather than off the network when they were written this week', async () => {
		await loadForGuide();
		storeMarks({ fetchedAt: Date.now(), logos: { nba: { '1': marks } } });
		monoFetch().mockClear();

		expect(await guideMonoLogos()).toEqual({ nba: { '1': marks } });
		expect(monoFetch()).not.toHaveBeenCalled();
	});

	test('are asked for only where the stored copy has a gap', async () => {
		await loadForGuide(['nba' as LeagueId, 'nhl' as LeagueId]);
		storeMarks({ fetchedAt: Date.now(), logos: { nba: { '1': marks } } });
		monoFetch().mockClear().mockResolvedValue({ nhl: { '9': marks } });

		expect(await guideMonoLogos()).toEqual({ nba: { '1': marks }, nhl: { '9': marks } });
		expect(monoFetch()).toHaveBeenCalledTimes(1);
		expect(monoFetch()).toHaveBeenCalledWith(['nhl']);
	});

	test('are written back, so the next worker does not repeat the fetch', async () => {
		await loadForGuide();
		monoFetch().mockClear().mockResolvedValue({ nba: { '1': marks } });
		storageLocalSet.mockClear();

		await guideMonoLogos();

		expect(storageLocalSet).toHaveBeenCalledWith({
			[monoLogoCacheKey]: { fetchedAt: expect.any(Number), logos: { nba: { '1': marks } } },
		});
	});

	test('are fetched again once the stored copy has aged out', async () => {
		await loadForGuide();
		storeMarks({ fetchedAt: Date.now() - monoLogoCacheTtlMs - 1, logos: { nba: { '1': marks } } });
		monoFetch().mockClear().mockResolvedValue({ nba: { '2': marks } });

		await guideMonoLogos();

		expect(monoFetch()).toHaveBeenCalledWith(['nba']);
	});

	test('are fetched once when two guide tabs open together', async () => {
		await loadForGuide();
		monoFetch().mockClear().mockResolvedValue({ nba: { '1': marks } });

		await Promise.all([guideMonoLogos(), guideMonoLogos()]);

		expect(monoFetch()).toHaveBeenCalledTimes(1);
	});
});

const slateGame = (id: string, league: string, status: Game['status']): Game => ({
	id,
	league: league as LeagueId,
	sportType: league === 'mlb' ? 'baseball' : 'basketball',
	status,
	startTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
	homeTeam: { id: `${id}-h`, name: 'Home', abbreviation: 'HOM', score: 4 },
	awayTeam: { id: `${id}-a`, name: 'Away', abbreviation: 'AWY', score: 2 },
	period: 9,
	clockSeconds: 0,
});

describe('what the slate keeps for a league that did not answer', () => {
	const bothLeagues: Partial<UserPreferences> = {
		enabledLeagues: ['nba' as LeagueId, 'mlb' as LeagueId],
		enabled: false,
		keepFinalGames: true,
		showUpcomingGames: true,
	};

	const stateGames = async () => (
		await sendMessage({ type: 'GET_STATE' }) as { games: Game[] }
	).games.map(g => g.id);

	const rerunSlate = () => sendMessage({
		type: 'UPDATE_PREFS',
		prefs: normalizeUserPreferences({ ...createDefaultUserPreferences(), ...bothLeagues, upcomingGamesDays: 9 }),
	});

	test('holds on to a final from the league that failed', async () => {
		await loadBackground({
			prefs: bothLeagues,
			fetchReturnValue: {
				games: [slateGame('mlb-final', 'mlb', 'post'), slateGame('nba-final', 'nba', 'post')],
				leagueLogos: {},
				shedLeagues: [],
			},
		});
		expect(await stateGames()).toEqual(expect.arrayContaining(['mlb-final', 'nba-final']));

		fetchMock.mockResolvedValue({
			games: [slateGame('nba-final', 'nba', 'post')],
			leagueLogos: {},
			shedLeagues: ['mlb'],
		});
		await rerunSlate();

		expect(await stateGames()).toEqual(expect.arrayContaining(['mlb-final', 'nba-final']));
	});

	test('still drops a final from a league that answered without it', async () => {
		await loadBackground({
			prefs: bothLeagues,
			fetchReturnValue: {
				games: [slateGame('nba-final', 'nba', 'post'), slateGame('nba-gone', 'nba', 'post')],
				leagueLogos: {},
				shedLeagues: [],
			},
		});

		fetchMock.mockResolvedValue({
			games: [slateGame('nba-final', 'nba', 'post')],
			leagueLogos: {},
			shedLeagues: [],
		});
		await rerunSlate();

		expect(await stateGames()).not.toContain('nba-gone');
	});

	test('holds on to a kickoff from the league that failed', async () => {
		await loadBackground({
			prefs: bothLeagues,
			fetchReturnValue: {
				games: [slateGame('mlb-later', 'mlb', 'pre'), slateGame('nba-later', 'nba', 'pre')],
				leagueLogos: {},
				shedLeagues: [],
			},
		});

		fetchMock.mockResolvedValue({
			games: [slateGame('nba-later', 'nba', 'pre')],
			leagueLogos: {},
			shedLeagues: ['mlb'],
		});
		await rerunSlate();

		expect(await stateGames()).toContain('mlb-later');
	});

	test('drops the kickoffs of a league that was switched off', async () => {
		await loadBackground({
			prefs: bothLeagues,
			fetchReturnValue: {
				games: [slateGame('mlb-later', 'mlb', 'pre'), slateGame('nba-later', 'nba', 'pre')],
				leagueLogos: {},
				shedLeagues: [],
			},
		});
		expect(await stateGames()).toContain('mlb-later');

		fetchMock.mockResolvedValue({ games: [slateGame('nba-later', 'nba', 'pre')], leagueLogos: {}, shedLeagues: [] });
		await sendMessage({
			type: 'UPDATE_PREFS',
			prefs: normalizeUserPreferences({ ...createDefaultUserPreferences(), ...bothLeagues, enabledLeagues: ['nba' as LeagueId] }),
		});

		expect(await stateGames()).not.toContain('mlb-later');
	});
});

const summary = (games: Game[]) => games.map(g => `${g.id}:${g.status}`).toSorted();

describe('a fan-out poll with a league refused', () => {
	const bothLeagues: Partial<UserPreferences> = {
		enabledLeagues: ['nba' as LeagueId, 'mlb' as LeagueId],
		enabled: false,
		showUpcomingGames: true,
	};

	interface LeagueAnswer { poll: Game[]; slate: Game[]; shed: boolean }
	let world: Record<string, LeagueAnswer>;

	const serveWorld = () => fetchMock.mockImplementation(async (leagues: LeagueId[], options?: { includeUpcoming?: boolean }) => ({
		games: leagues.flatMap(id => world[id]!.shed ? [] : (options?.includeUpcoming ? world[id]!.slate : world[id]!.poll)),
		leagueLogos: {},
		shedLeagues: leagues.filter(id => world[id]!.shed),
	}));

	const refresh = async () => await sendMessage({ type: 'GET_STATE', forceRefresh: true }) as {
		games: Game[];
		slateShedLeagues: string[];
		leagueLastGoodAt: Record<string, number>;
	};

	beforeEach(async () => {
		world = {
			nba: {
				poll: [slateGame('early', 'nba', 'in')],
				slate: [slateGame('early', 'nba', 'in'), slateGame('later', 'nba', 'pre')],
				shed: false,
			},
			mlb: { poll: [slateGame('mlbg', 'mlb', 'in')], slate: [slateGame('mlbg', 'mlb', 'in')], shed: false },
			nhl: { poll: [], slate: [], shed: false },
		};
		await loadBackground({ prefs: bothLeagues, initialSystemTime: 1_000_000 });
		serveWorld();
		await sendMessage({
			type: 'UPDATE_PREFS',
			prefs: normalizeUserPreferences({ ...createDefaultUserPreferences(), ...bothLeagues, upcomingGamesDays: 9 }),
		});
		await refresh();
	});

	test('keeps the live cards of the refused league, including one that went live since the slate was fetched', async () => {
		world.nba.poll = [slateGame('early', 'nba', 'in'), slateGame('later', 'nba', 'in')];
		expect(summary((await refresh()).games)).toEqual(['early:in', 'later:in', 'mlbg:in']);

		world.nba.shed = true;
		const after = await refresh();

		expect(after.slateShedLeagues).toEqual(['nba']);
		expect(summary(after.games)).toEqual(['early:in', 'later:in', 'mlbg:in']);
	});

	test('still lists a refused league\'s kickoffs once, as upcoming', async () => {
		world.nba.shed = true;

		expect(summary((await refresh()).games)).toEqual(['early:in', 'later:pre', 'mlbg:in']);
	});

	const changePrefs = (over: Partial<UserPreferences>) => sendMessage({
		type: 'UPDATE_PREFS',
		prefs: normalizeUserPreferences({ ...createDefaultUserPreferences(), ...bothLeagues, ...over }),
	});

	const currentGames = async () => (await sendMessage({ type: 'GET_STATE' }) as { games: Game[] }).games;

	test.each([
		['a slate setting changes', { upcomingGamesDays: 5 }],
		['a league is added', { enabledLeagues: ['nba', 'mlb', 'nhl'] as LeagueId[] }],
	])('shows a game that went live once, not also as upcoming, when %s', async (_label, over) => {
		world.nba.poll = [slateGame('early', 'nba', 'in'), slateGame('later', 'nba', 'in')];
		await refresh();
		world.nba.shed = true;
		await refresh();

		await changePrefs(over);

		expect(summary(await currentGames())).toEqual(['early:in', 'later:in', 'mlbg:in']);
	});

	test('stamps the leagues that answered and leaves the refused one at its last good poll', async () => {
		const first = (await refresh()).leagueLastGoodAt;
		expect(first).toEqual({ nba: 1_000_000, mlb: 1_000_000 });

		jest.setSystemTime(1_000_000 + (5 * 60_000));
		world.nba.shed = true;

		expect((await refresh()).leagueLastGoodAt).toEqual({ nba: 1_000_000, mlb: 1_000_000 + (5 * 60_000) });
	});
});

describe('what the popup slate asks ESPN for', () => {
	const nbaOnly: Partial<UserPreferences> = { enabledLeagues: ['nba' as LeagueId], enabled: false };
	const emptyResult = { games: [], leagueLogos: {}, shedLeagues: [] };

	const rerunSlate = (changed: Partial<UserPreferences>) => sendMessage({
		type: 'UPDATE_PREFS',
		prefs: normalizeUserPreferences({ ...createDefaultUserPreferences(), ...nbaOnly, ...changed }),
	});

	test('follows Up Next exactly, with none of the guide floor', async () => {
		await loadBackground({
			prefs: { ...nbaOnly, upcomingGamesDays: 4 },
			fetchReturnValue: emptyResult,
		});
		await rerunSlate({ upcomingGamesDays: 1 });

		expect(lastWideFetchOptions()?.upcomingDays).toBe(1);
		expect(guideMinUpcomingDays).toBeGreaterThan(1);
	});

	test('does not reach back for finals when the setting is off', async () => {
		await loadBackground({
			prefs: { ...nbaOnly, keepFinalGames: false, upcomingGamesDays: 4 },
			fetchReturnValue: emptyResult,
		});
		await rerunSlate({ keepFinalGames: false, upcomingGamesDays: 5 });

		expect(lastWideFetchOptions()?.includeFinal).toBe(false);
	});

	test('does reach back when finals are wanted', async () => {
		await loadBackground({
			prefs: { ...nbaOnly, keepFinalGames: true, upcomingGamesDays: 4 },
			fetchReturnValue: emptyResult,
		});
		await rerunSlate({ keepFinalGames: true, upcomingGamesDays: 5 });

		expect(lastWideFetchOptions()?.includeFinal).toBe(true);
	});
});
const cfb = (id: string, groups: string[], extra: Partial<Game> = {}): Game => ({
	id,
	league: 'ncaaf' as LeagueId,
	sportType: 'football',
	status: 'in',
	homeTeam: { id: `${id}-h`, name: 'Home', abbreviation: 'HOM', score: 7 },
	awayTeam: { id: `${id}-a`, name: 'Away', abbreviation: 'AWY', score: 3 },
	period: 2,
	clockSeconds: 300,
	collegeGroups: groups,
	...extra,
});

describe('college division filters', () => {
	const idsIn = async (): Promise<string[]> => {
		const state = await sendMessage({ type: 'GET_STATE' }) as { games: Game[] };
		return state.games.map(g => g.id);
	};

	const fcsOnly = { ncaaf: { divisions: ['81'], conferences: [], ranked: false, titleRounds: false } };

	test('asks for the divisions the filter needs and keeps only what it lets through', async () => {
		await loadBackground({
			prefs: { enabledLeagues: ['ncaaf' as LeagueId], collegeFilters: fcsOnly },
			fetchReturnValue: { games: [cfb('fbs', ['80']), cfb('fcs', ['81'])], leagueLogos: {}, shedLeagues: [] },
		});
		expect(await idsIn()).toEqual(['fcs']);

		await sendMessage({ type: 'GET_STATE', forceRefresh: true });
		expect(fetchMock).toHaveBeenCalledWith(['ncaaf'], expect.objectContaining({ groupsByLeague: { ncaaf: ['81'] } }));
	});

	test('a filter change drops the games it no longer lets through without waiting for a poll', async () => {
		await loadBackground({
			prefs: { enabledLeagues: ['ncaaf' as LeagueId] },
			fetchReturnValue: { games: [cfb('fbs', ['80'])], leagueLogos: {}, shedLeagues: [] },
		});
		expect(await idsIn()).toEqual(['fbs']);

		fetchMock.mockResolvedValue({ games: [], leagueLogos: {}, shedLeagues: [] });
		await sendMessage({
			type: 'UPDATE_PREFS',
			prefs: normalizeUserPreferences({ ...createDefaultUserPreferences(), enabledLeagues: ['ncaaf'], collegeFilters: fcsOnly }),
		});

		expect(await idsIn()).toEqual([]);
		expect(fetchMock).toHaveBeenCalledWith(['ncaaf'], expect.objectContaining({ groupsByLeague: { ncaaf: ['81'] } }));
	});

	test('a favorite team gets through a filter that would drop its game', async () => {
		await loadBackground({
			prefs: {
				enabledLeagues: ['ncaaf' as LeagueId],
				collegeFilters: fcsOnly,
				favoriteTeamIds: [createFavoriteTeamKey('ncaaf' as LeagueId, 'bama-h')],
			},
			fetchReturnValue: { games: [cfb('bama', ['80']), cfb('other', ['80'])], leagueLogos: {}, shedLeagues: [] },
		});
		expect(await idsIn()).toEqual(['bama']);
	});

	test('baseball reads conferences from the stored conference list', async () => {
		const baseballGame = (id: string, homeId: string): Game => ({ ...cfb(id, []), league: 'cbase' as LeagueId, sportType: 'baseball', collegeGroups: undefined, homeTeam: { id: homeId, name: 'H', abbreviation: 'H', score: 1 } });
		await loadBackground({
			prefs: { enabledLeagues: ['cbase' as LeagueId], collegeFilters: { cbase: { divisions: [], conferences: ['58'], ranked: false, titleRounds: false } } },
			storedLocal: {
				'arenaswap.collegeConferences.cbase': {
					leagueId: 'cbase',
					seasonYear: 2026,
					conferences: [{ id: '58', name: 'American Athletic Conference', shortName: 'American', divisionKey: 'd1' }],
					teamConference: { ecu: '58' },
					teamDivision: {},
					fetchedAt: Date.now(),
				},
			},
			fetchReturnValue: { games: [baseballGame('in-conference', 'ecu'), baseballGame('elsewhere', 'lsu')], leagueLogos: {}, shedLeagues: [] },
		});
		expect(await idsIn()).toEqual(['in-conference']);
	});
});

describe('the situation a poll reads', () => {
	const hockeySituations = require('../../../packages/sideline/tests/fixtures/liveExtras/hockeySituations.json') as { nhlPowerPlay: { raw: unknown } };
	const rink: Game = {
		id: 'nhl-1',
		league: 'nhl' as LeagueId,
		sportType: 'hockey',
		status: 'in',
		homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 2 },
		awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 2 },
		period: 2,
		clockSeconds: 600,
	};
	const court: Game = { ...rink, id: 'nba-1', league: 'nba' as LeagueId, sportType: 'basketball', period: 3, clockSeconds: 300, lastPlayId: 'play-1' };

	const scoreOf = async (gameId: string) => {
		const state = await sendMessage({ type: 'GET_STATE' }) as { scores: { gameId: string; scoringOpportunityBoost?: number; homeScore?: number }[]; games: Game[] };
		return { score: state.scores.find(s => s.gameId === gameId), game: state.games.find(g => g.id === gameId) };
	};

	const poll = async () => {
		jest.advanceTimersByTime(pollMaxEagerMs + 2000);
		await drain(12);
	};

	test('counts toward the score of the poll that read it', async () => {
		await loadBackground({ prefs: { enabledLeagues: ['nhl' as LeagueId] }, fetchReturnValue: { games: [rink], leagueLogos: {}, shedLeagues: [] } });
		situationFetch().mockResolvedValue(hockeySituations.nhlPowerPlay.raw);

		jest.advanceTimersByTime(pollIntervalMs + 2000);
		await drain(12);

		expect((await scoreOf('nhl-1')).score?.scoringOpportunityBoost).toBeGreaterThan(0);
	});

	test('a basketball game is not asked again until the next play', async () => {
		await loadBackground({ prefs: { enabledLeagues: ['nba' as LeagueId] }, fetchReturnValue: { games: [court], leagueLogos: {}, shedLeagues: [] } });
		situationFetch().mockClear();

		await poll();
		await poll();
		await poll();
		expect(situationFetch()).toHaveBeenCalledTimes(1);

		fetchMock.mockResolvedValue({ games: [{ ...court, lastPlayId: 'play-2' }], leagueLogos: {}, shedLeagues: [] });
		await poll();
		expect(situationFetch()).toHaveBeenCalledTimes(2);
	});

	test('one that never answers holds the poll for two seconds and no longer', async () => {
		await loadBackground({ prefs: { enabledLeagues: ['nhl' as LeagueId] }, fetchReturnValue: { games: [rink], leagueLogos: {}, shedLeagues: [] } });
		situationFetch().mockImplementation(() => new Promise(() => {}));
		fetchMock.mockResolvedValue({ games: [{ ...rink, homeTeam: { ...rink.homeTeam, score: 3 } }], leagueLogos: {}, shedLeagues: [] });

		jest.advanceTimersByTime(pollIntervalMs + 2000);
		await drain(12);
		expect((await scoreOf('nhl-1')).game?.homeTeam.score).toBe(3);
		const before = runtimeSendMessage().mock.calls.filter(([message]) => (message as { type: string }).type === 'SCORES_UPDATED').length;

		jest.advanceTimersByTime(2_000);
		await drain(12);
		const after = runtimeSendMessage().mock.calls.filter(([message]) => (message as { type: string }).type === 'SCORES_UPDATED').length;
		expect(after).toBe(before + 1);
	});
});

describe('a quiet league with a game about to start', () => {
	const startsAt = 1_800_000_000_000;
	const scheduled: Game = {
		id: 'nhl-later',
		league: 'nhl' as LeagueId,
		sportType: 'hockey',
		status: 'pre',
		homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 0 },
		awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 0 },
		startTime: new Date(startsAt).toISOString(),
	};

	const pollsBy = async (atMs: number) => {
		while (Date.now() < atMs) {
			jest.advanceTimersByTime(Math.min(1_000, atMs - Date.now()));
			await drain(4);
		}
		return fetchMock.mock.calls.length;
	};

	test('polls at the listed start instead of waiting out its beat, then at the live beat until it goes live', async () => {
		await loadBackground({
			initialSystemTime: startsAt - 120_000,
			prefs: { enabledLeagues: ['nhl' as LeagueId] },
			fetchReturnValue: { games: [scheduled], leagueLogos: {}, shedLeagues: [] },
		});

		const beforeStart = await pollsBy(startsAt - 1_000);
		expect(await pollsBy(startsAt + 500)).toBe(beforeStart + 1);
		expect(await pollsBy(startsAt + pollMaxEagerMs + 1_000)).toBe(beforeStart + 2);
	});
});

const lateGame = (id: string, home: number, away: number): Game => ({
	id,
	league: 'nba' as LeagueId,
	sportType: 'basketball',
	status: 'in',
	homeTeam: { id: `${id}-h`, name: 'Home', abbreviation: 'HOM', score: home },
	awayTeam: { id: `${id}-a`, name: 'Away', abbreviation: 'AWY', score: away },
	period: 4,
	clockSeconds: 60,
});

describe('one poll\'s pass over the tabs', () => {
	const load = async (games: Game[]) => {
		await loadBackground({
			prefs: { enabled: true, enabledLeagues: ['nba' as LeagueId], cooldownSeconds: 0, sensitivity: 7, switchDelaySeconds: 0, notificationsEnabled: false },
			tabRegistry: [{ gameId: 'close', tabId: 1 }, { gameId: 'rout', tabId: 2 }],
			fetchReturnValue: { games, leagueLogos: {}, shedLeagues: [] },
			openTabIds: [1, 2],
			activeTabId: 1,
		});
		tabsQuery.mockClear();
		runtimeSendMessage().mockClear();
	};

	const poll = async () => {
		jest.advanceTimersByTime(pollIntervalMs + 2000);
		await drain(12);
	};

	test('looks at the tab strip once when it has nothing to switch to', async () => {
		await load([lateGame('close', 98, 97), lateGame('rout', 120, 70)]);
		await poll();

		expect(tabsUpdate).not.toHaveBeenCalledWith(expect.any(Number), { active: true });
		expect(tabsQuery).toHaveBeenCalledTimes(2);
	});

	test('switches before it saves the history or tells the popup', async () => {
		await load([lateGame('close', 120, 70), lateGame('rout', 98, 97)]);
		await poll();

		const switchedAt = tabsUpdate.mock.invocationCallOrder[tabsUpdate.mock.calls.findIndex(([, change]) => (change as { active?: boolean }).active === true)];
		const broadcastAt = runtimeSendMessage().mock.invocationCallOrder[runtimeSendMessage().mock.calls.findIndex(([message]) => (message as { type: string }).type === 'SCORES_UPDATED')];
		const historyWriteAt = storageSessionSet.mock.invocationCallOrder[storageSessionSet.mock.calls.findIndex(([value]) => 'scoreHistory' in (value as object))];
		expect(switchedAt).toBeDefined();
		expect(switchedAt).toBeLessThan(broadcastAt!);
		expect(switchedAt).toBeLessThan(historyWriteAt!);
	});
});

const platformInfo = (): jest.Mock => (globalThis as unknown as { browser: { runtime: { getPlatformInfo: jest.Mock } } }).browser.runtime.getPlatformInfo;
const alarmCreate = (): jest.Mock => (globalThis as unknown as { browser: { alarms: { create: jest.Mock } } }).browser.alarms.create;
const alarmClear = (): jest.Mock => (globalThis as unknown as { browser: { alarms: { clear: jest.Mock } } }).browser.alarms.clear;

describe('keeping the worker running between polls', () => {
	const runFor = async (ms: number) => {
		const until = Date.now() + ms;
		while (Date.now() < until) {
			jest.advanceTimersByTime(Math.min(1_000, until - Date.now()));
			await drain(4);
		}
	};

	test('stays up through a quiet league\'s few-minute beat', async () => {
		const tonight: Game = {
			id: 'later', league: 'nba' as LeagueId, sportType: 'basketball', status: 'pre',
			homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 0 },
			awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 0 },
			startTime: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
		};
		await loadBackground({ prefs: { enabledLeagues: ['nba' as LeagueId] }, fetchReturnValue: { games: [tonight], leagueLogos: {}, shedLeagues: [] } });
		await runFor(2 * 60_000);
		platformInfo().mockClear();

		await runFor(5 * 60_000);
		expect(platformInfo().mock.calls.length).toBeGreaterThanOrEqual(14);
	});

	test('lets a league with nothing scheduled stop the worker, with no alarm to start it', async () => {
		await loadBackground({ prefs: { enabledLeagues: ['nba' as LeagueId] } });
		await runFor(2 * 60_000);
		platformInfo().mockClear();
		alarmCreate().mockClear();

		await runFor(5 * 60_000);
		expect(platformInfo()).not.toHaveBeenCalled();
		expect(alarmCreate()).not.toHaveBeenCalled();
		expect(alarmClear()).toHaveBeenLastCalledWith('arenaswap-wake');
	});

	test('sets the alarm for when a game days away comes within a day', async () => {
		const startsAt = Date.now() + 3 * 24 * 60 * 60 * 1000;
		await loadBackground({ prefs: { enabledLeagues: ['nba' as LeagueId] } });
		lookahead().mockResolvedValue(startsAt);
		await runFor(2 * 60_000);

		const [, { when }] = alarmCreate().mock.calls.at(-1) as [string, { when: number }];
		expect(when).toBe(startsAt - 24 * 60 * 60 * 1000);
		platformInfo().mockClear();
		await runFor(2 * 60_000);
		expect(platformInfo()).not.toHaveBeenCalled();
	});
});

describe('a fresh install with no leagues picked yet', () => {
	test('does not report every league as refusing', async () => {
		const error = jest.spyOn(console, 'error').mockImplementation(() => {});
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
		const nodeEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = 'production';
		try {
			await loadBackground({ prefs: { enabledLeagues: [] } });
		} finally {
			process.env.NODE_ENV = nodeEnv;
		}

		const said = [...error.mock.calls, ...warn.mock.calls].map(args => args.join(' '));
		expect(said.filter(line => line.includes('shed'))).toEqual([]);
	});
});

describe('a worker that stays up past midnight', () => {
	const nbaOnly: Partial<UserPreferences> = { enabledLeagues: ['nba' as LeagueId], enabled: false, showUpcomingGames: true };
	let slate: Game[];
	let poll: Game[];

	const wideFetches = () => fetchMock.mock.calls.filter(([, options]) => (options as { includeUpcoming?: boolean } | undefined)?.includeUpcoming === true).length;
	const stateGames = async () => summary((await sendMessage({ type: 'GET_STATE' }) as { games: Game[] }).games);

	beforeEach(async () => {
		slate = [slateGame('tonight', 'nba', 'pre')];
		poll = slate;
		await loadBackground({ prefs: nbaOnly, initialSystemTime: 1_000_000, fetchReturnValue: { games: slate, leagueLogos: {} } });
		fetchMock.mockImplementation(async (_leagues: LeagueId[], options?: { includeUpcoming?: boolean }) => ({
			games: options?.includeUpcoming ? slate : poll,
			leagueLogos: {},
			shedLeagues: [],
		}));
	});

	const rollOver = () => {
		slate = [slateGame('tomorrow', 'nba', 'pre')];
		poll = [];
		jest.setSystemTime(1_000_000 + slateRefreshMs);
	};

	test('drops last night\'s kickoffs on the next league poll', async () => {
		rollOver();
		jest.advanceTimersByTime(pollDormantMaxMs + 2000);
		await drain();

		expect(await stateGames()).toEqual(['tomorrow:pre']);
	});

	test('drops last night\'s kickoffs on a popup refresh', async () => {
		rollOver();
		await sendMessage({ type: 'GET_STATE', forceRefresh: true });

		expect(await stateGames()).toEqual(['tomorrow:pre']);
	});

	test('asks for the slate again at most once an hour', async () => {
		await sendMessage({ type: 'GET_STATE', forceRefresh: true });
		expect(wideFetches()).toBe(0);

		rollOver();
		await sendMessage({ type: 'GET_STATE', forceRefresh: true });
		await sendMessage({ type: 'GET_STATE', forceRefresh: true });
		expect(wideFetches()).toBe(1);
	});
});

describe('load progress', () => {
	const leagues = ['nba', 'nhl', 'nfl'] as LeagueId[];
	const tipOff: Game = {
		id: 'nba-1',
		league: 'nba' as LeagueId,
		sportType: 'basketball',
		status: 'in',
		homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 50 },
		awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 48 },
		period: 3,
		clockSeconds: 300,
	};

	const progressReports = () => runtimeSendMessage().mock.calls
		.map(([message]) => message as { type: string })
		.filter(message => message.type === 'LOAD_PROGRESS');

	const landLeaguesOneByOne = (games: Game[]) => {
		fetchMock.mockImplementation(async (wanted: LeagueId[], options?: { onLeagueProgress?: (settled: number, total: number) => void }) => {
			wanted.forEach((_, index) => options?.onLeagueProgress?.(index + 1, wanted.length));
			return { games, leagueLogos: {}, shedLeagues: [] };
		});
	};

	test('a cold popup open hears each league land', async () => {
		await loadBackground({ prefs: { enabledLeagues: leagues }, fetchReturnValue: { games: [], leagueLogos: {}, shedLeagues: [] } });
		landLeaguesOneByOne([]);
		runtimeSendMessage().mockClear();

		await sendMessage({ type: 'GET_STATE' });

		expect(progressReports()).toEqual([
			{ type: 'LOAD_PROGRESS', load: 'scores', settled: 1, total: 3 },
			{ type: 'LOAD_PROGRESS', load: 'scores', settled: 2, total: 3 },
			{ type: 'LOAD_PROGRESS', load: 'scores', settled: 3, total: 3 },
		]);
	});

	test('a full refresh nobody is waiting on stays quiet', async () => {
		await loadBackground({ prefs: { enabledLeagues: leagues }, fetchReturnValue: { games: [tipOff], leagueLogos: {}, shedLeagues: [] } });
		landLeaguesOneByOne([tipOff]);
		runtimeSendMessage().mockClear();

		await sendMessage({ type: 'SET_DEMO_MODE', enabled: false });

		expect(fetchMock).toHaveBeenCalledWith(leagues, expect.objectContaining({ onLeagueProgress: expect.any(Function) }));
		expect(progressReports()).toEqual([]);
	});

	test('the Guide hears its own leagues land', async () => {
		await loadBackground({ prefs: { enabledLeagues: leagues }, fetchReturnValue: { games: [tipOff], leagueLogos: {}, shedLeagues: [] } });
		landLeaguesOneByOne([tipOff]);
		runtimeSendMessage().mockClear();

		await sendMessage({ type: 'GET_GUIDE_SLATE' });

		expect(progressReports()).toEqual([
			{ type: 'LOAD_PROGRESS', load: 'guide', settled: 1, total: 3 },
			{ type: 'LOAD_PROGRESS', load: 'guide', settled: 2, total: 3 },
			{ type: 'LOAD_PROGRESS', load: 'guide', settled: 3, total: 3 },
		]);
	});
});
