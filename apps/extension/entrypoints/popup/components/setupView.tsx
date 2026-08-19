import { useMemo, useState, type ReactNode } from 'react';
import { i18n } from '#i18n';
import type { LeagueId, LeagueLogoMap, SignalName, SportType, UserPreferences } from '@arenaswap/core/types';
import type { Browser } from 'wxt/browser';
import CooldownSlider from './cooldownSlider';
import FavoriteTeamBonusInput from './favoriteTeamBonusInput';
import LeagueLogo from './leagueLogo';
import LeagueOrderList from './leagueOrderList';
import PostseasonBoostInput from './postseasonBoostInput';
import SensitivitySlider from './sensitivitySlider';
import SettingTooltipIcon from './settingTooltipIcon';
import SwitchDelaySlider from './switchDelaySlider';
import StandbyStreamGuide from './standbyStreamGuide';
import { searchSettings, settingsGroups, type settingsGroupId } from './settingsCatalog';
import { leaguesBySportType, sportTypeLabels, sportTypeOrder } from '../popupHelpers';

interface setupViewProps {
	prefs: UserPreferences;
	prefsLoaded: boolean;
	demoMode: boolean;
	leagueLogos: LeagueLogoMap;
	standbyStreamTabId: number | null;
	standbyOnboardingDone: boolean;
	openTabs: Browser.tabs.Tab[];
	formatTabLabel: (tab: Browser.tabs.Tab) => string;
	onClose: () => void;
	onSensitivityChange: (val: number) => void;
	onCooldownChange: (val: number) => void;
	onSwitchDelayChange: (val: number) => void;
	onFavoriteTeamBonusChange: (val: number) => void;
	onToggleLeague: (leagueId: LeagueId) => void;
	onToggleSport: (sport: SportType, selectAll: boolean) => void;
	onReorderLeague: (fromIndex: number, toIndex: number) => void;
	onResetLeagueOrder: () => void;
	onToggleShowUpcoming: () => void;
	onUpcomingGamesDaysChange: (val: number) => void;
	onToggleProTips: () => void;
	onToggleNotifications: () => void;
	onToggleDemo: () => void;
	onToggleStandbyStream: () => void;
	onStandbyThresholdChange: (val: number) => void;
	onSetStandbyTab: (tabId: number | null) => void;
	onStandbyOnboardingDone: () => void;
	onToggleBetting: () => void;
	onToggleTemperatureUnit: () => void;
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

const setupView = ({
	prefs, prefsLoaded, demoMode, leagueLogos, standbyStreamTabId, standbyOnboardingDone,
	openTabs, formatTabLabel, onClose, onSensitivityChange, onCooldownChange, onSwitchDelayChange,
	onFavoriteTeamBonusChange, onToggleLeague, onToggleSport, onReorderLeague, onResetLeagueOrder,
	onToggleShowUpcoming, onUpcomingGamesDaysChange,
	onToggleProTips, onToggleNotifications, onToggleDemo, onToggleStandbyStream, onStandbyThresholdChange,
	onSetStandbyTab, onStandbyOnboardingDone, onToggleBetting, onToggleTemperatureUnit, onPostseasonBoostChange,
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

	const switchingPage = (
		<div className='settings-stack'>
			<SensitivitySlider value={prefs.sensitivity} onChange={onSensitivityChange} />
			<CooldownSlider value={prefs.cooldownSeconds} onChange={onCooldownChange} />
			<SwitchDelaySlider value={prefs.switchDelaySeconds} onChange={onSwitchDelayChange} />
		</div>
	);

	const scoringPage = (
		<>
			<div className='fw-bold popup-section-label'>
				<i className='bi bi-sliders' />
				{i18n.t('setup.signalsSection')}
				<SettingTooltipIcon text={i18n.t('setup.signalsExplainer')} />
			</div>
			{setupSignalMeta.map(sig => {
				const isDisabled = prefs.disabledSignals.includes(sig.name);
				const isLastEnabled = !isDisabled && prefs.disabledSignals.length === setupSignalMeta.length - 1;
				return (
					<div key={sig.name} className='d-flex justify-content-between align-items-center mt-2'>
						<label className='text-body-secondary setting-toggle-label' htmlFor={`signal-${sig.name}`}>
							<span
								className='d-inline-block rounded-circle me-1'
								style={{ width: '8px', height: '8px', backgroundColor: isDisabled ? '#6c757d' : sig.color, verticalAlign: 'middle' }}
							/>
							{i18n.t(sig.labelKey)}
						</label>
						<div className='form-check form-switch mb-0'>
							<input
								className='form-check-input'
								type='checkbox'
								id={`signal-${sig.name}`}
								checked={!isDisabled}
								onChange={() => onToggleSignal(sig.name)}
								disabled={!prefsLoaded || isLastEnabled}
								title={isLastEnabled ? i18n.t('setup.signalLastActive') : undefined}
							/>
						</div>
					</div>
				);
			})}

			<div className='fw-bold popup-section-label mt-3'><i className='bi bi-plus-slash-minus' />{i18n.t('setup.bonusesSection')}</div>
			<div className='settings-stack'>
				<FavoriteTeamBonusInput value={prefs.favoriteTeamBonusPoints} onChange={onFavoriteTeamBonusChange} />
				<PostseasonBoostInput value={prefs.postseasonBoostPoints} onChange={onPostseasonBoostChange} />
			</div>
		</>
	);

	const displayPage = (
		<>
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
						<span className='fw-semibold text-body small'>{i18n.t('setup.upcomingDaysValue', prefs.upcomingGamesDays)}</span>
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
				<label className='text-body-secondary setting-toggle-label' htmlFor='proTipsToggle'>{i18n.t('setup.proTips')}</label>
				<div className='form-check form-switch mb-0'>
					<input className='form-check-input' type='checkbox' id='proTipsToggle' checked={prefs.proTipsEnabled} onChange={onToggleProTips} disabled={!prefsLoaded} />
				</div>
			</div>

			<div className='d-flex justify-content-between align-items-center mt-2'>
				<label className='text-body-secondary setting-toggle-label' htmlFor='notificationsToggle'>{i18n.t('setup.switchNotifications')}</label>
				<div className='form-check form-switch mb-0'>
					<input className='form-check-input' type='checkbox' id='notificationsToggle' checked={prefs.notificationsEnabled} onChange={onToggleNotifications} disabled={!prefsLoaded} />
				</div>
			</div>

			<div className='d-flex justify-content-between align-items-center mt-2'>
				<label className='text-body-secondary setting-toggle-label' htmlFor='bettingToggle'>{i18n.t('setup.showBetting')}</label>
				<div className='form-check form-switch mb-0'>
					<input className='form-check-input' type='checkbox' id='bettingToggle' checked={prefs.bettingEnabled} onChange={onToggleBetting} disabled={!prefsLoaded} />
				</div>
			</div>

			<div className='d-flex justify-content-between align-items-center mt-2'>
				<label className='text-body-secondary setting-toggle-label' htmlFor='temperatureUnitToggle'>{i18n.t('setup.temperatureUnit')}</label>
				<button
					type='button'
					id='temperatureUnitToggle'
					className='btn btn-sm btn-outline-secondary temperature-unit-toggle'
					onClick={onToggleTemperatureUnit}
					disabled={!prefsLoaded}
				>
					{prefs.temperatureUnit === 'F' ? i18n.t('setup.temperatureUnitF') : i18n.t('setup.temperatureUnitC')}
				</button>
			</div>
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
							<span className='fw-semibold text-body small'>{prefs.standbyStreamThreshold}</span>
						</div>
						<input
							type='range'
							className='form-range'
							id='standbyThresholdSlider'
							min={0}
							max={100}
							step={1}
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
						<select
							className='form-select form-select-sm'
							value={standbyStreamTabId ?? ''}
							onChange={e => {
								const val = e.target.value;
								const num = Number(val);
								onSetStandbyTab(val && Number.isFinite(num) ? num : null);
							}}
							disabled={!prefsLoaded}
							aria-label={i18n.t('setup.standbyTab')}
						>
							<option value=''>{i18n.t('setup.selectTab')}</option>
							{openTabs.map(openTab => (
								<option key={openTab.id} value={openTab.id}>
									{formatTabLabel(openTab)}
								</option>
							))}
						</select>
					</div>
				</div>
			)}
		</>
	);

	const demoPage = (
		<div className='d-flex justify-content-between align-items-center'>
			<label className='text-body-secondary setting-toggle-label' htmlFor='demoToggle'>{i18n.t('setup.demoMode')}</label>
			<div className='form-check form-switch mb-0'>
				<input className='form-check-input' type='checkbox' id='demoToggle' checked={demoMode} onChange={onToggleDemo} />
			</div>
		</div>
	);

	const leaguesPage = (
		<>
			{prefs.enabledLeagues.length > 1 && (
				<>
					<div className='fw-bold popup-section-label'>
						<i className='bi bi-arrow-down-up' />
						{i18n.t('setup.leagueOrderSection')}
						<SettingTooltipIcon text={i18n.t('setup.leagueOrderExplainer')} />
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
			<div className='fw-bold popup-section-label'>
				<i className='bi bi-trophy' />
				{i18n.t('setup.groupLeagues')}
				<SettingTooltipIcon text={i18n.t('setup.leaguesExplainer')} />
			</div>
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
								{leagues.map(league => (
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
												/>
											</div>
										</div>
										<label className='fw-semibold text-body mb-0 league-toggle-label' htmlFor={`league-${league.id}`}>{league.label}</label>
									</div>
								))}
							</div>
						</div>
					);
				})}
			{noLeaguesSelected && (
				<div className='setup-no-leagues-warn mt-2 mb-1'>
					<i className='bi bi-exclamation-circle me-1' />
					{i18n.t('setup.noLeaguesWarning')}
				</div>
			)}
		</>
	);

	const pages: Record<settingsGroupId, ReactNode> = {
		switching: switchingPage,
		scoring: scoringPage,
		leagues: leaguesPage,
		display: displayPage,
		standby: standbyPage,
		demo: demoPage,
	};

	if (page) {
		const group = settingsGroups.find(candidate => candidate.id === page);
		return (
			<div className='popup-container'>
				<button className='setup-header' onClick={() => setPage(null)}>
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
			<button className='setup-header' onClick={onClose}>
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
								onClick={() => openGroup(result.group.id)}
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
