import { i18n } from '#i18n';
import type { Game, ProbableStarter, TeamLeader } from '@arenaswap/core/types';
import { leaderLabelKey, starterHeadingKey } from './pregameLabels';

interface pregameStatsProps {
	game: Game;
}

const starterStatusKeys = {
	confirmed: 'detail.starterConfirmed',
	expected: 'detail.starterExpected',
} as const;

// Away on the left, home on the right, the same order the poster above puts them in. A missing
// starter leaves its column empty rather than re-centring the one we have: 11 of 97 upcoming
// games had only one side named, and a lone centred name reads as belonging to neither team.
const StarterColumn = ({ starter }: { starter?: ProbableStarter }) => (
	<div className='gd-pregame-starter'>
		{starter && <div className='gd-pregame-starter-name'>{starter.name}</div>}
		{starter?.line && <div className='gd-pregame-starter-line font-lekton'>{starter.line}</div>}
		{starter?.status && (
			<div className='gd-pregame-starter-status'>{i18n.t(starterStatusKeys[starter.status])}</div>
		)}
	</div>
);

const LeaderCell = ({ leader }: { leader?: TeamLeader }) => (
	<div className='gd-pregame-leader'>
		{leader && (
			<>
				<span className='gd-pregame-leader-player'>{leader.player}</span>
				{/* Verbatim from ESPN. The football values carry their own English units and there
				    is no version of "12 CAR, 68 YDS, 1 TD" we could assemble ourselves. */}
				<span className='gd-pregame-leader-value font-lekton'>{leader.value}</span>
			</>
		)}
	</div>
);

const pregameStats = ({ game }: pregameStatsProps) => {
	const awayStarter = game.awayTeam.probableStarter;
	const homeStarter = game.homeTeam.probableStarter;
	const hasStarter = awayStarter !== undefined || homeStarter !== undefined;

	// One row per category either side has a leader in, in the order the away team's arrived.
	const awayLeaders = game.awayTeam.leaders ?? [];
	const homeLeaders = game.homeTeam.leaders ?? [];
	const categories = [...new Set([...awayLeaders, ...homeLeaders].map(l => l.category))];

	if (!hasStarter && categories.length === 0) return null;

	const starterHeading = starterHeadingKey(game.sportType);

	return (
		<div className='gd-setup gd-pregame-stats'>
			{hasStarter && starterHeading && (
				<>
					<div className='gd-setup-heading'>{i18n.t(starterHeading)}</div>
					<div className='gd-pregame-mirror'>
						<StarterColumn starter={awayStarter} />
						<div className='gd-pregame-label' />
						<StarterColumn starter={homeStarter} />
					</div>
				</>
			)}

			{categories.length > 0 && (
				<>
					<div className='gd-setup-heading'>{i18n.t('detail.teamLeaders')}</div>
					{categories.map(category => {
						const away = awayLeaders.find(l => l.category === category);
						const home = homeLeaders.find(l => l.category === category);
						const labelKey = leaderLabelKey(game.sportType, category);
						const label = labelKey ? i18n.t(labelKey) : (away ?? home)?.fallbackLabel;
						return (
							<div className='gd-pregame-mirror' key={category}>
								<LeaderCell leader={away} />
								<div className='gd-pregame-label'>{label}</div>
								<LeaderCell leader={home} />
							</div>
						);
					})}
				</>
			)}
		</div>
	);
};

export default pregameStats;
