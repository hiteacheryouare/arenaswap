import { i18n } from '#i18n';
import type { Team } from '@arenaswap/core/types';

interface possessionArrowProps {
	side: 'home' | 'away';
	position: 'left' | 'right';
	possession?: 'home' | 'away';
	team: Team;
}

const possessionArrow = ({ side, position, possession, team }: possessionArrowProps) => {
	if (possession !== side) return <span className='gd-possession' aria-hidden='true' />;

	const label = i18n.t('field.possession', { team: team.abbreviation });
	return (
		<span className='gd-possession'>
			<i className={`bi bi-caret-${position}-fill`} role='img' aria-label={label} title={label} />
		</span>
	);
};

export default possessionArrow;
