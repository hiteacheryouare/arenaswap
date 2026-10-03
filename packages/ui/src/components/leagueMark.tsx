import { leagueShortLabels, resolveLeagueLogoUrl } from '@arenaswap/core/constants';
import type { LeagueId, LeagueLogoMap } from '@arenaswap/core/types';
import Crest from './crest';

// What a card carries once the list stops sorting games under league headers. `onColor` asks for the
// logo drawn for a dark ground; `leagueMarkOnColor` works out whether the card needs it.
const leagueMark = ({ league, logos, onColor = false }: { league: LeagueId; logos: LeagueLogoMap; onColor?: boolean }) => {
	const logoUrl = resolveLeagueLogoUrl(league, logos[league], onColor ? 'dark' : 'light');
	return (
		<span className='d-flex align-items-center fw-bold text-uppercase text-nowrap game-card-league'>
			{logoUrl && <Crest logo={logoUrl} abbreviation='' className='game-card-league-logo' fallback='none' loading='lazy' />}
			{leagueShortLabels[league]}
		</span>
	);
};

export default leagueMark;
