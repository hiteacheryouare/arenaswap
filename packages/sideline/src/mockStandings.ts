// Demo tables for the mock slate, shaped like whichever endpoint the league really answers from,
// so the demo runs through the same parsers the live screen does rather than a simplified
// stand-in. The professional leagues and the Premier League are league→conference→division trees
// from `/apis/v2/.../standings`; college football is the flat `/summary` block, because that is
// what the three college leagues fall back to.
//
// Terse on purpose. A literal copy of ESPN's payload is ~160KB for one league — most of it
// `uid`/`links`/`recordStats` the parser never reads — and these ship inside the popup bundle.

const espnCdn = 'https://a.espncdn.com/i/teamlogos';

// Only the fields the parsers read. `description` is ESPN's own wording, which the column heads
// pass through as a tooltip.
const descriptions: Record<string, string> = {
	wins: 'Wins',
	losses: 'Losses',
	ties: 'Ties',
	winPercent: 'Winning Percentage',
	gamesBehind: 'Games Behind',
	otLosses: 'Overtime Losses',
	points: 'Points',
	gamesPlayed: 'Games Played',
	pointDifferential: 'Goal Difference',
	rank: 'Rank',
	'vs. Conf.': 'Conference Record',
	overall: 'Overall Record',
};

const footballTable = ['wins', 'losses', 'ties', 'winPercent'] as const;
const basketballTable = ['wins', 'losses', 'winPercent', 'gamesBehind'] as const;
const hockeyTable = ['wins', 'losses', 'otLosses', 'points'] as const;
const baseballTable = ['wins', 'losses', 'winPercent', 'gamesBehind'] as const;
const soccerTable = ['gamesPlayed', 'wins', 'ties', 'losses', 'pointDifferential', 'points', 'rank'] as const;
const collegeRecords = ['vs. Conf.', 'overall'] as const;

const statsFor = (statNames: readonly string[], values: readonly string[]) => (
	statNames.map((name, index) => ({
		name,
		description: descriptions[name] ?? '',
		displayValue: values[index] ?? '',
	}))
);

// ── The whole league ─────────────────────────────────────────────────────────

interface mockLeagueGroup {
	// Null for a flat table like the Premier League, which has no middle level.
	conference: string | null;
	name: string;
	// Team id, the location ESPN prints, the crest slug, then one value per stat name.
	rows: readonly (readonly string[])[];
}

interface mockLeague {
	league: string;
	// ESPN files the four North American leagues' crests under an abbreviation and everything
	// else under the team id, which is why each row carries its own slug.
	logoPath: string;
	statNames: readonly string[];
	groups: readonly mockLeagueGroup[];
}

// A conference node carries children and a division node carries entries, so the two arms of the
// walk below need one declared shape to unify on.
interface mockNode {
	name: string;
	isConference: boolean;
	standings?: { entries: unknown[] };
	children?: mockNode[];
}

const divisionNode = (group: mockLeagueGroup, fixture: mockLeague): mockNode => ({
	name: group.name,
	isConference: false,
	standings: {
		entries: group.rows.map(([teamId, location, slug, ...values]) => ({
			team: {
				id: teamId,
				location,
				shortDisplayName: location,
				displayName: location,
				logos: [{ href: `${espnCdn}/${fixture.logoPath}/500/${slug}.png`, rel: ['full', 'default'] }],
			},
			stats: statsFor(fixture.statNames, values),
		})),
	},
});

// Rebuilt into the nesting the real endpoint uses — league, then conferences, then divisions —
// so `parseLeagueStandings` walks the demo exactly as it walks a live response. A flat league
// whose groups carry no conference hangs its one table straight off the root.
const expandLeague = (fixture: mockLeague) => {
	const conferences = [...new Set(fixture.groups.map(group => group.conference))];
	return {
		name: fixture.league,
		isConference: false,
		children: conferences.flatMap<mockNode>(conference => {
			const groups = fixture.groups.filter(group => group.conference === conference);
			const divisions = groups.map(group => divisionNode(group, fixture));
			return conference === null
				? divisions
				: [{ name: conference, isConference: true, children: divisions }];
		}),
	};
};

const mockLeagues: Record<string, mockLeague> = {
	'mock-5': {
		league: 'National Football League',
		logoPath: 'nfl',
		statNames: footballTable,
		groups: [
			{ conference: 'American Football Conference', name: 'AFC East', rows: [
				['2', 'Buffalo', 'buf', '2', '0', '0', '1.000'],
				['17', 'New England', 'ne', '1', '1', '0', '.500'],
				['20', 'New York', 'nyj', '1', '1', '0', '.500'],
				['15', 'Miami', 'mia', '0', '1', '0', '.000'],
			] },
			{ conference: 'American Football Conference', name: 'AFC North', rows: [
				['4', 'Cincinnati', 'cin', '2', '0', '0', '1.000'],
				['33', 'Baltimore', 'bal', '1', '1', '0', '.500'],
				['23', 'Pittsburgh', 'pit', '1', '1', '0', '.500'],
				['5', 'Cleveland', 'cle', '0', '1', '0', '.000'],
			] },
			{ conference: 'American Football Conference', name: 'AFC South', rows: [
				['30', 'Jacksonville', 'jax', '1', '0', '0', '1.000'],
				['11', 'Indianapolis', 'ind', '0', '1', '0', '.000'],
				['34', 'Houston', 'hou', '0', '2', '0', '.000'],
				['10', 'Tennessee', 'ten', '0', '2', '0', '.000'],
			] },
			{ conference: 'American Football Conference', name: 'AFC West', rows: [
				['12', 'Kansas City', 'kc', '1', '0', '0', '1.000'],
				['13', 'Las Vegas', 'lv', '1', '0', '0', '1.000'],
				['7', 'Denver', 'den', '0', '1', '0', '.000'],
				['24', 'Los Angeles', 'lac', '0', '1', '0', '.000'],
			] },
			{ conference: 'National Football Conference', name: 'NFC East', rows: [
				['21', 'Philadelphia', 'phi', '2', '0', '0', '1.000'],
				['19', 'New York', 'nyg', '1', '0', '0', '1.000'],
				['28', 'Washington', 'wsh', '0', '1', '0', '.000'],
				['6', 'Dallas', 'dal', '0', '1', '0', '.000'],
			] },
			{ conference: 'National Football Conference', name: 'NFC North', rows: [
				['16', 'Minnesota', 'min', '2', '0', '0', '1.000'],
				['8', 'Detroit', 'det', '1', '1', '0', '.500'],
				['3', 'Chicago', 'chi', '1', '1', '0', '.500'],
				['9', 'Green Bay', 'gb', '1', '1', '0', '.500'],
			] },
			{ conference: 'National Football Conference', name: 'NFC South', rows: [
				['29', 'Carolina', 'car', '1', '1', '0', '.500'],
				['18', 'New Orleans', 'no', '1', '1', '0', '.500'],
				['27', 'Tampa Bay', 'tb', '0', '1', '0', '.000'],
				['1', 'Atlanta', 'atl', '0', '2', '0', '.000'],
			] },
			{ conference: 'National Football Conference', name: 'NFC West', rows: [
				['25', 'San Francisco', 'sf', '1', '0', '0', '1.000'],
				['26', 'Seattle', 'sea', '1', '0', '0', '1.000'],
				['22', 'Arizona', 'ari', '1', '0', '0', '1.000'],
				['14', 'Los Angeles', 'lar', '0', '1', '0', '.000'],
			] },
		],
	},
	'mock-2': {
		league: 'National Basketball Association',
		logoPath: 'nba',
		statNames: basketballTable,
		groups: [
			{ conference: 'Eastern Conference', name: 'Atlantic', rows: [
				['2', 'Boston', 'bos', '0', '0', '.000', '-'],
				['17', 'Brooklyn', 'bkn', '0', '0', '.000', '-'],
				['18', 'New York', 'ny', '0', '0', '.000', '-'],
				['20', 'Philadelphia', 'phi', '0', '0', '.000', '-'],
				['28', 'Toronto', 'tor', '0', '0', '.000', '-'],
			] },
			{ conference: 'Eastern Conference', name: 'Central', rows: [
				['4', 'Chicago', 'chi', '0', '0', '.000', '-'],
				['5', 'Cleveland', 'cle', '0', '0', '.000', '-'],
				['8', 'Detroit', 'det', '0', '0', '.000', '-'],
				['11', 'Indiana', 'ind', '0', '0', '.000', '-'],
				['15', 'Milwaukee', 'mil', '0', '0', '.000', '-'],
			] },
			{ conference: 'Eastern Conference', name: 'Southeast', rows: [
				['1', 'Atlanta', 'atl', '0', '0', '.000', '-'],
				['14', 'Miami', 'mia', '0', '0', '.000', '-'],
				['19', 'Orlando', 'orl', '0', '0', '.000', '-'],
				['27', 'Washington', 'wsh', '0', '0', '.000', '-'],
				['30', 'Charlotte', 'cha', '0', '0', '.000', '-'],
			] },
			{ conference: 'Western Conference', name: 'Northwest', rows: [
				['7', 'Denver', 'den', '0', '0', '.000', '-'],
				['16', 'Minnesota', 'min', '0', '0', '.000', '-'],
				['22', 'Portland', 'por', '0', '0', '.000', '-'],
				['25', 'Oklahoma City', 'okc', '0', '0', '.000', '-'],
				['26', 'Utah', 'utah', '0', '0', '.000', '-'],
			] },
			{ conference: 'Western Conference', name: 'Pacific', rows: [
				['9', 'Golden State', 'gs', '0', '0', '.000', '-'],
				['12', 'LA', 'lac', '0', '0', '.000', '-'],
				['13', 'Los Angeles', 'lal', '0', '0', '.000', '-'],
				['21', 'Phoenix', 'phx', '0', '0', '.000', '-'],
				['23', 'Sacramento', 'sac', '0', '0', '.000', '-'],
			] },
			{ conference: 'Western Conference', name: 'Southwest', rows: [
				['3', 'New Orleans', 'no', '0', '0', '.000', '-'],
				['6', 'Dallas', 'dal', '0', '0', '.000', '-'],
				['10', 'Houston', 'hou', '0', '0', '.000', '-'],
				['24', 'San Antonio', 'sa', '0', '0', '.000', '-'],
				['29', 'Memphis', 'mem', '0', '0', '.000', '-'],
			] },
		],
	},
	'mock-3': {
		league: 'National Hockey League',
		logoPath: 'nhl',
		statNames: hockeyTable,
		groups: [
			{ conference: null, name: 'Atlantic Division', rows: [
				['10', 'Montreal', 'mtl', '2', '0', '0', '4'],
				['21', 'Toronto', 'tor', '0', '1', '1', '1'],
				['5', 'Detroit', 'det', '0', '0', '0', '0'],
				['14', 'Ottawa', 'ott', '0', '0', '0', '0'],
				['2', 'Buffalo', 'buf', '0', '0', '0', '0'],
				['26', 'Florida', 'fla', '0', '0', '0', '0'],
				['20', 'Tampa Bay', 'tb', '0', '0', '0', '0'],
				['1', 'Boston', 'bos', '0', '0', '0', '0'],
			] },
			{ conference: null, name: 'Metropolitan Division', rows: [
				['11', 'New Jersey', 'nj', '1', '0', '0', '2'],
				['23', 'Washington', 'wsh', '0', '0', '0', '0'],
				['16', 'Pittsburgh', 'pit', '0', '0', '0', '0'],
				['7', 'Carolina', 'car', '0', '0', '0', '0'],
				['29', 'Columbus', 'cbj', '0', '0', '0', '0'],
				['15', 'Philadelphia', 'phi', '0', '0', '0', '0'],
				['13', 'New York', 'nyr', '0', '0', '0', '0'],
				['12', 'New York', 'nyi', '0', '1', '0', '0'],
			] },
			{ conference: null, name: 'Central Division', rows: [
				['9', 'Dallas', 'dal', '1', '0', '0', '2'],
				['30', 'Minnesota', 'min', '1', '0', '0', '2'],
				['4', 'Chicago', 'chi', '0', '0', '1', '1'],
				['17', 'Colorado', 'col', '0', '0', '0', '0'],
				['129764', 'Utah', 'uta', '0', '0', '0', '0'],
				['27', 'Nashville', 'nsh', '0', '0', '0', '0'],
				['19', 'St. Louis', 'stl', '0', '1', '0', '0'],
				['28', 'Winnipeg', 'wpg', '0', '1', '0', '0'],
			] },
			{ conference: null, name: 'Pacific Division', rows: [
				['6', 'Edmonton', 'edm', '1', '0', '0', '2'],
				['124292', 'Seattle', 'sea', '1', '0', '0', '2'],
				['37', 'Vegas', 'vgk', '1', '0', '0', '2'],
				['25', 'Anaheim', 'ana', '0', '0', '0', '0'],
				['3', 'Calgary', 'cgy', '0', '0', '0', '0'],
				['18', 'San Jose', 'sj', '0', '0', '0', '0'],
				['22', 'Vancouver', 'van', '0', '1', '0', '0'],
				['8', 'Los Angeles', 'la', '0', '1', '0', '0'],
			] },
		],
	},
	'mock-4': {
		league: 'Major League Baseball',
		logoPath: 'mlb',
		statNames: baseballTable,
		groups: [
			{ conference: null, name: 'American League East', rows: [
				['30', 'Tampa Bay', 'tb', '95', '60', '.613', '-'],
				['10', 'New York', 'nyy', '89', '65', '.578', '5.5'],
				['2', 'Boston', 'bos', '84', '72', '.538', '11.5'],
				['14', 'Toronto', 'tor', '76', '79', '.490', '19'],
				['1', 'Baltimore', 'bal', '75', '80', '.484', '20'],
			] },
			{ conference: null, name: 'American League Central', rows: [
				['7', 'Kansas City', 'kc', '67', '89', '.429', '13.5'],
				['5', 'Cleveland', 'cle', '80', '75', '.516', '-'],
				['4', 'Chicago', 'chw', '79', '76', '.510', '1'],
				['6', 'Detroit', 'det', '73', '82', '.471', '7'],
				['9', 'Minnesota', 'min', '72', '83', '.465', '8'],
			] },
			{ conference: null, name: 'American League West', rows: [
				['11', 'Athletics', 'ath', '61', '94', '.394', '17'],
				['3', 'Los Angeles', 'laa', '60', '95', '.387', '18'],
				['13', 'Texas', 'tex', '78', '77', '.503', '-'],
				['18', 'Houston', 'hou', '77', '79', '.494', '1.5'],
				['12', 'Seattle', 'sea', '72', '83', '.465', '6'],
			] },
			{ conference: null, name: 'National League East', rows: [
				['15', 'Atlanta', 'atl', '92', '64', '.590', '-'],
				['28', 'Miami', 'mia', '76', '79', '.490', '15.5'],
				['20', 'Washington', 'wsh', '73', '83', '.468', '19'],
				['21', 'New York', 'nym', '71', '85', '.455', '21'],
				['22', 'Philadelphia', 'phi', '86', '70', '.551', '6'],
			] },
			{ conference: null, name: 'National League Central', rows: [
				['8', 'Milwaukee', 'mil', '97', '58', '.626', '-'],
				['23', 'Pittsburgh', 'pit', '79', '77', '.506', '18.5'],
				['24', 'St. Louis', 'stl', '76', '80', '.487', '21.5'],
				['17', 'Cincinnati', 'cin', '72', '84', '.462', '25.5'],
				['16', 'Chicago', 'chc', '87', '69', '.558', '10.5'],
			] },
			{ conference: null, name: 'National League West', rows: [
				['19', 'Los Angeles', 'lad', '95', '60', '.613', '-'],
				['26', 'San Francisco', 'sf', '64', '91', '.413', '31'],
				['27', 'Colorado', 'col', '57', '98', '.368', '38'],
				['25', 'San Diego', 'sd', '86', '69', '.555', '9'],
				['29', 'Arizona', 'ari', '81', '74', '.523', '14'],
			] },
		],
	},
	'mock-12': {
		league: 'English Premier League',
		logoPath: 'soccer',
		statNames: soccerTable,
		groups: [
			{ conference: null, name: '2026-27 English Premier League', rows: [
				['382', 'Manchester City', '382', '5', '5', '0', '0', '+8', '15', '1'],
				['359', 'Arsenal', '359', '5', '4', '0', '1', '+4', '12', '2'],
				['331', 'Brighton & Hove Albion', '331', '5', '3', '1', '1', '+11', '10', '3'],
				['337', 'Brentford', '337', '5', '2', '3', '0', '+6', '9', '4'],
				['357', 'Leeds United', '357', '5', '2', '3', '0', '+4', '9', '5'],
				['364', 'Liverpool', '364', '5', '2', '3', '0', '+3', '9', '6'],
				['368', 'Everton', '368', '5', '2', '3', '0', '+3', '9', '7'],
				['306', 'Hull City', '306', '5', '2', '2', '1', '+2', '8', '8'],
				['361', 'Newcastle United', '361', '5', '2', '2', '1', '0', '8', '9'],
				['363', 'Chelsea', '363', '5', '2', '1', '2', '-2', '7', '10'],
				['373', 'Ipswich Town', '373', '5', '2', '0', '3', '-4', '6', '11'],
				['360', 'Manchester United', '360', '5', '1', '2', '2', '0', '5', '12'],
				['393', 'Nottingham Forest', '393', '5', '1', '2', '2', '-1', '5', '13'],
				['366', 'Sunderland', '366', '5', '1', '1', '3', '-4', '4', '14'],
				['384', 'Crystal Palace', '384', '5', '1', '1', '3', '-5', '4', '15'],
				['362', 'Aston Villa', '362', '5', '1', '1', '3', '-5', '4', '16'],
				['349', 'AFC Bournemouth', '349', '5', '0', '3', '2', '-2', '3', '17'],
				['388', 'Coventry City', '388', '5', '1', '0', '4', '-9', '3', '18'],
				['370', 'Fulham', '370', '5', '0', '2', '3', '-3', '2', '19'],
				['367', 'Tottenham Hotspur', '367', '5', '0', '2', '3', '-6', '2', '20'],
			] },
		],
	},
};

// ── The matchup's own conference, off the summary ────────────────────────────

interface mockSummaryGroup {
	header: string;
	rows: readonly (readonly string[])[];
}

// College football and basketball send two record strings and nothing countable, and the demo
// keeps them on the summary block for the same reason the live screen does: the whole national
// table is 138 teams across 12 conferences.
const mockSummaries: Record<string, readonly mockSummaryGroup[]> = {
	'mock-6': [
		{
			header: '2026 Big Ten Conference Standings',
			rows: [
				['194', 'Ohio State', '2-0', '4-0'],
				['213', 'Penn State', '1-0', '3-1'],
				['130', 'Michigan', '1-1', '3-1'],
				['275', 'Wisconsin', '0-1', '2-2'],
				['2294', 'Iowa', '0-2', '2-2'],
			],
		},
		{
			header: '2026 American Athletic Conference Standings',
			rows: [
				['235', 'Memphis', '2-0', '4-0'],
				['151', 'East Carolina', '1-0', '3-1'],
				['218', 'Temple', '0-1', '1-3'],
				['58', 'South Florida', '0-2', '1-3'],
			],
		},
	],
};

const expandSummary = (groups: readonly mockSummaryGroup[]) => ({
	standings: {
		groups: groups.map(group => ({
			header: group.header,
			standings: {
				entries: group.rows.map(([teamId, name, ...values]) => ({
					team: name,
					id: teamId,
					logo: [{ href: `${espnCdn}/ncaa/500/${teamId}.png`, rel: ['full', 'default'] }],
					stats: statsFor(collegeRecords, values),
				})),
			},
		})),
	},
});

export const mockStandingsPayloads: Record<string, unknown> = {
	...Object.fromEntries(Object.entries(mockLeagues).map(([gameId, fixture]) => [gameId, expandLeague(fixture)])),
	...Object.fromEntries(Object.entries(mockSummaries).map(([gameId, groups]) => [gameId, expandSummary(groups)])),
};

export default mockStandingsPayloads;
