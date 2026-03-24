interface Props {
	value: number;
	onChange: (val: number) => void;
}

const LABELS: Record<number, string> = {
	1: 'Critical only',
	2: 'Conservative',
	3: 'Balanced',
	4: 'Eager',
	5: 'Trigger Happy',
};

const SensitivitySlider = ({ value, onChange }: Props) => (
	<div>
		<div className='d-flex justify-content-between align-items-center mb-1'>
			<label className='text-gray-400 small'>Switch sensitivity</label>
			<span className='text-gray-300 small'>{LABELS[value]}</span>
		</div>
		<input
			type='range'
			min={1}
			max={5}
			step={1}
			value={value}
			onChange={e => onChange(Number(e.target.value))}
			className='form-range w-100'
		/>
		<div className='d-flex justify-content-between text-gray-600' style={{ fontSize: '0.6rem' }}>
			<span>1</span>
			<span>5</span>
		</div>
	</div>
);

export default SensitivitySlider;
