import { i18n } from '#i18n';
import type { Team } from '@arenaswap/core/types';
import OnColorCrest from '@arenaswap/ui/src/components/onColorCrest';
import TimeoutDots from '@arenaswap/ui/src/components/timeoutDots';

interface detailTeamPillProps {
	team: Team;
	side: 'away' | 'home';
	record?: string | null;
	color: string;
}

// Crest, name and record are emitted as separate grid children via `display: contents`, which
// is what holds the two sides level: a name that wraps to two lines pushes its own row taller
// without shifting the logo or the record beside it.
const detailTeamPill = ({ team, side, record, color }: detailTeamPillProps) => (
	<div className={`game-detail-team-wrap is-${side}`}>
		{/* Blank rather than lettered — the abbreviation is directly below it. */}
		<span className={`game-detail-team-logo-shell is-bare gd-area-${side}-crest`}>
			<OnColorCrest team={team} surface={color} className='game-detail-team-logo' fallback='blank' />
		</span>
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
