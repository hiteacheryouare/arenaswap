import {
	parseBoxScore,
	parseLineScore,
	parseTeamComparison,
} from '../entrypoints/popup/components/boxScoreParse';

// Every payload below is transcribed off a live ESPN `/summary` response: WSH at SD in the top of
// the 7th (401816852), NY at SA (401859963), NO at ATL (401772966), CAR at VGK (401874176) and
// NE at CLB (761758).

const mlbLineScore = {
	header: {
		competitions: [{
			// ESPN put the home team first here. It orders `competitors` by its own field, which is
			// away-then-home in most sports and reversed in others, so nothing may read position.
			competitors: [
				{
					homeAway: 'home',
					team: { id: '25', abbreviation: 'SD' },
					score: '3',
					linescores: [
						{ displayValue: '1', hits: 3, errors: 0 },
						{ displayValue: '0', hits: 0, errors: 0 },
						{ displayValue: '2', hits: 3, errors: 0 },
						{ displayValue: '0', hits: 2, errors: 0 },
						{ displayValue: '0', hits: 0, errors: 0 },
						{ displayValue: '0', hits: 0, errors: 0 },
					],
				},
				{
					homeAway: 'away',
					team: { id: '20', abbreviation: 'WSH' },
					score: '2',
					linescores: [
						{ displayValue: '0', hits: 0, errors: 0 },
						{ displayValue: '0', hits: 0, errors: 0 },
						{ displayValue: '0', hits: 2, errors: 0 },
						{ displayValue: '0', hits: 0, errors: 0 },
						{ displayValue: '0', hits: 0, errors: 0 },
						{ displayValue: '2', hits: 2, errors: 0 },
						{ displayValue: '0', hits: 0, errors: 0 },
					],
				},
			],
		}],
	},
};

const mlbBoxScore = {
	...mlbLineScore,
	boxscore: {
		players: [{
			team: { id: '20', abbreviation: 'WSH' },
			statistics: [
				{
					type: 'batting',
					labels: ['H-AB', 'AB', 'R', 'H', 'RBI'],
					keys: ['hits-atBats', 'atBats', 'runs', 'hits', 'RBIs'],
					descriptions: ['Hits per At Bats', 'At Bats', 'Runs', 'Hits', 'Runs Batted In'],
					totals: ['4-23', '23', '2', '4', '2'],
					athletes: [{
						starter: true,
						batOrder: 1,
						position: { abbreviation: 'RF' },
						athlete: { id: '4918256', shortName: 'J. Wood', displayName: 'James Wood' },
						stats: ['1-3', '3', '0', '1', '0'],
					}],
				},
				{
					type: 'pitching',
					labels: ['IP', 'H', 'R'],
					keys: ['fullInnings.partInnings', 'hits', 'runs'],
					descriptions: ['Innings Pitched', 'Hits', 'Runs'],
					totals: ['6.0', '8', '3'],
					athletes: [{
						starter: true,
						batOrder: 0,
						position: { abbreviation: 'SP' },
						athlete: { id: '41290', shortName: 'J. Irvin' },
						stats: ['5.2', '8', '3'],
					}],
				},
			],
		}],
		// The nested season-shaped tree baseball sends instead of a comparison table.
		teams: [{
			team: { id: '20', abbreviation: 'WSH' },
			homeAway: 'away',
			statistics: [{ name: 'batting', displayName: 'Batting', stats: [{ name: 'atBats', displayValue: '23' }] }],
		}],
	},
};

const nbaBoxScore = {
	boxscore: {
		players: [{
			team: { id: '18', abbreviation: 'NY' },
			statistics: [{
				// Basketball sends one unnamed category holding the whole box score.
				labels: ['MIN', 'PTS', 'FG', '3PT'],
				keys: ['minutes', 'points', 'fieldGoalsMade-fieldGoalsAttempted', 'threePointFieldGoalsMade-threePointFieldGoalsAttempted'],
				descriptions: ['Minutes', 'Points', 'Field Goals Made/Attempted', 'Three Point Field Goals Made/Attempted'],
				totals: ['', '105', '39-94', '11-36'],
				athletes: [
					{
						active: true,
						starter: true,
						didNotPlay: false,
						ejected: false,
						athlete: { id: '3934672', shortName: 'O. Anunoby', position: { abbreviation: 'F' } },
						stats: ['31', '17', '5-12', '3-6'],
					},
					{
						active: false,
						starter: false,
						didNotPlay: true,
						ejected: false,
						reason: "COACH'S DECISION",
						athlete: { id: '4433134', shortName: 'J. Sochan', position: { abbreviation: 'F' } },
						stats: [],
					},
				],
			}],
		}],
		teams: [
			{
				team: { id: '18', abbreviation: 'NY' },
				homeAway: 'away',
				statistics: [
					{ name: 'fieldGoalsMade-fieldGoalsAttempted', label: 'FG', displayValue: '39-94' },
					{ name: 'fieldGoalPct', abbreviation: 'FG%', label: 'Field Goal %', displayValue: '41' },
					{ name: 'assists', label: 'Assists', displayValue: '20' },
				],
			},
			{
				team: { id: '24', abbreviation: 'SA' },
				homeAway: 'home',
				statistics: [
					{ name: 'fieldGoalsMade-fieldGoalsAttempted', label: 'FG', displayValue: '35-88' },
					{ name: 'fieldGoalPct', abbreviation: 'FG%', label: 'Field Goal %', displayValue: '40' },
					{ name: 'assists', label: 'Assists', displayValue: '24' },
				],
			},
		],
	},
};

describe('parseLineScore', () => {
	test('pads the home side of a live game so both rows sit under one set of headings', () => {
		const line = parseLineScore(mlbLineScore, '25', '20', 'SD', 'WSH');
		expect(line?.periodCount).toBe(7);
		expect(line?.away.periods).toEqual(['0', '0', '0', '0', '0', '2', '0']);
		// Bottom of the 7th has not been played. An empty string, not a '0' — a zero would claim
		// San Diego batted and failed to score.
		expect(line?.home.periods).toEqual(['1', '0', '2', '0', '0', '0', '']);
	});

	test('builds the R-H-E line by summing the innings', () => {
		const line = parseLineScore(mlbLineScore, '25', '20', 'SD', 'WSH');
		expect(line?.away).toMatchObject({ abbreviation: 'WSH', total: '2', hits: 4, errors: 0 });
		expect(line?.home).toMatchObject({ abbreviation: 'SD', total: '3', hits: 8, errors: 0 });
	});

	test('resolves the sides by team id rather than by array position', () => {
		// The fixture lists the home team first; reading position would swap the two rows.
		const line = parseLineScore(mlbLineScore, '25', '20', 'SD', 'WSH');
		expect(line?.away.teamId).toBe('20');
		expect(line?.home.teamId).toBe('25');
	});

	test('falls back to homeAway when our team ids are synthesized and cannot match', () => {
		const line = parseLineScore(mlbLineScore, 'ncaah-home', 'ncaah-away', 'SD', 'WSH');
		expect(line?.away.abbreviation).toBe('WSH');
		expect(line?.home.abbreviation).toBe('SD');
	});

	test('reports no hits or errors for a sport that sends none', () => {
		const line = parseLineScore({
			header: { competitions: [{ competitors: [
				{ homeAway: 'away', team: { id: '18' }, score: '17', linescores: [{ displayValue: '0' }, { displayValue: '7' }] },
				{ homeAway: 'home', team: { id: '1' }, score: '19', linescores: [{ displayValue: '7' }, { displayValue: '3' }] },
			] }] },
		}, '1', '18', 'ATL', 'NO');
		expect(line?.away).toMatchObject({ total: '17', hits: null, errors: null });
	});

	test('returns null when a game has no periods yet', () => {
		expect(parseLineScore({
			header: { competitions: [{ competitors: [
				{ homeAway: 'away', team: { id: '18' }, score: '0', linescores: [] },
				{ homeAway: 'home', team: { id: '1' }, score: '0' },
			] }] },
		}, '1', '18', 'ATL', 'NO')).toBeNull();
	});

	test('returns null on a payload with no header at all', () => {
		expect(parseLineScore({}, '1', '18', 'ATL', 'NO')).toBeNull();
		expect(parseLineScore(undefined, '1', '18', 'ATL', 'NO')).toBeNull();
	});
});

describe('parseBoxScore player categories', () => {
	test('keeps both baseball categories with their columns and totals', () => {
		const box = parseBoxScore(mlbBoxScore, '25', '20', 'SD', 'WSH');
		expect(box.away?.categories.map(c => c.name)).toEqual(['batting', 'pitching']);
		const batting = box.away?.categories[0];
		expect(batting?.labels).toEqual(['H-AB', 'AB', 'R', 'H', 'RBI']);
		expect(batting?.keys).toEqual(['hits-atBats', 'atBats', 'runs', 'hits', 'RBIs']);
		expect(batting?.totals).toEqual(['4-23', '23', '2', '4', '2']);
	});

	test('reads a batter as ESPN sends them', () => {
		const box = parseBoxScore(mlbBoxScore, '25', '20', 'SD', 'WSH');
		expect(box.away?.categories[0].athletes[0]).toEqual({
			id: '4918256',
			// The initialled short name, which is what fits the one name column a 320px popup has.
			name: 'J. Wood',
			position: 'RF',
			stats: ['1-3', '3', '0', '1', '0'],
			starter: true,
			batOrder: 1,
			didNotPlay: false,
			didNotPlayReason: '',
		});
	});

	test('a pitcher has no spot in the batting order', () => {
		const box = parseBoxScore(mlbBoxScore, '25', '20', 'SD', 'WSH');
		expect(box.away?.categories[1].athletes[0].batOrder).toBe(0);
	});

	test('names the single unnamed category basketball sends with an empty string', () => {
		const box = parseBoxScore(nbaBoxScore, '24', '18', 'SA', 'NY');
		expect(box.away?.categories).toHaveLength(1);
		expect(box.away?.categories[0].name).toBe('');
	});

	test('carries a did-not-play reason and its empty stat line', () => {
		const box = parseBoxScore(nbaBoxScore, '24', '18', 'SA', 'NY');
		expect(box.away?.categories[0].athletes[1]).toMatchObject({
			name: 'J. Sochan',
			stats: [],
			starter: false,
			didNotPlay: true,
			didNotPlayReason: "COACH'S DECISION",
		});
	});

	test('keeps the did-not-play flag when ESPN sends no reason with it', () => {
		// Both readers branch on the flag rather than the reason: an empty reason is the case where
		// a truthiness check renders a row of empty stat cells instead of DNP.
		const box = parseBoxScore({
			boxscore: { players: [{
				team: { id: '18' },
				statistics: [{
					labels: ['MIN', 'PTS'],
					keys: ['minutes', 'points'],
					athletes: [{ didNotPlay: true, athlete: { shortName: 'J. Sochan' }, stats: [] }],
				}],
			}] },
		}, '1', '18', 'SA', 'NY');
		expect(box.away?.categories[0].athletes[0]).toMatchObject({
			didNotPlay: true,
			didNotPlayReason: '',
		});
	});

	test('keeps a category ESPN sends keys for but no display labels', () => {
		// Columns are selected by `keys` and every heading comes from our own catalog, so a missing
		// `labels` array costs nothing that would stop the table rendering.
		const box = parseBoxScore({
			boxscore: { players: [{
				team: { id: '18' },
				statistics: [{
					name: 'passing',
					keys: ['completions/passingAttempts', 'passingYards'],
					athletes: [{ athlete: { shortName: 'D. Carr' }, stats: ['23/35', '232'] }],
				}],
			}] },
		}, '1', '18', 'ATL', 'NO');
		expect(box.away?.categories.map(c => c.name)).toEqual(['passing']);
		expect(box.away?.categories[0].labels).toEqual([]);
	});

	test('places the second side by elimination when only one id matches', () => {
		// A `players` block carries no `homeAway`, so the id match is its only direct route — and
		// the id compared is ESPN's competitor id against its team id. Two blocks, one of them
		// placed, leaves exactly one answer for the other.
		const box = parseBoxScore({
			boxscore: { players: [
				{
					team: { id: '18', abbreviation: 'NO' },
					statistics: [{ name: 'passing', labels: ['YDS'], keys: ['passingYards'], athletes: [{ athlete: { shortName: 'D. Carr' }, stats: ['232'] }] }],
				},
				{
					team: { id: 'a-competitor-id-we-do-not-hold', abbreviation: 'ATL' },
					statistics: [{ name: 'passing', labels: ['YDS'], keys: ['passingYards'], athletes: [{ athlete: { shortName: 'K. Cousins' }, stats: ['198'] }] }],
				},
			] },
		}, '1', '18', 'ATL', 'NO');
		expect(box.away?.abbreviation).toBe('NO');
		expect(box.home?.abbreviation).toBe('ATL');
		expect(box.home?.categories[0].athletes[0].name).toBe('K. Cousins');
	});

	test('drops a category ESPN sends with no athletes in it', () => {
		const box = parseBoxScore({
			boxscore: { players: [{
				team: { id: '18' },
				statistics: [
					{ name: 'passing', labels: ['C/ATT'], keys: ['completions/passingAttempts'], totals: ['23/35'], athletes: [{ athlete: { shortName: 'D. Carr' }, stats: ['23/35'] }] },
					// A phase that never happened, and hockey's `skaters` beside the `forwards` and
					// `defenses` it duplicates.
					{ name: 'puntReturns', labels: ['NO', 'YDS'], keys: ['puntReturns', 'puntReturnYards'], totals: [], athletes: [] },
				],
			}] },
		}, '1', '18', 'ATL', 'NO');
		expect(box.away?.categories.map(c => c.name)).toEqual(['passing']);
	});

	test('drops a category with athletes but no columns to put them in', () => {
		const box = parseBoxScore({
			boxscore: { players: [{
				team: { id: '18' },
				statistics: [{ name: 'passing', labels: [], keys: [], athletes: [{ athlete: { shortName: 'D. Carr' }, stats: [] }] }],
			}] },
		}, '1', '18', 'ATL', 'NO');
		expect(box.away).toBeNull();
	});

	test('reads no players for a sport that sends none', () => {
		const box = parseBoxScore({ boxscore: { teams: [] } }, '183', '189', 'CLB', 'NE');
		expect(box.away).toBeNull();
		expect(box.home).toBeNull();
	});

	test('falls back to the long name when a league sends no short one', () => {
		const box = parseBoxScore({
			boxscore: { players: [{
				team: { id: '18' },
				statistics: [{ name: 'passing', labels: ['YDS'], keys: ['passingYards'], athletes: [{ athlete: { displayName: 'Derek Carr' }, stats: ['232'] }] }],
			}] },
		}, '1', '18', 'ATL', 'NO');
		expect(box.away?.categories[0].athletes[0].name).toBe('Derek Carr');
	});

	test('falls back to our own abbreviation when the block carries none', () => {
		const box = parseBoxScore({
			boxscore: { players: [{
				team: { id: '18' },
				statistics: [{ name: 'passing', labels: ['YDS'], keys: ['passingYards'], athletes: [{ athlete: { shortName: 'D. Carr' }, stats: ['232'] }] }],
			}] },
		}, '1', '18', 'ATL', 'NO');
		expect(box.away?.abbreviation).toBe('NO');
	});
});

// Containment is asymmetric, which is why these are guards rather than a reliance on the caller:
// the network path parses inside a `.catch` and degrades to an empty box score, and the demo path
// parses synchronously in an effect, where a throw reaches the top-level ErrorBoundary and blanks
// the whole popup.
describe('parseBoxScore null elements', () => {
	test('reads a null athlete as a blank row rather than throwing', () => {
		const box = parseBoxScore({
			boxscore: { players: [{
				team: { id: '18' },
				statistics: [{ name: 'passing', labels: ['YDS'], keys: ['passingYards'], athletes: [null] }],
			}] },
		}, '1', '18', 'ATL', 'NO');
		expect(box.away?.categories[0].athletes).toEqual([{
			id: '',
			name: '',
			position: '',
			stats: [],
			starter: false,
			batOrder: 0,
			didNotPlay: false,
			didNotPlayReason: '',
		}]);
	});

	test('drops a null category rather than throwing', () => {
		const box = parseBoxScore({
			boxscore: { players: [{
				team: { id: '18' },
				statistics: [null, { name: 'passing', labels: ['YDS'], keys: ['passingYards'], athletes: [{ athlete: { shortName: 'D. Carr' }, stats: ['232'] }] }],
			}] },
		}, '1', '18', 'ATL', 'NO');
		expect(box.away?.categories.map(c => c.name)).toEqual(['passing']);
	});

	test('skips a null block while resolving the two sides', () => {
		const box = parseBoxScore({
			boxscore: {
				players: [null, {
					team: { id: '18' },
					statistics: [{ name: 'passing', labels: ['YDS'], keys: ['passingYards'], athletes: [{ athlete: { shortName: 'D. Carr' }, stats: ['232'] }] }],
				}],
				teams: [null, { team: { id: '18' }, homeAway: 'away', statistics: [{ name: 'saves', label: 'Saves', displayValue: '8' }] }],
			},
		}, '1', '18', 'ATL', 'NO');
		expect(box.away?.abbreviation).toBe('NO');
		expect(box.home).toBeNull();
	});

	test('reads a null period as an unplayed one rather than throwing', () => {
		const line = parseLineScore({
			header: { competitions: [{ competitors: [
				{ homeAway: 'away', team: { id: '18' }, score: '2', linescores: [null, { displayValue: '2', hits: 3, errors: 0 }] },
				{ homeAway: 'home', team: { id: '1' }, score: '0', linescores: [{ displayValue: '0', hits: 1, errors: 0 }] },
			] }] },
		}, '1', '18', 'ATL', 'NO');
		expect(line?.away.periods).toEqual(['', '2']);
		expect(line?.away.hits).toBe(3);
	});
});

describe('parseTeamComparison', () => {
	test('pairs the two sides by stat name', () => {
		expect(parseTeamComparison(nbaBoxScore, '24', '18')).toEqual([
			{ name: 'fieldGoalsMade-fieldGoalsAttempted', label: 'FG', away: '39-94', home: '35-88' },
			{ name: 'fieldGoalPct', label: 'Field Goal %', away: '41', home: '40' },
			{ name: 'assists', label: 'Assists', away: '20', home: '24' },
		]);
	});

	test('drops a stat only one side reports rather than shifting the rows under it', () => {
		const rows = parseTeamComparison({
			boxscore: { teams: [
				{ team: { id: '18' }, homeAway: 'away', statistics: [
					{ name: 'possessionTime', label: 'Possession', displayValue: '28:17' },
					{ name: 'sacksYardsLost', label: 'Sacks', displayValue: '4-27' },
				] },
				{ team: { id: '1' }, homeAway: 'home', statistics: [
					{ name: 'sacksYardsLost', label: 'Sacks', displayValue: '2-11' },
				] },
			] },
		}, '1', '18');
		expect(rows).toEqual([{ name: 'sacksYardsLost', label: 'Sacks', away: '4-27', home: '2-11' }]);
	});

	test('resolves soccer, which lists the home team first', () => {
		const rows = parseTeamComparison({
			boxscore: { teams: [
				{ team: { id: '183', abbreviation: 'CLB' }, homeAway: 'home', statistics: [
					{ name: 'foulsCommitted', label: 'Fouls', displayValue: '10' },
				] },
				{ team: { id: '189', abbreviation: 'NE' }, homeAway: 'away', statistics: [
					{ name: 'foulsCommitted', label: 'Fouls', displayValue: '7' },
				] },
			] },
		}, '183', '189');
		expect(rows).toEqual([{ name: 'foulsCommitted', label: 'Fouls', away: '7', home: '10' }]);
	});

	test('reads nothing from the nested tree baseball sends instead', () => {
		// `{ name, displayName, stats: [] }` is a season-shaped tree of ~100 stats, not a
		// comparison table. The shape is detected rather than the sport being listed.
		expect(parseTeamComparison(mlbBoxScore, '25', '20')).toEqual([]);
	});

	test('falls back to an abbreviation, then to the raw name, for a stat with no label', () => {
		const rows = parseTeamComparison({
			boxscore: { teams: [
				{ team: { id: '18' }, homeAway: 'away', statistics: [
					{ name: 'saves', abbreviation: 'SV', displayValue: '8' },
					{ name: 'shotsOnTarget', displayValue: '1' },
				] },
				{ team: { id: '1' }, homeAway: 'home', statistics: [
					{ name: 'saves', abbreviation: 'SV', displayValue: '3' },
					{ name: 'shotsOnTarget', displayValue: '4' },
				] },
			] },
		}, '1', '18');
		expect(rows.map(r => r.label)).toEqual(['SV', 'shotsOnTarget']);
	});

	test('reads nothing when only one side has team stats', () => {
		expect(parseTeamComparison({
			boxscore: { teams: [{ team: { id: '18' }, homeAway: 'away', statistics: [{ name: 'saves', label: 'Saves', displayValue: '8' }] }] },
		}, '1', '18')).toEqual([]);
	});
});
