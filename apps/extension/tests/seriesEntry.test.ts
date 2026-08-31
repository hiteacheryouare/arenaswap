import { pickSeriesEntry } from '../entrypoints/popup/components/useSummaryData';

// Every fixture below is a payload the live ESPN summary endpoint returned for MLB on 2026-08-30,
// trimmed to the fields the dots read.
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

	test('draws nothing for a missing, empty or unrecognized payload', () => {
		expect(pickSeriesEntry(undefined)).toBeNull();
		expect(pickSeriesEntry([])).toBeNull();
		expect(pickSeriesEntry([{ type: 'preseason', totalCompetitions: 2 }])).toBeNull();
	});
});
