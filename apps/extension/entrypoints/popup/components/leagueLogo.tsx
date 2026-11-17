import { leagueConfigs, resolveLeagueLogoUrl } from '@arenaswap/core/constants';
import type { LeagueLogoMap } from '@arenaswap/core/types';
import Crest from '@arenaswap/ui/src/components/crest';
import useDocumentTheme from '@arenaswap/ui/src/components/useDocumentTheme';

export type leagueConfig = (typeof leagueConfigs)[number];

export const toLeagueInitials = (league: leagueConfig): string => {
	const words = league.label.split(/\s+/);
	if (words.length === 1) return words[0]!.slice(0, 4).toUpperCase();
	return words.map(word => word[0] ?? '').join('').slice(0, 3).toUpperCase();
};

const LeagueLogo = ({ league, logos }: { league: leagueConfig; logos: LeagueLogoMap }) => {
	const theme = useDocumentTheme();
	return (
		<Crest
			logo={resolveLeagueLogoUrl(league.id, logos[league.id], theme)}
			abbreviation={toLeagueInitials(league)}
			className='league-toggle-logo'
			loading='lazy'
		/>
	);
};

export default LeagueLogo;
