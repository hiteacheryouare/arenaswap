import { i18n } from '#i18n';
import SettingTooltipIcon from './settingTooltipIcon';

interface switchDelaySliderProps {
	value: number;
	onChange: (val: number) => void;
}

const steps = [0, 15, 30, 45, 60, 90, 120, 180];

const formatSeconds = (secs: number): string => {
	if (secs === 0) return i18n.t('switchDelay.off');
	if (secs < 60) return `${secs}s`;
	const m = Math.floor(secs / 60);
	const s = secs % 60;
	return s > 0 ? `${m}m ${s}s` : `${m}m`;
};

const switchDelaySlider = ({ value, onChange }: switchDelaySliderProps) => {
	const idx = steps.indexOf(value);
	const currentIdx = idx >= 0 ? idx : 0;

	return (
		<div>
			<div className='d-flex justify-content-between align-items-center mb-1'>
				<div className='d-flex align-items-center gap-1'>
					<label htmlFor='switch-delay-range' className='text-body-secondary setting-toggle-label'><i className='bi bi-hourglass-split me-1 text-primary' />{i18n.t('switchDelay.label')}</label>
					<SettingTooltipIcon text={i18n.t('switchDelay.explainer')} />
				</div>
				<span className='fw-semibold setting-value-label'>{formatSeconds(steps[currentIdx]!)}</span>
			</div>
			<input
				id='switch-delay-range'
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
		</div>
	);
};

export default switchDelaySlider;
