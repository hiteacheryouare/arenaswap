import * as constants from '../src/constants';
import * as indexExports from '../src/index';
import * as mockGames from '../src/mockGames';

describe('index barrel exports', () => {
	test('re-exports the mock simulator', () => {
		expect(indexExports.MockGameSimulator).toBe(mockGames.MockGameSimulator);
	});

	test('re-exports selected constants and config collections', () => {
		expect(indexExports.pollIntervalMs).toBe(constants.pollIntervalMs);
		expect(indexExports.leagueConfigs).toBe(constants.leagueConfigs);
		expect(indexExports.sportTypeConfigs).toBe(constants.sportTypeConfigs);
		expect(indexExports.allLeagueIds).toBe(constants.allLeagueIds);
	});
});
