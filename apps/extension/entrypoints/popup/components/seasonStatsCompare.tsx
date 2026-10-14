import { i18n } from '#i18n';
import { isHomeFirst } from '@arenaswap/core/constants';
import type { Game, Team } from '@arenaswap/core/types';
import { readableTeamInkOnCard } from '@arenaswap/chromatic';
import type { StatComparison } from '@arenaswap/sideline';

interface seasonStatsCompareProps {
	game: Game;
	stats: StatComparison[];
	awayColor: string;
	homeColor: string;
}

const StatValue = ({ value, rank, isBetter }: { value: string; rank?: number; isBetter: boolean }) => (
	<span className='gd-compare-value' data-better={isBetter}>
		{value}
		{rank !== undefined && <span className='gd-compare-rank'>{i18n.t('detail.statRank', { rank: String(rank) })}</span>}
	</span>
);

const Heading = ({ team, color }: { team: Team; color: string }) => (
	<span style={{ color: readableTeamInkOnCard(color) }}>{team.abbreviation}</span>
);

const seasonStatsCompare = ({ game, stats, awayColor, homeColor }: seasonStatsCompareProps) => {
	if (stats.length === 0) return null;
	const homeFirst = isHomeFirst(game);

	return (
		<>
			<div className='gd-setup-heading gd-compare-heading'>
				{homeFirst ? <Heading team={game.homeTeam} color={homeColor} /> : <Heading team={game.awayTeam} color={awayColor} />}
				<span>{i18n.t('detail.seasonStats')}</span>
				{homeFirst ? <Heading team={game.awayTeam} color={awayColor} /> : <Heading team={game.homeTeam} color={homeColor} />}
			</div>
			<div className='gd-compare'>
				{stats.map(stat => {
					const away = <StatValue value={stat.away} rank={stat.awayRank} isBetter={stat.better === 'away'} />;
					const home = <StatValue value={stat.home} rank={stat.homeRank} isBetter={stat.better === 'home'} />;
					const awayHalf = stat.awayShare !== null && <span style={{ flexGrow: stat.awayShare, background: awayColor }} />;
					const homeHalf = stat.awayShare !== null && <span style={{ flexGrow: 1 - stat.awayShare, background: homeColor }} />;
					return (
						<div className='gd-compare-row' key={stat.labelKey}>
							{homeFirst ? home : away}
							<span className='gd-compare-label'>{i18n.t(stat.labelKey)}</span>
							{homeFirst ? away : home}
							{stat.awayShare !== null && (
								// The longer half is always the better team's, already flipped for the
								// stats where lower wins, so the bar never needs a legend.
								<span className='gd-compare-bar' aria-hidden='true'>
									{homeFirst ? homeHalf : awayHalf}
									{homeFirst ? awayHalf : homeHalf}
								</span>
							)}
						</div>
					);
				})}
			</div>
		</>
	);
};

export default seasonStatsCompare;
