import { i18n, type GeneratedI18nStructure } from '#i18n';

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
	{ group: 'switching', labelKey: 'sensitivity.label', keywordsKey: 'setup.keywordsSensitivity' },
	{ group: 'switching', labelKey: 'cooldown.label', keywordsKey: 'setup.keywordsCooldown' },
	{ group: 'switching', labelKey: 'switchDelay.label', keywordsKey: 'setup.keywordsSwitchDelay' },
	{ group: 'scoring', labelKey: 'powerScore.signalCloseness', keywordsKey: 'setup.keywordsCloseness' },
	{ group: 'scoring', labelKey: 'powerScore.signalLateGame', keywordsKey: 'setup.keywordsLateGame' },
	{ group: 'scoring', labelKey: 'powerScore.signalMomentum', keywordsKey: 'setup.keywordsMomentum' },
	{ group: 'scoring', labelKey: 'powerScore.signalLeadChanges', keywordsKey: 'setup.keywordsLeadChanges' },
	{ group: 'scoring', labelKey: 'powerScore.signalComeback', keywordsKey: 'setup.keywordsComeback' },
	{ group: 'scoring', labelKey: 'postseasonBoost.label', keywordsKey: 'setup.keywordsPostseasonBoost' },
	{ group: 'favorites', labelKey: 'setup.followedTeams', keywordsKey: 'setup.keywordsFavoriteTeams' },
	{ group: 'favorites', labelKey: 'favoriteTeamBonus.label', keywordsKey: 'setup.keywordsFavoriteBonus' },
	{ group: 'leagues', labelKey: 'setup.groupLeagues', keywordsKey: 'setup.keywordsLeagues' },
	{ group: 'leagues', labelKey: 'setup.leagueOrderSection', keywordsKey: 'setup.keywordsLeagueOrder' },
	{ group: 'display', labelKey: 'setup.showUpcoming', keywordsKey: 'setup.keywordsUpcoming' },
	{ group: 'display', labelKey: 'setup.upcomingDaysLabel', keywordsKey: 'setup.keywordsUpcomingDays' },
	{ group: 'display', labelKey: 'setup.proTips', keywordsKey: 'setup.keywordsProTips' },
	{ group: 'display', labelKey: 'setup.switchNotifications', keywordsKey: 'setup.keywordsNotifications' },
	{ group: 'display', labelKey: 'setup.showBetting', keywordsKey: 'setup.keywordsBetting' },
	{ group: 'display', labelKey: 'setup.temperatureUnit', keywordsKey: 'setup.keywordsTemperature' },
	{ group: 'display', labelKey: 'setup.holidayDecorations', keywordsKey: 'setup.keywordsHoliday' },
	{ group: 'standby', labelKey: 'setup.enableStandby', keywordsKey: 'setup.keywordsStandby' },
	{ group: 'standby', labelKey: 'setup.standbyBelow', keywordsKey: 'setup.keywordsStandbyThreshold' },
	{ group: 'standby', labelKey: 'setup.standbyTab', keywordsKey: 'setup.keywordsStandbyTab' },
	{ group: 'demo', labelKey: 'setup.demoMode', keywordsKey: 'setup.keywordsDemo' },
] as const;

// Strips diacritics and case so "prevision" reaches "Previsión" and "COOLDOWN" reaches "Cooldown".
// Locales without a Latin script are unaffected, which is correct — they match on their own glyphs.
export const normalize = (value: string): string =>
	value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

export interface settingsSearchResult {
	group: settingsGroup;
	label: string;
	sublabel: string;
	labelKey: plainMessageKey;
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

		return [{ group, label, sublabel: i18n.t(group.labelKey), labelKey: entry.labelKey }];
	});

	const seen = new Set<string>();
	return [...groupHits, ...entryHits].filter(hit => {
		const key = `${hit.group.id}:${String(hit.labelKey)}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
};
