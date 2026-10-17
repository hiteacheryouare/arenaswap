import { i18n } from '#i18n';
import BoostPointsInput from './boostPointsInput';
import SettingTooltipIcon from './settingTooltipIcon';

interface favoriteTeamBonusInputProps {
	value: number;
	onChange: (val: number) => void;
}

const favoriteTeamBonusInput = ({ value, onChange }: favoriteTeamBonusInputProps) => (
	<div>
		<div className='d-flex align-items-center gap-1 mb-1'>
			<label className='fg-secondary setting-toggle-label' htmlFor='favoriteTeamBonusInput'>
				<i className='bi bi-star me-1 fg-primary' />{i18n.t('favoriteTeamBonus.label')}
			</label>
			<SettingTooltipIcon text={i18n.t('favoriteTeamBonus.explainer')} label={i18n.t('favoriteTeamBonus.label')} />
		</div>
		<BoostPointsInput id='favoriteTeamBonusInput' value={value} onChange={onChange} className='form-control form-control-sm' unit={i18n.t('favoriteTeamBonus.unit')} />
	</div>
);

export default favoriteTeamBonusInput;
