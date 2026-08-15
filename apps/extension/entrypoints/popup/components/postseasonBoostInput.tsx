import { i18n } from '#i18n';
import SettingTooltipIcon from './settingTooltipIcon';

interface postseasonBoostInputProps {
	value: number;
	onChange: (val: number) => void;
}

const postseasonBoostInput = ({ value, onChange }: postseasonBoostInputProps) => (
	<div>
		<div className='d-flex justify-content-between align-items-center mb-1'>
			<div className='d-flex align-items-center gap-1'>
				<label className='text-body-secondary setting-toggle-label' htmlFor='postseasonBoostInput'>
					<i className='bi bi-trophy me-1 text-primary' />{i18n.t('postseasonBoost.label')}
				</label>
				<SettingTooltipIcon text={i18n.t('postseasonBoost.explainer')} />
			</div>
			<span className='fw-semibold setting-value-label'>{i18n.t('postseasonBoost.points', [value])}</span>
		</div>
		<input
			id='postseasonBoostInput'
			type='number'
			min={0}
			step={1}
			value={value}
			onChange={e => onChange(Math.max(0, Math.round(Number(e.target.value) || 0)))}
			className='form-control form-control-sm'
			inputMode='numeric'
		/>
	</div>
);

export default postseasonBoostInput;
