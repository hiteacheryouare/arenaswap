import { i18n } from '#i18n';
import type { ThemePreference } from '@arenaswap/core/types';
import ToggleSwitch from '@arenaswap/ui/src/components/toggleSwitch';
import FormRange from '../formRange';
import LeagueOrderList from '../leagueOrderList';
import SettingTooltipIcon from '../settingTooltipIcon';
import TemperatureUnitToggle from '../temperatureUnitToggle';
import SelectDropdown from '../selectDropdown';
import type { setupViewProps } from '../setupView';

interface settingsDisplayPageProps extends Pick<setupViewProps, 'prefs' | 'prefsLoaded' | 'leagueLogos' | 'onToggleShowUpcoming' | 'onUpcomingGamesDaysChange' | 'onToggleKeepFinalGames' | 'onToggleBetting' | 'onToggleProTips' | 'onToggleGroupByLeague' | 'onReorderLeague' | 'onResetLeagueOrder' | 'onThemeChange' | 'onToggleTemperatureUnit' | 'onUnlockRomer' | 'onToggleOpenReveal' | 'onToggleHolidayDecorations' | 'onToggleHolidaySnow' | 'onToggleHolidayLights' | 'onToggleHolidayLeaves' | 'onToggleHolidayChristmas' | 'onToggleHolidayBunting' | 'onToggleHolidayFireworks'> {
}

const settingsDisplayPage = ({
	prefs, prefsLoaded, leagueLogos, onToggleShowUpcoming, onUpcomingGamesDaysChange, onToggleKeepFinalGames,
	onToggleBetting, onToggleProTips, onToggleGroupByLeague, onReorderLeague, onResetLeagueOrder, onThemeChange,
	onToggleTemperatureUnit, onUnlockRomer, onToggleOpenReveal, onToggleHolidayDecorations, onToggleHolidaySnow, onToggleHolidayLights,
	onToggleHolidayLeaves, onToggleHolidayChristmas, onToggleHolidayBunting, onToggleHolidayFireworks,
}: settingsDisplayPageProps) => (
	<>
		<div className='fw-bold popup-section-label'><i className='bi bi-list-ul' />{i18n.t('setup.gameListSection')}</div>
		<div className='d-flex justify-content-between align-items-center'>
			<label className='fg-secondary setting-toggle-label' htmlFor='upcomingToggle'>{i18n.t('setup.showUpcoming')}</label>
			<ToggleSwitch id='upcomingToggle' checked={prefs.showUpcomingGames} onChange={onToggleShowUpcoming} disabled={!prefsLoaded} />
		</div>

		{prefs.showUpcomingGames && (
			<div className='mt-3 ms-5'>
				<div className='d-flex justify-content-between align-items-baseline mb-1'>
					<label className='fg-secondary setting-toggle-label' htmlFor='upcomingDaysSlider'>
						{i18n.t('setup.upcomingDaysLabel')}
					</label>
					<span className='fw-semibold setting-value-label'>{i18n.t('setup.upcomingDaysValue', prefs.upcomingGamesDays)}</span>
				</div>
				<FormRange
					id='upcomingDaysSlider'
					min={1}
					max={14}
					step={1}
					value={prefs.upcomingGamesDays}
					onChange={e => onUpcomingGamesDaysChange(Number(e.target.value))}
					disabled={!prefsLoaded}
				/>
				<div className='d-flex justify-content-between'>
					<span className='setting-explainer'>{i18n.t('setup.upcomingDaysValue', 1)}</span>
					<span className='setting-explainer'>{i18n.t('setup.upcomingDaysValue', 14)}</span>
				</div>
			</div>
		)}

		<div className='d-flex justify-content-between align-items-center mt-3'>
			<div className='d-flex align-items-center gap-1'>
				<label className='fg-secondary setting-toggle-label' htmlFor='keepFinalToggle'>{i18n.t('setup.keepFinalGames')}</label>
				<SettingTooltipIcon text={i18n.t('setup.keepFinalGamesExplainer')} label={i18n.t('setup.keepFinalGames')} />
			</div>
			<ToggleSwitch id='keepFinalToggle' checked={prefs.keepFinalGames} onChange={onToggleKeepFinalGames} disabled={!prefsLoaded} />
		</div>

		<div className='d-flex justify-content-between align-items-center mt-3'>
			<label className='fg-secondary setting-toggle-label' htmlFor='bettingToggle'>{i18n.t('setup.showBetting')}</label>
			<ToggleSwitch id='bettingToggle' checked={prefs.bettingEnabled} onChange={onToggleBetting} disabled={!prefsLoaded} />
		</div>

		<div className='d-flex justify-content-between align-items-center mt-3'>
			<label className='fg-secondary setting-toggle-label' htmlFor='proTipsToggle'>{i18n.t('setup.proTips')}</label>
			<ToggleSwitch id='proTipsToggle' checked={prefs.proTipsEnabled} onChange={onToggleProTips} disabled={!prefsLoaded} />
		</div>

		<div className='d-flex justify-content-between align-items-center mt-3'>
			<div className='d-flex align-items-center gap-1'>
				<label className='fg-secondary setting-toggle-label' htmlFor='groupByLeagueToggle'>{i18n.t('setup.groupByLeague')}</label>
				<SettingTooltipIcon text={i18n.t('setup.groupByLeagueExplainer')} label={i18n.t('setup.groupByLeague')} />
			</div>
			<ToggleSwitch id='groupByLeagueToggle' checked={prefs.groupByLeague} onChange={onToggleGroupByLeague} disabled={!prefsLoaded} />
		</div>
		{prefs.groupByLeague && prefs.enabledLeagues.length > 1 && (
			<>
				<div id='leagueOrderSection' className='fw-bold popup-section-label mt-5'>
					<i className='bi bi-arrow-down-up' />
					{i18n.t('setup.leagueOrderSection')}
					<SettingTooltipIcon text={i18n.t('setup.leagueOrderExplainer')} label={i18n.t('setup.leagueOrderSection')} />
				</div>
				<LeagueOrderList
					order={prefs.enabledLeagues}
					leagueLogos={leagueLogos}
					disabled={!prefsLoaded}
					onReorder={onReorderLeague}
					onReset={onResetLeagueOrder}
				/>
			</>
		)}

		<div className='fw-bold popup-section-label mt-5'><i className='bi bi-palette' />{i18n.t('setup.lookAndFeelSection')}</div>
		<div>
			<label className='fg-secondary setting-toggle-label d-block mb-1' id='themeSelectLabel' htmlFor='themeSelect'>
				{i18n.t('setup.theme')}
			</label>
			<SelectDropdown<ThemePreference>
				id='themeSelect'
				labelId='themeSelectLabel'
				value={prefs.theme}
				onChange={onThemeChange}
				disabled={!prefsLoaded}
				options={[
					{ value: 'light', label: i18n.t('setup.themeLight'), icon: 'bi-sun' },
					{ value: 'dark', label: i18n.t('setup.themeDark'), icon: 'bi-moon-stars' },
					{ value: 'system', label: i18n.t('setup.themeSystem'), icon: 'bi-circle-half' },
				]}
			/>
		</div>

		<TemperatureUnitToggle
			unit={prefs.temperatureUnit}
			romerUnlocked={prefs.romerUnlocked}
			disabled={!prefsLoaded}
			onCycle={onToggleTemperatureUnit}
			onUnlockRomer={onUnlockRomer}
		/>

		<div className='d-flex justify-content-between align-items-center mt-3'>
			<div className='d-flex align-items-center gap-1'>
				<label className='fg-secondary setting-toggle-label' htmlFor='openRevealToggle'>{i18n.t('setup.openReveal')}</label>
				<SettingTooltipIcon text={i18n.t('setup.openRevealExplainer')} label={i18n.t('setup.openReveal')} />
			</div>
			<ToggleSwitch id='openRevealToggle' checked={prefs.openRevealEnabled} onChange={onToggleOpenReveal} disabled={!prefsLoaded} />
		</div>

		<div className='d-flex justify-content-between align-items-center mt-3'>
			<div className='d-flex align-items-center gap-1'>
				<label className='fg-secondary setting-toggle-label' htmlFor='holidayDecorationsToggle'>{i18n.t('setup.holidayDecorations')}</label>
				<SettingTooltipIcon text={i18n.t('setup.holidayDecorationsExplainer')} label={i18n.t('setup.holidayDecorations')} />
			</div>
			<ToggleSwitch id='holidayDecorationsToggle' checked={prefs.holidayDecorationsEnabled} onChange={onToggleHolidayDecorations} disabled={!prefsLoaded} />
		</div>

		{prefs.holidayDecorationsEnabled && (
			<div className='ms-5'>
				<div className='d-flex justify-content-between align-items-center mt-3'>
					<label className='fg-secondary setting-toggle-label' htmlFor='holidaySnowToggle'>{i18n.t('setup.holidaySnow')}</label>
					<ToggleSwitch id='holidaySnowToggle' checked={prefs.holidaySnowEnabled} onChange={onToggleHolidaySnow} disabled={!prefsLoaded} />
				</div>

				<div className='d-flex justify-content-between align-items-center mt-3'>
					<label className='fg-secondary setting-toggle-label' htmlFor='holidayLightsToggle'>{i18n.t('setup.holidayLights')}</label>
					<ToggleSwitch id='holidayLightsToggle' checked={prefs.holidayLightsEnabled} onChange={onToggleHolidayLights} disabled={!prefsLoaded} />
				</div>

				<div className='d-flex justify-content-between align-items-center mt-3'>
					<label className='fg-secondary setting-toggle-label' htmlFor='holidayLeavesToggle'>{i18n.t('setup.holidayLeaves')}</label>
					<ToggleSwitch id='holidayLeavesToggle' checked={prefs.holidayLeavesEnabled} onChange={onToggleHolidayLeaves} disabled={!prefsLoaded} />
				</div>

				<div className='d-flex justify-content-between align-items-center mt-3'>
					<label className='fg-secondary setting-toggle-label' htmlFor='holidayChristmasToggle'>{i18n.t('setup.holidayChristmas')}</label>
					<ToggleSwitch id='holidayChristmasToggle' checked={prefs.holidayChristmasEnabled} onChange={onToggleHolidayChristmas} disabled={!prefsLoaded} />
				</div>

				<div className='d-flex justify-content-between align-items-center mt-3'>
					<label className='fg-secondary setting-toggle-label' htmlFor='holidayBuntingToggle'>{i18n.t('setup.holidayBunting')}</label>
					<ToggleSwitch id='holidayBuntingToggle' checked={prefs.holidayBuntingEnabled} onChange={onToggleHolidayBunting} disabled={!prefsLoaded} />
				</div>

				<div className='d-flex justify-content-between align-items-center mt-3'>
					<label className='fg-secondary setting-toggle-label' htmlFor='holidayFireworksToggle'>{i18n.t('setup.holidayFireworks')}</label>
					<ToggleSwitch id='holidayFireworksToggle' checked={prefs.holidayFireworksEnabled} onChange={onToggleHolidayFireworks} disabled={!prefsLoaded} />
				</div>
			</div>
		)}
	</>
);

export default settingsDisplayPage;
