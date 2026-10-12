import { createDefaultUserPreferences, createFavoriteTeamKey } from '../../../packages/core/src/constants';
import type { LeagueId, UserPreferences } from '../../../packages/core/src/types';

// Saturday, October 3, 2026, as the recorder saw it. Everything the films show comes out of this
// window: the popup's cards, the PowerScores, the guide and the wall of live games.
export const slateFrom = Date.parse('2026-10-03T23:10:00Z');
export const slateTo = Date.parse('2026-10-04T00:50:00Z');

// The cold open's "every live game right now", and the moment the guide is opened.
export const wallAt = Date.parse('2026-10-03T23:45:30Z');
export const guideAt = Date.parse('2026-10-03T23:50:00Z');

export const kentuckyKey = createFavoriteTeamKey('ncaaf', '96');

// The viewer: the leagues a Saturday-night fan would have on, with college football widened to FBS
// and FCS. `fan` is the same viewer after starring Kentucky.
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

// Games a film opens to the detail screen. These keep every PowerScore in full and a win probability
// series; every other game keeps its total and reason, written only when the total moves.
export const detailGameIds = ['401856709', '401907985'];

// Box scores are heavy, so only the moments a detail screen is actually on camera are kept.
export const summaryMoments: [string, number][] = [
	['401856709', Date.parse('2026-10-03T23:41:00Z')],
	['401856709', Date.parse('2026-10-03T23:47:30Z')],
	['401856709', Date.parse('2026-10-04T00:02:30Z')],
	['401907985', Date.parse('2026-10-04T00:40:00Z')],
];
