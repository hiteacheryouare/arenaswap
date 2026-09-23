import {
	buildComparison,
	buildSections,
	lineScoreHeadingKey,
	periodLabels,
} from '../entrypoints/popup/components/boxScoreColumns';
import type { BoxScoreAthlete, BoxScoreCategory, BoxScoreTeam } from '../entrypoints/popup/components/boxScoreParse';

const athlete = (name: string, stats: string[], extra: Partial<BoxScoreAthlete> = {}): BoxScoreAthlete => ({
	id: name,
	name,
	position: '',
	stats,
	starter: false,
	batOrder: 0,
	didNotPlay: false,
	didNotPlayReason: '',
	...extra,
});

const category = (
	name: string,
	keys: string[],
	athletes: BoxScoreAthlete[],
	totals: string[] = [],
	descriptions: string[] = keys,
): BoxScoreCategory => ({
	name,
	keys,
	labels: keys,
	descriptions,
	totals,
	athletes,
});

const team = (categories: BoxScoreCategory[]): BoxScoreTeam => ({
	teamId: '1',
	abbreviation: 'PHI',
	categories,
});

const battingKeys = ['hits-atBats', 'atBats', 'runs', 'hits', 'RBIs', 'homeRuns', 'walks', 'strikeouts', 'avg'];
const skaterKeys = ['blockedShots', 'plusMinus', 'timeOnIce', 'goals', 'assists', 'shotsTotal', 'penaltyMinutes'];
const goalieKeys = ['goalsAgainst', 'shotsAgainst', 'saves', 'savePct', 'timeOnIce'];

describe('periodLabels', () => {
	test('numbers the regulation quarters and names what comes after', () => {
		expect(periodLabels({ periodCount: 6, regularPeriods: 4, periodFormat: 'quarters', sportType: 'basketball' })).toEqual([
			{ kind: 'number', value: 1 },
			{ kind: 'number', value: 2 },
			{ kind: 'number', value: 3 },
			{ kind: 'number', value: 4 },
			{ kind: 'overtime', index: 1 },
			{ kind: 'overtime', index: 2 },
		]);
	});

	test('extra innings are just numbered', () => {
		// A 12th inning reads "12". A fifth quarter does not read "5".
		expect(periodLabels({ periodCount: 12, regularPeriods: 9, periodFormat: 'innings', sportType: 'baseball' }).slice(9)).toEqual([
			{ kind: 'number', value: 10 },
			{ kind: 'number', value: 11 },
			{ kind: 'number', value: 12 },
		]);
	});

	test('hockey overtime follows the third period', () => {
		expect(periodLabels({ periodCount: 4, regularPeriods: 3, periodFormat: 'periods', sportType: 'hockey' })[3])
			.toEqual({ kind: 'overtime', index: 1 });
	});

	// ESPN's soccer linescores are positional — [1H, 2H, ET1, ET2, PENS] — so what a column means
	// is its index rather than its distance past regulation.
	test('a match settled in ninety minutes is two halves', () => {
		expect(periodLabels({ periodCount: 2, regularPeriods: 2, periodFormat: 'halves', sportType: 'soccer' })).toEqual([
			{ kind: 'number', value: 1 },
			{ kind: 'number', value: 2 },
		]);
	});

	test('a match that went to extra time names both periods of it', () => {
		expect(periodLabels({ periodCount: 4, regularPeriods: 2, periodFormat: 'halves', sportType: 'soccer' })).toEqual([
			{ kind: 'number', value: 1 },
			{ kind: 'number', value: 2 },
			{ kind: 'named', labelKey: 'box.periodEt1' },
			{ kind: 'named', labelKey: 'box.periodEt2' },
		]);
	});

	test('a fifth column on a soccer match is the shootout, never a second overtime', () => {
		expect(periodLabels({ periodCount: 5, regularPeriods: 2, periodFormat: 'halves', sportType: 'soccer' })[4])
			.toEqual({ kind: 'named', labelKey: 'box.periodPen' });
	});

	test('a match live in the first period of extra time reads ET1', () => {
		// Positional slicing gets this for free; counting past regulation would call it OT.
		expect(periodLabels({ periodCount: 3, regularPeriods: 2, periodFormat: 'halves', sportType: 'soccer' })[2])
			.toEqual({ kind: 'named', labelKey: 'box.periodEt1' });
	});

	test('MLS\'s zero-filled extra time is still drawn as extra time', () => {
		// Round One goes from a 90-minute draw straight to penalties by rule and ESPN still emits
		// five entries. From the line score alone that is identical to a scoreless real extra
		// time, so the phantom columns are drawn rather than guessed away.
		expect(periodLabels({ periodCount: 5, regularPeriods: 2, periodFormat: 'halves', sportType: 'soccer' }).slice(2)).toEqual([
			{ kind: 'named', labelKey: 'box.periodEt1' },
			{ kind: 'named', labelKey: 'box.periodEt2' },
			{ kind: 'named', labelKey: 'box.periodPen' },
		]);
	});

	test('college basketball plays halves and its fifth column is still an overtime', () => {
		// 'halves' over two regular periods describes NCAAB as well as soccer, which is why the
		// extra-time rule is keyed on the sport instead.
		expect(periodLabels({ periodCount: 2, regularPeriods: 2, periodFormat: 'halves', sportType: 'basketball' })).toEqual([
			{ kind: 'number', value: 1 },
			{ kind: 'number', value: 2 },
		]);
		expect(periodLabels({ periodCount: 4, regularPeriods: 2, periodFormat: 'halves', sportType: 'basketball' }).slice(2)).toEqual([
			{ kind: 'overtime', index: 1 },
			{ kind: 'overtime', index: 2 },
		]);
	});

	test('a hockey shootout is named as one, and a second overtime is not', () => {
		// Both arrive as a fifth entry. Shootouts cannot happen in the playoffs, so ESPN's own
		// Final designation suffix is what separates them.
		expect(periodLabels({
			periodCount: 5, regularPeriods: 3, periodFormat: 'periods', sportType: 'hockey', finalPeriodSuffix: 'SO',
		}).slice(3)).toEqual([
			{ kind: 'overtime', index: 1 },
			{ kind: 'named', labelKey: 'box.periodSo' },
		]);
		expect(periodLabels({
			periodCount: 5, regularPeriods: 3, periodFormat: 'periods', sportType: 'hockey', finalPeriodSuffix: '2OT',
		}).slice(3)).toEqual([
			{ kind: 'overtime', index: 1 },
			{ kind: 'overtime', index: 2 },
		]);
	});

	test('a regulation hockey game is never relabelled by a stray suffix', () => {
		expect(periodLabels({
			periodCount: 3, regularPeriods: 3, periodFormat: 'periods', sportType: 'hockey', finalPeriodSuffix: 'SO',
		})).toEqual([
			{ kind: 'number', value: 1 },
			{ kind: 'number', value: 2 },
			{ kind: 'number', value: 3 },
		]);
	});
});

describe('lineScoreHeadingKey', () => {
	test('names the unit each period format actually uses', () => {
		expect(lineScoreHeadingKey('innings')).toBe('box.byInning');
		expect(lineScoreHeadingKey('quarters')).toBe('box.byQuarter');
		expect(lineScoreHeadingKey('periods')).toBe('box.byPeriod');
		expect(lineScoreHeadingKey('halves')).toBe('box.byHalf');
	});

	test('a format we have never seen falls back to periods rather than rendering nothing', () => {
		expect(lineScoreHeadingKey(undefined)).toBe('box.byPeriod');
		expect(lineScoreHeadingKey('overs')).toBe('box.byPeriod');
	});
});

describe('buildSections column selection', () => {
	test('picks the six batting columns out of the nine ESPN sends, in order', () => {
		const sections = buildSections('baseball', team([
			category('batting', battingKeys, [athlete('J. Soto', ['2-4', '4', '1', '2', '1', '1', '0', '0', '.288'])]),
		]));
		expect(sections[0].columns.map(column => column.labelKey)).toEqual([
			'box.hitsAtBats', 'box.runs', 'box.rbi', 'box.homeRuns', 'box.walks', 'box.strikeouts',
		]);
		// Indices point into ESPN's own parallel arrays, so AB and AVG are skipped rather than
		// shifting everything after them.
		expect(sections[0].columns.map(column => column.index)).toEqual([0, 2, 4, 5, 6, 7]);
	});

	test('carries ESPN\'s own description for the column it kept', () => {
		// The only thing that can tell a reader SACKS under passing is sacks suffered while SACKS
		// under defensive is sacks recorded — the same abbreviation on two categories at once.
		const sections = buildSections('football', team([
			category(
				'passing',
				['completions/passingAttempts', 'passingYards', 'sacks-sackYardsLost'],
				[athlete('J. Hurts', ['16/24', '188', '1-8'])],
				[],
				['Completions/Passing Attempts', 'Passing Yards', 'Sacks-Sack Yards Lost'],
			),
		]));
		expect(sections[0].columns.map(column => column.description)).toEqual([
			'Completions/Passing Attempts', 'Passing Yards', 'Sacks-Sack Yards Lost',
		]);
	});

	test('a column ESPN sends no description for carries an empty one rather than a stray label', () => {
		const sections = buildSections('basketball', team([
			category('', ['minutes', 'points'], [athlete('T. Maxey', ['29', '24'])], [], []),
		]));
		expect(sections[0].columns.map(column => column.description)).toEqual(['', '']);
	});

	test('drops a column the league did not send instead of rendering it empty', () => {
		// College football sends no sacks under passing and no targets under receiving; the NFL
		// sends both.
		const collegePassing = ['completions/passingAttempts', 'passingYards', 'yardsPerPassAttempt', 'passingTouchdowns', 'interceptions', 'adjQBR'];
		const sections = buildSections('football', team([
			category('passing', collegePassing, [athlete('L. Weaver', ['21/32', '234', '7.3', '2', '0', '94.7'])]),
		]));
		expect(sections[0].columns.map(column => column.labelKey)).toEqual([
			'box.completionsAttempts', 'box.yards', 'box.average', 'box.touchdowns', 'box.interceptions',
		]);
	});

	test('drops a category whose columns we keep none of', () => {
		const sections = buildSections('football', team([
			category('kicking', ['fieldGoalsMade/fieldGoalAttempts', 'fieldGoalPct'], [athlete('J. Elliott', ['1/1', '100.0'])]),
		]));
		expect(sections).toEqual([]);
	});

	test('reads basketball out of the single category ESPN gives it no name for', () => {
		const sections = buildSections('basketball', team([
			category('', ['minutes', 'points', 'rebounds', 'assists'], [athlete('T. Maxey', ['29', '24', '2', '7'])]),
		]));
		expect(sections).toHaveLength(1);
		expect(sections[0].headingKey).toBe('box.players');
		expect(sections[0].columns.map(column => column.labelKey)).toEqual([
			'box.minutes', 'box.points', 'box.rebounds', 'box.assists',
		]);
	});

	test('renders nothing at all for soccer, which has no player box score', () => {
		expect(buildSections('soccer', team([category('', ['goals'], [athlete('X', ['1'])])]))).toEqual([]);
	});

	test('renders nothing for a sport we have no spec for', () => {
		expect(buildSections(undefined, team([category('batting', battingKeys, [athlete('X', [])])]))).toEqual([]);
	});
});

describe('buildSections category order', () => {
	test('puts the lineup before the pitchers, whatever order they arrived in', () => {
		const sections = buildSections('baseball', team([
			category('pitching', ['fullInnings.partInnings', 'hits'], [athlete('Z. Wheeler', ['6.0', '5'])]),
			category('batting', battingKeys, [athlete('T. Turner', ['2-4', '4', '1', '2', '0', '0', '0', '0', '.300'])]),
		]));
		expect(sections.map(section => section.name)).toEqual(['batting', 'pitching']);
	});

	test('keeps the football categories we render and drops the ones we do not', () => {
		const keysFor: Record<string, string[]> = {
			passing: ['completions/passingAttempts', 'passingYards'],
			rushing: ['rushingAttempts', 'rushingYards'],
			receiving: ['receptions', 'receivingYards'],
			fumbles: ['fumbles', 'fumblesLost'],
			defensive: ['totalTackles', 'soloTackles'],
			interceptions: ['interceptions', 'interceptionYards'],
			kicking: ['fieldGoalsMade/fieldGoalAttempts', 'fieldGoalPct'],
			punting: ['punts', 'puntYards'],
			kickReturns: ['kickReturns', 'kickReturnYards'],
			puntReturns: ['puntReturns', 'puntReturnYards'],
		};
		const sections = buildSections('football', team(
			Object.entries(keysFor).map(([name, keys]) => category(name, keys, [athlete(name, ['1', '2'])])),
		));
		expect(sections.map(section => section.name)).toEqual([
			'passing', 'rushing', 'receiving', 'defensive', 'interceptions',
		]);
	});

	test('splits hockey into forwards, defensemen and goaltending', () => {
		const sections = buildSections('hockey', team([
			category('forwards', skaterKeys, [athlete('S. Crosby', ['0', '0', '18:42', '1', '0', '4', '0'])]),
			category('defenses', skaterKeys, [athlete('K. Letang', ['0', '0', '21:33', '0', '1', '3', '0'])]),
			category('goalies', goalieKeys, [athlete('T. Jarry', ['2', '24', '22', '.917', '48:12'])]),
		]));
		expect(sections.map(section => section.headingKey)).toEqual([
			'box.forwards', 'box.defensemen', 'box.goaltending',
		]);
	});

	test('a populated skaters category replaces forwards and defenses rather than joining them', () => {
		// ESPN sends all three keys and `skaters` duplicates the other two, so rendering all of
		// them would list every player twice.
		const sections = buildSections('hockey', team([
			category('forwards', skaterKeys, [athlete('S. Crosby', ['0', '0', '18:42', '1', '0', '4', '0'])]),
			category('defenses', skaterKeys, [athlete('K. Letang', ['0', '0', '21:33', '0', '1', '3', '0'])]),
			category('skaters', skaterKeys, [athlete('S. Crosby', ['0', '0', '18:42', '1', '0', '4', '0'])]),
		]));
		expect(sections.map(section => section.name)).toEqual(['skaters']);
	});
});

describe('buildSections row handling', () => {
	test('reads the batting order in order and keeps a substitute inside its slot', () => {
		const sections = buildSections('baseball', team([
			category('batting', battingKeys, [
				athlete('T. Taylor', [], { batOrder: 8, starter: true }),
				athlete('F. Lindor', [], { batOrder: 1, starter: true }),
				athlete('J. Baty', [], { batOrder: 6, starter: true }),
				athlete('T. Nimmo', [], { batOrder: 6 }),
			]),
		]));
		expect(sections[0].athletes.map(a => a.name)).toEqual(['F. Lindor', 'J. Baty', 'T. Nimmo', 'T. Taylor']);
	});

	test('a pitcher with no spot in the order sorts last rather than first', () => {
		const sections = buildSections('baseball', team([
			category('batting', battingKeys, [
				athlete('S. Ohtani', [], { batOrder: 0 }),
				athlete('F. Lindor', [], { batOrder: 1, starter: true }),
			]),
		]));
		expect(sections[0].athletes.map(a => a.name)).toEqual(['F. Lindor', 'S. Ohtani']);
	});

	test('leaves the pitchers in the order they appeared', () => {
		const sections = buildSections('baseball', team([
			category('pitching', ['fullInnings.partInnings', 'hits'], [
				athlete('Z. Wheeler', ['6.0', '5'], { starter: true }),
				athlete('M. Strahm', ['1.0', '1']),
				athlete('J. Romano', ['1.0', '1']),
			]),
		]));
		expect(sections[0].athletes.map(a => a.name)).toEqual(['Z. Wheeler', 'M. Strahm', 'J. Romano']);
	});

	test('basketball reads starters, then the bench, then everyone who did not play', () => {
		const sections = buildSections('basketball', team([
			category('', ['minutes', 'points'], [
				athlete('Z. Collins', [], { didNotPlay: true, didNotPlayReason: "COACH'S DECISION" }),
				athlete('A. Dosunmu', ['14', '4']),
				athlete('C. White', ['28', '19'], { starter: true }),
				athlete('D. Terry', ['9', '2']),
				athlete('N. Vucevic', ['26', '14'], { starter: true }),
			]),
		]));
		expect(sections[0].athletes.map(a => a.name)).toEqual([
			// Within each group ESPN's own order is kept, because it tracks the rotation.
			'C. White', 'N. Vucevic', 'A. Dosunmu', 'D. Terry', 'Z. Collins',
		]);
	});

	test('a did-not-play row with no reason still sorts last', () => {
		// ESPN sends the flag without the reason often enough that this is the ordinary case, and
		// a truthiness check on the reason would sort the player among the bench.
		const sections = buildSections('basketball', team([
			category('', ['minutes', 'points'], [
				athlete('unstated', [], { didNotPlay: true }),
				athlete('A. Dosunmu', ['14', '4']),
				athlete('C. White', ['28', '19'], { starter: true }),
			]),
		]));
		expect(sections[0].athletes.map(a => a.name)).toEqual(['C. White', 'A. Dosunmu', 'unstated']);
	});

	test('hockey skaters sort by points, then goals, then time on ice', () => {
		const sections = buildSections('hockey', team([
			category('forwards', skaterKeys, [
				athlete('one assist', ['0', '0', '10:00', '0', '1', '1', '0']),
				athlete('two points', ['0', '0', '12:00', '1', '1', '3', '0']),
				athlete('one goal', ['0', '0', '20:00', '1', '0', '2', '0']),
				athlete('nothing, long night', ['0', '0', '24:00', '0', '0', '0', '0']),
			]),
		]));
		expect(sections[0].athletes.map(a => a.name)).toEqual([
			'two points', 'one goal', 'one assist', 'nothing, long night',
		]);
	});

	test('reads 20:14 as twenty minutes rather than as the number 20.14', () => {
		const sections = buildSections('hockey', team([
			category('forwards', skaterKeys, [
				athlete('nine minutes', ['0', '0', '9:59', '0', '0', '0', '0']),
				athlete('ten minutes', ['0', '0', '10:01', '0', '0', '0', '0']),
			]),
		]));
		expect(sections[0].athletes.map(a => a.name)).toEqual(['ten minutes', 'nine minutes']);
	});

	test('drops the goalie who never took the ice', () => {
		// The backup is on the roster with an all-zero line, which renders as a .000 save
		// percentage — the most wrong-looking number this screen could show.
		const sections = buildSections('hockey', team([
			category('goalies', goalieKeys, [
				athlete('T. Jarry', ['2', '24', '22', '.917', '48:12']),
				athlete('J. Blomqvist', ['0', '0', '0', '.000', '0:00']),
			]),
		]));
		expect(sections[0].athletes.map(a => a.name)).toEqual(['T. Jarry']);
	});

	test('keeps both goalies when both actually played', () => {
		const sections = buildSections('hockey', team([
			category('goalies', goalieKeys, [
				athlete('pulled', ['4', '12', '8', '.667', '24:31']),
				athlete('relief', ['0', '9', '9', '1.000', '35:29']),
			]),
		]));
		expect(sections[0].athletes.map(a => a.name)).toEqual(['pulled', 'relief']);
	});

	test('drops a goalie category where nobody played rather than showing an empty table', () => {
		const sections = buildSections('hockey', team([
			category('goalies', goalieKeys, [athlete('J. Blomqvist', ['0', '0', '0', '.000', '0:00'])]),
		]));
		expect(sections).toEqual([]);
	});
});

describe('buildSections totals and caps', () => {
	test('aligns the totals row to the columns we kept, not to the ones ESPN sent', () => {
		const sections = buildSections('baseball', team([
			category(
				'batting',
				battingKeys,
				[athlete('J. Soto', ['2-4', '4', '1', '2', '1', '1', '0', '0', '.288'])],
				['7-29', '29', '3', '7', '3', '1', '2', '8', ''],
			),
		]));
		expect(sections[0].totals).toEqual(['7-29', '3', '3', '1', '2', '8']);
	});

	test('basketball gets a totals row and football does not', () => {
		const basketball = buildSections('basketball', team([
			category('', ['minutes', 'points'], [athlete('T. Maxey', ['29', '24'])], ['', '68']),
		]));
		expect(basketball[0].totals).toEqual(['', '68']);

		const football = buildSections('football', team([
			category('rushing', ['rushingAttempts', 'rushingYards'], [athlete('S. Barkley', ['21', '119'])], ['27', '141']),
		]));
		expect(football[0].totals).toBeNull();
	});

	test('a category ESPN sends no totals for reports none rather than a row of blanks', () => {
		// Every hockey category, and the one basketball case where the array is absent.
		const sections = buildSections('basketball', team([
			category('', ['minutes', 'points'], [athlete('T. Maxey', ['29', '24'])]),
		]));
		expect(sections[0].totals).toBeNull();
	});

	test('caps the football categories that run long and leaves the rest uncapped', () => {
		const sections = buildSections('football', team([
			category('defensive', ['totalTackles', 'soloTackles'], [athlete('Z. Baun', ['11', '8'])]),
			category('interceptions', ['interceptions', 'interceptionYards'], [athlete('D. Bland', ['1', '27'])]),
		]));
		expect(sections.map(section => [section.name, section.rowCap])).toEqual([
			['defensive', 6],
			['interceptions', 0],
		]);
	});

	test('every row survives the cap — the cap is the component\'s to apply, not the parser\'s', () => {
		const many = Array.from({ length: 24 }, (_, index) => athlete(`tackler ${index}`, ['1', '1']));
		const sections = buildSections('football', team([
			category('defensive', ['totalTackles', 'soloTackles'], many),
		]));
		expect(sections[0].athletes).toHaveLength(24);
	});
});

const rows = (entries: [string, string, string][]) => entries.map(([name, away, home]) => ({
	name,
	label: name,
	away,
	home,
}));

describe('buildComparison', () => {
	test('orders soccer the way a match panel prints it, and drops the derived column', () => {
		const built = buildComparison('soccer', rows([
			['foulsCommitted', '14', '11'],
			['shotPct', '0.4', '0.4'],
			['possessionPct', '53.2', '46.8'],
			['totalShots', '8', '14'],
			['shotsOnTarget', '3', '6'],
			['wonCorners', '2', '6'],
			['saves', '4', '3'],
			['offsides', '3', '1'],
			['yellowCards', '3', '2'],
			['redCards', '1', '0'],
		]));
		expect(built.map(row => row.labelKey)).toEqual([
			'box.possession', 'box.shotsTaken', 'box.onGoal', 'box.corners', 'box.savesMade',
			'box.offsides', 'box.fouls', 'box.yellowCards', 'box.redCards',
		]);
	});

	test('appends the penalty rows only when a penalty actually happened', () => {
		const base: [string, string, string][] = [['possessionPct', '53.2', '46.8']];
		const withPenalty = buildComparison('soccer', rows([...base, ['penaltyKickShots', '0', '1'], ['penaltyKickGoals', '0', '1']]));
		expect(withPenalty.map(row => row.labelKey)).toEqual(['box.possession', 'box.penaltyKicks', 'box.penaltyGoals']);

		const without = buildComparison('soccer', rows([...base, ['penaltyKickShots', '0', '0'], ['penaltyKickGoals', '0', '0']]));
		expect(without.map(row => row.labelKey)).toEqual(['box.possession']);
	});

	test('a penalty row reading 0-0 is zero, and one reading 0.0 or - still is', () => {
		const zeroish = buildComparison('soccer', rows([
			['possessionPct', '50.0', '50.0'],
			['penaltyKickShots', '-', '0.0'],
			['penaltyKickGoals', '0', '0'],
		]));
		expect(zeroish).toHaveLength(1);
	});

	test('reads nothing for baseball, whose team stats are the R-H-E above', () => {
		expect(buildComparison('baseball', rows([['atBats', '29', '29']]))).toEqual([]);
	});

	test('drops a stat the sport does not compare rather than appending it', () => {
		const built = buildComparison('hockey', rows([
			['shotsTotal', '24', '19'],
			['shootoutGoals', '0', '0'],
			['takeaways', '7', '10'],
		]));
		expect(built.map(row => row.labelKey)).toEqual(['box.shotsOnGoal', 'box.takeaways']);
	});

	test('reads nothing when the sport sent no team stats at all', () => {
		expect(buildComparison('football', [])).toEqual([]);
		expect(buildComparison(undefined, rows([['firstDowns', '17', '19']]))).toEqual([]);
	});

	test('carries the two values through in away-then-home order', () => {
		expect(buildComparison('football', rows([['possessionTime', '28:41', '31:19']]))).toEqual([
			{ labelKey: 'box.possession', away: '28:41', home: '31:19' },
		]);
	});
});
