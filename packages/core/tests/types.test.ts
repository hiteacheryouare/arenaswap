import type { ExtensionMessage, Game, UserPreferences } from '../src/types';

describe('types runtime smoke', () => {
	test('supports constructing core domain objects with expected runtime shape', () => {
		const game: Game = {
			id: 'game-1',
			league: 'nba',
			sportType: 'basketball',
			homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 2 },
			awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 1 },
			period: 1,
			clockSeconds: 30,
			status: 'in',
		};
		const prefs: UserPreferences = {
			sensitivity: 4,
			cooldownSeconds: 45,
			switchDelaySeconds: 0,
			enabled: true,
			enabledLeagues: ['nba'],
			favoriteTeamIds: ['nba:2'],
			favoriteTeamBonusPoints: 10,
			showUpcomingGames: true,
		};
		const message: ExtensionMessage = { type: 'UPDATE_PREFS', prefs };

		expect(game.homeTeam.score + game.awayTeam.score).toBe(3);
		expect(message.type).toBe('UPDATE_PREFS');
	});

	test('has no meaningful runtime exports from types-only module', async () => {
		const runtimeTypesModule = await import('../src/types');
		expect(Object.keys(runtimeTypesModule)).toEqual([]);
	});
});
