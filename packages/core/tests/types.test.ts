import type {
	BackgroundState,
	ExtensionMessage,
	Game,
	PowerScoreSnapshot,
	ScoreSnapshot,
	UserPreferences,
} from '../src/types';

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
			notificationsEnabled: true,
		};
		const message: ExtensionMessage = { type: 'UPDATE_PREFS', prefs };

		expect(game.homeTeam.score + game.awayTeam.score).toBe(3);
		expect(message.type).toBe('UPDATE_PREFS');
	});

	test('supports background payload history maps for detail analytics', () => {
		const scoreSnapshots: ScoreSnapshot[] = [
			{ gameId: 'game-1', timestamp: 1_700_000_000_000, homeScore: 14, awayScore: 10 },
			{ gameId: 'game-1', timestamp: 1_700_000_015_000, homeScore: 14, awayScore: 13 },
		];
		const powerSnapshots: PowerScoreSnapshot[] = [
			{
				gameId: 'game-1',
				timestamp: 1_700_000_000_000,
				total: 21,
				closeness: 10,
				lateGame: 4,
				momentum: 2,
				leadChanges: 3,
				comeback: 2,
				baseTotal: 21,
				favoriteBonus: 0,
				favoriteTeamCount: 0,
				stalled: false,
				reason: 'Tied game',
			},
		];
		const state: BackgroundState = {
			games: [],
			scores: [],
			leagueLogos: {},
			scoreHistory: { 'game-1': scoreSnapshots },
			powerScoreHistory: { 'game-1': powerSnapshots },
		};
		const message: ExtensionMessage = {
			type: 'SCORES_UPDATED',
			games: state.games,
			scores: state.scores,
			leagueLogos: state.leagueLogos,
			scoreHistory: state.scoreHistory,
			powerScoreHistory: state.powerScoreHistory,
		};

		expect(message.type).toBe('SCORES_UPDATED');
		expect(message.scoreHistory['game-1']?.length).toBe(2);
		expect(message.powerScoreHistory['game-1']?.[0]?.total).toBe(21);
	});

	test('supports optional baseball-specific fields on Game', () => {
		const game: Game = {
			id: 'mlb-1',
			league: 'mlb',
			sportType: 'baseball',
			homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 3 },
			awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 2 },
			period: 7,
			clockSeconds: 0,
			status: 'in',
			topOfInning: true,
			baseRunners: { first: true, second: false, third: true },
		};
		expect(game.topOfInning).toBe(true);
		expect(game.baseRunners?.first).toBe(true);
		expect(game.baseRunners?.second).toBe(false);
		expect(game.baseRunners?.third).toBe(true);

		const gameNoSituation: Game = {
			id: 'mlb-2',
			league: 'mlb',
			sportType: 'baseball',
			homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 0 },
			awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 0 },
			period: 1,
			clockSeconds: 0,
			status: 'pre',
		};
		expect(gameNoSituation.topOfInning).toBeUndefined();
		expect(gameNoSituation.baseRunners).toBeUndefined();
	});

	test('has no meaningful runtime exports from types-only module', async () => {
		const runtimeTypesModule = await import('../src/types');
		expect(Object.keys(runtimeTypesModule)).toEqual([]);
	});
});
