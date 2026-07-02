import { i18n } from '#i18n';

interface cooldownSliderProps {
	value: number;
	onChange: (val: number) => void;
}

const steps = [15, 30, 45, 60, 90, 120, 180];

const formatSeconds = (secs: number): string => {
	if (secs < 60) return `${secs}s`;
	const m = Math.floor(secs / 60);
	const s = secs % 60;
	return s > 0 ? `${m}m ${s}s` : `${m}m`;
};

const cooldownSlider = ({ value, onChange }: cooldownSliderProps) => {
	const idx = steps.indexOf(value);
	const currentIdx = idx >= 0 ? idx : 2;

	return (
		<div>
			<div className='d-flex justify-content-between align-items-center mb-1'>
				<label htmlFor='cooldown-range' className='text-body-secondary setting-toggle-label'><i className='bi bi-clock me-1 text-primary' />{i18n.t('cooldown.label')}</label>
				<span className='fw-semibold setting-value-label'>{formatSeconds(steps[currentIdx]!)}</span>
			</div>
			<input
				id='cooldown-range'
				type='range'
				min={0}
				max={steps.length - 1}
				step={1}
				value={currentIdx}
				onChange={e => onChange(steps[Number(e.target.value)]!)}
				className='form-range w-100'
			/>
			<div className='d-flex justify-content-between'>
				<span className='text-body-secondary setting-toggle-label'>{formatSeconds(steps[0]!)}</span>
				<span className='text-body-secondary setting-toggle-label'>{formatSeconds(steps[steps.length - 1]!)}</span>
			</div>
			<div className='mt-1 setting-explainer'>
				{i18n.t('cooldown.explainer')}
			</div>
		</div>
	);
};

export default cooldownSlider;
