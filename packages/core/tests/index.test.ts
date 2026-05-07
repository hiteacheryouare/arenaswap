import * as apiClient from '../src/apiClient';
import * as constants from '../src/constants';
import * as scorer from 'powerscore';
import * as indexExports from '../src/index';
import * as mockGames from '../src/mockGames';

describe('index barrel exports', () => {
	test('re-exports apiClient functions', () => {
		expect(indexExports.fetchGames).toBe(apiClient.fetchGames);
		expect(indexExports.fetchLiveGames).toBe(apiClient.fetchLiveGames);
		expect(indexExports.fetchLeagueLogos).toBe(apiClient.fetchLeagueLogos);
		expect(indexExports.fetchGamesWithLeagueLogos).toBe(apiClient.fetchGamesWithLeagueLogos);
	});

	test('re-exports powerscore and mock simulator', () => {
		expect(indexExports.computePowerScore).toBe(scorer.computePowerScore);
		expect(indexExports.MockGameSimulator).toBe(mockGames.MockGameSimulator);
	});

	test('re-exports selected constants and config collections', () => {
		expect(indexExports.appName).toBe(constants.appName);
		expect(indexExports.pollIntervalMs).toBe(constants.pollIntervalMs);
		expect(indexExports.leagueConfigs).toBe(constants.leagueConfigs);
		expect(indexExports.sportTypeConfigs).toBe(constants.sportTypeConfigs);
		expect(indexExports.allLeagueIds).toBe(constants.allLeagueIds);
	});
});
