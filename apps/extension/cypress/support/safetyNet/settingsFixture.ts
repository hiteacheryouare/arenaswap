import { createDefaultUserPreferences, leagueConfigMap } from '@arenaswap/core/constants';
import type { LeagueId, UserPreferences } from '@arenaswap/core/types';
import type { Browser } from 'wxt/browser';
import { worstUserText } from './worstCase';

const noop = () => {};

export const everyLeague = Object.keys(leagueConfigMap) as LeagueId[];

// Every control in its busiest state: all leagues on, Fantasy scoring, the longest explainers
// showing, and a bare URL where the Boss Button's decoy goes.
export const busyPrefs: UserPreferences = {
	...createDefaultUserPreferences(),
	enabledLeagues: everyLeague,
	finishedTabAction: 'close',
	contentAwareSwitching: true,
	notificationsEnabled: true,
	bossDecoyUrl: worstUserText.tabTitleUrl,
	scoringMode: 'fantasy',
	standbyStreamEnabled: true,
	multiviewEnabled: true,
	favoriteTeamIds: ['nba:20', 'nfl:21', 'nhl:15', 'mlb:22', 'eng.1:359'],
};

export const makeTab = (id: number, title: string): Browser.tabs.Tab => ({
	id, title, url: worstUserText.tabTitleUrl, index: id, active: false, pinned: false, highlighted: false, incognito: false, windowId: 1, discarded: false, autoDiscardable: true, groupId: -1,
} as Browser.tabs.Tab);

export const longTabs = [
	makeTab(1, worstUserText.tabTitle),
	makeTab(2, worstUserText.tabTitleUrl),
	makeTab(3, worstUserText.unbroken(80)),
];

export const settingsProps = {
	prefs: busyPrefs,
	prefsLoaded: true,
	demoMode: false,
	demoSeason: 'real' as const,
	leagueLogos: {},
	leagueSchedules: {},
	favoriteTeamIds: new Set<string>(busyPrefs.favoriteTeamIds),
	standbyStreamTabId: 1,
	standbyOnboardingDone: true,
	openTabs: longTabs,
	registry: [],
	formatTabLabel: (tab: Browser.tabs.Tab) => tab.title ?? '',
	bossShortcut: 'Ctrl+Shift+Comma',
	onClose: noop,
	onSensitivityChange: noop,
	onCooldownChange: noop,
	onSwitchDelayChange: noop,
	onToggleContentAwareSwitching: noop,
	onFavoriteTeamBonusChange: noop,
	onToggleFavoriteTeam: noop,
	onToggleLeague: noop,
	onToggleSport: noop,
	onReorderLeague: noop,
	onResetLeagueOrder: noop,
	onCollegeFilterChange: noop,
	onToggleShowUpcoming: noop,
	onToggleKeepFinalGames: noop,
	onToggleGroupByLeague: noop,
	onFinishedTabActionChange: noop,
	onThemeChange: noop,
	onUpcomingGamesDaysChange: noop,
	onToggleProTips: noop,
	onToggleNotifications: noop,
	onBossDecoyChange: noop,
	onToggleDemo: noop,
	onDemoSeasonChange: noop,
	onToggleStandbyStream: noop,
	onStandbyThresholdChange: noop,
	onSetStandbyTab: noop,
	onStandbyOnboardingDone: noop,
	multiviewOnboardingDone: true,
	onMultiviewOnboardingDone: noop,
	multiviewAvailable: true,
	multiviewOn: true,
	onToggleMultiview: noop,
	onMultiviewThresholdChange: noop,
	onMultiviewGamesChange: noop,
	onMultiviewMaxBoxesChange: noop,
	onToggleBetting: noop,
	onToggleTemperatureUnit: noop,
	onUnlockRomer: noop,
	onToggleOpenReveal: noop,
	onToggleHolidayDecorations: noop,
	onToggleHolidaySnow: noop,
	onToggleHolidayLights: noop,
	onToggleHolidayLeaves: noop,
	onToggleHolidayChristmas: noop,
	onToggleHolidayBunting: noop,
	onToggleHolidayFireworks: noop,
	onPostseasonBoostChange: noop,
	onToggleSignal: noop,
	onToggleModeSignal: noop,
	onScoringModeChange: noop,
	onLeagueModeChange: noop,
	onFantasyBlendChange: noop,
	onFantasyRuleChange: noop,
	onFantasyRulesReset: noop,
	fantasyRoster: [],
	onFantasyRosterChange: noop,
	profiles: { profiles: [{ id: 'main', name: worstUserText.profileName }], activeId: 'main' },
	profilesBusy: false,
	profileActions: { onSwitch: noop, onCreate: noop, onRename: noop, onDelete: noop },
};

// What macOS shows with a mouse attached. Headless Chrome paints overlay bars that take no room,
// so the popup's 15px is forced.
export const withClassicScrollbar = () => {
	cy.document().then(doc => {
		const style = doc.createElement('style');
		style.textContent = '.popup-container { overflow-y: scroll !important; } .popup-container::-webkit-scrollbar { width: 15px; }';
		doc.head.appendChild(style);
	});
};
