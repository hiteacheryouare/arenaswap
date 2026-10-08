import { pickSeriesEntry } from '../entrypoints/popup/components/useSummaryData';

// Every fixture below is a payload the live ESPN summary endpoint returned, trimmed to the fields the
// dots read: MLB on 2026-08-30 unless a test names a 2025 postseason game.
describe('pickSeriesEntry', () => {
	// MIA @ WSH, game four of a series already underway and still hours from first pitch.
	test('takes the series being played now, over the season and preseason head-to-heads', () => {
		const picked = pickSeriesEntry([
			{ type: 'current', summary: 'WSH leads series 2-1', totalCompetitions: 4 },
			{ type: 'preseason', summary: 'MIA wins series 3-2', totalCompetitions: 5 },
			{ type: 'season', summary: 'MIA leads series 9-3', totalCompetitions: 13 },
		]);
		expect(picked?.summary).toBe('WSH leads series 2-1');
	});

	// PHI @ ARI, the opener of a series that has not started. ESPN offers only the season
	// head-to-head, whose 'ARI leads series 2-1' is the record from their last meeting — captioning
	// the dots with it would describe a series nobody has played yet.
	test('draws nothing for a series opener, where only the season head-to-head exists', () => {
		expect(pickSeriesEntry([
			{ type: 'season', summary: 'ARI leads series 2-1', totalCompetitions: 6 },
		])).toBeNull();
	});

	// ESPN does not order the array by relevance, so 'current' is not reliably index 0.
	test('finds the current series wherever it sits in the array', () => {
		const picked = pickSeriesEntry([
			{ type: 'preseason', summary: 'Series tied 1-1', totalCompetitions: 2 },
			{ type: 'current', summary: 'SD leads series 2-1', totalCompetitions: 3 },
		]);
		expect(picked?.totalCompetitions).toBe(3);
	});

	// CIN @ LAD, the 2025 NL Wild Card after the sweep. The current entry has shrunk to the two
	// games played, and only the playoff entry still knows it was a best-of-three.
	test('takes the playoff series over the current one, which forgets the series length', () => {
		const picked = pickSeriesEntry([
			{ type: 'current', summary: 'LAD win series 2-0', totalCompetitions: 2 },
			{ type: 'season', summary: 'LAD win series 5-1', totalCompetitions: 6 },
			{ type: 'playoff', summary: 'LAD win series 2-0', totalCompetitions: 3 },
		]);
		expect(picked?.type).toBe('playoff');
		expect(picked?.totalCompetitions).toBe(3);
	});

	// HOU @ GS, 2025 NBA first round. The NBA and NHL send no current entry at all.
	test('finds an NBA or NHL playoff series, which has no current entry', () => {
		const picked = pickSeriesEntry([
			{ type: 'season', summary: 'GS wins series 3-2', totalCompetitions: 5 },
			{ type: 'playoff', summary: 'GS leads series 3-1', totalCompetitions: 7 },
		]);
		expect(picked?.summary).toBe('GS leads series 3-1');
	});

	test('draws nothing for a missing, empty or unrecognized payload', () => {
		expect(pickSeriesEntry(undefined)).toBeNull();
		expect(pickSeriesEntry([])).toBeNull();
		expect(pickSeriesEntry([{ type: 'preseason', totalCompetitions: 2 }])).toBeNull();
	});
});
