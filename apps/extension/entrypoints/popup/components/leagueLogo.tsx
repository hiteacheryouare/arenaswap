import { useState } from 'react';
import { i18n } from '#i18n';
import { leagueConfigs, resolveLeagueLogoUrl } from '@arenaswap/core/constants';
import type { LeagueLogoMap } from '@arenaswap/core/types';

export type leagueConfig = (typeof leagueConfigs)[number];

export const toLeagueInitials = (league: leagueConfig): string => (
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
		<img src={logoUrl} alt={i18n.t('setup.leagueLogoAlt', { label: league.label })} className='league-toggle-logo' loading='lazy' onError={() => setImageFailed(true)} />
	);
};

export default LeagueLogo;
