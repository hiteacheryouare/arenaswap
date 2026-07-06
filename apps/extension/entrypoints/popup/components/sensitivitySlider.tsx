import { useState } from 'react';
import { sensitivityThresholds } from '@arenaswap/core/constants';
import { i18n } from '#i18n';
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

	return (
	<div>
		{showLudicrous && <LudicrousSpeedOverlay onClose={() => setShowLudicrous(false)} />}
		<div className='d-flex justify-content-between align-items-center mb-1'>
			<label htmlFor='sensitivity-range' className='text-body-secondary setting-toggle-label'><i className='bi bi-sliders me-1 text-primary' />{i18n.t('sensitivity.label')}</label>
			{value === 7 ? (
				<button
					className='fw-semibold setting-value-label ludicrous-speed ludicrous-speed-clickable'
					onClick={() => setShowLudicrous(true)}
					title='Engage the hyperdrive...'
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
		<input
			id='sensitivity-range'
			type='range'
			min={1}
			max={7}
			step={1}
			value={value}
			onChange={e => onChange(Number(e.target.value))}
			className='form-range w-100'
		/>
		<div className='position-relative sensitivity-ticks'>
			{[1, 2, 3, 4, 5, 6, 7].map((level, i) => (
				<span
					key={level}
					className={`position-absolute translate-middle-x text-body-secondary sensitivity-tick sensitivity-tick-${i}`}
				>
					{sensitivityThresholds[level]}
				</span>
			))}
		</div>
		<div className='mt-1 setting-explainer'>
			{i18n.t('sensitivity.explainer')}
		</div>
	</div>
	);
};

export default sensitivitySlider;
