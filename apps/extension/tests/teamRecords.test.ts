import { emptyTeamRecords, parseTeamRecords } from '../entrypoints/popup/components/useSummaryData';

interface CompetitorFixture {
	homeAway: string;
	team: { id: string };
	record: { type: string; summary?: string; displayValue?: string }[];
}

const summary = (competitors: CompetitorFixture[]) => ({
	header: { competitions: [{ competitors }] },
});

// Shapes taken from live site.api.espn.com summary responses: ESPN lists the home side first and
// carries the overall record as `total` alongside home/road/vsconf splits.
const mlbSummary = summary([
	{
		homeAway: 'home',
		team: { id: '22' },
		record: [
			{ type: 'total', summary: '59-53', displayValue: '59-53' },
			{ type: 'home', summary: '28-27', displayValue: '28-27' },
		],
	},
	{
		homeAway: 'away',
		team: { id: '20' },
		record: [
			{ type: 'total', summary: '55-58', displayValue: '55-58' },
			{ type: 'road', summary: '32-24', displayValue: '32-24' },
		],
	},
]);

describe('parseTeamRecords', () => {
	test('reads the overall record for each side', () => {
		expect(parseTeamRecords(mlbSummary, '22', '20')).toEqual({ home: '59-53', away: '55-58' });
	});

	test('matches on team id rather than array position', () => {
		// Same payload, but our home team is the one ESPN listed second.
		expect(parseTeamRecords(mlbSummary, '20', '22')).toEqual({ home: '55-58', away: '59-53' });
	});

	test('falls back to homeAway when the team ids do not match', () => {
		// College hockey ids are synthesized locally ("ncaamh-57") and never match ESPN's.
		expect(parseTeamRecords(mlbSummary, 'ncaamh-57', 'ncaamh-58'))
			.toEqual({ home: '59-53', away: '55-58' });
	});

	test('keeps the league\'s own format for three-segment records', () => {
		const soccer = summary([
			{ homeAway: 'home', team: { id: '9720' }, record: [{ type: 'total', displayValue: '4-4-10' }] },
			{ homeAway: 'away', team: { id: '189' }, record: [{ type: 'total', displayValue: '9-3-5' }] },
		]);
		expect(parseTeamRecords(soccer, '9720', '189')).toEqual({ home: '4-4-10', away: '9-3-5' });
	});

	// Real strings from an in-season NHL summary. ESPN appends standings points to `displayValue`
	// here and nowhere else, so preferring it would put "66 PTS" under the team name.
	test('drops the standings points the NHL appends to displayValue', () => {
		const nhl = summary([
			{
				homeAway: 'home',
				team: { id: '28' },
				record: [
					{ type: 'total', summary: '28-28-10', displayValue: '28-28-10, 66 PTS' },
					{ type: 'home', summary: '17-12-4', displayValue: '17-12-4, 38 PTS' },
				],
			},
			{
				homeAway: 'away',
				team: { id: '19' },
				record: [{ type: 'total', summary: '27-30-10', displayValue: '27-30-10, 64 PTS' }],
			},
		]);
		expect(parseTeamRecords(nhl, '28', '19')).toEqual({ home: '28-28-10', away: '27-30-10' });
	});

	test('ignores splits when no overall record is present', () => {
		const splitsOnly = summary([
			{ homeAway: 'home', team: { id: '1' }, record: [{ type: 'home', displayValue: '10-4' }] },
			{ homeAway: 'away', team: { id: '2' }, record: [{ type: 'road', displayValue: '11-4' }] },
		]);
		expect(parseTeamRecords(splitsOnly, '1', '2')).toEqual(emptyTeamRecords);
	});

	test('treats an offseason empty record array as no record', () => {
		const offseason = summary([
			{ homeAway: 'home', team: { id: '21' }, record: [] },
			{ homeAway: 'away', team: { id: '10' }, record: [] },
		]);
		expect(parseTeamRecords(offseason, '21', '10')).toEqual(emptyTeamRecords);
	});

	test('reads summary when displayValue is absent', () => {
		const noDisplayValue = summary([
			{ homeAway: 'home', team: { id: '1' }, record: [{ type: 'total', summary: '7-2' }] },
			{ homeAway: 'away', team: { id: '2' }, record: [{ type: 'total', summary: '5-4' }] },
		]);
		expect(parseTeamRecords(noDisplayValue, '1', '2')).toEqual({ home: '7-2', away: '5-4' });
	});

	test('falls back to displayValue when summary is absent', () => {
		const noSummary = summary([
			{ homeAway: 'home', team: { id: '1' }, record: [{ type: 'total', displayValue: '7-2' }] },
			{ homeAway: 'away', team: { id: '2' }, record: [{ type: 'total', displayValue: '5-4' }] },
		]);
		expect(parseTeamRecords(noSummary, '1', '2')).toEqual({ home: '7-2', away: '5-4' });
	});

	test('drops a blank record rather than rendering an empty line', () => {
		const blank = summary([
			{ homeAway: 'home', team: { id: '1' }, record: [{ type: 'total', displayValue: '   ' }] },
			{ homeAway: 'away', team: { id: '2' }, record: [{ type: 'total', displayValue: '5-4' }] },
		]);
		expect(parseTeamRecords(blank, '1', '2')).toEqual({ home: null, away: '5-4' });
	});

	test('returns no records for payloads without a header', () => {
		expect(parseTeamRecords({}, '1', '2')).toEqual(emptyTeamRecords);
		expect(parseTeamRecords(null, '1', '2')).toEqual(emptyTeamRecords);
		expect(parseTeamRecords({ header: { competitions: [] } }, '1', '2')).toEqual(emptyTeamRecords);
	});
});
