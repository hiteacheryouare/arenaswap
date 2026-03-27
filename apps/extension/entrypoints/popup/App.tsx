import { useState, useEffect } from 'react';
import useSWR from 'swr';
import type { Tabs } from 'webextension-polyfill';
import { DEFAULT_SENSITIVITY, DEFAULT_COOLDOWN_SECS } from '@arenaswap/core/constants';
import type { ExcitementResult, Game, TabRegistration, UserPreferences } from '@arenaswap/core/types';
import GameCard from './components/GameCard';
import SensitivitySlider from './components/SensitivitySlider';
import CooldownSlider from './components/CooldownSlider';
import TabSetupRow from './components/TabSetupRow';

type View = 'main' | 'setup';

const SPORT_ORDER: Record<string, number> = { nba: 0, ncaab: 1, nfl: 2, ncaaf: 3, nhl: 4, mlb: 5 };
const bySport = (a: Game, b: Game) => (SPORT_ORDER[a.sport] ?? 99) - (SPORT_ORDER[b.sport] ?? 99);

const SPORT_LABELS: Record<string, string> = { nba: 'NBA', ncaab: 'NCAA Basketball', nfl: 'NFL', ncaaf: 'NCAA Football', nhl: 'NHL', mlb: 'MLB' };

const groupBySport = (games: Game[]) =>
	games.reduce<{ sport: string; games: Game[] }[]>((groups, game) => {
		const last = groups[groups.length - 1];
		if (last?.sport === game.sport) { last.games.push(game); return groups; }
		return [...groups, { sport: game.sport, games: [game] }];
	}, []);

const defaultPrefs: UserPreferences = {
	sensitivity: DEFAULT_SENSITIVITY,
	cooldownSeconds: DEFAULT_COOLDOWN_SECS,
	enabled: true,
};

type BackgroundState = { games: Game[]; scores: ExcitementResult[] };

const fetchState = async (forceRefresh = false): Promise<BackgroundState> => {
	const state = await browser.runtime.sendMessage({ type: 'GET_STATE', forceRefresh });
	return (state as BackgroundState) ?? { games: [], scores: [] };
};

export default () => {
	const [view, setView] = useState<View>('main');
	const [prefs, setPrefs] = useState<UserPreferences>(defaultPrefs);
	const [registry, setRegistry] = useState<TabRegistration[]>([]);
	const [openTabs, setOpenTabs] = useState<Tabs.Tab[]>([]);
	const [demoMode, setDemoMode] = useState(false);

	const [initialLoadDone, setInitialLoadDone] = useState(false);

	const { data, mutate } = useSWR('bg-state', () => fetchState(false), {
		revalidateOnMount: false,
		revalidateOnFocus: false,
		revalidateOnReconnect: false,
	});
	const isLoading = !initialLoadDone;

	const games = data?.games ?? [];
	const scores = data?.scores ?? [];

	useEffect(() => {
		fetchState(true)
			.then(state => {
				mutate(state, { revalidate: false });
			})
			.finally(() => {
				setInitialLoadDone(true);
			});

		browser.storage.sync.get({ prefs: null }).then(r => {
			if (r.prefs) setPrefs(r.prefs as UserPreferences);
		});
		browser.storage.session.get({ tabRegistry: [] }).then(r => {
			setRegistry(r.tabRegistry as TabRegistration[]);
		});
		browser.storage.local.get({ demoMode: false }).then(r => {
			setDemoMode(r.demoMode as boolean);
		});

		// Listen for ongoing updates from background
		const handleMessage = (msg: any) => {
			if (msg.type === 'SCORES_UPDATED') {
				mutate({ games: msg.games as Game[], scores: msg.scores as ExcitementResult[] }, { revalidate: false });
			}
		};
		browser.runtime.onMessage.addListener(handleMessage);
		return () => browser.runtime.onMessage.removeListener(handleMessage);
	}, [mutate]);

	const loadOpenTabs = async () => {
		const tabs = await browser.tabs.query({ currentWindow: true });
		setOpenTabs(tabs.filter(t => t.url && !t.url.startsWith('chrome://') && !t.url.startsWith('about:')));
	};

	const onToggleEnabled = () => {
		const updated = { ...prefs, enabled: !prefs.enabled };
		setPrefs(updated);
		browser.storage.sync.set({ prefs: updated });
		browser.runtime.sendMessage({ type: 'UPDATE_PREFS', prefs: updated });
	};

	const onSensitivityChange = (val: number) => {
		const updated = { ...prefs, sensitivity: val as UserPreferences['sensitivity'] };
		setPrefs(updated);
		browser.storage.sync.set({ prefs: updated });
		browser.runtime.sendMessage({ type: 'UPDATE_PREFS', prefs: updated });
	};

	const onCooldownChange = (val: number) => {
		const updated = { ...prefs, cooldownSeconds: val };
		setPrefs(updated);
		browser.storage.sync.set({ prefs: updated });
		browser.runtime.sendMessage({ type: 'UPDATE_PREFS', prefs: updated });
	};

	const onToggleDemo = () => {
		const next = !demoMode;
		setDemoMode(next);
		browser.runtime.sendMessage({ type: 'SET_DEMO_MODE', enabled: next });
		// Background calls tick() immediately → sends SCORES_UPDATED → SWR cache updates
	};

	const onRegistryChange = (updated: TabRegistration[]) => {
		setRegistry(updated);
		browser.storage.session.set({ tabRegistry: updated });
		browser.runtime.sendMessage({ type: 'UPDATE_REGISTRY', tabRegistry: updated });
	};

	const openSetup = async () => {
		await loadOpenTabs();
		setView('setup');
	};

	/** Find the tab title for a registered game */
	const getTabTitle = (gameId: string): string | undefined => {
		const reg = registry.find(r => r.gameId === gameId);
		if (!reg) return undefined;
		const tab = openTabs.find(t => t.id === reg.tabId);
		if (tab?.title) return tab.title.slice(0, 30);
		return `Tab #${reg.tabId}`;
	};

	const oneWeekFromNow = Date.now() + 7 * 24 * 60 * 60 * 1000;

	if (view === 'setup') {
		return (
			<div style={{ width: 320, minHeight: 200, padding: '0.75rem', background: '#0d1117', color: '#e6edf3' }}>
				<button className='setup-header' onClick={() => setView('main')}>
					<i className='bi bi-arrow-left' />
					Settings
				</button>

				{/* Sensitivity slider in settings */}
				<SensitivitySlider value={prefs.sensitivity} onChange={onSensitivityChange} />

				<div className='mt-2'>
					<CooldownSlider value={prefs.cooldownSeconds} onChange={onCooldownChange} />
				</div>

				{/* Demo mode toggle */}
				<div className='d-flex justify-content-between align-items-center mt-3'>
					<label className='sensitivity-label' htmlFor='demoToggle'>Demo mode (fake games)</label>
					<div className='form-check form-switch mb-0'>
						<input
							className='form-check-input'
							type='checkbox'
							id='demoToggle'
							checked={demoMode}
							onChange={onToggleDemo}
						/>
					</div>
				</div>

				<div className='section-label mt-3'>Assign tabs to games</div>
				{openTabs.length === 0 && (
					<p className='sensitivity-label mt-2'>No open tabs found.</p>
				)}
				{openTabs.map(tab => (
					<TabSetupRow
						key={tab.id}
						tab={tab}
						games={games.filter(g => !g.startTime || new Date(g.startTime).getTime() <= oneWeekFromNow)}
						registry={registry}
						onChange={onRegistryChange}
					/>
				))}
			</div>
		);
	}

	const liveGames = games.filter(g => g.status === 'in');
	const upcomingGames = games
		.filter(g => g.status === 'pre')
		.filter(g => !g.startTime || new Date(g.startTime).getTime() <= oneWeekFromNow)
		.sort(bySport);

	const registeredGameIds = new Set(registry.map(r => r.gameId));
	const assignedLiveGames = liveGames.filter(g => registeredGameIds.has(g.id)).sort(bySport);
	const unassignedLiveGames = liveGames.filter(g => !registeredGameIds.has(g.id)).sort(bySport);

	return (
		<div style={{ width: 320, minHeight: 200, padding: '0.75rem', background: '#0d1117', color: '#e6edf3' }}>
			<div className='arenaswap-header'>
				<img
					src='/images/full_logo_white_on_transparent.png'
					alt='ArenaSwap'
					className='arenaswap-logo'
				/>
				<div className='d-flex align-items-center gap-2'>
					<button
						className='btn btn-sm p-0'
						style={{ color: '#8b949e', background: 'none', border: 'none', lineHeight: 1 }}
						onClick={openSetup}
						title='Settings'
					>
						<i className='bi bi-gear-fill' style={{ fontSize: '0.9rem' }} />
					</button>
					<div className='form-check form-switch mb-0'>
						<input
							className='form-check-input'
							type='checkbox'
							id='enableToggle'
							checked={prefs.enabled}
							onChange={onToggleEnabled}
						/>
					</div>
				</div>
			</div>

			{isLoading && (
				<div className='d-flex justify-content-center align-items-center mt-4' style={{ minHeight: 64 }}>
					<div
						className='spinner-border'
						role='status'
						style={{ color: '#F75C03', width: '1.5rem', height: '1.5rem', borderWidth: '0.2em' }}
					>
						<span className='visually-hidden'>Loading...</span>
					</div>
				</div>
			)}

			{!isLoading && assignedLiveGames.length > 0 && (
				<div>
					<div className='section-title'>Active Tabs</div>
					{groupBySport(assignedLiveGames).map(({ sport, games }) => (
						<div key={sport}>
							<div className='section-label mt-1'>{SPORT_LABELS[sport] ?? sport.toUpperCase()}</div>
							{games.map(game => (
								<GameCard
									key={game.id}
									game={game}
									excitementResult={scores.find(s => s.gameId === game.id)}
									tabTitle={getTabTitle(game.id)}
								/>
							))}
						</div>
					))}
				</div>
			)}

			{!isLoading && unassignedLiveGames.length > 0 && (
				<div className='mt-2'>
					<div className='section-title'>Other Games</div>
					{groupBySport(unassignedLiveGames).map(({ sport, games }) => (
						<div key={sport}>
							<div className='section-label mt-1'>{SPORT_LABELS[sport] ?? sport.toUpperCase()}</div>
							{games.map(game => (
								<GameCard
									key={game.id}
									game={game}
									excitementResult={scores.find(s => s.gameId === game.id)}
								/>
							))}
						</div>
					))}
				</div>
			)}

			{!isLoading && liveGames.length === 0 && registry.length === 0 && upcomingGames.length === 0 && (
				<p className='sensitivity-label text-center mt-3'>
					No games right now.{' '}
					<button
						className='btn btn-link btn-sm p-0'
						style={{ fontSize: '0.65rem', color: '#2274A5' }}
						onClick={openSetup}
					>
						Set up tabs →
					</button>
				</p>
			)}

			{!isLoading && upcomingGames.length > 0 && (
				<div className='mt-2'>
					<div className='section-title'>Up Next</div>
					{groupBySport(upcomingGames).map(({ sport, games }) => (
						<div key={sport}>
							<div className='section-label mt-1'>{SPORT_LABELS[sport] ?? sport.toUpperCase()}</div>
							{games.map(game => (
								<GameCard
									key={game.id}
									game={game}
									excitementResult={undefined}
									tabTitle={getTabTitle(game.id)}
								/>
							))}
						</div>
					))}
				</div>
			)}
		</div>
	);
};
