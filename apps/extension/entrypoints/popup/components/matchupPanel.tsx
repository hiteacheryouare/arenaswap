import type { Game } from '@arenaswap/core/types';
import { resolveTeamColorPair } from '@arenaswap/ui/src/components/colorUtils';
import InjuryReport from './injuryReport';
import RecentForm from './recentForm';
import SeasonStatsCompare from './seasonStatsCompare';
import type { Matchup } from './matchupParse';

interface matchupPanelProps {
	game: Game;
	matchup: Matchup;
}

// Who is playing well, how the two compare, and who is missing. Injuries go last because they are
// the one section that can run long.
const matchupPanel = ({ game, matchup }: matchupPanelProps) => {
	const [awayColor, homeColor] = resolveTeamColorPair(game.awayTeam, game.homeTeam, '#2274A5', '#F75C03');

	return (
		<div className='gd-setup gd-matchup'>
			<RecentForm game={game} form={matchup.form} awayColor={awayColor} homeColor={homeColor} />
			<SeasonStatsCompare game={game} stats={matchup.stats} awayColor={awayColor} homeColor={homeColor} />
			<InjuryReport game={game} injuries={matchup.injuries} awayColor={awayColor} homeColor={homeColor} />
		</div>
	);
};

export default matchupPanel;
