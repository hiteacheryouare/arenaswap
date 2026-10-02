import { i18n } from '#i18n';
import { defaultCooldownSecs } from '@arenaswap/core';
import { formatSecondsLabel, secondsSliderSteps } from '../../../utils/secondsLabel';
import SettingTooltipIcon from './settingTooltipIcon';

interface cooldownSliderProps {
	value: number;
	onChange: (val: number) => void;
}

export const cooldownSteps = secondsSliderSteps;

export const formatCooldownSeconds = (secs: number): string => (
	secs === 0 ? i18n.t('cooldown.off') : formatSecondsLabel(secs, i18n.t)
);

const cooldownSlider = ({ value, onChange }: cooldownSliderProps) => {
	const idx = cooldownSteps.indexOf(value);
	const currentIdx = idx >= 0 ? idx : cooldownSteps.indexOf(defaultCooldownSecs);

	return (
		<div>
			<div className='d-flex justify-content-between align-items-center mb-1'>
				<div className='d-flex align-items-center gap-1'>
					<label htmlFor='cooldown-range' className='text-body-secondary setting-toggle-label'><i className='bi bi-clock me-1 text-primary' />{i18n.t('cooldown.label')}</label>
					<SettingTooltipIcon text={i18n.t('cooldown.explainer')} label={i18n.t('cooldown.label')} />
				</div>
				<span className='fw-semibold setting-value-label'>{formatCooldownSeconds(cooldownSteps[currentIdx]!)}</span>
			</div>
			<input
				id='cooldown-range'
				type='range'
				min={0}
				max={cooldownSteps.length - 1}
				step={1}
				value={currentIdx}
				aria-valuetext={formatCooldownSeconds(cooldownSteps[currentIdx]!)}
				onChange={e => {
					const next = cooldownSteps[Number(e.target.value)]!;
					if (next !== value) onChange(next);
				}}
				className='form-range w-100'
			/>
			<div className='d-flex justify-content-between'>
				<span className='setting-explainer'>{formatCooldownSeconds(cooldownSteps[0]!)}</span>
				<span className='setting-explainer'>{formatCooldownSeconds(cooldownSteps[cooldownSteps.length - 1]!)}</span>
			</div>
		</div>
	);
};

export default cooldownSlider;
