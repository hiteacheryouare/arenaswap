import { leagueShortLabels, resolveLeagueLogoUrl } from '@arenaswap/core/constants';
import type { LeagueId, LeagueLogoMap } from '@arenaswap/core/types';
import Crest from './crest';

// What a card carries once the list stops sorting games under league headers. Every card is a light
// plate whatever the theme, so the logo is always the light-ground variant.
const leagueMark = ({ league, logos }: { league: LeagueId; logos: LeagueLogoMap }) => {
	const logoUrl = resolveLeagueLogoUrl(league, logos[league], 'light');
	return (
		<span className='d-flex align-items-center fw-bold text-uppercase text-nowrap game-card-league'>
			{logoUrl && <Crest logo={logoUrl} abbreviation='' className='game-card-league-logo' fallback='none' loading='lazy' />}
			{leagueShortLabels[league]}
		</span>
	);
};

export default leagueMark;
