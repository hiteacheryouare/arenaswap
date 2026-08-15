import { i18n } from '#i18n';
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
		<input
			id='favoriteTeamBonusInput'
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

export default favoriteTeamBonusInput;
