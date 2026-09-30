import { i18n } from '#i18n';

interface upcomingDayPagerProps {
	dayLabel: string;
	index: number;
	total: number;
	onSelect: (index: number) => void;
}

// The section's title, with the day it is showing and the arrows to page through the others.
// Rendered even on a one-day slate, with both arrows disabled, so that day is still named.
const upcomingDayPager = ({ dayLabel, index, total, onSelect }: upcomingDayPagerProps) => {
	const atFirst = index <= 0;
	const atLast = index >= total - 1;
	return (
		<div className='gm-title-row'>
			<h2 className='gm-title' id='gm-up-next-title'>{i18n.t('main.sectionUpNext')}</h2>
			<nav className='gm-day' aria-label={i18n.t('main.upcomingDayNavLabel')} data-testid='upcoming-day-pager'>
				<span className='gm-day-label' aria-current='page' data-testid='upcoming-day-label'>{dayLabel}</span>
				<div className='btn-group'>
					<button
						type='button'
						className='btn'
						disabled={atFirst}
						onClick={() => onSelect(index - 1)}
						aria-label={i18n.t('main.upcomingPreviousDay')}
						data-testid='upcoming-day-previous'
					>
						<i className='bi bi-chevron-left' aria-hidden='true' />
					</button>
					<button
						type='button'
						className='btn'
						disabled={atLast}
						onClick={() => onSelect(index + 1)}
						aria-label={i18n.t('main.upcomingNextDay')}
						data-testid='upcoming-day-next'
					>
						<i className='bi bi-chevron-right' aria-hidden='true' />
					</button>
				</div>
			</nav>
		</div>
	);
};

export default upcomingDayPager;
