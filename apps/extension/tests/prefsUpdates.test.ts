import { createDefaultUserPreferences, createFavoriteTeamKey } from '@arenaswap/core/constants';
import type { LeagueId, SportType, UserPreferences } from '@arenaswap/core/types';
import { insertLeagueAtDefaultPosition, leagueOrder, leaguesBySportType, moveLeague } from '../utils/leagueOrder';
import {
	withFavoriteTeamToggled,
	withLeagueMoved,
	withLeagueOrderReset,
	withLeagueToggled,
	withRivalTeamToggled,
	withSportToggled,
} from '../utils/prefsUpdates';

const prefs = (overrides: Partial<UserPreferences> = {}): UserPreferences => ({ ...createDefaultUserPreferences(), ...overrides });

const oldToggleLeague = (currentPrefs: UserPreferences, leagueId: LeagueId) => {
	const enabledLeagues = currentPrefs.enabledLeagues.includes(leagueId)
		? currentPrefs.enabledLeagues.filter(id => id !== leagueId)
		: insertLeagueAtDefaultPosition(currentPrefs.enabledLeagues, leagueId);
	return { ...currentPrefs, enabledLeagues };
};

const oldToggleSport = (currentPrefs: UserPreferences, sport: SportType, selectAll: boolean) => {
	const sportLeagueIds = leaguesBySportType[sport].map(l => l.id);
	const enabledLeagues = selectAll
		? sportLeagueIds.reduce(insertLeagueAtDefaultPosition, currentPrefs.enabledLeagues)
		: currentPrefs.enabledLeagues.filter(id => !sportLeagueIds.includes(id));
	return { ...currentPrefs, enabledLeagues };
};

const oldToggleFavorite = (currentPrefs: UserPreferences, leagueId: LeagueId, teamId: string) => {
	const favoriteTeamKey = createFavoriteTeamKey(leagueId, teamId);
	const current = new Set(currentPrefs.favoriteTeamIds);
	if (current.has(favoriteTeamKey)) current.delete(favoriteTeamKey);
	else current.add(favoriteTeamKey);
	return { ...currentPrefs, favoriteTeamIds: [...current], rivalTeamIds: currentPrefs.rivalTeamIds.filter(key => key !== favoriteTeamKey) };
};

const oldToggleRival = (currentPrefs: UserPreferences, leagueId: LeagueId, teamId: string) => {
	const rivalTeamKey = createFavoriteTeamKey(leagueId, teamId);
	const current = new Set(currentPrefs.rivalTeamIds);
	if (current.has(rivalTeamKey)) current.delete(rivalTeamKey);
	else current.add(rivalTeamKey);
	return { ...currentPrefs, rivalTeamIds: [...current], favoriteTeamIds: currentPrefs.favoriteTeamIds.filter(key => key !== rivalTeamKey) };
};

describe('withLeagueToggled', () => {
	it('matches the old inline toggle when turning a league off and on', () => {
		const start = prefs({ enabledLeagues: ['nba', 'nfl', 'mlb'] });
		expect(withLeagueToggled(start, 'nfl')).toEqual(oldToggleLeague(start, 'nfl'));
		expect(withLeagueToggled(start, 'nfl').enabledLeagues).toEqual(['nba', 'mlb']);
		expect(withLeagueToggled(start, 'nhl')).toEqual(oldToggleLeague(start, 'nhl'));
	});
});

describe('withSportToggled', () => {
	it('matches the old inline toggle for select all and clear', () => {
		const start = prefs({ enabledLeagues: ['nfl', 'nba'] });
		const sports: SportType[] = ['basketball', 'football', 'hockey', 'baseball', 'soccer'];
		sports.forEach(sport => {
			expect(withSportToggled(start, sport, true)).toEqual(oldToggleSport(start, sport, true));
			expect(withSportToggled(start, sport, false)).toEqual(oldToggleSport(start, sport, false));
		});
	});
});

describe('withLeagueMoved', () => {
	it('moves a league through moveLeague and leaves other fields alone', () => {
		const start = prefs({ enabledLeagues: ['nba', 'nfl', 'mlb'] });
		const moved = withLeagueMoved(start, 0, 2);
		expect(moved.enabledLeagues).toEqual(moveLeague(start.enabledLeagues, 0, 2));
		expect(moved).toEqual({ ...start, enabledLeagues: ['nfl', 'mlb', 'nba'] });
	});
});

describe('withLeagueOrderReset', () => {
	it('sorts into the canonical order without mutating the input', () => {
		const start = prefs({ enabledLeagues: ['mlb', 'nfl', 'nba'] });
		const reset = withLeagueOrderReset(start);
		expect(reset.enabledLeagues).toEqual(['mlb', 'nfl', 'nba'].toSorted((a, b) => leagueOrder[a as LeagueId] - leagueOrder[b as LeagueId]));
		expect(start.enabledLeagues).toEqual(['mlb', 'nfl', 'nba']);
	});
});

describe('withFavoriteTeamToggled', () => {
	it('adds a favorite and removes the same team from rivals, as the old closure did', () => {
		const key = createFavoriteTeamKey('nba', 'bos');
		const start = prefs({ favoriteTeamIds: [], rivalTeamIds: [key, createFavoriteTeamKey('nfl', 'phi')] });
		const next = withFavoriteTeamToggled(start, 'nba', 'bos');
		expect(next).toEqual(oldToggleFavorite(start, 'nba', 'bos'));
		expect(next.favoriteTeamIds).toEqual([key]);
		expect(next.rivalTeamIds).toEqual([createFavoriteTeamKey('nfl', 'phi')]);
	});

	it('removes an existing favorite', () => {
		const key = createFavoriteTeamKey('nba', 'bos');
		const start = prefs({ favoriteTeamIds: [key] });
		expect(withFavoriteTeamToggled(start, 'nba', 'bos')).toEqual(oldToggleFavorite(start, 'nba', 'bos'));
		expect(withFavoriteTeamToggled(start, 'nba', 'bos').favoriteTeamIds).toEqual([]);
	});
});

describe('withRivalTeamToggled', () => {
	it('adds a rival and removes the same team from favorites, as the old closure did', () => {
		const key = createFavoriteTeamKey('nba', 'bos');
		const start = prefs({ favoriteTeamIds: [key], rivalTeamIds: [] });
		const next = withRivalTeamToggled(start, 'nba', 'bos');
		expect(next).toEqual(oldToggleRival(start, 'nba', 'bos'));
		expect(next.rivalTeamIds).toEqual([key]);
		expect(next.favoriteTeamIds).toEqual([]);
	});

	it('removes an existing rival', () => {
		const key = createFavoriteTeamKey('nba', 'bos');
		const start = prefs({ rivalTeamIds: [key] });
		expect(withRivalTeamToggled(start, 'nba', 'bos')).toEqual(oldToggleRival(start, 'nba', 'bos'));
	});
});
