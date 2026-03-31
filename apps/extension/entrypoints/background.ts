import { fetchGames, computeExcitement, MockGameSimulator } from '@arenaswap/core';
import {
	POLL_INTERVAL_MS,
	MAX_HISTORY_SNAPSHOTS,
	DEFAULT_SENSITIVITY,
	DEFAULT_COOLDOWN_SECS,
	SENSITIVITY_THRESHOLDS,
	SPORT_CONFIG_MAP,
} from '@arenaswap/core/constants';
import type {
	Game,
	ExcitementResult,
	ScoreSnapshot,
	TabRegistration,
	UserPreferences,
} from '@arenaswap/core/types';

export default defineBackground(() => {
	let games: Game[] = [];
	let currentScores: ExcitementResult[] = [];
	const history = new Map<string, ScoreSnapshot[]>();
	const clockStallMap = new Map<string, { lastClock: number; stallCount: number }>();
	let tabRegistry: TabRegistration[] = [];
	let demoMode = false;
	let simulator: MockGameSimulator | null = null;
	let prefs: UserPreferences = {
		sensitivity: DEFAULT_SENSITIVITY,
		cooldownSeconds: DEFAULT_COOLDOWN_SECS,
		enabled: true,
	};
	let lastSwitchTime = 0;
	let pollTimer: ReturnType<typeof setInterval> | null = null;
	let inFlightRefresh: Promise<void> | null = null;

	const updateHistory = (currentGames: Game[]) => {
		currentGames.forEach(game => {
			const snapshots = history.get(game.id) ?? [];
			snapshots.push({
				gameId: game.id,
				timestamp: Date.now(),
				homeScore: game.homeTeam.score,
				awayScore: game.awayTeam.score,
			});
			if (snapshots.length > MAX_HISTORY_SNAPSHOTS) snapshots.shift();
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

	const tick = async (allowTabSwitch = true) => {
		if (demoMode && simulator) {
			games = simulator.tick();
		} else {
			try {
				games = await fetchGames();
			} catch (err) {
				console.error('Arenaswap: Failed to fetch games:', err);
				return;
			}
		}

		const liveGames = games.filter(g => g.status === 'in');

		// Track clock stall state for clock-based sports
		for (const game of liveGames) {
			const config = SPORT_CONFIG_MAP[game.sport];
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
			return computeExcitement(g, history.get(g.id) ?? [], stallCount);
		});
		currentScores = scores;
		updateHistory(liveGames);

		browser.runtime.sendMessage({ type: 'SCORES_UPDATED', scores, games }).catch(() => {});

		await syncManagedTabMuteState(prefs.enabled);

		if (!allowTabSwitch || !prefs.enabled || liveGames.length === 0) return;

		const [activeTab] = await browser.tabs.query({ active: true, lastFocusedWindow: true });
		if (activeTab?.id === undefined) return;

		const activeReg = tabRegistry.find(r => r.tabId === activeTab.id);
		const activeScore = scores.find(s => s.gameId === activeReg?.gameId)?.total ?? 0;

		// Only consider games that have a tab assigned
		const registeredGameIds = new Set(tabRegistry.map(r => r.gameId));
		const registeredScores = scores.filter(s => registeredGameIds.has(s.gameId));
		if (registeredScores.length === 0) return;

		const best = registeredScores.reduce((a, b) => a.total > b.total ? a : b);
		const bestReg = tabRegistry.find(r => r.gameId === best.gameId)!;
		const threshold = SENSITIVITY_THRESHOLDS[prefs.sensitivity];
		const cooldownOk = Date.now() - lastSwitchTime > prefs.cooldownSeconds * 1000;

		if (
			bestReg.tabId !== activeTab.id &&
			best.total > activeScore + threshold &&
			cooldownOk
		) {
			await browser.tabs.update(bestReg.tabId, { active: true });
			lastSwitchTime = Date.now();
			await syncManagedTabMuteState(true);

			await browser.notifications.create({
				type: 'basic',
				iconUrl: 'icon/128.png',
				title: `ArenaSwap → ${getGameLabel(best.gameId)}`,
				message: best.reason
					? `${best.reason}. Taking you to ${getVenueName(best.gameId)} now!`
					: `Taking you to ${getVenueName(best.gameId)} now!`,
			});
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
		if (prefsResult.prefs) prefs = prefsResult.prefs as UserPreferences;
		tabRegistry = registryResult.tabRegistry as TabRegistration[];
		demoMode = demoResult.demoMode as boolean;
		if (demoMode) simulator = new MockGameSimulator();
	});

	stateReady.then(() => {
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
					.then(() => ({ games, scores: currentScores }));
			}
			return Promise.resolve({ games, scores: currentScores });
		}
		if (msg.type === 'UPDATE_PREFS') {
			return stateReady.then(async () => {
				prefs = msg.prefs;
				await browser.storage.sync.set({ prefs });
				await syncManagedTabMuteState(prefs.enabled);
			});
		}
		if (msg.type === 'UPDATE_REGISTRY') {
			return stateReady.then(async () => {
				tabRegistry = msg.tabRegistry;
				await browser.storage.session.set({ tabRegistry });
				await syncManagedTabMuteState(prefs.enabled);
			});
		}
		if (msg.type === 'SET_DEMO_MODE') {
			return stateReady.then(async () => {
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
