import { fantasyRosterLimit } from '@arenaswap/core';
import type { FantasyRosterEntry } from '@arenaswap/core';
import { addToRoster, groupRosterByLeague, isRosterFull, removeFromRoster, rosterHeadshot, rosterKey } from '../utils/fantasyRoster';

const player = (league: FantasyRosterEntry['league'], athleteId: string, position: FantasyRosterEntry['position'] = 'player'): FantasyRosterEntry => ({
	league,
	athleteId,
	name: `Player ${athleteId}`,
	teamId: '1',
	position,
});

describe('fantasy roster', () => {
	it('adds a player once', () => {
		const roster = addToRoster([], player('nba', '1'));
		expect(addToRoster(roster, player('nba', '1'))).toHaveLength(1);
		expect(addToRoster(roster, player('wnba', '1'))).toHaveLength(2);
	});

	it('stops adding at the limit', () => {
		const full = Array.from({ length: fantasyRosterLimit }, (_, index) => player('nba', String(index)));
		expect(isRosterFull(full)).toBe(true);
		expect(addToRoster(full, player('nhl', 'x'))).toHaveLength(fantasyRosterLimit);
	});

	it('removes by key', () => {
		const roster = [player('nba', '1'), player('nfl', '1', 'QB')];
		expect(removeFromRoster(roster, rosterKey(roster[0]!))).toEqual([roster[1]]);
	});

	it('groups by league in a fixed order, keeping the order players were added', () => {
		const roster = [player('nhl', '1'), player('nfl', '2', 'WR'), player('nhl', '3'), player('nba', '4')];
		expect(groupRosterByLeague(roster).map(group => [group.league, group.entries.map(entry => entry.athleteId)])).toEqual([
			['nfl', ['2']],
			['nba', ['4']],
			['nhl', ['1', '3']],
		]);
	});

	it('finds a player\'s headshot by league and id, and gives a defense none', () => {
		expect(rosterHeadshot(player('mlb', '39832', 'P'))).toBe('https://a.espncdn.com/i/headshots/mlb/players/full/39832.png');
		expect(rosterHeadshot({ league: 'nfl', athleteId: 'dst:12', position: 'DST' })).toBeUndefined();
	});
});
