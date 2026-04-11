import { fetchGamesWithLeagueLogos, computePowerScore, normalizePowerScoreResult, MockGameSimulator } from '@arenaswap/core';
import {
	createDefaultUserPreferences,
	LEAGUE_LOGO_FALLBACKS,
	normalizeUserPreferences,
	POLL_INTERVAL_MS,
	MAX_HISTORY_SNAPSHOTS,
	SENSITIVITY_THRESHOLDS,
	SPORT_TYPE_CONFIG_MAP,
} from '@arenaswap/core/constants';
import type {
	Game,
	PowerScoreResult,
	LeagueLogoMap,
	ScoreSnapshot,
	TabRegistration,
	UserPreferences,
} from '@arenaswap/core/types';

export default defineBackground(() => {
	let games: Game[] = [];
	let upcomingGames: Game[] = [];
	let currentScores: PowerScoreResult[] = [];
	let leagueLogos: LeagueLogoMap = {};
	const history = new Map<string, ScoreSnapshot[]>();
	const clockStallMap = new Map<string, { lastClock: number; stallCount: number }>();
	let tabRegistry: TabRegistration[] = [];
	let demoMode = false;
	let simulator: MockGameSimulator | null = null;
	let prefs: UserPreferences = createDefaultUserPreferences();
	let lastSwitchTime = 0;
	let pollTimer: ReturnType<typeof setInterval> | null = null;
	let inFlightRefresh: Promise<void> | null = null;
	let pendingSwitchTimer: ReturnType<typeof setTimeout> | null = null;
	let pendingSwitch: { gameId: string; tabId: number; reason?: string } | null = null;

	const updateHistory = (currentGames: Game[]) => {
		currentGames.forEach(game => {
			const snapshots = history.get(game.id) ?? [];
			snapshots.push({
				gameId: game.id,
				timestamp: Date.now(),
				homeScore: game.homeTeam.score,
				awayScore: game.awayTeam.score,
			});
			const sportConfig = SPORT_TYPE_CONFIG_MAP[game.sportType] ?? SPORT_TYPE_CONFIG_MAP.basketball;
			const maxSnapshots = sportConfig.maxHistorySnapshots ?? MAX_HISTORY_SNAPSHOTS;
			if (snapshots.length > maxSnapshots) snapshots.shift();
			history.set(game.id, snapshots);
		});
	};

	const getGameLabel = (gameId: string): string => {
		const game = games.find(g => g.id === gameId);
		return game ? `${game.awayTeam.abbreviation} vs ${game.homeTeam.abbreviation}` : 'Unknown Game';
	};

	const getVenueName = (gameId: string): string => {
		const game = games.find(g => g.id === gameId);
		return game?.venueName ?? 'the arena';
	};

	const getRegisteredTabIds = (): number[] => {
		return [...new Set(tabRegistry.map(reg => reg.tabId))];
	};

	const syncManagedTabMuteState = async (enabled: boolean) => {
		const registeredTabIds = getRegisteredTabIds();
		if (registeredTabIds.length === 0) return;

		const allTabs = await browser.tabs.query({});
		const openTabIds = new Set(
			allTabs
				.map(tab => tab.id)
				.filter((tabId): tabId is number => tabId !== undefined)
		);

		const managedOpenTabIds = registeredTabIds.filter(tabId => openTabIds.has(tabId));
		if (managedOpenTabIds.length === 0) return;

		let watchedTabId: number | undefined;
		if (enabled) {
			const [activeTab] = await browser.tabs.query({ active: true, lastFocusedWindow: true });
			if (activeTab?.id !== undefined && managedOpenTabIds.includes(activeTab.id)) {
				watchedTabId = activeTab.id;
			}
		}

		await Promise.all(
			managedOpenTabIds.map(tabId =>
				browser.tabs.update(tabId, { muted: enabled ? tabId !== watchedTabId : false })
			)
		);
	};

	const clearPendingSwitch = () => {
		if (pendingSwitchTimer) {
			clearTimeout(pendingSwitchTimer);
			pendingSwitchTimer = null;
		}
		pendingSwitch = null;
	};

	const executeSwitch = async (tabId: number, gameId: string, reason?: string) => {
		const [activeTab] = await browser.tabs.query({ active: true, lastFocusedWindow: true });
		if (activeTab?.id === tabId) return;

		const allTabs = await browser.tabs.query({});
		const tabExists = allTabs.some(tab => tab.id === tabId);
		if (!tabExists) return;

		await browser.tabs.update(tabId, { active: true });
		lastSwitchTime = Date.now();
		await syncManagedTabMuteState(true);

		await browser.notifications.create({
			type: 'basic',
			iconUrl: 'icon/128.png',
			title: `ArenaSwap → ${getGameLabel(gameId)}`,
			message: reason
				? `${reason}. Taking you to ${getVenueName(gameId)} now!`
				: `Taking you to ${getVenueName(gameId)} now!`,
		});
	};

	const executePendingSwitch = async () => {
		const queuedSwitch = pendingSwitch;
		pendingSwitchTimer = null;
		pendingSwitch = null;
		if (!queuedSwitch || !prefs.enabled) return;

		const matchingRegistration = tabRegistry.find(
			reg => reg.gameId === queuedSwitch.gameId && reg.tabId === queuedSwitch.tabId
		);
		if (!matchingRegistration) return;

		await executeSwitch(queuedSwitch.tabId, queuedSwitch.gameId, queuedSwitch.reason);
	};

	const queuePendingSwitch = (gameId: string, tabId: number, reason?: string) => {
		if (pendingSwitchTimer || pendingSwitch) return;

		pendingSwitch = { gameId, tabId, reason };
		pendingSwitchTimer = setTimeout(() => {
			void executePendingSwitch();
		}, prefs.switchDelaySeconds * 1000);
	};

	const refreshUpcomingGames = async () => {
		if (!prefs.showUpcomingGames) {
			upcomingGames = [];
			return;
		}
		try {
			const result = await fetchGamesWithLeagueLogos(prefs.enabledLeagues, { includeUpcoming: true });
			upcomingGames = result.games.filter(g => g.status === 'pre');
		} catch (err) {
			console.error('ArenaSwap: Failed to fetch upcoming games:', err);
		}
	};

	const tick = async (allowTabSwitch = true) => {
		const enabledLeagues = prefs.enabledLeagues;
		if (demoMode && simulator) {
			games = simulator.tick();
			const demoLeagues = [...new Set(games.map(game => game.league))];
			leagueLogos = demoLeagues.reduce<LeagueLogoMap>((acc, leagueId) => {
				acc[leagueId] = LEAGUE_LOGO_FALLBACKS[leagueId];
				return acc;
			}, {});
		} else {
			try {
				const fetchResult = await fetchGamesWithLeagueLogos(enabledLeagues, { includeUpcoming: false });
				games = fetchResult.games;
				leagueLogos = fetchResult.leagueLogos;
			} catch (err) {
				console.error('Arenaswap: Failed to fetch games:', err);
				return;
			}
			// Merge cached upcoming games, excluding any that have since gone live
			const freshGameIds = new Set(games.map(g => g.id));
			const stillUpcoming = upcomingGames.filter(g => !freshGameIds.has(g.id));
			games = [...games, ...stillUpcoming];
		}

		const liveGames = games.filter(g => g.status === 'in');

		// Track clock stall state for clock-based sports
		for (const game of liveGames) {
			const config = SPORT_TYPE_CONFIG_MAP[game.sportType];
			if (!config?.clockBased) continue;

			const entry = clockStallMap.get(game.id);
			if (!entry) {
				clockStallMap.set(game.id, { lastClock: game.clockSeconds, stallCount: 0 });
			} else if (game.clockSeconds === entry.lastClock) {
				entry.stallCount++;
			} else {
				entry.lastClock = game.clockSeconds;
				entry.stallCount = 0;
			}
		}

		const scores = liveGames.map(g => {
			const stallCount = clockStallMap.get(g.id)?.stallCount ?? 0;
			return normalizePowerScoreResult(computePowerScore(g, history.get(g.id) ?? [], stallCount));
		});
		currentScores = scores;
		updateHistory(liveGames);

		browser.runtime.sendMessage({ type: 'SCORES_UPDATED', scores, games, leagueLogos }).catch(() => {});

		await syncManagedTabMuteState(prefs.enabled);

		if (!allowTabSwitch || !prefs.enabled || liveGames.length === 0) {
			if (!prefs.enabled || liveGames.length === 0) {
				clearPendingSwitch();
			}
			return;
		}

		const [activeTab] = await browser.tabs.query({ active: true, lastFocusedWindow: true });
		if (activeTab?.id === undefined) return;

		const activeReg = tabRegistry.find(r => r.tabId === activeTab.id);
		const activeScore = scores.find(s => s.gameId === activeReg?.gameId)?.total ?? 0;

		// Only consider games that have a tab assigned
		const registeredGameIds = new Set(tabRegistry.map(r => r.gameId));
		const registeredScores = scores.filter(s => registeredGameIds.has(s.gameId));
		if (registeredScores.length === 0) return;
		if (pendingSwitch) return;

		const best = registeredScores.reduce((a, b) => a.total > b.total ? a : b);
		const bestReg = tabRegistry.find(r => r.gameId === best.gameId)!;
		const threshold = SENSITIVITY_THRESHOLDS[prefs.sensitivity];
		const cooldownOk = Date.now() - lastSwitchTime > prefs.cooldownSeconds * 1000;

		if (
			bestReg.tabId !== activeTab.id &&
			best.total > activeScore + threshold &&
			cooldownOk
		) {
			if (prefs.switchDelaySeconds > 0) {
				queuePendingSwitch(best.gameId, bestReg.tabId, best.reason);
			} else {
				await executeSwitch(bestReg.tabId, best.gameId, best.reason);
			}
		}
	};

	const refreshScores = async (allowTabSwitch = true): Promise<void> => {
		if (inFlightRefresh) return inFlightRefresh;
		inFlightRefresh = tick(allowTabSwitch).finally(() => {
			inFlightRefresh = null;
		});
		return inFlightRefresh;
	};

	// Load persisted state before any refresh to avoid race conditions on popup reopen.
	const stateReady = Promise.all([
		browser.storage.sync.get({ prefs: null }),
		browser.storage.session.get({ tabRegistry: [] }),
		browser.storage.local.get({ demoMode: false }),
	]).then(([prefsResult, registryResult, demoResult]) => {
		prefs = normalizeUserPreferences(prefsResult.prefs);
		tabRegistry = registryResult.tabRegistry as TabRegistration[];
		demoMode = demoResult.demoMode as boolean;
		if (demoMode) simulator = new MockGameSimulator();
	}).catch(err => {
		console.error('ArenaSwap: Failed to load persisted state, using defaults:', err);
	});

	stateReady.then(async () => {
		await refreshUpcomingGames();
		refreshScores(false).finally(() => {
			if (pollTimer) return;
			pollTimer = setInterval(() => {
				void refreshScores(true);
			}, POLL_INTERVAL_MS);
		});
	});

	// Handle messages from popup
	browser.runtime.onMessage.addListener((msg: any) => {
		if (msg.type === 'GET_STATE') {
			if (msg.forceRefresh === true || games.length === 0) {
				// Popup opened or worker just woke up; fetch fresh state before responding.
				return stateReady
					.then(() => refreshScores(false))
					.then(() => ({ games, scores: currentScores, leagueLogos }));
			}
			return Promise.resolve({ games, scores: currentScores, leagueLogos });
		}
		if (msg.type === 'UPDATE_PREFS') {
			return stateReady.then(async () => {
				const prevShowUpcoming = prefs.showUpcomingGames;
				prefs = normalizeUserPreferences(msg.prefs);
				clearPendingSwitch();
				await browser.storage.sync.set({ prefs });
				await syncManagedTabMuteState(prefs.enabled);
				if (prefs.showUpcomingGames !== prevShowUpcoming) {
					await refreshUpcomingGames();
					// Rebuild games: keep live/in-progress games, replace upcoming slice with updated cache
					games = [...games.filter(g => g.status !== 'pre'), ...upcomingGames];
					browser.runtime.sendMessage({ type: 'SCORES_UPDATED', scores: currentScores, games, leagueLogos }).catch(() => {});
				}
			});
		}
		if (msg.type === 'UPDATE_REGISTRY') {
			return stateReady.then(async () => {
				tabRegistry = msg.tabRegistry;
				clearPendingSwitch();
				await browser.storage.session.set({ tabRegistry });
				await syncManagedTabMuteState(prefs.enabled);
			});
		}
		if (msg.type === 'SET_DEMO_MODE') {
			return stateReady.then(async () => {
				clearPendingSwitch();
				demoMode = msg.enabled;
				if (demoMode) {
					simulator = new MockGameSimulator();
				} else {
					simulator = null;
				}
				await browser.storage.local.set({ demoMode });
				await refreshScores(false); // immediately refresh
			});
		}
	});

	browser.tabs.onActivated.addListener(() => {
		void stateReady.then(() => syncManagedTabMuteState(prefs.enabled));
	});
}) as unknown;
