interface Props {
	value: number;
	onChange: (val: number) => void;
}

const STEPS = [0, 15, 30, 45, 60, 90, 120, 180];
const EXPLAINER_STYLE = { fontSize: '0.55rem', lineHeight: 1.3, color: '#6e7681' } as const;

const formatSeconds = (secs: number): string => {
	if (secs === 0) return 'Off';
	if (secs < 60) return `${secs}s`;
	const m = Math.floor(secs / 60);
	const s = secs % 60;
	return s > 0 ? `${m}m ${s}s` : `${m}m`;
};

const SwitchDelaySlider = ({ value, onChange }: Props) => {
	const idx = STEPS.indexOf(value);
	const currentIdx = idx >= 0 ? idx : 0;

	return (
		<div>
			<div className='d-flex justify-content-between align-items-center mb-1'>
				<label className='text-body-secondary' style={{ fontSize: '0.65rem' }}>Switch delay</label>
				<span className='fw-semibold' style={{ fontSize: '0.6rem' }}>{formatSeconds(STEPS[currentIdx])}</span>
			</div>
			<input
				type='range'
				min={0}
				max={STEPS.length - 1}
				step={1}
				value={currentIdx}
				onChange={e => onChange(STEPS[Number(e.target.value)])}
				className='form-range w-100'
			/>
			<div className='d-flex justify-content-between'>
				<span className='text-body-secondary' style={{ fontSize: '0.65rem' }}>{formatSeconds(STEPS[0])}</span>
				<span className='text-body-secondary' style={{ fontSize: '0.65rem' }}>{formatSeconds(STEPS[STEPS.length - 1])}</span>
			</div>
			<div className='mt-1' style={EXPLAINER_STYLE}>
				Waits this long before executing a switch, which helps when streams lag behind live data.
			</div>
		</div>
	);
};

export default SwitchDelaySlider;
