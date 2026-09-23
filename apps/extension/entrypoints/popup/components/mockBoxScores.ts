// Demo-mode box scores, shaped exactly like ESPN's `/summary` payload so the mock path runs
// through `parseBoxScore` rather than around it. A fabricated parsed object would let the parser
// and the screen drift apart without any test noticing.
//
// Five games, one per sport we ship a live demo game for, so every table on this screen — the
// R-H-E line, both clock-sport line scores, all four category shapes and the team comparison — is
// reachable in September without waiting on a real slate. A sixth covers the finished game, whose
// line score has to read as a completed one rather than as a live game's.

interface mockRow {
	name: string;
	position?: string;
	stats: string[];
	starter?: boolean;
	batOrder?: number;
	didNotPlayReason?: string;
}

const category = (name: string, keys: string[], labels: string[], rows: mockRow[], totals: string[] = []) => ({
	name,
	keys,
	labels,
	descriptions: labels,
	totals,
	athletes: rows.map((row, index) => ({
		athlete: {
			id: `${name || 'players'}-${index}`,
			shortName: row.name,
			position: row.position ? { abbreviation: row.position } : undefined,
		},
		stats: row.stats,
		starter: row.starter ?? false,
		batOrder: row.batOrder ?? 0,
		didNotPlay: row.didNotPlayReason !== undefined,
		reason: row.didNotPlayReason,
	})),
});

interface mockLinePeriod {
	displayValue: string;
	hits?: number;
	errors?: number;
}

const competitor = (side: 'home' | 'away', id: string, abbreviation: string, score: string, linescores: mockLinePeriod[]) => ({
	homeAway: side,
	team: { id, abbreviation },
	score,
	linescores,
});

const teamStats = (id: string, side: 'home' | 'away', stats: [string, string, string][]) => ({
	team: { id },
	homeAway: side,
	statistics: stats.map(([name, label, displayValue]) => ({ name, label, displayValue })),
});

// ── mock-2 · NBA · CHI 65 @ PHI 68, third quarter ─────────────────────────────
const basketballKeys = [
	'minutes', 'points', 'rebounds', 'assists',
	'fieldGoalsMade-fieldGoalsAttempted', 'threePointFieldGoalsMade-threePointFieldGoalsAttempted',
];
const basketballLabels = ['MIN', 'PTS', 'REB', 'AST', 'FG', '3PT'];

const basketball = {
	header: { competitions: [{ competitors: [
		competitor('away', '4', 'CHI', '65', [{ displayValue: '22' }, { displayValue: '21' }, { displayValue: '22' }]),
		competitor('home', '20', 'PHI', '68', [{ displayValue: '25' }, { displayValue: '20' }, { displayValue: '23' }]),
	] }] },
	boxscore: {
		players: [
			{
				team: { id: '4', abbreviation: 'CHI' },
				// Basketball's single category arrives with no name of its own.
				statistics: [category('', basketballKeys, basketballLabels, [
					{ name: 'C. White', position: 'G', starter: true, stats: ['28', '19', '3', '5', '7-14', '3-7'] },
					{ name: 'N. Vucevic', position: 'C', starter: true, stats: ['26', '14', '9', '2', '6-11', '1-3'] },
					{ name: 'J. Giddey', position: 'G', starter: true, stats: ['27', '11', '7', '6', '4-9', '1-2'] },
					{ name: 'P. Williams', position: 'F', starter: true, stats: ['24', '8', '4', '1', '3-8', '2-5'] },
					{ name: 'M. Buzelis', position: 'F', starter: true, stats: ['22', '7', '5', '0', '3-6', '1-2'] },
					{ name: 'A. Dosunmu', position: 'G', stats: ['14', '4', '1', '3', '2-5', '0-1'] },
					{ name: 'D. Terry', position: 'G', stats: ['9', '2', '2', '1', '1-4', '0-2'] },
					{ name: 'Z. Collins', position: 'C', didNotPlayReason: "COACH'S DECISION", stats: [] },
				], ['', '65', '31', '18', '26-57', '8-22'])],
			},
			{
				team: { id: '20', abbreviation: 'PHI' },
				statistics: [category('', basketballKeys, basketballLabels, [
					{ name: 'T. Maxey', position: 'G', starter: true, stats: ['29', '24', '2', '7', '9-16', '4-8'] },
					{ name: 'J. Embiid', position: 'C', starter: true, stats: ['25', '18', '11', '3', '7-13', '0-1'] },
					{ name: 'P. George', position: 'F', starter: true, stats: ['28', '12', '6', '4', '5-12', '2-6'] },
					{ name: 'K. Oubre Jr.', position: 'F', starter: true, stats: ['23', '8', '4', '1', '3-9', '1-4'] },
					{ name: 'A. Drummond', position: 'C', starter: true, stats: ['18', '4', '8', '0', '2-4', '0-0'] },
					{ name: 'E. Gordon', position: 'G', stats: ['16', '2', '1', '2', '1-6', '0-3'] },
					{ name: 'J. McCain', position: 'G', stats: ['11', '0', '2', '1', '0-3', '0-2'] },
				], ['', '68', '34', '18', '27-63', '7-24'])],
			},
		],
		teams: [
			teamStats('4', 'away', [
				['fieldGoalsMade-fieldGoalsAttempted', 'FG', '26-57'],
				['threePointFieldGoalsMade-threePointFieldGoalsAttempted', '3PT', '8-22'],
				['freeThrowsMade-freeThrowsAttempted', 'FT', '5-7'],
				['totalRebounds', 'Rebounds', '31'],
				['assists', 'Assists', '18'],
				['totalTurnovers', 'Total Turnovers', '9'],
				['steals', 'Steals', '4'],
				['blocks', 'Blocks', '2'],
			]),
			teamStats('20', 'home', [
				['fieldGoalsMade-fieldGoalsAttempted', 'FG', '27-63'],
				['threePointFieldGoalsMade-threePointFieldGoalsAttempted', '3PT', '7-24'],
				['freeThrowsMade-freeThrowsAttempted', 'FT', '7-8'],
				['totalRebounds', 'Rebounds', '34'],
				['assists', 'Assists', '18'],
				['totalTurnovers', 'Total Turnovers', '6'],
				['steals', 'Steals', '6'],
				['blocks', 'Blocks', '5'],
			]),
		],
	},
};

// ── mock-4 · MLB · NYM 2 @ PHI 3, top of the eighth ──────────────────────────
const battingKeys = ['hits-atBats', 'atBats', 'runs', 'hits', 'RBIs', 'homeRuns', 'walks', 'strikeouts'];
const battingLabels = ['H-AB', 'AB', 'R', 'H', 'RBI', 'HR', 'BB', 'K'];
const pitchingKeys = ['fullInnings.partInnings', 'hits', 'runs', 'earnedRuns', 'walks', 'strikeouts'];
const pitchingLabels = ['IP', 'H', 'R', 'ER', 'BB', 'K'];

const baseball = {
	header: { competitions: [{ competitors: [
		competitor('away', '21', 'NYM', '2', [
			{ displayValue: '0', hits: 1, errors: 0 },
			{ displayValue: '1', hits: 2, errors: 0 },
			{ displayValue: '0', hits: 0, errors: 0 },
			{ displayValue: '0', hits: 1, errors: 1 },
			{ displayValue: '0', hits: 0, errors: 0 },
			{ displayValue: '1', hits: 2, errors: 0 },
			{ displayValue: '0', hits: 0, errors: 0 },
			{ displayValue: '0', hits: 1, errors: 0 },
		]),
		// One entry short, because the bottom of the eighth has not been played.
		competitor('home', '22', 'PHI', '3', [
			{ displayValue: '1', hits: 2, errors: 0 },
			{ displayValue: '0', hits: 0, errors: 0 },
			{ displayValue: '0', hits: 1, errors: 0 },
			{ displayValue: '2', hits: 3, errors: 0 },
			{ displayValue: '0', hits: 0, errors: 1 },
			{ displayValue: '0', hits: 1, errors: 0 },
			{ displayValue: '0', hits: 0, errors: 0 },
		]),
	] }] },
	boxscore: {
		players: [
			{
				team: { id: '21', abbreviation: 'NYM' },
				statistics: [
					category('batting', battingKeys, battingLabels, [
						{ name: 'F. Lindor', position: 'SS', starter: true, batOrder: 1, stats: ['1-4', '4', '0', '1', '0', '0', '0', '1'] },
						{ name: 'J. Soto', position: 'RF', starter: true, batOrder: 2, stats: ['2-4', '4', '1', '2', '1', '1', '0', '0'] },
						{ name: 'P. Alonso', position: '1B', starter: true, batOrder: 3, stats: ['1-4', '4', '1', '1', '1', '0', '0', '2'] },
						{ name: 'B. Nimmo', position: 'LF', starter: true, batOrder: 4, stats: ['0-3', '3', '0', '0', '0', '0', '1', '1'] },
						{ name: 'M. Vientos', position: '3B', starter: true, batOrder: 5, stats: ['1-4', '4', '0', '1', '0', '0', '0', '1'] },
						{ name: 'J. Baty', position: '2B', starter: true, batOrder: 6, stats: ['1-3', '3', '0', '1', '0', '0', '0', '0'] },
						{ name: 'T. Nimmo', position: 'PH', batOrder: 6, stats: ['0-1', '1', '0', '0', '0', '0', '0', '1'] },
						{ name: 'L. Torrens', position: 'C', starter: true, batOrder: 7, stats: ['1-3', '3', '0', '1', '0', '0', '0', '1'] },
						{ name: 'T. Taylor', position: 'CF', starter: true, batOrder: 8, stats: ['0-3', '3', '0', '0', '0', '0', '0', '2'] },
					], ['7-29', '29', '2', '7', '2', '1', '1', '9']),
					category('pitching', pitchingKeys, pitchingLabels, [
						{ name: 'K. Senga', position: 'SP', starter: true, stats: ['5.2', '6', '3', '3', '2', '7'] },
						{ name: 'R. Garrett', position: 'RP', stats: ['1.1', '1', '0', '0', '0', '2'] },
					], ['7.0', '7', '3', '3', '2', '9']),
				],
			},
			{
				team: { id: '22', abbreviation: 'PHI' },
				statistics: [
					category('batting', battingKeys, battingLabels, [
						{ name: 'K. Schwarber', position: 'DH', starter: true, batOrder: 1, stats: ['1-3', '3', '1', '1', '1', '1', '1', '1'] },
						{ name: 'T. Turner', position: 'SS', starter: true, batOrder: 2, stats: ['2-4', '4', '1', '2', '0', '0', '0', '0'] },
						{ name: 'B. Harper', position: '1B', starter: true, batOrder: 3, stats: ['1-4', '4', '0', '1', '2', '0', '0', '1'] },
						{ name: 'A. Bohm', position: '3B', starter: true, batOrder: 4, stats: ['1-4', '4', '1', '1', '0', '0', '0', '1'] },
						{ name: 'N. Castellanos', position: 'RF', starter: true, batOrder: 5, stats: ['1-3', '3', '0', '1', '0', '0', '0', '1'] },
						{ name: 'B. Marsh', position: 'LF', starter: true, batOrder: 6, stats: ['0-3', '3', '0', '0', '0', '0', '1', '2'] },
						{ name: 'J. Realmuto', position: 'C', starter: true, batOrder: 7, stats: ['1-3', '3', '0', '1', '0', '0', '0', '0'] },
						{ name: 'B. Stott', position: '2B', starter: true, batOrder: 8, stats: ['0-3', '3', '0', '0', '0', '0', '0', '1'] },
						{ name: 'J. Rojas', position: 'CF', starter: true, batOrder: 9, stats: ['0-2', '2', '0', '0', '0', '0', '0', '1'] },
					], ['7-29', '29', '3', '7', '3', '1', '2', '8']),
					category('pitching', pitchingKeys, pitchingLabels, [
						{ name: 'Z. Wheeler', position: 'SP', starter: true, stats: ['6.0', '5', '1', '1', '1', '8'] },
						{ name: 'M. Strahm', position: 'RP', stats: ['1.0', '1', '1', '1', '0', '1'] },
						{ name: 'J. Romano', position: 'RP', stats: ['1.0', '1', '0', '0', '0', '2'] },
					], ['8.0', '7', '2', '2', '1', '11']),
				],
			},
		],
		// Baseball's nested season-shaped tree, which the comparison table correctly reads nothing
		// from — the R-H-E above is already the team line.
		teams: [
			{ team: { id: '21' }, homeAway: 'away', statistics: [{ name: 'batting', displayName: 'Batting', stats: [{ name: 'atBats', displayValue: '29' }] }] },
			{ team: { id: '22' }, homeAway: 'home', statistics: [{ name: 'batting', displayName: 'Batting', stats: [{ name: 'atBats', displayValue: '29' }] }] },
		],
	},
};

// ── mock-20 · MLB · NYM 2 @ PHI 3, final in ten innings ──────────────────────
// The one finished demo game, and it needs its own line score: the fixture above stops in the top
// of the eighth, so borrowing it drew Final/10 over an eight-inning card with a blank bottom of
// the 8th. Both rows run the full ten here, and every total sums to what the row above it says.
const baseballFinal = {
	header: { competitions: [{ competitors: [
		competitor('away', '21', 'NYM', '2', [
			{ displayValue: '0', hits: 1, errors: 0 },
			{ displayValue: '1', hits: 2, errors: 0 },
			{ displayValue: '0', hits: 0, errors: 0 },
			{ displayValue: '0', hits: 1, errors: 1 },
			{ displayValue: '0', hits: 0, errors: 0 },
			{ displayValue: '1', hits: 2, errors: 0 },
			{ displayValue: '0', hits: 0, errors: 0 },
			{ displayValue: '0', hits: 1, errors: 0 },
			{ displayValue: '0', hits: 0, errors: 0 },
			{ displayValue: '0', hits: 1, errors: 0 },
		]),
		// The home side bats in the bottom of the tenth and the winning run ends it, so both rows
		// are the same length rather than the away side running one half-inning long.
		competitor('home', '22', 'PHI', '3', [
			{ displayValue: '1', hits: 2, errors: 0 },
			{ displayValue: '0', hits: 0, errors: 0 },
			{ displayValue: '0', hits: 1, errors: 0 },
			{ displayValue: '0', hits: 1, errors: 0 },
			{ displayValue: '0', hits: 0, errors: 1 },
			{ displayValue: '1', hits: 1, errors: 0 },
			{ displayValue: '0', hits: 0, errors: 0 },
			{ displayValue: '0', hits: 1, errors: 0 },
			{ displayValue: '0', hits: 0, errors: 0 },
			{ displayValue: '1', hits: 2, errors: 0 },
		]),
	] }] },
	boxscore: {
		players: [
			{
				team: { id: '21', abbreviation: 'NYM' },
				statistics: [
					category('batting', battingKeys, battingLabels, [
						{ name: 'F. Lindor', position: 'SS', starter: true, batOrder: 1, stats: ['1-5', '5', '0', '1', '0', '0', '0', '1'] },
						{ name: 'J. Soto', position: 'RF', starter: true, batOrder: 2, stats: ['2-5', '5', '1', '2', '1', '1', '0', '0'] },
						{ name: 'P. Alonso', position: '1B', starter: true, batOrder: 3, stats: ['1-4', '4', '1', '1', '0', '0', '1', '2'] },
						{ name: 'B. Nimmo', position: 'LF', starter: true, batOrder: 4, stats: ['0-4', '4', '0', '0', '0', '0', '1', '1'] },
						{ name: 'M. Vientos', position: '3B', starter: true, batOrder: 5, stats: ['1-4', '4', '0', '1', '1', '0', '0', '1'] },
						{ name: 'J. Baty', position: '2B', starter: true, batOrder: 6, stats: ['1-3', '3', '0', '1', '0', '0', '0', '0'] },
						{ name: 'T. Nimmo', position: 'PH', batOrder: 6, stats: ['0-1', '1', '0', '0', '0', '0', '0', '1'] },
						{ name: 'L. Torrens', position: 'C', starter: true, batOrder: 7, stats: ['1-4', '4', '0', '1', '0', '0', '0', '1'] },
						{ name: 'T. Taylor', position: 'CF', starter: true, batOrder: 8, stats: ['1-4', '4', '0', '1', '0', '0', '0', '2'] },
					], ['8-34', '34', '2', '8', '2', '1', '2', '9']),
					category('pitching', pitchingKeys, pitchingLabels, [
						{ name: 'K. Senga', position: 'SP', starter: true, stats: ['5.2', '4', '1', '1', '2', '7'] },
						{ name: 'R. Garrett', position: 'RP', stats: ['2.1', '2', '1', '1', '1', '2'] },
						{ name: 'E. Diaz', position: 'RP', stats: ['1.0', '1', '0', '0', '0', '2'] },
						{ name: 'H. Brazoban', position: 'RP', stats: ['0.1', '1', '1', '1', '0', '0'] },
					], ['9.1', '8', '3', '3', '3', '11']),
				],
			},
			{
				team: { id: '22', abbreviation: 'PHI' },
				statistics: [
					category('batting', battingKeys, battingLabels, [
						{ name: 'K. Schwarber', position: 'DH', starter: true, batOrder: 1, stats: ['1-4', '4', '1', '1', '1', '1', '1', '1'] },
						{ name: 'T. Turner', position: 'SS', starter: true, batOrder: 2, stats: ['2-5', '5', '1', '2', '0', '0', '0', '0'] },
						{ name: 'B. Harper', position: '1B', starter: true, batOrder: 3, stats: ['1-5', '5', '0', '1', '1', '0', '0', '1'] },
						{ name: 'A. Bohm', position: '3B', starter: true, batOrder: 4, stats: ['1-5', '5', '1', '1', '0', '0', '0', '1'] },
						{ name: 'N. Castellanos', position: 'RF', starter: true, batOrder: 5, stats: ['1-4', '4', '0', '1', '1', '0', '0', '1'] },
						{ name: 'B. Marsh', position: 'LF', starter: true, batOrder: 6, stats: ['0-4', '4', '0', '0', '0', '0', '1', '2'] },
						{ name: 'J. Realmuto', position: 'C', starter: true, batOrder: 7, stats: ['1-4', '4', '0', '1', '0', '0', '0', '0'] },
						{ name: 'B. Stott', position: '2B', starter: true, batOrder: 8, stats: ['1-4', '4', '0', '1', '0', '0', '0', '1'] },
						{ name: 'J. Rojas', position: 'CF', starter: true, batOrder: 9, stats: ['0-3', '3', '0', '0', '0', '0', '0', '2'] },
					], ['8-38', '38', '3', '8', '3', '1', '2', '9']),
					category('pitching', pitchingKeys, pitchingLabels, [
						{ name: 'Z. Wheeler', position: 'SP', starter: true, stats: ['7.0', '5', '1', '1', '1', '9'] },
						{ name: 'M. Strahm', position: 'RP', stats: ['1.0', '1', '1', '1', '1', '1'] },
						{ name: 'J. Romano', position: 'RP', stats: ['1.0', '1', '0', '0', '0', '2'] },
						{ name: 'O. Kerkering', position: 'RP', stats: ['1.0', '1', '0', '0', '0', '1'] },
					], ['10.0', '8', '2', '2', '2', '13']),
				],
			},
		],
		teams: [
			{ team: { id: '21' }, homeAway: 'away', statistics: [{ name: 'batting', displayName: 'Batting', stats: [{ name: 'atBats', displayValue: '34' }] }] },
			{ team: { id: '22' }, homeAway: 'home', statistics: [{ name: 'batting', displayName: 'Batting', stats: [{ name: 'atBats', displayValue: '38' }] }] },
		],
	},
};

// ── mock-5 · NFL · DAL 14 @ PHI 17, fourth quarter ───────────────────────────
const passingKeys = ['completions/passingAttempts', 'passingYards', 'yardsPerPassAttempt', 'passingTouchdowns', 'interceptions', 'sacks-sackYardsLost'];
const passingLabels = ['C/ATT', 'YDS', 'AVG', 'TD', 'INT', 'SACKS'];
const rushingKeys = ['rushingAttempts', 'rushingYards', 'yardsPerRushAttempt', 'rushingTouchdowns', 'longRushing'];
const rushingLabels = ['CAR', 'YDS', 'AVG', 'TD', 'LONG'];
const receivingKeys = ['receptions', 'receivingYards', 'yardsPerReception', 'receivingTouchdowns', 'longReception', 'receivingTargets'];
const receivingLabels = ['REC', 'YDS', 'AVG', 'TD', 'LONG', 'TGTS'];
const defensiveKeys = ['totalTackles', 'soloTackles', 'sacks', 'tacklesForLoss', 'passesDefended', 'defensiveTouchdowns'];
const defensiveLabels = ['TOT', 'SOLO', 'SACKS', 'TFL', 'PD', 'TD'];
const interceptionKeys = ['interceptions', 'interceptionYards', 'interceptionTouchdowns'];
const interceptionLabels = ['INT', 'YDS', 'TD'];

const football = {
	header: { competitions: [{ competitors: [
		competitor('away', '6', 'DAL', '14', [{ displayValue: '7' }, { displayValue: '0' }, { displayValue: '7' }, { displayValue: '0' }]),
		competitor('home', '21', 'PHI', '17', [{ displayValue: '3' }, { displayValue: '7' }, { displayValue: '0' }, { displayValue: '7' }]),
	] }] },
	boxscore: {
		players: [
			{
				team: { id: '6', abbreviation: 'DAL' },
				statistics: [
					category('passing', passingKeys, passingLabels, [
						{ name: 'Dak Prescott', stats: ['19/29', '213', '7.3', '1', '1', '3-19'] },
					]),
					category('rushing', rushingKeys, rushingLabels, [
						{ name: 'Javonte Williams', stats: ['16', '74', '4.6', '1', '18'] },
						{ name: 'Rico Dowdle', stats: ['7', '31', '4.4', '0', '11'] },
						{ name: 'Dak Prescott', stats: ['3', '9', '3.0', '0', '6'] },
					]),
					category('receiving', receivingKeys, receivingLabels, [
						{ name: 'CeeDee Lamb', stats: ['7', '96', '13.7', '1', '31', '11'] },
						{ name: 'George Pickens', stats: ['5', '61', '12.2', '0', '22', '8'] },
						{ name: 'Jake Ferguson', stats: ['4', '38', '9.5', '0', '14', '5'] },
						{ name: 'Javonte Williams', stats: ['3', '18', '6.0', '0', '9', '3'] },
					]),
					// Eight rows against a cap of six, so the expander is reachable in demo mode.
					category('defensive', defensiveKeys, defensiveLabels, [
						{ name: 'DaRon Bland', stats: ['9', '7', '0', '1', '2', '0'] },
						{ name: 'Micah Parsons', stats: ['7', '5', '1.5', '3', '1', '0'] },
						{ name: 'Donovan Wilson', stats: ['6', '4', '0', '0', '1', '0'] },
						{ name: 'Osa Odighizuwa', stats: ['5', '3', '0.5', '2', '0', '0'] },
						{ name: 'Trevon Diggs', stats: ['4', '4', '0', '0', '3', '0'] },
						{ name: 'Marist Liufau', stats: ['4', '2', '0', '1', '0', '0'] },
						{ name: 'Juanyeh Thomas', stats: ['3', '2', '0', '0', '0', '0'] },
						{ name: 'Solomon Thomas', stats: ['2', '1', '1.0', '1', '0', '0'] },
					]),
					category('interceptions', interceptionKeys, interceptionLabels, [
						{ name: 'DaRon Bland', stats: ['1', '27', '0'] },
					]),
				],
			},
			{
				team: { id: '21', abbreviation: 'PHI' },
				statistics: [
					category('passing', passingKeys, passingLabels, [
						{ name: 'Jalen Hurts', stats: ['16/24', '188', '7.8', '2', '0', '1-8'] },
					]),
					category('rushing', rushingKeys, rushingLabels, [
						{ name: 'Saquon Barkley', stats: ['21', '119', '5.7', '0', '34'] },
						{ name: 'Jalen Hurts', stats: ['6', '22', '3.7', '1', '9'] },
					]),
					category('receiving', receivingKeys, receivingLabels, [
						{ name: 'A.J. Brown', stats: ['6', '84', '14.0', '1', '29', '9'] },
						{ name: 'DeVonta Smith', stats: ['5', '57', '11.4', '1', '19', '7'] },
						{ name: 'Dallas Goedert', stats: ['3', '31', '10.3', '0', '13', '4'] },
						{ name: 'Saquon Barkley', stats: ['2', '16', '8.0', '0', '10', '2'] },
					]),
					category('defensive', defensiveKeys, defensiveLabels, [
						{ name: 'Zack Baun', stats: ['11', '8', '0', '2', '1', '0'] },
						{ name: 'Nakobe Dean', stats: ['8', '6', '0', '1', '0', '0'] },
						{ name: 'Jalen Carter', stats: ['6', '4', '2.0', '3', '0', '0'] },
						{ name: 'Reed Blankenship', stats: ['5', '4', '0', '0', '2', '0'] },
						{ name: 'Quinyon Mitchell', stats: ['4', '4', '0', '0', '2', '0'] },
						{ name: 'Nolan Smith Jr.', stats: ['3', '2', '1.0', '2', '0', '0'] },
						{ name: 'C.J. Gardner-Johnson', stats: ['3', '2', '0', '0', '1', '0'] },
					]),
				],
			},
		],
		teams: [
			teamStats('6', 'away', [
				['firstDowns', '1st Downs', '17'],
				['totalYards', 'Total Yards', '327'],
				['netPassingYards', 'Passing', '194'],
				['rushingYards', 'Rushing', '133'],
				['thirdDownEff', '3rd down efficiency', '5-13'],
				['totalPenaltiesYards', 'Penalties', '6-45'],
				['turnovers', 'Turnovers', '2'],
				['possessionTime', 'Possession', '28:41'],
			]),
			teamStats('21', 'home', [
				['firstDowns', '1st Downs', '19'],
				['totalYards', 'Total Yards', '349'],
				['netPassingYards', 'Passing', '180'],
				['rushingYards', 'Rushing', '169'],
				['thirdDownEff', '3rd down efficiency', '7-14'],
				['totalPenaltiesYards', 'Penalties', '4-30'],
				['turnovers', 'Turnovers', '0'],
				['possessionTime', 'Possession', '31:19'],
			]),
		],
	},
};

// ── mock-3 · NHL · PIT 1 @ PHI 2, third period ───────────────────────────────
const skaterKeys = ['goals', 'assists', 'plusMinus', 'shotsTotal', 'penaltyMinutes', 'timeOnIce'];
const skaterLabels = ['G', 'A', '+/-', 'S', 'PIM', 'TOI'];
const goalieKeys = ['goalsAgainst', 'shotsAgainst', 'saves', 'savePct', 'timeOnIce'];
const goalieLabels = ['GA', 'SA', 'SV', 'SV%', 'TOI'];

const hockey = {
	header: { competitions: [{ competitors: [
		competitor('away', '16', 'PIT', '1', [{ displayValue: '0' }, { displayValue: '1' }, { displayValue: '0' }]),
		competitor('home', '15', 'PHI', '2', [{ displayValue: '1' }, { displayValue: '0' }, { displayValue: '1' }]),
	] }] },
	boxscore: {
		players: [
			{
				team: { id: '16', abbreviation: 'PIT' },
				statistics: [
					category('forwards', skaterKeys, skaterLabels, [
						{ name: 'S. Crosby', position: 'C', stats: ['1', '0', '0', '4', '0', '18:42'] },
						{ name: 'E. Malkin', position: 'C', stats: ['0', '1', '-1', '3', '2', '17:10'] },
						{ name: 'B. Rust', position: 'RW', stats: ['0', '0', '0', '2', '0', '16:28'] },
						{ name: 'R. O\'Connor', position: 'LW', stats: ['0', '0', '-1', '1', '0', '13:05'] },
					]),
					category('defenses', skaterKeys, skaterLabels, [
						{ name: 'K. Letang', position: 'D', stats: ['0', '1', '0', '3', '0', '21:33'] },
						{ name: 'M. Pettersson', position: 'D', stats: ['0', '0', '-1', '1', '2', '19:47'] },
					]),
					// Sent empty in every game sampled; kept here so the dedupe guard has nothing
					// to trip over and the parser drops it.
					category('skaters', skaterKeys, skaterLabels, []),
					category('goalies', goalieKeys, goalieLabels, [
						{ name: 'T. Jarry', position: 'G', stats: ['2', '24', '22', '.917', '48:12'] },
						// The backup, all zeros: filtered out by the time-on-ice rule rather than
						// rendering a .000 save percentage.
						{ name: 'J. Blomqvist', position: 'G', stats: ['0', '0', '0', '.000', '0:00'] },
					]),
				],
			},
			{
				team: { id: '15', abbreviation: 'PHI' },
				statistics: [
					category('forwards', skaterKeys, skaterLabels, [
						{ name: 'T. Konecny', position: 'RW', stats: ['1', '1', '2', '5', '0', '19:04'] },
						{ name: 'M. Michkov', position: 'RW', stats: ['1', '0', '1', '4', '0', '17:51'] },
						{ name: 'S. Couturier', position: 'C', stats: ['0', '1', '1', '2', '0', '18:22'] },
						{ name: 'O. Tippett', position: 'LW', stats: ['0', '0', '0', '2', '2', '14:37'] },
					]),
					category('defenses', skaterKeys, skaterLabels, [
						{ name: 'T. Sanheim', position: 'D', stats: ['0', '1', '1', '2', '0', '22:16'] },
						{ name: 'C. York', position: 'D', stats: ['0', '0', '0', '1', '0', '20:09'] },
					]),
					category('goalies', goalieKeys, goalieLabels, [
						{ name: 'S. Ersson', position: 'G', stats: ['1', '19', '18', '.947', '48:12'] },
					]),
				],
			},
		],
		teams: [
			teamStats('16', 'away', [
				['shotsTotal', 'Shots', '24'],
				['powerPlayGoals', 'Power Play Goals', '0'],
				['powerPlayOpportunities', 'Power Play Opportunities', '3'],
				['penaltyMinutes', 'Penalty Minutes', '6'],
				['hits', 'Hits', '19'],
				['blockedShots', 'Blocked Shots', '11'],
				['faceoffPercent', 'Faceoff Win Percent', '47.6'],
				['takeaways', 'Takeaways', '7'],
			]),
			teamStats('15', 'home', [
				['shotsTotal', 'Shots', '19'],
				['powerPlayGoals', 'Power Play Goals', '1'],
				['powerPlayOpportunities', 'Power Play Opportunities', '2'],
				['penaltyMinutes', 'Penalty Minutes', '4'],
				['hits', 'Hits', '23'],
				['blockedShots', 'Blocked Shots', '8'],
				['faceoffPercent', 'Faceoff Win Percent', '52.4'],
				['takeaways', 'Takeaways', '10'],
			]),
		],
	},
};

// ── mock-9 · MLS · NYR 1 @ PHI 2, second half ────────────────────────────────
// No `boxscore.players` at all, which is what soccer really sends. The comparison table is the
// whole box score here, and a 1-2 with these numbers is exactly the kind of match it has to speak
// for on its own.
const soccer = {
	header: { competitions: [{ competitors: [
		competitor('away', '190', 'NYR', '1', [{ displayValue: '1' }, { displayValue: '0' }]),
		competitor('home', '10739', 'PHI', '2', [{ displayValue: '0' }, { displayValue: '2' }]),
	] }] },
	boxscore: {
		teams: [
			// Soccer lists the home team first, which is what the side matching is for.
			teamStats('10739', 'home', [
				['foulsCommitted', 'Fouls', '11'],
				['yellowCards', 'Yellow Cards', '2'],
				['redCards', 'Red Cards', '0'],
				['offsides', 'Offsides', '1'],
				['wonCorners', 'Corner Kicks', '6'],
				['saves', 'Saves', '3'],
				['possessionPct', 'Possession', '46.8'],
				['totalShots', 'SHOTS', '14'],
				['shotsOnTarget', 'ON GOAL', '6'],
				['shotPct', 'On Target %', '0.4'],
				['penaltyKickShots', 'Penalty Kicks Taken', '1'],
				['penaltyKickGoals', 'Penalty Goals', '1'],
			]),
			teamStats('190', 'away', [
				['foulsCommitted', 'Fouls', '14'],
				['yellowCards', 'Yellow Cards', '3'],
				['redCards', 'Red Cards', '1'],
				['offsides', 'Offsides', '3'],
				['wonCorners', 'Corner Kicks', '2'],
				['saves', 'Saves', '4'],
				['possessionPct', 'Possession', '53.2'],
				['totalShots', 'SHOTS', '8'],
				['shotsOnTarget', 'ON GOAL', '3'],
				['shotPct', 'On Target %', '0.4'],
				['penaltyKickShots', 'Penalty Kicks Taken', '0'],
				['penaltyKickGoals', 'Penalty Goals', '0'],
			]),
		],
	},
};

export const mockBoxScorePayloads: Record<string, unknown> = {
	'mock-2': basketball,
	'mock-3': hockey,
	'mock-4': baseball,
	'mock-5': football,
	'mock-9': soccer,
	'mock-20': baseballFinal,
};
