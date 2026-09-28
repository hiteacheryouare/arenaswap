import { i18n } from '#i18n';
import { defaultCooldownSecs } from '@arenaswap/core';
import { SettingRange } from './settingControls';

interface cooldownSliderProps {
	value: number;
	onChange: (val: number) => void;
}

export const cooldownSteps = [0, 15, 30, 45, 60, 90, 120, 180];

export const formatCooldownSeconds = (secs: number): string => {
	if (secs === 0) return i18n.t('cooldown.off');
	if (secs < 60) return `${secs}s`;
	const m = Math.floor(secs / 60);
	const s = secs % 60;
	return s > 0 ? `${m}m ${s}s` : `${m}m`;
};

const cooldownSlider = ({ value, onChange }: cooldownSliderProps) => {
	const idx = cooldownSteps.indexOf(value);
	const currentIdx = idx >= 0 ? idx : cooldownSteps.indexOf(defaultCooldownSecs);

	return (
		<SettingRange
			id='cooldown-range'
			label={i18n.t('cooldown.label')}
			tooltip={i18n.t('cooldown.explainer')}
			valueLabel={<span className='st-value num'>{formatCooldownSeconds(cooldownSteps[currentIdx]!)}</span>}
			value={currentIdx}
			min={0}
			max={cooldownSteps.length - 1}
			onChange={index => {
				const next = cooldownSteps[index]!;
				if (next !== value) onChange(next);
			}}
			ends={[formatCooldownSeconds(cooldownSteps[0]!), formatCooldownSeconds(cooldownSteps.at(-1)!)]}
		/>
	);
};

export default cooldownSlider;
