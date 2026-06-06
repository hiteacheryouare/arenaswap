import { useState } from 'react';
import { leagueConfigs, resolveLeagueLogoUrl } from '@arenaswap/core/constants';
import type { LeagueId, LeagueLogoMap, SportType, UserPreferences } from '@arenaswap/core/types';
import type { Browser } from 'wxt/browser';
import CooldownSlider from './cooldownSlider';
import FavoriteTeamBonusInput from './favoriteTeamBonusInput';
import SensitivitySlider from './sensitivitySlider';
import SwitchDelaySlider from './switchDelaySlider';
import StandbyStreamGuide from './standbyStreamGuide';
import { leaguesBySportType, sportTypeLabels, sportTypeOrder } from '../popupHelpers';

interface setupViewProps {
	prefs: UserPreferences;
	prefsLoaded: boolean;
	demoMode: boolean;
	leagueLogos: LeagueLogoMap;
	standbyStreamTabId: number | null;
	standbyOnboardingDone: boolean;
	openTabs: Browser.tabs.Tab[];
	formatTabLabel: (tab: Browser.tabs.Tab) => string;
	onClose: () => void;
	onSensitivityChange: (val: number) => void;
	onCooldownChange: (val: number) => void;
	onSwitchDelayChange: (val: number) => void;
	onFavoriteTeamBonusChange: (val: number) => void;
	onToggleLeague: (leagueId: LeagueId) => void;
	onToggleSport: (sport: SportType, selectAll: boolean) => void;
	onToggleShowUpcoming: () => void;
	onToggleProTips: () => void;
	onToggleNotifications: () => void;
	onToggleDemo: () => void;
	onToggleStandbyStream: () => void;
	onStandbyThresholdChange: (val: number) => void;
	onSetStandbyTab: (tabId: number | null) => void;
	onStandbyOnboardingDone: () => void;
}

type leagueConfig = (typeof leagueConfigs)[number];

const toLeagueInitials = (league: leagueConfig): string => (
	league.label.split(/\s+/).map(part => part[0] ?? '').join('').slice(0, 3).toUpperCase()
);

const LeagueLogo = ({ league, logos }: { league: leagueConfig; logos: LeagueLogoMap }) => {
	const [imageFailed, setImageFailed] = useState(false);
	const logoUrl = resolveLeagueLogoUrl(league.id, logos[league.id]);
	if (imageFailed) {
		return (
			<span className='league-toggle-logo league-toggle-logo-fallback d-inline-flex align-items-center justify-content-center fw-bold'>
				{toLeagueInitials(league)}
			</span>
		);
	}
	return (
		<img src={logoUrl} alt={`${league.label} logo`} className='league-toggle-logo' loading='lazy' onError={() => setImageFailed(true)} />
	);
};

const setupView = ({
	prefs, prefsLoaded, demoMode, leagueLogos, standbyStreamTabId, standbyOnboardingDone,
	openTabs, formatTabLabel, onClose, onSensitivityChange, onCooldownChange, onSwitchDelayChange,
	onFavoriteTeamBonusChange, onToggleLeague, onToggleSport, onToggleShowUpcoming,
	onToggleProTips, onToggleNotifications, onToggleDemo, onToggleStandbyStream, onStandbyThresholdChange,
	onSetStandbyTab, onStandbyOnboardingDone,
}: setupViewProps) => {
	const [tab, setTab] = useState<'switching' | 'leagues'>('switching');
	const [showStandbyGuide, setShowStandbyGuide] = useState(false);

	const handleToggleStandbyStream = () => {
		if (!prefs.standbyStreamEnabled && !standbyOnboardingDone) {
			setShowStandbyGuide(true);
		}
		onToggleStandbyStream();
	};

	const handleStandbyGuideDone = () => {
		setShowStandbyGuide(false);
		onStandbyOnboardingDone();
	};

	if (showStandbyGuide) {
		return <StandbyStreamGuide onDone={handleStandbyGuideDone} />;
	}

	return (
		<div className='popup-container'>
			<button className='setup-header' onClick={onClose}>
				<i className='bi bi-arrow-left' />
				Settings
			</button>

			<ul className='nav nav-pills nav-fill setup-tabs mb-3'>
				<li className='nav-item'>
					<button type='button' className={`nav-link ${tab === 'switching' ? 'active' : ''}`} onClick={() => setTab('switching')}>Switching</button>
				</li>
				<li className='nav-item'>
					<button type='button' className={`nav-link ${tab === 'leagues' ? 'active' : ''}`} onClick={() => setTab('leagues')}>
						Leagues
						{prefsLoaded && prefs.enabledLeagues.length === 0 && (
							<i className='bi bi-exclamation-circle ms-1 text-warning' />
						)}
					</button>
				</li>
			</ul>

			{tab === 'switching' && (
				<div>
					<SensitivitySlider value={prefs.sensitivity} onChange={onSensitivityChange} />
					<div className='mt-3'><CooldownSlider value={prefs.cooldownSeconds} onChange={onCooldownChange} /></div>
					<div className='mt-3'><SwitchDelaySlider value={prefs.switchDelaySeconds} onChange={onSwitchDelayChange} /></div>
					<div className='mt-3'><FavoriteTeamBonusInput value={prefs.favoriteTeamBonusPoints} onChange={onFavoriteTeamBonusChange} /></div>

					<div className='settings-section-heading'>
						<div className='settings-section-heading-rule' />
						<span className='settings-section-label-text'>Options</span>
						<div className='settings-section-heading-rule' />
					</div>

					<div className='settings-toggle-group'>
						<div className='settings-toggle-row'>
							<label className='setting-toggle-label' htmlFor='upcomingToggle'><i className='bi bi-calendar-event me-1 text-primary' />Show upcoming games</label>
							<div className='form-check form-switch mb-0'>
								<input className='form-check-input' type='checkbox' id='upcomingToggle' checked={prefs.showUpcomingGames} onChange={onToggleShowUpcoming} disabled={!prefsLoaded} />
							</div>
						</div>
						<div className='settings-toggle-row'>
							<label className='setting-toggle-label' htmlFor='proTipsToggle'><i className='bi bi-lightbulb me-1 text-primary' />Pro tips</label>
							<div className='form-check form-switch mb-0'>
								<input className='form-check-input' type='checkbox' id='proTipsToggle' checked={prefs.proTipsEnabled} onChange={onToggleProTips} disabled={!prefsLoaded} />
							</div>
						</div>
						<div className='settings-toggle-row'>
							<label className='setting-toggle-label' htmlFor='notificationsToggle'><i className='bi bi-bell me-1 text-primary' />Switch notifications</label>
							<div className='form-check form-switch mb-0'>
								<input className='form-check-input' type='checkbox' id='notificationsToggle' checked={prefs.notificationsEnabled} onChange={onToggleNotifications} disabled={!prefsLoaded} />
							</div>
						</div>
						<div className='settings-toggle-row'>
							<label className='setting-toggle-label' htmlFor='demoToggle'><i className='bi bi-joystick me-1 text-primary' />Demo mode</label>
							<div className='form-check form-switch mb-0'>
								<input className='form-check-input' type='checkbox' id='demoToggle' checked={demoMode} onChange={onToggleDemo} />
							</div>
						</div>
					</div>

					<div className='settings-section-heading'>
						<div className='settings-section-heading-rule' />
						<span className='settings-section-label-text'>Standby Stream</span>
						<div className='settings-section-heading-rule' />
					</div>

					<div className='settings-toggle-group'>
						<div className='settings-toggle-row'>
							<label className='setting-toggle-label' htmlFor='standbyStreamToggle'><i className='bi bi-broadcast me-1 text-primary' />Enable Standby Stream</label>
							<div className='form-check form-switch mb-0'>
								<input className='form-check-input' type='checkbox' id='standbyStreamToggle' checked={prefs.standbyStreamEnabled} onChange={handleToggleStandbyStream} disabled={!prefsLoaded} />
							</div>
						</div>
					</div>

					{prefs.standbyStreamEnabled && (
						<div className='mt-3 d-flex flex-column gap-3'>
							<div>
								<div className='d-flex justify-content-between align-items-center mb-1'>
									<label className='setting-toggle-label' htmlFor='standbyThresholdSlider'>
										<i className='bi bi-thermometer-half me-1 text-primary' />Standby below
									</label>
									<span className='fw-semibold setting-value-label'>{prefs.standbyStreamThreshold}</span>
								</div>
								<input
									type='range'
									className='form-range'
									id='standbyThresholdSlider'
									min={0}
									max={100}
									step={1}
									value={prefs.standbyStreamThreshold}
									onChange={e => onStandbyThresholdChange(Number(e.target.value))}
									disabled={!prefsLoaded}
								/>
								<div className='d-flex justify-content-between'>
									<span className='setting-explainer'>More patient</span>
									<span className='setting-explainer'>Switches sooner</span>
								</div>
							</div>

							<div>
								<div className='text-body-secondary setting-toggle-label mb-1'>
									<i className='bi bi-window-stack me-1 text-primary' />Standby tab
								</div>
								<select
									className='form-select form-select-sm'
									value={standbyStreamTabId ?? ''}
									onChange={e => {
										const val = e.target.value;
										const num = Number(val);
										onSetStandbyTab(val && Number.isFinite(num) ? num : null);
									}}
									disabled={!prefsLoaded}
								>
									<option value=''>— Select a tab —</option>
									{openTabs.map(tab => (
										<option key={tab.id} value={tab.id}>
											{formatTabLabel(tab)}
										</option>
									))}
								</select>
							</div>
						</div>
					)}
				</div>
			)}

			{tab === 'leagues' && (
				<div>
					<div className='mb-2 setting-explainer'>
						Only selected leagues are tracked and considered for automatic switching.
					</div>
					{(Object.keys(sportTypeOrder) as SportType[])
						.sort((a, b) => sportTypeOrder[a] - sportTypeOrder[b])
						.map(sportType => {
							const leagues = leaguesBySportType[sportType];
							const allSelected = leagues.every(l => prefs.enabledLeagues.includes(l.id));
							return (
								<div key={sportType} className='league-toggle-group'>
									<div className='settings-section-heading'>
										<div className='settings-section-heading-rule' />
										<span className='settings-section-label-text'>{sportTypeLabels[sportType]}</span>
										<div className='settings-section-heading-rule' />
										<button
											type='button'
											className='btn btn-outline-secondary btn-sm px-2 py-0 small'
											onClick={() => onToggleSport(sportType, !allSelected)}
											disabled={!prefsLoaded}
										>
											{allSelected ? 'none' : 'all'}
										</button>
									</div>
									<div className='league-toggle-grid'>
										{leagues.map(league => (
											<div key={league.id} className='league-toggle-row'>
												<div className='league-toggle-row-top'>
													<LeagueLogo league={league} logos={leagueLogos} />
													<div className='form-check form-switch mb-0'>
														<input
															className='form-check-input'
															type='checkbox'
															id={`league-${league.id}`}
															checked={prefs.enabledLeagues.includes(league.id)}
															onChange={() => onToggleLeague(league.id)}
															disabled={!prefsLoaded}
														/>
													</div>
												</div>
												<label className='fw-semibold text-body mb-0 league-toggle-label' htmlFor={`league-${league.id}`}>{league.label}</label>
											</div>
										))}
									</div>
								</div>
							);
						})}
					{prefsLoaded && prefs.enabledLeagues.length === 0 && (
						<div className='setup-no-leagues-warn mt-2 mb-1'>
							<i className='bi bi-exclamation-circle me-1' />
							No leagues selected — ArenaSwap won&apos;t track any games.
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default setupView;
