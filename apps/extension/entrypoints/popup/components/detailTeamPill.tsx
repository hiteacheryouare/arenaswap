import { i18n } from '#i18n';
import type { Team } from '@arenaswap/core/types';
import Crest from '@arenaswap/ui/src/components/crest';

interface detailTeamPillProps {
	team: Team;
	side: 'away' | 'home';
	record?: string | null;
}

// Crest, name and record are emitted as separate grid children via `display: contents`, which
// is what holds the two sides level: a name that wraps to two lines pushes its own row taller
// without shifting the logo or the record beside it.
const detailTeamPill = ({ team, side, record }: detailTeamPillProps) => (
	<div className='game-detail-team-wrap'>
		<div className={`game-detail-team-logo-shell gd-area-${side}-crest`}>
			{/* Blank rather than lettered — the abbreviation is directly below it. */}
			<Crest logo={team.logo} abbreviation={team.abbreviation} className='game-detail-team-logo' fallback='blank' />
		</div>
		<div className={`game-detail-team-name gd-area-${side}-label`}>
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
	</div>
);

export default detailTeamPill;
