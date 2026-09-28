import { i18n } from '#i18n';
import { Fragment } from 'react';
import type { Game, ProbableStarter, Team, TeamLeader } from '@arenaswap/core/types';
import Crest from '@arenaswap/ui/src/components/crest';
import { readableInkOn } from '@arenaswap/ui/src/components/colorUtils';
import { resolveGameColors } from '@arenaswap/ui/src/components/gameSurface';
import { leaderLabelKey, playerInitials, starterHeadingKey } from './pregameLabels';

interface pregameStatsProps {
	game: Game;
}

const starterStatusKeys = {
	confirmed: 'detail.starterConfirmed',
	expected: 'detail.starterExpected',
} as const;

const isHex = (color: string): boolean => /^#[\da-fA-F]{6}$/.test(color);

// The team colour lives on the disc, not on the placeholder: headshots are cut-outs with transparent
// backgrounds, so the disc is what the player stands on, and it has to survive the image landing.
const PlayerShot = ({ url, name, color, className }: {
	url?: string;
	name: string;
	color: string;
	className: string;
}) => (
	<span className={`dt-player-disc ${className}`} style={isHex(color) ? { background: color } : undefined}>
		<Crest
			logo={url}
			abbreviation={playerInitials(name)}
			className='dt-player-disc-crest'
			fallbackStyle={{ background: 'transparent', color: readableInkOn(color) }}
			loading='lazy'
		/>
	</span>
);

const hasLabelledStats = (starter: ProbableStarter): boolean => (
	starter.winLoss !== undefined || starter.era !== undefined
);

const StatPair = ({ value, label }: { value: string; label: string }) => (
	<div className='dt-starter-stat'>
		<span className='dt-starter-stat-value num'>{value}</span>
		<span className='dt-starter-stat-label'>{label}</span>
	</div>
);

// Away left, home right, under the crests they belong to. A missing starter leaves its half empty:
// a lone centred name reads as belonging to neither team.
const StarterColumn = ({ starter, color }: { starter?: ProbableStarter; color: string }) => (
	<div className='dt-starter'>
		{starter && (
			<>
				<PlayerShot url={starter.headshot} name={starter.name} color={color} className='dt-starter-shot' />
				<div className='dt-starter-name'>{starter.name}</div>
				{hasLabelledStats(starter) ? (
					<div className='dt-starter-stats'>
						{starter.winLoss && <StatPair value={starter.winLoss} label={i18n.t('detail.pitcherRecordLabel')} />}
						{starter.era && <StatPair value={starter.era} label={i18n.t('detail.pitcherEraLabel')} />}
					</div>
				) : starter.line && (
					<div className='dt-starter-line'>{starter.line}</div>
				)}
				{starter.status && (
					<div className='dt-starter-status'>{i18n.t(starterStatusKeys[starter.status])}</div>
				)}
			</>
		)}
	</div>
);

// Full width, one player per row. A football value runs to 21 characters, "14/23, 141 YDS, 1 INT",
// so the name takes the slack and truncates before a stat does.
const LeaderRow = ({ leader, team, color }: { leader?: TeamLeader; team: Team; color: string }) => {
	if (!leader) return null;
	return (
		<div className='dt-leader-row'>
			<PlayerShot url={leader.headshot} name={leader.player} color={color} className='dt-leader-shot' />
			<span className='dt-leader-team'>{team.abbreviation}</span>
			<span className='dt-leader-player'>{leader.player}</span>
			{/* Verbatim: the football values carry their own English units. */}
			<span className='dt-leader-value num'>{leader.value}</span>
		</div>
	);
};

const pregameStats = ({ game }: pregameStatsProps) => {
	const awayStarter = game.awayTeam.probableStarter;
	const homeStarter = game.homeTeam.probableStarter;
	const hasStarter = awayStarter !== undefined || homeStarter !== undefined;

	// One row per category either side has a leader in, in the order the away team's arrived.
	const awayLeaders = game.awayTeam.leaders ?? [];
	const homeLeaders = game.homeTeam.leaders ?? [];
	const categories = [...new Set([...awayLeaders, ...homeLeaders].map(l => l.category))];

	const starterHeading = starterHeadingKey(game.sportType);
	const showStarters = hasStarter && starterHeading !== undefined;
	if (!showStarters && categories.length === 0) return null;

	const [awayColor, homeColor] = resolveGameColors(game);

	return (
		<>
			{showStarters && (
				<section className='card dt-card dt-starters-card'>
					<h3 className='dt-card-title dt-stats-heading'>{i18n.t(starterHeading)}</h3>
					<div className='dt-starters'>
						<StarterColumn starter={awayStarter} color={awayColor} />
						<StarterColumn starter={homeStarter} color={homeColor} />
					</div>
				</section>
			)}

			{categories.length > 0 && (
				<section className='card dt-card dt-leaders-card'>
					<h3 className='dt-card-title dt-stats-heading'>{i18n.t('detail.teamLeaders')}</h3>
					<div className='dt-leaders'>
						{categories.map(category => {
							const away = awayLeaders.find(l => l.category === category);
							const home = homeLeaders.find(l => l.category === category);
							const labelKey = leaderLabelKey(game.sportType, category);
							const label = labelKey ? i18n.t(labelKey) : (away ?? home)?.fallbackLabel;
							return (
								<Fragment key={category}>
									<div className='dt-leader-category'>{label}</div>
									<LeaderRow leader={away} team={game.awayTeam} color={awayColor} />
									<LeaderRow leader={home} team={game.homeTeam} color={homeColor} />
								</Fragment>
							);
						})}
					</div>
				</section>
			)}
		</>
	);
};

export default pregameStats;
