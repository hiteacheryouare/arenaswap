import { i18n } from '#i18n';
import type { FantasyRosterEntry } from '@arenaswap/core';
import type { UserPreferences } from '@arenaswap/core/types';
import { modeNameKeys } from '@arenaswap/ui/src/components/scoringModeMeta';

export interface settingsSummaryRow {
	id: string;
	label: string;
	value: string;
}

const themeNames = {
	dark: 'setup.themeDark',
	light: 'setup.themeLight',
	system: 'setup.themeSystem',
} as const satisfies Record<UserPreferences['theme'], string>;

export const syncedSummary = (prefs: UserPreferences, roster: readonly FantasyRosterEntry[]): settingsSummaryRow[] => [
	{ id: 'leagues', label: i18n.t('backup.rowLeagues'), value: String(prefs.enabledLeagues.length) },
	{ id: 'favorites', label: i18n.t('backup.rowFavorites'), value: String(prefs.favoriteTeamIds.length) },
	{ id: 'scoring', label: i18n.t('backup.rowScoring'), value: i18n.t(modeNameKeys[prefs.scoringMode]) },
	{ id: 'theme', label: i18n.t('setup.theme'), value: i18n.t(themeNames[prefs.theme]) },
	{ id: 'roster', label: i18n.t('backup.rowRoster'), value: String(roster.length) },
];
