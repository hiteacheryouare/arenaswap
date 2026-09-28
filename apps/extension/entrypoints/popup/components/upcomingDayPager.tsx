import { i18n } from '#i18n';

interface upcomingDayPagerProps {
	dayLabel: string;
	index: number;
	total: number;
	onSelect: (index: number) => void;
}

// Stands in for the date divider Up Next used to draw, so the day is still headed by its own name.
// The arrows take the slack and the day keeps its natural width, which gives both controls a real
// hit area without stretching the active page into a full-width bar of $primary.
//
// Rendered even on a one-day slate, with both arrows disabled: dropping it there would leave that
// day with no heading at all.
const upcomingDayPager = ({ dayLabel, index, total, onSelect }: upcomingDayPagerProps) => {
	const atFirst = index <= 0;
	const atLast = index >= total - 1;
	return (
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
	);
};

export default upcomingDayPager;
