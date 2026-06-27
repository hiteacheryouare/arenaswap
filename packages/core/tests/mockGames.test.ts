import { leagueConfigMap } from '../src/constants';
import { MockGameSimulator } from '../src/mockGames';
import type { Game } from '../src/types';

interface SimState {
	streak: 'home' | 'away' | null;
	streakTicks: number;
	postTicks: number;
	preTicks: number;
}

interface SimulatorInternals {
	games: Game[];
	state: Map<string, SimState>;
}

const getGameById = (games: Game[], id: string): Game => {
	const game = games.find(candidate => candidate.id === id);
	if (!game) throw new Error(`Expected game ${id} to exist`);
	return game;
};

const getInternals = (simulator: MockGameSimulator): SimulatorInternals => (
	simulator as unknown as SimulatorInternals
);

describe('MockGameSimulator', () => {
	test('returns deep-copied game objects from tick()', () => {
		const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.99);
		const simulator = new MockGameSimulator();

		const firstTick = simulator.tick();
		const firstGame = getGameById(firstTick, 'mock-1');
		const firstScore = firstGame.homeTeam.score;

		firstGame.homeTeam.score = 999;
		firstGame.homeTeam.name = 'Mutated Team';

		const secondTick = simulator.tick();
		const updatedGame = getGameById(secondTick, 'mock-1');

		expect(updatedGame.homeTeam.score).toBe(firstScore);
		expect(updatedGame.homeTeam.name).not.toBe('Mutated Team');

		randomSpy.mockRestore();
	});

	test('advances pre-game entries into live state after countdown ticks', () => {
		const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.99);
		const simulator = new MockGameSimulator();
		let games = simulator.tick();

		for (let i = 0; i < 4; i++) {
			games = simulator.tick();
		}
		expect(getGameById(games, 'mock-6').status).toBe('pre');

		games = simulator.tick();
		const nowLive = getGameById(games, 'mock-6');
		expect(nowLive.status).toBe('in');
		expect(nowLive.period).toBe(1);
		expect(nowLive.clockSeconds).toBe(leagueConfigMap[nowLive.league].periodDurationSecs);

		randomSpy.mockRestore();
	});

	test('moves tied regulation clock-based games into overtime', () => {
		const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.99);
		const simulator = new MockGameSimulator();
		const mutableGames = getInternals(simulator).games;

		const nbaGame = mutableGames.find(game => game.id === 'mock-2');
		if (!nbaGame) throw new Error('Expected mock-2 to exist');
		nbaGame.status = 'in';
		nbaGame.period = leagueConfigMap[nbaGame.league].regularPeriods;
		nbaGame.clockSeconds = 15;
		nbaGame.homeTeam.score = 50;
		nbaGame.awayTeam.score = 50;

		const updated = getGameById(simulator.tick(), 'mock-2');
		expect(updated.status).toBe('in');
		expect(updated.period).toBe(leagueConfigMap[nbaGame.league].regularPeriods + 1);
		expect(updated.clockSeconds).toBe(300);

		randomSpy.mockRestore();
	});

	test('advances to next period at clock expiry before regulation ends', () => {
		const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.99);
		const simulator = new MockGameSimulator();
		const mutableGames = getInternals(simulator).games;
		const game = mutableGames.find(candidate => candidate.id === 'mock-2');
		if (!game) throw new Error('Expected mock-2 to exist');

		game.status = 'in';
		game.period = 2;
		game.clockSeconds = 15;
		game.homeTeam.score = 75;
		game.awayTeam.score = 72;

		const updated = getGameById(simulator.tick(), game.id);
		expect(updated.status).toBe('in');
		expect(updated.period).toBe(3);
		expect(updated.clockSeconds).toBe(leagueConfigMap[game.league].periodDurationSecs);
		expect(updated.homeTeam.score).toBe(75);
		expect(updated.awayTeam.score).toBe(72);

		randomSpy.mockRestore();
	});

	test('moves untied regulation games to post state and resets post tick counter', () => {
		const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.99);
		const simulator = new MockGameSimulator();
		const internals = getInternals(simulator);
		const game = internals.games.find(candidate => candidate.id === 'mock-2');
		if (!game) throw new Error('Expected mock-2 to exist');

		game.status = 'in';
		game.period = leagueConfigMap[game.league].regularPeriods;
		game.clockSeconds = 15;
		game.homeTeam.score = 90;
		game.awayTeam.score = 82;

		internals.state.set(game.id, {
			streak: null,
			streakTicks: 0,
			postTicks: 2,
			preTicks: 0,
		});

		const updated = getGameById(simulator.tick(), game.id);
		expect(updated.status).toBe('post');
		expect(updated.period).toBe(leagueConfigMap[game.league].regularPeriods);
		expect(updated.clockSeconds).toBe(0);
		expect(internals.state.get(game.id)?.postTicks).toBe(0);

		randomSpy.mockRestore();
	});

	test('transitions pre-game entries only after countdown reaches zero', () => {
		const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.99);
		const simulator = new MockGameSimulator();
		const internals = getInternals(simulator);
		const game = internals.games.find(candidate => candidate.id === 'mock-6');
		if (!game) throw new Error('Expected mock-6 to exist');

		game.status = 'pre';
		internals.state.set(game.id, {
			streak: null,
			streakTicks: 0,
			postTicks: 0,
			preTicks: 1,
		});

		const first = getGameById(simulator.tick(), game.id);
		expect(first.status).toBe('pre');
		expect(internals.state.get(game.id)?.preTicks).toBe(0);

		const second = getGameById(simulator.tick(), game.id);
		expect(second.status).toBe('in');
		expect(second.period).toBe(1);
		expect(second.clockSeconds).toBe(leagueConfigMap[second.league].periodDurationSecs);

		randomSpy.mockRestore();
	});

	test('resets post-game entries back to new live game after enough ticks', () => {
		const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.99);
		const simulator = new MockGameSimulator();
		const internals = getInternals(simulator);

		const game = internals.games.find(candidate => candidate.id === 'mock-1');
		if (!game) throw new Error('Expected mock-1 to exist');

		game.status = 'post';
		game.period = 4;
		game.clockSeconds = 0;
		game.homeTeam.score = 109;
		game.awayTeam.score = 102;
		internals.state.set(game.id, {
			streak: 'home',
			streakTicks: 2,
			postTicks: 3,
			preTicks: 0,
		});

		const reset = getGameById(simulator.tick(), game.id);
		const state = internals.state.get(game.id);
		expect(reset.status).toBe('in');
		expect(reset.period).toBe(1);
		expect(reset.clockSeconds).toBe(leagueConfigMap[game.league].periodDurationSecs);
		expect(reset.homeTeam.score).toBe(0);
		expect(reset.awayTeam.score).toBe(0);
		expect(state?.streak).toBeNull();
		expect(state?.streakTicks).toBe(0);

		randomSpy.mockRestore();
	});

	test('increments post tick counters until reset threshold is reached', () => {
		const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.99);
		const simulator = new MockGameSimulator();
		const internals = getInternals(simulator);
		const game = internals.games.find(candidate => candidate.id === 'mock-1');
		if (!game) throw new Error('Expected mock-1 to exist');

		game.status = 'post';
		game.period = 4;
		game.clockSeconds = 0;
		game.homeTeam.score = 99;
		game.awayTeam.score = 90;
		internals.state.set(game.id, {
			streak: null,
			streakTicks: 0,
			postTicks: 2,
			preTicks: 0,
		});

		const beforeReset = getGameById(simulator.tick(), game.id);
		expect(beforeReset.status).toBe('post');
		expect(internals.state.get(game.id)?.postTicks).toBe(3);
		expect(beforeReset.homeTeam.score).toBe(99);
		expect(beforeReset.awayTeam.score).toBe(90);

		const afterReset = getGameById(simulator.tick(), game.id);
		expect(afterReset.status).toBe('in');
		expect(afterReset.homeTeam.score).toBe(0);
		expect(afterReset.awayTeam.score).toBe(0);

		randomSpy.mockRestore();
	});

	test('preserves core state invariants across deterministic ticks', () => {
		const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.99);
		const simulator = new MockGameSimulator();
		const internals = getInternals(simulator);

		for (let i = 0; i < 12; i++) {
			const games = simulator.tick();
			expect(games).toHaveLength(internals.games.length);
			for (const game of games) {
				expect(game.period).toBeGreaterThanOrEqual(1);
				expect(Number.isInteger(game.homeTeam.score)).toBe(true);
				expect(Number.isInteger(game.awayTeam.score)).toBe(true);
				expect(game.homeTeam.score).toBeGreaterThanOrEqual(0);
				expect(game.awayTeam.score).toBeGreaterThanOrEqual(0);
				expect(internals.state.has(game.id)).toBe(true);

				if (game.status === 'in') {
					const maxClock = leagueConfigMap[game.league].periodDurationSecs;
					expect(game.clockSeconds).toBeGreaterThanOrEqual(0);
					expect(game.clockSeconds).toBeLessThanOrEqual(maxClock);
				}
			}
		}

		randomSpy.mockRestore();
	});

	test('includes mock games for ncaaw and epl leagues', () => {
		const simulator = new MockGameSimulator();
		const games = simulator.tick();

		const ncaawGame = games.find(g => g.league === 'ncaaw');
		expect(ncaawGame).toBeDefined();
		expect(ncaawGame?.sportType).toBe('basketball');
		expect(ncaawGame?.id).toBe('mock-11');

		const eplGame = games.find(g => g.league === 'epl');
		expect(eplGame).toBeDefined();
		expect(eplGame?.sportType).toBe('soccer');
		expect(eplGame?.id).toBe('mock-12');

		const fifawcGame = games.find(g => g.league === 'fifawc');
		expect(fifawcGame).toBeDefined();
		expect(fifawcGame?.sportType).toBe('soccer');
		expect(fifawcGame?.id).toBe('mock-13');
	});

	test('simulates ncaaw basketball game correctly across ticks', () => {
		const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.99);
		const simulator = new MockGameSimulator();

		for (let i = 0; i < 5; i++) {
			const games = simulator.tick();
			const ncaawGame = games.find(g => g.id === 'mock-11')!;
			expect(ncaawGame.league).toBe('ncaaw');
			expect(ncaawGame.sportType).toBe('basketball');
			expect(ncaawGame.homeTeam.score).toBeGreaterThanOrEqual(0);
			expect(ncaawGame.awayTeam.score).toBeGreaterThanOrEqual(0);
		}

		randomSpy.mockRestore();
	});

	test('simulates epl soccer game correctly across ticks', () => {
		const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.99);
		const simulator = new MockGameSimulator();

		for (let i = 0; i < 5; i++) {
			const games = simulator.tick();
			const eplGame = games.find(g => g.id === 'mock-12')!;
			expect(eplGame.league).toBe('epl');
			expect(eplGame.sportType).toBe('soccer');
			expect(eplGame.homeTeam.score).toBeGreaterThanOrEqual(0);
			expect(eplGame.awayTeam.score).toBeGreaterThanOrEqual(0);
		}

		randomSpy.mockRestore();
	});

	describe('BSO simulation (baseball)', () => {
		test('baseball mock games start with a defined bso field', () => {
			const simulator = new MockGameSimulator();
			const games = simulator.tick();
			expect(getGameById(games, 'mock-4').bso).toBeDefined();
			expect(getGameById(games, 'mock-16').bso).toBeDefined();
		});

		test('non-baseball mock games do not have a bso field', () => {
			const simulator = new MockGameSimulator();
			const games = simulator.tick();
			expect(getGameById(games, 'mock-1').bso).toBeUndefined();
			expect(getGameById(games, 'mock-5').bso).toBeUndefined();
			expect(getGameById(games, 'mock-3').bso).toBeUndefined();
		});

		test('bso values stay within valid ranges across 30 ticks', () => {
			const simulator = new MockGameSimulator();
			for (let i = 0; i < 30; i++) {
				const games = simulator.tick();
				for (const game of games) {
					if (!game.bso) continue;
					expect(game.bso.balls).toBeGreaterThanOrEqual(0);
					expect(game.bso.balls).toBeLessThanOrEqual(3);
					expect(game.bso.strikes).toBeGreaterThanOrEqual(0);
					expect(game.bso.strikes).toBeLessThanOrEqual(2);
					expect(game.bso.outs).toBeGreaterThanOrEqual(0);
					expect(game.bso.outs).toBeLessThanOrEqual(2);
				}
			}
		});

		test('bso is deep-copied so mutating returned games does not affect the simulator', () => {
			const simulator = new MockGameSimulator();
			const firstTick = simulator.tick();
			const mlbGame = getGameById(firstTick, 'mock-4');
			expect(mlbGame.bso).toBeDefined();

			mlbGame.bso!.balls = 999;
			mlbGame.bso!.strikes = 999;

			const secondTick = simulator.tick();
			const updated = getGameById(secondTick, 'mock-4');
			expect(updated.bso?.balls).toBeLessThanOrEqual(3);
			expect(updated.bso?.strikes).toBeLessThanOrEqual(2);
		});

		test('post-game reset sets bso back to all zeros', () => {
			const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.99);
			const simulator = new MockGameSimulator();
			const internals = getInternals(simulator);
			const game = internals.games.find(g => g.id === 'mock-4')!;

			game.status = 'post';
			game.bso = { balls: 2, strikes: 1, outs: 2 };
			internals.state.set(game.id, { streak: null, streakTicks: 0, postTicks: 3, preTicks: 0 });

			const reset = getGameById(simulator.tick(), game.id);
			expect(reset.bso).toEqual({ balls: 0, strikes: 0, outs: 0 });

			randomSpy.mockRestore();
		});
	});

	describe('downDistance simulation (football)', () => {
		test('football mock game (mock-5) starts with a defined downDistance string', () => {
			const simulator = new MockGameSimulator();
			const games = simulator.tick();
			const nflGame = getGameById(games, 'mock-5');
			expect(nflGame.downDistance).toBeDefined();
			expect(typeof nflGame.downDistance).toBe('string');
		});

		test('non-football mock games do not have a downDistance field', () => {
			const simulator = new MockGameSimulator();
			const games = simulator.tick();
			expect(getGameById(games, 'mock-4').downDistance).toBeUndefined();
			expect(getGameById(games, 'mock-1').downDistance).toBeUndefined();
			expect(getGameById(games, 'mock-3').downDistance).toBeUndefined();
		});

		test('downDistance changes when random is below the play threshold', () => {
			const simulator = new MockGameSimulator();
			const internals = getInternals(simulator);
			const game = internals.games.find(g => g.id === 'mock-5')!;
			game.downDistance = '1st & 10';

			const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.1);
			const updated = getGameById(simulator.tick(), 'mock-5');
			expect(updated.downDistance).not.toBe('1st & 10');

			randomSpy.mockRestore();
		});

		test('downDistance stays the same when random is above the play threshold', () => {
			const simulator = new MockGameSimulator();
			const internals = getInternals(simulator);
			const game = internals.games.find(g => g.id === 'mock-5')!;
			game.downDistance = '2nd & 8';

			const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.9);
			const updated = getGameById(simulator.tick(), 'mock-5');
			expect(updated.downDistance).toBe('2nd & 8');

			randomSpy.mockRestore();
		});

		test('post-game reset sets downDistance back to "1st & 10"', () => {
			const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.99);
			const simulator = new MockGameSimulator();
			const internals = getInternals(simulator);
			const game = internals.games.find(g => g.id === 'mock-5')!;

			game.status = 'post';
			game.downDistance = '4th & 2';
			internals.state.set(game.id, { streak: null, streakTicks: 0, postTicks: 3, preTicks: 0 });

			const reset = getGameById(simulator.tick(), game.id);
			expect(reset.downDistance).toBe('1st & 10');

			randomSpy.mockRestore();
		});
	});
});
