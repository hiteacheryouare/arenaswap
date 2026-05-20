import { useState } from 'react';
import { leagueConfigs, resolveLeagueLogoUrl } from '@arenaswap/core/constants';
import type { LeagueId, LeagueLogoMap, SportType, UserPreferences } from '@arenaswap/core/types';
import CooldownSlider from './cooldownSlider';
import FavoriteTeamBonusInput from './favoriteTeamBonusInput';
import SensitivitySlider from './sensitivitySlider';
import SwitchDelaySlider from './switchDelaySlider';
import { leaguesBySportType, sportTypeLabels, sportTypeOrder } from '../popupHelpers';

interface setupViewProps {
	prefs: UserPreferences;
	prefsLoaded: boolean;
	demoMode: boolean;
	leagueLogos: LeagueLogoMap;
	onClose: () => void;
	onSensitivityChange: (val: number) => void;
	onCooldownChange: (val: number) => void;
	onSwitchDelayChange: (val: number) => void;
	onFavoriteTeamBonusChange: (val: number) => void;
	onToggleLeague: (leagueId: LeagueId) => void;
	onToggleSport: (sport: SportType, selectAll: boolean) => void;
	onToggleShowUpcoming: () => void;
	onToggleNotifications: () => void;
	onToggleDemo: () => void;
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
	prefs, prefsLoaded, demoMode, leagueLogos, onClose,
	onSensitivityChange, onCooldownChange, onSwitchDelayChange, onFavoriteTeamBonusChange,
	onToggleLeague, onToggleSport, onToggleShowUpcoming, onToggleNotifications, onToggleDemo,
}: setupViewProps) => {
	const [tab, setTab] = useState<'switching' | 'leagues'>('switching');

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

					<div className='popup-section-label mt-3'><i className='bi bi-toggles' />Options</div>

					<div className='d-flex justify-content-between align-items-center mt-2'>
						<label className='text-body-secondary setting-toggle-label' htmlFor='upcomingToggle'><i className='bi bi-calendar-event me-1 text-primary' />Show upcoming games</label>
						<div className='form-check form-switch mb-0'>
							<input className='form-check-input' type='checkbox' id='upcomingToggle' checked={prefs.showUpcomingGames} onChange={onToggleShowUpcoming} disabled={!prefsLoaded} />
						</div>
					</div>

					<div className='d-flex justify-content-between align-items-center mt-2'>
						<label className='text-body-secondary setting-toggle-label' htmlFor='notificationsToggle'><i className='bi bi-bell me-1 text-primary' />Switch notifications</label>
						<div className='form-check form-switch mb-0'>
							<input className='form-check-input' type='checkbox' id='notificationsToggle' checked={prefs.notificationsEnabled} onChange={onToggleNotifications} disabled={!prefsLoaded} />
						</div>
					</div>

					<div className='d-flex justify-content-between align-items-center mt-2'>
						<label className='text-body-secondary setting-toggle-label' htmlFor='demoToggle'><i className='bi bi-joystick me-1 text-primary' />Demo mode</label>
						<div className='form-check form-switch mb-0'>
							<input className='form-check-input' type='checkbox' id='demoToggle' checked={demoMode} onChange={onToggleDemo} />
						</div>
					</div>
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
									<div className='d-flex align-items-center justify-content-between'>
										<div className='fw-semibold text-body-secondary setting-toggle-label'>{sportTypeLabels[sportType]}</div>
										<button
											type='button'
											className='btn btn-outline-secondary btn-sm px-2 py-0 small'
											onClick={() => onToggleSport(sportType, !allSelected)}
											disabled={!prefsLoaded}
										>
											{allSelected ? 'none' : 'all'}
										</button>
									</div>
									{leagues.map(league => (
										<div key={league.id} className='d-flex align-items-center justify-content-between gap-2 mt-1 league-toggle-row'>
											<div className='d-flex align-items-center gap-2 min-w-0'>
												<LeagueLogo league={league} logos={leagueLogos} />
												<label className='fw-semibold text-body mb-0 lh-sm league-toggle-label' htmlFor={`league-${league.id}`}>{league.label}</label>
											</div>
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
									))}
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
