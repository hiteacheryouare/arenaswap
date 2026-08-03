import { randomInRange } from '@porkyproductions/hat';
import { fetchGamesWithLeagueLogos, fetchWinProbability, computePowerScore, computeScoringOpportunityBoost, normalizePowerScoreResult, scoreMaxTotal, MockGameSimulator, createPollModeTracker, isObjectRecord, isScoreSnapshotLike, isPowerScoreSnapshotLike, normalizeGameBoosts, computeLeagueIntervalMs, pollWinProbabilityMs as winProbPollIntervalMs, logWarn, logError } from '@arenaswap/core';
import { computeStandbyStreamDecision } from '../utils/standbyStreamLogic';
import { loadStoredUserPreferences, persistStoredUserPreferences } from '../utils/prefsStorage';
import {
	normalizeReviewPromptState,
	recordSuccessfulReviewPromptSwitch,
	reviewPromptStorageKey,
} from '../utils/reviewPrompt';
import {
	applyDisabledSignals,
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
	} catch (err) {
		logWarn('Failed to update review prompt state.', err);
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

/**
 * Hard ceiling on retained snapshots per game, independent of the time window.
 *
 * The window is the real policy; this only stops the arrays growing without bound if polling
 * ever runs faster than expected. Soccer's 20-minute window at the 6s eager floor is 200
 * snapshots, so this leaves headroom without letting a runaway loop fill session storage.
 */
const maxSnapshotsPerGame = 400;

/** Trims a snapshot list in place to the sport's time window, with a count cap as a backstop. */
const trimSnapshots = <T extends { timestamp: number }>(snapshots: T[], cutoff: number): void => {
	while (snapshots.length > 1 && snapshots[0]!.timestamp < cutoff) snapshots.shift();
	if (snapshots.length > maxSnapshotsPerGame) snapshots.splice(0, snapshots.length - maxSnapshotsPerGame);
};

const capitalizeFirst = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

/** Every tab that currently exists, for checking a stored tab id against reality. */
const getOpenTabIds = async (): Promise<Set<number>> => {
	const allTabs = await browser.tabs.query({});
	return new Set(
		allTabs
			.map(tab => tab.id)
			.filter((tabId): tabId is number => tabId !== undefined)
	);
};

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
	// ESPN win-probability lines, keyed by game id. Lives on the summary endpoint (one request
	// per game) rather than the scoreboard, so it refreshes on its own slow cadence — see
	// refreshWinProbabilities. Everything that reads a PowerScore reads it from here, so the
	// card, the detail screen and the switcher all agree on the same number.
	const winProbHistory = new Map<string, number[]>();
	let winProbTimer: ReturnType<typeof setTimeout> | null = null;
	const pollModeTracker = createPollModeTracker();
	// Interval used only in demo mode
	let demoTimer: ReturnType<typeof setInterval> | null = null;
	let inFlightRefresh: Promise<void> | null = null;
	let upcomingGamesReady: Promise<void> | undefined;
	let pendingSwitchTimer: ReturnType<typeof setTimeout> | null = null;
	let pendingSwitch: { gameId: string; tabId: number; reason?: string } | null = null;
	let standbyStreamTabId: number | null = null;
	let onStandbyStream = false;
	// Tabs ArenaSwap has muted, tracked so a tab that leaves our control gets unmuted again
	// instead of being left silent with nothing in the UI explaining why. Mirrored into session
	// storage because MV3 tears the service worker down whenever it goes idle — an in-memory set
	// would come back empty and strand every muted tab with no record that we were the cause.
	const mutedTabIds = new Set<number>();
	const historyStorageDefaults = { scoreHistory: {}, powerScoreHistory: {}, gameBoosts: {}, mutedTabIds: [] };

	const persistMutedTabIds = async () => {
		try {
			await browser.storage.session.set({ mutedTabIds: [...mutedTabIds] });
		} catch (err) {
			logWarn('Failed to persist muted tab ids.', err);
		}
	};


	const hydrateHistoryMaps = (storedScoreHistory: unknown, storedPowerScoreHistory: unknown) => {
		history.clear();
		powerScoreHistory.clear();

		if (isObjectRecord(storedScoreHistory)) {
			Object.entries(storedScoreHistory).forEach(([gameId, snapshots]) => {
				if (!Array.isArray(snapshots)) return;
				const valid = snapshots.filter(isScoreSnapshotLike);
				if (valid.length === 0) return;
				// Runs before the first fetch, so there is no Game to read a per-sport window from
				// yet; the global window is the only thing available. The next updateHistory pass
				// re-trims each game to its sport's real window.
				const cutoff = valid[valid.length - 1]!.timestamp - historyWindowMs;
				const trimmed = valid.filter(s => s.timestamp >= cutoff).slice(-maxSnapshotsPerGame);
				if (trimmed.length === 0) return;
				history.set(gameId, trimmed);
			});
		}

		if (isObjectRecord(storedPowerScoreHistory)) {
			Object.entries(storedPowerScoreHistory).forEach(([gameId, snapshots]) => {
				if (!Array.isArray(snapshots)) return;
				const valid = snapshots.filter(isPowerScoreSnapshotLike);
				if (valid.length === 0) return;
				const cutoff = valid[valid.length - 1]!.timestamp - historyWindowMs;
				const trimmed = valid.filter(s => s.timestamp >= cutoff).slice(-maxSnapshotsPerGame);
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
			trimSnapshots(snapshots, now - getHistoryWindowMsForGame(game));
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
				...(score.winProbabilityVariance !== undefined ? { winProbabilityVariance: score.winProbabilityVariance } : {}),
				baseTotal: score.baseTotal ?? score.total,
				favoriteBonus: score.favoriteBonus ?? 0,
				favoriteTeamCount: score.favoriteTeamCount ?? 0,
				gameBoost: score.gameBoost ?? 0,
				scoringOpportunityBoost: score.scoringOpportunityBoost ?? 0,
				postseasonBoost: score.postseasonBoost ?? 0,
				stalled: score.stalled ?? false,
				reason: score.reason,
			});
			trimSnapshots(snapshots, now - getHistoryWindowMsForGame(game));
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
		}).catch(err => {
			logWarn('Failed to persist score history to session storage.', err);
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

	// Every tab whose audio ArenaSwap owns. The standby stream tab lives outside the game
	// registry but is still ours to mute — otherwise it keeps playing over whichever game
	// the user is actually watching.
	const getManagedTabIds = (): number[] => {
		const managedTabIds = tabRegistry.map(reg => reg.tabId);
		if (prefs.standbyStreamEnabled && standbyStreamTabId !== null) {
			managedTabIds.push(standbyStreamTabId);
		}
		return [...new Set(managedTabIds)];
	};

	const syncManagedTabMuteState = async (enabled: boolean) => {
		const managedTabIds = getManagedTabIds();
		if (managedTabIds.length === 0 && mutedTabIds.size === 0) return;

		const openTabIds = await getOpenTabIds();

		const managedOpenTabIds = managedTabIds.filter(tabId => openTabIds.has(tabId));

		// Tabs we muted earlier that are no longer ours (unregistered, standby switched off,
		// or a different standby tab picked) must be handed back to the user unmuted.
		const releasedTabIds = [...mutedTabIds].filter(
			tabId => openTabIds.has(tabId) && !managedOpenTabIds.includes(tabId)
		);

		let watchedTabId: number | undefined;
		if (enabled && managedOpenTabIds.length > 0) {
			const [activeTab] = await browser.tabs.query({ active: true, lastFocusedWindow: true });
			if (activeTab?.id !== undefined && managedOpenTabIds.includes(activeTab.id)) {
				watchedTabId = activeTab.id;
			}
		}

		const nextMuteStates = new Map<number, boolean>();
		for (const tabId of releasedTabIds) nextMuteStates.set(tabId, false);
		for (const tabId of managedOpenTabIds) {
			nextMuteStates.set(tabId, enabled ? tabId !== watchedTabId : false);
		}

		// A tab can close between the query above and the update below. Failing the whole batch
		// there would abort the caller mid-poll — including the switch evaluation that runs right
		// after this in afterFetch — so each tab is settled on its own and the record of what we
		// muted is written from what actually landed.
		const failedTabIds = new Set<number>();
		await Promise.all(
			[...nextMuteStates].map(async ([tabId, muted]) => {
				try {
					await browser.tabs.update(tabId, { muted });
				} catch {
					failedTabIds.add(tabId);
				}
			})
		);

		mutedTabIds.clear();
		for (const [tabId, muted] of nextMuteStates) {
			if (muted && !failedTabIds.has(tabId)) mutedTabIds.add(tabId);
		}
		await persistMutedTabIds();
	};

	const clearPendingSwitch = () => {
		if (pendingSwitchTimer) {
			clearTimeout(pendingSwitchTimer);
			pendingSwitchTimer = null;
		}
		pendingSwitch = null;
	};

	/**
	 * Drops every trace of a tab that no longer exists.
	 *
	 * Browsers never reuse a tab id, so a closed tab's registration can only ever be dead weight —
	 * and leaving it in place poisons switching outright: a closed tab still wins the reduce in
	 * resolveSwitchTarget whenever its game holds the top PowerScore, and every switch attempt then
	 * no-ops against a tab that isn't there. Same for the standby tab, which otherwise keeps
	 * answering `switchToStandby` forever.
	 */
	const forgetClosedTab = async (tabId: number) => {
		const hadRegistration = tabRegistry.some(reg => reg.tabId === tabId);
		const wasStandby = standbyStreamTabId === tabId;
		const wasMuted = mutedTabIds.delete(tabId);
		if (!hadRegistration && !wasStandby && !wasMuted) return;

		if (hadRegistration) tabRegistry = tabRegistry.filter(reg => reg.tabId !== tabId);
		if (wasStandby) {
			standbyStreamTabId = null;
			onStandbyStream = false;
		}
		if (pendingSwitch?.tabId === tabId) clearPendingSwitch();

		try {
			await browser.storage.session.set({ tabRegistry, standbyStreamTabId, mutedTabIds: [...mutedTabIds] });
		} catch (err) {
			logWarn('Failed to persist state after a tab closed.', err);
		}
		if (hadRegistration || wasStandby) broadcastScoresUpdated();
	};

	/**
	 * Reconciles rehydrated session state against the tabs that actually exist.
	 *
	 * MV3 tears the service worker down whenever it goes idle, so tabs close with no onRemoved
	 * listener alive to hear it and the registry comes back from session storage still pointing at
	 * them. Runs on every worker start, before the first switch evaluation.
	 */
	const reconcileClosedTabs = async () => {
		const openTabIds = await getOpenTabIds();
		// Nothing legitimately reports zero tabs while the worker is running, so an empty result
		// means we cannot see the tab strip — treat that as unknown rather than as proof that every
		// tracked tab closed, which would wipe a perfectly good registry.
		if (openTabIds.size === 0) return;

		const trackedTabIds = new Set([
			...tabRegistry.map(reg => reg.tabId),
			...mutedTabIds,
			...(standbyStreamTabId !== null ? [standbyStreamTabId] : []),
		]);
		for (const tabId of trackedTabIds) {
			if (!openTabIds.has(tabId)) await forgetClosedTab(tabId);
		}
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

	/**
	 * Picks the registered game worth switching to right now, or null to stay put.
	 *
	 * Reads `currentScores`, so it always answers from the latest poll — that is the point. Both
	 * the poll path and a queued delayed switch resolve through here, so a switch that waited out
	 * `switchDelaySeconds` re-targets against what the games are doing when it fires instead of
	 * replaying a decision made a minute ago.
	 *
	 * Registrations pointing at closed tabs are filtered out first, so the runner-up gets the
	 * switch rather than the whole thing stalling on a tab that no longer exists.
	 */
	const resolveSwitchTarget = (
		openTabIds: Set<number>,
		activeTabId: number,
	): { tabId: number; gameId: string; reason?: string } | null => {
		const liveRegistry = tabRegistry.filter(reg => openTabIds.has(reg.tabId));
		const activeReg = liveRegistry.find(reg => reg.tabId === activeTabId);
		const activeScore = currentScores.find(s => s.gameId === activeReg?.gameId)?.total ?? 0;

		const registeredGameIds = new Set(liveRegistry.map(reg => reg.gameId));
		const candidates = currentScores.filter(s => registeredGameIds.has(s.gameId));
		if (candidates.length === 0) return null;

		const best = candidates.reduce((a, b) => a.total > b.total ? a : b);
		// When several tabs are registered to the same game, the one already in focus is the one
		// the user is watching — picking any other would switch them between two tabs of the game
		// they are on.
		const bestReg = activeReg?.gameId === best.gameId
			? activeReg
			: liveRegistry.find(reg => reg.gameId === best.gameId)!;
		if (bestReg.tabId === activeTabId) return null;

		const threshold = sensitivityThresholds[prefs.sensitivity] ?? 0;
		// With no game tab in focus there is no score to clear, so the threshold has nothing to
		// measure against and the best game wins by default. It still has to be a game worth
		// watching: every frozen game scores 0, so without the `> 0` guard a league sitting at
		// halftime would pull the user off whatever they were actually doing.
		const notWatchingAGame = !activeReg && best.total > 0;
		if (!notWatchingAGame && best.total < activeScore + threshold) return null;
		if (Date.now() - lastSwitchTime <= prefs.cooldownSeconds * 1000) return null;

		return { tabId: bestReg.tabId, gameId: best.gameId, reason: best.reason };
	};

	const executePendingSwitch = async () => {
		const queuedSwitch = pendingSwitch;
		pendingSwitchTimer = null;
		pendingSwitch = null;
		if (!queuedSwitch || !prefs.enabled) return;

		const [activeTab] = await browser.tabs.query({ active: true, lastFocusedWindow: true });
		if (activeTab?.id === undefined) return;

		const openTabIds = await getOpenTabIds();

		// Everything went quiet during the delay: park on the standby stream on the next poll
		// instead of dropping the user into the least-boring game.
		if (prefs.standbyStreamEnabled && standbyStreamTabId !== null) {
			const registeredGameIds = new Set(
				tabRegistry.filter(reg => openTabIds.has(reg.tabId)).map(reg => reg.gameId)
			);
			const registeredScores = currentScores.filter(s => registeredGameIds.has(s.gameId));
			if (registeredScores.length > 0 && registeredScores.every(s => s.total < prefs.standbyStreamThreshold)) return;
		}

		const target = resolveSwitchTarget(openTabIds, activeTab.id);
		if (!target) return;

		await executeSwitch(target.tabId, target.gameId, target.reason);
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
			const result = await fetchGamesWithLeagueLogos(prefs.enabledLeagues, { includeUpcoming: true, upcomingDays: prefs.upcomingGamesDays });
			upcomingGames = result.games.filter(g => g.status === 'pre');
		} catch (err) {
			logWarn('Failed to fetch upcoming games.', err);
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
			const baseScore = applyDisabledSignals(
				normalizePowerScoreResult(
					computePowerScore(g, history.get(g.id) ?? [], stallCount, winProbHistory.get(g.id) ?? []),
				),
				prefs.disabledSignals,
			);
			const favoriteTeamCount = getFavoriteTeamCount(g, favoriteTeamIds);
			const favoriteBonus = favoriteTeamCount * favoriteBonusPoints;
			const gameBoost = gameBoosts[g.id] ?? 0;
			const scoringOpportunityBoost = computeScoringOpportunityBoost(g);
			const postseasonBoost = g.isPostseason ? postseasonBoostPoints : 0;
			// Automatic scoring (base signals + every non-manual boost) saturates at 100.
			// Only a manually-added game boost is allowed to push the headline total past the ceiling.
			const automaticTotal = Math.min(
				scoreMaxTotal,
				baseScore.total + favoriteBonus + scoringOpportunityBoost + postseasonBoost,
			);
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
					total: automaticTotal + gameBoost,
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

		const openTabIds = await getOpenTabIds();
		const liveRegistry = tabRegistry.filter(reg => openTabIds.has(reg.tabId));
		const registeredGameIds = new Set(liveRegistry.map(reg => reg.gameId));
		const registeredScores = scores.filter(s => registeredGameIds.has(s.gameId));
		if (registeredScores.length === 0) return;

		const standbyDecision = computeStandbyStreamDecision({
			standbyStreamEnabled: prefs.standbyStreamEnabled,
			standbyStreamTabId: standbyStreamTabId !== null && openTabIds.has(standbyStreamTabId) ? standbyStreamTabId : null,
			standbyStreamThreshold: prefs.standbyStreamThreshold,
			registeredScores,
			onStandbyStream,
			activeTabIsStandby: activeTab.id === standbyStreamTabId,
		});

		// Standby is evaluated ahead of the pending-switch guard: a queued switch must not be able
		// to freeze the standby state machine. When standby takes over, the queued game is by
		// definition below the threshold, so the queue is stale and goes with it.
		if (standbyDecision === 'switchToStandby') {
			clearPendingSwitch();
			onStandbyStream = true;
			await executeSwitch(standbyStreamTabId!);
			return;
		}
		if (standbyDecision === 'stayOnStandby') {
			clearPendingSwitch();
			return;
		}
		if (standbyDecision === 'resume') onStandbyStream = false;

		if (pendingSwitch) return;

		const target = resolveSwitchTarget(openTabIds, activeTab.id);
		if (!target) return;

		if (prefs.switchDelaySeconds > 0) {
			queuePendingSwitch(target.gameId, target.tabId, target.reason);
		} else {
			await executeSwitch(target.tabId, target.gameId, target.reason);
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
			} catch (err) {
				logError('Failed to fetch games.', err);
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
		} catch (err) {
			logWarn(`Failed to fetch ${leagueId} games.`, err);
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

	/**
	 * Refreshes the ESPN win-probability line for every live game.
	 *
	 * One request per game, so this deliberately runs far slower than the scoreboard poll —
	 * a win-probability line moves on the scale of possessions, not seconds, and the scorer
	 * only reads its average distance from 50%. Requests are issued together and failures are
	 * per-game: one 404 leaves the other games' cached lines intact.
	 */
	const refreshWinProbabilities = async (): Promise<void> => {
		const liveGames = games.filter(g => g.status === 'in');

		// Drop lines for games that have finished or dropped out of the enabled leagues.
		const liveIds = new Set(liveGames.map(g => g.id));
		for (const gameId of winProbHistory.keys()) {
			if (!liveIds.has(gameId)) winProbHistory.delete(gameId);
		}

		if (liveGames.length === 0) return;

		await Promise.all(liveGames.map(async game => {
			try {
				const line = await fetchWinProbability(game);
				// ESPN returns [] during delays and brief interruptions even when earlier play
				// produced a line; keep the last good one rather than dropping the signal.
				if (line.length > 0) winProbHistory.set(game.id, line);
			} catch (err) {
				logWarn(`Failed to fetch win probability for ${game.id}.`, err);
			}
		}));
	};

	const stopWinProbabilityPolling = () => {
		if (winProbTimer !== null) clearTimeout(winProbTimer);
		winProbTimer = null;
	};

	const scheduleWinProbabilityPolling = () => {
		stopWinProbabilityPolling();
		const run = async () => {
			await refreshWinProbabilities();
			winProbTimer = setTimeout(() => void run(), winProbPollIntervalMs);
		};
		winProbTimer = setTimeout(() => void run(), winProbPollIntervalMs);
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
		if (Array.isArray(sessionResult.mutedTabIds)) {
			for (const tabId of sessionResult.mutedTabIds) {
				if (typeof tabId === 'number' && Number.isFinite(tabId)) mutedTabIds.add(tabId);
			}
		}
		hydrateHistoryMaps(sessionResult.scoreHistory, sessionResult.powerScoreHistory);
		demoMode = demoResult.demoMode as boolean;
		if (demoMode) simulator = new MockGameSimulator();
	}).catch(err => {
		logError('Failed to load persisted state; falling back to defaults.', err);
	});

	stateReady.then(async () => {
		await reconcileClosedTabs().catch(err => {
			logWarn('Failed to reconcile the tab registry against open tabs.', err);
		});
		upcomingGamesReady = refreshUpcomingGames().catch(() => {});
		await upcomingGamesReady;
		await refreshScores(false).catch(err => {
			logError('Initial score refresh failed; starting polling anyway.', err);
		});

		if (demoMode) {
			if (!demoTimer) {
				demoTimer = setInterval(() => void tick(true), pollIntervalMs);
			}
			return;
		}

		startLeaguePolling();
		scheduleWinProbabilityPolling();
		// Seed the win-probability lines now that the games are known, then re-score so the very
		// first thing the popup renders already carries volatility. Demo games have no ESPN
		// summary behind them, so this is skipped above.
		await refreshWinProbabilities();
		await refreshScores(false);
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
				const prevUpcomingGamesDays = prefs.upcomingGamesDays;
				const prevLeagues = new Set(prefs.enabledLeagues);
				prefs = normalizeUserPreferences(msg.prefs);
				if (wasEnabled && !prefs.enabled) lastSwitchTime = 0;
				clearPendingSwitch();
				await persistStoredUserPreferences(prefs);
				await syncManagedTabMuteState(prefs.enabled);
				const upcomingSettingChanged = prefs.showUpcomingGames !== prevShowUpcoming ||
					(prefs.showUpcomingGames && prefs.upcomingGamesDays !== prevUpcomingGamesDays);
				if (upcomingSettingChanged) {
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
					// Games from a league that was just switched off keep their cached line
					// until the next sweep, so evict eagerly here.
					void refreshWinProbabilities();
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
					// Demo games have no ESPN summary behind them; drop any real lines we cached.
					stopWinProbabilityPolling();
					winProbHistory.clear();
					if (!demoTimer) {
						// Routed through refreshScores so a slow tick cannot overlap the next interval.
					demoTimer = setInterval(() => void refreshScores(true), pollIntervalMs);
					}
				} else {
					simulator = null;
					if (demoTimer) { clearInterval(demoTimer); demoTimer = null; }
					startLeaguePolling();
					scheduleWinProbabilityPolling();
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
				// Mute the freshly designated tab right away rather than waiting for the next poll
				await syncManagedTabMuteState(prefs.enabled);
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

	browser.tabs.onActivated.addListener(({ tabId }) => {
		void stateReady.then(() => {
			// A tab the user picked deserves the same protection as one we picked for them, so a
			// manual switch starts the cooldown. Without this, landing on a quieter game by hand
			// could be overridden by the very next poll.
			if (tabRegistry.some(reg => reg.tabId === tabId)) lastSwitchTime = Date.now();
			return syncManagedTabMuteState(prefs.enabled);
		});
	});

	browser.tabs.onRemoved.addListener(tabId => {
		void stateReady.then(() => forgetClosedTab(tabId));
	});
}) as unknown;
