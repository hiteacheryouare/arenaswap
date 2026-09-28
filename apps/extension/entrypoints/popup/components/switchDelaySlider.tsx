import { i18n } from '#i18n';
import { SettingRange } from './settingControls';

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
		<SettingRange
			id='switch-delay-range'
			label={i18n.t('switchDelay.label')}
			tooltip={i18n.t('switchDelay.explainer')}
			valueLabel={<span className='st-value num'>{formatSeconds(steps[currentIdx]!)}</span>}
			value={currentIdx}
			min={0}
			max={steps.length - 1}
			onChange={index => onChange(steps[index]!)}
			ends={[formatSeconds(steps[0]!), formatSeconds(steps.at(-1)!)]}
		/>
	);
};

export default switchDelaySlider;
