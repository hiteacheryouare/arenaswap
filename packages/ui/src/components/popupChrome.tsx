import { useState } from 'react';
import { leagueConfigs, resolveLeagueLogoUrl } from '@arenaswap/core/constants';
import type { LeagueId, LeagueLogoMap } from '@arenaswap/core/types';
import { useT } from './i18nContext';

// The chrome the popup's main view is built out of. The website used to redraw these three
// pieces in its own markup and its own CSS, which drifted: the section title lost its orange
// rule, the league row lost its logo, and the header switch was a div. Sharing them means the
// site cannot describe a popup that does not exist.
//
// `logoSrc` is a prop because the extension serves the wordmark from `/images` and the site
// from a `base`-prefixed path. Everything else is identical on both.

export const leagueLabels = Object.fromEntries(
	leagueConfigs.map(config => [config.id, config.label]),
) as Record<LeagueId, string>;

export const PopupHeader = ({
	logoSrc,
	enabled,
	prefsLoaded = true,
	onToggleEnabled,
	onOpenSettings,
	onStartTour,
}: {
	logoSrc: string;
	enabled: boolean;
	prefsLoaded?: boolean;
	onToggleEnabled: () => void;
	onOpenSettings: () => void;
	onStartTour: () => void;
}) => {
	const t = useT();
	return (
		<div className='d-flex justify-content-between align-items-center mb-2 pb-2'>
			<img src={logoSrc} alt='ArenaSwap' className='arenaswap-logo' />
			<div className='d-flex align-items-center gap-2'>
				<button className='btn btn-sm p-0 popup-settings-button' onClick={onStartTour} title={t('main.tourButton')} aria-label={t('main.tourButton')}>
					<i className='bi bi-question-circle popup-settings-icon' />
				</button>
				<button className='btn btn-sm p-0 popup-settings-button' onClick={onOpenSettings} title={t('main.settingsButton')} aria-label={t('main.settingsButton')}>
					<i className='bi bi-gear-fill popup-settings-icon' />
				</button>
				<div className='form-check form-switch mb-0'>
					<input className='form-check-input' type='checkbox' id='enableToggle' checked={enabled} onChange={onToggleEnabled} disabled={!prefsLoaded} aria-label={t('main.enableToggleLabel')} />
				</div>
			</div>
		</div>
	);
};

export const PopupSectionTitle = ({ children, first }: { children: string; first?: boolean }) => (
	<div className='popup-section-title' style={first ? { marginTop: '0.25rem' } : undefined}>{children}</div>
);

export const LeagueSectionHeader = ({ league, logos }: { league: LeagueId; logos: LeagueLogoMap }) => {
	const [imgFailed, setImgFailed] = useState(false);
	const logoUrl = resolveLeagueLogoUrl(league, logos[league]);
	return (
		<div className='fw-bold text-uppercase popup-section-label'>
			{!imgFailed && logoUrl && (
				<img
					src={logoUrl}
					alt=''
					className='popup-league-logo'
					loading='lazy'
					onError={() => setImgFailed(true)}
				/>
			)}
			{leagueLabels[league] ?? league.toUpperCase()}
		</div>
	);
};
