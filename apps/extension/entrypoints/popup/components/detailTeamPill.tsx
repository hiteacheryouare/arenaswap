import { useState } from 'react';
import { i18n } from '#i18n';
import type { Team } from '@arenaswap/core/types';

interface detailTeamPillProps {
	team: Team;
	side: 'away' | 'home';
	/** Overall record, already formatted by the source league (e.g. "59-53"). Omitted when unknown. */
	record?: string | null;
}

/**
 * One team's crest and its labels, emitted as two separate grid children via
 * `display: contents`. Keeping the crest and the label in different grid rows is what
 * holds the two sides level: a name that wraps to two lines pushes its own label row
 * taller without ever shifting the logo it belongs to. The record gets a row of its own for
 * the same reason — nested under a name that wraps, it would sit lower than the opponent's.
 */
const detailTeamPill = ({ team, side, record }: detailTeamPillProps) => {
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
};

export default detailTeamPill;
