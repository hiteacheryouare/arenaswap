import { i18n } from '#i18n';
import { randomInRange } from '@porkyproductions/hat';
import { createWinProbabilityTracker, summaryStillNeeded, hasMissedItsWindow, isWithinFinalRetention, MockGameSimulator, createPollModeTracker, isObjectRecord, isScoreSnapshotLike, isPowerScoreSnapshotLike, normalizeGameBoosts, computeLeagueIntervalMs, computeHebetudinousIntervalMs, earliestUpcomingStartMs, computeRetryDelayMs, pollWinProbabilityMs as winProbPollIntervalMs, logWarn, logError, isPlayFrozen, chooseSwitchTarget, getHistoryWindowMsForGame, stuckSinceOf, trackProgress, maxSnapshotsPerGame, nextCommercialBreak, checkHeldSwitch, holdSwitch, retainSnapshots, scoreLiveGame, toLiveScore, toScoreSnapshot } from '@arenaswap/core';
import { fetchGamesWithLeagueLogos, fetchGameDurationMins, fetchTeamMonoLogos, fetchWinProbability, fetchNextScheduledStart, scoreboardRefreshMs, createLiveExtras, fetchCompetitionSituation, fetchLeagueStandings, hasStandingsRaces } from '@arenaswap/sideline';
import type { CommercialBreakEntry, HeldSwitch, PlayBreakSport, WinProbabilityReading } from '@arenaswap/core';
import { computeStandbyStreamDecision, usableStandbyTabId } from '../utils/standbyStreamLogic';
import { describeDelayLeft, findDelayedGameLeft } from '../utils/delayNotice';
import kickoffDelayMs from '../utils/kickoffPoll';
import createKeepAwake from '../utils/keepAwake';
import { gameEndRetentionMs, gameEndTimes, gameEndTimesKey, gamesNeedingDuration, pruneGameEndRecords, readGameEndRecords, recordGameEnds } from '../utils/gameEndTimes';
import type { gameEndRecords } from '../utils/gameEndTimes';
import { isMonoLogoCacheFresh, missingMonoLogoLeagues, monoLogoCacheKey } from '../utils/monoLogoCache';
import { createCrestColors, crestColorCacheKey } from '../utils/crestColors';
import {
	finishedTabNoticeKey,
	mergeFinishedTabNotice,
	normalizeFinishedTabNotice,
	resolveFinishedTabs,
} from '../utils/finishedTabs';
import { loadConferenceDirectory } from '../utils/collegeConferences';
import { bossCommandName, bossHushedKey, createBossMode } from '../utils/bossMode';
import { createMultiview, isMultiviewBuild, leftMultiviewPage, multiviewFrameScriptId, multiviewFrameScriptPath, multiviewPagePath, multiviewPermissions, multiviewStateKey } from '../utils/multiview';
import type { multiviewOutcome } from '../utils/multiview';
import { loadStoredUserPreferences, persistStoredUserPreferences } from '../utils/prefsStorage';
import { loadFantasyRoster } from '../utils/fantasyRosterStorage';
import { activeProfileSyncKey, followSyncedProfile } from '../utils/profiles';
import { capitalizeReason, speakReason } from '../utils/powerScoreReason';
import { displayLocale } from '../utils/displayLocale';
import type { guideSlateOutcome } from '../utils/slateMerge';
import { guideSlateTtlMs, keepRefusedLeagues, resolveGuideSlate, resolveGuideSlateFailure, slateRefreshMs } from '../utils/slateMerge';
import {
	normalizeReviewPromptState,
	recordSuccessfulReviewPromptSwitch,
	reviewPromptStorageKey,
} from '../utils/reviewPrompt';
import {
	clampBoostPoints,
	collegeFetchGroups,
	createDefaultUserPreferences,
	filterCollegeGames,
	guideMinUpcomingDays,
	isCollegeLeagueId,
	isFavoriteTeamGame,
	needsConferenceDirectory,
	normalizeUserPreferences,
	parseFavoriteTeamKey,
	resolveCollegeFilter,
	pollIntervalMs,
	pollDormantMinMs,
	pollDormantMaxMs,
	pollHebetudinousHorizonMs,
	pollMaxEagerMs,
	resolveLeagueLogoUrl,
	sportTypeConfigMap,
	leagueConfigMap,
} from '@arenaswap/core/constants';
import type { GameProgressMap } from '@arenaswap/core';
import type {
	CollegeLeagueId,
	ConferenceDirectory,
	DebugState,
	ExtensionMessage,
	Game,
	GuideSlate,
	LeagueId,
	LeagueLastGoodAt,
	LiveScore,
	PowerScoreSnapshot,
	LeagueLogoMap,
	TeamMonoLogoMap,
	PowerScoreHistoryMap,
	ScoreSnapshot,
	ScoreHistoryMap,
	SportType,
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

const readStoredSwitchTime = (value: unknown, now: number): number => (
	typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= now ? value : 0
);

const switchNotificationId = 'arenaswap-switch';
const multiviewLeftNotificationId = 'arenaswap-multiview-left';
const standingsRefreshMs = 30 * 60 * 1000;
const blowoutSummaryIntervalMs = 180_000;
const situationWaitMs = 2_000;
const pollJitterAtSlowestBeatMs = 2_000;
const retryJitterMs = 2_000;

const jitteredBeatMs = (beatMs: number, feedCacheMs: number) => {
	const jitterMs = Math.round((beatMs / pollMaxEagerMs) * pollJitterAtSlowestBeatMs);
	return Math.max(feedCacheMs, beatMs + randomInRange(-jitterMs, jitterMs));
};

const routMargin = (sportType: SportType) => sportTypeConfigMap[sportType]?.closenessMargins[2];

const getOpenTabIds = async (): Promise<Set<number>> => {
	const allTabs = await browser.tabs.query({});
	return new Set(
		allTabs
			.map(tab => tab.id)
			.filter((tabId): tabId is number => tabId !== undefined)
	);
};

const getActiveTabId = async (): Promise<number | undefined> => {
	const [activeTab] = await browser.tabs.query({ active: true, lastFocusedWindow: true });
	return activeTab?.id;
};

interface tabSnapshot {
	allTabs: Browser.tabs.Tab[];
	activeTabId: number | undefined;
}

const readTabs = async (): Promise<tabSnapshot> => {
	const [allTabs, activeTabId] = await Promise.all([browser.tabs.query({}), getActiveTabId()]);
	return { allTabs, activeTabId };
};

const activeTabIdsOf = ({ allTabs, activeTabId }: tabSnapshot): Set<number> => new Set([
	...allTabs.flatMap(tab => tab.active && tab.id !== undefined ? [tab.id] : []),
	...(activeTabId === undefined ? [] : [activeTabId]),
]);

const tabIdsOf = (tabs: tabSnapshot): Set<number> => new Set(tabs.allTabs.flatMap(tab => tab.id === undefined ? [] : [tab.id]));

// Activating a tab in a window behind this one changes nothing anyone can see. And a player in full
// screen drops out of it once its tab stops being the active one; only a click can put the new
// tab's player back, but the window needs none, so it goes back and the game still fills the screen.
const bringWindowForward = async (windowId: number, watchedWindow: { id?: number; state?: string }) => {
	if (windowId !== watchedWindow.id) await browser.windows.update(windowId, { focused: true });
	if (watchedWindow.state !== 'fullscreen') return;
	const { state } = await browser.windows.get(windowId);
	if (state !== 'fullscreen') await browser.windows.update(windowId, { state: 'fullscreen' });
};

const recordFinishedTabNotice = async (freed: number, closed: number) => {
	try {
		const stored = await browser.storage.session.get({ [finishedTabNoticeKey]: null });
		const notice = mergeFinishedTabNotice(normalizeFinishedTabNotice(stored[finishedTabNoticeKey]), freed, closed);
		await browser.storage.session.set({ [finishedTabNoticeKey]: notice });
	} catch (err) {
		logWarn('Failed to record which tabs were handed back.', err);
	}
};

const describeOpenWindows = (allTabs: { id?: number; windowId?: number }[]) => {
	const windowIdByTabId = new Map<number, number>();
	const tabCountByWindowId = new Map<number, number>();
	for (const tab of allTabs) {
		if (tab.id === undefined || tab.windowId === undefined) continue;
		windowIdByTabId.set(tab.id, tab.windowId);
		tabCountByWindowId.set(tab.windowId, (tabCountByWindowId.get(tab.windowId) ?? 0) + 1);
	}
	return { windowIdByTabId, tabCountByWindowId };
};

const slateBeside = (onScreen: Game[], slate: Game[]): Game[] => {
	const shownIds = new Set(onScreen.map(g => g.id));
	return slate.filter(g => !shownIds.has(g.id) && !hasMissedItsWindow(g));
};

export default defineBackground(() => {
	const workerStartedAt = Date.now();
	let games: Game[] = [];
	let upcomingGames: Game[] = [];
	let retainedFinalGames: Game[] = [];
	let slateFetchedAt = 0;
	let guideSlate: Game[] = [];
	let guideSlateAt = 0;
	let guideSlateHoldMs = guideSlateTtlMs;
	let guideSlateRefused = false;
	let guideRetryAfter = 0;
	let guideSlateRequest: Promise<GuideSlate> | null = null;
	let slateShedLeagues: LeagueId[] = [];
	const leagueLastGoodAt: LeagueLastGoodAt = {};
	let gameProgress: GameProgressMap = {};
	let stuckSince: Record<string, number> = {};
	const switchableScores = (list: LiveScore[]): LiveScore[] => list.filter(score => stuckSince[score.gameId] === undefined);
	let endRecords: gameEndRecords = {};
	const durationRequested = new Set<string>();
	let currentScores: LiveScore[] = [];
	let leagueLogos: LeagueLogoMap = {};
	let monoLogos: TeamMonoLogoMap = {};
	let monoLogosLoaded = false;
	let monoLogoRequest: { key: string; pending: Promise<TeamMonoLogoMap> } | null = null;
	const monoLogoAsked = new Set<LeagueId>();

	const ensureMonoLogos = async (leagueIds: LeagueId[]): Promise<TeamMonoLogoMap> => {
		if (!monoLogosLoaded) {
			try {
				const stored = (await browser.storage.local.get(monoLogoCacheKey))[monoLogoCacheKey];
				if (isMonoLogoCacheFresh(stored, Date.now())) monoLogos = { ...stored.logos, ...monoLogos };
			} catch (err) {
				logWarn('Failed to read the stored team mono logos.', err);
			}
			monoLogosLoaded = true;
		}

		const missing = missingMonoLogoLeagues(monoLogos, leagueIds).filter(leagueId => !monoLogoAsked.has(leagueId));
		if (missing.length === 0) return monoLogos;

		const key = missing.toSorted().join(',');
		if (monoLogoRequest?.key !== key) {
			monoLogoRequest = { key, pending: fetchTeamMonoLogos(missing) };
		}
		try {
			const fetched = await monoLogoRequest.pending;
			for (const leagueId of missing) monoLogoAsked.add(leagueId);
			if (Object.keys(fetched).length === 0) return monoLogos;
			monoLogos = { ...monoLogos, ...fetched };
			await browser.storage.local.set({ [monoLogoCacheKey]: { fetchedAt: Date.now(), logos: monoLogos } });
		} catch (err) {
			logWarn('Failed to fetch team mono logos.', err);
			if (monoLogoRequest?.key === key) monoLogoRequest = null;
		}
		return monoLogos;
	};
	const crestColors = createCrestColors({
		load: async () => (await browser.storage.local.get(crestColorCacheKey))[crestColorCacheKey],
		save: stored => browser.storage.local.set({ [crestColorCacheKey]: stored }),
	});
	const storeEndRecords = (next: gameEndRecords) => {
		endRecords = pruneGameEndRecords(next, Date.now());
		void browser.storage.local.set({ [gameEndTimesKey]: endRecords }).catch(err => {
			logWarn('Failed to persist game end times.', err);
		});
	};

	const noteGameEnds = (fetched: Game[]) => {
		if (demoMode) return;
		const next = recordGameEnds(endRecords, fetched, Date.now());
		if (next) storeEndRecords(next);
	};

	const fillMissingDurations = async (slateGames: Game[]) => {
		const pending = gamesNeedingDuration(slateGames, endRecords).filter(game => !durationRequested.has(game.id));
		if (pending.length === 0) return;
		for (const game of pending) durationRequested.add(game.id);

		const found = await Promise.all(pending.map(async game => {
			try {
				const minutes = await fetchGameDurationMins(game);
				const startMs = game.startTime ? new Date(game.startTime).getTime() : Number.NaN;
				return minutes && Number.isFinite(startMs) ? { id: game.id, endedAt: startMs + minutes * 60_000 } : null;
			} catch (err) {
				logWarn(`Failed to fetch the duration of ${game.id}.`, err);
				durationRequested.delete(game.id);
				return null;
			}
		}));

		const ended = found.filter(entry => entry !== null);
		if (ended.length === 0) return;
		const next = { ...endRecords };
		for (const { id, endedAt } of ended) next[id] = { ...next[id], endedAt };
		storeEndRecords(next);
		browser.runtime.sendMessage({ type: 'GUIDE_SLATE_UPDATED' } satisfies ExtensionMessage).catch(() => {});
	};

	const history = new Map<string, ScoreSnapshot[]>();
	const powerScoreHistory = new Map<string, PowerScoreSnapshot[]>();
	const commercialBreaks = new Map<string, CommercialBreakEntry>();
	let tabRegistry: TabRegistration[] = [];
	let gameBoosts: Record<string, number> = {};
	let demoMode = false;
	let simulator: MockGameSimulator | null = null;
	let prefs: UserPreferences = createDefaultUserPreferences();
	let lastSwitchTime = 0;
	const setLastSwitchTime = (at: number): void => {
		lastSwitchTime = at;
		void browser.storage.session.set({ lastSwitchTime: at }).catch(err => {
			logWarn('Failed to persist the switch cooldown to session storage.', err);
		});
	};
	const leagueTimers = new Map<string, ReturnType<typeof setTimeout>>();
	const leagueWakeAt = new Map<LeagueId, number>();
	const keepAwake = createKeepAwake({ beat: () => browser.runtime.getPlatformInfo(), alarms: browser.alarms });
	const refreshKeepAwake = () => keepAwake(leagueWakeAt.size > 0 ? Math.min(...leagueWakeAt.values()) : null, demoMode);
	const leagueFailureCounts = new Map<LeagueId, number>();
	const leagueHealthyIntervalMs = new Map<LeagueId, number>();
	const leagueNextIntervalMs = new Map<string, number>();
	const winProbHistory = new Map<string, WinProbabilityReading[]>();
	const winProbTracker = createWinProbabilityTracker();
	const liveExtras = createLiveExtras();
	const summaryFetchedAt = new Map<string, number>();
	const situationPlayIds = new Map<string, string>();
	const summaryPlayIds = new Map<string, string>();
	const standingsFetchedAt = new Map<LeagueId, number>();
	let winProbTimer: ReturnType<typeof setTimeout> | null = null;
	let winProbGeneration = 0;
	const pollModeTracker = createPollModeTracker();
	let demoTimer: ReturnType<typeof setInterval> | null = null;
	let inFlightRefresh: Promise<void> | null = null;
	let pendingSwitchTimer: ReturnType<typeof setTimeout> | null = null;
	let pendingSwitch: { gameId: string; tabId: number; reason?: string; waitedFor?: PlayBreakSport } | null = null;
	let heldSwitch: HeldSwitch | null = null;
	let heldSwitchTimer: ReturnType<typeof setTimeout> | null = null;
	let standbyStreamTabId: number | null = null;
	let onStandbyStream = false;
	const mutedTabIds = new Set<number>();
	const historyStorageDefaults = { scoreHistory: {}, powerScoreHistory: {}, gameBoosts: {}, mutedTabIds: [], scoreboardWinProbHistory: {} };

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
				history.set(gameId, valid.slice(-maxSnapshotsPerGame));
			});
		}

		if (isObjectRecord(storedPowerScoreHistory)) {
			Object.entries(storedPowerScoreHistory).forEach(([gameId, snapshots]) => {
				if (!Array.isArray(snapshots)) return;
				const valid = snapshots.filter(isPowerScoreSnapshotLike);
				if (valid.length === 0) return;
				powerScoreHistory.set(gameId, valid.slice(-maxSnapshotsPerGame));
			});
		}
		pruneStaleHistory(Date.now());
	};

	const pruneStaleHistory = (now: number): boolean => {
		let pruned = false;
		for (const map of [history, powerScoreHistory] as Map<string, { timestamp: number }[]>[]) {
			for (const [gameId, snapshots] of map) {
				if (now - (snapshots.at(-1)?.timestamp ?? 0) <= gameEndRetentionMs) continue;
				map.delete(gameId);
				pruned = true;
			}
		}
		return pruned;
	};

	const updateHistory = (currentGames: Game[]) => {
		const now = Date.now();
		currentGames.forEach(game => {
			const snapshots = history.get(game.id) ?? [];
			snapshots.push(toScoreSnapshot(game, now));
			history.set(game.id, retainSnapshots(snapshots, now - getHistoryWindowMsForGame(game), prefs.keepFinalGames));
		});
	};

	const updatePowerScoreHistory = (liveGames: Game[], scores: LiveScore[], changedLeagueId: LeagueId | null) => {
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
				signalsSubtotal: score.signalsSubtotal ?? score.total,
				favoriteBonus: score.favoriteBonus ?? 0,
				favoriteTeamCount: score.favoriteTeamCount ?? 0,
				gameBoost: score.gameBoost ?? 0,
				scoringOpportunityBoost: score.scoringOpportunityBoost ?? 0,
				postseasonBoost: score.postseasonBoost ?? 0,
				onBreak: score.onBreak ?? false,
				reason: score.reason,
				...(score.breakdown ? {
					modeId: score.breakdown.modeId,
					...(score.breakdown.modeId === 'classic' ? {} : { signals: Object.fromEntries(score.breakdown.signals.map(signal => [signal.id, signal.points])) }),
					boosts: Object.fromEntries(score.breakdown.boosts.filter(boost => boost.points > 0).map(boost => [boost.id, boost.points])),
					reasons: score.breakdown.reasons,
				} : {}),
			});
			const previous = snapshots[snapshots.length - 2];
			if (previous?.reasons) delete previous.reasons;
			powerScoreHistory.set(score.gameId, retainSnapshots(snapshots, now - getHistoryWindowMsForGame(game), prefs.keepFinalGames));
		});
	};

	const serializeScoreHistory = (): ScoreHistoryMap => Object.fromEntries(history);

	const serializePowerScoreHistory = (): PowerScoreHistoryMap => Object.fromEntries(powerScoreHistory);

	const persistHistoryToSession = () => {
		void browser.storage.session.set({
			scoreHistory: serializeScoreHistory(),
			powerScoreHistory: serializePowerScoreHistory(),
			scoreboardWinProbHistory: winProbTracker.serialize(),
		}).catch(err => {
			logWarn('Failed to persist score history to session storage.', err);
		});
	};

	const buildBackgroundState = () => ({
		games: games.map(liveExtras.withTimeouts),
		scores: currentScores,
		leagueLogos,
		scoreHistory: serializeScoreHistory(),
		powerScoreHistory: serializePowerScoreHistory(),
		gameBoosts,
		onStandbyStream,
		standbyStreamTabId,
		slateShedLeagues,
		leagueLastGoodAt,
		stuckSince,
		heldSwitch: heldSwitch && { gameId: heldSwitch.gameId, sport: heldSwitch.sport },
	});

	const broadcastScoresUpdated = () => {
		browser.runtime.sendMessage({ type: 'SCORES_UPDATED', ...buildBackgroundState() } satisfies ExtensionMessage).catch(() => {});
	};

	const getGameLabel = (gameId: string): string => {
		const game = games.find(g => g.id === gameId);
		return game ? `${game.awayTeam.abbreviation} ${i18n.t('gameCard.vs')} ${game.homeTeam.abbreviation}` : i18n.t('notification.unknownGame');
	};

	const getManagedTabIds = (): number[] => {
		const managedTabIds = tabRegistry.map(reg => reg.tabId);
		if (prefs.standbyStreamEnabled && standbyStreamTabId !== null) {
			managedTabIds.push(standbyStreamTabId);
		}
		const multiviewTabId = multiview.tabId();
		if (multiviewTabId !== null) managedTabIds.push(multiviewTabId);
		return [...new Set(managedTabIds)];
	};

	const bossMode = createBossMode({
		tabs: browser.tabs,
		windows: browser.windows,
		getDecoyUrl: () => prefs.bossDecoyUrl,
		pause: async () => {
			prefs = { ...prefs, enabled: false };
			setLastSwitchTime(0);
			clearPendingSwitch();
			const stored = await loadStoredUserPreferences().catch(() => prefs);
			await persistStoredUserPreferences({ ...stored, enabled: false });
		},
		muteManagedTabs: () => syncManagedTabMuteState(prefs.enabled),
		saveHushed: hushed => browser.storage.session.set({ [bossHushedKey]: hushed }),
	});

	const syncManagedTabMuteState = async (enabled: boolean, tabs?: tabSnapshot) => {
		if (enabled) await bossMode.release();
		const managedTabIds = getManagedTabIds();
		if (managedTabIds.length === 0 && mutedTabIds.size === 0) return;

		const allTabs = tabs?.allTabs ?? await browser.tabs.query({});
		const openTabIds = new Set(allTabs.flatMap(tab => tab.id === undefined ? [] : [tab.id]));
		const mutedNow = new Map(allTabs.flatMap(tab => tab.id === undefined ? [] : [[tab.id, tab.mutedInfo?.muted] as const]));

		const managedOpenTabIds = managedTabIds.filter(tabId => openTabIds.has(tabId));

		const releasedTabIds = [...mutedTabIds].filter(
			tabId => openTabIds.has(tabId) && !managedOpenTabIds.includes(tabId)
		);

		let watchedTabId: number | undefined;
		if (enabled && managedOpenTabIds.length > 0) {
			const activeTabId = tabs ? tabs.activeTabId : await getActiveTabId();
			if (activeTabId !== undefined && managedOpenTabIds.includes(activeTabId)) {
				watchedTabId = activeTabId;
			}
		}

		const nextMuteStates = new Map<number, boolean>();
		for (const tabId of releasedTabIds) nextMuteStates.set(tabId, false);
		for (const tabId of managedOpenTabIds) {
			nextMuteStates.set(tabId, enabled ? tabId !== watchedTabId : bossMode.isHushed());
		}

		const failedTabIds = new Set<number>();
		await Promise.all(
			[...nextMuteStates].map(async ([tabId, muted]) => {
				if (mutedNow.get(tabId) === muted) return;
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

	const clearHeldSwitch = () => {
		if (heldSwitchTimer) {
			clearTimeout(heldSwitchTimer);
			heldSwitchTimer = null;
		}
		if (!heldSwitch) return;
		heldSwitch = null;
		broadcastScoresUpdated();
	};

	let holdAnnounced = false;
	const withdrawHoldNotice = () => {
		if (!holdAnnounced) return;
		holdAnnounced = false;
		void browser.notifications.clear(switchNotificationId).catch(() => {});
	};

	const clearPendingSwitch = () => {
		withdrawHoldNotice();
		clearHeldSwitch();
		if (pendingSwitchTimer) {
			clearTimeout(pendingSwitchTimer);
			pendingSwitchTimer = null;
		}
		pendingSwitch = null;
	};

	const forgetClosedTab = async (tabId: number) => {
		if (await multiview.forget(tabId, Date.now())) await syncManagedTabMuteState(prefs.enabled);
		const hadRegistration = tabRegistry.some(reg => reg.tabId === tabId);
		const wasStandby = standbyStreamTabId === tabId;
		const wasMuted = mutedTabIds.delete(tabId);
		if (!hadRegistration && !wasStandby && !wasMuted) return;

		if (hadRegistration) tabRegistry = tabRegistry.filter(reg => reg.tabId !== tabId);
		if (wasStandby) {
			standbyStreamTabId = null;
			onStandbyStream = false;
		}
		if (pendingSwitch?.tabId === tabId || heldSwitch?.tabId === tabId) clearPendingSwitch();

		try {
			await browser.storage.session.set({ tabRegistry, standbyStreamTabId, mutedTabIds: [...mutedTabIds] });
		} catch (err) {
			logWarn('Failed to persist state after a tab closed.', err);
		}
		if (hadRegistration || wasStandby) broadcastScoresUpdated();
	};

	// MV3 tears the service worker down whenever it goes idle, so tabs close with no onRemoved
	// listener alive to hear it and the registry comes back from session storage still pointing
	// at them. Runs on every worker start, before the first switch evaluation.
	const reconcileClosedTabs = async () => {
		const openTabIds = await getOpenTabIds();
		if (openTabIds.size === 0) return;

		const trackedTabIds = new Set([
			...tabRegistry.map(reg => reg.tabId),
			...mutedTabIds,
			...(standbyStreamTabId !== null ? [standbyStreamTabId] : []),
			...(multiview.tabId() !== null ? [multiview.tabId()!] : []),
		]);
		for (const tabId of trackedTabIds) {
			if (!openTabIds.has(tabId)) await forgetClosedTab(tabId);
		}
	};

	const describeSwitchTarget = (gameId: string, reason?: string) => {
		const game = games.find(g => g.id === gameId);
		const score = game
			? `${game.awayTeam.abbreviation} ${game.awayTeam.score}–${game.homeTeam.score} ${game.homeTeam.abbreviation}`
			: getGameLabel(gameId);
		const locale = displayLocale();
		const current = currentScores.find(live => live.gameId === gameId && live.reason === reason);
		const spoken = reason ? speakReason({ reason, breakdown: current?.breakdown }, i18n.t, locale) : undefined;
		return { score, venue: game?.venueName, said: spoken ? capitalizeReason(spoken, locale) : undefined };
	};

	const announceHold = async ({ gameId, reason, sport }: HeldSwitch) => {
		if (!prefs.notificationsEnabled) return;
		const { score, said } = describeSwitchTarget(gameId, reason);
		const waiting = i18n.t(`notification.heldFor.${sport}`);
		holdAnnounced = true;
		await browser.notifications.create(switchNotificationId, {
			type: 'basic',
			iconUrl: 'icon/128.png',
			title: i18n.t('notification.heldTitle', { score }),
			message: said ? i18n.t('notification.heldWithReason', { reason: said, held: waiting }) : waiting,
		});
	};

	const landOnTab = async (tabId: number): Promise<boolean> => {
		if (await getActiveTabId() === tabId) return false;

		const [allTabs, watchedWindow] = await Promise.all([browser.tabs.query({}), browser.windows.getLastFocused()]);
		const targetTab = allTabs.find(tab => tab.id === tabId);
		if (!targetTab || !prefs.enabled) return false;

		try {
			await browser.tabs.update(tabId, { active: true });
		} catch (err) {
			logWarn(`Failed to switch to tab ${tabId}.`, err);
			return false;
		}
		if (targetTab.windowId !== undefined) {
			try {
				await bringWindowForward(targetTab.windowId, watchedWindow);
			} catch (err) {
				logWarn(`Failed to bring the window for tab ${tabId} forward.`, err);
			}
		}
		return true;
	};

	const executeSwitch = async (tabId: number, gameId?: string, reason?: string, waitedFor?: PlayBreakSport): Promise<boolean> => {
		const leavingTabId = gameId && prefs.notificationsEnabled ? await getActiveTabId() : undefined;
		const delayedLeft = gameId && leavingTabId !== undefined
			? findDelayedGameLeft(games, tabRegistry.find(reg => reg.tabId === leavingTabId)?.gameId, gameId)
			: undefined;
		if (!await landOnTab(tabId)) return false;
		if (gameId) setLastSwitchTime(Date.now());
		await syncManagedTabMuteState(prefs.enabled);
		if (gameId) await recordSuccessfulSwitchForReviewPrompt(lastSwitchTime);

		if (prefs.notificationsEnabled) {
			holdAnnounced = false;
			if (!gameId) {
				await browser.notifications.create(switchNotificationId, {
					type: 'basic',
					iconUrl: 'icon/128.png',
					title: i18n.t('notification.standbyTitle'),
					message: i18n.t('notification.standbyMessage'),
				});
			} else {
				const { score: scoreTitle, venue, said } = describeSwitchTarget(gameId, reason);
				const switched = venue
					? (said ? i18n.t('notification.switchedMessageWithReason', { reason: said, venue }) : i18n.t('notification.switchedMessage', { venue }))
					: (said ? i18n.t('notification.switchedMessageWithReasonNoVenue', { reason: said }) : i18n.t('notification.switchedMessageNoVenue'));
				const lead = delayedLeft
					? describeDelayLeft(delayedLeft, i18n.t)
					: waitedFor ? i18n.t(`notification.waitedFor.${waitedFor}`) : undefined;
				const message = lead ? i18n.t('notification.afterBreak', { waited: lead, message: switched }) : switched;

				await browser.notifications.create(switchNotificationId, {
					type: 'basic',
					iconUrl: 'icon/128.png',
					title: i18n.t('notification.switchedTitle', { score: scoreTitle }),
					message,
				});
			}
		}
		return true;
	};

	const multiview = createMultiview({
		createTab: async ({ url, windowId, index }) => (
			await browser.tabs.create({ url: browser.runtime.getURL(url as '/multiview.html'), active: false, windowId, index })
		).id,
		moveTab: async (tabId, { windowId, index }) => {
			await browser.tabs.move(tabId, { windowId, index: index ?? -1 });
		},
		removeTab: tabId => browser.tabs.remove(tabId),
		allowFrames: async tabId => {
			await browser.declarativeNetRequest.updateSessionRules({
				removeRuleIds: [tabId],
				addRules: [{
					id: tabId,
					priority: 1,
					action: {
						type: 'modifyHeaders' as Browser.declarativeNetRequest.RuleActionType,
						responseHeaders: [
							{ header: 'x-frame-options', operation: 'remove' as Browser.declarativeNetRequest.HeaderOperation },
							{ header: 'content-security-policy', operation: 'remove' as Browser.declarativeNetRequest.HeaderOperation },
						],
					},
					condition: { tabIds: [tabId], resourceTypes: ['sub_frame' as Browser.declarativeNetRequest.ResourceType] },
				}],
			});
			const registered = await browser.scripting.getRegisteredContentScripts({ ids: [multiviewFrameScriptId] });
			if (registered.length > 0) return;
			await browser.scripting.registerContentScripts([{
				id: multiviewFrameScriptId,
				js: [multiviewFrameScriptPath.slice(1)],
				matches: ['<all_urls>'],
				allFrames: true,
				matchOriginAsFallback: true,
				runAt: 'document_start',
				persistAcrossSessions: false,
			}]);
		},
		forbidFrames: async tabId => {
			await browser.declarativeNetRequest.updateSessionRules({ removeRuleIds: [tabId] });
			await browser.scripting.unregisterContentScripts({ ids: [multiviewFrameScriptId] }).catch(() => {});
		},
		broadcast: lineup => {
			const tabId = multiview.tabId();
			if (tabId === null) return;
			browser.runtime.sendMessage({ type: 'MULTIVIEW_UPDATED', tabId, ...lineup } satisfies ExtensionMessage).catch(() => {});
		},
		reveal: async (tabId, lineup) => {
			if (!await landOnTab(tabId)) return false;
			setLastSwitchTime(Date.now());
			await syncManagedTabMuteState(prefs.enabled);
			if (prefs.notificationsEnabled) {
				holdAnnounced = false;
				await browser.notifications.create(switchNotificationId, {
					type: 'basic',
					iconUrl: 'icon/128.png',
					title: i18n.t('notification.multiviewTitle'),
					message: lineup.boxes.map(box => getGameLabel(box.gameId)).join(' · '),
				});
			}
			return true;
		},
		leaveTo: (tabId, gameId) => executeSwitch(tabId, gameId, currentScores.find(score => score.gameId === gameId)?.reason),
		save: stored => browser.storage.session.set({ [multiviewStateKey]: stored }),
	});

	const multiviewReady = async (): Promise<boolean> => {
		if (!prefs.multiviewEnabled || !prefs.enabled) return false;
		if (!isMultiviewBuild(browser.runtime.getManifest())) return false;
		return browser.permissions.contains(multiviewPermissions).catch(() => false);
	};

	const runMultiview = async (pass: switchPass, activeTabId: number, openTabIds: Set<number>): Promise<multiviewOutcome> => {
		if (!await multiviewReady()) {
			if (multiview.tabId() !== null) await multiview.stop();
			return { active: false, settled: false };
		}
		const tabsById = new Map((pass.tabs?.allTabs ?? []).flatMap(tab => tab.id === undefined ? [] : [[tab.id, tab] as const]));
		const watched = tabsById.get(activeTabId);
		const outcome = await multiview.update({
			candidates: tabRegistry
				.filter(reg => openTabIds.has(reg.tabId))
				.map(reg => ({ ...reg, url: tabsById.get(reg.tabId)?.url })),
			scores: pass.scores,
			games: pass.liveGames,
			prefs,
			activeTabId,
			besideTab: watched && watched.id !== multiview.tabId() ? { windowId: watched.windowId, index: watched.index } : undefined,
			lastSwitchTime,
			now: pass.now,
		});
		const openedTabId = multiview.tabId();
		if (!outcome.settled && openedTabId !== null && !tabsById.has(openedTabId)) {
			await syncManagedTabMuteState(prefs.enabled);
			return { ...outcome, settled: outcome.active };
		}
		return outcome;
	};

	const resolveSwitchTarget = (openTabIds: Set<number>, activeTabId: number) => chooseSwitchTarget({
		registry: tabRegistry.filter(reg => openTabIds.has(reg.tabId)),
		scores: switchableScores(currentScores),
		activeTabId,
		sensitivity: prefs.sensitivity,
		cooldownSeconds: prefs.cooldownSeconds,
		lastSwitchTime,
		now: Date.now(),
	});

	const runPendingSwitch = async () => {
		const queuedSwitch = pendingSwitch;
		pendingSwitchTimer = null;
		pendingSwitch = null;
		if (!queuedSwitch || !prefs.enabled) return;

		const activeTabId = await getActiveTabId();
		if (activeTabId === undefined) return;

		const openTabIds = await getOpenTabIds();

		if (prefs.standbyStreamEnabled && usableStandbyTabId(standbyStreamTabId, openTabIds, tabRegistry) !== null) {
			const registeredGameIds = new Set(
				tabRegistry.filter(reg => openTabIds.has(reg.tabId)).map(reg => reg.gameId)
			);
			const registeredScores = switchableScores(currentScores).filter(s => registeredGameIds.has(s.gameId));
			if (registeredScores.length > 0 && registeredScores.every(s => s.total < prefs.standbyStreamThreshold)) return;
		}

		const target = resolveSwitchTarget(openTabIds, activeTabId);
		if (!target) return;

		await executeSwitch(target.tabId, target.gameId, target.reason, queuedSwitch.waitedFor);
	};

	const executePendingSwitch = async () => {
		try {
			await runPendingSwitch();
		} finally {
			withdrawHoldNotice();
		}
	};

	const queuePendingSwitch = (gameId: string, tabId: number, reason?: string, waitedFor?: PlayBreakSport) => {
		if (pendingSwitchTimer || pendingSwitch) return;

		pendingSwitch = { gameId, tabId, reason, waitedFor };
		pendingSwitchTimer = setTimeout(() => {
			executePendingSwitch().catch(err => logWarn('The queued switch hit a snag.', err));
		}, prefs.switchDelaySeconds * 1000);
	};

	const releaseHeldSwitch = (waitedFor?: PlayBreakSport) => {
		const held = heldSwitch;
		clearHeldSwitch();
		if (held) queuePendingSwitch(held.gameId, held.tabId, held.reason, waitedFor);
	};

	const collegeDirectories: Partial<Record<CollegeLeagueId, ConferenceDirectory>> = {};

	const favoriteTeamIdsIn = (leagueId: LeagueId): string[] => prefs.favoriteTeamIds
		.map(parseFavoriteTeamKey)
		.filter((key): key is NonNullable<typeof key> => key?.leagueId === leagueId)
		.map(key => key.teamId);

	const collegeFetchKey = (): string => JSON.stringify([
		prefs.collegeFilters,
		prefs.favoriteTeamIds.filter(key => isCollegeLeagueId(parseFavoriteTeamKey(key)?.leagueId)),
	]);

	const warmCollegeDirectories = async (): Promise<void> => {
		const needed = prefs.enabledLeagues.filter(isCollegeLeagueId).filter(leagueId => needsConferenceDirectory(
			leagueId,
			resolveCollegeFilter(prefs.collegeFilters, leagueId),
			favoriteTeamIdsIn(leagueId).length > 0,
		));
		await Promise.all(needed.map(async leagueId => {
			try {
				collegeDirectories[leagueId] = await loadConferenceDirectory(leagueId);
			} catch (err) {
				logWarn(`Could not load the ${leagueId} conference list.`, err);
			}
		}));
	};

	const keepCollegeGames = (list: Game[]): Game[] => {
		const favoriteTeamIds = new Set(prefs.favoriteTeamIds);
		return filterCollegeGames(list, prefs.collegeFilters, collegeDirectories, game => isFavoriteTeamGame(game, favoriteTeamIds));
	};

	const collegeGroupsFor = (leagueId: LeagueId): string[] => (
		isCollegeLeagueId(leagueId)
			? collegeFetchGroups(leagueId, resolveCollegeFilter(prefs.collegeFilters, leagueId), collegeDirectories[leagueId], favoriteTeamIdsIn(leagueId))
			: []
	);

	const fetchFilteredGames = async (leagues: LeagueId[], options: Parameters<typeof fetchGamesWithLeagueLogos>[1]) => {
		const groupsByLeague = Object.fromEntries(leagues.filter(isCollegeLeagueId).map(leagueId => [leagueId, collegeGroupsFor(leagueId)]));
		const result = await fetchGamesWithLeagueLogos(leagues, { ...options, groupsByLeague });
		return { ...result, games: await crestColors.paint(keepCollegeGames(result.games)) };
	};

	const refreshSlate = async () => {
		slateFetchedAt = Date.now();
		if (!prefs.showUpcomingGames && !prefs.keepFinalGames) {
			upcomingGames = [];
			retainedFinalGames = [];
			return;
		}
		try {
			const result = await fetchFilteredGames(prefs.enabledLeagues, {
				includeUpcoming: true,
				upcomingDays: prefs.upcomingGamesDays,
				includeFinal: prefs.keepFinalGames,
			});
			if (prefs.enabledLeagues.length > 0 && result.shedLeagues.length === prefs.enabledLeagues.length) {
				logWarn(`ESPN shed the whole slate (${result.shedLeagues.length} leagues); keeping what we have.`);
				return;
			}
			const heldFor = (list: Game[]): Game[] => keepRefusedLeagues(list, result.shedLeagues);

			upcomingGames = prefs.showUpcomingGames
				? [...heldFor(upcomingGames).filter(g => !hasMissedItsWindow(g)), ...result.games.filter(g => g.status === 'pre')]
				: [];
			retainedFinalGames = prefs.keepFinalGames
				? [
					...heldFor(retainedFinalGames).filter(game => isWithinFinalRetention(game)),
					...result.games.filter(g => g.status === 'post'),
				]
				: [];
		} catch (err) {
			logWarn('Failed to fetch the slate.', err);
		}
	};

	const refreshStaleSlate = async () => {
		if (Date.now() - slateFetchedAt < slateRefreshMs) return;
		await refreshSlate();
		const live = games.filter(g => g.status === 'in');
		games = [...live, ...slateBeside(live, [...upcomingGames, ...liveRetainedFinals()])];
	};

	const holdGuideSlate = (outcome: guideSlateOutcome) => {
		guideSlateRefused = outcome.refused;
		if (!outcome.write) {
			guideRetryAfter = Date.now() + outcome.holdMs;
			return;
		}
		guideSlate = outcome.games;
		guideSlateAt = Date.now();
		guideSlateHoldMs = outcome.holdMs;
		guideRetryAfter = 0;
	};

	const fetchGuideSlate = async (): Promise<GuideSlate> => {
		try {
			const result = await fetchFilteredGames(prefs.enabledLeagues, {
				includeUpcoming: true,
				upcomingDays: Math.max(prefs.upcomingGamesDays, guideMinUpcomingDays),
				includeFinal: true,
			});
			const outcome = resolveGuideSlate(guideSlate, result.games, prefs.enabledLeagues, result.shedLeagues);
			holdGuideSlate(outcome);
			noteGameEnds(result.games);
			void fillMissingDurations(result.games);
			return {
				games: outcome.games,
				refused: outcome.refused,
				leagueLogos: result.leagueLogos,
				monoLogos: await ensureMonoLogos(prefs.enabledLeagues),
				gameBoosts,
				endTimes: gameEndTimes(endRecords),
			};
		} catch (err) {
			logWarn('Failed to fetch the guide slate.', err);
			const outcome = resolveGuideSlateFailure(guideSlate);
			holdGuideSlate(outcome);
			return { games: outcome.games, refused: outcome.refused, leagueLogos, monoLogos, gameBoosts, endTimes: gameEndTimes(endRecords) };
		}
	};

	const mergeGuideSlate = (fresh: Game[]) => {
		if (guideSlateAt === 0) return;
		const freshIds = new Set(fresh.map(g => g.id));
		guideSlate = [...guideSlate.filter(g => !freshIds.has(g.id) && !hasMissedItsWindow(g)), ...fresh];
	};

	const liveRetainedFinals = (): Game[] => (
		prefs.keepFinalGames ? retainedFinalGames.filter(g => isWithinFinalRetention(g)) : []
	);

	const pollFetchOptions = { includeUpcoming: false, includeFinal: true } as const;

	const displayableGames = (fetched: Game[]): Game[] => (
		prefs.keepFinalGames ? fetched : fetched.filter(game => game.status !== 'post')
	);

	const settleFinishedTabs = async (finishedGames: Game[], tabs: tabSnapshot) => {
		if (prefs.finishedTabAction === 'keep' || demoMode) return;
		const finishedGameIds = new Set(finishedGames.map(game => game.id));
		if (!tabRegistry.some(reg => finishedGameIds.has(reg.gameId))) return;

		const resolutions = resolveFinishedTabs({
			registry: tabRegistry,
			action: prefs.finishedTabAction,
			finishedGameIds,
			openTabIds: tabIdsOf(tabs),
			activeTabIds: activeTabIdsOf(tabs),
			...describeOpenWindows(tabs.allTabs),
		});
		if (resolutions.length === 0) return;

		const releasedTabIds = new Set(resolutions.map(resolution => resolution.tabId));
		tabRegistry = tabRegistry.filter(reg => !releasedTabIds.has(reg.tabId));
		if ((pendingSwitch && releasedTabIds.has(pendingSwitch.tabId)) || (heldSwitch && releasedTabIds.has(heldSwitch.tabId))) clearPendingSwitch();

		let closed = 0;
		for (const resolution of resolutions.filter(entry => entry.close)) {
			try {
				await browser.tabs.remove(resolution.tabId);
				closed++;
			} catch (err) {
				logWarn(`Failed to close tab ${resolution.tabId} after its game finished.`, err);
			}
		}

		try {
			await browser.storage.session.set({ tabRegistry });
		} catch (err) {
			logWarn('Failed to persist the registry after handing tabs back.', err);
		}
		await recordFinishedTabNotice(resolutions.length - closed, closed);
	};

	const absorbFinalGames = (fresh: Game[]) => {
		if (!prefs.keepFinalGames) return;
		const byId = new Map(retainedFinalGames.map(game => [game.id, game]));
		fresh.filter(game => game.status === 'post').forEach(game => byId.set(game.id, game));
		retainedFinalGames = [...byId.values()].filter(game => isWithinFinalRetention(game));
	};

	const afterFetch = async (changedLeagueId: LeagueId | null, allowTabSwitch: boolean, finishedGames: Game[] = [], observed = true) => {
		const liveGames = games.filter(g => g.status === 'in');
		const freshGames = !observed ? [] : changedLeagueId ? liveGames.filter(g => g.league === changedLeagueId) : liveGames;

		const favoriteTeamIds = new Set(prefs.favoriteTeamIds);
		const now = Date.now();
		for (const game of freshGames) {
			commercialBreaks.set(game.id, nextCommercialBreak(game, commercialBreaks.get(game.id), { now, powerPlay: liveExtras.contextFor(game, now).powerPlay }));
		}
		const liveIds = new Set(liveGames.map(g => g.id));
		for (const gameId of commercialBreaks.keys()) if (!liveIds.has(gameId)) commercialBreaks.delete(gameId);

		liveExtras.setFantasyScoring(prefs.fantasyScoring);
		winProbTracker.record(freshGames);
		const scores = liveGames.map(g => toLiveScore(scoreLiveGame(
			{
				game: g,
				history: history.get(g.id) ?? [],
				onBreak: commercialBreaks.get(g.id)?.kind !== undefined,
				winProbability: winProbTracker.historyOf(g.id) ?? winProbHistory.get(g.id) ?? [],
				now,
				extras: liveExtras.contextFor(g, now),
			},
			prefs,
			gameBoosts[g.id] ?? 0,
			favoriteTeamIds,
		)));
		currentScores = scores;
		gameProgress = trackProgress(gameProgress, liveGames, now);
		stuckSince = stuckSinceOf(liveGames, gameProgress, now);
		updateHistory(freshGames);
		updatePowerScoreHistory(liveGames, scores, changedLeagueId);
		const pruned = pruneStaleHistory(now);

		const tabs = getManagedTabIds().length > 0 || mutedTabIds.size > 0 ? await readTabs() : undefined;
		if (tabs) await settleFinishedTabs(finishedGames, tabs);
		const switched = await evaluateSwitch({ liveGames, scores: switchableScores(scores), freshGames, now, allowTabSwitch, tabs });

		if (changedLeagueId === null || freshGames.length > 0 || pruned) persistHistoryToSession();
		broadcastScoresUpdated();
		if (!switched) await syncManagedTabMuteState(prefs.enabled, tabs);
	};

	interface switchPass {
		liveGames: Game[];
		scores: LiveScore[];
		freshGames: Game[];
		now: number;
		allowTabSwitch: boolean;
		tabs: tabSnapshot | undefined;
	}

	const evaluateSwitch = async (pass: switchPass): Promise<boolean> => {
		const { liveGames, scores, freshGames, now, allowTabSwitch, tabs } = pass;
		if (!allowTabSwitch || !prefs.enabled || liveGames.length === 0) {
			if (!prefs.enabled || liveGames.length === 0) {
				clearPendingSwitch();
				if (multiview.tabId() !== null) await multiview.stop();
			}
			return false;
		}

		if (!tabs || tabs.activeTabId === undefined) return false;
		const activeTabId = tabs.activeTabId;

		const openTabIds = tabIdsOf(tabs);
		const liveRegistry = tabRegistry.filter(reg => openTabIds.has(reg.tabId));
		const registeredGameIds = new Set(liveRegistry.map(reg => reg.gameId));
		const registeredScores = scores.filter(s => registeredGameIds.has(s.gameId));
		if (registeredScores.length === 0) {
			if (multiview.tabId() !== null) await multiview.stop();
			return false;
		}

		const multiviewResult = await runMultiview(pass, activeTabId, openTabIds);
		if (multiviewResult.active || multiviewResult.settled) {
			clearPendingSwitch();
			return multiviewResult.settled;
		}

		const usableStandbyId = usableStandbyTabId(standbyStreamTabId, openTabIds, tabRegistry);
		if (usableStandbyId === null) onStandbyStream = false;
		const standbyDecision = computeStandbyStreamDecision({
			standbyStreamEnabled: prefs.standbyStreamEnabled,
			standbyStreamTabId: usableStandbyId,
			standbyStreamThreshold: prefs.standbyStreamThreshold,
			registeredScores,
			onStandbyStream,
			activeTabIsStandby: usableStandbyId !== null && activeTabId === usableStandbyId,
		});

		if (standbyDecision === 'switchToStandby') {
			clearPendingSwitch();
			const inCooldown = prefs.cooldownSeconds > 0 && Date.now() - lastSwitchTime <= prefs.cooldownSeconds * 1000;
			if (inCooldown) return false;
			onStandbyStream = true;
			return executeSwitch(usableStandbyId!);
		}
		if (standbyDecision === 'stayOnStandby') {
			clearPendingSwitch();
			return false;
		}
		if (standbyDecision === 'resume') onStandbyStream = false;

		const watchedGameId = liveRegistry.find(reg => reg.tabId === activeTabId)?.gameId;
		if (heldSwitch) {
			const verdict = checkHeldSwitch(heldSwitch, liveGames.find(g => g.id === heldSwitch!.leavingGameId), commercialBreaks.get(heldSwitch.leavingGameId), {
				now,
				observed: freshGames.some(g => g.id === heldSwitch!.leavingGameId),
				watching: watchedGameId === heldSwitch.leavingGameId,
				arriving: liveGames.find(g => g.id === heldSwitch!.gameId),
			});
			if (verdict.release) releaseHeldSwitch(verdict.waitedFor);
			else heldSwitch = verdict.held;
			return false;
		}
		if (pendingSwitch) return false;

		const target = resolveSwitchTarget(openTabIds, activeTabId);
		if (!target) return false;

		const leaving = prefs.contentAwareSwitching && !demoMode ? liveGames.find(g => g.id === watchedGameId) : undefined;
		const held = leaving ? holdSwitch(target, leaving, commercialBreaks.get(leaving.id), now, liveGames.find(g => g.id === target.gameId)) : null;
		if (held) {
			heldSwitch = held;
			heldSwitchTimer = setTimeout(() => releaseHeldSwitch(), held.holdUntil - now);
			await announceHold(held);
			return false;
		}

		if (prefs.switchDelaySeconds > 0) {
			queuePendingSwitch(target.gameId, target.tabId, target.reason);
			return false;
		}
		return executeSwitch(target.tabId, target.gameId, target.reason);
	};

	const tick = async (allowTabSwitch = true) => {
		const enabledLeagues = prefs.enabledLeagues;
		let finishedGames: Game[] = [];
		if (demoMode && simulator) {
			games = simulator.tick();
			finishedGames = games.filter(g => g.status === 'post');
			const demoLeagues = [...new Set(games.map(game => game.league))];
			leagueLogos = demoLeagues.reduce<LeagueLogoMap>((acc, leagueId) => {
				acc[leagueId] = resolveLeagueLogoUrl(leagueId);
				return acc;
			}, {});
		} else {
			await refreshStaleSlate();
			let fetched: Game[];
			try {
				const fetchResult = await fetchFilteredGames(enabledLeagues, pollFetchOptions);
				if (enabledLeagues.length > 0 && fetchResult.shedLeagues.length === enabledLeagues.length) {
					logError(`ESPN shed all ${enabledLeagues.length} leagues; keeping the previous games.`);
					slateShedLeagues = fetchResult.shedLeagues;
					return;
				}
				slateShedLeagues = fetchResult.shedLeagues;
				for (const id of enabledLeagues) if (!slateShedLeagues.includes(id)) leagueLastGoodAt[id] = Date.now();
				fetched = fetchResult.games;
				leagueLogos = fetchResult.leagueLogos;
			} catch (err) {
				logError('Failed to fetch games.', err);
				return;
			}
			absorbFinalGames(fetched);
			noteGameEnds(fetched);
			mergeGuideSlate(fetched);
			finishedGames = fetched.filter(g => g.status === 'post');
			const heldLive = games.filter(g => slateShedLeagues.includes(g.league) && g.status === 'in');
			games = displayableGames(fetched);
			games = [...games, ...heldLive, ...slateBeside([...fetched, ...heldLive], [...upcomingGames, ...liveRetainedFinals()])];
		}

		await afterFetch(null, allowTabSwitch, finishedGames);
	};

	const tickLeague = async (leagueId: LeagueId, allowTabSwitch: boolean) => {
		let fetchSucceeded = false;
		let finishedGames: Game[] = [];
		await refreshStaleSlate();
		try {
			const fetchResult = await fetchFilteredGames([leagueId], pollFetchOptions);
			if (!prefs.enabledLeagues.includes(leagueId)) return;
			if (fetchResult.shedLeagues.length > 0) throw new Error(`ESPN shed the ${leagueId} scoreboard.`);
			absorbFinalGames(fetchResult.games);
			noteGameEnds(fetchResult.games);
			mergeGuideSlate(fetchResult.games);
			finishedGames = fetchResult.games.filter(g => g.status === 'post');
			const freshGameIds = new Set(fetchResult.games.map(g => g.id));
			const otherGames = games.filter(g => g.league !== leagueId && g.status !== 'post');
			const leagueUpcoming = upcomingGames.filter(g => g.league === leagueId && !freshGameIds.has(g.id) && !hasMissedItsWindow(g));
			const retainedFinals = liveRetainedFinals().filter(g => !freshGameIds.has(g.id));
			games = [...otherGames, ...displayableGames(fetchResult.games), ...leagueUpcoming, ...retainedFinals];
			leagueLogos = { ...leagueLogos, ...fetchResult.leagueLogos };
			const hasLiveGames = fetchResult.games.some(g => g.status === 'in');
			const nextStartMs = earliestUpcomingStartMs(games.filter(g => g.league === leagueId));
			pollModeTracker.recordPollResult(leagueId, hasLiveGames, nextStartMs);
			leagueLastGoodAt[leagueId] = Date.now();
			fetchSucceeded = true;
		} catch (err) {
			logWarn(`Failed to fetch ${leagueId} games.`, err);
		}

		if (!prefs.enabledLeagues.includes(leagueId)) return;

		slateShedLeagues = fetchSucceeded
			? slateShedLeagues.filter(id => id !== leagueId)
			: [...new Set([...slateShedLeagues, leagueId])];

		if (!demoMode && prefs.enabledLeagues.includes(leagueId)) {
			if (fetchSucceeded && pollModeTracker.needsLookahead(leagueId)) {
				try {
					pollModeTracker.recordLookahead(leagueId, await fetchNextScheduledStart(leagueId, { groups: collegeGroupsFor(leagueId) }));
				} catch (err) {
					logWarn(`Failed to look ahead for ${leagueId}.`, err);
				}
			}

			const mode = pollModeTracker.getMode(leagueId);
			let nextInterval: number;
			const liveLeagueGames = games.filter(g => g.league === leagueId && g.status === 'in');
			const liveInHand = mode === 'eager' && liveLeagueGames.length > 0;
			if (mode === 'hebetudinous') {
				nextInterval = computeHebetudinousIntervalMs(pollModeTracker.getNextStartMs(leagueId) ?? null);
			} else if (mode === 'dormant' || (!fetchSucceeded && !liveInHand)) {
				nextInterval = pollDormantMinMs + randomInRange(0, pollDormantMaxMs - pollDormantMinMs);
			} else {
				const refreshMs = scoreboardRefreshMs(leagueId);
				const base = computeLeagueIntervalMs(liveLeagueGames, currentScores, refreshMs);
				nextInterval = jitteredBeatMs(base, refreshMs);
			}
			if (fetchSucceeded) {
				leagueFailureCounts.delete(leagueId);
				leagueHealthyIntervalMs.set(leagueId, nextInterval);
			} else {
				const failures = (leagueFailureCounts.get(leagueId) ?? 0) + 1;
				leagueFailureCounts.set(leagueId, failures);
				const retryCeilingMs = liveInHand ? nextInterval : Math.max(nextInterval, leagueHealthyIntervalMs.get(leagueId) ?? 0);
				nextInterval = computeRetryDelayMs(failures, retryCeilingMs, randomInRange(-retryJitterMs, retryJitterMs));
			}
			if (fetchSucceeded && mode !== 'eager') {
				const kickoff = kickoffDelayMs(games.filter(g => g.league === leagueId), Date.now());
				if (kickoff !== null) nextInterval = Math.min(nextInterval, Math.max(kickoff, 1_000));
			}
			leagueNextIntervalMs.set(leagueId, nextInterval);
			const nextStartMs = pollModeTracker.getNextStartMs(leagueId);
			const wakeAt = mode !== 'hebetudinous' ? Date.now() + nextInterval : typeof nextStartMs === 'number' ? nextStartMs - pollHebetudinousHorizonMs : null;
			scheduleLeagueTick(leagueId, nextInterval, wakeAt);
		}

		await refreshSituations(games.filter(g => g.league === leagueId && g.status === 'in'));
		await afterFetch(leagueId, allowTabSwitch, finishedGames);
	};

	const scheduleLeagueTick = (leagueId: LeagueId, delayMs: number, wakeAt: number | null = Date.now() + delayMs) => {
		const existing = leagueTimers.get(leagueId);
		if (existing !== undefined) clearTimeout(existing);
		leagueTimers.set(leagueId, setTimeout(() => {
			leagueWakeAt.delete(leagueId);
			tickLeague(leagueId, true).catch(err => logWarn(`The ${leagueId} poll hit a snag.`, err));
		}, delayMs));
		if (wakeAt === null) leagueWakeAt.delete(leagueId);
		else leagueWakeAt.set(leagueId, wakeAt);
		refreshKeepAwake();
	};

	const stopLeaguePolling = () => {
		for (const timer of leagueTimers.values()) clearTimeout(timer);
		leagueTimers.clear();
		leagueWakeAt.clear();
		refreshKeepAwake();
	};

	const startLeaguePolling = () => {
		stopLeaguePolling();
		pollModeTracker.reset();
		leagueFailureCounts.clear();
		leagueHealthyIntervalMs.clear();
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

	const refreshSituations = async (leagueGames: Game[]): Promise<void> => {
		if (demoMode) return;
		const blowoutMargin = routMargin('hockey') ?? 3;
		const wanted = leagueGames.filter(game => !isPlayFrozen(game) && (
			(game.sportType === 'basketball' && (game.lastPlayId === undefined || situationPlayIds.get(game.id) !== game.lastPlayId))
			|| (game.league === 'nhl' && Math.abs(game.homeTeam.score - game.awayTeam.score) <= blowoutMargin)));
		if (wanted.length === 0) return;
		const replies = Promise.all(wanted.map(game => fetchCompetitionSituation(game)
			.then(situation => {
				liveExtras.ingestSituation(game.id, situation);
				if (game.lastPlayId !== undefined) situationPlayIds.set(game.id, game.lastPlayId);
			})
			.catch((err: unknown) => logWarn(`Failed to fetch the situation for ${game.id}.`, err))));
		let giveUp: ReturnType<typeof setTimeout> | undefined;
		await Promise.race([replies, new Promise<void>(resolve => { giveUp = setTimeout(resolve, situationWaitMs); })]);
		clearTimeout(giveUp);
	};

	const refreshStandings = (liveGames: Game[]) => {
		const now = Date.now();
		const leagues = new Set(liveGames.filter(game => !game.isPostseason).map(game => game.league).filter(hasStandingsRaces));
		for (const league of leagues) {
			if (now - (standingsFetchedAt.get(league) ?? 0) < standingsRefreshMs) continue;
			standingsFetchedAt.set(league, now);
			fetchLeagueStandings(league)
				.then(standings => liveExtras.ingestStandings(league, leagueConfigMap[league].sportType, standings))
				.catch((err: unknown) => logWarn(`Failed to fetch ${league} standings.`, err));
		}
	};

	const summaryDue = (game: Game, now: number): boolean => {
		const blowout = Math.abs(game.homeTeam.score - game.awayTeam.score) > (routMargin(game.sportType) ?? Infinity);
		return !blowout || liveExtras.hasRosteredPlayer(game) || now - (summaryFetchedAt.get(game.id) ?? 0) >= blowoutSummaryIntervalMs;
	};

	const summaryMoved = (game: Game): boolean => game.lastPlayId === undefined || summaryPlayIds.get(game.id) !== game.lastPlayId;

	const refreshWinProbabilities = async (): Promise<void> => {
		const liveGames = games.filter(g => g.status === 'in');

		const liveIds = new Set(liveGames.map(g => g.id));
		for (const gameId of winProbHistory.keys()) {
			if (!liveIds.has(gameId)) winProbHistory.delete(gameId);
		}
		for (const playIds of [situationPlayIds, summaryPlayIds]) {
			for (const gameId of playIds.keys()) if (!liveIds.has(gameId)) playIds.delete(gameId);
		}
		if (games.length > 0) winProbTracker.retainOnly(liveIds);
		for (const gameId of summaryFetchedAt.keys()) {
			if (liveIds.has(gameId)) continue;
			summaryFetchedAt.delete(gameId);
			liveExtras.forget(gameId);
		}

		if (liveGames.length === 0) return;
		refreshStandings(liveGames);
		liveExtras.setRoster(await loadFantasyRoster().catch(() => []));

		const now = Date.now();
		const summaryNeeded = (game: Game) => summaryStillNeeded(game, {
			hasScoreboardReadings: winProbTracker.historyOf(game.id) !== undefined && game.homeWinProbability !== undefined,
			hasSummaryLine: winProbHistory.has(game.id),
			hasRosteredPlayer: liveExtras.hasRosteredPlayer(game),
		});
		await Promise.all(liveGames.filter(game => summaryNeeded(game) && summaryDue(game, now) && summaryMoved(game)).map(async game => {
			summaryFetchedAt.set(game.id, now);
			try {
				const line = await fetchWinProbability(game, { onSummary: summary => liveExtras.ingestSummary(game, summary, Date.now()) });
				if (line.length > 0) {
					if (game.lastPlayId !== undefined) summaryPlayIds.set(game.id, game.lastPlayId);
					winProbHistory.set(game.id, line);
					winProbTracker.adopt(game.id, line);
				}
			} catch (err) {
				logWarn(`Failed to fetch win probability for ${game.id}.`, err);
			}
		}));
	};

	let winProbSweep: Promise<void> | null = null;
	const sweepWinProbabilities = (): Promise<void> => {
		winProbSweep ??= refreshWinProbabilities().finally(() => { winProbSweep = null; });
		return winProbSweep;
	};

	const stopWinProbabilityPolling = () => {
		winProbGeneration++;
		if (winProbTimer !== null) clearTimeout(winProbTimer);
		winProbTimer = null;
	};

	const scheduleWinProbabilityPolling = () => {
		stopWinProbabilityPolling();
		const generation = winProbGeneration;
		const run = async () => {
			await sweepWinProbabilities();
			if (generation !== winProbGeneration) return;
			winProbTimer = setTimeout(() => void run(), winProbPollIntervalMs);
		};
		winProbTimer = setTimeout(() => void run(), winProbPollIntervalMs);
	};

	const stateReady = followSyncedProfile().catch(() => {}).then(() => Promise.all([
		loadStoredUserPreferences(),
		browser.storage.session.get({ tabRegistry: [], standbyStreamTabId: null, lastSwitchTime: 0, [bossHushedKey]: false, [multiviewStateKey]: null, ...historyStorageDefaults }),
		browser.storage.local.get({ demoMode: false, [gameEndTimesKey]: {} }),
		loadFantasyRoster().catch(() => []),
	])).then(([storedPrefs, sessionResult, demoResult, roster]) => {
		prefs = storedPrefs;
		liveExtras.setRoster(roster);
		tabRegistry = sessionResult.tabRegistry as TabRegistration[];
		standbyStreamTabId = (sessionResult.standbyStreamTabId as number | null) ?? null;
		lastSwitchTime = readStoredSwitchTime(sessionResult.lastSwitchTime, Date.now());
		bossMode.restore(sessionResult[bossHushedKey]);
		multiview.restore(sessionResult[multiviewStateKey]);
		gameBoosts = normalizeGameBoosts(sessionResult.gameBoosts);
		if (Array.isArray(sessionResult.mutedTabIds)) {
			for (const tabId of sessionResult.mutedTabIds) {
				if (typeof tabId === 'number' && Number.isFinite(tabId)) mutedTabIds.add(tabId);
			}
		}
		hydrateHistoryMaps(sessionResult.scoreHistory, sessionResult.powerScoreHistory);
		winProbTracker.hydrate(sessionResult.scoreboardWinProbHistory);
		demoMode = demoResult.demoMode as boolean;
		endRecords = readGameEndRecords(demoResult[gameEndTimesKey]);
		if (demoMode) simulator = new MockGameSimulator();
	}).catch(err => {
		logError('Failed to load persisted state; falling back to defaults.', err);
	});

	stateReady.then(async () => {
		await reconcileClosedTabs().catch(err => {
			logWarn('Failed to reconcile the tab registry against open tabs.', err);
		});
		await warmCollegeDirectories();
		await refreshSlate().catch(() => {});
		await refreshScores(false).catch(err => {
			logError('Initial score refresh failed; starting polling anyway.', err);
		});

		if (demoMode) {
			if (!demoTimer) {
				demoTimer = setInterval(() => void refreshScores(true), pollIntervalMs);
			}
			refreshKeepAwake();
			return;
		}

		startLeaguePolling();
		scheduleWinProbabilityPolling();
		await sweepWinProbabilities();
		await afterFetch(null, false, [], false);
	});

	interface prefsChange {
		slateChanged: boolean;
		fetchScopeChanged: boolean;
	}

	const adoptPrefs = (next: UserPreferences): prefsChange => {
		const previous = prefs;
		const previousCollegeKey = collegeFetchKey();
		prefs = next;
		if (previous.enabled && !prefs.enabled) setLastSwitchTime(0);
		const previousLeagues = new Set(previous.enabledLeagues);
		const newLeagues = new Set(prefs.enabledLeagues);
		const leaguesChanged = previousLeagues.size !== newLeagues.size ||
			[...previousLeagues].some(leagueId => !newLeagues.has(leagueId));
		return {
			slateChanged: prefs.showUpcomingGames !== previous.showUpcomingGames ||
				prefs.keepFinalGames !== previous.keepFinalGames ||
				(prefs.showUpcomingGames && prefs.upcomingGamesDays !== previous.upcomingGamesDays),
			fetchScopeChanged: (leaguesChanged || collegeFetchKey() !== previousCollegeKey) && !demoMode,
		};
	};

	const applyPrefsChange = async ({ slateChanged, fetchScopeChanged }: prefsChange) => {
		if (!slateChanged && !fetchScopeChanged) return;
		if (fetchScopeChanged) await warmCollegeDirectories();
		await refreshSlate();
		const enabledLeagues = new Set(prefs.enabledLeagues);
		const live = fetchScopeChanged
			? keepCollegeGames(games.filter(g => g.status === 'in' && enabledLeagues.has(g.league)))
			: games.filter(g => g.status === 'in');
		games = [...live, ...slateBeside(live, [...upcomingGames, ...liveRetainedFinals()])];
		if (fetchScopeChanged) {
			slateShedLeagues = slateShedLeagues.filter(leagueId => enabledLeagues.has(leagueId));
			const keptIds = new Set(games.map(g => g.id));
			currentScores = currentScores.filter(score => keptIds.has(score.gameId));
		}
		broadcastScoresUpdated();
		if (fetchScopeChanged) {
			startLeaguePolling();
			void sweepWinProbabilities();
		}
	};

	browser.storage.sync.onChanged.addListener(changes => {
		if (!(activeProfileSyncKey in changes)) return;
		void stateReady.then(async () => {
			await followSyncedProfile();
			const [stored, roster] = await Promise.all([loadStoredUserPreferences(), loadFantasyRoster().catch(() => [])]);
			liveExtras.setRoster(roster);
			const change = adoptPrefs(stored);
			clearPendingSwitch();
			await syncManagedTabMuteState(prefs.enabled);
			await applyPrefsChange(change);
		}).catch(err => logWarn('Could not follow the synced profile.', err));
	});

	browser.storage.sync.onChanged.addListener(changes => {
		if (!('prefs' in changes) || activeProfileSyncKey in changes) return;
		void stateReady.then(async () => {
			const stored = await loadStoredUserPreferences();
			if (JSON.stringify(stored) === JSON.stringify(prefs)) return;
			const change = adoptPrefs(stored);
			clearPendingSwitch();
			await syncManagedTabMuteState(prefs.enabled);
			await applyPrefsChange(change);
		}).catch(err => logWarn('Could not apply the synced settings.', err));
	});

	browser.runtime.onMessage.addListener((msg: ExtensionMessage, sender: { tab?: { id?: number } }) => {
		if (msg.type === 'MULTIVIEW_FRAME_STATUS') return;
		if (msg.type === 'GET_MULTIVIEW') return stateReady.then(() => multiview.lineupFor(sender.tab?.id));
		if (msg.type === 'MULTIVIEW_READY') {
			const tabId = sender.tab?.id;
			if (tabId === undefined) return;
			return stateReady.then(() => multiview.markReady(tabId, msg.gameIds));
		}
		if (msg.type === 'GET_STATE') {
			if (msg.forceRefresh === true || games.length === 0) {
				return stateReady
					.then(async () => {
						let stored = prefs;
						try {
							stored = await loadStoredUserPreferences();
						} catch {}
						await applyPrefsChange(adoptPrefs(stored));
						await refreshScores(false);
						return buildBackgroundState();
					});
			}
			return Promise.resolve(buildBackgroundState());
		}
		if (msg.type === 'UPDATE_PREFS') {
			return stateReady.then(async () => {
				const change = adoptPrefs(normalizeUserPreferences(msg.prefs));
				clearPendingSwitch();
				if (multiview.tabId() !== null && !await multiviewReady()) await multiview.stop();
				await syncManagedTabMuteState(prefs.enabled);
				await applyPrefsChange(change);
			});
		}
		if (msg.type === 'UPDATE_REGISTRY') {
			return stateReady.then(async () => {
				const openTabIds = await getOpenTabIds();
				tabRegistry = msg.tabRegistry.filter(reg => openTabIds.has(reg.tabId));
				clearPendingSwitch();
				await browser.storage.session.set({ tabRegistry });
				await syncManagedTabMuteState(prefs.enabled);
			});
		}
		if (msg.type === 'BOSS_BUTTON') return stateReady.then(() => bossMode.press());
		if (msg.type === 'SET_GAME_BOOST') {
			return stateReady.then(async () => {
				const boost = clampBoostPoints(Number(msg.boost));
				if (boost === 0) {
					delete gameBoosts[msg.gameId];
				} else {
					gameBoosts[msg.gameId] = boost;
				}
				await browser.storage.session.set({ gameBoosts });
				await afterFetch(null, false, [], false);
			});
		}
		if (msg.type === 'SET_DEMO_MODE') {
			return stateReady.then(async () => {
				clearPendingSwitch();
				demoMode = msg.enabled;
				if (demoMode) {
					simulator = new MockGameSimulator();
					stopLeaguePolling();
					stopWinProbabilityPolling();
					winProbHistory.clear();
					winProbTracker.clear();
					summaryPlayIds.clear();
					situationPlayIds.clear();
					if (!demoTimer) {
						demoTimer = setInterval(() => void refreshScores(true), pollIntervalMs);
					}
				} else {
					simulator = null;
					if (demoTimer) { clearInterval(demoTimer); demoTimer = null; }
					startLeaguePolling();
					scheduleWinProbabilityPolling();
				}
				await browser.storage.local.set({ demoMode });
				await refreshScores(false);
			});
		}
		if (msg.type === 'SET_STANDBY_STREAM_TAB') {
			return stateReady.then(async () => {
				if (tabRegistry.some(reg => reg.tabId === msg.tabId)) return;
				clearPendingSwitch();
				standbyStreamTabId = msg.tabId;
				onStandbyStream = false;
				await browser.storage.session.set({ standbyStreamTabId });
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
					heldSwitch: heldSwitch && { gameId: heldSwitch.gameId, tabId: heldSwitch.tabId, leavingGameId: heldSwitch.leavingGameId, holdUntil: heldSwitch.holdUntil },
					liveGameCount: games.filter(g => g.status === 'in').length,
					upcomingGameCount: games.filter(g => g.status === 'pre').length,
					totalGameCount: games.length,
					tabRegistry,
					onStandbyStream,
					standbyStreamTabId,
					commercialBreaks: Object.fromEntries(commercialBreaks.entries()),
					scores: currentScores,
					gameLabels,
					enabledLeagues: prefs.enabledLeagues,
					sensitivity: prefs.sensitivity,
					cooldownSeconds: prefs.cooldownSeconds,
					switchDelaySeconds: prefs.switchDelaySeconds,
					contentAwareSwitching: prefs.contentAwareSwitching,
					workerStartedAt,
					leagueLastGoodAt,
					leagueFailures: Object.fromEntries(leagueFailureCounts),
				};
			});
		}

		if (msg.type === 'GET_GUIDE_SLATE') {
			return stateReady.then(async (): Promise<GuideSlate> => {
				if (demoMode && simulator) return { games, leagueLogos, monoLogos: {}, gameBoosts, endTimes: {} };

				if (guideSlateRequest) return guideSlateRequest;

				const slateHeld = guideSlateAt !== 0 && Date.now() - guideSlateAt < guideSlateHoldMs;
				if (!msg.force && (slateHeld || Date.now() < guideRetryAfter)) {
					void fillMissingDurations(guideSlate);
					return { games: guideSlate, refused: guideSlateRefused && guideSlate.length === 0, leagueLogos, monoLogos: await ensureMonoLogos(prefs.enabledLeagues), gameBoosts, endTimes: gameEndTimes(endRecords) };
				}

				guideSlateRequest ??= fetchGuideSlate().finally(() => { guideSlateRequest = null; });
				return guideSlateRequest;
			});
		}
	});

	// Nothing to do here: an alarm only fires on a worker that had stopped, and starting it again is
	// the point. Startup picks the polls back up.
	browser.alarms.onAlarm.addListener(() => {});

	browser.commands.onCommand.addListener(command => {
		if (command !== bossCommandName) return;
		void stateReady.then(() => bossMode.press()).catch(err => logWarn('The boss button hit a snag.', err));
	});

	browser.tabs.onActivated.addListener(({ tabId }) => {
		void stateReady.then(() => {
			if (tabRegistry.some(reg => reg.tabId === tabId)) setLastSwitchTime(Date.now());
			return syncManagedTabMuteState(prefs.enabled);
		}).catch(err => logWarn('Failed to settle mute state after a tab switch.', err));
	});

	browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
		const { url } = changeInfo;
		if (!url) return;
		void stateReady.then(async () => {
			if (multiview.tabId() !== tabId || !leftMultiviewPage(url, browser.runtime.getURL(multiviewPagePath))) return;
			if (!await multiview.hijacked(tabId, Date.now())) return;
			await syncManagedTabMuteState(prefs.enabled);
			const host = (() => { try { return new URL(url).host; } catch { return ''; } })();
			await browser.notifications.create(multiviewLeftNotificationId, {
				type: 'basic',
				iconUrl: 'icon/128.png',
				title: i18n.t('notification.multiviewLeftTitle'),
				message: host ? i18n.t('notification.multiviewLeftMessage', { host }) : i18n.t('notification.multiviewLeftMessageNoHost'),
			});
		}).catch(err => logWarn('Failed to handle the Multiview tab leaving its page.', err));
	});

	browser.tabs.onRemoved.addListener(tabId => {
		void stateReady.then(() => forgetClosedTab(tabId));
	});
}) as unknown;
