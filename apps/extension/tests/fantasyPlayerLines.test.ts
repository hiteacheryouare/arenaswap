import type { FantasyRosterEntry } from '@arenaswap/core';
import { rosterPlayerLines } from '../entrypoints/popup/components/fantasyPlayerLines';
import type { BoxScore, BoxScoreAthlete, BoxScoreCategory } from '../entrypoints/popup/components/boxScoreParse';

const athlete = (id: string, stats: string[], extra: Partial<BoxScoreAthlete> = {}): BoxScoreAthlete => ({
	id,
	name: id,
	position: '',
	stats,
	starter: true,
	batOrder: 0,
	didNotPlay: false,
	didNotPlayReason: '',
	...extra,
});

const category = (name: string, keys: string[], athletes: BoxScoreAthlete[]): BoxScoreCategory => ({ name, keys, labels: keys, descriptions: keys, totals: [], athletes });

const entry = (athleteId: string, position: FantasyRosterEntry['position']): FantasyRosterEntry => ({ league: 'nfl', athleteId, name: `Player ${athleteId}`, teamId: '12', position });

const footballBox: BoxScore = {
	lineScore: null,
	teamComparison: [],
	away: null,
	home: {
		teamId: '12',
		abbreviation: 'KC',
		categories: [
			category('passing', ['completions/passingAttempts', 'passingYards', 'passingTouchdowns', 'interceptions'], [athlete('15', ['18/27', '245', '2', '0'], { position: 'QB' })]),
			category('rushing', ['rushingAttempts', 'rushingYards', 'rushingTouchdowns'], [athlete('15', ['4', '31', '0'], { position: 'QB' }), athlete('25', ['12', '54', '1'], { position: 'RB' })]),
		],
	},
};

describe('rosterPlayerLines', () => {
	it('collects a player\'s line from every category he shows up in, in the Box tab\'s columns', () => {
		const [qb] = rosterPlayerLines('football', footballBox, [entry('15', 'QB')]);
		expect(qb!.position).toBe('QB');
		expect(qb!.groups.map(group => group.headingKey)).toEqual(['box.passing', 'box.rushing']);
		expect(qb!.groups[0]!.stats).toEqual([
			{ labelKey: 'box.completionsAttempts', value: '18/27' },
			{ labelKey: 'box.yards', value: '245' },
			{ labelKey: 'box.touchdowns', value: '2' },
			{ labelKey: 'box.interceptions', value: '0' },
		]);
	});

	it('gives a player who is not in the box score yet no line', () => {
		const [missing] = rosterPlayerLines('football', footballBox, [entry('99', 'WR')]);
		expect(missing!.groups).toEqual([]);
		expect(missing!.position).toBe('');
	});

	it('never reads a team defense out of a player row', () => {
		const [defense] = rosterPlayerLines('football', footballBox, [{ ...entry('dst:12', 'DST'), athleteId: 'dst:12' }]);
		expect(defense!.groups).toEqual([]);
	});

	it('marks a basketball player who did not play', () => {
		const box: BoxScore = {
			lineScore: null,
			teamComparison: [],
			home: null,
			away: { teamId: '7', abbreviation: 'DEN', categories: [category('', ['minutes', 'points'], [athlete('3112335', [], { didNotPlay: true, position: 'C' })])] },
		};
		const [line] = rosterPlayerLines('basketball', box, [{ league: 'nba', athleteId: '3112335', name: 'Nikola Jokic', teamId: '7', position: 'player' }]);
		expect(line!.didNotPlay).toBe(true);
		expect(line!.groups).toEqual([]);
		expect(line!.position).toBe('C');
	});
});
