import { sensitivityThresholds } from '@arenaswap/core/constants';

interface sensitivitySliderProps {
	value: number;
	onChange: (val: number) => void;
}

const labels: Record<number, string> = {
	1: 'Barely Active',
	2: 'Critical Only',
	3: 'Conservative',
	4: 'Balanced',
	5: 'Eager',
	6: 'Trigger Happy',
	7: 'Overkill'
};

const sensitivitySlider = ({ value, onChange }: sensitivitySliderProps) => (
	<div>
		<div className='d-flex justify-content-between align-items-center mb-1'>
			<label className='text-body-secondary setting-toggle-label'>Switch sensitivity</label>
			<span className='fw-semibold setting-value-label'>{labels[value]} (PowerScore gap ≥ {sensitivityThresholds[value]})</span>
		</div>
		<input
			type='range'
			min={1}
			max={7}
			step={1}
			value={value}
			onChange={e => onChange(Number(e.target.value))}
			className='form-range w-100'
		/>
		<div className='position-relative sensitivity-ticks'>
			{[1, 2, 3, 4, 5, 6, 7].map((level, i) => (
				<span
					key={level}
					className={`position-absolute translate-middle-x text-body-secondary sensitivity-tick sensitivity-tick-${i}`}
				>
					{sensitivityThresholds[level]}
				</span>
			))}
		</div>
		<div className='mt-1 setting-explainer'>
			Controls how big the PowerScore gap must be before ArenaSwap switches tabs.
		</div>
	</div>
);

export default sensitivitySlider;
