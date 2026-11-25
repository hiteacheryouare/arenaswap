import { useState } from 'react';
import { allLeagueIds, leagueLabels, leagueShortLabels, resolveLeagueLogoUrl } from '@arenaswap/core/constants';
import type { LeagueId, LeagueLogoMap } from '@arenaswap/core/types';
import Crest from './crest';

const tileLogoUrl = (league: LeagueId, logos: LeagueLogoMap) => resolveLeagueLogoUrl(league, logos[league], 'light');

export const isLogoShared = (league: LeagueId, logos: LeagueLogoMap): boolean => {
	const logoUrl = tileLogoUrl(league, logos);
	return allLeagueIds.some(other => other !== league && tileLogoUrl(other, logos) === logoUrl);
};

const leagueMark = ({ league, logos }: { league: LeagueId; logos: LeagueLogoMap }) => {
	const logoUrl = tileLogoUrl(league, logos);
	const [failedLogo, setFailedLogo] = useState<string>();
	const labelHidden = Boolean(logoUrl) && failedLogo !== logoUrl && !isLogoShared(league, logos);
	return (
		<span className='d-flex align-items-center fw-bold text-uppercase text-nowrap game-card-league'>
			{logoUrl && <Crest logo={logoUrl} abbreviation='' title={leagueLabels[league]} className='game-card-league-logo' fallback='none' loading='lazy' onFailed={() => setFailedLogo(logoUrl)} />}
			<span className={labelHidden ? 'visually-hidden' : undefined}>{leagueShortLabels[league]}</span>
		</span>
	);
};

export default leagueMark;
