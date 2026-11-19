import type { Team } from '@arenaswap/core/types';
import { useT } from './i18nContext';

interface possessionArrowProps {
	side: 'home' | 'away';
	position: 'left' | 'right';
	possession?: 'home' | 'away';
	team: Team;
}

const possessionArrow = ({ side, position, possession, team }: possessionArrowProps) => {
	const t = useT();
	if (possession !== side) return <span className='gd-possession' aria-hidden='true' />;

	const label = t('field.possession', { team: team.abbreviation });
	return (
		<span className='gd-possession'>
			<i className={`bi bi-caret-${position}-fill`} role='img' aria-label={label} title={label} />
		</span>
	);
};

export default possessionArrow;
