import { useState, useEffect } from 'react';
import type { Tabs } from 'webextension-polyfill';
import { DEFAULT_SENSITIVITY, DEFAULT_COOLDOWN_SECS } from '@madness/core/constants';
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
	const [games, setGames] = useState<Game[]>([]);
	const [prefs, setPrefs] = useState<UserPreferences>(defaultPrefs);
	const [registry, setRegistry] = useState<TabRegistration[]>([]);
	const [openTabs, setOpenTabs] = useState<Tabs.Tab[]>([]);

	useEffect(() => {
		// Load persisted state
		browser.storage.sync.get({ prefs: null }).then(r => {
			if (r.prefs) setPrefs(r.prefs as UserPreferences);
		});
		browser.storage.session.get({ tabRegistry: [] }).then(r => {
			setRegistry(r.tabRegistry as TabRegistration[]);
		});

		// Subscribe to live score updates from service worker
		const handleMessage = (msg: any) => {
			if (msg.type === 'SCORES_UPDATED') {
				setScores(msg.scores);
				setGames(msg.games);
			}
		};
		browser.runtime.onMessage.addListener(handleMessage);
		return () => browser.runtime.onMessage.removeListener(handleMessage);
	}, []);

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
			<div className='dark bg-gray-900 text-gray-100 p-3' style={{ width: 320, minHeight: 200 }}>
				<div className='d-flex align-items-center mb-3'>
					<button className='btn btn-sm btn-outline-secondary me-2' onClick={() => setView('main')}>
						← Back
					</button>
					<span className='fw-semibold'>Assign tabs to games</span>
				</div>
				{openTabs.length === 0 && (
					<p className='text-gray-400 small'>No open tabs found.</p>
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

	return (
		<div className='dark bg-gray-900 text-gray-100 p-3' style={{ width: 320, minHeight: 200 }}>
			{/* Header */}
			<div className='d-flex justify-content-between align-items-center mb-3'>
				<span className='fw-bold fs-6'>🏀 Madness</span>
				<div className='d-flex align-items-center gap-2'>
					<button className='btn btn-sm btn-outline-secondary' onClick={openSetup} title='Setup tabs'>
						⚙️
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

			{/* Sensitivity slider */}
			<SensitivitySlider value={prefs.sensitivity} onChange={onSensitivityChange} />

			{/* Game list */}
			<div className='mt-3'>
				{registry.length === 0 ? (
					<p className='text-gray-400 small text-center mt-4'>
						No game tabs registered.{' '}
						<button className='btn btn-link btn-sm p-0 text-blue-400' onClick={openSetup}>
							Set them up →
						</button>
					</p>
				) : (
					registry.map(reg => {
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
					})
				)}
			</div>

			{/* Upcoming games — shown only when nothing is live */}
			{(() => {
				const liveGames = games.filter(g => g.status === 'in');
				const upcomingGames = games.filter(g => g.status === 'pre');
				if (liveGames.length > 0 || upcomingGames.length === 0) return null;
				return (
					<div className='mt-3'>
						<div className='text-gray-500 mb-2' style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
							Up Next
						</div>
						{upcomingGames.map(game => (
							<GameCard
								key={game.id}
								tabId={-1}
								game={game}
								excitementResult={undefined}
							/>
						))}
					</div>
				);
			})()}
		</div>
	);
};
