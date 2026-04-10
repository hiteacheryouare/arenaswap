import * as apiClient from '../src/api-client';
import * as constants from '../src/constants';
import * as scorer from '../src/excitement-scorer';
import * as indexExports from '../src/index';
import * as mockGames from '../src/mock-games';

describe('index barrel exports', () => {
	test('re-exports api-client functions', () => {
		expect(indexExports.fetchGames).toBe(apiClient.fetchGames);
		expect(indexExports.fetchLiveGames).toBe(apiClient.fetchLiveGames);
		expect(indexExports.fetchLeagueLogos).toBe(apiClient.fetchLeagueLogos);
		expect(indexExports.fetchGamesWithLeagueLogos).toBe(apiClient.fetchGamesWithLeagueLogos);
	});

	test('re-exports excitement scorer and mock simulator', () => {
		expect(indexExports.computeExcitement).toBe(scorer.computeExcitement);
		expect(indexExports.MockGameSimulator).toBe(mockGames.MockGameSimulator);
	});

	test('re-exports selected constants and config collections', () => {
		expect(indexExports.APP_NAME).toBe(constants.APP_NAME);
		expect(indexExports.POLL_INTERVAL_MS).toBe(constants.POLL_INTERVAL_MS);
		expect(indexExports.LEAGUE_CONFIGS).toBe(constants.LEAGUE_CONFIGS);
		expect(indexExports.SPORT_TYPE_CONFIGS).toBe(constants.SPORT_TYPE_CONFIGS);
		expect(indexExports.ALL_LEAGUE_IDS).toBe(constants.ALL_LEAGUE_IDS);
	});
});
