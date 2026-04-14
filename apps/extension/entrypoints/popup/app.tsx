import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { createDefaultUserPreferences, createFavoriteTeamKey, normalizeUserPreferences } from '@arenaswap/core/constants';
import type { LeagueId, TabRegistration, UserPreferences } from '@arenaswap/core/types';
import type { Browser } from 'wxt/browser';
import MainView from './components/mainView';
import SetupView from './components/setupView';
import { fetchState, formatTabLabel, leagueOrder, normalizeBackgroundState, popupView } from './popupHelpers';
import useFavoriteScoreConfetti from './useFavoriteScoreConfetti';

const isScoreUpdateMessage = (value: unknown): value is { type: 'SCORES_UPDATED' } => (
	typeof value === 'object'
	&& value !== null
	&& 'type' in value
	&& (value as { type?: unknown }).type === 'SCORES_UPDATED'
);

const app = () => {
	const [view, setView] = useState<popupView>('main');
	const [prefs, setPrefs] = useState<UserPreferences>(createDefaultUserPreferences());
	const [prefsLoaded, setPrefsLoaded] = useState(false);
	const [registry, setRegistry] = useState<TabRegistration[]>([]);
	const [openTabs, setOpenTabs] = useState<Browser.tabs.Tab[]>([]);
	const [demoMode, setDemoMode] = useState(false);
	const prefsSyncRef = useRef<Promise<void>>(Promise.resolve());

	const { data, error, isLoading, mutate } = useSWR('bg-state', () => fetchState(true), {
		revalidateOnFocus: false,
		revalidateOnReconnect: false,
	});

	const games = data?.games ?? [];
	const scores = data?.scores ?? [];
	const leagueLogos = data?.leagueLogos ?? {};
	const favoriteTeamIds = useMemo(() => new Set(prefs.favoriteTeamIds), [prefs.favoriteTeamIds]);
	const confettiCanvasRef = useFavoriteScoreConfetti({ games, favoriteTeamIds });

	useEffect(() => {
		browser.storage.sync.get({ prefs: null })
			.then(result => setPrefs(normalizeUserPreferences(result.prefs)))
			.catch(async err => {
				console.warn('ArenaSwap: storage.sync unavailable, falling back to storage.local for prefs.', err);
				const fallback = await browser.storage.local.get({ prefs: null });
				setPrefs(normalizeUserPreferences(fallback.prefs));
			})
			.finally(() => setPrefsLoaded(true));

		browser.storage.session.get({ tabRegistry: [] }).then(result => setRegistry(result.tabRegistry as TabRegistration[]));
		browser.storage.local.get({ demoMode: false }).then(result => setDemoMode(result.demoMode as boolean));

		void browser.tabs.query({ currentWindow: true }).then(tabs => {
			setOpenTabs(tabs.filter(tab => tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('about:')));
		});

		const handleMessage = (msg: unknown) => {
			if (!isScoreUpdateMessage(msg)) return;
			mutate(normalizeBackgroundState(msg), { revalidate: false });
		};
		browser.runtime.onMessage.addListener(handleMessage);
		return () => browser.runtime.onMessage.removeListener(handleMessage);
	}, [mutate]);

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

	const onToggleLeague = (leagueId: LeagueId) => {
		const current = new Set<LeagueId>(prefs.enabledLeagues);
		if (current.has(leagueId)) current.delete(leagueId);
		else current.add(leagueId);
		const enabledLeagues = [...current].sort((a, b) => leagueOrder[a] - leagueOrder[b]);
		persistPrefs({ ...prefs, enabledLeagues });
	};

	const onRegistryChange = (updated: TabRegistration[]) => {
		setRegistry(updated);
		void browser.storage.session.set({ tabRegistry: updated });
		void browser.runtime.sendMessage({ type: 'UPDATE_REGISTRY', tabRegistry: updated });
	};

	const closeSetup = () => {
		setView('main');
		void (async () => {
			await prefsSyncRef.current.catch(() => {});
			const refreshed = await fetchState(true);
			mutate(refreshed, { revalidate: false });
		})();
	};

	return (
		<div className='popup-root'>
			<canvas ref={confettiCanvasRef} className='popup-confetti-canvas' aria-hidden='true' />
			{view === 'setup'
				? (
					<SetupView
						prefs={prefs}
						prefsLoaded={prefsLoaded}
						demoMode={demoMode}
						leagueLogos={leagueLogos}
						onClose={closeSetup}
						onSensitivityChange={val => persistPrefs({ ...prefs, sensitivity: val as UserPreferences['sensitivity'] })}
						onCooldownChange={val => persistPrefs({ ...prefs, cooldownSeconds: val })}
						onSwitchDelayChange={val => persistPrefs({ ...prefs, switchDelaySeconds: val })}
						onFavoriteTeamBonusChange={val => persistPrefs({ ...prefs, favoriteTeamBonusPoints: val })}
						onToggleLeague={onToggleLeague}
						onToggleShowUpcoming={() => persistPrefs({ ...prefs, showUpcomingGames: !prefs.showUpcomingGames })}
						onToggleDemo={() => {
							const next = !demoMode;
							setDemoMode(next);
							void browser.runtime.sendMessage({ type: 'SET_DEMO_MODE', enabled: next });
						}}
					/>
				)
				: (
					<MainView
						prefs={prefs}
						prefsLoaded={prefsLoaded}
						isLoading={isLoading}
						hasError={Boolean(error && !data)}
						games={games}
						scores={scores}
						leagueLogos={leagueLogos}
						registry={registry}
						favoriteTeamIds={favoriteTeamIds}
						openTabs={openTabs}
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
		</div>
	);
};

export default app;
