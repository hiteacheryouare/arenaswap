import { i18n } from '#i18n';
import type { FinishedTabAction } from '@arenaswap/core/types';
import ToggleSwitch from '@arenaswap/ui/src/components/toggleSwitch';
import BossDecoyInput from '../bossDecoyInput';
import CooldownSlider from '../cooldownSlider';
import SensitivitySlider from '../sensitivitySlider';
import SettingTooltipIcon from '../settingTooltipIcon';
import SwitchDelaySlider from '../switchDelaySlider';
import SelectDropdown from '../selectDropdown';
import type { demoSeason } from '../../../../utils/holidayDecorations';
import type { setupViewProps } from '../setupView';

interface settingsSwitchingPageProps extends Pick<setupViewProps, 'prefs' | 'prefsLoaded' | 'demoMode' | 'demoSeason' | 'bossShortcut' | 'onSensitivityChange' | 'onCooldownChange' | 'onSwitchDelayChange' | 'onToggleContentAwareSwitching' | 'onToggleNotifications' | 'onFinishedTabActionChange' | 'onBossDecoyChange' | 'onToggleDemo' | 'onDemoSeasonChange'> {
	finishedTabExplainer: string;
}

const settingsSwitchingPage = ({
	prefs, prefsLoaded, demoMode, demoSeason, bossShortcut, onSensitivityChange,
	onCooldownChange, onSwitchDelayChange, onToggleContentAwareSwitching, onToggleNotifications, onFinishedTabActionChange, onBossDecoyChange,
	onToggleDemo, onDemoSeasonChange, finishedTabExplainer,
}: settingsSwitchingPageProps) => (
	<>
		<div className='fw-bold popup-section-label'><i className='bi bi-speedometer2' />{i18n.t('setup.whenToSwitchSection')}</div>
		<div className='settings-stack'>
			<SensitivitySlider value={prefs.sensitivity} onChange={onSensitivityChange} />
			<CooldownSlider value={prefs.cooldownSeconds} onChange={onCooldownChange} />
			<SwitchDelaySlider value={prefs.switchDelaySeconds} onChange={onSwitchDelayChange} />
			<div className='d-flex justify-content-between align-items-center'>
				<div className='d-flex align-items-center gap-1'>
					<label className='fg-secondary setting-toggle-label' htmlFor='contentAwareSwitchingToggle'><i className='bi bi-pause-circle me-1 fg-primary' />{i18n.t('contentAwareSwitching.label')}</label>
					<SettingTooltipIcon text={i18n.t('contentAwareSwitching.explainer')} label={i18n.t('contentAwareSwitching.label')} />
				</div>
				<ToggleSwitch id='contentAwareSwitchingToggle' checked={prefs.contentAwareSwitching} onChange={onToggleContentAwareSwitching} disabled={!prefsLoaded} />
			</div>
		</div>

		<div className='fw-bold popup-section-label mt-5'><i className='bi bi-window-stack' />{i18n.t('setup.tabsSection')}</div>
		<div className='d-flex justify-content-between align-items-center'>
			<label className='fg-secondary setting-toggle-label' htmlFor='notificationsToggle'>{i18n.t('setup.switchNotifications')}</label>
			<ToggleSwitch id='notificationsToggle' checked={prefs.notificationsEnabled} onChange={onToggleNotifications} disabled={!prefsLoaded} />
		</div>

		<div className='mt-5'>
			<div className='d-flex align-items-center gap-1 mb-1'>
				<label className='fg-secondary setting-toggle-label' id='finishedTabSelectLabel' htmlFor='finishedTabSelect'>
					{i18n.t('setup.finishedTabAction')}
				</label>
				{finishedTabExplainer && <SettingTooltipIcon text={finishedTabExplainer} label={i18n.t('setup.finishedTabAction')} />}
			</div>
			<SelectDropdown<FinishedTabAction>
				id='finishedTabSelect'
				labelId='finishedTabSelectLabel'
				value={prefs.finishedTabAction}
				onChange={onFinishedTabActionChange}
				disabled={!prefsLoaded}
				options={[
					{ value: 'keep', label: i18n.t('setup.finishedTabKeep') },
					{ value: 'free', label: i18n.t('setup.finishedTabFree') },
					{ value: 'close', label: i18n.t('setup.finishedTabClose') },
				]}
			/>
		</div>

		<div className='mt-5'>
			<BossDecoyInput value={prefs.bossDecoyUrl} shortcut={bossShortcut} disabled={!prefsLoaded} onChange={onBossDecoyChange} />
		</div>

		<div className='fw-bold popup-section-label mt-5'><i className='bi bi-joystick' />{i18n.t('setup.demoSection')}</div>
		<div className='d-flex justify-content-between align-items-center'>
			<div className='d-flex align-items-center gap-1'>
				<label className='fg-secondary setting-toggle-label' htmlFor='demoToggle'>{i18n.t('setup.demoMode')}</label>
				<SettingTooltipIcon text={i18n.t('setup.demoModeExplainer')} label={i18n.t('setup.demoMode')} />
			</div>
			<ToggleSwitch id='demoToggle' checked={demoMode} onChange={onToggleDemo} />
		</div>

		{demoMode && (
			<div className='mt-5'>
				<div className='d-flex align-items-center gap-1 mb-1'>
					<label className='fg-secondary setting-toggle-label' id='demoSeasonSelectLabel' htmlFor='demoSeasonSelect'>{i18n.t('setup.demoSeason')}</label>
					<SettingTooltipIcon text={i18n.t('setup.demoSeasonExplainer')} label={i18n.t('setup.demoSeason')} />
				</div>
				<SelectDropdown<demoSeason>
					id='demoSeasonSelect'
					labelId='demoSeasonSelectLabel'
					value={demoSeason}
					onChange={onDemoSeasonChange}
					options={[
						{ value: 'real', label: i18n.t('setup.demoSeasonReal') },
						{ value: 'thanksgiving', label: i18n.t('setup.demoSeasonThanksgiving') },
						{ value: 'december', label: i18n.t('setup.demoSeasonDecember') },
						{ value: 'christmas', label: i18n.t('setup.demoSeasonChristmas') },
						{ value: 'boxingDay', label: i18n.t('setup.demoSeasonBoxingDay') },
						{ value: 'julyFourth', label: i18n.t('setup.demoSeasonJulyFourth') },
					]}
				/>
			</div>
		)}
	</>
);

export default settingsSwitchingPage;
