import { i18n } from '#i18n';
import { SettingCopy } from './settingControls';

interface postseasonBoostInputProps {
	value: number;
	onChange: (val: number) => void;
}

const postseasonBoostInput = ({ value, onChange }: postseasonBoostInputProps) => (
	<div className='st-control st-toggle st-number'>
		<SettingCopy
			htmlFor='postseasonBoostInput'
			label={i18n.t('postseasonBoost.label')}
			tooltip={i18n.t('postseasonBoost.explainer')}
			note={i18n.t('postseasonBoost.points', [value])}
		/>
		<input
			id='postseasonBoostInput'
			type='number'
			min={0}
			step={1}
			value={value}
			onChange={e => onChange(Math.max(0, Math.round(Number(e.target.value) || 0)))}
			className='form-control num'
			inputMode='numeric'
		/>
	</div>
);

export default postseasonBoostInput;
