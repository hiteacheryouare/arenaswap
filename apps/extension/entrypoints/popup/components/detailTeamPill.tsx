import { i18n } from '#i18n';
import type { Team, TeamMonoMarks } from '@arenaswap/core/types';
import { underHeroScrim } from '@arenaswap/ui/src/components/colorUtils';
import TeamCrest from '@arenaswap/ui/src/components/teamCrest';
import TimeoutDots from '@arenaswap/ui/src/components/timeoutDots';

interface detailTeamPillProps {
	team: Team;
	side: 'away' | 'home';
	record?: string | null;
	// ESPN's monochrome marks, where the team has them. Only reached for when the colour artwork
	// stops reading against the hero — most crests are built for a dark broadcast background and are
	// better in their own colours than in any monochrome treatment.
	monoMarks?: TeamMonoMarks | null;
	color: string;
}

// Crest, name and record are emitted as separate grid children via `display: contents`, which
// is what holds the two sides level: a name that wraps to two lines pushes its own row taller
// without shifting the logo or the record beside it.
const detailTeamPill = ({ team, side, record, monoMarks, color }: detailTeamPillProps) => (
	<div className='game-detail-team-wrap'>
		{/* Blank rather than lettered — the abbreviation is directly below it. */}
		<TeamCrest
			logo={team.logo}
			monoMarks={monoMarks ?? undefined}
			abbreviation={team.abbreviation}
			background={underHeroScrim(color)}
			discClassName={`game-detail-team-logo-shell gd-area-${side}-crest`}
			crestClassName='game-detail-team-logo'
			fallback='blank'
		/>
		<div className={`game-detail-team-name gd-area-${side}-label`}>
			{/* Reads as "#2 Alabama Crimson Tide". The rank is a separate span rather than part of
			    the string so it can recede — the name is what identifies the team. */}
			{team.rank !== undefined && (
				<span className='game-detail-team-rank' title={i18n.t('gameCard.teamRank', { rank: team.rank })}>
					#{team.rank}
				</span>
			)}
			{team.name || team.abbreviation}
		</div>
		{record && (
			<div
				className={`game-detail-team-record gd-area-${side}-record`}
				title={i18n.t('detail.teamRecord', { record })}
			>
				{record}
			</div>
		)}
		{/* Its own grid row rather than tucked beside the record, so the two sides stay level when
		    one team's name wraps and the other's does not — the same reason the record has one. */}
		{team.timeouts !== undefined && (
			<div className={`gd-area-${side}-timeouts`}>
				<TimeoutDots remaining={team.timeouts} teamAbbreviation={team.abbreviation} />
			</div>
		)}
	</div>
);

export default detailTeamPill;
