import { useCallback, useState } from 'react';
import { sensitivityThresholds } from '@arenaswap/core/constants';
import { i18n } from '#i18n';
import FormRange from './formRange';
import SettingTooltipIcon from './settingTooltipIcon';
import LudicrousSpeedOverlay from './ludicrousSpeedOverlay';

interface sensitivitySliderProps {
	value: number;
	onChange: (val: number) => void;
}

const labels: Record<number, string> = {
	1: i18n.t('sensitivity.level.l1'),
	2: i18n.t('sensitivity.level.l2'),
	3: i18n.t('sensitivity.level.l3'),
	4: i18n.t('sensitivity.level.l4'),
	5: i18n.t('sensitivity.level.l5'),
	6: i18n.t('sensitivity.level.l6'),
	7: i18n.t('sensitivity.level.l7'),
};

const sensitivitySlider = ({ value, onChange }: sensitivitySliderProps) => {
	const [showLudicrous, setShowLudicrous] = useState(false);
	// Stable, because the overlay's close timer restarts whenever this changes and Settings
	// re-renders on every broadcast.
	const closeLudicrous = useCallback(() => setShowLudicrous(false), []);

	return (
	<div>
		{showLudicrous && <LudicrousSpeedOverlay onClose={closeLudicrous} />}
		<div className='d-flex justify-content-between align-items-center mb-1'>
			<div className='d-flex align-items-center gap-1'>
				<label htmlFor='sensitivity-range' className='fg-secondary setting-toggle-label'><i className='bi bi-sliders me-1 fg-primary' />{i18n.t('sensitivity.label')}</label>
				<SettingTooltipIcon text={i18n.t('sensitivity.explainer')} label={i18n.t('sensitivity.label')} />
			</div>
			{value === 7 ? (
				<button
					className='fw-semibold setting-value-label ludicrous-speed ludicrous-speed-clickable'
					onClick={() => setShowLudicrous(true)}
					title={i18n.t('sensitivity.hyperdriveTitle')}
					style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit' }}
				>
					{i18n.t('sensitivity.valueLabel', { label: labels[value]!, gap: sensitivityThresholds[value]! })}
				</button>
			) : (
				<span className='fw-semibold setting-value-label'>
					{i18n.t('sensitivity.valueLabel', { label: labels[value]!, gap: sensitivityThresholds[value]! })}
				</span>
			)}
		</div>
		<FormRange
			id='sensitivity-range'
			min={1}
			max={7}
			step={1}
			value={value}
			list='sensitivity-ticks'
			onChange={e => {
				const next = Number(e.target.value);
				if (next !== value) onChange(next);
			}}
		>
			<datalist id='sensitivity-ticks'>
				{[1, 2, 3, 4, 5, 6, 7].map(level => (
					<option key={level} value={level} label={String(sensitivityThresholds[level])}>{sensitivityThresholds[level]}</option>
				))}
			</datalist>
		</FormRange>
	</div>
	);
};

export default sensitivitySlider;
