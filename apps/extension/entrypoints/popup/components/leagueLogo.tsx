import { leagueConfigs, resolveLeagueLogoUrl } from '@arenaswap/core/constants';
import type { LeagueLogoMap } from '@arenaswap/core/types';
import Crest from '@arenaswap/ui/src/components/crest';

export type leagueConfig = (typeof leagueConfigs)[number];

// Initials only for a label with words to take them from. Half the leagues are already acronyms, and
// first-letters turned NBA, NHL, NFL and NWSL into four crests all reading 'N'.
export const toLeagueInitials = (league: leagueConfig): string => {
	const words = league.label.split(/\s+/);
	if (words.length === 1) return words[0]!.slice(0, 4).toUpperCase();
	return words.map(word => word[0] ?? '').join('').slice(0, 3).toUpperCase();
};

// Decorative: every league mark in the popup sits beside its own visible label.
const LeagueLogo = ({ league, logos }: { league: leagueConfig; logos: LeagueLogoMap }) => (
	<Crest
		logo={resolveLeagueLogoUrl(league.id, logos[league.id])}
		abbreviation={toLeagueInitials(league)}
		className='league-toggle-logo'
		loading='lazy'
	/>
);

export default LeagueLogo;
