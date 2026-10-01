import { useMemo, useState, type ReactNode } from 'react';
import { i18n } from '#i18n';
import type { FinishedTabAction, LeagueId, LeagueLogoMap, SignalName, SportType, ThemePreference, UserPreferences } from '@arenaswap/core/types';
import type { Browser } from 'wxt/browser';
import CooldownSlider from './cooldownSlider';
import FavoriteTeamsPage from './favoriteTeamsPage';
import LeagueLogo from './leagueLogo';
import LeagueOrderList from './leagueOrderList';
import PostseasonBoostInput from './postseasonBoostInput';
import SensitivitySlider, { sensitivityLabels } from './sensitivitySlider';
import SettingsGroup, { SettingField, SettingRange, SettingToggle } from './settingControls';
import Subhead from './subhead';
import SettingTooltipIcon from './settingTooltipIcon';
import SwitchDelaySlider from './switchDelaySlider';
import TemperatureUnitToggle from './temperatureUnitToggle';
import SelectDropdown from './selectDropdown';
import StandbyStreamGuide from './standbyStreamGuide';
import { searchSettings, settingsGroups, type settingsGroup, type settingsGroupId } from './settingsCatalog';
import type { demoSeason } from '../../../utils/holidayDecorations';
import { leaguesBySportType, sportTypeLabels, sportTypeOrder } from '../popupHelpers';

interface setupViewProps {
	prefs: UserPreferences;
	prefsLoaded: boolean;
	demoMode: boolean;
	demoSeason: demoSeason;
	leagueLogos: LeagueLogoMap;
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
	onToggleShowUpcoming: () => void;
	onToggleKeepFinalGames: () => void;
	onFinishedTabActionChange: (action: FinishedTabAction) => void;
	onThemeChange: (theme: ThemePreference) => void;
	onUpcomingGamesDaysChange: (val: number) => void;
	onToggleProTips: () => void;
	onToggleNotifications: () => void;
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
}

const setupSignalMeta = [
	{ name: 'closeness' as SignalName, labelKey: 'powerScore.signalCloseness' as const, color: '#22c55e' },
	{ name: 'lateGame' as SignalName, labelKey: 'powerScore.signalLateGame' as const, color: '#f75c03' },
	{ name: 'momentum' as SignalName, labelKey: 'powerScore.signalMomentum' as const, color: '#2274a5' },
	{ name: 'leadChanges' as SignalName, labelKey: 'powerScore.signalLeadChanges' as const, color: '#f1c40f' },
	{ name: 'comeback' as SignalName, labelKey: 'powerScore.signalComeback' as const, color: '#d90368' },
] as const;

const themeValueKeys = {
	light: 'setup.themeLight',
	dark: 'setup.themeDark',
	system: 'setup.themeSystemShort',
} as const;

const sportTypes = (Object.keys(sportTypeOrder) as SportType[]).toSorted((a, b) => sportTypeOrder[a] - sportTypeOrder[b]);

interface directoryEntryProps {
	group: settingsGroup;
	label: string;
	description: string;
	value?: ReactNode;
	id?: string;
	ariaLabel?: string;
	onOpen: () => void;
}

const DirectoryEntry = ({ group, label, description, value, id, ariaLabel, onOpen }: directoryEntryProps) => (
	<button type='button' id={id} className='st-entry' onClick={onOpen} aria-label={ariaLabel}>
		<i className={`bi bi-${group.icon} st-entry-icon`} aria-hidden='true' />
		<span className='st-entry-copy'>
			<span className='st-entry-name'>{label}</span>
			<span className='st-entry-desc'>{description}</span>
		</span>
		{value !== undefined && <span className='st-entry-value'>{value}</span>}
		<i className='bi bi-chevron-right st-entry-chevron' aria-hidden='true' />
	</button>
);

const setupView = ({
	prefs, prefsLoaded, demoMode, demoSeason, leagueLogos, favoriteTeamIds, standbyStreamTabId, standbyOnboardingDone,
	openTabs, formatTabLabel, onClose, onSensitivityChange, onCooldownChange, onSwitchDelayChange,
	onFavoriteTeamBonusChange, onToggleFavoriteTeam, onToggleLeague, onToggleSport, onReorderLeague, onResetLeagueOrder,
	onToggleShowUpcoming, onToggleKeepFinalGames, onFinishedTabActionChange, onThemeChange, onUpcomingGamesDaysChange,
	onToggleProTips, onToggleNotifications, onToggleDemo, onDemoSeasonChange, onToggleStandbyStream, onStandbyThresholdChange,
	onSetStandbyTab, onStandbyOnboardingDone, onToggleBetting, onToggleTemperatureUnit, onUnlockRomer, onToggleOpenReveal,
	onPostseasonBoostChange,
	onToggleHolidayDecorations, onToggleHolidaySnow, onToggleHolidayLights, onToggleHolidayLeaves,
	onToggleSignal,
}: setupViewProps) => {
	const [page, setPage] = useState<settingsGroupId | null>(null);
	const [query, setQuery] = useState('');
	const [showStandbyGuide, setShowStandbyGuide] = useState(false);

	const results = useMemo(() => searchSettings(query), [query]);
	const noLeaguesSelected = prefsLoaded && prefs.enabledLeagues.length === 0;

	const openGroup = (id: settingsGroupId) => {
		setPage(id);
		setQuery('');
	};

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

	const enabledSignalCount = setupSignalMeta.filter(sig => !prefs.disabledSignals.includes(sig.name)).length;

	const directoryValue = (id: settingsGroupId): ReactNode => {
		if (id === 'demo') return i18n.t(demoMode ? 'setup.stateOn' : 'setup.stateOff');
		if (!prefsLoaded) return undefined;
		switch (id) {
			case 'switching': return sensitivityLabels[prefs.sensitivity];
			case 'scoring': return i18n.t('setup.signalsCount', enabledSignalCount);
			case 'favorites': return i18n.t('setup.teamsCount', favoriteTeamIds.size);
			case 'leagues': return noLeaguesSelected ? (
				<span className='st-entry-warn'>
					<i className='bi bi-exclamation-circle' title={i18n.t('setup.noLeaguesWarning')} aria-hidden='true' />
					{i18n.t('setup.leaguesCount', 0)}
				</span>
			) : i18n.t('setup.leaguesCount', prefs.enabledLeagues.length);
			case 'display': return i18n.t(themeValueKeys[prefs.theme]);
			case 'standby': return i18n.t(prefs.standbyStreamEnabled ? 'setup.stateOn' : 'setup.stateOff');
		}
	};

	const switchingPage = (
		<>
			<SettingsGroup>
				<SensitivitySlider value={prefs.sensitivity} onChange={onSensitivityChange} />
			</SettingsGroup>
			<SettingsGroup title={i18n.t('setup.groupTiming')}>
				<CooldownSlider value={prefs.cooldownSeconds} onChange={onCooldownChange} />
				<SwitchDelaySlider value={prefs.switchDelaySeconds} onChange={onSwitchDelayChange} />
			</SettingsGroup>
		</>
	);

	const scoringPage = (
		<>
			<SettingsGroup title={i18n.t('setup.signalsSection')} tooltip={i18n.t('setup.signalsExplainer')}>
				{setupSignalMeta.map(sig => {
					const isDisabled = prefs.disabledSignals.includes(sig.name);
					const isLastEnabled = !isDisabled && enabledSignalCount === 1;
					return (
						<SettingToggle
							key={sig.name}
							id={`signal-${sig.name}`}
							leading={<span className='st-signal-dot' style={{ backgroundColor: isDisabled ? 'var(--as-faint)' : sig.color }} aria-hidden='true' />}
							label={i18n.t(sig.labelKey)}
							checked={!isDisabled}
							onChange={() => onToggleSignal(sig.name)}
							disabled={!prefsLoaded || isLastEnabled}
							title={isLastEnabled ? i18n.t('setup.signalLastActive') : undefined}
						/>
					);
				})}
			</SettingsGroup>
			<SettingsGroup title={i18n.t('setup.bonusesSection')}>
				<PostseasonBoostInput value={prefs.postseasonBoostPoints} onChange={onPostseasonBoostChange} />
			</SettingsGroup>
		</>
	);

	const favoritesPage = (
		<FavoriteTeamsPage
			enabledLeagues={prefs.enabledLeagues}
			favoriteTeamIds={favoriteTeamIds}
			favoriteTeamBonusPoints={prefs.favoriteTeamBonusPoints}
			onFavoriteTeamBonusChange={onFavoriteTeamBonusChange}
			onToggleFavoriteTeam={onToggleFavoriteTeam}
		/>
	);

	const displayPage = (
		<>
			<SettingsGroup>
				<SettingField htmlFor='themeSelect' label={i18n.t('setup.theme')}>
					<SelectDropdown<ThemePreference>
						id='themeSelect'
						value={prefs.theme}
						onChange={onThemeChange}
						disabled={!prefsLoaded}
						options={[
							{ value: 'light', label: i18n.t('setup.themeLight'), icon: 'bi-sun' },
							{ value: 'dark', label: i18n.t('setup.themeDark'), icon: 'bi-moon-stars' },
							{ value: 'system', label: i18n.t('setup.themeSystem'), icon: 'bi-circle-half' },
						]}
					/>
				</SettingField>
				<SettingToggle id='upcomingToggle' label={i18n.t('setup.showUpcoming')} checked={prefs.showUpcomingGames} onChange={onToggleShowUpcoming} disabled={!prefsLoaded} />
				{prefs.showUpcomingGames && (
					<SettingRange
						nested
						id='upcomingDaysSlider'
						label={i18n.t('setup.upcomingDaysLabel')}
						valueLabel={<span className='st-value'>{i18n.t('setup.upcomingDaysValue', prefs.upcomingGamesDays)}</span>}
						value={prefs.upcomingGamesDays}
						min={1}
						max={14}
						onChange={onUpcomingGamesDaysChange}
						disabled={!prefsLoaded}
						ends={[i18n.t('setup.upcomingDaysValue', 1), i18n.t('setup.upcomingDaysValue', 14)]}
					/>
				)}
				<SettingToggle
					id='keepFinalToggle'
					label={i18n.t('setup.keepFinalGames')}
					note={i18n.t('setup.keepFinalGamesExplainer')}
					checked={prefs.keepFinalGames}
					onChange={onToggleKeepFinalGames}
					disabled={!prefsLoaded}
				/>
				<SettingField
					htmlFor='finishedTabSelect'
					label={i18n.t('setup.finishedTabAction')}
					notes={prefs.finishedTabAction !== 'keep' && (
						<p className='st-note'>
							{i18n.t('setup.finishedTabActiveExplainer')}
							{prefs.finishedTabAction === 'close' && <> {i18n.t('setup.finishedTabCloseExplainer')}</>}
						</p>
					)}
				>
					<SelectDropdown<FinishedTabAction>
						id='finishedTabSelect'
						value={prefs.finishedTabAction}
						onChange={onFinishedTabActionChange}
						disabled={!prefsLoaded}
						options={[
							{ value: 'keep', label: i18n.t('setup.finishedTabKeep') },
							{ value: 'free', label: i18n.t('setup.finishedTabFree') },
							{ value: 'close', label: i18n.t('setup.finishedTabClose') },
						]}
					/>
				</SettingField>
			</SettingsGroup>

			<SettingsGroup title={i18n.t('setup.groupExtras')}>
				<SettingToggle id='proTipsToggle' label={i18n.t('setup.proTips')} checked={prefs.proTipsEnabled} onChange={onToggleProTips} disabled={!prefsLoaded} />
				<SettingToggle id='notificationsToggle' label={i18n.t('setup.switchNotifications')} checked={prefs.notificationsEnabled} onChange={onToggleNotifications} disabled={!prefsLoaded} />
				<SettingToggle id='bettingToggle' label={i18n.t('setup.showBetting')} checked={prefs.bettingEnabled} onChange={onToggleBetting} disabled={!prefsLoaded} />
				<TemperatureUnitToggle
					unit={prefs.temperatureUnit}
					romerUnlocked={prefs.romerUnlocked}
					disabled={!prefsLoaded}
					onCycle={onToggleTemperatureUnit}
					onUnlockRomer={onUnlockRomer}
				/>
				<SettingToggle
					id='openRevealToggle'
					label={i18n.t('setup.openReveal')}
					tooltip={i18n.t('setup.openRevealExplainer')}
					checked={prefs.openRevealEnabled}
					onChange={onToggleOpenReveal}
					disabled={!prefsLoaded}
				/>
				<SettingToggle
					id='holidayDecorationsToggle'
					label={i18n.t('setup.holidayDecorations')}
					tooltip={i18n.t('setup.holidayDecorationsExplainer')}
					checked={prefs.holidayDecorationsEnabled}
					onChange={onToggleHolidayDecorations}
					disabled={!prefsLoaded}
				/>
				{prefs.holidayDecorationsEnabled && (
					<>
						<SettingToggle nested id='holidaySnowToggle' label={i18n.t('setup.holidaySnow')} checked={prefs.holidaySnowEnabled} onChange={onToggleHolidaySnow} disabled={!prefsLoaded} />
						<SettingToggle nested id='holidayLightsToggle' label={i18n.t('setup.holidayLights')} checked={prefs.holidayLightsEnabled} onChange={onToggleHolidayLights} disabled={!prefsLoaded} />
						<SettingToggle nested id='holidayLeavesToggle' label={i18n.t('setup.holidayLeaves')} checked={prefs.holidayLeavesEnabled} onChange={onToggleHolidayLeaves} disabled={!prefsLoaded} />
					</>
				)}
			</SettingsGroup>
		</>
	);

	const standbyOff = !prefs.standbyStreamEnabled;
	const standbyPage = (
		<SettingsGroup off={standbyOff}>
			<SettingToggle
				id='standbyStreamToggle'
				label={i18n.t('setup.enableStandby')}
				checked={prefs.standbyStreamEnabled}
				onChange={handleToggleStandbyStream}
				disabled={!prefsLoaded}
			/>
			<SettingRange
				id='standbyThresholdSlider'
				label={i18n.t('setup.standbyBelow')}
				valueLabel={<span className='st-value num'>{prefs.standbyStreamThreshold}</span>}
				value={prefs.standbyStreamThreshold}
				min={0}
				max={100}
				onChange={onStandbyThresholdChange}
				disabled={!prefsLoaded || standbyOff}
				ends={[i18n.t('setup.morePatient'), i18n.t('setup.switchesSooner')]}
			/>
			<SettingField htmlFor='standbyTabSelect' label={i18n.t('setup.standbyTab')}>
				<SelectDropdown
					id='standbyTabSelect'
					value={standbyStreamTabId === null ? '' : String(standbyStreamTabId)}
					onChange={value => onSetStandbyTab(value ? Number(value) : null)}
					disabled={!prefsLoaded || standbyOff}
					ariaLabel={i18n.t('setup.standbyTab')}
					options={[
						{ value: '', label: i18n.t('setup.selectTab') },
						...openTabs.filter(openTab => openTab.id !== undefined).map(openTab => ({ value: String(openTab.id), label: formatTabLabel(openTab) })),
					]}
				/>
			</SettingField>
		</SettingsGroup>
	);

	const demoPage = (
		<SettingsGroup off={!demoMode}>
			<SettingToggle id='demoToggle' label={i18n.t('setup.demoMode')} checked={demoMode} onChange={onToggleDemo} />
			<SettingField
				htmlFor='demoSeasonSelect'
				label={i18n.t('setup.demoSeason')}
				notes={<p className='st-note'>{i18n.t('setup.demoSeasonExplainer')}</p>}
			>
				<SelectDropdown<demoSeason>
					id='demoSeasonSelect'
					value={demoSeason}
					onChange={onDemoSeasonChange}
					disabled={!demoMode}
					options={[
						{ value: 'real', label: i18n.t('setup.demoSeasonReal') },
						{ value: 'thanksgiving', label: i18n.t('setup.demoSeasonThanksgiving') },
						{ value: 'december', label: i18n.t('setup.demoSeasonDecember') },
					]}
				/>
			</SettingField>
		</SettingsGroup>
	);

	const leaguesPage = (
		<>
			{noLeaguesSelected && (
				<div className='as-notice is-quiet st-no-leagues' role='status'>
					<i className='bi bi-exclamation-circle as-notice-icon' aria-hidden='true' />
					<span className='as-notice-copy'>{i18n.t('setup.noLeaguesWarning')}</span>
				</div>
			)}
			{prefs.enabledLeagues.length > 1 && (
				<SettingsGroup plain title={i18n.t('setup.leagueOrderSection')} tooltip={i18n.t('setup.leagueOrderExplainer')}>
					<LeagueOrderList
						order={prefs.enabledLeagues}
						leagueLogos={leagueLogos}
						disabled={!prefsLoaded}
						onReorder={onReorderLeague}
						onReset={onResetLeagueOrder}
					/>
				</SettingsGroup>
			)}
			{sportTypes.map(sportType => {
				const leagues = leaguesBySportType[sportType];
				const allSelected = leagues.every(league => prefs.enabledLeagues.includes(league.id));
				return (
					<SettingsGroup
						key={sportType}
						title={sportTypeLabels[sportType]}
						action={(
							<button type='button' className='st-group-action' onClick={() => onToggleSport(sportType, !allSelected)} disabled={!prefsLoaded}>
								{allSelected ? i18n.t('setup.selectNone') : i18n.t('setup.selectAll')}
							</button>
						)}
					>
						{leagues.map(league => (
							<SettingToggle
								key={league.id}
								id={`league-${league.id}`}
								leading={<LeagueLogo league={league} logos={leagueLogos} />}
								label={league.label}
								checked={prefs.enabledLeagues.includes(league.id)}
								onChange={() => onToggleLeague(league.id)}
								disabled={!prefsLoaded}
							/>
						))}
					</SettingsGroup>
				);
			})}
		</>
	);

	const pages: Record<settingsGroupId, ReactNode> = {
		switching: switchingPage,
		scoring: scoringPage,
		favorites: favoritesPage,
		leagues: leaguesPage,
		display: displayPage,
		standby: standbyPage,
		demo: demoPage,
	};

	if (page) {
		const group = settingsGroups.find(candidate => candidate.id === page);
		const title = group ? i18n.t(group.labelKey) : i18n.t('setup.header');
		const trailing = page === 'leagues' ? <SettingTooltipIcon text={i18n.t('setup.leaguesExplainer')} /> : undefined;

		// The team picker keeps its search box in view, so it takes the column and scrolls inside it.
		if (page === 'favorites') {
			return (
				<div className='popup-container st st-page d-flex flex-column pb-0'>
					<Subhead title={title} onBack={() => setPage(null)} />
					{pages[page]}
				</div>
			);
		}

		return (
			<div className={`popup-container st st-page st-page-${page}`}>
				<Subhead title={title} onBack={() => setPage(null)} trailing={trailing} />
				<div className='st-body'>{pages[page]}</div>
			</div>
		);
	}

	const searching = query.trim() !== '';

	return (
		<div className='popup-container st'>
			<Subhead title={i18n.t('setup.header')} onBack={onClose} />
			<div className='st-body'>
				<div className='st-search'>
					<i className='bi bi-search st-search-icon' aria-hidden='true' />
					<input
						type='search'
						id='settingsSearch'
						className='form-control'
						value={query}
						onChange={e => setQuery(e.target.value)}
						placeholder={i18n.t('setup.searchPlaceholder')}
						aria-label={i18n.t('setup.searchPlaceholder')}
						autoComplete='off'
					/>
				</div>

				{searching && results.length === 0 ? (
					<p className='st-empty' role='status'>{i18n.t('setup.searchNoResults', { query: query.trim() })}</p>
				) : (
					<div className='st-card st-directory'>
						{searching
							? results.map(result => (
								<DirectoryEntry
									key={`${result.group.id}-${String(result.labelKey)}`}
									group={result.group}
									label={result.label}
									description={result.sublabel}
									ariaLabel={`${result.label}, ${result.sublabel}`}
									onOpen={() => openGroup(result.group.id)}
								/>
							))
							: settingsGroups.map(group => (
								<DirectoryEntry
									key={group.id}
									id={`settingsGroup-${group.id}`}
									group={group}
									label={i18n.t(group.labelKey)}
									description={i18n.t(group.descriptionKey)}
									value={directoryValue(group.id)}
									onOpen={() => openGroup(group.id)}
								/>
							))}
					</div>
				)}
			</div>
		</div>
	);
};

export default setupView;
