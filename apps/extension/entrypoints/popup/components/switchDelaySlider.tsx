import { i18n } from '#i18n';
import { formatSecondsLabel, secondsSliderSteps } from '../../../utils/secondsLabel';
import FormRange from './formRange';
import SettingTooltipIcon from './settingTooltipIcon';

interface switchDelaySliderProps {
	value: number;
	onChange: (val: number) => void;
}

const steps = secondsSliderSteps;

const formatSeconds = (secs: number): string => (
	secs === 0 ? i18n.t('switchDelay.off') : formatSecondsLabel(secs, i18n.t)
);

const switchDelaySlider = ({ value, onChange }: switchDelaySliderProps) => {
	const idx = steps.indexOf(value);
	const currentIdx = idx >= 0 ? idx : 0;

	return (
		<div>
			<div className='d-flex justify-content-between align-items-center mb-1'>
				<div className='d-flex align-items-center gap-1'>
					<label htmlFor='switch-delay-range' className='fg-secondary setting-toggle-label'><i className='bi bi-hourglass-split me-1 fg-primary' />{i18n.t('switchDelay.label')}</label>
					<SettingTooltipIcon text={i18n.t('switchDelay.explainer')} label={i18n.t('switchDelay.label')} />
				</div>
				<span className='fw-semibold setting-value-label'>{formatSeconds(steps[currentIdx]!)}</span>
			</div>
			<FormRange
				id='switch-delay-range'
				min={0}
				max={steps.length - 1}
				step={1}
				value={currentIdx}
				aria-valuetext={formatSeconds(steps[currentIdx]!)}
				onChange={e => onChange(steps[Number(e.target.value)]!)}
			/>
			<div className='d-flex justify-content-between'>
				<span className='setting-explainer'>{formatSeconds(steps[0]!)}</span>
				<span className='setting-explainer'>{formatSeconds(steps[steps.length - 1]!)}</span>
			</div>
		</div>
	);
};

export default switchDelaySlider;
