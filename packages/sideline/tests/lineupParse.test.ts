import { emptyLineups, hasLineups, parseLineups } from '../src/lineupParse';
import rosters from './fixtures/lineups/rosters.json';

// Real rosters from summaries captured 2026-11-06, trimmed to the keys the parser reads: Everton,
// Sassuolo, Parma, Sevilla and Hamburg, one for each formation below.
type RosterKey = keyof typeof rosters;

const lineupOf = (key: RosterKey) => {
	const team = rosters[key];
	return parseLineups({ rosters: [team] }, { home: team.team.id, away: 'nobody' }).home!;
};

const positions = (key: RosterKey) => lineupOf(key).rows.map(row => row.map(player => player.position));

describe('parseLineups', () => {
	it('lays a 4-2-3-1 out from the keeper forward, each line left to right', () => {
		expect(positions('EVE')).toEqual([
			['G'],
			['LB', 'CD-L', 'CD-R', 'RB'],
			['LM', 'RM'],
			['AM-L', 'AM', 'AM-R'],
			['F'],
		]);
	});

	it('follows the formation\'s row sizes when two lines share a position type', () => {
		expect(positions('HSV')).toEqual([
			['G'],
			['CD-L', 'CD', 'CD-R'],
			['LM', 'CM-L', 'CM-R', 'RM'],
			['CF-L', 'CF-R'],
			['F'],
		]);
	});

	it('puts an attacking midfielder in a five-man midfield when the formation says so', () => {
		expect(positions('PAR')).toEqual([
			['G'],
			['CD-L', 'CD', 'CD-R'],
			['LM', 'CM-L', 'AM', 'CM-R', 'RM'],
			['CF-L', 'CF-R'],
		]);
	});

	it('handles a flat four and a front three', () => {
		expect(positions('SEV')).toEqual([['G'], ['LB', 'CD-L', 'CD-R', 'RB'], ['LM', 'CM-L', 'CM-R', 'RM'], ['CF-L', 'CF-R']]);
		expect(positions('SAS')).toEqual([['G'], ['LB', 'CD-L', 'CD-R', 'RB'], ['LM', 'CM', 'RM'], ['LF', 'F', 'RF']]);
	});

	it('names players by surname and keeps the kit they wore', () => {
		const everton = lineupOf('EVE');
		expect(everton.formation).toBe('4-2-3-1');
		expect(everton.rows[0]).toEqual([{ id: expect.any(String), name: 'Pickford', jersey: '1', position: 'G' }]);
		expect(everton.shirtColor).toMatch(/^#[0-9A-F]{6}$/);
	});

	it('falls back to grouping by position when the formation does not add up', () => {
		const team = { ...rosters.EVE, formation: '4-4-2-9' };
		const lineup = parseLineups({ rosters: [team] }, { home: team.team.id, away: 'nobody' }).home!;
		expect(lineup.rows.map(row => row.length)).toEqual([1, 4, 2, 3, 1]);
	});

	it('has nothing to show before the teams name their XIs', () => {
		const benchOnly = { ...rosters.EVE, roster: rosters.EVE.roster.map(entry => ({ ...entry, starter: false })) };
		expect(parseLineups({ rosters: [benchOnly] }, { home: benchOnly.team.id, away: 'nobody' })).toEqual(emptyLineups);
		expect(hasLineups(parseLineups({}, { home: '1', away: '2' }))).toBe(false);
	});
});
