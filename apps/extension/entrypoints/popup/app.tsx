import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { fetchGamesWithLeagueLogos } from '@arenaswap/sideline';
import { allLeagueIds, createDefaultUserPreferences, createFavoriteTeamKey, normalizeUserPreferences, withCollegeFilter } from '@arenaswap/core/constants';
import type { FantasyRosterEntry } from '@arenaswap/core';
import type { CollegeFilter, CollegeLeagueId, ExtensionMessage, LeagueId, LeagueLogoMap, LeagueScheduleMap, PowerScoreSnapshot, ScoreSnapshot, SignalName, SportType, TabRegistration, UserPreferences } from '@arenaswap/core/types';
import type { Browser } from 'wxt/browser';
import GameDetailView from './components/gameDetailView';
import MainView from './components/mainView';
import OnboardingView from './components/onboardingView';
import SetupView from './components/setupView';
import WalkthroughView from './components/walkthroughView';
import ToastContainer from './components/toastContainer';
import { formatTabLabel, popupView } from './popupHelpers';
import { fetchState, normalizeBackgroundState } from '../../utils/backgroundState';
import { insertLeagueAtDefaultPosition, leagueOrder, leaguesBySportType, moveLeague } from '../../utils/leagueOrder';
import { i18n } from '#i18n';
import { TranslationContext } from '@arenaswap/ui/src/components/i18nContext';
import { StaleLeaguesProvider } from '@arenaswap/ui/src/components/staleLeagueNote';
import useFavoriteScoreConfetti from './useFavoriteScoreConfetti';
import { popupConfettiStage } from './popupConfettiStage';
import { resolveOpenRevealCut, resolveOpenRevealMode, revealSettleMs, revealSkipOutMs } from './cardReveal';
import { writeOpenRevealEnabled } from '../../utils/openReveal';
import { isLeagueLogoCacheFresh, leagueLogoCacheKey, seededLeagueLogos } from '../../utils/leagueLogoCache';
import useToast from './useToast';
import useSlideDirection from './useSlideDirection';
import useBossShortcut from './useBossShortcut';
import useMultiviewToggle from './useMultiviewToggle';
import SuggestView from './components/suggestView';
import {
	applyTabSuggestions,
	dismissSuggestions,
	normalizeDismissedSuggestions,
	suggestTabAssignments,
	tabSuggestionDismissalsKey,
	type SuggestionTab,
	type TabSuggestion,
} from '../../utils/tabSuggestions';
import { finishedTabNoticeKey, normalizeFinishedTabNotice } from '../../utils/finishedTabs';
import { loadStoredUserPreferencesWithPresence, saveUserPrefs } from '../../utils/prefsStorage';
import { loadFantasyRoster, saveFantasyRoster } from '../../utils/fantasyRosterStorage';
import {
	createProfile,
	defaultProfileId,
	activeProfileSyncKey,
	abandonProfile,
	defaultProfileName,
	deleteProfile,
	followSyncedProfile,
	renameProfile,
	switchProfile,
	type profileList,
} from '../../utils/profiles';
import { toggleModeSignal, withFantasyRule, withLeagueMode, withoutFantasySport } from '../../utils/scoringPrefs';
import { nextTemperatureUnit } from '../../utils/temperatureUnitCycle';
import { useTheme } from '../../utils/theme';
import { isDemoSeason, resolveDecorationDate, type demoSeason } from '../../utils/holidayDecorations';
import type { ReviewPromptState } from '../../utils/reviewPrompt';
import {
	getReviewPromptUrl,
	markReviewPromptDismissed,
	markReviewPromptReviewed,
	normalizeReviewPromptState,
	reviewPromptStorageKey,
	shouldShowReviewPrompt,
} from '../../utils/reviewPrompt';

const noSnapshots: ScoreSnapshot[] = [];
const noPowerScoreSnapshots: PowerScoreSnapshot[] = [];

const onSetGameBoost = (gameId: string, boost: number) => {
	void browser.runtime.sendMessage({ type: 'SET_GAME_BOOST', gameId, boost } satisfies ExtensionMessage);
};

const openGuide = () => {
	void browser.tabs.create({ url: browser.runtime.getURL('/guide.html') });
};

const defaultProfiles: profileList = { profiles: [{ id: defaultProfileId, name: defaultProfileName }], activeId: defaultProfileId };

const activeProfileName = (list: profileList) => list.profiles.find(profile => profile.id === list.activeId)?.name ?? '';

const isScoreUpdateMessage = (value: unknown): value is { type: 'SCORES_UPDATED' } => (
	typeof value === 'object'
	&& value !== null
	&& 'type' in value
	&& (value as { type?: unknown }).type === 'SCORES_UPDATED'
);

export default () => {
	const [view, setView] = useState<popupView>('main');
	const [navigated, setNavigated] = useState(false);
	if (!navigated && view !== 'main') setNavigated(true);
	const viewSlide = useSlideDirection(view === 'main' ? 0 : 1);
	const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
	const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
	const [upcomingQuery, setUpcomingQuery] = useState<string | null>(null);
	const mainScrollOffset = useRef(0);
	const [prefs, setPrefs] = useState<UserPreferences>(createDefaultUserPreferences());
	const prefsRef = useRef<UserPreferences>(createDefaultUserPreferences());
	const [prefsLoaded, setPrefsLoaded] = useState(false);
	const [fantasyRoster, setFantasyRoster] = useState<FantasyRosterEntry[]>([]);
	const fantasyRosterRef = useRef<FantasyRosterEntry[]>([]);
	const [registry, setRegistry] = useState<TabRegistration[]>([]);
	const [openTabs, setOpenTabs] = useState<Browser.tabs.Tab[]>([]);
	const [demoMode, setDemoMode] = useState(false);
	const [demoSeason, setDemoSeason] = useState<demoSeason>('real');
	const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
	const [walkthroughActive, setWalkthroughActive] = useState(false);
	const [profiles, setProfiles] = useState<profileList>(defaultProfiles);
	const [profilesBusy, setProfilesBusy] = useState(false);
	const [freshProfileSetup, setFreshProfileSetup] = useState(false);
	const freshProfileReturnIdRef = useRef<string | null>(null);
	const [standbyOnboardingDone, setStandbyOnboardingDone] = useState(false);
	const [multiviewOnboardingDone, setMultiviewOnboardingDone] = useState(false);
	const [standbyStreamTabId, setStandbyStreamTabId] = useState<number | null>(null);
	const [standbyTabElsewhere, setStandbyTabElsewhere] = useState<Browser.tabs.Tab | null>(null);
	const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);
	const [reviewPromptState, setReviewPromptState] = useState<ReviewPromptState>(normalizeReviewPromptState(null));
	const [settled, setSettled] = useState(false);
	const theme = useTheme(prefsLoaded ? prefs.theme : null);
	const [revealMode, setRevealMode] = useState(resolveOpenRevealMode);
	const [revealCut] = useState(() => resolveOpenRevealCut(revealMode));
	const [allLeagueLogoCache, setAllLeagueLogoCache] = useState<LeagueLogoMap>(seededLeagueLogos);
	const [leagueSchedules, setLeagueSchedules] = useState<LeagueScheduleMap>({});
	const settledRef = useRef(false);
	const saveQueueRef = useRef<Promise<unknown>>(Promise.resolve());
	const { toasts, showToast, dismissToast, pauseToast, resumeToast } = useToast();
	const bossShortcut = useBossShortcut();

	const { data, error, isLoading, mutate } = useSWR('bg-state', () => fetchState(false), {
		revalidateOnFocus: false,
		revalidateOnReconnect: false,
		revalidateIfStale: false,
	});

	const listOnScreen = onboardingDone === true && view === 'main' && !isLoading && settled;
	const revealStartedRef = useRef(false);
	useEffect(() => {
		if (revealMode === 'none') return;
		if (!listOnScreen) {
			if (!revealStartedRef.current) return;
			setRevealMode('none');
			return;
		}
		revealStartedRef.current = true;
		const timer = setTimeout(() => setRevealMode('none'), revealSettleMs(revealMode, revealCut));
		return () => clearTimeout(timer);
	}, [revealMode, revealCut, listOnScreen]);

	const [revealSkipping, setRevealSkipping] = useState(false);
	useEffect(() => {
		if (revealMode === 'none' || revealSkipping) return;
		const skip = () => setRevealSkipping(true);
		window.addEventListener('pointerdown', skip, true);
		window.addEventListener('keydown', skip, true);
		return () => {
			window.removeEventListener('pointerdown', skip, true);
			window.removeEventListener('keydown', skip, true);
		};
	}, [revealMode, revealSkipping]);

	useEffect(() => {
		if (!revealSkipping) return;
		const timer = setTimeout(() => setRevealMode('none'), revealSkipOutMs);
		return () => clearTimeout(timer);
	}, [revealSkipping]);

	useEffect(() => {
		if (!prefsLoaded) return;
		writeOpenRevealEnabled(prefs.openRevealEnabled);
	}, [prefsLoaded, prefs.openRevealEnabled]);

	useEffect(() => {
		let cancelled = false;
		void (async () => {
			try {
				const stored = (await browser.storage.local.get(leagueLogoCacheKey))[leagueLogoCacheKey];
				if (isLeagueLogoCacheFresh(stored, Date.now())) {
					if (cancelled) return;
					setAllLeagueLogoCache(current => ({ ...current, ...stored.logos }));
					setLeagueSchedules(stored.schedules);
					return;
				}
				const { leagueLogos: logos, leagueSchedules: schedules } = await fetchGamesWithLeagueLogos(allLeagueIds, { includeUpcoming: false });
				if (Object.keys(logos).length === 0) return;
				await browser.storage.local.set({ [leagueLogoCacheKey]: { fetchedAt: Date.now(), logos, schedules } });
				if (cancelled) return;
				setAllLeagueLogoCache(current => ({ ...current, ...logos }));
				setLeagueSchedules(schedules);
			} catch {
			}
		})();
		return () => { cancelled = true; };
	}, []);

	const games = useMemo(() => data?.games ?? [], [data?.games]);

	const slateUnvouchable = games.length === 0 && (data?.slateShedLeagues?.length ?? 0) > 0;

	const suggestions = useMemo(() => suggestTabAssignments({
		tabs: openTabs.flatMap<SuggestionTab>(tab => tab.id === undefined || !tab.url
			? []
			: [{ id: tab.id, title: tab.title ?? '', url: tab.url }]),
		games,
		registry,
		dismissed: dismissedSuggestions,
		standbyStreamTabId,
	}), [openTabs, games, registry, dismissedSuggestions, standbyStreamTabId]);
	const scores = useMemo(() => data?.scores ?? [], [data?.scores]);
	const leagueLogos = useMemo<LeagueLogoMap>(
		() => ({ ...allLeagueLogoCache, ...data?.leagueLogos }),
		[allLeagueLogoCache, data?.leagueLogos]
	);
	const scoreHistory = useMemo(() => data?.scoreHistory ?? {}, [data?.scoreHistory]);
	const powerScoreHistory = useMemo(() => data?.powerScoreHistory ?? {}, [data?.powerScoreHistory]);
	const gameBoosts = useMemo(() => data?.gameBoosts ?? {}, [data?.gameBoosts]);
	const onStandbyStream = data?.onStandbyStream ?? false;
	const heldSwitch = data?.heldSwitch ?? null;
	const favoriteTeamIds = useMemo(() => new Set(prefs.favoriteTeamIds), [prefs.favoriteTeamIds]);
	const rivalTeamIds = useMemo(() => new Set(prefs.rivalTeamIds), [prefs.rivalTeamIds]);
	const confettiCanvasRef = useFavoriteScoreConfetti({ games, favoriteTeamIds, stage: popupConfettiStage, onMainView: view === 'main' });

	useEffect(() => {
		const init = async () => {
			setProfiles(await followSyncedProfile().catch(() => defaultProfiles));
			const [{ prefs: normalizedPrefs, hasStored: hasStoredPrefs }, localResult, storedRoster] = await Promise.all([
				loadStoredUserPreferencesWithPresence(),
				browser.storage.local.get({
					demoMode: false,
					demoSeason: 'real',
					onboardingCompleted: null,
					standbyOnboardingDone: false,
					multiviewOnboardingDone: false,
					[reviewPromptStorageKey]: null,
				}),
				loadFantasyRoster().catch(() => []),
			]);
			prefsRef.current = normalizedPrefs;
			fantasyRosterRef.current = storedRoster;
			setFantasyRoster(storedRoster);
			setPrefs(normalizedPrefs);
			setPrefsLoaded(true);
			setDemoMode(localResult.demoMode as boolean);
			setDemoSeason(isDemoSeason(localResult.demoSeason) ? localResult.demoSeason : 'real');
			setStandbyOnboardingDone(localResult.standbyOnboardingDone as boolean);
			setMultiviewOnboardingDone(localResult.multiviewOnboardingDone === true);
			setReviewPromptState(normalizeReviewPromptState(localResult[reviewPromptStorageKey]));

			const onboardingFlag = localResult.onboardingCompleted === true;
			if (!onboardingFlag && hasStoredPrefs) {
				void browser.storage.local.set({ onboardingCompleted: true });
				setOnboardingDone(true);
			} else {
				setOnboardingDone(onboardingFlag);
			}
		};

		void init();

		browser.storage.session.get({
			tabRegistry: [],
			standbyStreamTabId: null,
			[tabSuggestionDismissalsKey]: [],
			[finishedTabNoticeKey]: null,
		}).then(result => {
			setRegistry(result.tabRegistry as TabRegistration[]);
			setStandbyStreamTabId((result.standbyStreamTabId as number | null) ?? null);
			setDismissedSuggestions(normalizeDismissedSuggestions(result[tabSuggestionDismissalsKey]));

			const finishedTabs = normalizeFinishedTabNotice(result[finishedTabNoticeKey]);
			if (!finishedTabs) return;
			if (finishedTabs.freed > 0) showToast(i18n.t('finishedTabs.toastFreed', finishedTabs.freed), 'info');
			if (finishedTabs.closed > 0) showToast(i18n.t('finishedTabs.toastClosed', finishedTabs.closed), 'info');
			void browser.storage.session.remove(finishedTabNoticeKey);
		});

		void browser.tabs.query({ currentWindow: true }).then(tabs => {
			setOpenTabs(tabs.filter(tab => tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('about:')));
		});

		const lookupStandbyElsewhere = async () => {
			const { standbyStreamTabId: savedId } = await browser.storage.session.get({ standbyStreamTabId: null });
			if (typeof savedId !== 'number') return;
			const tab = await browser.tabs.get(savedId).catch(() => null);
			if (tab) setStandbyTabElsewhere(tab);
		};
		void lookupStandbyElsewhere();

		const settleTimer = setTimeout(() => {
			if (!settledRef.current) { settledRef.current = true; setSettled(true); }
		}, 5000);

		const handleMessage = (msg: unknown) => {
			if (!isScoreUpdateMessage(msg)) return;
			mutate(normalizeBackgroundState(msg), { revalidate: false });
			if (!settledRef.current) { settledRef.current = true; setSettled(true); }
		};
		browser.runtime.onMessage.addListener(handleMessage);
		const handleSessionChange = (changes: Record<string, { newValue?: unknown }>) => {
			if (changes.tabRegistry) setRegistry((changes.tabRegistry.newValue as TabRegistration[] | undefined) ?? []);
		};
		browser.storage.session.onChanged.addListener(handleSessionChange);
		return () => {
			clearTimeout(settleTimer);
			browser.runtime.onMessage.removeListener(handleMessage);
			browser.storage.session.onChanged.removeListener(handleSessionChange);
		};
	}, [mutate, showToast]);

	useEffect(() => {
		if (data && !settledRef.current) { settledRef.current = true; setSettled(true); }
	}, [data]);

	useEffect(() => {
		if (view !== 'detail' || !selectedGameId) return;
		const selectedGameExists = games.some(game => game.id === selectedGameId);
		if (selectedGameExists) return;
		setSelectedGameId(null);
		setView('main');
	}, [games, selectedGameId, view]);

	const afterPendingSaves = () => saveQueueRef.current.catch(() => {});

	const queueSave = <T,>(task: () => Promise<T>) => {
		const queued = afterPendingSaves().then(task);
		saveQueueRef.current = queued;
		return queued;
	};

	const persistPrefs = (nextPrefs: UserPreferences | ((currentPrefs: UserPreferences) => UserPreferences)) => {
		const rawNextPrefs = typeof nextPrefs === 'function' ? nextPrefs(prefsRef.current) : nextPrefs;
		const normalized = normalizeUserPreferences(rawNextPrefs);
		prefsRef.current = normalized;
		setPrefs(normalized);
		const syncPromise = queueSave(() => saveUserPrefs(normalized));
		void syncPromise.catch(() => {});
	};

	const multiviewToggle = useMultiviewToggle(
		prefs.multiviewEnabled,
		enabled => persistPrefs(currentPrefs => ({ ...currentPrefs, multiviewEnabled: enabled })),
	);

	const pressBossButton = () => {
		const paused = { ...prefsRef.current, enabled: false };
		prefsRef.current = paused;
		setPrefs(paused);
		afterPendingSaves()
			.then(() => browser.runtime.sendMessage({ type: 'BOSS_BUTTON' } satisfies ExtensionMessage))
			.catch(() => {})
			.finally(() => window.close());
	};

	const onOnboardingComplete = (leagues: LeagueId[], favorites: string[]) => {
		persistPrefs(currentPrefs => ({ ...currentPrefs, enabledLeagues: leagues, favoriteTeamIds: favorites }));
		void browser.storage.local.set({ onboardingCompleted: true });
		showToast(i18n.t('app.welcomeToast'), 'success');
		settledRef.current = false;
		setSettled(false);
		setOnboardingDone(true);
		void (async () => {
			await afterPendingSaves();
			const refreshed = await fetchState(true);
			mutate(refreshed, { revalidate: false });
			if (!settledRef.current) { settledRef.current = true; setSettled(true); }
		})();
	};

	const adoptLiveSetup = async () => {
		const [nextPrefs, nextRoster] = await Promise.all([loadStoredUserPreferencesWithPresence(), loadFantasyRoster().catch(() => [])]);
		prefsRef.current = nextPrefs.prefs;
		fantasyRosterRef.current = nextRoster;
		setPrefs(nextPrefs.prefs);
		setFantasyRoster(nextRoster);
		settingsOnOpenRef.current = settingsSnapshot();
	};

	const runProfileChange = (change: () => Promise<profileList>, toast?: (list: profileList) => string) => {
		setProfilesBusy(true);
		const done = queueSave(async () => {
			const list = await change();
			setProfiles(list);
			await adoptLiveSetup();
			if (toast) showToast(toast(list), 'success');
		});
		void done.catch(() => showToast(i18n.t('profiles.changeFailed'), 'error')).finally(() => setProfilesBusy(false));
		return done;
	};

	const profileActions = {
		onSwitch: (id: string) => {
			void runProfileChange(() => switchProfile(id), list => i18n.t('profiles.switchedToast', { name: activeProfileName(list) }));
		},
		onCreate: (name: string, fresh: boolean) => {
			const previousId = profiles.activeId;
			const blank = fresh ? { prefs: { ...createDefaultUserPreferences(), theme: prefsRef.current.theme }, fantasyRoster: [] } : undefined;
			void runProfileChange(() => createProfile(name, blank), fresh ? undefined : list => i18n.t('profiles.switchedToast', { name: activeProfileName(list) }))
				.then(() => {
					if (!fresh) return;
					freshProfileReturnIdRef.current = previousId;
					setFreshProfileSetup(true);
				}, () => {});
		},
		onRename: (id: string, name: string) => {
			void runProfileChange(() => renameProfile(id, name));
		},
		onDelete: (id: string) => {
			void runProfileChange(() => deleteProfile(id));
		},
	};

	const followRemoteSwitchRef = useRef(() => {});
	followRemoteSwitchRef.current = () => { void runProfileChange(followSyncedProfile); };
	useEffect(() => {
		const onSyncChanged = (changes: Record<string, unknown>) => {
			if (activeProfileSyncKey in changes) followRemoteSwitchRef.current();
		};
		browser.storage.sync.onChanged.addListener(onSyncChanged);
		return () => browser.storage.sync.onChanged.removeListener(onSyncChanged);
	}, []);

	const onFreshProfileLeave = () => {
		const returnToId = freshProfileReturnIdRef.current;
		freshProfileReturnIdRef.current = null;
		setFreshProfileSetup(false);
		if (returnToId) void runProfileChange(() => abandonProfile(profiles.activeId, returnToId));
	};

	const onFreshProfileComplete = (leagues: LeagueId[], favorites: string[]) => {
		persistPrefs(currentPrefs => ({ ...currentPrefs, enabledLeagues: leagues, favoriteTeamIds: favorites }));
		settingsOnOpenRef.current = settingsSnapshot();
		freshProfileReturnIdRef.current = null;
		setFreshProfileSetup(false);
		showToast(i18n.t('profiles.switchedToast', { name: activeProfileName(profiles) }), 'success');
		closeSetup();
	};

	const onToggleLeague = (leagueId: LeagueId) => {
		persistPrefs(currentPrefs => {
			const enabledLeagues = currentPrefs.enabledLeagues.includes(leagueId)
				? currentPrefs.enabledLeagues.filter(id => id !== leagueId)
				: insertLeagueAtDefaultPosition(currentPrefs.enabledLeagues, leagueId);
			return { ...currentPrefs, enabledLeagues };
		});
	};

	const onToggleSport = (sport: SportType, selectAll: boolean) => {
		persistPrefs(currentPrefs => {
			const sportLeagueIds = leaguesBySportType[sport].map(l => l.id);
			const enabledLeagues = selectAll
				? sportLeagueIds.reduce(insertLeagueAtDefaultPosition, currentPrefs.enabledLeagues)
				: currentPrefs.enabledLeagues.filter(id => !sportLeagueIds.includes(id));
			return { ...currentPrefs, enabledLeagues };
		});
	};

	const onReorderLeague = (fromIndex: number, toIndex: number) => {
		persistPrefs(currentPrefs => ({
			...currentPrefs,
			enabledLeagues: moveLeague(currentPrefs.enabledLeagues, fromIndex, toIndex),
		}));
	};

	const onResetLeagueOrder = () => {
		persistPrefs(currentPrefs => ({
			...currentPrefs,
			enabledLeagues: currentPrefs.enabledLeagues.toSorted((a, b) => leagueOrder[a] - leagueOrder[b]),
		}));
	};

	const onCollegeFilterChange = (leagueId: CollegeLeagueId, filter: CollegeFilter) => {
		persistPrefs(currentPrefs => ({
			...currentPrefs,
			collegeFilters: withCollegeFilter(currentPrefs.collegeFilters, leagueId, filter),
		}));
	};

	const onToggleSignal = (signal: SignalName) => {
		persistPrefs(currentPrefs => toggleModeSignal(currentPrefs, 'classic', signal));
	};

	const onFantasyRosterChange = (update: (current: FantasyRosterEntry[]) => FantasyRosterEntry[]) => {
		const next = update(fantasyRosterRef.current);
		fantasyRosterRef.current = next;
		setFantasyRoster(next);
		queueSave(() => saveFantasyRoster(next));
	};

	const onRegistryChange = (updated: TabRegistration[]) => {
		setRegistry(updated);
		void browser.storage.session.set({ tabRegistry: updated });
		void browser.runtime.sendMessage({ type: 'UPDATE_REGISTRY', tabRegistry: updated } satisfies ExtensionMessage);
	};

	const retireShownSuggestions = () => {
		const updated = dismissSuggestions(dismissedSuggestions, suggestions);
		setDismissedSuggestions(updated);
		void browser.storage.session.set({ [tabSuggestionDismissalsKey]: updated });
	};

	const onApplySuggestions = (accepted: TabSuggestion[]) => {
		onRegistryChange(applyTabSuggestions(registry, accepted));
		retireShownSuggestions();
		setView('main');
		showToast(i18n.t('suggest.toastApplied', accepted.length), 'success');
	};

	const onDismissSuggestions = () => {
		retireShownSuggestions();
		setView('main');
	};

	const toggleFavoriteTeam = (leagueId: LeagueId, teamId: string) => {
		const favoriteTeamKey = createFavoriteTeamKey(leagueId, teamId);
		persistPrefs(currentPrefs => {
			const current = new Set(currentPrefs.favoriteTeamIds);
			if (current.has(favoriteTeamKey)) current.delete(favoriteTeamKey);
			else current.add(favoriteTeamKey);
			return { ...currentPrefs, favoriteTeamIds: [...current], rivalTeamIds: currentPrefs.rivalTeamIds.filter(key => key !== favoriteTeamKey) };
		});
	};

	const toggleRivalTeam = (leagueId: LeagueId, teamId: string) => {
		const rivalTeamKey = createFavoriteTeamKey(leagueId, teamId);
		persistPrefs(currentPrefs => {
			const current = new Set(currentPrefs.rivalTeamIds);
			if (current.has(rivalTeamKey)) current.delete(rivalTeamKey);
			else current.add(rivalTeamKey);
			return { ...currentPrefs, rivalTeamIds: [...current], favoriteTeamIds: currentPrefs.favoriteTeamIds.filter(key => key !== rivalTeamKey) };
		});
	};

	const onSetStandbyTab = (tabId: number | null) => {
		setStandbyStreamTabId(tabId);
		void browser.runtime.sendMessage({ type: 'SET_STANDBY_STREAM_TAB', tabId } satisfies ExtensionMessage);
	};

	const onStandbyOnboardingDone = () => {
		setStandbyOnboardingDone(true);
		void browser.storage.local.set({ standbyOnboardingDone: true });
	};

	const onMultiviewOnboardingDone = () => {
		setMultiviewOnboardingDone(true);
		void browser.storage.local.set({ multiviewOnboardingDone: true });
	};

	const settingsSnapshot = () => JSON.stringify([prefsRef.current, demoMode, demoSeason, standbyStreamTabId, fantasyRosterRef.current]);
	const settingsOnOpenRef = useRef('');

	const openSetup = () => {
		settingsOnOpenRef.current = settingsSnapshot();
		setView('setup');
	};

	const closeSetup = () => {
		setView('main');
		if (settingsSnapshot() !== settingsOnOpenRef.current) showToast(i18n.t('app.settingsSavedToast'), 'success');
		void (async () => {
			await afterPendingSaves();
			const refreshed = await fetchState(true);
			mutate(refreshed, { revalidate: false });
		})();
	};

	const openGameDetail = (gameId: string) => {
		setSelectedGameId(gameId);
		setView('detail');
	};

	const persistReviewPromptState = (nextState: ReviewPromptState) => {
		setReviewPromptState(nextState);
		void browser.storage.local.set({ [reviewPromptStorageKey]: nextState });
	};

	const dismissReviewPrompt = () => {
		persistReviewPromptState(markReviewPromptDismissed(reviewPromptState));
	};

	const leaveReview = () => {
		persistReviewPromptState(markReviewPromptReviewed(reviewPromptState));
		void browser.tabs.create({
			url: getReviewPromptUrl(browser.runtime.id, navigator.userAgent),
		});
	};

	const selectedGame = selectedGameId ? games.find(game => game.id === selectedGameId) : undefined;
	const selectedScore = selectedGameId ? scores.find(score => score.gameId === selectedGameId) : undefined;
	const selectedScoreHistory = (selectedGameId && scoreHistory[selectedGameId]) || noSnapshots;
	const selectedPowerScoreHistory = (selectedGameId && powerScoreHistory[selectedGameId]) || noPowerScoreSnapshots;

	if (onboardingDone === null) return <div className='popup-root' />;

	if (onboardingDone === false) {
		return (
			<TranslationContext.Provider value={i18n.t}>
				<OnboardingView
					leagueLogos={leagueLogos}
					onComplete={onOnboardingComplete}
					onStartWalkthrough={(leagues, favorites) => {
						onOnboardingComplete(leagues, favorites);
						setWalkthroughActive(true);
					}}
				/>
			</TranslationContext.Provider>
		);
	}

	if (freshProfileSetup) {
		return (
			<TranslationContext.Provider value={i18n.t}>
				<OnboardingView
					leagueLogos={leagueLogos}
					startStep={2}
					onComplete={onFreshProfileComplete}
					onLeave={onFreshProfileLeave}
				/>
			</TranslationContext.Provider>
		);
	}

	if (walkthroughActive) {
		return (
			<TranslationContext.Provider value={i18n.t}>
				<WalkthroughView onComplete={() => setWalkthroughActive(false)} leagues={prefs.enabledLeagues} scoringMode={prefs.scoringMode} />
			</TranslationContext.Provider>
		);
	}

	return (
		<TranslationContext.Provider value={i18n.t}>
		<StaleLeaguesProvider shedLeagues={data?.slateShedLeagues} lastGoodAt={data?.leagueLastGoodAt} stuckSince={data?.stuckSince}>
		<div className='popup-root'>
			<canvas ref={confettiCanvasRef} className='popup-confetti-canvas' aria-hidden='true' />
			<ToastContainer toasts={toasts} onDismiss={dismissToast} onPause={pauseToast} onResume={resumeToast} />
			<div key={view} className={`popup-view-shell${navigated ? '' : ' is-opening-view'}${viewSlide === 'back' ? ' is-returning' : ''}`}>
				{view === 'setup' && (
					<SetupView
						prefs={prefs}
						prefsLoaded={prefsLoaded}
						demoMode={demoMode}
						demoSeason={demoSeason}
						leagueLogos={leagueLogos}
						leagueSchedules={leagueSchedules}
						favoriteTeamIds={favoriteTeamIds}
						standbyStreamTabId={standbyStreamTabId}
						standbyTabElsewhere={standbyTabElsewhere}
						standbyOnboardingDone={standbyOnboardingDone}
						openTabs={openTabs}
						registry={registry}
						formatTabLabel={tab => formatTabLabel(tab, openTabs)}
						onClose={closeSetup}
						onSensitivityChange={val => persistPrefs(currentPrefs => ({ ...currentPrefs, sensitivity: val as UserPreferences['sensitivity'] }))}
						onCooldownChange={val => persistPrefs(currentPrefs => ({ ...currentPrefs, cooldownSeconds: val }))}
						onSwitchDelayChange={val => persistPrefs(currentPrefs => ({ ...currentPrefs, switchDelaySeconds: val }))}
						onToggleContentAwareSwitching={() => persistPrefs(currentPrefs => ({ ...currentPrefs, contentAwareSwitching: !currentPrefs.contentAwareSwitching }))}
						onFavoriteTeamBonusChange={val => persistPrefs(currentPrefs => ({ ...currentPrefs, favoriteTeamBonusPoints: val }))}
						onToggleFavoriteTeam={toggleFavoriteTeam}
						rivalTeamIds={rivalTeamIds}
						onToggleRivalTeam={toggleRivalTeam}
						onToggleLeague={onToggleLeague}
						onToggleSport={onToggleSport}
						onReorderLeague={onReorderLeague}
						onResetLeagueOrder={onResetLeagueOrder}
						onCollegeFilterChange={onCollegeFilterChange}
						onToggleGroupByLeague={() => persistPrefs(currentPrefs => ({ ...currentPrefs, groupByLeague: !currentPrefs.groupByLeague }))}
						onToggleShowUpcoming={() => persistPrefs(currentPrefs => ({ ...currentPrefs, showUpcomingGames: !currentPrefs.showUpcomingGames }))}
						onToggleKeepFinalGames={() => persistPrefs(currentPrefs => ({ ...currentPrefs, keepFinalGames: !currentPrefs.keepFinalGames }))}
						onFinishedTabActionChange={action => persistPrefs(currentPrefs => ({ ...currentPrefs, finishedTabAction: action }))}
						onThemeChange={choice => persistPrefs(currentPrefs => ({ ...currentPrefs, theme: choice }))}
						onUpcomingGamesDaysChange={val => persistPrefs(currentPrefs => ({ ...currentPrefs, upcomingGamesDays: val }))}
						onToggleProTips={() => persistPrefs(currentPrefs => ({ ...currentPrefs, proTipsEnabled: !currentPrefs.proTipsEnabled }))}
						onToggleNotifications={() => persistPrefs(currentPrefs => ({ ...currentPrefs, notificationsEnabled: !currentPrefs.notificationsEnabled }))}
						bossShortcut={bossShortcut}
						onBossDecoyChange={url => persistPrefs(currentPrefs => ({ ...currentPrefs, bossDecoyUrl: url }))}
						onToggleDemo={() => {
							const next = !demoMode;
							setDemoMode(next);
							void browser.runtime.sendMessage({ type: 'SET_DEMO_MODE', enabled: next } satisfies ExtensionMessage);
						}}
						onDemoSeasonChange={season => {
							setDemoSeason(season);
							void browser.storage.local.set({ demoSeason: season });
						}}
						onToggleStandbyStream={() => persistPrefs(currentPrefs => ({ ...currentPrefs, standbyStreamEnabled: !currentPrefs.standbyStreamEnabled }))}
						onStandbyThresholdChange={val => persistPrefs(currentPrefs => ({ ...currentPrefs, standbyStreamThreshold: val }))}
						onSetStandbyTab={onSetStandbyTab}
						onStandbyOnboardingDone={onStandbyOnboardingDone}
						multiviewAvailable={multiviewToggle.available}
						multiviewOn={multiviewToggle.on}
						multiviewOnboardingDone={multiviewOnboardingDone}
						onMultiviewOnboardingDone={onMultiviewOnboardingDone}
						onToggleMultiview={multiviewToggle.toggle}
						onMultiviewThresholdChange={val => persistPrefs(currentPrefs => ({ ...currentPrefs, multiviewThreshold: val }))}
						onMultiviewGamesChange={choice => persistPrefs(currentPrefs => ({ ...currentPrefs, multiviewGames: choice }))}
						onMultiviewMaxBoxesChange={val => persistPrefs(currentPrefs => ({ ...currentPrefs, multiviewMaxBoxes: val }))}
						onToggleBetting={() => persistPrefs(currentPrefs => ({ ...currentPrefs, bettingEnabled: !currentPrefs.bettingEnabled }))}
						onToggleTemperatureUnit={() => persistPrefs(currentPrefs => ({ ...currentPrefs, temperatureUnit: nextTemperatureUnit(currentPrefs.temperatureUnit, currentPrefs.romerUnlocked) }))}
						onUnlockRomer={() => persistPrefs(currentPrefs => ({ ...currentPrefs, romerUnlocked: true, temperatureUnit: 'Ro' }))}
						onToggleOpenReveal={() => persistPrefs(currentPrefs => ({ ...currentPrefs, openRevealEnabled: !currentPrefs.openRevealEnabled }))}
						onToggleHolidayDecorations={() => persistPrefs(currentPrefs => ({ ...currentPrefs, holidayDecorationsEnabled: !currentPrefs.holidayDecorationsEnabled }))}
						onToggleHolidaySnow={() => persistPrefs(currentPrefs => ({ ...currentPrefs, holidaySnowEnabled: !currentPrefs.holidaySnowEnabled }))}
						onToggleHolidayLights={() => persistPrefs(currentPrefs => ({ ...currentPrefs, holidayLightsEnabled: !currentPrefs.holidayLightsEnabled }))}
						onToggleHolidayLeaves={() => persistPrefs(currentPrefs => ({ ...currentPrefs, holidayLeavesEnabled: !currentPrefs.holidayLeavesEnabled }))}
						onToggleHolidayChristmas={() => persistPrefs(currentPrefs => ({ ...currentPrefs, holidayChristmasEnabled: !currentPrefs.holidayChristmasEnabled }))}
						onToggleHolidayBunting={() => persistPrefs(currentPrefs => ({ ...currentPrefs, holidayBuntingEnabled: !currentPrefs.holidayBuntingEnabled }))}
						onToggleHolidayFireworks={() => persistPrefs(currentPrefs => ({ ...currentPrefs, holidayFireworksEnabled: !currentPrefs.holidayFireworksEnabled }))}
						onPostseasonBoostChange={val => persistPrefs(currentPrefs => ({ ...currentPrefs, postseasonBoostPoints: val }))}
						onToggleSignal={onToggleSignal}
						onToggleModeSignal={(mode, signal) => persistPrefs(currentPrefs => toggleModeSignal(currentPrefs, mode, signal))}
						onScoringModeChange={mode => persistPrefs(currentPrefs => ({ ...currentPrefs, scoringMode: mode }))}
						onLeagueModeChange={(league, mode) => persistPrefs(currentPrefs => ({ ...currentPrefs, leagueModes: withLeagueMode(currentPrefs.leagueModes, league, mode) }))}
						onFantasyBlendChange={value => persistPrefs(currentPrefs => ({ ...currentPrefs, fantasyBlend: value }))}
						onFantasyRuleChange={(sport, rule, points) => persistPrefs(currentPrefs => ({ ...currentPrefs, fantasyScoring: withFantasyRule(currentPrefs.fantasyScoring, sport, rule, points) }))}
						onFantasyRulesReset={sport => persistPrefs(currentPrefs => ({ ...currentPrefs, fantasyScoring: withoutFantasySport(currentPrefs.fantasyScoring, sport) }))}
						fantasyRoster={fantasyRoster}
						onFantasyRosterChange={onFantasyRosterChange}
						profiles={profiles}
						profilesBusy={profilesBusy}
						profileActions={profileActions}
					/>
				)}
				{view === 'main' && (
					<MainView
						prefs={prefs}
						prefsLoaded={prefsLoaded}
						isLoading={isLoading || !settled}
						hasError={Boolean(error && !data) || slateUnvouchable}
						onRefresh={() => mutate(() => fetchState(true), { revalidate: false })}
						games={games}
						scores={scores}
						leagueLogos={leagueLogos}
						leagueSchedules={leagueSchedules}
						registry={registry}
						favoriteTeamIds={favoriteTeamIds}
						gameBoosts={gameBoosts}
						openTabs={openTabs}
						standbyStreamTabId={standbyStreamTabId}
						onStandbyStream={onStandbyStream}
						heldSwitch={heldSwitch}
						onOpenGameDetail={openGameDetail}
						onOpenSetup={openSetup}
						suggestionCount={suggestions.length}
						onReviewSuggestions={() => setView('suggest')}
						onDismissSuggestions={onDismissSuggestions}
						onStartWalkthrough={() => setWalkthroughActive(true)}
						onOpenGuide={openGuide}
						showReviewPrompt={shouldShowReviewPrompt(reviewPromptState)}
						onToggleEnabled={() => persistPrefs(currentPrefs => ({ ...currentPrefs, enabled: !currentPrefs.enabled }))}
						onBossButton={pressBossButton}
						bossShortcut={bossShortcut}
						onDismissReviewPrompt={dismissReviewPrompt}
						onLeaveReview={leaveReview}
						onToggleFavoriteTeam={toggleFavoriteTeam}
						onRegistryChange={onRegistryChange}
						formatTabLabel={tab => formatTabLabel(tab, openTabs)}
						scrollOffsetRef={mainScrollOffset}
						selectedDayKey={selectedDayKey}
						onSelectDay={setSelectedDayKey}
						upcomingQuery={upcomingQuery}
						onUpcomingQueryChange={setUpcomingQuery}
						revealMode={revealMode}
						revealCut={revealCut}
						revealSkipping={revealSkipping}
					/>
				)}
				{view === 'suggest' && (
					<SuggestView
						suggestions={suggestions}
						games={games}
						openTabs={openTabs}
						formatTabLabel={tab => formatTabLabel(tab, openTabs)}
						onApply={onApplySuggestions}
						onBack={() => setView('main')}
					/>
				)}
				{view === 'detail' && selectedGame && (
					<GameDetailView
						game={selectedGame}
						excitementResult={selectedScore}
						scoreHistory={selectedScoreHistory}
						powerScoreHistory={selectedPowerScoreHistory}
						proTipsEnabled={prefs.proTipsEnabled}
						gameBoosts={gameBoosts}
						bettingPrefs={{
							bettingEnabled: prefs.bettingEnabled,
						}}
						weatherPrefs={{
							temperatureUnit: prefs.temperatureUnit,
						}}
						decorationPrefs={{
							holidayDecorationsEnabled: prefs.holidayDecorationsEnabled,
							holidaySnowEnabled: prefs.holidaySnowEnabled,
							holidayLightsEnabled: prefs.holidayLightsEnabled,
							holidayLeavesEnabled: prefs.holidayLeavesEnabled,
							holidayChristmasEnabled: prefs.holidayChristmasEnabled,
							holidayBuntingEnabled: prefs.holidayBuntingEnabled,
							holidayFireworksEnabled: prefs.holidayFireworksEnabled,
						}}
						decorationDate={resolveDecorationDate(new Date(), demoMode ? demoSeason : 'real')}
						disabledSignals={prefs.disabledSignals}
						fantasyRoster={fantasyRoster}
						favoriteTeamIds={favoriteTeamIds}
						openTabs={openTabs}
						registry={registry}
						standbyStreamTabId={standbyStreamTabId}
						onToggleFavoriteTeam={toggleFavoriteTeam}
						onRegistryChange={onRegistryChange}
						formatTabLabel={tab => formatTabLabel(tab, openTabs)}
						onSetGameBoost={onSetGameBoost}
						onBack={() => setView('main')}
						theme={theme}
					/>
				)}
				{view === 'detail' && !selectedGame && (
					<div className='popup-container d-flex flex-column justify-content-center align-items-center gap-3'>
						<div className='fw-bold fg-body'>{i18n.t('app.gameDetailsUnavailable')}</div>
						<button type='button' className='btn btn-sm btn-solid theme-primary' onClick={() => setView('main')}>{i18n.t('app.backToGames')}</button>
					</div>
				)}
			</div>
		</div>
		</StaleLeaguesProvider>
		</TranslationContext.Provider>
	);
};
