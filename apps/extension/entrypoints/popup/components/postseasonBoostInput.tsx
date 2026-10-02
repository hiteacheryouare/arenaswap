import { i18n } from '#i18n';
import BoostPointsInput from './boostPointsInput';
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
				<SettingTooltipIcon text={i18n.t('postseasonBoost.explainer')} label={i18n.t('postseasonBoost.label')} />
			</div>
			<span className='fw-semibold setting-value-label'>{i18n.t('postseasonBoost.points', [value])}</span>
		</div>
		<BoostPointsInput id='postseasonBoostInput' value={value} onChange={onChange} className='form-control form-control-sm' />
	</div>
);

export default postseasonBoostInput;
