import { parseLeagueStandings, parseStandings, usesFullLeagueStandings } from '../entrypoints/popup/components/standingsParse';

// Every payload below is transcribed off a live ESPN response: the league tables from
// `/apis/v2/sports/{path}/standings?level=3` (NFL, Premier League) and the division blocks from
// `/summary` (an ACC college football matchup, an Olympic men's hockey group, a World Cup
// knockout tie).

const stat = (name: string, displayValue: string, description = '') => ({ name, description, displayValue });

const nflTeam = (id: string, location: string, slug: string) => ({
	id,
	location,
	shortDisplayName: location,
	displayName: `${location} Team`,
	logos: [
		{ href: `https://a.espncdn.com/i/teamlogos/nfl/500/${slug}.png`, rel: ['full', 'default'] },
		{ href: `https://a.espncdn.com/i/teamlogos/nfl/500-dark/${slug}.png`, rel: ['full', 'dark'] },
	],
});

// The league endpoint sends `vs. Conf.` and `overall` *alongside* real wins and losses, which is
// the whole reason the record columns are a fallback rather than a preference.
const nflStats = (wins: string, losses: string, ties: string, pct: string) => [
	stat('gamesBehind', '-'),
	stat('losses', losses, 'Losses'),
	stat('playoffSeed', '1'),
	stat('ties', ties),
	stat('winPercent', pct, 'Winning Percentage'),
	stat('wins', wins, 'Wins'),
	stat('overall', `${wins}-${losses}`),
	stat('vs. Conf.', '1-0'),
];

const nflLeague = {
	name: 'National Football League',
	isConference: false,
	children: [
		{
			name: 'American Football Conference',
			isConference: true,
			children: [
				{
					name: 'AFC East',
					isConference: false,
					standings: {
						entries: [
							{ team: nflTeam('2', 'Buffalo', 'buf'), stats: nflStats('2', '0', '0', '1.000') },
							{ team: nflTeam('20', 'New York', 'nyj'), stats: nflStats('1', '1', '0', '.500') },
						],
					},
				},
				{
					name: 'AFC North',
					isConference: false,
					standings: {
						entries: [
							{ team: nflTeam('4', 'Cincinnati', 'cin'), stats: nflStats('2', '0', '0', '1.000') },
							{ team: nflTeam('23', 'Pittsburgh', 'pit'), stats: nflStats('1', '1', '0', '.500') },
						],
					},
				},
			],
		},
		{
			name: 'National Football Conference',
			isConference: true,
			children: [
				{
					name: 'NFC East',
					isConference: false,
					standings: {
						entries: [
							{ team: nflTeam('21', 'Philadelphia', 'phi'), stats: nflStats('2', '0', '0', '1.000') },
							{ team: nflTeam('6', 'Dallas', 'dal'), stats: nflStats('1', '1', '0', '.500') },
						],
					},
				},
			],
		},
	],
};

describe('parseLeagueStandings', () => {
	test('walks the whole league rather than the matchup division', () => {
		const groups = parseLeagueStandings(nflLeague, 'football');
		expect(groups.map(group => group.header)).toEqual(['AFC East', 'AFC North', 'NFC East']);
	});

	test('carries the conference down to the divisions under it', () => {
		const groups = parseLeagueStandings(nflLeague, 'football');
		expect(groups.map(group => group.conference)).toEqual([
			'American Football Conference',
			'American Football Conference',
			'National Football Conference',
		]);
	});

	test('prefers the countable columns over the record strings sent beside them', () => {
		const [group] = parseLeagueStandings(nflLeague, 'football');
		expect(group?.columns.map(column => column.labelKey)).toEqual([
			'standings.wins',
			'standings.losses',
			'standings.ties',
			'standings.winPercent',
		]);
	});

	test('lines each row up with the columns it chose', () => {
		const [group] = parseLeagueStandings(nflLeague, 'football');
		expect(group?.rows[0]).toMatchObject({ teamId: '2', name: 'Buffalo', values: ['2', '0', '0', '1.000'] });
	});

	test('takes the plain crest rather than the one drawn for a dark background', () => {
		const [group] = parseLeagueStandings(nflLeague, 'football');
		expect(group?.rows[0]?.logo).toBe('https://a.espncdn.com/i/teamlogos/nfl/500/buf.png');
	});

	test('carries ESPN own wording through as the column description', () => {
		const [group] = parseLeagueStandings(nflLeague, 'football');
		expect(group?.columns[0]?.description).toBe('Wins');
	});

	test('leaves a flat league without a conference over it', () => {
		const epl = {
			name: 'Premier League',
			isConference: false,
			children: [{
				name: '2026-27 English Premier League',
				isConference: false,
				standings: {
					entries: [
						{
							team: { id: '382', location: 'Manchester City', logos: [] },
							stats: [
								stat('gamesPlayed', '5'), stat('losses', '0'), stat('pointDifferential', '+8'),
								stat('points', '15'), stat('ties', '0'), stat('wins', '5'), stat('rank', '1'),
							],
						},
						{
							team: { id: '364', location: 'Liverpool', logos: [] },
							stats: [
								stat('gamesPlayed', '5'), stat('losses', '0'), stat('pointDifferential', '+3'),
								stat('points', '9'), stat('ties', '3'), stat('wins', '2'), stat('rank', '6'),
							],
						},
					],
				},
			}],
		};
		const groups = parseLeagueStandings(epl, 'soccer');
		expect(groups).toHaveLength(1);
		expect(groups[0]?.conference).toBeNull();
		expect(groups[0]?.columns.map(column => column.labelKey)).toEqual([
			'standings.gamesPlayed',
			'standings.wins',
			'standings.draws',
			'standings.losses',
			'standings.goalDifference',
			'standings.soccerPoints',
		]);
		expect(groups[0]?.rows[0]?.rank).toBe('1');
	});

	test('drops a one-team group, which is how a college league answers out of season', () => {
		const preseason = {
			name: 'NCAAH',
			isConference: false,
			children: [{
				name: 'Big Ten Conference',
				isConference: false,
				standings: {
					entries: [{ team: { id: '77', location: 'Michigan State', logos: [] }, stats: [stat('wins', '0'), stat('losses', '0')] }],
				},
			}],
		};
		expect(parseLeagueStandings(preseason, 'hockey')).toEqual([]);
	});

	test('reads no rank for a division, which publishes none', () => {
		const [group] = parseLeagueStandings(nflLeague, 'football');
		expect(group?.rows.map(row => row.rank)).toEqual([null, null]);
	});

	test('reads nothing from an unrecognized payload or an unknown sport', () => {
		expect(parseLeagueStandings(undefined, 'football')).toEqual([]);
		expect(parseLeagueStandings(nflLeague, undefined)).toEqual([]);
	});
});

describe('usesFullLeagueStandings', () => {
	test('sends every league to the whole table except the three oversized college ones', () => {
		expect(usesFullLeagueStandings('nfl')).toBe(true);
		expect(usesFullLeagueStandings('epl')).toBe(true);
		expect(usesFullLeagueStandings('cbase')).toBe(true);
		expect(usesFullLeagueStandings('ncaab')).toBe(false);
		expect(usesFullLeagueStandings('ncaaw')).toBe(false);
		expect(usesFullLeagueStandings('ncaaf')).toBe(false);
	});
});

describe('parseStandings, the summary fallback', () => {
	const college = {
		standings: {
			groups: [{
				header: '2026 Atlantic Coast Conference Standings',
				standings: {
					entries: [
						{ team: 'Miami', id: '2390', stats: [stat('overall', '3-0', 'Overall Record'), stat('vs. Conf.', '2-0')] },
						{ team: 'Louisville', id: '97', stats: [stat('overall', '2-1'), stat('vs. Conf.', '1-1')] },
					],
				},
			}],
		},
	};

	test('reads the record strings a college conference sends instead of a win column', () => {
		const [group] = parseStandings(college, 'football', '154', '2390');
		expect(group?.columns.map(column => column.labelKey)).toEqual(['standings.conference', 'standings.overall']);
		expect(group?.rows[0]?.values).toEqual(['2-0', '3-0']);
	});

	test('trims the word the tab above the table already says', () => {
		const [group] = parseStandings(college, 'football', '154', '2390');
		expect(group?.header).toBe('2026 Atlantic Coast Conference');
	});

	test('knows nothing about a conference above it', () => {
		const [group] = parseStandings(college, 'football', '154', '2390');
		expect(group?.conference).toBeNull();
	});

	test('drops a group holding neither team, which is a World Cup knockout tie', () => {
		const knockout = {
			standings: {
				groups: [{
					header: 'FIFA World Cup Standings',
					standings: {
						entries: [
							{ team: 'Belgium', id: '124', stats: [stat('wins', '1'), stat('points', '5'), stat('rank', '1')] },
							{ team: 'Croatia', id: '111', stats: [stat('wins', '2'), stat('points', '7'), stat('rank', '2')] },
						],
					},
				}],
			},
		};
		expect(parseStandings(knockout, 'soccer', '656', '6757')).toEqual([]);
	});

	test('drops a group whose teams arrived with no stats at all, which is Olympic hockey', () => {
		const olympic = {
			standings: {
				groups: [{
					header: '2025-26 Group A Standings',
					standings: { entries: [{ team: 'Canada', id: '72', stats: [] }, { team: 'Czechia', id: '21', stats: [] }] },
				}],
			},
		};
		expect(parseStandings(olympic, 'hockey', '72', '21')).toEqual([]);
	});

	test('reads nothing from a summary with no standings block', () => {
		expect(parseStandings({ boxscore: {} }, 'hockey', '1', '2')).toEqual([]);
		expect(parseStandings(undefined, 'hockey', '1', '2')).toEqual([]);
	});
});
