import { i18n } from '#i18n';
import { Fragment } from 'react';
import type { Game, ProbableStarter, Team, TeamLeader } from '@arenaswap/core/types';
import Crest from '@arenaswap/ui/src/components/crest';
import { resolveTeamColorPair } from '@arenaswap/ui/src/components/colorUtils';
import { leaderLabelKey, playerInitials, starterHeadingKey } from './pregameLabels';

interface pregameStatsProps {
	game: Game;
}

const starterStatusKeys = {
	confirmed: 'detail.starterConfirmed',
	expected: 'detail.starterExpected',
} as const;

const isHex = (color: string): boolean => /^#[\da-fA-F]{6}$/.test(color);

// The same 28 alpha the matchup card and the poster crest use, fading out to the right so the
// value at the end of the row sits on the plain card rather than on colour.
const rowWash = (color: string): string | undefined => (
	isHex(color) ? `linear-gradient(90deg, ${color}28, ${color}00 72%)` : undefined
);

// Soccer sends a headshot for barely one leader in ten, so the placeholder is the common case
// there rather than a rare failure. Crest already does the URL-keyed retry and the text fallback;
// the initials go where a team abbreviation would.
const PlayerShot = ({ url, name, color, className }: {
	url?: string;
	name: string;
	color: string;
	className: string;
}) => (
	<Crest
		logo={url}
		abbreviation={playerInitials(name)}
		className={className}
		fallbackStyle={isHex(color) ? { background: color, color: '#ffffff' } : undefined}
		loading='lazy'
	/>
);

const hasLabelledStats = (starter: ProbableStarter): boolean => (
	starter.winLoss !== undefined || starter.era !== undefined
);

// "(3-1, 4.23)" says nothing about what either number is. The label goes under the value rather
// than beside it: a box score puts the heading above its column, and two labelled pairs still fit
// the half-card a starter gets.
const StatPair = ({ value, label }: { value: string; label: string }) => (
	<div className='gd-pregame-stat'>
		<span className='gd-pregame-stat-value'>{value}</span>
		<span className='gd-pregame-stat-label'>{label}</span>
	</div>
);

// Away left, home right, under the crests they belong to. A missing starter leaves its half empty
// rather than re-centring the one we have: 14 of 98 upcoming games named only one side, and a lone
// centred name reads as belonging to neither team.
const StarterColumn = ({ starter, color }: { starter?: ProbableStarter; color: string }) => (
	<div className='gd-pregame-starter'>
		{starter && (
			<>
				<div className='gd-pregame-starter-shot' style={{ borderColor: isHex(color) ? color : undefined }}>
					<PlayerShot url={starter.headshot} name={starter.name} color={color} className='gd-pregame-shot-img' />
				</div>
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

// Full width, one player per row. Football values run to 21 characters — "14/23, 141 YDS, 1 INT" —
// against four for every other sport, and there is no half-width column that fits both. The name
// takes the slack and the value keeps its own width, so a long name truncates before a stat does.
const LeaderRow = ({ leader, team, color }: { leader?: TeamLeader; team: Team; color: string }) => {
	if (!leader) return null;
	return (
		<div className='gd-pregame-leader-row' style={{ backgroundImage: rowWash(color) }}>
			<PlayerShot url={leader.headshot} name={leader.player} color={color} className='gd-pregame-leader-shot' />
			<span className='gd-pregame-leader-team' style={{ color: isHex(color) ? color : undefined }}>
				{team.abbreviation}
			</span>
			<span className='gd-pregame-leader-player'>{leader.player}</span>
			{/* Verbatim from ESPN. The football values carry their own English units and there is no
			    version of "12 CAR, 68 YDS, 1 TD" we could assemble ourselves. */}
			<span className='gd-pregame-leader-value'>{leader.value}</span>
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
