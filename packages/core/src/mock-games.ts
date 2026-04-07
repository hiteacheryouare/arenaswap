import { LEAGUE_CONFIG_MAP } from './constants';
import type { Game } from './types';

const ESPN_CDN = 'https://a.espncdn.com/i/teamlogos';

/** Internal simulation state per game */
interface SimState {
	streak: 'home' | 'away' | null;
	streakTicks: number;
	postTicks: number;
	preTicks: number;
}

const CLOCK_TICK = 15; // seconds of game time per tick (matches poll interval)

/** Sport-family simulation params (local to mock simulator only) */
const SPORT_PARAMS: Record<Game['sportType'], {
	/** Points/goals scored per tick for each team on normal play */
	normalScoreProb: number;
	streakScoreProb: number;
	offScoreProb: number;
	/** Score values: [frequent, rare] */
	scoreValues: [number, number];
}> = {
	basketball: { normalScoreProb: 0.25, streakScoreProb: 0.55, offScoreProb: 0.1, scoreValues: [2, 3] },
	hockey: { normalScoreProb: 0.06, streakScoreProb: 0.18, offScoreProb: 0.02, scoreValues: [1, 1] },
	baseball: { normalScoreProb: 0.12, streakScoreProb: 0.35, offScoreProb: 0.04, scoreValues: [1, 2] },
	football: { normalScoreProb: 0.15, streakScoreProb: 0.4, offScoreProb: 0.05, scoreValues: [7, 3] },
	soccer: { normalScoreProb: 0.05, streakScoreProb: 0.14, offScoreProb: 0.02, scoreValues: [1, 1] },
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
				league: 'ncaab',
				sportType: 'basketball',
				homeTeam: { id: '111', name: 'Northeastern Huskies', abbreviation: 'NU', score: 45, logo: `${ESPN_CDN}/ncaa/500/111.png`, color: '#CC0000' },
				awayTeam: { id: '104', name: 'Boston University Terriers', abbreviation: 'BU', score: 42, logo: `${ESPN_CDN}/ncaa/500/104.png`, color: '#CC0000' },
				venueName: 'Matthews Arena',
				period: 4, clockSeconds: 162, status: 'in',
				broadcasts: ['TNT', 'truTV'],
				odds: {
					details: 'NU -2.5',
					overUnder: 142.5,
					provider: { name: 'Draft Kings', logoUrl: 'https://a.espncdn.com/i/betting/Draftkings_Light.svg' },
				},
			},
			{
				id: 'mock-2',
				league: 'nba',
				sportType: 'basketball',
				homeTeam: { id: '20', name: 'Philadelphia 76ers', abbreviation: 'PHI', score: 68, logo: `${ESPN_CDN}/nba/500/20.png`, color: '#006BB6' },
				awayTeam: { id: '4', name: 'Chicago Bulls', abbreviation: 'CHI', score: 65, logo: `${ESPN_CDN}/nba/500/4.png`, color: '#CE1141' },
				venueName: 'Xfinity Mobile Arena',
				period: 3, clockSeconds: 284, status: 'in',
				broadcasts: ['ESPN', 'NBCSN'],
				odds: {
					details: 'PHI -1.5',
					overUnder: 226.5,
					provider: { name: 'Draft Kings', logoUrl: 'https://a.espncdn.com/i/betting/Draftkings_Light.svg' },
				},
			},
			{
				id: 'mock-3',
				league: 'nhl',
				sportType: 'hockey',
				homeTeam: { id: '15', name: 'Philadelphia Flyers', abbreviation: 'PHI', score: 2, logo: `${ESPN_CDN}/nhl/500/15.png`, color: '#F74902' },
				awayTeam: { id: '16', name: 'Pittsburgh Penguins', abbreviation: 'PIT', score: 1, logo: `${ESPN_CDN}/nhl/500/16.png`, color: '#CFC493' },
				venueName: 'Xfinity Mobile Arena',
				period: 3, clockSeconds: 412, status: 'in',
				broadcasts: ['NHL Net'],
				odds: {
					details: 'PHI -122',
					overUnder: 6.5,
					provider: { name: 'Draft Kings', logoUrl: 'https://a.espncdn.com/i/betting/Draftkings_Light.svg' },
				},
			},
			{
				id: 'mock-4',
				league: 'mlb',
				sportType: 'baseball',
				homeTeam: { id: '22', name: 'Philadelphia Phillies', abbreviation: 'PHI', score: 3, logo: `${ESPN_CDN}/mlb/500/22.png`, color: '#E81828' },
				awayTeam: { id: '21', name: 'New York Mets', abbreviation: 'NYM', score: 2, logo: `${ESPN_CDN}/mlb/500/21.png`, color: '#002D72' },
				venueName: 'Citizens Bank Park',
				period: 8, clockSeconds: 0, status: 'in',
				broadcasts: ['MLB.TV'],
			},
			{
				id: 'mock-5',
				league: 'nfl',
				sportType: 'football',
				homeTeam: { id: '21', name: 'Philadelphia Eagles', abbreviation: 'PHI', score: 17, logo: `${ESPN_CDN}/nfl/500/21.png`, color: '#004C54' },
				awayTeam: { id: '6', name: 'Dallas Cowboys', abbreviation: 'DAL', score: 14, logo: `${ESPN_CDN}/nfl/500/6.png`, color: '#003594' },
				venueName: 'Lincoln Financial Field',
				period: 4, clockSeconds: 480, status: 'in',
				broadcasts: ['NBC', 'Peacock'],
			},
			{
				id: 'mock-6',
				league: 'ncaaf',
				sportType: 'football',
				homeTeam: { id: '218', name: 'Temple Owls', abbreviation: 'TEM', score: 0, logo: `${ESPN_CDN}/ncaa/500/218.png`, color: '#9D2235' },
				awayTeam: { id: '213', name: 'Penn State Nittany Lions', abbreviation: 'PSU', score: 0, logo: `${ESPN_CDN}/ncaa/500/213.png`, color: '#041E42' },
				venueName: 'Lincoln Financial Field',
				period: 1, clockSeconds: 900, status: 'pre',
				startTime: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
				broadcasts: ['ESPN'],
				odds: {
					details: 'PSU -6.5',
					overUnder: 48.5,
					provider: { name: 'Draft Kings', logoUrl: 'https://a.espncdn.com/i/betting/Draftkings_Light.svg' },
				},
			},
			{
				id: 'mock-7',
				league: 'wnba',
				sportType: 'basketball',
				homeTeam: { id: '17', name: 'Las Vegas Aces', abbreviation: 'LVA', score: 71, logo: `${ESPN_CDN}/wnba/500/17.png`, color: '#000000' },
				awayTeam: { id: '20', name: 'New York Liberty', abbreviation: 'NYL', score: 73, logo: `${ESPN_CDN}/wnba/500/20.png`, color: '#6ECEB2' },
				venueName: 'Michelob Ultra Arena',
				period: 4, clockSeconds: 128, status: 'in',
				broadcasts: ['Prime Video'],
			},
			{
				id: 'mock-8',
				league: 'pwhl',
				sportType: 'hockey',
				homeTeam: { id: 'pwhl-min', name: 'Minnesota Frost', abbreviation: 'MIN', score: 1, color: '#4B2E83' },
				awayTeam: { id: 'pwhl-bos', name: 'Boston Fleet', abbreviation: 'BOS', score: 2, color: '#005CB9' },
				venueName: 'Tsongas Center',
				period: 3, clockSeconds: 356, status: 'in',
				broadcasts: ['YouTube', 'NESN'],
			},
			{
				id: 'mock-9',
				league: 'mls',
				sportType: 'soccer',
				homeTeam: { id: '183', name: 'New York City FC', abbreviation: 'NYC', score: 1, logo: `${ESPN_CDN}/soccer/500/183.png`, color: '#6CADDF' },
				awayTeam: { id: '190', name: 'Philadelphia Union', abbreviation: 'PHI', score: 1, logo: `${ESPN_CDN}/soccer/500/190.png`, color: '#011F5B' },
				venueName: 'Yankee Stadium',
				period: 2, clockSeconds: 742, status: 'in',
				broadcasts: ['Apple TV'],
			},
			{
				id: 'mock-10',
				league: 'ncaamh',
				sportType: 'hockey',
				homeTeam: { id: 'ncaamh-57', name: 'Boston College Eagles', abbreviation: 'BC', score: 0, logo: `${ESPN_CDN}/ncaa/500/103.png`, color: '#98002E' },
				awayTeam: { id: 'ncaamh-87', name: 'Minnesota Golden Gophers', abbreviation: 'MIN', score: 0, logo: `${ESPN_CDN}/ncaa/500/135.png`, color: '#7A0019' },
				venueName: 'TD Garden',
				period: 1, clockSeconds: 1200, status: 'pre',
				startTime: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
				broadcasts: ['ESPNU'],
				odds: {
					details: 'BC -1.5',
					overUnder: 5.5,
					provider: { name: 'Draft Kings', logoUrl: 'https://a.espncdn.com/i/betting/Draftkings_Light.svg' },
				},
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
		const params = SPORT_PARAMS[game.sportType];
		const regularPeriods = LEAGUE_CONFIG_MAP[game.league].regularPeriods;

		if (game.sportType === 'baseball') {
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
				game.clockSeconds = LEAGUE_CONFIG_MAP[game.league].periodDurationSecs;
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
		const params = SPORT_PARAMS[game.sportType];

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
		const regularPeriods = LEAGUE_CONFIG_MAP[game.league].regularPeriods;
		const isLate = game.sportType === 'baseball'
			? game.period >= 7
			: game.period >= regularPeriods && game.clockSeconds < 300;

		if (isLate) {
			const margin = Math.abs(game.homeTeam.score - game.awayTeam.score);
			const bigMargin = game.sportType === 'hockey' || game.sportType === 'soccer' ? 2 : game.sportType === 'baseball' ? 3 : 10;
			if (margin > bigMargin && Math.random() < 0.4) {
				const trailing = game.homeTeam.score < game.awayTeam.score ? game.homeTeam : game.awayTeam;
				trailing.score += pts();
			}
		}
	}

	private advancePost(game: Game, s: SimState) {
		s.postTicks++;
		if (s.postTicks >= 4) {
			const leagueConfig = LEAGUE_CONFIG_MAP[game.league];
			game.status = 'in';
			game.period = 1;
			game.clockSeconds = leagueConfig.periodDurationSecs;
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
			const leagueConfig = LEAGUE_CONFIG_MAP[game.league];
			game.status = 'in';
			game.period = 1;
			game.clockSeconds = leagueConfig.periodDurationSecs;
		}
	}
}
