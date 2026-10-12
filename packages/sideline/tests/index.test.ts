import * as apiClient from '../src/apiClient';
import * as indexExports from '../src/index';
import * as summaryFetch from '../src/summaryFetch';

describe('index barrel exports', () => {
	test('re-exports the scoreboard client', () => {
		expect(indexExports.fetchGames).toBe(apiClient.fetchGames);
		expect(indexExports.fetchLiveGames).toBe(apiClient.fetchLiveGames);
		expect(indexExports.fetchLeagueLogos).toBe(apiClient.fetchLeagueLogos);
		expect(indexExports.fetchGamesWithLeagueLogos).toBe(apiClient.fetchGamesWithLeagueLogos);
	});

	test('re-exports the popup\'s shared summary requests', () => {
		expect(indexExports.fetchSummary).toBe(summaryFetch.fetchSummary);
		expect(indexExports.fetchSharedLeagueStandings).toBe(summaryFetch.fetchSharedLeagueStandings);
	});

	test('leaves the demo payloads to their own subpaths', () => {
		expect(indexExports).not.toHaveProperty('mockBoxScorePayloads');
		expect(indexExports).not.toHaveProperty('mockStandingsPayloads');
		expect(indexExports).not.toHaveProperty('mockMatchupPayloads');
	});
});
