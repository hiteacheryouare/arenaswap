import { i18n } from '#i18n';
import { randomInRange } from '@porkyproductions/hat';
import { createWinProbabilityTracker, summaryStillNeeded, isWithinFinalRetention, MockGameSimulator, createPollModeTracker, isObjectRecord, isScoreSnapshotLike, isPowerScoreSnapshotLike, normalizeGameBoosts, computeLeagueIntervalMs, computeHebetudinousIntervalMs, earliestUpcomingStartMs, computeRetryDelayMs, pollWinProbabilityMs as winProbPollIntervalMs, logWarn, logError, isPlayFrozen, chooseSwitchTarget, getHistoryWindowMsForGame, maxSnapshotsPerGame, nextCommercialBreak, checkHeldSwitch, holdSwitch, retainSnapshots, scoreLiveGame, toLiveScore, toScoreSnapshot } from '@arenaswap/core';
import { fetchGamesWithLeagueLogos, fetchGameDurationMins, fetchTeamMonoLogos, fetchWinProbability, fetchNextScheduledStart, scoreboardRefreshMs, createLiveExtras, fetchCompetitionSituation, fetchLeagueStandings, hasStandingsRaces } from '@arenaswap/sideline';
import type { CommercialBreakEntry, HeldSwitch, PlayBreakSport } from '@arenaswap/core';
import { computeStandbyStreamDecision } from '../utils/standbyStreamLogic';
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
import { loadStoredUserPreferences, persistStoredUserPreferences } from '../utils/prefsStorage';
import { loadFantasyRoster } from '../utils/fantasyRosterStorage';
import { capitalizeReason, speakReason } from '../utils/powerScoreReason';
import { displayLocale } from '../utils/displayLocale';
import type { guideSlateOutcome } from '../utils/slateMerge';
import { guideSlateTtlMs, keepRefusedLeagues, resolveGuideSlate, resolveGuideSlateFailure } from '../utils/slateMerge';
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
	pollMaxEagerMs,
	resolveLeagueLogoUrl,
	sportTypeConfigMap,
	leagueConfigMap,
} from '@arenaswap/core/constants';
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

// A stored switch time in the future reads as a cooldown that never elapses, which stops
// switching altogether with nothing on screen to explain it. An NTP correction or a manual clock
// change is enough to write one, and session storage carries it across every restart, so it is
// sanitised on the way back in rather than trusted.
const readStoredSwitchTime = (value: unknown, now: number): number => (
	typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= now ? value : 0
);

const switchNotificationId = 'arenaswap-switch';
const standingsRefreshMs = 30 * 60 * 1000;
const blowoutSummaryIntervalMs = 180_000;

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

// Activating a tab in a window behind this one changes nothing anyone can see. And a player in full
// screen drops out of it once its tab stops being the active one; only a click can put the new
// tab's player back, but the window needs none, so it goes back and the game still fills the screen.
const bringWindowForward = async (windowId: number, watchedWindow: { id?: number; state?: string }) => {
	if (windowId !== watchedWindow.id) await browser.windows.update(windowId, { focused: true });
	if (watchedWindow.state !== 'fullscreen') return;
	const { state } = await browser.windows.get(windowId);
	if (state !== 'fullscreen') await browser.windows.update(windowId, { state: 'fullscreen' });
};

// What the popup reads on its next open to say how many tabs were handed back while it was shut.
// Accumulated rather than replaced, so a second wave of finals cannot erase the first.
const recordFinishedTabNotice = async (freed: number, closed: number) => {
	try {
		const stored = await browser.storage.session.get({ [finishedTabNoticeKey]: null });
		const notice = mergeFinishedTabNotice(normalizeFinishedTabNotice(stored[finishedTabNoticeKey]), freed, closed);
		await browser.storage.session.set({ [finishedTabNoticeKey]: notice });
	} catch (err) {
		logWarn('Failed to record which tabs were handed back.', err);
	}
};

// The two lookups resolveFinishedTabs needs to tell a tab it can close from a tab whose window
// would go with it.
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

// The slate's copy of a game is older than the one already on screen: a game that went live since
// the slate was fetched is still in it as upcoming, and shows twice unless the live copy wins.
const slateBeside = (onScreen: Game[], slate: Game[]): Game[] => {
	const shownIds = new Set(onScreen.map(g => g.id));
	return slate.filter(g => !shownIds.has(g.id));
};

export default defineBackground(() => {
	let games: Game[] = [];
	let upcomingGames: Game[] = [];
	// Both lists exist for the same reason: the per-league polls below use the dateless scoreboard
	// and replace a league's games wholesale, so anything the range fetch found that the dateless
	// call cannot see has to be carried across each tick by hand.
	let retainedFinalGames: Game[] = [];
	/* The guide's own wider slate, from its own fetch — `refreshSlate` deliberately does not produce
	   it, because reaching back far enough to cover the guide truncated the popup's future days
	   against ESPN's server-side event cap. Held between opens rather than re-fetched on each one,
	   and kept current by the per-league polls below, so the TTL only has to cover the set of games
	   changing — a kickoff being added — and not the scores inside them.

	   Separate from `games` rather than widening it: `afterFetch` scores off
	   `games.filter(status === 'in')` and both the switch target and the poll cadence read that same
	   array, so an extra entry there would change which game the extension switches to. */
	let guideSlate: Game[] = [];
	let guideSlateAt = 0;
	let guideSlateHoldMs = guideSlateTtlMs;
	let guideSlateRefused = false;
	// Set when a fetch left nothing worth stamping as the slate, so a refusal is not asked about again
	// on every poll broadcast.
	let guideRetryAfter = 0;
	// One wide fetch at a time: it takes a while through the request queue, and every poll broadcast
	// that lands meanwhile makes an open Guide ask again before anything has been stamped.
	let guideSlateRequest: Promise<GuideSlate> | null = null;
	let slateShedLeagues: LeagueId[] = [];
	const leagueLastGoodAt: LeagueLastGoodAt = {};
	// When each finished game actually ended, so the guide can stop drawing it at its estimate.
	let endRecords: gameEndRecords = {};
	// Per worker rather than persisted: a final whose summary has no duration would otherwise cost a
	// request on every guide open, and a new worker trying once more is cheap.
	const durationRequested = new Set<string>();
	let currentScores: LiveScore[] = [];
	let leagueLogos: LeagueLogoMap = {};
	// ESPN's white team marks, which only `/teams` carries — the scoreboard has a single logo per
	// competitor and no variants. Held for the guide, which is the one surface that draws a crest per
	// game on a dark bar. Backed by `storage.local` rather than by this worker's memory, which MV3
	// discards about thirty seconds after the last event — see `monoLogoCache`.
	let monoLogos: TeamMonoLogoMap = {};
	let monoLogosLoaded = false;
	// The in-flight fetch, held alongside its result. The guard on the result alone only closes
	// after the await, so two guide tabs opened together both missed it and both ran the fetch —
	// which is one `/teams?limit=1000` request per enabled league, so 62 requests where 31 would do.
	let monoLogoRequest: { key: string; pending: Promise<TeamMonoLogoMap> } | null = null;
	// A league that answers with no marks, which is most of them outside North America, is left out of
	// the answer, so without this it reads as missing on every Guide ask and costs a refetch and a
	// rewrite of the whole stored map each time.
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
			// Re-stamped on every write, so a league added months later does not inherit an expiry from
			// the fetch that filled the other thirty.
			await browser.storage.local.set({ [monoLogoCacheKey]: { fetchedAt: Date.now(), logos: monoLogos } });
		} catch (err) {
			// A miss costs the guide nothing but the tinted disc it drew before. Cleared rather than
			// kept, so the next open retries instead of awaiting a promise that already rejected.
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

	// Baseball's summary says how long a game took, which covers the finals nobody saw end. Run after
	// the slate has gone back rather than in front of it: a cold day of MLB finals is a dozen summary
	// requests, and the guide can draw estimates while they land.
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
		browser.runtime.sendMessage({ type: 'GUIDE_SLATE_UPDATED' }).catch(() => {});
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
	// Session-backed like the rest of the switching state: MV3 tears the worker down whenever it
	// idles, and a cooldown held only in this closure restarts at 0 on the next wake, handing back
	// the free switch the user set the dial to prevent.
	const setLastSwitchTime = (at: number): void => {
		lastSwitchTime = at;
		void browser.storage.session.set({ lastSwitchTime: at }).catch(err => {
			logWarn('Failed to persist the switch cooldown to session storage.', err);
		});
	};
	const leagueTimers = new Map<string, ReturnType<typeof setTimeout>>();
	const leagueFailureCounts = new Map<LeagueId, number>();
	const leagueHealthyIntervalMs = new Map<LeagueId, number>();
	const leagueNextIntervalMs = new Map<string, number>();
	// Lives on the summary endpoint (one request per game) rather than the scoreboard, so it
	// refreshes on its own slow cadence. Every PowerScore reader pulls from here, so the card,
	// the detail screen and the switcher all agree on the same number.
	const winProbHistory = new Map<string, number[]>();
	// Leagues whose scoreboard carries the line build it from our own polls instead, and persist it.
	const winProbTracker = createWinProbabilityTracker();
	// The closing line, box score, situation and standings races the boosts read, and basketball's
	// timeouts for the cards.
	const liveExtras = createLiveExtras();
	const summaryFetchedAt = new Map<string, number>();
	const standingsFetchedAt = new Map<LeagueId, number>();
	let winProbTimer: ReturnType<typeof setTimeout> | null = null;
	// Bumped on every stop so a sweep that is already in flight cannot reschedule itself.
	let winProbGeneration = 0;
	const pollModeTracker = createPollModeTracker();
	let demoTimer: ReturnType<typeof setInterval> | null = null;
	let inFlightRefresh: Promise<void> | null = null;
	let pendingSwitchTimer: ReturnType<typeof setTimeout> | null = null;
	let pendingSwitch: { gameId: string; tabId: number; reason?: string; waitedFor?: PlayBreakSport } | null = null;
	// Content-aware switching: a switch waiting on a break in play in the game being left.
	let heldSwitch: HeldSwitch | null = null;
	let heldSwitchTimer: ReturnType<typeof setTimeout> | null = null;
	let standbyStreamTabId: number | null = null;
	let onStandbyStream = false;
	// Mirrored into session storage because MV3 tears the service worker down whenever it goes
	// idle — an in-memory set would come back empty and strand every muted tab silent with no
	// record that we were the cause.
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
				// Taken as persisted. What was written out was already thinned by retainSnapshots, and
				// re-applying a window here would throw away the coarse tail of the game on every
				// worker wake — which MV3 does constantly, so the wrap screen would never see a full
				// game. The cap is kept as the same backstop it is everywhere else.
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

	// By age rather than by membership in `games`: the Guide draws a final's wrap from this long after
	// the popup has dropped the game, for as far back as its slate reaches.
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
				stalled: score.stalled ?? false,
				onBreak: score.onBreak ?? false,
				reason: score.reason,
				// Classic's signals are already the flat fields above, and only the newest snapshot keeps its
				// reasons: session storage holds every live game's history and is small on older Chrome.
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

	// Storage and messaging both structured-clone what they are handed, so the snapshots need no copy.
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
		heldSwitch: heldSwitch && { gameId: heldSwitch.gameId, sport: heldSwitch.sport },
	});

	const broadcastScoresUpdated = () => {
		browser.runtime.sendMessage({ type: 'SCORES_UPDATED', ...buildBackgroundState() }).catch(() => {});
	};


	const getGameLabel = (gameId: string): string => {
		const game = games.find(g => g.id === gameId);
		return game ? `${game.awayTeam.abbreviation} ${i18n.t('gameCard.vs')} ${game.homeTeam.abbreviation}` : i18n.t('notification.unknownGame');
	};

	// The standby tab lives outside the game registry but is still ours to mute — otherwise it
	// keeps playing over whichever game the user is actually watching.
	const getManagedTabIds = (): number[] => {
		const managedTabIds = tabRegistry.map(reg => reg.tabId);
		if (prefs.standbyStreamEnabled && standbyStreamTabId !== null) {
			managedTabIds.push(standbyStreamTabId);
		}
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
			await persistStoredUserPreferences(prefs);
		},
		muteManagedTabs: () => syncManagedTabMuteState(prefs.enabled),
		saveHushed: hushed => browser.storage.session.set({ [bossHushedKey]: hushed }),
	});

	const syncManagedTabMuteState = async (enabled: boolean) => {
		// The hush is the pause's mute. Prefs can come back on without an UPDATE_PREFS, from a
		// storage reload or a worker restart, so this is where it ends rather than at one message.
		if (enabled) await bossMode.release();
		const managedTabIds = getManagedTabIds();
		if (managedTabIds.length === 0 && mutedTabIds.size === 0) return;

		const allTabs = await browser.tabs.query({});
		const openTabIds = new Set(allTabs.flatMap(tab => tab.id === undefined ? [] : [tab.id]));
		const mutedNow = new Map(allTabs.flatMap(tab => tab.id === undefined ? [] : [[tab.id, tab.mutedInfo?.muted] as const]));

		const managedOpenTabIds = managedTabIds.filter(tabId => openTabIds.has(tabId));

		// Tabs we muted earlier that are no longer ours must be handed back to the user unmuted.
		const releasedTabIds = [...mutedTabIds].filter(
			tabId => openTabIds.has(tabId) && !managedOpenTabIds.includes(tabId)
		);

		let watchedTabId: number | undefined;
		if (enabled && managedOpenTabIds.length > 0) {
			const activeTabId = await getActiveTabId();
			if (activeTabId !== undefined && managedOpenTabIds.includes(activeTabId)) {
				watchedTabId = activeTabId;
			}
		}

		const nextMuteStates = new Map<number, boolean>();
		for (const tabId of releasedTabIds) nextMuteStates.set(tabId, false);
		for (const tabId of managedOpenTabIds) {
			nextMuteStates.set(tabId, enabled ? tabId !== watchedTabId : bossMode.isHushed());
		}

		// A tab can close between the query above and the update below. Failing the whole batch
		// would abort the caller mid-poll, including the switch evaluation in afterFetch, so each
		// tab is settled on its own and the muted record is written from what actually landed.
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

	// The notice a held switch posts up front goes out under the switch's own id, so the switch
	// replaces it when it lands. One that never lands takes its notice down with it.
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

	// Leaving a closed tab's registration in place poisons switching: it still wins the reduce in
	// resolveSwitchTarget whenever its game holds the top PowerScore, and every switch attempt
	// then no-ops. Same for the standby tab, which otherwise answers `switchToStandby` forever.
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
		// Nothing legitimately reports zero tabs while the worker is running, so an empty result
		// means we cannot see the tab strip. Treat that as unknown rather than as proof that every
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

	// The score for a notification's title, and the PowerScore reason as a sentence when this
	// language can say it.
	const describeSwitchTarget = (gameId: string, reason?: string) => {
		const game = games.find(g => g.id === gameId);
		const score = game
			? `${game.awayTeam.abbreviation} ${game.awayTeam.score}–${game.homeTeam.score} ${game.homeTeam.abbreviation}`
			: getGameLabel(gameId);
		const locale = displayLocale();
		// The keyed reasons are read only while they still describe the line being announced.
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

	const executeSwitch = async (tabId: number, gameId?: string, reason?: string, waitedFor?: PlayBreakSport) => {
		if (await getActiveTabId() === tabId) return;

		const [allTabs, watchedWindow] = await Promise.all([browser.tabs.query({}), browser.windows.getLastFocused()]);
		const targetTab = allTabs.find(tab => tab.id === tabId);
		// Read last, with nothing awaited before the update: a boss press during the queries above
		// pauses auto-switching, and a switch that lands over the decoy would undo it.
		if (!targetTab || !prefs.enabled) return;

		try {
			await browser.tabs.update(tabId, { active: true });
		} catch (err) {
			// The tab closed between the query above and the update.
			logWarn(`Failed to switch to tab ${tabId}.`, err);
			return;
		}
		// Before the mute sync, which follows whichever window was focused last.
		if (targetTab.windowId !== undefined) {
			try {
				await bringWindowForward(targetTab.windowId, watchedWindow);
			} catch (err) {
				logWarn(`Failed to bring the window for tab ${tabId} forward.`, err);
			}
		}
		// Parking on standby is not a switch the cooldown should count: it would hold the user there
		// while a game that just woke up plays out.
		if (gameId) setLastSwitchTime(Date.now());
		await syncManagedTabMuteState(prefs.enabled);
		if (gameId) await recordSuccessfulSwitchForReviewPrompt(lastSwitchTime);

		if (prefs.notificationsEnabled) {
			holdAnnounced = false;
			// One id for every switch, so each notification replaces the last instead of a long game
			// leaving dozens of them stacked in the notification centre.
			if (!gameId) {
				await browser.notifications.create(switchNotificationId, {
					type: 'basic',
					iconUrl: 'icon/128.png',
					title: i18n.t('notification.standbyTitle'),
					message: i18n.t('notification.standbyMessage'),
				});
			} else {
				// A reason this language cannot be given drops out, leaving the plain message, and a
				// game with no venue we know says where it is going without naming a building.
				const { score: scoreTitle, venue, said } = describeSwitchTarget(gameId, reason);
				const switched = venue
					? (said ? i18n.t('notification.switchedMessageWithReason', { reason: said, venue }) : i18n.t('notification.switchedMessage', { venue }))
					: (said ? i18n.t('notification.switchedMessageWithReasonNoVenue', { reason: said }) : i18n.t('notification.switchedMessageNoVenue'));
				const message = waitedFor
					? i18n.t('notification.afterBreak', { waited: i18n.t(`notification.waitedFor.${waitedFor}`), message: switched })
					: switched;

				await browser.notifications.create(switchNotificationId, {
					type: 'basic',
					iconUrl: 'icon/128.png',
					title: i18n.t('notification.switchedTitle', { score: scoreTitle }),
					message,
				});
			}
		}
	};

	// Reads `currentScores` so a switch that waited out `switchDelaySeconds` re-targets against
	// what the games are doing when it fires, not the decision made a minute ago.
	const resolveSwitchTarget = (openTabIds: Set<number>, activeTabId: number) => chooseSwitchTarget({
		registry: tabRegistry.filter(reg => openTabIds.has(reg.tabId)),
		scores: currentScores,
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

		// Everything went quiet during the delay: park on the standby stream on the next poll
		// instead of dropping the user into the least-boring game.
		if (prefs.standbyStreamEnabled && standbyStreamTabId !== null) {
			const registeredGameIds = new Set(
				tabRegistry.filter(reg => openTabIds.has(reg.tabId)).map(reg => reg.gameId)
			);
			const registeredScores = currentScores.filter(s => registeredGameIds.has(s.gameId));
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

	// Hands a held switch to the delay queue, which re-targets it against the scores of the moment.
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

	// What decides which college games are fetched and kept, so a change to it refetches.
	const collegeFetchKey = (): string => JSON.stringify([
		prefs.collegeFilters,
		prefs.favoriteTeamIds.filter(key => isCollegeLeagueId(parseFavoriteTeamKey(key)?.leagueId)),
	]);

	// Only the leagues whose filter cannot work without a conference list load one.
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

	// Every scoreboard read goes through here, so a college game outside the user's divisions and
	// conferences never reaches the slate, the guide or the switcher.
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

	/* Asks for exactly what the display preferences want and no more. Widening this to cover the guide
	   as well looked free — `includeUpcoming` already makes it two requests per league, so a wider
	   `dates` range changes the payload and not the request count — and it cost the future. ESPN caps
	   a scoreboard response server-side, near 80 events on a dated college football query, and the
	   truncation takes the tail, which is the days furthest ahead. Reaching two days back to pick up
	   finals for the guide spent that whole budget on a college football weekend's *past* games and
	   left one day of future showing. The guide asks for its own superset again. */
	const refreshSlate = async () => {
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
			if (result.shedLeagues.length === prefs.enabledLeagues.length) {
				logWarn(`ESPN shed the whole slate (${result.shedLeagues.length} leagues); keeping what we have.`);
				return;
			}
			/* Only the leagues that answered may have their entries replaced. Rebuilding both lists from
			   `result.games` wholesale threw away every final and every kickoff belonging to a league
			   that failed this fetch — and a league whose dated range is refused fails *only* this leg,
			   so its live games kept arriving from the undated board while its finals silently went.
			   That is the same "a shed league contributes nothing and says nothing" trap as everywhere
			   else here, one layer up. */
			const heldFor = (list: Game[]): Game[] => keepRefusedLeagues(list, result.shedLeagues);

			upcomingGames = prefs.showUpcomingGames
				? [...heldFor(upcomingGames), ...result.games.filter(g => g.status === 'pre')]
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
		// Deliberately bypasses both of refreshSlate's preference gates: the guide draws the
		// whole day whatever the popup is configured to list. Equally deliberately it does not
		// widen `games` — afterFetch scores off games.filter(status === 'in'), and the switch
		// target and the poll cadence read that same array, so extra entries would change
		// which game the extension switches to.
		try {
			const result = await fetchFilteredGames(prefs.enabledLeagues, {
				includeUpcoming: true,
				// Follows the Up Next setting so the two surfaces agree about how far ahead the
				// product looks, floored so a guide that can only ever show today still has a
				// future to page into.
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

	// Any game a poll just reported replaces the copy the slate holds; everything else is kept, which
	// is what carries the days the dateless poll cannot see. Skipped until a wide fetch has actually
	// run, so a poll cannot seed a slate that would then look like a whole day to the guide.
	const mergeGuideSlate = (fresh: Game[]) => {
		if (guideSlateAt === 0) return;
		const freshIds = new Set(fresh.map(g => g.id));
		guideSlate = [...guideSlate.filter(g => !freshIds.has(g.id)), ...fresh];
	};

	// Re-checked on every merge rather than only on refetch, so a game ages out of the list on its
	// own schedule instead of waiting for the next slate fetch to notice.
	const liveRetainedFinals = (): Game[] => (
		prefs.keepFinalGames ? retainedFinalGames.filter(g => isWithinFinalRetention(g)) : []
	);

	// Two reasons to ask the poll for finished games, and only one of them puts them on screen.
	// Handing a tab back needs to *see* ESPN call the game final: absence from a payload cannot
	// stand in for it, because a payload legitimately drops games it is still serving elsewhere —
	// college football's dateless board did exactly that. So the fetch keeps them and the merge
	// below drops them again when the display preference says they are not wanted.
	const wantsFinalGames = (): boolean => prefs.keepFinalGames || prefs.finishedTabAction !== 'keep';

	const displayableGames = (fetched: Game[]): Game[] => (
		prefs.keepFinalGames ? fetched : fetched.filter(game => game.status !== 'post')
	);

	// Runs on every poll, ahead of the mute sync so a freed tab is unmuted in the same pass that
	// released it. Demo mode is excluded outright: its games reach 'post' on a script while the
	// tabs registered to them are real, and mock-20 ships already final — so the first poll after
	// turning the demo on would close a real tab for a game that was never played.
	const settleFinishedTabs = async (finishedGames: Game[]) => {
		if (prefs.finishedTabAction === 'keep' || demoMode) return;
		if (finishedGames.length === 0 || tabRegistry.length === 0) return;

		const allTabs = await browser.tabs.query({});
		const activeTabId = await getActiveTabId();
		const resolutions = resolveFinishedTabs({
			registry: tabRegistry,
			action: prefs.finishedTabAction,
			finishedGameIds: new Set(finishedGames.map(game => game.id)),
			openTabIds: new Set(allTabs.flatMap(tab => tab.id === undefined ? [] : [tab.id])),
			activeTabId: activeTabId ?? null,
			...describeOpenWindows(allTabs),
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
				// The registration is gone either way, so a tab that refuses to close is still
				// handed back rather than left half-managed.
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

	// refreshSlate only runs at worker startup and when preferences change, so a game that goes
	// final while the worker is already up never passes through it. Recorded here instead, on every
	// poll: otherwise the game survives only as long as the dateless scoreboard keeps returning it,
	// and the Eastern-day rollover drops it a couple of hours old against a promised 24. The fresh
	// copy replaces any retained one, so a score corrected after the whistle is the one that sticks.
	const absorbFinalGames = (fresh: Game[]) => {
		if (!prefs.keepFinalGames) return;
		const byId = new Map(retainedFinalGames.map(game => [game.id, game]));
		fresh.filter(game => game.status === 'post').forEach(game => byId.set(game.id, game));
		retainedFinalGames = [...byId.values()].filter(game => isWithinFinalRetention(game));
	};

	// A changedLeagueId scopes break tracking and history to just that league; null processes
	// every live game. `finishedGames` is what the fetch saw go final on this pass, which is not
	// the same as what is in `games` — with Keep finished games off they are dropped on the way in.
	// `observed` is false for a re-score of games already in hand, which must not read as another
	// poll: a clock that has not moved since the last real one would count as stalled, and a last
	// play would look older than it is.
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
		if (changedLeagueId !== null) refreshSituations(freshGames);
		updateHistory(freshGames);
		updatePowerScoreHistory(liveGames, scores, changedLeagueId);
		const pruned = pruneStaleHistory(now);
		// A league poll with nothing live in it changed none of the history, so it has nothing to write.
		if (changedLeagueId === null || freshGames.length > 0 || pruned) persistHistoryToSession();

		await settleFinishedTabs(finishedGames);

		broadcastScoresUpdated();

		await syncManagedTabMuteState(prefs.enabled);

		if (!allowTabSwitch || !prefs.enabled || liveGames.length === 0) {
			if (!prefs.enabled || liveGames.length === 0) {
				clearPendingSwitch();
			}
			return;
		}

		const activeTabId = await getActiveTabId();
		if (activeTabId === undefined) return;

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
			activeTabIsStandby: activeTabId === standbyStreamTabId,
		});

		// Evaluated ahead of the pending-switch guard so a queued switch cannot freeze the standby
		// state machine. When standby takes over, the queued game is below the threshold anyway.
		if (standbyDecision === 'switchToStandby') {
			clearPendingSwitch();
			// The same rule chooseSwitchTarget applies: a game picked by hand holds for the cooldown,
			// quiet or not.
			const inCooldown = prefs.cooldownSeconds > 0 && Date.now() - lastSwitchTime <= prefs.cooldownSeconds * 1000;
			if (inCooldown) return;
			onStandbyStream = true;
			await executeSwitch(standbyStreamTabId!);
			return;
		}
		if (standbyDecision === 'stayOnStandby') {
			clearPendingSwitch();
			return;
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
			return;
		}
		if (pendingSwitch) return;

		const target = resolveSwitchTarget(openTabIds, activeTabId);
		if (!target) return;

		const leaving = prefs.contentAwareSwitching && !demoMode ? liveGames.find(g => g.id === watchedGameId) : undefined;
		const held = leaving ? holdSwitch(target, leaving, commercialBreaks.get(leaving.id), now, liveGames.find(g => g.id === target.gameId)) : null;
		if (held) {
			heldSwitch = held;
			heldSwitchTimer = setTimeout(() => releaseHeldSwitch(), held.holdUntil - now);
			broadcastScoresUpdated();
			await announceHold(held);
			return;
		}

		if (prefs.switchDelaySeconds > 0) {
			queuePendingSwitch(target.gameId, target.tabId, target.reason);
		} else {
			await executeSwitch(target.tabId, target.gameId, target.reason);
		}
	};

	const tick = async (allowTabSwitch = true) => {
		const enabledLeagues = prefs.enabledLeagues;
		let finishedGames: Game[] = [];
		if (demoMode && simulator) {
			games = simulator.tick();
			// Reported the same way a real poll reports them, so the demo exclusion lives in one
			// place — settleFinishedTabs — rather than being an accident of what this branch omits.
			finishedGames = games.filter(g => g.status === 'post');
			const demoLeagues = [...new Set(games.map(game => game.league))];
			leagueLogos = demoLeagues.reduce<LeagueLogoMap>((acc, leagueId) => {
				// No ESPN response behind a demo game, so this resolves to the override or fallback.
				acc[leagueId] = resolveLeagueLogoUrl(leagueId);
				return acc;
			}, {});
		} else {
			let fetched: Game[];
			try {
				const fetchResult = await fetchFilteredGames(enabledLeagues, { includeUpcoming: false, includeFinal: wantsFinalGames() });
				// Every league refused is not an empty slate, it is no answer at all. Replacing `games`
				// from it would clear a live list and report a quiet night to the popup.
				if (fetchResult.shedLeagues.length === enabledLeagues.length) {
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
			// A refused league answered with nothing, not with no games: its live cards stay, as they do
			// under `tickLeague`. Their ids join the fresh set so the slate's older copy of the same
			// game, still marked upcoming, cannot come back beside them.
			const heldLive = games.filter(g => slateShedLeagues.includes(g.league) && g.status === 'in');
			games = displayableGames(fetched);
			games = [...games, ...heldLive, ...slateBeside([...fetched, ...heldLive], [...upcomingGames, ...liveRetainedFinals()])];
		}

		await afterFetch(null, allowTabSwitch, finishedGames);
	};

	const tickLeague = async (leagueId: LeagueId, allowTabSwitch: boolean) => {
		let fetchSucceeded = false;
		let finishedGames: Game[] = [];
		try {
			const fetchResult = await fetchFilteredGames([leagueId], { includeUpcoming: false, includeFinal: wantsFinalGames() });
			// Thrown rather than merged: a shed league comes back with no games, and the tail of this
			// function would read that as a successful tick with nothing live, hand it to
			// `recordPollResult`, and walk a league down into dormant while its games are being played.
			// Failure keeps the mode it already had, which is the faster of the two.
			if (fetchResult.shedLeagues.length > 0) throw new Error(`ESPN shed the ${leagueId} scoreboard.`);
			absorbFinalGames(fetchResult.games);
			noteGameEnds(fetchResult.games);
			mergeGuideSlate(fetchResult.games);
			finishedGames = fetchResult.games.filter(g => g.status === 'post');
			const freshGameIds = new Set(fetchResult.games.map(g => g.id));
			// Every league's finals are rebuilt from the retained list rather than carried through
			// with the other leagues' games, so one league's poll re-checks the whole set's
			// retention instead of each league only ageing out when its own turn comes round.
			const otherGames = games.filter(g => g.league !== leagueId && g.status !== 'post');
			const leagueUpcoming = upcomingGames.filter(g => g.league === leagueId && !freshGameIds.has(g.id));
			const retainedFinals = liveRetainedFinals().filter(g => !freshGameIds.has(g.id));
			games = [...otherGames, ...displayableGames(fetchResult.games), ...leagueUpcoming, ...retainedFinals];
			leagueLogos = { ...leagueLogos, ...fetchResult.leagueLogos };
			const hasLiveGames = fetchResult.games.some(g => g.status === 'in');
			// Read off the merged list rather than the response: the dateless scoreboard carries
			// today's scheduled games, and with Up Next on the slate contributes the rest of the week
			// for free. Either way a kickoff found here is one the lookahead below does not have to
			// spend a request on.
			const nextStartMs = earliestUpcomingStartMs(games.filter(g => g.league === leagueId));
			pollModeTracker.recordPollResult(leagueId, hasLiveGames, nextStartMs);
			leagueLastGoodAt[leagueId] = Date.now();
			fetchSucceeded = true;
		} catch (err) {
			logWarn(`Failed to fetch ${leagueId} games.`, err);
		}

		// Tracked per league across the steady-state polls, not just across a fan-out: a refusal and a
		// network failure both mean this league's games are unknown rather than absent.
		slateShedLeagues = fetchSucceeded
			? slateShedLeagues.filter(id => id !== leagueId)
			: [...new Set([...slateShedLeagues, leagueId])];

		// Reschedule before awaiting the scoring pass so the next tick is always queued, and skip
		// leagues that were disabled while this fetch was in flight. The lookahead is the one thing
		// allowed to hold it up, because its answer is what the interval below is chosen from.
		if (!demoMode && prefs.enabledLeagues.includes(leagueId)) {
			// Only ever on the way into a quiet state, and only when nothing already held answers it.
			// One request buys the right to skip dozens, so it is cheaper than the dormant beat it
			// replaces; a failure leaves the league dormant, which is the faster of the two.
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
			// A failed poll still works out the interval the league would normally be on, because that
			// is the ceiling its retries back off towards.
			if (mode === 'hebetudinous') {
				nextInterval = computeHebetudinousIntervalMs(pollModeTracker.getNextStartMs(leagueId) ?? null);
			} else if (mode === 'dormant' || (!fetchSucceeded && !liveInHand)) {
				// A league that has never answered is still `eager` with nothing live, so without the
				// second half its ceiling would be the 25s live beat for as long as it keeps failing.
				nextInterval = pollDormantMinMs + randomInRange(0, pollDormantMaxMs - pollDormantMinMs);
			} else {
				const refreshMs = scoreboardRefreshMs(leagueId);
				const base = computeLeagueIntervalMs(liveLeagueGames, currentScores, refreshMs);
				// Proportional so fast polls stay dense and slow polls spread out.
				const jitterMax = Math.round((base / pollMaxEagerMs) * 2_000);
				// Floored, because the negative half of the jitter would otherwise land inside the window
				// ESPN is still serving the previous answer for, which is the poll this floor exists to
				// stop. De-syncing leagues stays the job of the positive half.
				nextInterval = Math.max(refreshMs, base + randomInRange(-jitterMax, jitterMax));
			}
			if (fetchSucceeded) {
				leagueFailureCounts.delete(leagueId);
				leagueHealthyIntervalMs.set(leagueId, nextInterval);
			} else {
				const failures = (leagueFailureCounts.get(leagueId) ?? 0) + 1;
				leagueFailureCounts.set(leagueId, failures);
				// A sleeping league keeps the beat it last answered at, which the lookahead's own expiry
				// would otherwise shorten partway through a long refusal. A live one never does, so a game
				// on screen is not left stale.
				const ceiling = liveInHand ? nextInterval : Math.max(nextInterval, leagueHealthyIntervalMs.get(leagueId) ?? 0);
				nextInterval = computeRetryDelayMs(failures, ceiling, randomInRange(-2_000, 2_000));
			}
			leagueNextIntervalMs.set(leagueId, nextInterval);
			scheduleLeagueTick(leagueId, nextInterval);
		}

		await afterFetch(leagueId, allowTabSwitch, finishedGames);
	};

	const scheduleLeagueTick = (leagueId: LeagueId, delayMs: number) => {
		const existing = leagueTimers.get(leagueId);
		if (existing !== undefined) clearTimeout(existing);
		leagueTimers.set(leagueId, setTimeout(() => {
			tickLeague(leagueId, true).catch(err => logWarn(`The ${leagueId} poll hit a snag.`, err));
		}, delayMs));
	};

	const stopLeaguePolling = () => {
		for (const timer of leagueTimers.values()) clearTimeout(timer);
		leagueTimers.clear();
	};

	// Spreads each league's first tick across pollIntervalMs so they never all fire at once.
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

	// Fetched after scoring and read on the next poll: the power play and empty net it reports last
	// minutes, and a game past its blowout margin has no use for either. Only from the league's own
	// poll, so the empty-net check counts polls rather than re-scores, and only the NHL: college
	// hockey's situation carries neither flag. Basketball's carries the timeouts its cards show,
	// blowout or not.
	const refreshSituations = (freshGames: Game[]) => {
		if (demoMode) return;
		const blowoutMargin = sportTypeConfigMap.hockey?.closenessMargins[2] ?? 3;
		const wanted = freshGames.filter(game => !isPlayFrozen(game) && (game.sportType === 'basketball'
			|| (game.league === 'nhl' && Math.abs(game.homeTeam.score - game.awayTeam.score) <= blowoutMargin)));
		const replies = wanted.map(game => fetchCompetitionSituation(game)
			.then(situation => liveExtras.ingestSituation(game.id, situation))
			.catch((err: unknown) => {
				logWarn(`Failed to fetch the situation for ${game.id}.`, err);
				return false;
			}));
		void Promise.all(replies).then(moved => {
			if (moved.includes(true)) broadcastScoresUpdated();
		});
	};

	// Standings move only when games end, so half an hour is plenty.
	const refreshStandings = (liveGames: Game[]) => {
		const now = Date.now();
		// Races only count in the regular season.
		const leagues = new Set(liveGames.filter(game => !game.isPostseason).map(game => game.league).filter(hasStandingsRaces));
		for (const league of leagues) {
			if (now - (standingsFetchedAt.get(league) ?? 0) < standingsRefreshMs) continue;
			standingsFetchedAt.set(league, now);
			fetchLeagueStandings(league)
				.then(standings => liveExtras.ingestStandings(league, leagueConfigMap[league].sportType, standings))
				.catch((err: unknown) => logWarn(`Failed to fetch ${league} standings.`, err));
		}
	};

	// A game already out of reach is fetched a third as often: its win probability barely moves,
	// and its closing line was read the first time.
	const summaryDue = (game: Game, now: number): boolean => {
		const blowout = Math.abs(game.homeTeam.score - game.awayTeam.score) > (sportTypeConfigMap[game.sportType]?.closenessMargins[2] ?? Infinity);
		// Garbage time is when fantasy points pile up, so a game with a rostered player keeps the pace.
		return !blowout || liveExtras.hasRosteredPlayer(game) || now - (summaryFetchedAt.get(game.id) ?? 0) >= blowoutSummaryIntervalMs;
	};

	// One request per game, so this deliberately runs far slower than the scoreboard poll — a
	// win-probability line moves on the scale of possessions, not seconds.
	const refreshWinProbabilities = async (): Promise<void> => {
		const liveGames = games.filter(g => g.status === 'in');

		const liveIds = new Set(liveGames.map(g => g.id));
		for (const gameId of winProbHistory.keys()) {
			if (!liveIds.has(gameId)) winProbHistory.delete(gameId);
		}
		// An empty slate after a failed fetch must not wipe the lines read back from storage.
		if (games.length > 0) winProbTracker.retainOnly(liveIds);
		for (const gameId of summaryFetchedAt.keys()) {
			if (liveIds.has(gameId)) continue;
			summaryFetchedAt.delete(gameId);
			liveExtras.forget(gameId);
		}

		if (liveGames.length === 0) return;
		refreshStandings(liveGames);
		// Read once a sweep rather than watched: the popup writes it, and a minute is soon enough.
		liveExtras.setRoster(await loadFantasyRoster().catch(() => []));

		const now = Date.now();
		const summaryNeeded = (game: Game) => summaryStillNeeded(game, {
			hasScoreboardReadings: winProbTracker.historyOf(game.id) !== undefined && game.homeWinProbability !== undefined,
			hasSummaryLine: winProbHistory.has(game.id),
			hasRosteredPlayer: liveExtras.hasRosteredPlayer(game),
		});
		await Promise.all(liveGames.filter(game => summaryNeeded(game) && summaryDue(game, now)).map(async game => {
			summaryFetchedAt.set(game.id, now);
			try {
				const line = await fetchWinProbability(game, { onSummary: summary => liveExtras.ingestSummary(game, summary, Date.now()) });
				// ESPN returns [] during delays and brief interruptions even when earlier play
				// produced a line; keep the last good one rather than dropping the signal.
				if (line.length > 0) {
					winProbHistory.set(game.id, line);
					winProbTracker.adopt(game.id, line);
				}
			} catch (err) {
				logWarn(`Failed to fetch win probability for ${game.id}.`, err);
			}
		}));
	};

	// A prefs change asks for a sweep of its own, which used to run beside the timer's and fetch every
	// close game's summary twice.
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
			// The timer that started this sweep has already fired, so neither a stop nor a restart
			// during the sweep could have cancelled it. Without this check a resolving run brings a
			// stopped chain back to life, or adds a second live one that nothing holds a handle to.
			if (generation !== winProbGeneration) return;
			winProbTimer = setTimeout(() => void run(), winProbPollIntervalMs);
		};
		winProbTimer = setTimeout(() => void run(), winProbPollIntervalMs);
	};

	const stateReady = Promise.all([
		loadStoredUserPreferences(),
		browser.storage.session.get({ tabRegistry: [], standbyStreamTabId: null, lastSwitchTime: 0, [bossHushedKey]: false, ...historyStorageDefaults }),
		browser.storage.local.get({ demoMode: false, [gameEndTimesKey]: {} }),
		loadFantasyRoster().catch(() => []),
	]).then(([storedPrefs, sessionResult, demoResult, roster]) => {
		prefs = storedPrefs;
		liveExtras.setRoster(roster);
		tabRegistry = sessionResult.tabRegistry as TabRegistration[];
		standbyStreamTabId = (sessionResult.standbyStreamTabId as number | null) ?? null;
		lastSwitchTime = readStoredSwitchTime(sessionResult.lastSwitchTime, Date.now());
		bossMode.restore(sessionResult[bossHushedKey]);
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
				// Routed through refreshScores so a slow tick cannot overlap the next one.
				demoTimer = setInterval(() => void refreshScores(true), pollIntervalMs);
			}
			return;
		}

		startLeaguePolling();
		scheduleWinProbabilityPolling();
		// Seed the lines now that the games are known, then re-score so the first thing the popup
		// renders already carries volatility. afterFetch rather than refreshScores: the games are
		// already in hand from the refresh above, and only the scores need recomputing against the
		// new lines, so going through tick() would refetch every enabled league to no purpose.
		await sweepWinProbabilities();
		await afterFetch(null, false, [], false);
	});

	interface prefsChange {
		slateChanged: boolean;
		fetchScopeChanged: boolean;
	}

	// The synchronous half of a prefs change, so the caller can settle the mute state before the
	// slate refetch below spends a while on the network.
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
		// A league switched off answers no more polls, so its live games would otherwise stay on
		// frozen, scored and switchable until the next full refresh.
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
			// A league switched off keeps its cached lines until the next sweep otherwise.
			void sweepWinProbabilities();
		}
	};

	browser.runtime.onMessage.addListener((msg: ExtensionMessage) => {
		if (msg.type === 'GET_STATE') {
			if (msg.forceRefresh === true || games.length === 0) {
				return stateReady
					.then(async () => {
						// The popup may have written prefs then closed before its UPDATE_PREFS
						// message was delivered, so this path has to re-arm what that handler would
						// have. Mute state needs no help — the refreshScores at the end lands in
						// afterFetch, which syncs it against whatever prefs.enabled ends up as.
						let stored = prefs;
						try {
							stored = await loadStoredUserPreferences();
						} catch { /* keep current in-memory prefs */ }
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
				// The popup persists before it sends, and the GET_STATE recovery path relies on that,
				// so writing again here would only double the storage.sync traffic against Chrome's
				// 120-writes-per-minute ceiling.
				await syncManagedTabMuteState(prefs.enabled);
				await applyPrefsChange(change);
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
					// Demo games have no ESPN summary behind them; drop any real lines we cached.
					stopWinProbabilityPolling();
					winProbHistory.clear();
					winProbTracker.clear();
					if (!demoTimer) {
						// Routed through refreshScores so a slow tick cannot overlap the next one.
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
				};
			});
		}

		if (msg.type === 'GET_GUIDE_SLATE') {
			return stateReady.then(async (): Promise<GuideSlate> => {
				// Demo mode has no network behind it, so the simulator's own slate is the answer.
				if (demoMode && simulator) return { games, leagueLogos, monoLogos: {}, gameBoosts, endTimes: {} };

				if (guideSlateRequest) return guideSlateRequest;

				// The slate this built last time, which the live polls have kept current since. The
				// first open of a session still pays for it; the repeat opens that a pager invites do
				// not, where every open used to cost two requests per enabled league.
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

	browser.commands.onCommand.addListener(command => {
		if (command !== bossCommandName) return;
		void stateReady.then(() => bossMode.press()).catch(err => logWarn('The boss button hit a snag.', err));
	});

	browser.tabs.onActivated.addListener(({ tabId }) => {
		void stateReady.then(() => {
			// A manual switch starts the cooldown too, otherwise landing on a quieter game by hand
			// gets overridden by the very next poll.
			if (tabRegistry.some(reg => reg.tabId === tabId)) setLastSwitchTime(Date.now());
			return syncManagedTabMuteState(prefs.enabled);
		}).catch(err => logWarn('Failed to settle mute state after a tab switch.', err));
	});

	browser.tabs.onRemoved.addListener(tabId => {
		void stateReady.then(() => forgetClosedTab(tabId));
	});
}) as unknown;
