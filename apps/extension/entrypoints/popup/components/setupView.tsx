import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { i18n } from '#i18n';
import { isCollegeLeagueId, leagueConfigMap, resolveCollegeFilter } from '@arenaswap/core/constants';
import { modesInUse } from '@arenaswap/core';
import type { FantasyRosterEntry } from '@arenaswap/core';
import type { BuiltInModeId, CollegeFilter, CollegeLeagueId, FinishedTabAction, LeagueId, LeagueLogoMap, LeagueScheduleMap, ScoringModeChoice, SignalName, SportType, ThemePreference, UserPreferences } from '@arenaswap/core/types';
import { fantasySportOf, type FantasySport } from 'powerscore';
import type { Browser } from 'wxt/browser';
import CollegeFilterPage from './collegeFilterPage';
import CollegeLeagueButton from './collegeLeagueButton';
import BossDecoyInput from './bossDecoyInput';
import CooldownSlider from './cooldownSlider';
import FavoriteTeamBonusInput from './favoriteTeamBonusInput';
import FavoriteTeamsPage from './favoriteTeamsPage';
import FantasySettingsSection from './fantasySettingsSection';
import LeagueLogo from './leagueLogo';
import leagueOffseasonLabel from './leagueOffseasonLabel';
import LeagueOrderList from './leagueOrderList';
import ModeSignalSwitches from './modeSignalSwitches';
import PostseasonBoostInput from './postseasonBoostInput';
import SensitivitySlider from './sensitivitySlider';
import ScoringModeSection from './scoringModeSection';
import SettingTooltipIcon from './settingTooltipIcon';
import SwitchDelaySlider from './switchDelaySlider';
import TemperatureUnitToggle from './temperatureUnitToggle';
import SelectDropdown from './selectDropdown';
import StandbyStreamGuide from './standbyStreamGuide';
import { searchSettings, settingsGroups, type settingsGroupId } from './settingsCatalog';
import type { demoSeason } from '../../../utils/holidayDecorations';
import { leaguesBySportType, sportTypeLabels, sportTypeOrder } from '../popupHelpers';
import { changedFantasyRuleCount } from '../../../utils/scoringPrefs';

// Both pages pull in code nothing else in the popup needs, so they load when opened.
const FantasyRosterPage = lazy(() => import('./fantasyRosterPage'));
const FantasyScoringPage = lazy(() => import('./fantasyScoringPage'));

type scoringSubPage = 'roster' | 'rules';

interface setupViewProps {
	prefs: UserPreferences;
	prefsLoaded: boolean;
	demoMode: boolean;
	demoSeason: demoSeason;
	leagueLogos: LeagueLogoMap;
	leagueSchedules: LeagueScheduleMap;
	favoriteTeamIds: ReadonlySet<string>;
	standbyStreamTabId: number | null;
	standbyOnboardingDone: boolean;
	openTabs: Browser.tabs.Tab[];
	formatTabLabel: (tab: Browser.tabs.Tab) => string;
	onClose: () => void;
	onSensitivityChange: (val: number) => void;
	onCooldownChange: (val: number) => void;
	onSwitchDelayChange: (val: number) => void;
	onFavoriteTeamBonusChange: (val: number) => void;
	onToggleFavoriteTeam: (leagueId: LeagueId, teamId: string) => void;
	onToggleLeague: (leagueId: LeagueId) => void;
	onToggleSport: (sport: SportType, selectAll: boolean) => void;
	onReorderLeague: (fromIndex: number, toIndex: number) => void;
	onResetLeagueOrder: () => void;
	onCollegeFilterChange: (leagueId: CollegeLeagueId, filter: CollegeFilter) => void;
	onToggleGroupByLeague: () => void;
	onToggleShowUpcoming: () => void;
	onToggleKeepFinalGames: () => void;
	onFinishedTabActionChange: (action: FinishedTabAction) => void;
	onThemeChange: (theme: ThemePreference) => void;
	onUpcomingGamesDaysChange: (val: number) => void;
	onToggleProTips: () => void;
	onToggleNotifications: () => void;
	bossShortcut?: string;
	onBossDecoyChange: (url: string) => void;
	onToggleDemo: () => void;
	onDemoSeasonChange: (season: demoSeason) => void;
	onToggleStandbyStream: () => void;
	onStandbyThresholdChange: (val: number) => void;
	onSetStandbyTab: (tabId: number | null) => void;
	onStandbyOnboardingDone: () => void;
	onToggleBetting: () => void;
	onToggleTemperatureUnit: () => void;
	onUnlockRomer: () => void;
	onToggleOpenReveal: () => void;
	onToggleHolidayDecorations: () => void;
	onToggleHolidaySnow: () => void;
	onToggleHolidayLights: () => void;
	onToggleHolidayLeaves: () => void;
	onPostseasonBoostChange: (val: number) => void;
	onToggleSignal: (signal: SignalName) => void;
	onToggleModeSignal: (mode: BuiltInModeId, signal: string) => void;
	onScoringModeChange: (mode: ScoringModeChoice) => void;
	onLeagueModeChange: (league: LeagueId, mode: BuiltInModeId) => void;
	onFantasyBlendChange: (value: number) => void;
	onFantasyRuleChange: (sport: FantasySport, rule: string, points: number) => void;
	onFantasyRulesReset: (sport: FantasySport) => void;
	fantasyRoster: readonly FantasyRosterEntry[];
	onFantasyRosterChange: (update: (current: FantasyRosterEntry[]) => FantasyRosterEntry[]) => void;
}

// The rules page opens on the sport of the first league you follow that Fantasy can score.
const firstFantasySport = (leagues: readonly LeagueId[]): FantasySport => {
	for (const league of leagues) {
		const sport = fantasySportOf(leagueConfigMap[league]?.sportType ?? '');
		if (sport) return sport;
	}
	return 'football';
};

const pageFallback = (
	<div className='d-flex justify-content-center mt-4'>
		<div className='spinner-border popup-loading-spinner' role='status'>
			<span className='visually-hidden'>{i18n.t('fantasy.loading')}</span>
		</div>
	</div>
);

const setupView = ({
	prefs, prefsLoaded, demoMode, demoSeason, leagueLogos, leagueSchedules, favoriteTeamIds, standbyStreamTabId, standbyOnboardingDone,
	openTabs, formatTabLabel, onClose, onSensitivityChange, onCooldownChange, onSwitchDelayChange,
	onFavoriteTeamBonusChange, onToggleFavoriteTeam, onToggleLeague, onToggleSport, onReorderLeague, onResetLeagueOrder, onCollegeFilterChange,
	onToggleGroupByLeague, onToggleShowUpcoming, onToggleKeepFinalGames, onFinishedTabActionChange, onThemeChange, onUpcomingGamesDaysChange,
	onToggleProTips, onToggleNotifications, bossShortcut, onBossDecoyChange, onToggleDemo, onDemoSeasonChange, onToggleStandbyStream, onStandbyThresholdChange,
	onSetStandbyTab, onStandbyOnboardingDone, onToggleBetting, onToggleTemperatureUnit, onUnlockRomer, onToggleOpenReveal,
	onPostseasonBoostChange,
	onToggleHolidayDecorations, onToggleHolidaySnow, onToggleHolidayLights, onToggleHolidayLeaves,
	onToggleSignal, onToggleModeSignal, onScoringModeChange, onLeagueModeChange, onFantasyBlendChange, onFantasyRuleChange,
	onFantasyRulesReset, fantasyRoster, onFantasyRosterChange,
}: setupViewProps) => {
	const [page, setPage] = useState<settingsGroupId | null>(null);
	const [collegeLeague, setCollegeLeague] = useState<CollegeLeagueId | null>(null);
	const [scoringPage, setScoringPage] = useState<scoringSubPage | null>(null);
	const pageRef = useRef<HTMLDivElement>(null);
	const subPageScrollTop = useRef<number | null>(null);
	const [query, setQuery] = useState('');
	const [showStandbyGuide, setShowStandbyGuide] = useState(false);

	const modes = modesInUse(prefs);
	const fantasyInUse = modes.includes('fantasy');
	// Search only offers a mode's controls while they are on the page.
	const availableModesKey = [...modes, prefs.scoringMode].join(',');
	const results = useMemo(() => searchSettings(query, new Set(availableModesKey.split(',') as ScoringModeChoice[])), [query, availableModesKey]);
	const noLeaguesSelected = prefsLoaded && prefs.enabledLeagues.length === 0;

	const lastGroupRef = useRef<settingsGroupId | null>(null);
	const pendingControlRef = useRef<string | undefined>(undefined);

	const openGroup = (id: settingsGroupId, controlId?: string) => {
		lastGroupRef.current = id;
		pendingControlRef.current = controlId;
		setPage(id);
		setCollegeLeague(null);
		setScoringPage(null);
		setQuery('');
	};

	// The button that was clicked unmounts with the page it was on, which would leave keyboard focus
	// on <body>. A page takes focus on its own header, and the index hands it back to the group
	// button it was opened from.
	useEffect(() => {
		if (page) {
			// A search result lands on the setting it named, not on top of a dozen others.
			const control = pendingControlRef.current ? document.getElementById(pendingControlRef.current) : null;
			pendingControlRef.current = undefined;
			control?.scrollIntoView({ block: 'center' });
			control?.focus({ preventScroll: true });
			// A section heading scrolls into view but can't hold focus, so the page header keeps it.
			if (!control || document.activeElement !== control) pageRef.current?.querySelector<HTMLElement>('.setup-header')?.focus({ preventScroll: true });
			return;
		}
		if (lastGroupRef.current) document.getElementById(`settingsGroup-${lastGroupRef.current}`)?.focus({ preventScroll: true });
	}, [page]);

	const openCollegeLeague = (leagueId: CollegeLeagueId) => {
		subPageScrollTop.current = pageRef.current?.scrollTop ?? 0;
		setCollegeLeague(leagueId);
	};

	const openScoringPage = (subPage: scoringSubPage) => {
		subPageScrollTop.current = pageRef.current?.scrollTop ?? 0;
		setScoringPage(subPage);
	};

	const lastScoringPageRef = useRef<scoringSubPage | null>(null);
	useEffect(() => {
		if (scoringPage) {
			lastScoringPageRef.current = scoringPage;
			pageRef.current?.querySelector<HTMLElement>('.setup-header')?.focus({ preventScroll: true });
			return;
		}
		const last = lastScoringPageRef.current;
		lastScoringPageRef.current = null;
		if (last) document.getElementById(last === 'roster' ? 'fantasyRosterOpen' : 'fantasyRulesOpen')?.focus({ preventScroll: true });
	}, [scoringPage]);

	// Back from a college picker or a Fantasy page lands where its row was, not at the top of the page.
	useLayoutEffect(() => {
		if (collegeLeague || scoringPage || subPageScrollTop.current === null) return;
		if (pageRef.current) pageRef.current.scrollTop = subPageScrollTop.current;
		subPageScrollTop.current = null;
	}, [collegeLeague, scoringPage, page]);

	const handleToggleStandbyStream = () => {
		if (!prefs.standbyStreamEnabled && !standbyOnboardingDone) {
			setShowStandbyGuide(true);
		}
		onToggleStandbyStream();
	};

	const handleStandbyGuideDone = () => {
		setShowStandbyGuide(false);
		onStandbyOnboardingDone();
	};

	if (showStandbyGuide) {
		return <StandbyStreamGuide onDone={handleStandbyGuideDone} />;
	}

	const switchingPage = (
		<>
			<div className='fw-bold popup-section-label'><i className='bi bi-speedometer2' />{i18n.t('setup.whenToSwitchSection')}</div>
			<div className='settings-stack'>
				<SensitivitySlider value={prefs.sensitivity} onChange={onSensitivityChange} />
				<CooldownSlider value={prefs.cooldownSeconds} onChange={onCooldownChange} />
				<SwitchDelaySlider value={prefs.switchDelaySeconds} onChange={onSwitchDelayChange} />
			</div>

			<div className='fw-bold popup-section-label mt-3'><i className='bi bi-window-stack' />{i18n.t('setup.tabsSection')}</div>
			<div className='d-flex justify-content-between align-items-center'>
				<label className='text-body-secondary setting-toggle-label' htmlFor='notificationsToggle'>{i18n.t('setup.switchNotifications')}</label>
				<div className='form-check form-switch mb-0'>
					<input className='form-check-input' type='checkbox' id='notificationsToggle' checked={prefs.notificationsEnabled} onChange={onToggleNotifications} disabled={!prefsLoaded} />
				</div>
			</div>

			<div className='mt-3'>
				<label className='text-body-secondary setting-toggle-label d-block mb-1' id='finishedTabSelectLabel' htmlFor='finishedTabSelect'>
					{i18n.t('setup.finishedTabAction')}
				</label>
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
				{prefs.finishedTabAction !== 'keep' && (
					<div className='setting-explainer mt-1'>{i18n.t('setup.finishedTabActiveExplainer')}</div>
				)}
				{prefs.finishedTabAction === 'close' && (
					<div className='setting-explainer mt-1'>{i18n.t('setup.finishedTabCloseExplainer')}</div>
				)}
			</div>

			<div className='mt-3'>
				<BossDecoyInput value={prefs.bossDecoyUrl} shortcut={bossShortcut} disabled={!prefsLoaded} onChange={onBossDecoyChange} />
			</div>

			<div className='fw-bold popup-section-label mt-3'><i className='bi bi-joystick' />{i18n.t('setup.demoSection')}</div>
			<div className='d-flex justify-content-between align-items-center'>
				<label className='text-body-secondary setting-toggle-label' htmlFor='demoToggle'>{i18n.t('setup.demoMode')}</label>
				<div className='form-check form-switch mb-0'>
					<input className='form-check-input' type='checkbox' id='demoToggle' checked={demoMode} onChange={onToggleDemo} />
				</div>
			</div>
			<div className='setting-explainer mt-1'>{i18n.t('setup.demoModeExplainer')}</div>

			{demoMode && (
				<div className='mt-3'>
					<label className='text-body-secondary setting-toggle-label d-block mb-1' id='demoSeasonSelectLabel' htmlFor='demoSeasonSelect'>{i18n.t('setup.demoSeason')}</label>
					<SelectDropdown<demoSeason>
						id='demoSeasonSelect'
						labelId='demoSeasonSelectLabel'
						value={demoSeason}
						onChange={onDemoSeasonChange}
						options={[
							{ value: 'real', label: i18n.t('setup.demoSeasonReal') },
							{ value: 'thanksgiving', label: i18n.t('setup.demoSeasonThanksgiving') },
							{ value: 'december', label: i18n.t('setup.demoSeasonDecember') },
						]}
					/>
					<div className='setting-explainer mt-1'>{i18n.t('setup.demoSeasonExplainer')}</div>
				</div>
			)}
		</>
	);

	const scoringIndexPage = (
		<>
			<ScoringModeSection
				prefs={prefs}
				leagueLogos={leagueLogos}
				disabled={!prefsLoaded}
				onScoringModeChange={onScoringModeChange}
				onLeagueModeChange={onLeagueModeChange}
			/>

			{fantasyInUse && (
				<FantasySettingsSection
					blend={prefs.fantasyBlend}
					rosterSize={fantasyRoster.length}
					changedRules={changedFantasyRuleCount(prefs.fantasyScoring)}
					disabled={!prefsLoaded}
					onBlendChange={onFantasyBlendChange}
					onOpenRoster={() => openScoringPage('roster')}
					onOpenRules={() => openScoringPage('rules')}
				/>
			)}

			<ModeSignalSwitches
				prefs={prefs}
				disabled={!prefsLoaded}
				onToggleSignal={onToggleSignal}
				onToggleModeSignal={onToggleModeSignal}
			/>

			<div className='fw-bold popup-section-label mt-3'><i className='bi bi-plus-slash-minus' />{i18n.t('setup.bonusesSection')}</div>
			<div className='settings-stack'>
				<PostseasonBoostInput value={prefs.postseasonBoostPoints} onChange={onPostseasonBoostChange} />
				<FavoriteTeamBonusInput value={prefs.favoriteTeamBonusPoints} onChange={onFavoriteTeamBonusChange} />
			</div>
		</>
	);

	const favoritesPage = (
		<FavoriteTeamsPage
			enabledLeagues={prefs.enabledLeagues}
			favoriteTeamIds={favoriteTeamIds}
			onToggleFavoriteTeam={onToggleFavoriteTeam}
		/>
	);

	const displayPage = (
		<>
			<div className='fw-bold popup-section-label'><i className='bi bi-list-ul' />{i18n.t('setup.gameListSection')}</div>
			<div className='d-flex justify-content-between align-items-center'>
				<label className='text-body-secondary setting-toggle-label' htmlFor='upcomingToggle'>{i18n.t('setup.showUpcoming')}</label>
				<div className='form-check form-switch mb-0'>
					<input className='form-check-input' type='checkbox' id='upcomingToggle' checked={prefs.showUpcomingGames} onChange={onToggleShowUpcoming} disabled={!prefsLoaded} />
				</div>
			</div>

			{prefs.showUpcomingGames && (
				<div className='mt-2 ms-3'>
					<div className='d-flex justify-content-between align-items-baseline mb-1'>
						<label className='text-body-secondary setting-toggle-label' htmlFor='upcomingDaysSlider'>
							{i18n.t('setup.upcomingDaysLabel')}
						</label>
						<span className='fw-semibold setting-value-label'>{i18n.t('setup.upcomingDaysValue', prefs.upcomingGamesDays)}</span>
					</div>
					<input
						type='range'
						className='form-range'
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

			<div className='d-flex justify-content-between align-items-center mt-2'>
				<label className='text-body-secondary setting-toggle-label' htmlFor='keepFinalToggle'>{i18n.t('setup.keepFinalGames')}</label>
				<div className='form-check form-switch mb-0'>
					<input className='form-check-input' type='checkbox' id='keepFinalToggle' checked={prefs.keepFinalGames} onChange={onToggleKeepFinalGames} disabled={!prefsLoaded} />
				</div>
			</div>
			<div className='setting-explainer mt-1'>{i18n.t('setup.keepFinalGamesExplainer')}</div>

			<div className='d-flex justify-content-between align-items-center mt-2'>
				<label className='text-body-secondary setting-toggle-label' htmlFor='bettingToggle'>{i18n.t('setup.showBetting')}</label>
				<div className='form-check form-switch mb-0'>
					<input className='form-check-input' type='checkbox' id='bettingToggle' checked={prefs.bettingEnabled} onChange={onToggleBetting} disabled={!prefsLoaded} />
				</div>
			</div>

			<div className='d-flex justify-content-between align-items-center mt-2'>
				<label className='text-body-secondary setting-toggle-label' htmlFor='proTipsToggle'>{i18n.t('setup.proTips')}</label>
				<div className='form-check form-switch mb-0'>
					<input className='form-check-input' type='checkbox' id='proTipsToggle' checked={prefs.proTipsEnabled} onChange={onToggleProTips} disabled={!prefsLoaded} />
				</div>
			</div>

			<div className='d-flex justify-content-between align-items-center mt-2'>
				<label className='text-body-secondary setting-toggle-label' htmlFor='groupByLeagueToggle'>{i18n.t('setup.groupByLeague')}</label>
				<div className='form-check form-switch mb-0'>
					<input className='form-check-input' type='checkbox' id='groupByLeagueToggle' checked={prefs.groupByLeague} onChange={onToggleGroupByLeague} disabled={!prefsLoaded} />
				</div>
			</div>
			<div className='setting-explainer mt-1'>{i18n.t('setup.groupByLeagueExplainer')}</div>
			{prefs.groupByLeague && prefs.enabledLeagues.length > 1 && (
				<>
					<div id='leagueOrderSection' className='fw-bold popup-section-label mt-3'>
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

			<div className='fw-bold popup-section-label mt-3'><i className='bi bi-palette' />{i18n.t('setup.lookAndFeelSection')}</div>
			<div>
				<label className='text-body-secondary setting-toggle-label d-block mb-1' id='themeSelectLabel' htmlFor='themeSelect'>
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

			<div className='d-flex justify-content-between align-items-center mt-2'>
				<div className='d-flex align-items-center gap-1'>
					<label className='text-body-secondary setting-toggle-label' htmlFor='openRevealToggle'>{i18n.t('setup.openReveal')}</label>
					<SettingTooltipIcon text={i18n.t('setup.openRevealExplainer')} label={i18n.t('setup.openReveal')} />
				</div>
				<div className='form-check form-switch mb-0'>
					<input className='form-check-input' type='checkbox' id='openRevealToggle' checked={prefs.openRevealEnabled} onChange={onToggleOpenReveal} disabled={!prefsLoaded} />
				</div>
			</div>

			<div className='d-flex justify-content-between align-items-center mt-2'>
				<div className='d-flex align-items-center gap-1'>
					<label className='text-body-secondary setting-toggle-label' htmlFor='holidayDecorationsToggle'>{i18n.t('setup.holidayDecorations')}</label>
					<SettingTooltipIcon text={i18n.t('setup.holidayDecorationsExplainer')} label={i18n.t('setup.holidayDecorations')} />
				</div>
				<div className='form-check form-switch mb-0'>
					<input className='form-check-input' type='checkbox' id='holidayDecorationsToggle' checked={prefs.holidayDecorationsEnabled} onChange={onToggleHolidayDecorations} disabled={!prefsLoaded} />
				</div>
			</div>

			{prefs.holidayDecorationsEnabled && (
				<div className='ms-3'>
					<div className='d-flex justify-content-between align-items-center mt-2'>
						<label className='text-body-secondary setting-toggle-label' htmlFor='holidaySnowToggle'>{i18n.t('setup.holidaySnow')}</label>
						<div className='form-check form-switch mb-0'>
							<input className='form-check-input' type='checkbox' id='holidaySnowToggle' checked={prefs.holidaySnowEnabled} onChange={onToggleHolidaySnow} disabled={!prefsLoaded} />
						</div>
					</div>

					<div className='d-flex justify-content-between align-items-center mt-2'>
						<label className='text-body-secondary setting-toggle-label' htmlFor='holidayLightsToggle'>{i18n.t('setup.holidayLights')}</label>
						<div className='form-check form-switch mb-0'>
							<input className='form-check-input' type='checkbox' id='holidayLightsToggle' checked={prefs.holidayLightsEnabled} onChange={onToggleHolidayLights} disabled={!prefsLoaded} />
						</div>
					</div>

					<div className='d-flex justify-content-between align-items-center mt-2'>
						<label className='text-body-secondary setting-toggle-label' htmlFor='holidayLeavesToggle'>{i18n.t('setup.holidayLeaves')}</label>
						<div className='form-check form-switch mb-0'>
							<input className='form-check-input' type='checkbox' id='holidayLeavesToggle' checked={prefs.holidayLeavesEnabled} onChange={onToggleHolidayLeaves} disabled={!prefsLoaded} />
						</div>
					</div>
				</div>
			)}
		</>
	);

	const standbyPage = (
		<>
			<div className='d-flex justify-content-between align-items-center'>
				<label className='text-body-secondary setting-toggle-label' htmlFor='standbyStreamToggle'>{i18n.t('setup.enableStandby')}</label>
				<div className='form-check form-switch mb-0'>
					<input className='form-check-input' type='checkbox' id='standbyStreamToggle' checked={prefs.standbyStreamEnabled} onChange={handleToggleStandbyStream} disabled={!prefsLoaded} />
				</div>
			</div>

			{prefs.standbyStreamEnabled && (
				<div className='mt-3 d-flex flex-column gap-3'>
					<div>
						<div className='d-flex justify-content-between align-items-baseline mb-1'>
							<label className='text-body-secondary setting-toggle-label' htmlFor='standbyThresholdSlider'>
								{i18n.t('setup.standbyBelow')}
							</label>
							<span className='fw-semibold setting-value-label'>{prefs.standbyStreamThreshold}</span>
						</div>
						<input
							type='range'
							className='form-range'
							id='standbyThresholdSlider'
							min={0}
							max={100}
							step={5}
							value={prefs.standbyStreamThreshold}
							onChange={e => onStandbyThresholdChange(Number(e.target.value))}
							disabled={!prefsLoaded}
						/>
						<div className='d-flex justify-content-between'>
							<span className='setting-explainer'>{i18n.t('setup.morePatient')}</span>
							<span className='setting-explainer'>{i18n.t('setup.switchesSooner')}</span>
						</div>
					</div>

					<div>
						<div className='text-body-secondary setting-toggle-label mb-1'>
							{i18n.t('setup.standbyTab')}
						</div>
						<SelectDropdown
							id='standbyTabSelect'
							value={standbyStreamTabId === null ? '' : String(standbyStreamTabId)}
							onChange={value => onSetStandbyTab(value ? Number(value) : null)}
							disabled={!prefsLoaded}
							ariaLabel={i18n.t('setup.standbyTab')}
							options={[
								{ value: '', label: i18n.t('setup.selectTab') },
								...openTabs.filter(openTab => openTab.id !== undefined).map(openTab => ({ value: String(openTab.id), label: formatTabLabel(openTab) })),
							]}
						/>
					</div>
				</div>
			)}
		</>
	);

	const now = Date.now();
	const leaguesPage = (
		<>
			{noLeaguesSelected && (
				<div className='setup-no-leagues-warn mb-2'>
					<i className='bi bi-exclamation-circle me-1' />
					{i18n.t('setup.noLeaguesWarning')}
				</div>
			)}
			{(Object.keys(sportTypeOrder) as SportType[])
				.toSorted((a, b) => sportTypeOrder[a] - sportTypeOrder[b])
				.map(sportType => {
					const leagues = leaguesBySportType[sportType];
					const allSelected = leagues.every(l => prefs.enabledLeagues.includes(l.id));
					return (
						<div key={sportType} className='league-toggle-group'>
							<div className='d-flex align-items-center justify-content-between'>
								<div className='fw-semibold text-body-secondary setting-toggle-label'>{sportTypeLabels[sportType]}</div>
								<button
									type='button'
									className='btn btn-outline-secondary btn-sm px-2 py-0 small'
									onClick={() => onToggleSport(sportType, !allSelected)}
									disabled={!prefsLoaded}
								>
									{allSelected ? i18n.t('setup.selectNone') : i18n.t('setup.selectAll')}
								</button>
							</div>
							<div className='league-toggle-grid'>
								{leagues.map(league => {
									const offseasonLabel = leagueOffseasonLabel(leagueSchedules[league.id], now);
									const labelBody = (
										<>
											<span className='d-block fw-semibold text-body'>{league.label}</span>
											{offseasonLabel && <span className='d-block text-body-secondary league-offseason'>{offseasonLabel}</span>}
										</>
									);
									return (
										<div key={league.id} className='league-toggle-row'>
											<div className='league-toggle-row-top'>
												<LeagueLogo league={league} logos={leagueLogos} />
												<div className='form-check form-switch mb-0'>
													<input
														className='form-check-input'
														type='checkbox'
														id={`league-${league.id}`}
														checked={prefs.enabledLeagues.includes(league.id)}
														onChange={() => onToggleLeague(league.id)}
														disabled={!prefsLoaded}
														aria-label={isCollegeLeagueId(league.id) ? league.label : undefined}
													/>
												</div>
											</div>
											{isCollegeLeagueId(league.id) ? (
												<CollegeLeagueButton
													leagueId={league.id}
													leagueLabel={league.label}
													filter={resolveCollegeFilter(prefs.collegeFilters, league.id)}
													onOpen={() => openCollegeLeague(league.id as CollegeLeagueId)}
												>
													{labelBody}
												</CollegeLeagueButton>
											) : (
												<label className='mb-0 league-toggle-label' htmlFor={`league-${league.id}`}>{labelBody}</label>
											)}
										</div>
									);
								})}
							</div>
						</div>
					);
				})}
		</>
	);

	const pages: Record<settingsGroupId, ReactNode> = {
		switching: switchingPage,
		scoring: scoringIndexPage,
		favorites: favoritesPage,
		leagues: leaguesPage,
		display: displayPage,
		standby: standbyPage,
	};

	if (page === 'scoring' && scoringPage) {
		const isRoster = scoringPage === 'roster';
		return (
			<div ref={pageRef} className={`popup-container${isRoster ? ' d-flex flex-column' : ''}`}>
				<button type='button' className='setup-header' onClick={() => setScoringPage(null)}>
					<i className='bi bi-arrow-left' />
					{isRoster ? i18n.t('setup.fantasyRoster') : i18n.t('setup.fantasyRules')}
				</button>
				<div className='settings-page-lede'>{isRoster ? i18n.t('fantasy.rosterLede') : i18n.t('fantasy.rulesLede')}</div>
				<Suspense fallback={pageFallback}>
					{isRoster ? (
						<FantasyRosterPage roster={fantasyRoster} onRosterChange={onFantasyRosterChange} />
					) : (
						<FantasyScoringPage
							scoring={prefs.fantasyScoring}
							initialSport={firstFantasySport(prefs.enabledLeagues)}
							disabled={!prefsLoaded}
							onRuleChange={onFantasyRuleChange}
							onResetSport={onFantasyRulesReset}
						/>
					)}
				</Suspense>
			</div>
		);
	}

	if (page === 'leagues' && collegeLeague) {
		const league = { ...leagueConfigMap[collegeLeague], id: collegeLeague };
		return (
			<div className='popup-container'>
				<button type='button' className='setup-header' onClick={() => setCollegeLeague(null)}>
					<i className='bi bi-arrow-left' />
					{league.label}
				</button>
				<div className='settings-page-lede'>{i18n.t('collegeFilter.lede')}</div>
				<CollegeFilterPage
					league={league}
					leagueLogos={leagueLogos}
					filter={resolveCollegeFilter(prefs.collegeFilters, collegeLeague)}
					disabled={!prefsLoaded}
					onChange={filter => onCollegeFilterChange(collegeLeague, filter)}
				/>
			</div>
		);
	}

	if (page) {
		const group = settingsGroups.find(candidate => candidate.id === page);
		// Every other page is short enough to scroll as one block. The team picker is the only one
		// that has to keep its own search box in view, so it takes the column and scrolls inside it.
		const scrollsWithin = page === 'favorites';
		return (
			<div ref={pageRef} className={`popup-container${scrollsWithin ? ' d-flex flex-column' : ''}`}>
				<button type='button' className='setup-header' onClick={() => setPage(null)}>
					<i className='bi bi-arrow-left' />
					{group ? i18n.t(group.labelKey) : i18n.t('setup.header')}
				</button>
				{group && <div className='settings-page-lede'>{i18n.t(group.descriptionKey)}</div>}
				{pages[page]}
			</div>
		);
	}

	return (
		<div className='popup-container'>
			<button type='button' className='setup-header' onClick={onClose}>
				<i className='bi bi-arrow-left' />
				{i18n.t('setup.header')}
			</button>

			<div className='settings-search'>
				<i className='bi bi-search settings-search-icon' aria-hidden='true' />
				<input
					type='search'
					id='settingsSearch'
					className='form-control form-control-sm settings-search-input'
					value={query}
					onChange={e => setQuery(e.target.value)}
					placeholder={i18n.t('setup.searchPlaceholder')}
					aria-label={i18n.t('setup.searchPlaceholder')}
					autoComplete='off'
				/>
			</div>

			{query.trim() ? (
				results.length > 0 ? (
					<div className='settings-index'>
						{results.map(result => (
							<button
								key={`${result.group.id}-${String(result.labelKey)}`}
								type='button'
								className='settings-index-row'
								onClick={() => openGroup(result.group.id, result.controlId)}
								aria-label={`${result.label}, ${result.sublabel}`}
							>
								<span className='settings-index-text'>
									<span className='settings-index-name'>{result.label}</span>
									<span className='settings-index-desc'>{result.sublabel}</span>
								</span>
								<i className='bi bi-chevron-right settings-index-caret' aria-hidden='true' />
							</button>
						))}
					</div>
				) : (
					<div className='settings-search-empty'>{i18n.t('setup.searchNoResults', { query: query.trim() })}</div>
				)
			) : (
				<div className='settings-index'>
					{settingsGroups.map(group => (
						<button
							key={group.id}
							type='button'
							id={`settingsGroup-${group.id}`}
							className='settings-index-row'
							onClick={() => openGroup(group.id)}
						>
							<i className={`bi bi-${group.icon} settings-index-icon`} aria-hidden='true' />
							<span className='settings-index-text'>
								<span className='settings-index-name'>{i18n.t(group.labelKey)}</span>
								<span className='settings-index-desc'>{i18n.t(group.descriptionKey)}</span>
							</span>
							{group.id === 'leagues' && noLeaguesSelected && (
								<i className='bi bi-exclamation-circle settings-index-warn' title={i18n.t('setup.noLeaguesWarning')} />
							)}
							<i className='bi bi-chevron-right settings-index-caret' aria-hidden='true' />
						</button>
					))}
				</div>
			)}
		</div>
	);
};

export default setupView;
