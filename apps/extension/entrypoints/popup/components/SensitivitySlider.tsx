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
			<label className='sensitivity-label'>Switch sensitivity</label>
			<span className='sensitivity-value'>{LABELS[value]}</span>
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
		<div className='sensitivity-stops'>
			{[1, 2, 3, 4, 5, 6, 7].map(level => (
				<span key={level} className='sensitivity-stops__label'>
					Δ{SENSITIVITY_THRESHOLDS[level]}
				</span>
			))}
		</div>
	</div>
);

export default SensitivitySlider;
