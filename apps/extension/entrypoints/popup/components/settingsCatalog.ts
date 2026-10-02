import { i18n, type GeneratedI18nStructure } from '#i18n';
import { foldForSearch } from '../../../utils/searchText';

export type settingsGroupId = 'switching' | 'scoring' | 'favorites' | 'leagues' | 'display' | 'standby' | 'demo';

// i18n.t is overloaded, so Parameters<> on it collapses to never. Narrowing the generated
// structure gives the catalog a real key type. Named substitutions are reported alongside
// `substitutions: 0`, so keys carrying them have to be excluded separately.
type plainMessageKey = {
	[K in keyof GeneratedI18nStructure]: GeneratedI18nStructure[K] extends { substitutions: 0 }
		? GeneratedI18nStructure[K] extends { namedSubstitutions: readonly string[] } ? never : K
		: never;
}[keyof GeneratedI18nStructure];

export interface settingsGroup {
	id: settingsGroupId;
	icon: string;
	labelKey: plainMessageKey;
	descriptionKey: plainMessageKey;
}

export interface settingsEntry {
	group: settingsGroupId;
	labelKey: plainMessageKey;
	keywordsKey: plainMessageKey;
	// The control a search result lands on. Entries without one open their page at the top.
	controlId?: string;
}

export const settingsGroups: readonly settingsGroup[] = [
	{ id: 'switching', icon: 'speedometer2', labelKey: 'setup.groupSwitching', descriptionKey: 'setup.groupSwitchingDesc' },
	{ id: 'scoring', icon: 'sliders', labelKey: 'setup.groupScoring', descriptionKey: 'setup.groupScoringDesc' },
	{ id: 'favorites', icon: 'star', labelKey: 'setup.groupFavorites', descriptionKey: 'setup.groupFavoritesDesc' },
	{ id: 'leagues', icon: 'trophy', labelKey: 'setup.groupLeagues', descriptionKey: 'setup.groupLeaguesDesc' },
	{ id: 'display', icon: 'eye', labelKey: 'setup.groupDisplay', descriptionKey: 'setup.groupDisplayDesc' },
	{ id: 'standby', icon: 'broadcast', labelKey: 'setup.groupStandby', descriptionKey: 'setup.groupStandbyDesc' },
	{ id: 'demo', icon: 'joystick', labelKey: 'setup.groupDemo', descriptionKey: 'setup.groupDemoDesc' },
] as const;

export const settingsEntries: readonly settingsEntry[] = [
	{ group: 'switching', labelKey: 'sensitivity.label', keywordsKey: 'setup.keywordsSensitivity', controlId: 'sensitivity-range' },
	{ group: 'switching', labelKey: 'cooldown.label', keywordsKey: 'setup.keywordsCooldown', controlId: 'cooldown-range' },
	{ group: 'switching', labelKey: 'switchDelay.label', keywordsKey: 'setup.keywordsSwitchDelay', controlId: 'switch-delay-range' },
	{ group: 'scoring', labelKey: 'powerScore.signalCloseness', keywordsKey: 'setup.keywordsCloseness', controlId: 'signal-closeness' },
	{ group: 'scoring', labelKey: 'powerScore.signalLateGame', keywordsKey: 'setup.keywordsLateGame', controlId: 'signal-lateGame' },
	{ group: 'scoring', labelKey: 'powerScore.signalMomentum', keywordsKey: 'setup.keywordsMomentum', controlId: 'signal-momentum' },
	{ group: 'scoring', labelKey: 'powerScore.signalLeadChanges', keywordsKey: 'setup.keywordsLeadChanges', controlId: 'signal-leadChanges' },
	{ group: 'scoring', labelKey: 'powerScore.signalComeback', keywordsKey: 'setup.keywordsComeback', controlId: 'signal-comeback' },
	{ group: 'scoring', labelKey: 'postseasonBoost.label', keywordsKey: 'setup.keywordsPostseasonBoost', controlId: 'postseasonBoostInput' },
	{ group: 'favorites', labelKey: 'setup.followedTeams', keywordsKey: 'setup.keywordsFavoriteTeams' },
	{ group: 'favorites', labelKey: 'favoriteTeamBonus.label', keywordsKey: 'setup.keywordsFavoriteBonus', controlId: 'favoriteTeamBonusInput' },
	{ group: 'leagues', labelKey: 'setup.groupLeagues', keywordsKey: 'setup.keywordsLeagues' },
	{ group: 'leagues', labelKey: 'setup.groupByLeague', keywordsKey: 'setup.keywordsGroupByLeague', controlId: 'groupByLeagueToggle' },
	{ group: 'leagues', labelKey: 'setup.leagueOrderSection', keywordsKey: 'setup.keywordsLeagueOrder', controlId: 'leagueOrderSection' },
	{ group: 'display', labelKey: 'setup.theme', keywordsKey: 'setup.keywordsTheme', controlId: 'themeSelect' },
	{ group: 'display', labelKey: 'setup.showUpcoming', keywordsKey: 'setup.keywordsUpcoming', controlId: 'upcomingToggle' },
	{ group: 'display', labelKey: 'setup.upcomingDaysLabel', keywordsKey: 'setup.keywordsUpcomingDays', controlId: 'upcomingDaysSlider' },
	{ group: 'display', labelKey: 'setup.keepFinalGames', keywordsKey: 'setup.keywordsKeepFinal', controlId: 'keepFinalToggle' },
	{ group: 'display', labelKey: 'setup.finishedTabAction', keywordsKey: 'setup.keywordsFinishedTab', controlId: 'finishedTabSelect' },
	{ group: 'display', labelKey: 'setup.proTips', keywordsKey: 'setup.keywordsProTips', controlId: 'proTipsToggle' },
	{ group: 'display', labelKey: 'setup.switchNotifications', keywordsKey: 'setup.keywordsNotifications', controlId: 'notificationsToggle' },
	{ group: 'display', labelKey: 'setup.showBetting', keywordsKey: 'setup.keywordsBetting', controlId: 'bettingToggle' },
	{ group: 'display', labelKey: 'setup.temperatureUnit', keywordsKey: 'setup.keywordsTemperature', controlId: 'temperatureUnitToggle' },
	{ group: 'display', labelKey: 'setup.openReveal', keywordsKey: 'setup.keywordsOpenReveal', controlId: 'openRevealToggle' },
	{ group: 'display', labelKey: 'setup.holidayDecorations', keywordsKey: 'setup.keywordsHoliday', controlId: 'holidayDecorationsToggle' },
	{ group: 'standby', labelKey: 'setup.enableStandby', keywordsKey: 'setup.keywordsStandby', controlId: 'standbyStreamToggle' },
	{ group: 'standby', labelKey: 'setup.standbyBelow', keywordsKey: 'setup.keywordsStandbyThreshold', controlId: 'standbyThresholdSlider' },
	{ group: 'standby', labelKey: 'setup.standbyTab', keywordsKey: 'setup.keywordsStandbyTab', controlId: 'standbyTabSelect' },
	{ group: 'demo', labelKey: 'setup.demoMode', keywordsKey: 'setup.keywordsDemo', controlId: 'demoToggle' },
] as const;

export const normalize = foldForSearch;

export interface settingsSearchResult {
	group: settingsGroup;
	label: string;
	sublabel: string;
	labelKey: plainMessageKey;
	controlId?: string;
}

// Group text is matched per group, never folded into each entry's haystack: "bonus" appears in
// the Scoring description, and mixing the two returned all five signals for it.
export const searchSettings = (query: string): settingsSearchResult[] => {
	const needle = normalize(query);
	if (!needle) return [];

	const groupById = new Map(settingsGroups.map(group => [group.id, group]));

	const groupHits = settingsGroups
		.filter(group => normalize(`${i18n.t(group.labelKey)} ${i18n.t(group.descriptionKey)}`).includes(needle))
		.map(group => ({ group, label: i18n.t(group.labelKey), sublabel: i18n.t(group.descriptionKey), labelKey: group.labelKey }));

	const entryHits = settingsEntries.flatMap(entry => {
		const group = groupById.get(entry.group);
		if (!group) return [];

		const label = i18n.t(entry.labelKey);
		if (!normalize(`${label} ${i18n.t(entry.keywordsKey)}`).includes(needle)) return [];

		return [{ group, label, sublabel: i18n.t(group.labelKey), labelKey: entry.labelKey, controlId: entry.controlId }];
	});

	const seen = new Set<string>();
	return [...groupHits, ...entryHits].filter(hit => {
		const key = `${hit.group.id}:${String(hit.labelKey)}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
};
