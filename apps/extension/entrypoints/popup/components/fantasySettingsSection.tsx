import { i18n } from '#i18n';
import SettingTooltipIcon from './settingTooltipIcon';

interface fantasySettingsSectionProps {
	blend: number;
	rosterSize: number;
	changedRules: number;
	disabled: boolean;
	onBlendChange: (value: number) => void;
	onOpenRoster: () => void;
	onOpenRules: () => void;
}

const fantasySettingsSection = ({ blend, rosterSize, changedRules, disabled, onBlendChange, onOpenRoster, onOpenRules }: fantasySettingsSectionProps) => {
	const rosterSummary = rosterSize === 0 ? i18n.t('setup.fantasyRosterEmpty') : i18n.t('setup.fantasyRosterSize', rosterSize);
	const rulesSummary = changedRules === 0 ? i18n.t('setup.fantasyRulesDefault') : i18n.t('setup.fantasyRulesChanged', changedRules);
	return (
		<>
			<div className='fw-bold popup-section-label mt-3'><i className='bi bi-person-badge' />{i18n.t('powerScore.modeFantasy')}</div>
			<div>
				<div className='d-flex justify-content-between align-items-baseline mb-1'>
					<div className='d-flex align-items-center gap-1'>
						<label className='text-body-secondary setting-toggle-label' htmlFor='fantasyBlendSlider'>{i18n.t('setup.fantasyBlend')}</label>
						<SettingTooltipIcon text={i18n.t('setup.fantasyBlendExplainer')} label={i18n.t('setup.fantasyBlend')} />
					</div>
					<span className='fw-semibold setting-value-label'>{i18n.t('setup.fantasyBlendValue', { percent: blend })}</span>
				</div>
				<input
					type='range'
					className='form-range'
					id='fantasyBlendSlider'
					min={0}
					max={100}
					step={5}
					value={blend}
					aria-valuetext={i18n.t('setup.fantasyBlendValue', { percent: blend })}
					onChange={e => onBlendChange(Number(e.target.value))}
					disabled={disabled}
				/>
				<div className='d-flex justify-content-between'>
					<span className='setting-explainer'>{i18n.t('setup.fantasyBlendLow')}</span>
					<span className='setting-explainer'>{i18n.t('setup.fantasyBlendHigh')}</span>
				</div>
			</div>

			<div className='settings-index mt-3'>
				<button type='button' id='fantasyRosterOpen' className='settings-index-row' onClick={onOpenRoster} aria-label={`${i18n.t('setup.fantasyRoster')}, ${rosterSummary}`}>
					<i className='bi bi-people settings-index-icon' aria-hidden='true' />
					<span className='settings-index-text'>
						<span className='settings-index-name'>{i18n.t('setup.fantasyRoster')}</span>
						<span className='settings-index-desc'>{rosterSummary}</span>
					</span>
					<i className='bi bi-chevron-right settings-index-caret' aria-hidden='true' />
				</button>
				<button type='button' id='fantasyRulesOpen' className='settings-index-row' onClick={onOpenRules} aria-label={`${i18n.t('setup.fantasyRules')}, ${rulesSummary}`}>
					<i className='bi bi-calculator settings-index-icon' aria-hidden='true' />
					<span className='settings-index-text'>
						<span className='settings-index-name'>{i18n.t('setup.fantasyRules')}</span>
						<span className='settings-index-desc'>{rulesSummary}</span>
					</span>
					<i className='bi bi-chevron-right settings-index-caret' aria-hidden='true' />
				</button>
			</div>
		</>
	);
};

export default fantasySettingsSection;
