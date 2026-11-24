import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { i18n } from '#i18n';
import { leagueConfigMap, resolveCollegeFilter } from '@arenaswap/core/constants';
import { modesInUse } from '@arenaswap/core';
import type { FantasyRosterEntry } from '@arenaswap/core';
import type { BuiltInModeId, CollegeFilter, CollegeLeagueId, FinishedTabAction, LeagueId, LeagueLogoMap, LeagueScheduleMap, ScoringModeChoice, SignalName, SportType, TabRegistration, ThemePreference, UserPreferences } from '@arenaswap/core/types';
import { fantasySportOf, type FantasySport } from 'powerscore';
import type { Browser } from 'wxt/browser';
import CollegeFilterPage from './collegeFilterPage';
import BackupSyncPage, { type profileActions as profileActionHandlers } from './backupSyncPage';
import StandbyStreamGuide from './standbyStreamGuide';
import MultiviewGuide from './multiviewGuide';
import SettingsSwitchingPage from './settings/settingsSwitchingPage';
import SettingsScoringIndexPage from './settings/settingsScoringIndexPage';
import SettingsFavoritesPage from './settings/settingsFavoritesPage';
import SettingsDisplayPage from './settings/settingsDisplayPage';
import SettingsStandbyPage from './settings/settingsStandbyPage';
import SettingsMultiviewPage from './settings/settingsMultiviewPage';
import SettingsLeaguesPage from './settings/settingsLeaguesPage';
import { searchSettings, settingsGroups, translate, type settingsGroupId } from './settingsCatalog';
import type { demoSeason } from '../../../utils/holidayDecorations';
import type { profileList } from '../../../utils/profiles';
import useSlideDirection, { slideClassName } from '../useSlideDirection';

const FantasyRosterPage = lazy(() => import('./fantasy/fantasyRosterPage'));
const FantasyScoringPage = lazy(() => import('./fantasy/fantasyScoringPage'));

export type scoringSubPage = 'roster' | 'rules';

export interface setupViewProps {
	prefs: UserPreferences;
	prefsLoaded: boolean;
	demoMode: boolean;
	demoSeason: demoSeason;
	leagueLogos: LeagueLogoMap;
	leagueSchedules: LeagueScheduleMap;
	favoriteTeamIds: ReadonlySet<string>;
	rivalTeamIds: ReadonlySet<string>;
	standbyStreamTabId: number | null;
	standbyTabElsewhere?: Browser.tabs.Tab | null;
	standbyOnboardingDone: boolean;
	openTabs: Browser.tabs.Tab[];
	registry?: TabRegistration[];
	formatTabLabel: (tab: Browser.tabs.Tab) => string;
	onClose: () => void;
	onSensitivityChange: (val: number) => void;
	onCooldownChange: (val: number) => void;
	onSwitchDelayChange: (val: number) => void;
	onToggleContentAwareSwitching: () => void;
	onFavoriteTeamBonusChange: (val: number) => void;
	onToggleFavoriteTeam: (leagueId: LeagueId, teamId: string) => void;
	onToggleRivalTeam: (leagueId: LeagueId, teamId: string) => void;
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
	multiviewAvailable: boolean;
	multiviewOn: boolean;
	multiviewOnboardingDone: boolean;
	onMultiviewOnboardingDone: () => void;
	onToggleMultiview: () => void;
	onMultiviewThresholdChange: (val: number) => void;
	onMultiviewGamesChange: (games: UserPreferences['multiviewGames']) => void;
	onMultiviewMaxBoxesChange: (val: number) => void;
	onToggleBetting: () => void;
	onToggleTemperatureUnit: () => void;
	onUnlockRomer: () => void;
	onToggleOpenReveal: () => void;
	onToggleHolidayDecorations: () => void;
	onToggleHolidaySnow: () => void;
	onToggleHolidayLights: () => void;
	onToggleHolidayLeaves: () => void;
	onToggleHolidayChristmas: () => void;
	onToggleHolidayBunting: () => void;
	onToggleHolidayFireworks: () => void;
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
	profiles: profileList;
	profilesBusy: boolean;
	profileActions: profileActionHandlers;
}

const firstFantasySport = (leagues: readonly LeagueId[]): FantasySport => {
	for (const league of leagues) {
		const sport = fantasySportOf(leagueConfigMap[league]?.sportType ?? '');
		if (sport) return sport;
	}
	return 'football';
};

const pageFallback = (
	<div className='d-flex justify-content-center mt-7'>
		<div className='spinner-border popup-loading-spinner' role='status'>
			<span className='visually-hidden'>{i18n.t('fantasy.loading')}</span>
		</div>
	</div>
);

const setupView = ({
	prefs, prefsLoaded, demoMode, demoSeason, leagueLogos, leagueSchedules, favoriteTeamIds, rivalTeamIds, standbyStreamTabId, standbyTabElsewhere = null, standbyOnboardingDone,
	openTabs, registry = [], formatTabLabel, onClose, onSensitivityChange, onCooldownChange, onSwitchDelayChange, onToggleContentAwareSwitching,
	onFavoriteTeamBonusChange, onToggleFavoriteTeam, onToggleRivalTeam, onToggleLeague, onToggleSport, onReorderLeague, onResetLeagueOrder, onCollegeFilterChange,
	onToggleGroupByLeague, onToggleShowUpcoming, onToggleKeepFinalGames, onFinishedTabActionChange, onThemeChange, onUpcomingGamesDaysChange,
	onToggleProTips, onToggleNotifications, bossShortcut, onBossDecoyChange, onToggleDemo, onDemoSeasonChange, onToggleStandbyStream, onStandbyThresholdChange,
	onSetStandbyTab, onStandbyOnboardingDone, multiviewAvailable, multiviewOn, multiviewOnboardingDone, onMultiviewOnboardingDone,
	onToggleMultiview, onMultiviewThresholdChange,
	onMultiviewGamesChange, onMultiviewMaxBoxesChange, onToggleBetting, onToggleTemperatureUnit, onUnlockRomer, onToggleOpenReveal,
	onPostseasonBoostChange,
	onToggleHolidayDecorations, onToggleHolidaySnow, onToggleHolidayLights, onToggleHolidayLeaves,
	onToggleHolidayChristmas, onToggleHolidayBunting, onToggleHolidayFireworks,
	onToggleSignal, onToggleModeSignal, onScoringModeChange, onLeagueModeChange, onFantasyBlendChange, onFantasyRuleChange,
	onFantasyRulesReset, fantasyRoster, onFantasyRosterChange, profiles, profilesBusy, profileActions,
}: setupViewProps) => {
	const [page, setPage] = useState<settingsGroupId | null>(null);
	const [collegeLeague, setCollegeLeague] = useState<CollegeLeagueId | null>(null);
	const [scoringPage, setScoringPage] = useState<scoringSubPage | null>(null);
	const pageRef = useRef<HTMLDivElement>(null);
	const subPageScrollTop = useRef<number | null>(null);
	const [query, setQuery] = useState('');
	const [showStandbyGuide, setShowStandbyGuide] = useState(false);
	const [showMultiviewGuide, setShowMultiviewGuide] = useState(false);
	const onSubPage = (page === 'scoring' && scoringPage !== null) || (page === 'leagues' && collegeLeague !== null);
	const slide = slideClassName(useSlideDirection(onSubPage ? 2 : page ? 1 : 0));

	const modes = modesInUse(prefs);
	const fantasyInUse = modes.includes('fantasy');
	const availableModesKey = [...modes, prefs.scoringMode].join(',');
	const hiddenGroups = useMemo(() => new Set<settingsGroupId>(multiviewAvailable ? [] : ['multiview']), [multiviewAvailable]);
	const results = useMemo(
		() => searchSettings(query, new Set(availableModesKey.split(',') as ScoringModeChoice[]), hiddenGroups),
		[query, availableModesKey, hiddenGroups]
	);
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

	useEffect(() => {
		if (page) {
			const control = pendingControlRef.current ? document.getElementById(pendingControlRef.current) : null;
			pendingControlRef.current = undefined;
			control?.scrollIntoView({ block: 'center' });
			control?.focus({ preventScroll: true });
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

	const handleToggleMultiview = () => {
		if (!multiviewOn && !multiviewOnboardingDone) {
			setShowMultiviewGuide(true);
			return;
		}
		onToggleMultiview();
	};

	if (showMultiviewGuide) {
		return (
			<MultiviewGuide
				onAllow={() => {
					onToggleMultiview();
					onMultiviewOnboardingDone();
					setShowMultiviewGuide(false);
				}}
				onNotNow={() => setShowMultiviewGuide(false)}
			/>
		);
	}

	const finishedTabExplainer = [
		prefs.finishedTabAction !== 'keep' && i18n.t('setup.finishedTabActiveExplainer'),
		prefs.finishedTabAction === 'close' && i18n.t('setup.finishedTabCloseExplainer'),
	].filter(Boolean).join(' ');

	const now = Date.now();

	const pages: Record<settingsGroupId, () => ReactNode> = {
		switching: () => (
			<SettingsSwitchingPage
				prefs={prefs}
				prefsLoaded={prefsLoaded}
				demoMode={demoMode}
				demoSeason={demoSeason}
				bossShortcut={bossShortcut}
				onSensitivityChange={onSensitivityChange}
				onCooldownChange={onCooldownChange}
				onSwitchDelayChange={onSwitchDelayChange}
				onToggleContentAwareSwitching={onToggleContentAwareSwitching}
				onToggleNotifications={onToggleNotifications}
				onFinishedTabActionChange={onFinishedTabActionChange}
				onBossDecoyChange={onBossDecoyChange}
				onToggleDemo={onToggleDemo}
				onDemoSeasonChange={onDemoSeasonChange}
				finishedTabExplainer={finishedTabExplainer}
			/>
		),
		scoring: () => (
			<SettingsScoringIndexPage
				prefs={prefs}
				prefsLoaded={prefsLoaded}
				leagueLogos={leagueLogos}
				fantasyRoster={fantasyRoster}
				onScoringModeChange={onScoringModeChange}
				onLeagueModeChange={onLeagueModeChange}
				onFantasyBlendChange={onFantasyBlendChange}
				onToggleSignal={onToggleSignal}
				onToggleModeSignal={onToggleModeSignal}
				onPostseasonBoostChange={onPostseasonBoostChange}
				onFavoriteTeamBonusChange={onFavoriteTeamBonusChange}
				fantasyInUse={fantasyInUse}
				openScoringPage={openScoringPage}
			/>
		),
		favorites: () => (
			<SettingsFavoritesPage
				prefs={prefs}
				favoriteTeamIds={favoriteTeamIds}
				rivalTeamIds={rivalTeamIds}
				onToggleFavoriteTeam={onToggleFavoriteTeam}
				onToggleRivalTeam={onToggleRivalTeam}
			/>
		),
		leagues: () => (
			<SettingsLeaguesPage
				prefs={prefs}
				prefsLoaded={prefsLoaded}
				leagueLogos={leagueLogos}
				leagueSchedules={leagueSchedules}
				onToggleSport={onToggleSport}
				onToggleLeague={onToggleLeague}
				noLeaguesSelected={noLeaguesSelected}
				now={now}
				openCollegeLeague={openCollegeLeague}
			/>
		),
		display: () => (
			<SettingsDisplayPage
				prefs={prefs}
				prefsLoaded={prefsLoaded}
				leagueLogos={leagueLogos}
				onToggleShowUpcoming={onToggleShowUpcoming}
				onUpcomingGamesDaysChange={onUpcomingGamesDaysChange}
				onToggleKeepFinalGames={onToggleKeepFinalGames}
				onToggleBetting={onToggleBetting}
				onToggleProTips={onToggleProTips}
				onToggleGroupByLeague={onToggleGroupByLeague}
				onReorderLeague={onReorderLeague}
				onResetLeagueOrder={onResetLeagueOrder}
				onThemeChange={onThemeChange}
				onToggleTemperatureUnit={onToggleTemperatureUnit}
				onUnlockRomer={onUnlockRomer}
				onToggleOpenReveal={onToggleOpenReveal}
				onToggleHolidayDecorations={onToggleHolidayDecorations}
				onToggleHolidaySnow={onToggleHolidaySnow}
				onToggleHolidayLights={onToggleHolidayLights}
				onToggleHolidayLeaves={onToggleHolidayLeaves}
				onToggleHolidayChristmas={onToggleHolidayChristmas}
				onToggleHolidayBunting={onToggleHolidayBunting}
				onToggleHolidayFireworks={onToggleHolidayFireworks}
			/>
		),
		standby: () => (
			<SettingsStandbyPage
				prefs={prefs}
				prefsLoaded={prefsLoaded}
				standbyStreamTabId={standbyStreamTabId}
				standbyTabElsewhere={standbyTabElsewhere}
				openTabs={openTabs}
				registry={registry}
				formatTabLabel={formatTabLabel}
				onStandbyThresholdChange={onStandbyThresholdChange}
				onSetStandbyTab={onSetStandbyTab}
				handleToggleStandbyStream={handleToggleStandbyStream}
			/>
		),
		multiview: () => (
			<SettingsMultiviewPage
				prefs={prefs}
				prefsLoaded={prefsLoaded}
				multiviewOn={multiviewOn}
				onMultiviewThresholdChange={onMultiviewThresholdChange}
				onMultiviewGamesChange={onMultiviewGamesChange}
				onMultiviewMaxBoxesChange={onMultiviewMaxBoxesChange}
				handleToggleMultiview={handleToggleMultiview}
			/>
		),
		backup: () => (
			<BackupSyncPage prefs={prefs} fantasyRoster={fantasyRoster} profiles={profiles} profilesBusy={profilesBusy} profileActions={profileActions} />
		),
	};

	if (page === 'scoring' && scoringPage) {
		const isRoster = scoringPage === 'roster';
		return (
			<div key={`scoring-${scoringPage}`} ref={pageRef} className={`popup-container settings-view${isRoster ? ' d-flex flex-column' : ''}${slide}`}>
				<button type='button' className='setup-header' onClick={() => setScoringPage(null)}>
					<i className='bi bi-arrow-left' />
					{isRoster ? i18n.t('setup.fantasyRoster') : i18n.t('setup.fantasyRules')}
				</button>
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
			<div key={`college-${collegeLeague}`} className={`popup-container settings-view${slide}`}>
				<button type='button' className='setup-header' onClick={() => setCollegeLeague(null)}>
					<i className='bi bi-arrow-left' />
					{league.label}
				</button>
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
		const scrollsWithin = page === 'favorites';
		return (
			<div key={page} ref={pageRef} className={`popup-container settings-view${scrollsWithin ? ' d-flex flex-column' : ''}${slide}`}>
				<button type='button' className='setup-header' onClick={() => setPage(null)}>
					<i className='bi bi-arrow-left' />
					{group ? translate(group.labelKey) : i18n.t('setup.header')}
				</button>
				{pages[page]()}
			</div>
		);
	}

	return (
		<div key='index' className={`popup-container settings-view${slide}`}>
			<button type='button' className='setup-header' onClick={onClose}>
				<i className='bi bi-arrow-left' />
				{i18n.t('setup.header')}
			</button>

			<label className='form-control form-control-sm form-adorn settings-search'>
				<span className='form-adorn-icon' aria-hidden='true'><i className='bi bi-search' /></span>
				<input
					type='search'
					id='settingsSearch'
					className='form-ghost settings-search-input'
					value={query}
					onChange={e => setQuery(e.target.value)}
					placeholder={i18n.t('setup.searchPlaceholder')}
					aria-label={i18n.t('setup.searchPlaceholder')}
					autoComplete='off'
				/>
			</label>

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
					{settingsGroups.filter(group => !hiddenGroups.has(group.id)).map(group => (
						<button
							key={group.id}
							type='button'
							id={`settingsGroup-${group.id}`}
							className='settings-index-row'
							onClick={() => openGroup(group.id)}
						>
							<i className={`bi bi-${group.icon} settings-index-icon`} aria-hidden='true' />
							<span className='settings-index-text'>
								<span className='settings-index-name'>{translate(group.labelKey)}</span>
								<span className='settings-index-desc'>{translate(group.descriptionKey)}</span>
							</span>
							{group.id === 'leagues' && noLeaguesSelected && (
								<>
									<i className='bi bi-exclamation-circle settings-index-warn' title={i18n.t('setup.noLeaguesWarning')} aria-hidden='true' />
									<span className='visually-hidden'>{i18n.t('setup.noLeaguesWarning')}</span>
								</>
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
