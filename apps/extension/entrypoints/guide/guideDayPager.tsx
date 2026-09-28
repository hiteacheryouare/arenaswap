import { i18n } from '#i18n';

interface guideDayPagerProps {
	index: number;
	total: number;
	// Null when today has nothing on it, so there is no page to go back to.
	todayIndex: number | null;
	dateLabel: string;
	onSelect: (index: number) => void;
}

// Pages only onto days the slate has games on, so the arrows stop at its ends. Today on today brings
// the grid back round to the present.
const GuideDayPager = ({ index, total, todayIndex, dateLabel, onSelect }: guideDayPagerProps) => (
	<nav className='guide-day-pager' aria-label={i18n.t('main.upcomingDayNavLabel')}>
		<div className='btn-group'>
			<button type='button' className='btn' disabled={index <= 0} onClick={() => onSelect(index - 1)} aria-label={i18n.t('main.upcomingPreviousDay')}>
				<i className='bi bi-chevron-left' aria-hidden='true' />
			</button>
			<button
				type='button'
				className={`btn guide-day-today${index === todayIndex ? ' active' : ''}`}
				disabled={todayIndex === null}
				aria-current={index === todayIndex ? 'date' : undefined}
				onClick={() => todayIndex !== null && onSelect(todayIndex)}
			>
				{i18n.t('date.today')}
			</button>
			<button type='button' className='btn' disabled={index >= total - 1} onClick={() => onSelect(index + 1)} aria-label={i18n.t('main.upcomingNextDay')}>
				<i className='bi bi-chevron-right' aria-hidden='true' />
			</button>
		</div>
		<span className='guide-day'>{dateLabel}</span>
	</nav>
);

export default GuideDayPager;
