import { i18n } from '#i18n';
import { SettingCopy } from './settingControls';

interface favoriteTeamBonusInputProps {
	value: number;
	onChange: (val: number) => void;
}

const favoriteTeamBonusInput = ({ value, onChange }: favoriteTeamBonusInputProps) => (
	<div className='st-control st-toggle st-number'>
		<SettingCopy
			htmlFor='favoriteTeamBonusInput'
			label={i18n.t('favoriteTeamBonus.label')}
			tooltip={i18n.t('favoriteTeamBonus.explainer')}
			note={i18n.t('favoriteTeamBonus.perTeam', [value])}
		/>
		<input
			id='favoriteTeamBonusInput'
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

export default favoriteTeamBonusInput;
