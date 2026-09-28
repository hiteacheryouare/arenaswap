import { i18n } from '#i18n';
import FlipScore from './flipScore';
import { countdownShowsSeconds, useStartCountdown } from './startCountdown';

interface startCountdownDisplayProps {
	startTime: string | undefined;
	// Where to watch, when the sentence should say so: "Starts in 54m 12s on NBC".
	networks?: string;
}

interface segment {
	value: number;
	unit: string;
	// Trailing segments hold two digits so the sentence does not reflow as values cross 9.
	padded: boolean;
}

const slot = '\u0000';

// Owns `useStartCountdown` so a tick re-renders these few spans and leaves the hero, the breakdown
// and the four ECharts canvases untouched.
const startCountdownDisplay = ({ startTime, networks }: startCountdownDisplayProps) => {
	const parts = useStartCountdown(startTime);

	if (!parts || parts.remainingMs <= 0) {
		return <span className='dt-countdown-soon'>{i18n.t('detail.startsSoon')}</span>;
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

	// The sentence is translated whole and split where the time goes, so a language that puts the
	// time last still gets its own word order.
	const sentence = networks
		? i18n.t('detail.startsInOn', { time: slot, networks })
		: i18n.t('detail.startsIn', { time: slot });
	const [before, after = ''] = sentence.split(slot);

	return (
		<span className='dt-countdown'>
			{before}
			<span className='dt-countdown-clock num'>
				{segments.map(({ value, unit, padded }, index) => (
					<span key={unit} className='dt-countdown-seg'>
						{index > 0 && ' '}
						{padded && value < 10 && <span className='dt-countdown-zero'>0</span>}
						<FlipScore value={value} className='dt-countdown-value' />
						<span className='dt-countdown-unit'>{unit}</span>
					</span>
				))}
			</span>
			{after}
		</span>
	);
};

export default startCountdownDisplay;
