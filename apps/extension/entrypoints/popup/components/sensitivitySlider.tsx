import { useState } from 'react';
import { sensitivityThresholds } from '@arenaswap/core/constants';
import { i18n } from '#i18n';
import LudicrousSpeedOverlay from './ludicrousSpeedOverlay';
import { SettingRange } from './settingControls';

interface sensitivitySliderProps {
	value: number;
	onChange: (val: number) => void;
}

export const sensitivityLabels: Record<number, string> = {
	1: i18n.t('sensitivity.level.l1'),
	2: i18n.t('sensitivity.level.l2'),
	3: i18n.t('sensitivity.level.l3'),
	4: i18n.t('sensitivity.level.l4'),
	5: i18n.t('sensitivity.level.l5'),
	6: i18n.t('sensitivity.level.l6'),
	7: i18n.t('sensitivity.level.l7'),
};

const levels = [1, 2, 3, 4, 5, 6, 7];

const sensitivitySlider = ({ value, onChange }: sensitivitySliderProps) => {
	const [showLudicrous, setShowLudicrous] = useState(false);
	const valueText = i18n.t('sensitivity.valueLabel', { label: sensitivityLabels[value]!, gap: sensitivityThresholds[value]! });

	return (
		<>
			{showLudicrous && <LudicrousSpeedOverlay onClose={() => setShowLudicrous(false)} />}
			<SettingRange
				id='sensitivity-range'
				label={i18n.t('sensitivity.label')}
				tooltip={i18n.t('sensitivity.explainer')}
				valueLabel={value === 7 ? (
					<button
						type='button'
						className='st-value ludicrous-speed ludicrous-speed-clickable'
						onClick={() => setShowLudicrous(true)}
						title={i18n.t('sensitivity.hyperdriveTitle')}
					>
						{valueText}
					</button>
				) : (
					<span className='st-value'>{valueText}</span>
				)}
				value={value}
				min={1}
				max={7}
				onChange={next => {
					if (next !== value) onChange(next);
				}}
				ticks={levels.map(level => sensitivityThresholds[level])}
			/>
		</>
	);
};

export default sensitivitySlider;
