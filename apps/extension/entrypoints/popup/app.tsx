import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { fetchLeagueLogos } from '@arenaswap/core';
import { allLeagueIds, allSignalNames, createDefaultUserPreferences, createFavoriteTeamKey, normalizeUserPreferences } from '@arenaswap/core/constants';
import type { LeagueId, LeagueLogoMap, SignalName, SportType, TabRegistration, UserPreferences } from '@arenaswap/core/types';
import type { Browser } from 'wxt/browser';
import GameDetailView from './components/gameDetailView';
import MainView from './components/mainView';
import OnboardingView from './components/onboardingView';
import SetupView from './components/setupView';
import WalkthroughView from './components/walkthroughView';
import ToastContainer from './components/toastContainer';
import { fetchState, formatTabLabel, insertLeagueAtDefaultPosition, leagueOrder, leaguesBySportType, moveLeague, normalizeBackgroundState, popupView } from './popupHelpers';
import { i18n } from '#i18n';
import { TranslationContext } from '@arenaswap/ui/src/components/i18nContext';
import useFavoriteScoreConfetti from './useFavoriteScoreConfetti';
import useToast from './useToast';
import { hasStoredUserPreferences, loadStoredUserPreferences, persistStoredUserPreferences } from '../../utils/prefsStorage';
import type { ReviewPromptState } from '../../utils/reviewPrompt';
import {
	getReviewPromptUrl,
	markReviewPromptDismissed,
	markReviewPromptReviewed,
	normalizeReviewPromptState,
	reviewPromptStorageKey,
	shouldShowReviewPrompt,
} from '../../utils/reviewPrompt';

const onSetGameBoost = (gameId: string, boost: number) => {
	void browser.runtime.sendMessage({ type: 'SET_GAME_BOOST', gameId, boost });
};

const isScoreUpdateMessage = (value: unknown): value is { type: 'SCORES_UPDATED' } => (
	typeof value === 'object'
	&& value !== null
	&& 'type' in value
	&& (value as { type?: unknown }).type === 'SCORES_UPDATED'
);

export default () => {
	const [view, setView] = useState<popupView>('main');
	const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
	const [prefs, setPrefs] = useState<UserPreferences>(createDefaultUserPreferences());
	const prefsRef = useRef<UserPreferences>(createDefaultUserPreferences());
	const [prefsLoaded, setPrefsLoaded] = useState(false);
	const [registry, setRegistry] = useState<TabRegistration[]>([]);
	const [openTabs, setOpenTabs] = useState<Browser.tabs.Tab[]>([]);
	const [demoMode, setDemoMode] = useState(false);
	const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
	const [walkthroughActive, setWalkthroughActive] = useState(false);
	const [standbyOnboardingDone, setStandbyOnboardingDone] = useState(false);
	const [standbyStreamTabId, setStandbyStreamTabId] = useState<number | null>(null);
	const [reviewPromptState, setReviewPromptState] = useState<ReviewPromptState>(normalizeReviewPromptState(null));
	const [settled, setSettled] = useState(false);
	const [allLeagueLogoCache, setAllLeagueLogoCache] = useState<LeagueLogoMap>({});
	const settledRef = useRef(false);
	const prefsSyncRef = useRef<Promise<void>>(Promise.resolve());
	const { toasts, showToast, dismissToast } = useToast();

	// Updates arrive by push, so revalidation is off: a second SWR fetch (StrictMode remount or
	// a React 19 store re-snapshot) would overwrite data that came in via SCORES_UPDATED.
	const { data, error, isLoading, mutate } = useSWR('bg-state', () => fetchState(false), {
		revalidateOnFocus: false,
		revalidateOnReconnect: false,
		revalidateIfStale: false,
	});

	// The onboarding and settings pickers show every league, not just the enabled ones.
	useEffect(() => {
		void fetchLeagueLogos(allLeagueIds, { includeUpcoming: false })
			.then(logos => setAllLeagueLogoCache(logos))
			.catch(() => {});
	}, []);

	const games = useMemo(() => data?.games ?? [], [data?.games]);
	const scores = useMemo(() => data?.scores ?? [], [data?.scores]);
	const leagueLogos = useMemo<LeagueLogoMap>(
		() => ({ ...allLeagueLogoCache, ...data?.leagueLogos }),
		[allLeagueLogoCache, data?.leagueLogos]
	);
	const scoreHistory = useMemo(() => data?.scoreHistory ?? {}, [data?.scoreHistory]);
	const powerScoreHistory = useMemo(() => data?.powerScoreHistory ?? {}, [data?.powerScoreHistory]);
	const gameBoosts = useMemo(() => data?.gameBoosts ?? {}, [data?.gameBoosts]);
	const onStandbyStream = data?.onStandbyStream ?? false;
	const favoriteTeamIds = useMemo(() => new Set(prefs.favoriteTeamIds), [prefs.favoriteTeamIds]);
	const confettiCanvasRef = useFavoriteScoreConfetti({ games, favoriteTeamIds });

	useEffect(() => {
		const init = async () => {
			const normalizedPrefs = await loadStoredUserPreferences();
			prefsRef.current = normalizedPrefs;
			setPrefs(normalizedPrefs);
			setPrefsLoaded(true);

			const localResult = await browser.storage.local.get({
				demoMode: false,
				onboardingCompleted: null,
				standbyOnboardingDone: false,
				[reviewPromptStorageKey]: null,
			});
			setDemoMode(localResult.demoMode as boolean);
			setStandbyOnboardingDone(localResult.standbyOnboardingDone as boolean);
			setReviewPromptState(normalizeReviewPromptState(localResult[reviewPromptStorageKey]));

			const onboardingFlag = localResult.onboardingCompleted === true;
			const hasStoredPrefs = await hasStoredUserPreferences();
			if (!onboardingFlag && hasStoredPrefs) {
				void browser.storage.local.set({ onboardingCompleted: true });
				setOnboardingDone(true);
			} else {
				setOnboardingDone(onboardingFlag);
			}
		};

		void init();

		browser.storage.session.get({ tabRegistry: [], standbyStreamTabId: null }).then(result => {
			setRegistry(result.tabRegistry as TabRegistration[]);
			setStandbyStreamTabId((result.standbyStreamTabId as number | null) ?? null);
		});

		void browser.tabs.query({ currentWindow: true }).then(tabs => {
			setOpenTabs(tabs.filter(tab => tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('about:')));
		});

		// Fallback for when no SCORES_UPDATED ever arrives.
		const settleTimer = setTimeout(() => {
			if (!settledRef.current) { settledRef.current = true; setSettled(true); }
		}, 5000);

		const handleMessage = (msg: unknown) => {
			if (!isScoreUpdateMessage(msg)) return;
			mutate(normalizeBackgroundState(msg), { revalidate: false });
			if (!settledRef.current) { settledRef.current = true; setSettled(true); }
		};
		browser.runtime.onMessage.addListener(handleMessage);
		return () => {
			clearTimeout(settleTimer);
			browser.runtime.onMessage.removeListener(handleMessage);
		};
	}, [mutate]);

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

	const persistPrefs = (nextPrefs: UserPreferences | ((currentPrefs: UserPreferences) => UserPreferences)) => {
		const rawNextPrefs = typeof nextPrefs === 'function' ? nextPrefs(prefsRef.current) : nextPrefs;
		const normalized = normalizeUserPreferences(rawNextPrefs);
		prefsRef.current = normalized;
		setPrefs(normalized);
		const syncPromise = prefsSyncRef.current.catch(() => {}).then(async () => {
			await persistStoredUserPreferences(normalized);
			await browser.runtime.sendMessage({ type: 'UPDATE_PREFS', prefs: normalized });
		});
		prefsSyncRef.current = syncPromise;
		void syncPromise.catch(() => {});
	};

	const onOnboardingComplete = (leagues: LeagueId[], favorites: string[]) => {
		persistPrefs(currentPrefs => ({ ...currentPrefs, enabledLeagues: leagues, favoriteTeamIds: favorites }));
		void browser.storage.local.set({ onboardingCompleted: true });
		showToast(i18n.t('app.welcomeToast'), 'success');
		// `settled` is already true from the initial fetch, which ran during onboarding with no
		// leagues, so without this reset MainView flashes "no games" on the first transition.
		settledRef.current = false;
		setSettled(false);
		setOnboardingDone(true);
		void (async () => {
			await prefsSyncRef.current.catch(() => {});
			const refreshed = await fetchState(true);
			mutate(refreshed, { revalidate: false });
			if (!settledRef.current) { settledRef.current = true; setSettled(true); }
		})();
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


	const onToggleSignal = (signal: SignalName) => {
		persistPrefs(currentPrefs => {
			const current = new Set(currentPrefs.disabledSignals);
			if (current.has(signal)) {
				current.delete(signal);
			} else {
				const wouldRemainEnabled = allSignalNames.filter(s => !current.has(s) && s !== signal).length;
				if (wouldRemainEnabled === 0) return currentPrefs;
				current.add(signal);
			}
			return { ...currentPrefs, disabledSignals: [...current] };
		});
	};

	const onRegistryChange = (updated: TabRegistration[]) => {
		setRegistry(updated);
		void browser.storage.session.set({ tabRegistry: updated });
		void browser.runtime.sendMessage({ type: 'UPDATE_REGISTRY', tabRegistry: updated });
	};

	// Shared by the game list and the pre-game poster's stars, so the two can't drift.
	const toggleFavoriteTeam = (leagueId: LeagueId, teamId: string) => {
		const favoriteTeamKey = createFavoriteTeamKey(leagueId, teamId);
		persistPrefs(currentPrefs => {
			const current = new Set(currentPrefs.favoriteTeamIds);
			if (current.has(favoriteTeamKey)) current.delete(favoriteTeamKey);
			else current.add(favoriteTeamKey);
			return { ...currentPrefs, favoriteTeamIds: [...current] };
		});
	};

	const onSetStandbyTab = (tabId: number | null) => {
		setStandbyStreamTabId(tabId);
		void browser.runtime.sendMessage({ type: 'SET_STANDBY_STREAM_TAB', tabId });
	};

	const onStandbyOnboardingDone = () => {
		setStandbyOnboardingDone(true);
		void browser.storage.local.set({ standbyOnboardingDone: true });
	};

	const closeSetup = () => {
		setView('main');
		showToast(i18n.t('app.settingsSavedToast'), 'success');
		void (async () => {
			await prefsSyncRef.current.catch(() => {});
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
	const selectedScoreHistory = selectedGameId ? scoreHistory[selectedGameId] ?? [] : [];
	const selectedPowerScoreHistory = selectedGameId ? powerScoreHistory[selectedGameId] ?? [] : [];

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

	if (walkthroughActive) {
		return (
			<TranslationContext.Provider value={i18n.t}>
				<WalkthroughView onComplete={() => setWalkthroughActive(false)} />
			</TranslationContext.Provider>
		);
	}

	return (
		<TranslationContext.Provider value={i18n.t}>
		<div className='popup-root'>
			<canvas ref={confettiCanvasRef} className='popup-confetti-canvas' aria-hidden='true' />
			<ToastContainer toasts={toasts} onDismiss={dismissToast} />
			<div key={view} className='popup-view-shell'>
				{view === 'setup' && (
					<SetupView
						prefs={prefs}
						prefsLoaded={prefsLoaded}
						demoMode={demoMode}
						leagueLogos={leagueLogos}
						standbyStreamTabId={standbyStreamTabId}
						standbyOnboardingDone={standbyOnboardingDone}
						openTabs={openTabs}
						formatTabLabel={tab => formatTabLabel(tab, openTabs)}
						onClose={closeSetup}
						onSensitivityChange={val => persistPrefs(currentPrefs => ({ ...currentPrefs, sensitivity: val as UserPreferences['sensitivity'] }))}
						onCooldownChange={val => persistPrefs(currentPrefs => ({ ...currentPrefs, cooldownSeconds: val }))}
						onSwitchDelayChange={val => persistPrefs(currentPrefs => ({ ...currentPrefs, switchDelaySeconds: val }))}
						onFavoriteTeamBonusChange={val => persistPrefs(currentPrefs => ({ ...currentPrefs, favoriteTeamBonusPoints: val }))}
						onToggleLeague={onToggleLeague}
						onToggleSport={onToggleSport}
						onReorderLeague={onReorderLeague}
						onResetLeagueOrder={onResetLeagueOrder}
						onToggleShowUpcoming={() => persistPrefs(currentPrefs => ({ ...currentPrefs, showUpcomingGames: !currentPrefs.showUpcomingGames }))}
						onUpcomingGamesDaysChange={val => persistPrefs(currentPrefs => ({ ...currentPrefs, upcomingGamesDays: val }))}
						onToggleProTips={() => persistPrefs(currentPrefs => ({ ...currentPrefs, proTipsEnabled: !currentPrefs.proTipsEnabled }))}
						onToggleNotifications={() => persistPrefs(currentPrefs => ({ ...currentPrefs, notificationsEnabled: !currentPrefs.notificationsEnabled }))}
						onToggleDemo={() => {
							const next = !demoMode;
							setDemoMode(next);
							void browser.runtime.sendMessage({ type: 'SET_DEMO_MODE', enabled: next });
						}}
						onToggleStandbyStream={() => persistPrefs(currentPrefs => ({ ...currentPrefs, standbyStreamEnabled: !currentPrefs.standbyStreamEnabled }))}
						onStandbyThresholdChange={val => persistPrefs(currentPrefs => ({ ...currentPrefs, standbyStreamThreshold: val }))}
						onSetStandbyTab={onSetStandbyTab}
						onStandbyOnboardingDone={onStandbyOnboardingDone}
						onToggleBetting={() => persistPrefs(currentPrefs => ({ ...currentPrefs, bettingEnabled: !currentPrefs.bettingEnabled }))}
						onToggleTemperatureUnit={() => persistPrefs(currentPrefs => ({ ...currentPrefs, temperatureUnit: currentPrefs.temperatureUnit === 'F' ? 'C' : 'F' }))}
						onPostseasonBoostChange={val => persistPrefs(currentPrefs => ({ ...currentPrefs, postseasonBoostPoints: val }))}
						onToggleSignal={onToggleSignal}
					/>
				)}
				{view === 'main' && (
					<MainView
						prefs={prefs}
						prefsLoaded={prefsLoaded}
						isLoading={isLoading || !settled}
						hasError={Boolean(error && !data)}
						onRefresh={() => void mutate(() => fetchState(true), { revalidate: false })}
						games={games}
						scores={scores}
						leagueLogos={leagueLogos}
						registry={registry}
						favoriteTeamIds={favoriteTeamIds}
						gameBoosts={gameBoosts}
						openTabs={openTabs}
						onStandbyStream={onStandbyStream}
						onOpenGameDetail={openGameDetail}
						onOpenSetup={() => setView('setup')}
						onStartWalkthrough={() => setWalkthroughActive(true)}
						showReviewPrompt={shouldShowReviewPrompt(reviewPromptState)}
						onToggleEnabled={() => persistPrefs(currentPrefs => ({ ...currentPrefs, enabled: !currentPrefs.enabled }))}
						onDismissReviewPrompt={dismissReviewPrompt}
						onLeaveReview={leaveReview}
						onToggleFavoriteTeam={toggleFavoriteTeam}
						onRegistryChange={onRegistryChange}
						formatTabLabel={tab => formatTabLabel(tab, openTabs)}
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
						disabledSignals={prefs.disabledSignals}
						favoriteTeamIds={favoriteTeamIds}
						openTabs={openTabs}
						registry={registry}
						onToggleFavoriteTeam={toggleFavoriteTeam}
						onRegistryChange={onRegistryChange}
						formatTabLabel={tab => formatTabLabel(tab, openTabs)}
						onSetGameBoost={onSetGameBoost}
						onBack={() => setView('main')}
					/>
				)}
				{view === 'detail' && !selectedGame && (
					<div className='popup-container d-flex flex-column justify-content-center align-items-center gap-2'>
						<div className='fw-bold text-body'>{i18n.t('app.gameDetailsUnavailable')}</div>
						<button type='button' className='btn btn-sm btn-primary' onClick={() => setView('main')}>{i18n.t('app.backToGames')}</button>
					</div>
				)}
			</div>
		</div>
		</TranslationContext.Provider>
	);
};
