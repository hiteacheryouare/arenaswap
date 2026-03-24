import { useState, useEffect } from 'react';
import useSWR from 'swr';
import type { Tabs } from 'webextension-polyfill';
import { DEFAULT_SENSITIVITY, DEFAULT_COOLDOWN_SECS } from '@madness/core/constants';
import { fetchGames } from '@madness/core';
import type { ExcitementResult, Game, TabRegistration, UserPreferences } from '@madness/core/types';
import GameCard from './components/GameCard';
import SensitivitySlider from './components/SensitivitySlider';
import TabSetupRow from './components/TabSetupRow';

type View = 'main' | 'setup';

const defaultPrefs: UserPreferences = {
	sensitivity: DEFAULT_SENSITIVITY,
	favoriteTeamIds: [],
	cooldownSeconds: DEFAULT_COOLDOWN_SECS,
	enabled: true,
};

export default () => {
	const [view, setView] = useState<View>('main');
	const [scores, setScores] = useState<ExcitementResult[]>([]);
	const [prefs, setPrefs] = useState<UserPreferences>(defaultPrefs);
	const [registry, setRegistry] = useState<TabRegistration[]>([]);
	const [openTabs, setOpenTabs] = useState<Tabs.Tab[]>([]);

	const { data: games = [], isLoading, mutate: mutateGames } = useSWR('games', fetchGames, {
		refreshInterval: 0,
		revalidateOnFocus: true,
		revalidateOnReconnect: false,
	});

	useEffect(() => {
		browser.storage.sync.get({ prefs: null }).then(r => {
			if (r.prefs) setPrefs(r.prefs as UserPreferences);
		});
		browser.storage.session.get({ tabRegistry: [] }).then(r => {
			setRegistry(r.tabRegistry as TabRegistration[]);
		});

		const handleMessage = (msg: any) => {
			if (msg.type === 'SCORES_UPDATED') {
				setScores(msg.scores);
				mutateGames(msg.games as Game[], { revalidate: false });
			}
		};
		browser.runtime.onMessage.addListener(handleMessage);
		return () => browser.runtime.onMessage.removeListener(handleMessage);
	}, [mutateGames]);

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

	const onRegistryChange = (updated: TabRegistration[]) => {
		setRegistry(updated);
		browser.storage.session.set({ tabRegistry: updated });
		browser.runtime.sendMessage({ type: 'UPDATE_REGISTRY', tabRegistry: updated });
	};

	const openSetup = async () => {
		await loadOpenTabs();
		setView('setup');
	};

	if (view === 'setup') {
		return (
			<div style={{ width: 320, minHeight: 200, padding: '0.75rem', background: '#0d1117', color: '#e6edf3' }}>
				<button className='setup-header' onClick={() => setView('main')}>
					<i className='bi bi-arrow-left' />
					Settings
				</button>
				<div className='section-label'>Assign tabs to games</div>
				{openTabs.length === 0 && (
					<p className='sensitivity-label mt-2'>No open tabs found.</p>
				)}
				{openTabs.map(tab => (
					<TabSetupRow
						key={tab.id}
						tab={tab}
						games={games}
						registry={registry}
						onChange={onRegistryChange}
					/>
				))}
			</div>
		);
	}

	const liveGames = games.filter(g => g.status === 'in');
	const upcomingGames = games.filter(g => g.status === 'pre');

	return (
		<div style={{ width: 320, minHeight: 200, padding: '0.75rem', background: '#0d1117', color: '#e6edf3' }}>
			{/* Header */}
			<div className='madness-header'>
				<div className='madness-wordmark'>MADNESS<span>.</span></div>
				<div className='d-flex align-items-center gap-2'>
					<button
						className='btn btn-sm p-0'
						style={{ color: '#8b949e', background: 'none', border: 'none', lineHeight: 1 }}
						onClick={openSetup}
						title='Setup tabs'
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

			{/* Sensitivity */}
			<SensitivitySlider value={prefs.sensitivity} onChange={onSensitivityChange} />

			{/* Loading state */}
			{isLoading && (
				<div className='d-flex justify-content-center align-items-center mt-4' style={{ minHeight: 64 }}>
					<div
						className='spinner-border'
						role='status'
						style={{ color: '#F75C03', width: '1.5rem', height: '1.5rem', borderWidth: '0.2em' }}
					>
						<span className='visually-hidden'>Loading…</span>
					</div>
				</div>
			)}

			{/* Registered game tabs */}
			{!isLoading && (
				registry.length === 0 ? (
					<p className='sensitivity-label text-center mt-3'>
						No game tabs registered.{' '}
						<button
							className='btn btn-link btn-sm p-0'
							style={{ fontSize: '0.65rem', color: '#2274A5' }}
							onClick={openSetup}
						>
							Set them up →
						</button>
					</p>
				) : (
					<div className='mt-3'>
						{liveGames.length > 0 && (
							<div className='section-label section-label--live'>● Live</div>
						)}
						{registry.map(reg => {
							const game = games.find(g => g.id === reg.gameId);
							const score = scores.find(s => s.gameId === reg.gameId);
							return (
								<GameCard
									key={reg.tabId}
									tabId={reg.tabId}
									game={game}
									excitementResult={score}
								/>
							);
						})}
					</div>
				)
			)}

			{/* Upcoming games — shown only when nothing is live */}
			{!isLoading && liveGames.length === 0 && upcomingGames.length > 0 && (
				<div className='mt-3'>
					<div className='section-label section-label--next'>▸ Up Next</div>
					{upcomingGames.map(game => (
						<GameCard
							key={game.id}
							tabId={-1}
							game={game}
							excitementResult={undefined}
						/>
					))}
				</div>
			)}
		</div>
	);
};
