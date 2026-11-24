import Crest from '@arenaswap/ui/src/components/crest';
import { teamLogoOnColor } from '@arenaswap/core/constants';

interface walkthroughTeamLogoProps {
	abbr: string;
	color: string;
	logoUrl: string;
	className: string;
}

const walkthroughTeamLogo = ({ abbr, color, logoUrl, className }: walkthroughTeamLogoProps) => (
	<Crest
		logo={teamLogoOnColor(logoUrl)}
		abbreviation={abbr}
		className={className}
		teamColor={color}
	/>
);

export default walkthroughTeamLogo;
