import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import useSWR from 'swr';
import {
	createDefaultUserPreferences,
	LEAGUE_CONFIGS,
	normalizeUserPreferences,
	resolveLeagueLogoUrl,
} from '@arenaswap/core/constants';
import type { Browser } from 'wxt/browser';
import type { BackgroundState, ExcitementResult, Game, LeagueId, LeagueLogoMap, SportType, TabRegistration, UserPreferences } from '@arenaswap/core/types';
import GameCard from './components/GameCard';
import SensitivitySlider from './components/SensitivitySlider';
import CooldownSlider from './components/CooldownSlider';

type View = 'main' | 'setup';
type LeagueGroup = { league: LeagueId; games: Game[] };
type LeagueConfig = (typeof LEAGUE_CONFIGS)[number];
const POPUP_CONTAINER_STYLE: CSSProperties = {
	width: 320,
	height: 560,
	padding: '0.75rem',
	background: '#0d1117',
	color: '#e6edf3',
	overflowY: 'auto',
};

const SECTION_TITLE_STYLE: CSSProperties = { fontSize: '1.35rem', letterSpacing: '-0.01em', marginBottom: '0.5rem', marginTop: '0.25rem' };
const SECTION_LABEL_STYLE: CSSProperties = { fontSize: '0.75rem', letterSpacing: '0.1em', color: '#8b949e', marginBottom: '0.4rem' };

const LEAGUE_ORDER = Object.fromEntries(LEAGUE_CONFIGS.map((config, index) => [config.id, index])) as Record<LeagueId, number>;
const SPORT_TYPE_ORDER: Record<SportType, number> = {
	basketball: 0,
	football: 1,
	hockey: 2,
	baseball: 3,
};
const SPORT_TYPE_LABELS: Record<SportType, string> = {
	basketball: 'Basketball',
	football: 'Football',
	hockey: 'Hockey',
	baseball: 'Baseball',
};
const LEAGUE_LABELS = Object.fromEntries(LEAGUE_CONFIGS.map(config => [config.id, config.label])) as Record<LeagueId, string>;
const LEAGUES_BY_SPORT_TYPE = LEAGUE_CONFIGS.reduce<Record<SportType, typeof LEAGUE_CONFIGS>>((groups, config) => {
	groups[config.sportType].push(config);
	return groups;
}, {
	basketball: [],
	football: [],
	hockey: [],
	baseball: [],
});
const toLeagueInitials = (league: LeagueConfig): string => (
	league
		.label
		.split(/\s+/)
		.map(part => part[0] ?? '')
		.join('')
		.slice(0, 3)
		.toUpperCase()
);

const LeagueLogo = ({ league, leagueLogos }: { league: LeagueConfig; leagueLogos: LeagueLogoMap }) => {
	const [imageFailed, setImageFailed] = useState(false);
	const logoUrl = resolveLeagueLogoUrl(league.id, leagueLogos[league.id]);
	if (imageFailed) {
		return <span className='league-toggle-logo league-toggle-logo--fallback'>{toLeagueInitials(league)}</span>;
	}

	return (
		<img
			src={logoUrl}
			alt={`${league.label} logo`}
			className='league-toggle-logo'
			loading='lazy'
			onError={() => setImageFailed(true)}
		/>
	);
};

const byLeague = (a: Game, b: Game) => (LEAGUE_ORDER[a.league] ?? 99) - (LEAGUE_ORDER[b.league] ?? 99);

const groupByLeague = (games: Game[]): LeagueGroup[] => (
	games.reduce<LeagueGroup[]>((groups, game) => {
		const last = groups[groups.length - 1];
		if (last?.league === game.league) {
			last.games.push(game);
			return groups;
		}
		return [...groups, { league: game.league, games: [game] }];
	}, [])
);

const fetchState = async (forceRefresh = false): Promise<BackgroundState> => {
	const state = await browser.runtime.sendMessage({ type: 'GET_STATE', forceRefresh });
	return (state as BackgroundState) ?? { games: [], scores: [], leagueLogos: {} };
};

const formatTabLabel = (tab: Browser.tabs.Tab, allTabs: Browser.tabs.Tab[]): string => {
	const title = tab.title ?? '';
	if (!title) return `Tab #${tab.id}`;
	const duplicates = allTabs.filter(t => t.title === title);
	if (duplicates.length <= 1) return title.slice(0, 35);
	try {
		const pathname = new URL(tab.url ?? '').pathname;
		const truncated = pathname.length > 25 ? `${pathname.slice(0, 22)}...` : pathname;
		return `${title.slice(0, 25)} (${truncated})`;
	} catch {
		return `${title.slice(0, 30)} (#${tab.id})`;
	}
};

export default () => {
	const [view, setView] = useState<View>('main');
	const [prefs, setPrefs] = useState<UserPreferences>(createDefaultUserPreferences());
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

	useEffect(() => {
		browser.storage.sync.get({ prefs: null }).then(result => {
			setPrefs(normalizeUserPreferences(result.prefs));
		});
		browser.storage.session.get({ tabRegistry: [] }).then(result => {
			setRegistry(result.tabRegistry as TabRegistration[]);
		});
		browser.storage.local.get({ demoMode: false }).then(result => {
			setDemoMode(result.demoMode as boolean);
		});
		void loadOpenTabs();

		const handleMessage = (msg: any) => {
			if (msg.type === 'SCORES_UPDATED') {
				mutate(
					{
						games: msg.games as Game[],
						scores: msg.scores as ExcitementResult[],
						leagueLogos: (msg.leagueLogos as LeagueLogoMap) ?? {}
					},
					{ revalidate: false }
				);
			}
		};
		browser.runtime.onMessage.addListener(handleMessage);
		return () => browser.runtime.onMessage.removeListener(handleMessage);
	}, [mutate]);

	const loadOpenTabs = async () => {
		const tabs = await browser.tabs.query({ currentWindow: true });
		setOpenTabs(tabs.filter(tab => tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('about:')));
	};

	const refreshStateFromBackground = async () => {
		const refreshed = await fetchState(true);
		mutate(refreshed, { revalidate: false });
	};

	const persistPrefs = (nextPrefs: UserPreferences) => {
		const normalized = normalizeUserPreferences(nextPrefs);
		setPrefs(normalized);
		const syncPromise = (async () => {
			await browser.storage.sync.set({ prefs: normalized });
			await browser.runtime.sendMessage({ type: 'UPDATE_PREFS', prefs: normalized });
		})();
		prefsSyncRef.current = syncPromise;
		void syncPromise.catch(err => {
			console.error('ArenaSwap: Failed to persist preferences:', err);
		});
	};

	const onToggleEnabled = () => {
		persistPrefs({ ...prefs, enabled: !prefs.enabled });
	};

	const onSensitivityChange = (val: number) => {
		persistPrefs({ ...prefs, sensitivity: val as UserPreferences['sensitivity'] });
	};

	const onCooldownChange = (val: number) => {
		persistPrefs({ ...prefs, cooldownSeconds: val });
	};

	const onToggleLeague = (leagueId: LeagueId) => {
		const current = new Set(prefs.enabledLeagues);
		if (current.has(leagueId)) current.delete(leagueId);
		else current.add(leagueId);
		const enabledLeagues = [...current].sort((a, b) => LEAGUE_ORDER[a] - LEAGUE_ORDER[b]);
		persistPrefs({ ...prefs, enabledLeagues });
	};

	const onToggleDemo = () => {
		const next = !demoMode;
		setDemoMode(next);
		void browser.runtime.sendMessage({ type: 'SET_DEMO_MODE', enabled: next });
	};

	const onRegistryChange = (updated: TabRegistration[]) => {
		setRegistry(updated);
		void browser.storage.session.set({ tabRegistry: updated });
		void browser.runtime.sendMessage({ type: 'UPDATE_REGISTRY', tabRegistry: updated });
	};

	const openSetup = () => setView('setup');
	const closeSetup = () => {
		setView('main');
		void (async () => {
			await prefsSyncRef.current.catch(() => {});
			await refreshStateFromBackground();
		})();
	};
	const oneWeekFromNow = Date.now() + 7 * 24 * 60 * 60 * 1000;
	const noLeaguesSelected = prefs.enabledLeagues.length === 0;

	if (view === 'setup') {
		return (
			<div style={POPUP_CONTAINER_STYLE}>
				<button className='setup-header' onClick={closeSetup}>
					<i className='bi bi-arrow-left' />
					Settings
				</button>

				<SensitivitySlider value={prefs.sensitivity} onChange={onSensitivityChange} />

				<div className='mt-2'>
					<CooldownSlider value={prefs.cooldownSeconds} onChange={onCooldownChange} />
				</div>

				<div className='fw-bold text-uppercase mt-3' style={SECTION_LABEL_STYLE}>Leagues</div>
				<div className='league-toggle-list'>
					{(Object.keys(SPORT_TYPE_ORDER) as SportType[])
						.sort((a, b) => SPORT_TYPE_ORDER[a] - SPORT_TYPE_ORDER[b])
						.map(sportType => (
							<div key={sportType} className='league-toggle-group'>
								<div className='sensitivity-label fw-semibold'>{SPORT_TYPE_LABELS[sportType]}</div>
								{LEAGUES_BY_SPORT_TYPE[sportType].map(league => (
									<div key={league.id} className='league-toggle-item mt-1'>
										<div className='league-toggle-item__meta'>
											<LeagueLogo league={league} leagueLogos={leagueLogos} />
											<label className='league-toggle-item__label mb-0' htmlFor={`league-${league.id}`}>{league.label}</label>
										</div>
										<div className='form-check form-switch mb-0'>
											<input
												className='form-check-input'
												type='checkbox'
												id={`league-${league.id}`}
												checked={prefs.enabledLeagues.includes(league.id)}
												onChange={() => onToggleLeague(league.id)}
											/>
										</div>
									</div>
								))}
							</div>
						))}
				</div>

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
			</div>
		);
	}

	const liveGames = games.filter(g => g.status === 'in');
	const upcomingGames = games
		.filter(g => g.status === 'pre')
		.filter(g => !g.startTime || new Date(g.startTime).getTime() <= oneWeekFromNow)
		.sort(byLeague);

	const registeredGameIds = new Set(registry.map(r => r.gameId));
	const assignedLiveGames = liveGames.filter(g => registeredGameIds.has(g.id)).sort(byLeague);
	const unassignedLiveGames = liveGames.filter(g => !registeredGameIds.has(g.id)).sort(byLeague);

	return (
		<div style={POPUP_CONTAINER_STYLE}>
			<div className='d-flex justify-content-between align-items-center mb-2 pb-2'>
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

			{!isLoading && noLeaguesSelected && (
				<div
					className='text-center rounded mt-2 mb-3 p-3'
					style={{ border: '1px solid rgba(247,92,3,0.45)', background: 'rgba(247,92,3,0.08)' }}
				>
					<h2
						className='fw-bold text-white lh-sm mb-2'
						style={{ fontSize: '1.2rem', letterSpacing: '-0.015em' }}
					>
						Choose leagues to get started
					</h2>
					<p className='mb-2 lh-sm' style={{ fontSize: '0.78rem', color: '#e6edf3' }}>
						ArenaSwap needs at least one league selected before it can find games to swap between.
					</p>
					<button className='btn btn-primary btn-lg w-100' onClick={openSetup}>
						Select Leagues in Settings
					</button>
				</div>
			)}

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

			{error && !data && (
				<div className='alert alert-danger d-flex align-items-center gap-2 mt-3 py-2 px-3' role='alert' style={{ fontSize: '0.7rem' }}>
					<i className='bi bi-exclamation-triangle-fill' />
					Failed to load games. Retrying&hellip;
				</div>
			)}

			{!isLoading && !noLeaguesSelected && assignedLiveGames.length > 0 && (
				<div>
					<div className='fw-bold text-body text-center' style={SECTION_TITLE_STYLE}>Active Tabs</div>
					{groupByLeague(assignedLiveGames).map(({ league, games: groupedGames }) => (
						<div key={league}>
							<div className='fw-bold text-uppercase mt-1' style={SECTION_LABEL_STYLE}>{LEAGUE_LABELS[league] ?? league.toUpperCase()}</div>
							{groupedGames.map(game => (
								<GameCard
									key={game.id}
									game={game}
									excitementResult={scores.find(s => s.gameId === game.id)}
									openTabs={openTabs}
									registry={registry}
									onRegistryChange={onRegistryChange}
									formatTabLabel={tab => formatTabLabel(tab, openTabs)}
								/>
							))}
						</div>
					))}
				</div>
			)}

			{!isLoading && !noLeaguesSelected && unassignedLiveGames.length > 0 && (
				<div className='mt-2'>
					<div className='fw-bold text-body text-center' style={SECTION_TITLE_STYLE}>Other Games</div>
					{groupByLeague(unassignedLiveGames).map(({ league, games: groupedGames }) => (
						<div key={league}>
							<div className='fw-bold text-uppercase mt-1' style={SECTION_LABEL_STYLE}>{LEAGUE_LABELS[league] ?? league.toUpperCase()}</div>
							{groupedGames.map(game => (
								<GameCard
									key={game.id}
									game={game}
									excitementResult={scores.find(s => s.gameId === game.id)}
									openTabs={openTabs}
									registry={registry}
									onRegistryChange={onRegistryChange}
									formatTabLabel={tab => formatTabLabel(tab, openTabs)}
								/>
							))}
						</div>
					))}
				</div>
			)}

			{!isLoading && !noLeaguesSelected && liveGames.length === 0 && registry.length === 0 && upcomingGames.length === 0 && (
				<div className='mt-3 text-center'>
					<div className='fw-bold text-body mb-1' style={{ fontSize: '1rem' }}>No games right now.</div>
					<button
						className='btn btn-link btn-sm p-0'
						style={{ fontSize: '0.85rem', color: '#2274A5' }}
						onClick={openSetup}
					>
						Settings →
					</button>
				</div>
			)}

			{!isLoading && !noLeaguesSelected && upcomingGames.length > 0 && (
				<div className='mt-2'>
					<div className='fw-bold text-body text-center' style={SECTION_TITLE_STYLE}>Up Next</div>
					{groupByLeague(upcomingGames).map(({ league, games: groupedGames }) => (
						<div key={league}>
							<div className='fw-bold text-uppercase mt-1' style={SECTION_LABEL_STYLE}>{LEAGUE_LABELS[league] ?? league.toUpperCase()}</div>
							{groupedGames.map(game => (
								<GameCard
									key={game.id}
									game={game}
									excitementResult={undefined}
									openTabs={openTabs}
									registry={registry}
									onRegistryChange={onRegistryChange}
									formatTabLabel={tab => formatTabLabel(tab, openTabs)}
								/>
							))}
						</div>
					))}
				</div>
			)}
		</div>
	);
};
