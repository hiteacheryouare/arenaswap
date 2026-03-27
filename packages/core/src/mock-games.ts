import type { Game, SportId } from './types';

const ESPN_CDN = 'https://a.espncdn.com/i/teamlogos';

/** Internal simulation state per game */
interface SimState {
	streak: 'home' | 'away' | null;
	streakTicks: number;
	postTicks: number;
	preTicks: number;
}

const CLOCK_TICK = 15; // seconds of game time per tick (matches poll interval)

/** Sport-specific simulation params (local to mock simulator only) */
const SPORT_PARAMS: Record<SportId, {
	periodDurationSecs: number;
	/** Points/goals scored per tick for each team on normal play */
	normalScoreProb: number;
	streakScoreProb: number;
	offScoreProb: number;
	/** Score values: [frequent, rare] */
	scoreValues: [number, number];
}> = {
	nba:   { periodDurationSecs: 720,  normalScoreProb: 0.25, streakScoreProb: 0.55, offScoreProb: 0.1,  scoreValues: [2, 3] },
	ncaab: { periodDurationSecs: 1200, normalScoreProb: 0.25, streakScoreProb: 0.55, offScoreProb: 0.1,  scoreValues: [2, 3] },
	nhl:   { periodDurationSecs: 1200, normalScoreProb: 0.06, streakScoreProb: 0.18, offScoreProb: 0.02, scoreValues: [1, 1] },
	mlb:   { periodDurationSecs: 0,    normalScoreProb: 0.12, streakScoreProb: 0.35, offScoreProb: 0.04, scoreValues: [1, 2] },
	nfl:   { periodDurationSecs: 900,  normalScoreProb: 0.15, streakScoreProb: 0.4,  offScoreProb: 0.05, scoreValues: [7, 3] },
	ncaaf: { periodDurationSecs: 900,  normalScoreProb: 0.15, streakScoreProb: 0.4,  offScoreProb: 0.05, scoreValues: [7, 3] },
};

const REGULAR_PERIODS: Record<SportId, number> = {
	nba: 4, ncaab: 2, nhl: 3, mlb: 9, nfl: 4, ncaaf: 4,
};

/**
 * Simulates evolving game state for demo/testing across multiple sports.
 * Each call to tick() advances all games by one poll interval.
 */
export class MockGameSimulator {
	private games: Game[];
	private state: Map<string, SimState>;

	constructor() {
		this.games = [
			{
				id: 'mock-1',
				sport: 'ncaab',
				homeTeam: { id: '111', name: 'Northeastern Huskies', abbreviation: 'NU', score: 45, logo: `${ESPN_CDN}/ncaa/500/111.png` },
				awayTeam: { id: '104', name: 'Boston University Terriers', abbreviation: 'BU', score: 42, logo: `${ESPN_CDN}/ncaa/500/104.png` },
				venueName: 'Matthews Arena',
				period: 2, clockSeconds: 162, status: 'in',
			},
			{
				id: 'mock-2',
				sport: 'nba',
				homeTeam: { id: '20', name: 'Philadelphia 76ers', abbreviation: 'PHI', score: 68, logo: `${ESPN_CDN}/nba/500/20.png` },
				awayTeam: { id: '4', name: 'Chicago Bulls', abbreviation: 'CHI', score: 65, logo: `${ESPN_CDN}/nba/500/4.png` },
				venueName: 'Wells Fargo Center',
				period: 3, clockSeconds: 284, status: 'in',
			},
			{
				id: 'mock-3',
				sport: 'nhl',
				homeTeam: { id: '4', name: 'Philadelphia Flyers', abbreviation: 'PHI', score: 2, logo: `${ESPN_CDN}/nhl/500/4.png` },
				awayTeam: { id: '9', name: 'Pittsburgh Penguins', abbreviation: 'PIT', score: 1, logo: `${ESPN_CDN}/nhl/500/9.png` },
				venueName: 'Wells Fargo Center',
				period: 3, clockSeconds: 412, status: 'in',
			},
			{
				id: 'mock-4',
				sport: 'mlb',
				homeTeam: { id: '22', name: 'Philadelphia Phillies', abbreviation: 'PHI', score: 3, logo: `${ESPN_CDN}/mlb/500/22.png` },
				awayTeam: { id: '21', name: 'New York Mets', abbreviation: 'NYM', score: 2, logo: `${ESPN_CDN}/mlb/500/21.png` },
				venueName: 'Citizens Bank Park',
				period: 8, clockSeconds: 0, status: 'in',
			},
			{
				id: 'mock-5',
				sport: 'nfl',
				homeTeam: { id: '21', name: 'Philadelphia Eagles', abbreviation: 'PHI', score: 17, logo: `${ESPN_CDN}/nfl/500/21.png` },
				awayTeam: { id: '6', name: 'Dallas Cowboys', abbreviation: 'DAL', score: 14, logo: `${ESPN_CDN}/nfl/500/6.png` },
				venueName: 'Lincoln Financial Field',
				period: 4, clockSeconds: 480, status: 'in',
			},
			{
				id: 'mock-6',
				sport: 'ncaaf',
				homeTeam: { id: '218', name: 'Temple Owls', abbreviation: 'TEM', score: 0, logo: `${ESPN_CDN}/ncaa/500/218.png` },
				awayTeam: { id: '213', name: 'Penn State Nittany Lions', abbreviation: 'PSU', score: 0, logo: `${ESPN_CDN}/ncaa/500/213.png` },
				venueName: 'Lincoln Financial Field',
				period: 1, clockSeconds: 900, status: 'pre',
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
		const params = SPORT_PARAMS[game.sport];
		const regularPeriods = REGULAR_PERIODS[game.sport];

		if (game.sport === 'mlb') {
			// MLB: simulate half-innings; advance inning every few ticks
			this.scorePoints(game, s);
			if (Math.random() < 0.15) {
				// inning ends
				if (game.period >= regularPeriods && game.homeTeam.score !== game.awayTeam.score) {
					game.status = 'post';
					s.postTicks = 0;
				} else {
					game.period = Math.min(game.period + 1, regularPeriods + 3);
				}
			}
			return;
		}

		game.clockSeconds = Math.max(0, game.clockSeconds - CLOCK_TICK);
		this.scorePoints(game, s);

		if (game.clockSeconds <= 0) {
			if (game.period < regularPeriods) {
				game.period++;
				game.clockSeconds = params.periodDurationSecs;
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
		const params = SPORT_PARAMS[game.sport];

		// Manage scoring streaks
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

		const homeProb = s.streak === 'home' ? params.streakScoreProb : s.streak === 'away' ? params.offScoreProb : params.normalScoreProb;
		const awayProb = s.streak === 'away' ? params.streakScoreProb : s.streak === 'home' ? params.offScoreProb : params.normalScoreProb;
		const pts = () => Math.random() < 0.3 ? params.scoreValues[1] : params.scoreValues[0];

		if (Math.random() < homeProb) game.homeTeam.score += pts();
		if (Math.random() < awayProb) game.awayTeam.score += pts();

		// Late-game drama: trailing team gets a boost when losing badly
		const regularPeriods = REGULAR_PERIODS[game.sport];
		const isLate = game.sport === 'mlb'
			? game.period >= 7
			: game.period >= regularPeriods && game.clockSeconds < 300;

		if (isLate) {
			const margin = Math.abs(game.homeTeam.score - game.awayTeam.score);
			const bigMargin = game.sport === 'nhl' ? 2 : game.sport === 'mlb' ? 3 : 10;
			if (margin > bigMargin && Math.random() < 0.4) {
				const trailing = game.homeTeam.score < game.awayTeam.score ? game.homeTeam : game.awayTeam;
				trailing.score += pts();
			}
		}
	}

	private advancePost(game: Game, s: SimState) {
		s.postTicks++;
		if (s.postTicks >= 4) {
			const params = SPORT_PARAMS[game.sport];
			game.status = 'in';
			game.period = 1;
			game.clockSeconds = params.periodDurationSecs;
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
			const params = SPORT_PARAMS[game.sport];
			game.status = 'in';
			game.period = 1;
			game.clockSeconds = params.periodDurationSecs;
		}
	}
}
