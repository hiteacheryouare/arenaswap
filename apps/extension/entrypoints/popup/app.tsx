import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { fetchLeagueLogos } from '@arenaswap/core';
import { allLeagueIds, createDefaultUserPreferences, createFavoriteTeamKey, normalizeUserPreferences } from '@arenaswap/core/constants';
import type { LeagueId, LeagueLogoMap, SportType, TabRegistration, UserPreferences } from '@arenaswap/core/types';
import type { Browser } from 'wxt/browser';
import GameDetailView from './components/gameDetailView';
import MainView from './components/mainView';
import OnboardingView from './components/onboardingView';
import SetupView from './components/setupView';
import ToastContainer from './components/toastContainer';
import { fetchState, formatTabLabel, leagueOrder, leaguesBySportType, normalizeBackgroundState, popupView } from './popupHelpers';
import useFavoriteScoreConfetti from './useFavoriteScoreConfetti';
import useToast from './useToast';

const isScoreUpdateMessage = (value: unknown): value is { type: 'SCORES_UPDATED' } => (
	typeof value === 'object'
	&& value !== null
	&& 'type' in value
	&& (value as { type?: unknown }).type === 'SCORES_UPDATED'
);

const app = () => {
	const [view, setView] = useState<popupView>('main');
	const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
	const [prefs, setPrefs] = useState<UserPreferences>(createDefaultUserPreferences());
	const [prefsLoaded, setPrefsLoaded] = useState(false);
	const [registry, setRegistry] = useState<TabRegistration[]>([]);
	const [openTabs, setOpenTabs] = useState<Browser.tabs.Tab[]>([]);
	const [demoMode, setDemoMode] = useState(false);
	const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
	const [standbyOnboardingDone, setStandbyOnboardingDone] = useState(false);
	const [standbyStreamTabId, setStandbyStreamTabId] = useState<number | null>(null);
	const [settled, setSettled] = useState(false);
	const [allLeagueLogoCache, setAllLeagueLogoCache] = useState<LeagueLogoMap>({});
	const settledRef = useRef(false);
	const prefsSyncRef = useRef<Promise<void>>(Promise.resolve());
	const { toasts, showToast, dismissToast } = useToast();

	// forceRefresh:false avoids a full tick() overwrite; revalidateIfStale:false prevents
	// a second SWR fetch (React StrictMode remount / React 19 store re-snapshot) from
	// overwriting game data that arrived via a SCORES_UPDATED mutation. Updates come
	// via push (SCORES_UPDATED); re-fetching after initial load is not needed.
	const { data, error, isLoading, mutate } = useSWR('bg-state', () => fetchState(false), {
		revalidateOnFocus: false,
		revalidateOnReconnect: false,
		revalidateIfStale: false,
	});

	// Pre-fetch logos for every league once on popup open so the onboarding and
	// settings pickers always show logos, not just for currently-enabled leagues.
	// includeUpcoming:false keeps this to one ESPN call per league.
	useEffect(() => {
		void fetchLeagueLogos(allLeagueIds, { includeUpcoming: false })
			.then(logos => setAllLeagueLogoCache(logos))
			.catch(() => {});
	}, []);

	const games = data?.games ?? [];
	const scores = data?.scores ?? [];
	// Enabled-league logos (from background state) take priority; cache fills the gaps.
	const leagueLogos = useMemo<LeagueLogoMap>(
		() => ({ ...allLeagueLogoCache, ...(data?.leagueLogos ?? {}) }),
		[allLeagueLogoCache, data?.leagueLogos]
	);
	const scoreHistory = data?.scoreHistory ?? {};
	const powerScoreHistory = data?.powerScoreHistory ?? {};
	const gameBoosts = data?.gameBoosts ?? {};
	const onStandbyStream = data?.onStandbyStream ?? false;
	const favoriteTeamIds = useMemo(() => new Set(prefs.favoriteTeamIds), [prefs.favoriteTeamIds]);
	const confettiCanvasRef = useFavoriteScoreConfetti({ games, favoriteTeamIds });

	useEffect(() => {
		const init = async () => {
			let rawPrefs: unknown = null;
			try {
				const syncResult = await browser.storage.sync.get({ prefs: null });
				rawPrefs = syncResult.prefs;
			} catch (err) {
				console.warn('ArenaSwap: storage.sync unavailable, falling back to storage.local for prefs.', err);
				const fallback = await browser.storage.local.get({ prefs: null });
				rawPrefs = fallback.prefs;
			}
			setPrefs(normalizeUserPreferences(rawPrefs));
			setPrefsLoaded(true);

			const localResult = await browser.storage.local.get({ demoMode: false, onboardingCompleted: null, standbyOnboardingDone: false });
			setDemoMode(localResult.demoMode as boolean);
			setStandbyOnboardingDone(localResult.standbyOnboardingDone as boolean);

			const onboardingFlag = localResult.onboardingCompleted === true;
			const hasStoredPrefs = rawPrefs !== null;
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

		// Fallback: mark settled after 5 s if no SCORES_UPDATED arrives.
		// onOnboardingComplete resets settledRef.current to false and re-arms this path via its own fetch.
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

	const persistPrefs = (nextPrefs: UserPreferences) => {
		const normalized = normalizeUserPreferences(nextPrefs);
		setPrefs(normalized);
		const syncPromise = (async () => {
			try {
				await browser.storage.sync.set({ prefs: normalized });
			} catch (err) {
				console.warn('ArenaSwap: storage.sync unavailable, persisting prefs to storage.local.', err);
				await browser.storage.local.set({ prefs: normalized });
			}
			await browser.runtime.sendMessage({ type: 'UPDATE_PREFS', prefs: normalized });
		})();
		prefsSyncRef.current = syncPromise;
		void syncPromise.catch(err => console.error('ArenaSwap: Failed to persist preferences:', err));
	};

	const onOnboardingComplete = (leagues: LeagueId[], favorites: string[]) => {
		persistPrefs({ ...prefs, enabledLeagues: leagues, favoriteTeamIds: favorites });
		void browser.storage.local.set({ onboardingCompleted: true });
		showToast('Welcome to ArenaSwap!', 'success');
		// Reset settled so MainView shows a loader while we re-fetch with the new prefs.
		// Without this, `settled` is already true from the initial fetch (which ran during onboarding
		// with empty leagues), so MainView would immediately show "no games" on first transition.
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
		const current = new Set<LeagueId>(prefs.enabledLeagues);
		if (current.has(leagueId)) current.delete(leagueId);
		else current.add(leagueId);
		const enabledLeagues = [...current].sort((a, b) => leagueOrder[a] - leagueOrder[b]);
		persistPrefs({ ...prefs, enabledLeagues });
	};

	const onToggleSport = (sport: SportType, selectAll: boolean) => {
		const sportLeagueIds = leaguesBySportType[sport].map(l => l.id);
		const current = new Set<LeagueId>(prefs.enabledLeagues);
		for (const id of sportLeagueIds) {
			if (selectAll) current.add(id);
			else current.delete(id);
		}
		const enabledLeagues = [...current].sort((a, b) => leagueOrder[a] - leagueOrder[b]);
		persistPrefs({ ...prefs, enabledLeagues });
	};

	const onSetGameBoost = (gameId: string, boost: number) => {
		void browser.runtime.sendMessage({ type: 'SET_GAME_BOOST', gameId, boost });
	};

	const onRegistryChange = (updated: TabRegistration[]) => {
		setRegistry(updated);
		void browser.storage.session.set({ tabRegistry: updated });
		void browser.runtime.sendMessage({ type: 'UPDATE_REGISTRY', tabRegistry: updated });
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
		showToast('Settings saved', 'success');
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

	const selectedGame = selectedGameId ? games.find(game => game.id === selectedGameId) : undefined;
	const selectedScore = selectedGameId ? scores.find(score => score.gameId === selectedGameId) : undefined;
	const selectedScoreHistory = selectedGameId ? scoreHistory[selectedGameId] ?? [] : [];
	const selectedPowerScoreHistory = selectedGameId ? powerScoreHistory[selectedGameId] ?? [] : [];

	if (onboardingDone === null) return <div className='popup-root' />;

	if (onboardingDone === false) {
		return (
			<OnboardingView
				leagueLogos={leagueLogos}
				onComplete={onOnboardingComplete}
			/>
		);
	}

	return (
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
						onSensitivityChange={val => persistPrefs({ ...prefs, sensitivity: val as UserPreferences['sensitivity'] })}
						onCooldownChange={val => persistPrefs({ ...prefs, cooldownSeconds: val })}
						onSwitchDelayChange={val => persistPrefs({ ...prefs, switchDelaySeconds: val })}
						onFavoriteTeamBonusChange={val => persistPrefs({ ...prefs, favoriteTeamBonusPoints: val })}
						onToggleLeague={onToggleLeague}
						onToggleSport={onToggleSport}
						onToggleShowUpcoming={() => persistPrefs({ ...prefs, showUpcomingGames: !prefs.showUpcomingGames })}
						onToggleNotifications={() => persistPrefs({ ...prefs, notificationsEnabled: !prefs.notificationsEnabled })}
						onToggleDemo={() => {
							const next = !demoMode;
							setDemoMode(next);
							void browser.runtime.sendMessage({ type: 'SET_DEMO_MODE', enabled: next });
						}}
						onToggleStandbyStream={() => persistPrefs({ ...prefs, standbyStreamEnabled: !prefs.standbyStreamEnabled })}
						onStandbyThresholdChange={val => persistPrefs({ ...prefs, standbyStreamThreshold: val })}
						onSetStandbyTab={onSetStandbyTab}
						onStandbyOnboardingDone={onStandbyOnboardingDone}
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
						onToggleEnabled={() => persistPrefs({ ...prefs, enabled: !prefs.enabled })}
						onToggleFavoriteTeam={(leagueId, teamId) => {
							const favoriteTeamKey = createFavoriteTeamKey(leagueId, teamId);
							const current = new Set(prefs.favoriteTeamIds);
							if (current.has(favoriteTeamKey)) current.delete(favoriteTeamKey);
							else current.add(favoriteTeamKey);
							persistPrefs({ ...prefs, favoriteTeamIds: [...current] });
						}}
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
						gameBoosts={gameBoosts}
						onSetGameBoost={onSetGameBoost}
						onBack={() => setView('main')}
					/>
				)}
				{view === 'detail' && !selectedGame && (
					<div className='popup-container d-flex flex-column justify-content-center align-items-center gap-2'>
						<div className='fw-bold text-body'>Game details unavailable</div>
						<button type='button' className='btn btn-sm btn-primary' onClick={() => setView('main')}>Back to games</button>
					</div>
				)}
			</div>
		</div>
	);
};

export default app;
