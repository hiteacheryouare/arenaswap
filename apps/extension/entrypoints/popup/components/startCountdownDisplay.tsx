import { i18n } from '#i18n';
import FlipScore from './flipScore';
import { formatStartDateTime } from './gameCardShared';
import { countdownShowsSeconds, useStartCountdown } from './startCountdown';

interface startCountdownDisplayProps {
	startTime: string | undefined;
}

interface segment {
	value: number;
	unit: string;
	// Trailing segments hold two digits so the row does not reflow as values cross 9.
	padded: boolean;
}

// Owns `useStartCountdown` rather than taking parts as a prop so a tick re-renders these few
// spans and leaves the hero, the breakdown and the four ECharts canvases untouched.
const startCountdownDisplay = ({ startTime }: startCountdownDisplayProps) => {
	const parts = useStartCountdown(startTime);

	if (!parts || parts.remainingMs <= 0) {
		return <div className='gd-countdown-soon'>{i18n.t('detail.startsSoon')}</div>;
	}

	const segments: segment[] = countdownShowsSeconds(parts)
		? [
			{ value: parts.hours, unit: i18n.t('detail.unitHours'), padded: false },
			{ value: parts.minutes, unit: i18n.t('detail.unitMinutes'), padded: true },
			{ value: parts.seconds, unit: i18n.t('detail.unitSeconds'), padded: true },
		]
		: [
			{ value: parts.days, unit: i18n.t('detail.unitDays'), padded: false },
			{ value: parts.hours, unit: i18n.t('detail.unitHours'), padded: true },
			{ value: parts.minutes, unit: i18n.t('detail.unitMinutes'), padded: true },
		];

	return (
		<div className='gd-countdown'>
			{startTime && <div className='gd-countdown-when'>{formatStartDateTime(startTime)}</div>}
			<div className='gd-countdown-clock'>
				{segments.map(({ value, unit, padded }) => (
					<span key={unit} className='gd-countdown-seg'>
							{padded && value < 10 && <span className='gd-countdown-zero'>0</span>}
						<FlipScore value={value} className='gd-countdown-value' />
						<span className='gd-countdown-unit'>{unit}</span>
					</span>
				))}
			</div>
		</div>
	);
};

export default startCountdownDisplay;
