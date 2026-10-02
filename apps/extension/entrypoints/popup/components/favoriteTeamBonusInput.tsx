import { i18n } from '#i18n';
import BoostPointsInput from './boostPointsInput';
import SettingTooltipIcon from './settingTooltipIcon';

interface favoriteTeamBonusInputProps {
	value: number;
	onChange: (val: number) => void;
}

const favoriteTeamBonusInput = ({ value, onChange }: favoriteTeamBonusInputProps) => (
	<div>
		<div className='d-flex justify-content-between align-items-center mb-1'>
			<div className='d-flex align-items-center gap-1'>
				<label className='text-body-secondary setting-toggle-label' htmlFor='favoriteTeamBonusInput'>
					<i className='bi bi-star me-1 text-primary' />{i18n.t('favoriteTeamBonus.label')}
				</label>
				<SettingTooltipIcon text={i18n.t('favoriteTeamBonus.explainer')} />
			</div>
			<span className='fw-semibold setting-value-label'>{i18n.t('favoriteTeamBonus.perTeam', [value])}</span>
		</div>
		<BoostPointsInput id='favoriteTeamBonusInput' value={value} onChange={onChange} className='form-control form-control-sm' />
	</div>
);

export default favoriteTeamBonusInput;
