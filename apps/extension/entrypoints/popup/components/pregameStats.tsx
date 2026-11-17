import { i18n } from '#i18n';
import { Fragment } from 'react';
import type { Game, ProbableStarter, Team, TeamLeader } from '@arenaswap/core/types';
import { readableTeamInkOnCard, resolveTeamColorPair, teamRowWash } from '@arenaswap/chromatic';
import PlayerShot from './playerShot';
import { leaderLabelKey, starterHeadingKey } from './pregameLabels';

interface pregameStatsProps {
	game: Game;
}

const starterStatusKeys = {
	confirmed: 'detail.starterConfirmed',
	expected: 'detail.starterExpected',
} as const;

const hasLabelledStats = (starter: ProbableStarter): boolean => (
	starter.winLoss !== undefined || starter.era !== undefined
);

const StatPair = ({ value, label }: { value: string; label: string }) => (
	<div className='gd-pregame-stat'>
		<span className='gd-pregame-stat-value'>{value}</span>
		<span className='gd-pregame-stat-label'>{label}</span>
	</div>
);

const StarterColumn = ({ starter, color }: { starter?: ProbableStarter; color: string }) => (
	<div className='gd-pregame-starter'>
		{starter && (
			<>
				<PlayerShot url={starter.headshot} name={starter.name} color={color} className='gd-pregame-starter-shot' />
				<div className='gd-pregame-starter-name'>{starter.name}</div>
				{hasLabelledStats(starter) ? (
					<div className='gd-pregame-starter-stats'>
						{starter.winLoss && <StatPair value={starter.winLoss} label={i18n.t('detail.pitcherRecordLabel')} />}
						{starter.era && <StatPair value={starter.era} label={i18n.t('detail.pitcherEraLabel')} />}
					</div>
				) : starter.line && (
					<div className='gd-pregame-starter-line'>{starter.line}</div>
				)}
				{starter.status && (
					<div className='gd-pregame-starter-status'>{i18n.t(starterStatusKeys[starter.status])}</div>
				)}
			</>
		)}
	</div>
);

const LeaderRow = ({ leader, team, color }: { leader?: TeamLeader; team: Team; color: string }) => {
	if (!leader) return null;
	return (
		<div className='gd-pregame-leader-row' style={{ backgroundImage: teamRowWash(color) }}>
			<PlayerShot url={leader.headshot} name={leader.player} color={color} className='gd-pregame-leader-shot' />
			<span className='gd-pregame-leader-team' style={{ color: readableTeamInkOnCard(color) }}>
				{team.abbreviation}
			</span>
			<span className='gd-pregame-leader-player' title={leader.player}>{leader.player}</span>
			<span className='gd-pregame-leader-value'>{leader.value}</span>
		</div>
	);
};

const pregameStats = ({ game }: pregameStatsProps) => {
	const awayStarter = game.awayTeam.probableStarter;
	const homeStarter = game.homeTeam.probableStarter;
	const hasStarter = awayStarter !== undefined || homeStarter !== undefined;

	const awayLeaders = game.awayTeam.leaders ?? [];
	const homeLeaders = game.homeTeam.leaders ?? [];
	const categories = [...new Set([...awayLeaders, ...homeLeaders].map(l => l.category))];

	if (!hasStarter && categories.length === 0) return null;

	const starterHeading = starterHeadingKey(game.sportType);
	const [awayColor, homeColor] = resolveTeamColorPair(game.awayTeam, game.homeTeam, '#2274A5', '#F75C03');

	return (
		<div className='gd-setup gd-pregame-stats'>
			{hasStarter && starterHeading && (
				<>
					<div className='gd-setup-heading'>{i18n.t(starterHeading)}</div>
					<div className='gd-pregame-starters'>
						<StarterColumn starter={awayStarter} color={awayColor} />
						<StarterColumn starter={homeStarter} color={homeColor} />
					</div>
				</>
			)}

			{categories.length > 0 && (
				<>
					<div className='gd-setup-heading'>{i18n.t('detail.teamLeaders')}</div>
					<div className='gd-pregame-leaders'>
						{categories.map(category => {
							const away = awayLeaders.find(l => l.category === category);
							const home = homeLeaders.find(l => l.category === category);
							const labelKey = leaderLabelKey(game.sportType, category);
							const label = labelKey ? i18n.t(labelKey) : (away ?? home)?.fallbackLabel;
							return (
								<Fragment key={category}>
									<div className='gd-pregame-category'>{label}</div>
									<LeaderRow leader={away} team={game.awayTeam} color={awayColor} />
									<LeaderRow leader={home} team={game.homeTeam} color={homeColor} />
								</Fragment>
							);
						})}
					</div>
				</>
			)}
		</div>
	);
};

export default pregameStats;
