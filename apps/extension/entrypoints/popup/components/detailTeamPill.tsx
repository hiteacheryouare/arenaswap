import { useState } from 'react';
import type { Team } from '@arenaswap/core/types';

interface detailTeamPillProps {
	team: Team;
}

const detailTeamPill = ({ team }: detailTeamPillProps) => {
	const [logoFailed, setLogoFailed] = useState(false);

	return (
		<div className='game-detail-team-wrap'>
			<div className='game-detail-team-logo-shell'>
				{team.logo && !logoFailed
					? (
						<img
							src={team.logo}
							alt={team.abbreviation}
							className='game-detail-team-logo'
							onError={() => setLogoFailed(true)}
						/>
					)
					: <span className='game-detail-team-logo-fallback'>{(team.abbreviation ?? '?').slice(0, 3)}</span>}
			</div>
			<div className='game-detail-team-abbrev'>{team.abbreviation}</div>
		</div>
	);
};

export default detailTeamPill;
