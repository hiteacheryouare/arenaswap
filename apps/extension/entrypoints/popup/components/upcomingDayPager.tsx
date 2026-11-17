import { i18n } from '#i18n';

interface upcomingDayPagerProps {
	dayLabel: string;
	index: number;
	total: number;
	onSelect: (index: number) => void;
}

const upcomingDayPager = ({ dayLabel, index, total, onSelect }: upcomingDayPagerProps) => {
	const atFirst = index <= 0;
	const atLast = index >= total - 1;
	return (
		<nav aria-label={i18n.t('main.upcomingDayNavLabel')} data-testid='upcoming-day-pager'>
			<ul className='pagination pagination-sm w-100 my-3'>
				<li className={`page-item flex-grow-1${atFirst ? ' disabled' : ''}`}>
					<button
						type='button'
						className='page-link w-100 text-center'
						disabled={atFirst}
						onClick={() => onSelect(index - 1)}
						aria-label={i18n.t('main.upcomingPreviousDay')}
						data-testid='upcoming-day-previous'
					>
						<i className='bi bi-chevron-left' aria-hidden='true' />
					</button>
				</li>
				<li className='page-item active' aria-current='page'>
					<span className='page-link text-nowrap' data-testid='upcoming-day-label'>{dayLabel}</span>
				</li>
				<li className={`page-item flex-grow-1${atLast ? ' disabled' : ''}`}>
					<button
						type='button'
						className='page-link w-100 text-center'
						disabled={atLast}
						onClick={() => onSelect(index + 1)}
						aria-label={i18n.t('main.upcomingNextDay')}
						data-testid='upcoming-day-next'
					>
						<i className='bi bi-chevron-right' aria-hidden='true' />
					</button>
				</li>
			</ul>
		</nav>
	);
};

export default upcomingDayPager;
