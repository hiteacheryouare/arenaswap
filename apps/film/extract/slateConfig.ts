import { createDefaultUserPreferences, createFavoriteTeamKey } from '@arenaswap/core/constants';
import type { LeagueId, UserPreferences } from '@arenaswap/core/types';

export const slateFrom = Date.parse('2026-10-03T23:10:00Z');
export const slateTo = Date.parse('2026-10-04T00:50:00Z');

export const wallAt = Date.parse('2026-10-03T23:45:30Z');
export const guideAt = Date.parse('2026-10-03T23:50:00Z');

export const kentuckyKey = createFavoriteTeamKey('ncaaf', '96');

export const viewerLeagues: LeagueId[] = ['ncaaf', 'mlb', 'nhl', 'nwsl', 'ncaamh', 'nba'];

const viewerPrefs = (favoriteTeamIds: string[]): UserPreferences => ({
	...createDefaultUserPreferences(),
	enabledLeagues: viewerLeagues,
	favoriteTeamIds,
	collegeFilters: { ncaaf: { divisions: ['80', '81'], conferences: [], ranked: false, titleRounds: true } },
});

export const profiles = {
	plain: viewerPrefs([]),
	fan: viewerPrefs([kentuckyKey]),
};

export type ProfileName = keyof typeof profiles;

export const detailGameIds = ['401856709', '401907985'];

export const summaryMoments: [string, number][] = [
	['401856709', Date.parse('2026-10-03T23:41:00Z')],
	['401856709', Date.parse('2026-10-03T23:47:30Z')],
	['401856709', Date.parse('2026-10-04T00:02:30Z')],
	['401907985', Date.parse('2026-10-04T00:40:00Z')],
];
