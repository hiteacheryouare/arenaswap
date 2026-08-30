import { pickSeriesEntry } from '../entrypoints/popup/components/useSummaryData';

// The fixtures below are the shapes the live ESPN summary endpoint actually returned for MLB on
// 2026-08-30, trimmed to the fields the dots read.
describe('pickSeriesEntry', () => {
	test('takes the current series once one is underway, over the season head-to-head', () => {
		const picked = pickSeriesEntry([
			{ type: 'current', summary: 'Series tied 1-1', totalCompetitions: 3 },
			{ type: 'season', summary: 'Series tied 1-1', totalCompetitions: 3 },
		]);
		expect(picked?.type).toBe('current');
	});

	// A pre-game screen on the opening day of a series has no 'current' entry at all, which is what
	// left the dots blank on every regular-season card.
	test('falls back to the season series before the current one exists', () => {
		const picked = pickSeriesEntry([
			{ type: 'season', summary: 'BOS leads series 2-1', totalCompetitions: 6 },
		]);
		expect(picked?.summary).toBe('BOS leads series 2-1');
	});

	// ESPN does not order the array by relevance, so the season entry is not reliably index 0.
	test('skips a leading preseason entry rather than drawing it', () => {
		const picked = pickSeriesEntry([
			{ type: 'preseason', summary: 'Series tied 1-1', totalCompetitions: 2 },
			{ type: 'season', summary: 'SD leads series 2-1', totalCompetitions: 6 },
		]);
		expect(picked?.totalCompetitions).toBe(6);
	});

	test('draws nothing for a missing, empty or unrecognized payload', () => {
		expect(pickSeriesEntry(undefined)).toBeNull();
		expect(pickSeriesEntry([])).toBeNull();
		expect(pickSeriesEntry([{ type: 'preseason', totalCompetitions: 2 }])).toBeNull();
	});
});
