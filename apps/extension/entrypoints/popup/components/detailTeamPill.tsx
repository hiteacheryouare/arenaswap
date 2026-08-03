import { useState } from 'react';
import type { Team } from '@arenaswap/core/types';

interface detailTeamPillProps {
	team: Team;
	side: 'away' | 'home';
}

/**
 * One team's crest and its labels, emitted as two separate grid children via
 * `display: contents`. Keeping the crest and the label in different grid rows is what
 * holds the two sides level: a name that wraps to two lines pushes its own label row
 * taller without ever shifting the logo it belongs to.
 */
const detailTeamPill = ({ team, side }: detailTeamPillProps) => {
	const [logoFailed, setLogoFailed] = useState(false);

	return (
		<div className='game-detail-team-wrap'>
			<div className={`game-detail-team-logo-shell gd-area-${side}-crest`}>
				{team.logo && !logoFailed
					? (
						<img
							src={team.logo}
							alt={team.abbreviation}
							className='game-detail-team-logo'
							onError={() => setLogoFailed(true)}
						/>
					)
					// No text in the fallback — the abbreviation is directly below it, and
					// rendering it twice was the "same thing in two places" all over again.
					: <span className='game-detail-team-logo-fallback' aria-hidden='true' />}
			</div>
			{/* The full name is the only label: the abbreviation is on the card you came from
			    and in the pinned bar above, so repeating it here says nothing new. */}
			<div className={`game-detail-team-name gd-area-${side}-label`}>
				{team.name || team.abbreviation}
			</div>
		</div>
	);
};

export default detailTeamPill;
