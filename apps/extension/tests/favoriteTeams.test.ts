import type { EspnTeamEntry } from '@arenaswap/core';
import type { LeagueId } from '@arenaswap/core/types';
import { favoriteTeamRows, leaguesForFavoritePicker, matchesTeamQuery } from '../utils/favoriteTeams';

const team = (leagueId: LeagueId, id: string, name: string, abbreviation = name.slice(0, 3).toUpperCase()): EspnTeamEntry => (
	{ leagueId, id, name, abbreviation }
);

describe('leaguesForFavoritePicker', () => {
	test('returns the enabled leagues in the popup\'s own league order', () => {
		expect(leaguesForFavoritePicker(['nfl', 'nba', 'nhl'], [])).toEqual(['nba', 'nhl', 'nfl']);
	});

	test('pulls in the league of a favorite whose league has been switched off', () => {
		expect(leaguesForFavoritePicker(['nba'], ['nhl:6'])).toEqual(['nba', 'nhl']);
	});

	test('does not list a league twice when it is both enabled and holds a favorite', () => {
		expect(leaguesForFavoritePicker(['nba'], ['nba:2', 'nba:17'])).toEqual(['nba']);
	});

	test('ignores a stored key that names no league we ship', () => {
		expect(leaguesForFavoritePicker(['nba'], ['quidditch:9', 'not-a-key', ''])).toEqual(['nba']);
	});

	test('is empty when nothing is enabled and nothing is starred', () => {
		expect(leaguesForFavoritePicker([], [])).toEqual([]);
	});
});

describe('matchesTeamQuery', () => {
	const celtics = team('nba', '2', 'Boston Celtics', 'BOS');

	test('an empty or blank query matches every team', () => {
		expect(matchesTeamQuery(celtics, '')).toBe(true);
		expect(matchesTeamQuery(celtics, '   ')).toBe(true);
	});

	test('matches part of the name regardless of case', () => {
		expect(matchesTeamQuery(celtics, 'CELT')).toBe(true);
		expect(matchesTeamQuery(celtics, 'boston')).toBe(true);
	});

	test('matches the abbreviation', () => {
		expect(matchesTeamQuery(celtics, 'bos')).toBe(true);
	});

	test('reports a miss', () => {
		expect(matchesTeamQuery(celtics, 'lakers')).toBe(false);
	});
});

describe('favoriteTeamRows', () => {
	const teams = [
		team('nba', '2', 'Boston Celtics'),
		team('nba', '17', 'Milwaukee Bucks'),
		team('nba', '1', 'Atlanta Hawks'),
		team('nhl', '6', 'Boston Bruins'),
	];

	test('keeps only the teams that are actually starred', () => {
		const rows = favoriteTeamRows(teams, new Set(['nba:2']), ['nba', 'nhl']);

		expect(rows.map(row => row.team.name)).toEqual(['Boston Celtics']);
	});

	test('leaves out a stored favorite with no team behind it', () => {
		const rows = favoriteTeamRows(teams, new Set(['nba:2', 'nba:999']), ['nba']);

		expect(rows).toHaveLength(1);
		expect(rows[0]!.key).toBe('nba:2');
	});

	test('marks a favorite whose league is switched off as untracked', () => {
		const rows = favoriteTeamRows(teams, new Set(['nba:2', 'nhl:6']), ['nba']);

		expect(rows.find(row => row.team.name === 'Boston Celtics')!.isTracked).toBe(true);
		expect(rows.find(row => row.team.name === 'Boston Bruins')!.isTracked).toBe(false);
	});

	test('sorts the untracked favorites last, whatever their league order', () => {
		// NBA sorts ahead of NHL, so only the tracked-first rule can put the Bruins on top.
		const rows = favoriteTeamRows(teams, new Set(['nba:2', 'nhl:6']), ['nhl']);

		expect(rows.map(row => row.team.name)).toEqual(['Boston Bruins', 'Boston Celtics']);
	});

	test('sorts alphabetically within a league', () => {
		const rows = favoriteTeamRows(teams, new Set(['nba:2', 'nba:17', 'nba:1']), ['nba']);

		expect(rows.map(row => row.team.name)).toEqual(['Atlanta Hawks', 'Boston Celtics', 'Milwaukee Bucks']);
	});
});
