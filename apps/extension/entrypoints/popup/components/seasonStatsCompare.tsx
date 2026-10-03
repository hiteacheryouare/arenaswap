import { i18n } from '#i18n';
import type { Game } from '@arenaswap/core/types';
import { readableTeamInkOnCard } from '@arenaswap/ui/src/components/colorUtils';
import type { StatComparison } from './matchupParse';

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

const seasonStatsCompare = ({ game, stats, awayColor, homeColor }: seasonStatsCompareProps) => {
	if (stats.length === 0) return null;

	return (
		<>
			<div className='gd-setup-heading gd-compare-heading'>
				<span style={{ color: readableTeamInkOnCard(awayColor) }}>{game.awayTeam.abbreviation}</span>
				<span>{i18n.t('detail.seasonStats')}</span>
				<span style={{ color: readableTeamInkOnCard(homeColor) }}>{game.homeTeam.abbreviation}</span>
			</div>
			<div className='gd-compare'>
				{stats.map(stat => (
					<div className='gd-compare-row' key={stat.labelKey}>
						<StatValue value={stat.away} rank={stat.awayRank} isBetter={stat.better === 'away'} />
						<span className='gd-compare-label'>{i18n.t(stat.labelKey)}</span>
						<StatValue value={stat.home} rank={stat.homeRank} isBetter={stat.better === 'home'} />
						{stat.awayShare !== null && (
							// The longer half is always the better team's, already flipped for the
							// stats where lower wins, so the bar never needs a legend.
							<span className='gd-compare-bar' aria-hidden='true'>
								<span style={{ flexGrow: stat.awayShare, background: awayColor }} />
								<span style={{ flexGrow: 1 - stat.awayShare, background: homeColor }} />
							</span>
						)}
					</div>
				))}
			</div>
		</>
	);
};

export default seasonStatsCompare;
