import { pickSeriesEntry } from '../entrypoints/popup/components/useSummaryData';

describe('pickSeriesEntry', () => {
	test('takes the series being played now, over the season and preseason head-to-heads', () => {
		const picked = pickSeriesEntry([
			{ type: 'current', summary: 'WSH leads series 2-1', totalCompetitions: 4 },
			{ type: 'preseason', summary: 'MIA wins series 3-2', totalCompetitions: 5 },
			{ type: 'season', summary: 'MIA leads series 9-3', totalCompetitions: 13 },
		]);
		expect(picked?.summary).toBe('WSH leads series 2-1');
	});

	test('draws nothing for a series opener, where only the season head-to-head exists', () => {
		expect(pickSeriesEntry([
			{ type: 'season', summary: 'ARI leads series 2-1', totalCompetitions: 6 },
		])).toBeNull();
	});

	test('finds the current series wherever it sits in the array', () => {
		const picked = pickSeriesEntry([
			{ type: 'preseason', summary: 'Series tied 1-1', totalCompetitions: 2 },
			{ type: 'current', summary: 'SD leads series 2-1', totalCompetitions: 3 },
		]);
		expect(picked?.totalCompetitions).toBe(3);
	});

	test('takes the playoff series over the current one, which forgets the series length', () => {
		const picked = pickSeriesEntry([
			{ type: 'current', summary: 'LAD win series 2-0', totalCompetitions: 2 },
			{ type: 'season', summary: 'LAD win series 5-1', totalCompetitions: 6 },
			{ type: 'playoff', summary: 'LAD win series 2-0', totalCompetitions: 3 },
		]);
		expect(picked?.type).toBe('playoff');
		expect(picked?.totalCompetitions).toBe(3);
	});

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
