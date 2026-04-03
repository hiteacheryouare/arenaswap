import { SENSITIVITY_THRESHOLDS } from '@arenaswap/core/constants';

interface Props {
	value: number;
	onChange: (val: number) => void;
}

const LABELS: Record<number, string> = {
	1: 'Barely Active',
	2: 'Critical Only',
	3: 'Conservative',
	4: 'Balanced',
	5: 'Eager',
	6: 'Trigger Happy',
	7: 'Overkill'
};

const SensitivitySlider = ({ value, onChange }: Props) => (
	<div>
		<div className='d-flex justify-content-between align-items-center mb-1'>
			<label className='text-secondary' style={{ fontSize: '0.65rem' }}>Switch sensitivity</label>
			<span className='fw-semibold' style={{ fontSize: '0.6rem' }}>{LABELS[value]} (PowerScore gap ≥ {SENSITIVITY_THRESHOLDS[value]})</span>
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
		<div className='position-relative' style={{ height: '0.85rem', margin: '0.15rem 0.5rem 0' }}>
			{[1, 2, 3, 4, 5, 6, 7].map((level, i) => (
				<span
					key={level}
					className='position-absolute translate-middle-x text-secondary'
					style={{ left: `${(i / 6) * 100}%`, fontSize: '0.5rem', whiteSpace: 'nowrap' }}
				>
					{SENSITIVITY_THRESHOLDS[level]}
				</span>
			))}
		</div>
	</div>
);

export default SensitivitySlider;
