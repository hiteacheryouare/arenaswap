import { randomInRange } from '@porkyproductions/hat';
import { fetchGamesWithLeagueLogos, computePowerScore, computeScoringOpportunityBoost, normalizePowerScoreResult, MockGameSimulator, createPollModeTracker, isObjectRecord, isScoreSnapshotLike, isPowerScoreSnapshotLike, normalizeGameBoosts, computeLeagueIntervalMs } from '@arenaswap/core';
import { computeStandbyStreamDecision } from '../utils/standbyStreamLogic';
import { loadStoredUserPreferences, persistStoredUserPreferences } from '../utils/prefsStorage';
import {
	normalizeReviewPromptState,
	recordSuccessfulReviewPromptSwitch,
	reviewPromptStorageKey,
} from '../utils/reviewPrompt';
import {
	createDefaultUserPreferences,
	createFavoriteTeamKey,
	leagueLogoFallbacks,
	normalizeUserPreferences,
	pollIntervalMs,
	pollDormantMinMs,
	pollDormantMaxMs,
	pollMaxEagerMs,
	historyWindowMs,
	sensitivityThresholds,
	sportTypeConfigMap,
} from '@arenaswap/core/constants';
import type {
	DebugState,
	ExtensionMessage,
	Game,
	LeagueId,
	PowerScoreResult,
	PowerScoreSnapshot,
	LeagueLogoMap,
	PowerScoreHistoryMap,
	ScoreSnapshot,
	ScoreHistoryMap,
	TabRegistration,
	UserPreferences,
} from '@arenaswap/core/types';

const recordSuccessfulSwitchForReviewPrompt = async (switchedAt: number) => {
	try {
		const stored = await browser.storage.local.get({ [reviewPromptStorageKey]: null });
		const current = normalizeReviewPromptState(stored[reviewPromptStorageKey]);
		await browser.storage.local.set({
			[reviewPromptStorageKey]: recordSuccessfulReviewPromptSwitch(current, switchedAt),
		});
	} catch {
		// Failed to update review prompt state
	}
};

const getFavoriteTeamCount = (game: Game, favoriteTeamIds: Set<string>): number => {
	let count = 0;
	const homeFavoriteTeamKey = createFavoriteTeamKey(game.league, game.homeTeam.id);
	const awayFavoriteTeamKey = createFavoriteTeamKey(game.league, game.awayTeam.id);
	if (favoriteTeamIds.has(homeFavoriteTeamKey)) count++;
	if (favoriteTeamIds.has(awayFavoriteTeamKey)) count++;
	return count;
};

const getHistoryWindowMsForGame = (game: Game): number => {
	const sportConfig = sportTypeConfigMap[game.sportType] ?? sportTypeConfigMap.basketball;
	return sportConfig.historyWindowMs ?? historyWindowMs;
};

const capitalizeFirst = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

export default defineBackground(() => {
	let games: Game[] = [];
	let upcomingGames: Game[] = [];
	let currentScores: PowerScoreResult[] = [];
	let leagueLogos: LeagueLogoMap = {};
	const history = new Map<string, ScoreSnapshot[]>();
	const powerScoreHistory = new Map<string, PowerScoreSnapshot[]>();
	const clockStallMap = new Map<string, { lastClock: number; stallCount: number }>();
	let tabRegistry: TabRegistration[] = [];
	let gameBoosts: Record<string, number> = {};
	let demoMode = false;
	let simulator: MockGameSimulator | null = null;
	let prefs: UserPreferences = createDefaultUserPreferences();
	let lastSwitchTime = 0;
	// Per-league timeouts for staggered live polling
	const leagueTimers = new Map<string, ReturnType<typeof setTimeout>>();
	// Last scheduled interval per league (ms), for debug visibility
	const leagueNextIntervalMs = new Map<string, number>();
	const pollModeTracker = createPollModeTracker();
	// Interval used only in demo mode
	let demoTimer: ReturnType<typeof setInterval> | null = null;
	let inFlightRefresh: Promise<void> | null = null;
	let upcomingGamesReady: Promise<void> | undefined;
	let pendingSwitchTimer: ReturnType<typeof setTimeout> | null = null;
	let pendingSwitch: { gameId: string; tabId: number; reason?: string } | null = null;
	let standbyStreamTabId: number | null = null;
	let onStandbyStream = false;
	const historyStorageDefaults = { scoreHistory: {}, powerScoreHistory: {}, gameBoosts: {} };


	const hydrateHistoryMaps = (storedScoreHistory: unknown, storedPowerScoreHistory: unknown) => {
		history.clear();
		powerScoreHistory.clear();

		if (isObjectRecord(storedScoreHistory)) {
			Object.entries(storedScoreHistory).forEach(([gameId, snapshots]) => {
				if (!Array.isArray(snapshots)) return;
				const valid = snapshots.filter(isScoreSnapshotLike);
				if (valid.length === 0) return;
				const newestTs = valid[valid.length - 1]!.timestamp;
				const game = games.find(g => g.id === gameId);
				const windowMs = game ? getHistoryWindowMsForGame(game) : historyWindowMs;
				const cutoff = newestTs - windowMs;
				const trimmed = valid.filter(s => s.timestamp >= cutoff);
				if (trimmed.length === 0) return;
				history.set(gameId, trimmed);
			});
		}

		if (isObjectRecord(storedPowerScoreHistory)) {
			Object.entries(storedPowerScoreHistory).forEach(([gameId, snapshots]) => {
				if (!Array.isArray(snapshots)) return;
				const valid = snapshots.filter(isPowerScoreSnapshotLike);
				if (valid.length === 0) return;
				const newestTs = valid[valid.length - 1]!.timestamp;
				const game = games.find(g => g.id === gameId);
				const windowMs = game ? getHistoryWindowMsForGame(game) : historyWindowMs;
				const cutoff = newestTs - windowMs;
				const trimmed = valid.filter(s => s.timestamp >= cutoff);
				if (trimmed.length === 0) return;
				powerScoreHistory.set(gameId, trimmed);
			});
		}
	};


	const updateHistory = (currentGames: Game[]) => {
		const now = Date.now();
		currentGames.forEach(game => {
			const snapshots = history.get(game.id) ?? [];
			snapshots.push({
				gameId: game.id,
				timestamp: now,
				homeScore: game.homeTeam.score,
				awayScore: game.awayTeam.score,
			});
			const cutoff = now - getHistoryWindowMsForGame(game);
			while (snapshots.length > 1 && snapshots[0]!.timestamp < cutoff) snapshots.shift();
			history.set(game.id, snapshots);
		});
	};

	const updatePowerScoreHistory = (liveGames: Game[], scores: PowerScoreResult[], changedLeagueId: LeagueId | null) => {
		const now = Date.now();
		const liveGameById = new Map(liveGames.map(game => [game.id, game]));
		scores.forEach(score => {
			const game = liveGameById.get(score.gameId);
			if (!game) return;
			if (changedLeagueId !== null && game.league !== changedLeagueId) return;

			const snapshots = powerScoreHistory.get(score.gameId) ?? [];
			snapshots.push({
				gameId: score.gameId,
				timestamp: now,
				total: score.total,
				closeness: score.closeness,
				lateGame: score.lateGame,
				momentum: score.momentum,
				leadChanges: score.leadChanges,
				comeback: score.comeback,
				baseTotal: score.baseTotal ?? score.total,
				favoriteBonus: score.favoriteBonus ?? 0,
				favoriteTeamCount: score.favoriteTeamCount ?? 0,
				gameBoost: score.gameBoost ?? 0,
				scoringOpportunityBoost: score.scoringOpportunityBoost ?? 0,
				postseasonBoost: score.postseasonBoost ?? 0,
				stalled: score.stalled ?? false,
				reason: score.reason,
			});
			const cutoff = now - getHistoryWindowMsForGame(game);
			while (snapshots.length > 1 && snapshots[0]!.timestamp < cutoff) snapshots.shift();
			powerScoreHistory.set(score.gameId, snapshots);
		});
	};

	const serializeScoreHistory = (): ScoreHistoryMap => (
		Object.fromEntries(
			[...history.entries()].map(([gameId, snapshots]) => [gameId, snapshots.map(snapshot => ({ ...snapshot }))]),
		)
	);

	const serializePowerScoreHistory = (): PowerScoreHistoryMap => (
		Object.fromEntries(
			[...powerScoreHistory.entries()].map(([gameId, snapshots]) => [gameId, snapshots.map(snapshot => ({ ...snapshot }))]),
		)
	);

	const persistHistoryToSession = () => {
		void browser.storage.session.set({
			scoreHistory: serializeScoreHistory(),
			powerScoreHistory: serializePowerScoreHistory(),
		}).catch(() => {
			// Failed to persist score history
		});
	};

	const buildBackgroundState = () => ({
		games,
		scores: currentScores,
		leagueLogos,
		scoreHistory: serializeScoreHistory(),
		powerScoreHistory: serializePowerScoreHistory(),
		gameBoosts,
		onStandbyStream,
		standbyStreamTabId,
	});

	const broadcastScoresUpdated = () => {
		browser.runtime.sendMessage({ type: 'SCORES_UPDATED', ...buildBackgroundState() }).catch(() => {});
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

	const executeSwitch = async (tabId: number, gameId?: string, reason?: string) => {
		const [activeTab] = await browser.tabs.query({ active: true, lastFocusedWindow: true });
		if (activeTab?.id === tabId) return;

		const allTabs = await browser.tabs.query({});
		const tabExists = allTabs.some(tab => tab.id === tabId);
		if (!tabExists) return;

		await browser.tabs.update(tabId, { active: true });
		lastSwitchTime = Date.now();
		await syncManagedTabMuteState(true);
		if (gameId) await recordSuccessfulSwitchForReviewPrompt(lastSwitchTime);

		if (prefs.notificationsEnabled) {
			if (!gameId) {
				await browser.notifications.create({
					type: 'basic',
					iconUrl: 'icon/128.png',
					title: 'On standby stream | ArenaSwap',
					message: 'All games went quiet. Parked on your standby stream.',
				});
			} else {
				const game = games.find(g => g.id === gameId);
				const scoreTitle = game
					? `${game.awayTeam.abbreviation} ${game.awayTeam.score}-${game.homeTeam.score} ${game.homeTeam.abbreviation}`
					: getGameLabel(gameId);
				const venue = getVenueName(gameId);
				const message = reason
					? `${capitalizeFirst(reason)}. Taking you to ${venue} now!`
					: `Taking you to ${venue} now!`;

				await browser.notifications.create({
					type: 'basic',
					iconUrl: 'icon/128.png',
					title: `Switched → ${scoreTitle} | ArenaSwap`,
					message,
				});
			}
		}
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
		} catch {
			// Failed to fetch upcoming games
		}
	};

	// Shared post-fetch processing: stall tracking, score computation, broadcast, tab switching.
	// Pass changedLeagueId to scope stall tracking and history to just the updated league;
	// pass null (full refresh) to process all live games.
	const afterFetch = async (changedLeagueId: LeagueId | null, allowTabSwitch: boolean) => {
		const liveGames = games.filter(g => g.status === 'in');
		const freshGames = changedLeagueId ? liveGames.filter(g => g.league === changedLeagueId) : liveGames;

		for (const game of freshGames) {
			const config = sportTypeConfigMap[game.sportType];
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

		const favoriteTeamIds = new Set(prefs.favoriteTeamIds);
		const favoriteBonusPoints = prefs.favoriteTeamBonusPoints;
		const postseasonBoostPoints = prefs.postseasonBoostPoints;
		const scores = liveGames.map(g => {
			const stallCount = clockStallMap.get(g.id)?.stallCount ?? 0;
			const baseScore = normalizePowerScoreResult(computePowerScore(g, history.get(g.id) ?? [], stallCount));
			const favoriteTeamCount = getFavoriteTeamCount(g, favoriteTeamIds);
			const favoriteBonus = favoriteTeamCount * favoriteBonusPoints;
			const gameBoost = gameBoosts[g.id] ?? 0;
			const scoringOpportunityBoost = computeScoringOpportunityBoost(g);
			const postseasonBoost = g.isPostseason ? postseasonBoostPoints : 0;
			const reasonParts = [
				baseScore.reason,
				favoriteBonus > 0 && `favorite bonus (+${favoriteBonus})`,
				gameBoost > 0 && `game boost (+${gameBoost})`,
				scoringOpportunityBoost > 0 && `scoring opportunity (+${scoringOpportunityBoost})`,
				postseasonBoost > 0 && `postseason (+${postseasonBoost})`,
			].filter(Boolean);

			return normalizePowerScoreResult(
				{
					...baseScore,
					baseTotal: baseScore.baseTotal ?? baseScore.total,
					favoriteBonus,
					favoriteTeamCount,
					gameBoost,
					scoringOpportunityBoost,
					postseasonBoost,
					total: baseScore.total + favoriteBonus + gameBoost + scoringOpportunityBoost + postseasonBoost,
					reason: reasonParts.join(', '),
				},
				{ allowTotalOverflow: true },
			);
		});
		currentScores = scores;
		updateHistory(freshGames);
		updatePowerScoreHistory(liveGames, scores, changedLeagueId);
		persistHistoryToSession();

		broadcastScoresUpdated();

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

		const registeredGameIds = new Set(tabRegistry.map(r => r.gameId));
		const registeredScores = scores.filter(s => registeredGameIds.has(s.gameId));
		if (registeredScores.length === 0) return;
		if (pendingSwitch) return;

		const standbyDecision = computeStandbyStreamDecision({
			standbyStreamEnabled: prefs.standbyStreamEnabled,
			standbyStreamTabId,
			standbyStreamThreshold: prefs.standbyStreamThreshold,
			registeredScores,
			onStandbyStream,
			activeTabIsStandby: activeTab.id === standbyStreamTabId,
		});

		if (standbyDecision === 'switchToStandby') {
			onStandbyStream = true;
			await executeSwitch(standbyStreamTabId!);
			return;
		}
		if (standbyDecision === 'stayOnStandby') return;
		if (standbyDecision === 'resume') onStandbyStream = false;

		const best = registeredScores.reduce((a, b) => a.total > b.total ? a : b);
		const bestReg = tabRegistry.find(r => r.gameId === best.gameId)!;
		const threshold = sensitivityThresholds[prefs.sensitivity] ?? 0;
		const cooldownOk = Date.now() - lastSwitchTime > prefs.cooldownSeconds * 1000;

		const notWatchingAGame = !activeReg;
		if (
			bestReg.tabId !== activeTab.id &&
			(notWatchingAGame || best.total >= activeScore + threshold) &&
			cooldownOk
		) {
			if (prefs.switchDelaySeconds > 0) {
				queuePendingSwitch(best.gameId, bestReg.tabId, best.reason);
			} else {
				await executeSwitch(bestReg.tabId, best.gameId, best.reason);
			}
		}
	};

	const tick = async (allowTabSwitch = true) => {
		const enabledLeagues = prefs.enabledLeagues;
		if (demoMode && simulator) {
			games = simulator.tick();
			const demoLeagues = [...new Set(games.map(game => game.league))];
			leagueLogos = demoLeagues.reduce<LeagueLogoMap>((acc, leagueId) => {
				acc[leagueId] = leagueLogoFallbacks[leagueId];
				return acc;
			}, {});
		} else {
			try {
				const fetchResult = await fetchGamesWithLeagueLogos(enabledLeagues, { includeUpcoming: false });
				games = fetchResult.games;
				leagueLogos = fetchResult.leagueLogos;
			} catch {
				// Failed to fetch games
				return;
			}
			// Merge cached upcoming games, excluding any that have since gone live
			const freshGameIds = new Set(games.map(g => g.id));
			const stillUpcoming = upcomingGames.filter(g => !freshGameIds.has(g.id));
			games = [...games, ...stillUpcoming];
		}

		await afterFetch(null, allowTabSwitch);
	};

	// Fetch a single league and merge results into shared state, then reschedule.
	// Each league runs on an adaptive interval driven by the highest live PowerScore
	// in the league: exciting games (high score) poll every ~6s; quiet live games
	// poll every ~25s. Intermission (halftime/between-periods) uses 40s. Leagues
	// with no live games use dormant mode (2-3 min). ±jitter prevents thundering herds.
	const tickLeague = async (leagueId: LeagueId, allowTabSwitch: boolean) => {
		let fetchSucceeded = false;
		try {
			const fetchResult = await fetchGamesWithLeagueLogos([leagueId], { includeUpcoming: false });
			const freshGameIds = new Set(fetchResult.games.map(g => g.id));
			const otherGames = games.filter(g => g.league !== leagueId);
			const leagueUpcoming = upcomingGames.filter(g => g.league === leagueId && !freshGameIds.has(g.id));
			games = [...otherGames, ...fetchResult.games, ...leagueUpcoming];
			leagueLogos = { ...leagueLogos, ...fetchResult.leagueLogos };
			const hasLiveGames = fetchResult.games.some(g => g.status === 'in');
			pollModeTracker.recordPollResult(leagueId, hasLiveGames);
			fetchSucceeded = true;
		} catch {
			// Failed to fetch league games
		}

		// Reschedule before awaiting post-processing so the next tick is always queued.
		// On error fall back to eager interval so we retry promptly.
		// Guard against rescheduling a league that was disabled while this fetch was in flight.
		if (!demoMode && prefs.enabledLeagues.includes(leagueId)) {
			let nextInterval: number;
			if (fetchSucceeded && pollModeTracker.getMode(leagueId) === 'dormant') {
				nextInterval = pollDormantMinMs + randomInRange(0, pollDormantMaxMs - pollDormantMinMs);
			} else if (fetchSucceeded) {
				const liveLeagueGames = games.filter(g => g.league === leagueId && g.status === 'in');
				const base = computeLeagueIntervalMs(liveLeagueGames, currentScores);
				// Scale jitter proportionally so fast (critical) polls stay dense and slow polls have more spread.
				const jitterMax = Math.round((base / pollMaxEagerMs) * 2_000);
				nextInterval = base + randomInRange(-jitterMax, jitterMax);
			} else {
				nextInterval = pollIntervalMs + randomInRange(-2_000, 2_000);
			}
			leagueNextIntervalMs.set(leagueId, nextInterval);
			scheduleLeagueTick(leagueId, nextInterval);
		}

		await afterFetch(leagueId, allowTabSwitch);
	};

	const scheduleLeagueTick = (leagueId: LeagueId, delayMs: number) => {
		const existing = leagueTimers.get(leagueId);
		if (existing !== undefined) clearTimeout(existing);
		leagueTimers.set(leagueId, setTimeout(() => void tickLeague(leagueId, true), delayMs));
	};

	const stopLeaguePolling = () => {
		for (const timer of leagueTimers.values()) clearTimeout(timer);
		leagueTimers.clear();
	};

	// Spread each enabled league's first tick randomly across pollIntervalMs so
	// they never all fire at the same moment after the initial full fetch.
	const startLeaguePolling = () => {
		stopLeaguePolling();
		pollModeTracker.reset();
		for (const leagueId of prefs.enabledLeagues) {
			scheduleLeagueTick(leagueId, randomInRange(0, pollIntervalMs));
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
		loadStoredUserPreferences(),
		browser.storage.session.get({ tabRegistry: [], standbyStreamTabId: null, ...historyStorageDefaults }),
		browser.storage.local.get({ demoMode: false }),
	]).then(([storedPrefs, sessionResult, demoResult]) => {
		prefs = storedPrefs;
		tabRegistry = sessionResult.tabRegistry as TabRegistration[];
		standbyStreamTabId = (sessionResult.standbyStreamTabId as number | null) ?? null;
		gameBoosts = normalizeGameBoosts(sessionResult.gameBoosts);
		hydrateHistoryMaps(sessionResult.scoreHistory, sessionResult.powerScoreHistory);
		demoMode = demoResult.demoMode as boolean;
		if (demoMode) simulator = new MockGameSimulator();
	}).catch(() => {
		// Failed to load persisted state, using defaults
	});

	stateReady.then(async () => {
		upcomingGamesReady = refreshUpcomingGames().catch(() => {});
		await upcomingGamesReady;
		refreshScores(false).finally(() => {
			if (demoMode) {
				if (!demoTimer) {
					demoTimer = setInterval(() => void tick(true), pollIntervalMs);
				}
			} else {
				startLeaguePolling();
			}
		});
	});

	// Handle messages from popup
	browser.runtime.onMessage.addListener((msg: ExtensionMessage) => {
		if (msg.type === 'GET_STATE') {
			if (msg.forceRefresh === true || games.length === 0) {
				// Popup opened or worker just woke up; fetch fresh state before responding.
				// Upcoming games load in the background and arrive via SCORES_UPDATED push.
				return stateReady
					.then(async () => {
						// Re-sync prefs from storage in case popup wrote prefs but closed before
						// the UPDATE_PREFS message was delivered.
						try {
							prefs = await loadStoredUserPreferences();
						} catch { /* keep current in-memory prefs */ }
						await refreshScores(false);
						return buildBackgroundState();
					});
			}
			return Promise.resolve(buildBackgroundState());
		}
		if (msg.type === 'UPDATE_PREFS') {
			return stateReady.then(async () => {
				const wasEnabled = prefs.enabled;
				const prevShowUpcoming = prefs.showUpcomingGames;
				const prevLeagues = new Set(prefs.enabledLeagues);
				prefs = normalizeUserPreferences(msg.prefs);
				if (wasEnabled && !prefs.enabled) lastSwitchTime = 0;
				clearPendingSwitch();
				await persistStoredUserPreferences(prefs);
				await syncManagedTabMuteState(prefs.enabled);
				if (prefs.showUpcomingGames !== prevShowUpcoming) {
					await refreshUpcomingGames();
					// Rebuild games: keep live/in-progress games, replace upcoming slice with updated cache
					games = [...games.filter(g => g.status !== 'pre'), ...upcomingGames];
					broadcastScoresUpdated();
				}
				// Restart staggered polling when the league set changes
				const newLeagues = new Set(prefs.enabledLeagues);
				const leaguesChanged = prevLeagues.size !== newLeagues.size ||
					[...prevLeagues].some(l => !newLeagues.has(l as LeagueId));
				if (leaguesChanged && !demoMode) {
					// Refresh upcoming games so newly-enabled leagues get their schedule
					await refreshUpcomingGames();
					// Rebuild games: keep live/in-progress games, replace upcoming slice with updated cache
					games = [...games.filter(g => g.status !== 'pre'), ...upcomingGames];
					broadcastScoresUpdated();
					startLeaguePolling();
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
		if (msg.type === 'SET_GAME_BOOST') {
			return stateReady.then(async () => {
				const boost = Math.max(0, Math.round(Number(msg.boost) || 0));
				if (boost === 0) {
					delete gameBoosts[msg.gameId];
				} else {
					gameBoosts[msg.gameId] = boost;
				}
				await browser.storage.session.set({ gameBoosts });
				await afterFetch(null, false);
			});
		}
		if (msg.type === 'SET_DEMO_MODE') {
			return stateReady.then(async () => {
				clearPendingSwitch();
				demoMode = msg.enabled;
				if (demoMode) {
					simulator = new MockGameSimulator();
					stopLeaguePolling();
					if (!demoTimer) {
						demoTimer = setInterval(() => void tick(true), pollIntervalMs);
					}
				} else {
					simulator = null;
					if (demoTimer) { clearInterval(demoTimer); demoTimer = null; }
					startLeaguePolling();
				}
				await browser.storage.local.set({ demoMode });
				await refreshScores(false); // immediately refresh
			});
		}
		if (msg.type === 'SET_STANDBY_STREAM_TAB') {
			return stateReady.then(async () => {
				standbyStreamTabId = msg.tabId;
				onStandbyStream = false;
				await browser.storage.session.set({ standbyStreamTabId });
			});
		}
		if (msg.type === 'GET_DEBUG_STATE') {
			return stateReady.then((): DebugState => {
				const gameLabels: Record<string, string> = {};
				for (const g of games) {
					gameLabels[g.id] = `${g.awayTeam.abbreviation}·${g.homeTeam.abbreviation}`;
				}
				return {
					pollModes: Object.fromEntries(
						prefs.enabledLeagues.map(leagueId => [leagueId, pollModeTracker.getMode(leagueId)])
					),
					leagueIntervals: Object.fromEntries(leagueNextIntervalMs.entries()),
					demoMode,
					lastSwitchTime,
					pendingSwitch,
					liveGameCount: games.filter(g => g.status === 'in').length,
					upcomingGameCount: games.filter(g => g.status === 'pre').length,
					totalGameCount: games.length,
					tabRegistry,
					onStandbyStream,
					standbyStreamTabId,
					clockStalls: Object.fromEntries(clockStallMap.entries()),
					scores: currentScores,
					gameLabels,
					enabledLeagues: prefs.enabledLeagues,
					sensitivity: prefs.sensitivity,
					cooldownSeconds: prefs.cooldownSeconds,
					switchDelaySeconds: prefs.switchDelaySeconds,
				};
			});
		}
	});

	browser.tabs.onActivated.addListener(() => {
		void stateReady.then(() => syncManagedTabMuteState(prefs.enabled));
	});
}) as unknown;
