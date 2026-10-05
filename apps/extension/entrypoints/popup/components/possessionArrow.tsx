import { i18n } from '#i18n';
import type { Team } from '@arenaswap/core/types';

interface possessionArrowProps {
	side: 'home' | 'away';
	possession?: 'home' | 'away';
	team: Team;
}

// Both sides of the divider always carry one of these, lit or not, so the scores stay put when
// the ball changes hands. Each points out at its own team's score.
const possessionArrow = ({ side, possession, team }: possessionArrowProps) => {
	if (possession !== side) return <span className='gd-possession' aria-hidden='true' />;

	const label = i18n.t('field.possession', { team: team.abbreviation });
	return (
		<span className='gd-possession'>
			<i className={`bi ${side === 'away' ? 'bi-caret-left-fill' : 'bi-caret-right-fill'}`} role='img' aria-label={label} title={label} />
		</span>
	);
};

export default possessionArrow;
