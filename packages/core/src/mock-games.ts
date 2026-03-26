import type { Game } from './types';

const ESPN_CDN = 'https://a.espncdn.com/i/teamlogos/ncaa/500';

/** Internal simulation state per game */
interface SimState {
	streak: 'home' | 'away' | null;
	streakTicks: number;
	postTicks: number;
	preTicks: number;
}

const CLOCK_TICK = 15; // seconds of game time per tick (matches poll interval)

/**
 * Simulates evolving game state for demo/testing.
 * Each call to tick() advances all games by one poll interval:
 * clocks count down, teams score points, and scoring runs
 * create momentum swings that trigger tab switching.
 */
export class MockGameSimulator {
	private games: Game[];
	private state: Map<string, SimState>;

	constructor() {
		this.games = [
			{
				id: 'mock-1',
				homeTeam: { id: '2305', name: 'Northeastern Huskies', abbreviation: 'NU', score: 45, logo: `${ESPN_CDN}/2305.png` },
				awayTeam: { id: '104', name: 'Boston University Terriers', abbreviation: 'BU', score: 42, logo: `${ESPN_CDN}/104.png` },
				period: 2, clockSeconds: 162, status: 'in',
			},
			{
				id: 'mock-2',
				homeTeam: { id: '238', name: 'Vanderbilt Commodores', abbreviation: 'VANDY', score: 51, logo: `${ESPN_CDN}/238.png` },
				awayTeam: { id: '57', name: 'Florida Gators', abbreviation: 'FL', score: 48, logo: `${ESPN_CDN}/57.png` },
				period: 2, clockSeconds: 284, status: 'in',
			},
			{
				id: 'mock-3',
				homeTeam: { id: '251', name: 'Texas Longhorns', abbreviation: 'TEX', score: 38, logo: `${ESPN_CDN}/251.png` },
				awayTeam: { id: '96', name: 'Kentucky Wildcats', abbreviation: 'KEN', score: 33, logo: `${ESPN_CDN}/96.png` },
				period: 1, clockSeconds: 412, status: 'in',
			},
			{
				id: 'mock-4',
				homeTeam: { id: '2', name: 'Auburn Tigers', abbreviation: 'AUB', score: 0, logo: `${ESPN_CDN}/2.png` },
				awayTeam: { id: '150', name: 'Duke Blue Devils', abbreviation: 'DUKE', score: 0, logo: `${ESPN_CDN}/150.png` },
				period: 1, clockSeconds: 1200, status: 'pre',
				startTime: new Date(Date.now() + 120_000).toISOString(),
			},
		];

		this.state = new Map();
		for (const g of this.games) {
			this.state.set(g.id, {
				streak: null,
				streakTicks: 0,
				postTicks: 0,
				preTicks: g.status === 'pre' ? 5 : 0,
			});
		}
	}

	/** Advance simulation by one tick and return current game states. */
	tick(): Game[] {
		for (const game of this.games) {
			const s = this.state.get(game.id)!;
			switch (game.status) {
				case 'in':
					this.advanceLive(game, s);
					break;
				case 'post':
					this.advancePost(game, s);
					break;
				case 'pre':
					this.advancePre(game, s);
					break;
			}
		}

		// Return deep copies so consumers can't mutate internal state
		return this.games.map(g => ({
			...g,
			homeTeam: { ...g.homeTeam },
			awayTeam: { ...g.awayTeam },
		}));
	}

	private advanceLive(game: Game, s: SimState) {
		game.clockSeconds = Math.max(0, game.clockSeconds - CLOCK_TICK);
		this.scorePoints(game, s);

		if (game.clockSeconds <= 0) {
			if (game.period === 1) {
				game.period = 2;
				game.clockSeconds = 1200;
			} else if (game.homeTeam.score === game.awayTeam.score) {
				// Tied → overtime
				game.period++;
				game.clockSeconds = 300;
			} else {
				game.status = 'post';
				s.postTicks = 0;
			}
		}
	}

	private scorePoints(game: Game, s: SimState) {
		// Manage scoring streaks (runs) — these create momentum signals
		if (s.streak) {
			s.streakTicks++;
			if (s.streakTicks > 5 || Math.random() < 0.2) {
				s.streak = null;
				s.streakTicks = 0;
			}
		} else if (Math.random() < 0.12) {
			s.streak = Math.random() < 0.5 ? 'home' : 'away';
			s.streakTicks = 0;
		}

		// Scoring probabilities — higher for the team on a streak
		const homeProb = s.streak === 'home' ? 0.55 : s.streak === 'away' ? 0.1 : 0.25;
		const awayProb = s.streak === 'away' ? 0.55 : s.streak === 'home' ? 0.1 : 0.25;
		const pts = () => Math.random() < 0.3 ? 3 : 2;

		if (Math.random() < homeProb) game.homeTeam.score += pts();
		if (Math.random() < awayProb) game.awayTeam.score += pts();

		// Late-game drama: trailing team gets a boost when margin is big
		if (game.period >= 2 && game.clockSeconds < 300) {
			const margin = Math.abs(game.homeTeam.score - game.awayTeam.score);
			if (margin > 10 && Math.random() < 0.4) {
				const trailing =
					game.homeTeam.score < game.awayTeam.score ? game.homeTeam : game.awayTeam;
				trailing.score += pts();
			}
		}
	}

	private advancePost(game: Game, s: SimState) {
		s.postTicks++;
		// Recycle finished games after a short pause
		if (s.postTicks >= 4) {
			game.status = 'in';
			game.period = 1;
			game.clockSeconds = 1200;
			game.homeTeam.score = 0;
			game.awayTeam.score = 0;
			s.streak = null;
			s.streakTicks = 0;
		}
	}

	private advancePre(game: Game, s: SimState) {
		if (s.preTicks > 0) {
			s.preTicks--;
		} else {
			game.status = 'in';
			game.period = 1;
			game.clockSeconds = 1200;
		}
	}
}
