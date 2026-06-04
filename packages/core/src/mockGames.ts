import { leagueConfigMap } from './constants';
import type { Game } from './types';

const espnCdn = 'https://a.espncdn.com/i/teamlogos';

/** Internal simulation state per game */
interface SimState {
	streak: 'home' | 'away' | null;
	streakTicks: number;
	postTicks: number;
	preTicks: number;
}

const clockTick = 15; // seconds of game time per tick (matches poll interval)
const preGameTicksBeforeStart = 5;
const resetPostGameAfterTicks = 4;
const overtimePeriodSeconds = 300;
const baseballInningAdvanceChance = 0.15;
const baseballLateInningThreshold = 7;
const streakMaxTicks = 5;
const streakEndChance = 0.2;
const streakStartChance = 0.12;
const streakHomeChance = 0.5;
const rareScoreChance = 0.3;
const lateGameThresholdSeconds = 300;
const lateGameComebackChance = 0.4;

/** Sport-family simulation params (local to mock simulator only).
 *
 * Per-tick scoring probabilities are tuned to realistic per-game TOTALS at the 15s tick rate, so each
 * sport's demo cadence matches reality: basketball scores almost every possession (graph always moving),
 * while hockey/soccer go long stretches without a goal. The continuous "pulse" for low-scoring sports
 * comes from the PowerScore v2 progress ramp + decay tails — NOT from unrealistically frequent scoring.
 *
 * Rough sanity check (regulation ticks × normalScoreProb × avg points ≈ points/team/game):
 *   basketball ~192 ticks → ~110 pts   football ~240 → ~26   hockey ~240 → ~3.5
 *   soccer ~360 → ~2      baseball ~60 half-inning ticks → ~4.5 runs
 */
const sportParams: Record<Game['sportType'], {
	/** Probability a team scores on a given tick during normal play */
	normalScoreProb: number;
	/** Probability while the team is on a hot streak (flurry / power play / scoring drive) */
	streakScoreProb: number;
	/** Probability for the cold team while the other side is streaking */
	offScoreProb: number;
	/** Score values: [frequent, rare] */
	scoreValues: [number, number];
}> = {
	basketball: { normalScoreProb: 0.25, streakScoreProb: 0.55, offScoreProb: 0.1, scoreValues: [2, 3] },
	football: { normalScoreProb: 0.02, streakScoreProb: 0.1, offScoreProb: 0.01, scoreValues: [7, 3] },
	baseball: { normalScoreProb: 0.06, streakScoreProb: 0.22, offScoreProb: 0.03, scoreValues: [1, 2] },
	hockey: { normalScoreProb: 0.014, streakScoreProb: 0.05, offScoreProb: 0.006, scoreValues: [1, 1] },
	soccer: { normalScoreProb: 0.006, streakScoreProb: 0.022, offScoreProb: 0.003, scoreValues: [1, 1] },
};

const getStreakAdjustedProb = (
	streak: SimState['streak'],
	side: 'home' | 'away',
	params: (typeof sportParams)[Game['sportType']],
): number => {
	if (streak === side) return params.streakScoreProb;
	if (streak) return params.offScoreProb;
	return params.normalScoreProb;
};

const getLateGameMarginThreshold = (sportType: Game['sportType']): number => {
	if (sportType === 'hockey' || sportType === 'soccer') return 2;
	if (sportType === 'baseball') return 3;
	return 10;
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
				homeTeam: { id: '111', name: 'Northeastern Huskies', abbreviation: 'NU', score: 45, logo: `${espnCdn}/ncaa/500/111.png`, color: '#CC0000' },
				awayTeam: { id: '104', name: 'Boston University Terriers', abbreviation: 'BU', score: 42, logo: `${espnCdn}/ncaa/500/104.png`, color: '#CC0000' },
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
				homeTeam: { id: '20', name: 'Philadelphia 76ers', abbreviation: 'PHI', score: 68, logo: `${espnCdn}/nba/500/phi.png`, color: '#006BB6' },
				awayTeam: { id: '4', name: 'Chicago Bulls', abbreviation: 'CHI', score: 65, logo: `${espnCdn}/nba/500/chi.png`, color: '#CE1141' },
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
				homeTeam: { id: '15', name: 'Philadelphia Flyers', abbreviation: 'PHI', score: 2, logo: `${espnCdn}/nhl/500/phi.png`, color: '#F74902' },
				awayTeam: { id: '16', name: 'Pittsburgh Penguins', abbreviation: 'PIT', score: 1, logo: `${espnCdn}/nhl/500/pit.png`, color: '#CFC493' },
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
				homeTeam: { id: '22', name: 'Philadelphia Phillies', abbreviation: 'PHI', score: 3, logo: `${espnCdn}/mlb/500/phi.png`, color: '#E81828' },
				awayTeam: { id: '21', name: 'New York Mets', abbreviation: 'NYM', score: 2, logo: `${espnCdn}/mlb/500/nym.png`, color: '#002D72' },
				venueName: 'Citizens Bank Park',
				period: 8, clockSeconds: 0, status: 'in',
				topOfInning: false,
				baseRunners: { first: true, second: false, third: true },
				broadcasts: ['MLB.TV'],
			},
			{
				id: 'mock-5',
				league: 'nfl',
				sportType: 'football',
				homeTeam: { id: '21', name: 'Philadelphia Eagles', abbreviation: 'PHI', score: 17, logo: `${espnCdn}/nfl/500/phi.png`, color: '#004C54' },
				awayTeam: { id: '6', name: 'Dallas Cowboys', abbreviation: 'DAL', score: 14, logo: `${espnCdn}/nfl/500/dal.png`, color: '#003594' },
				venueName: 'Lincoln Financial Field',
				period: 4, clockSeconds: 480, status: 'in',
				broadcasts: ['NBC', 'Peacock'],
			},
			{
				id: 'mock-6',
				league: 'ncaaf',
				sportType: 'football',
				homeTeam: { id: '218', name: 'Temple Owls', abbreviation: 'TEM', score: 0, logo: `${espnCdn}/ncaa/500/218.png`, color: '#9D2235' },
				awayTeam: { id: '213', name: 'Penn State Nittany Lions', abbreviation: 'PSU', score: 0, logo: `${espnCdn}/ncaa/500/213.png`, color: '#041E42' },
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
				id: 'mock-9',
				league: 'mls',
				sportType: 'soccer',
				homeTeam: { id: '190', name: 'Philadelphia Union', abbreviation: 'PHI', score: 2, logo: `${espnCdn}/soccer/500/10739.png`, color: '#051c2c' },
				awayTeam: { id: '183', name: 'New York Red Bull', abbreviation: 'NYR', score: 1, logo: `${espnCdn}/soccer/500/190.png`, color: '#b91f31' },
				venueName: 'Subaru Park',
				period: 2, clockSeconds: 742, status: 'in',
				broadcasts: ['Apple TV'],
			},
			{
				id: 'mock-10',
				league: 'ncaamh',
				sportType: 'hockey',
				homeTeam: { id: '111', name: 'Northeastern Huskies', abbreviation: 'NU', score: 5, logo: `${espnCdn}/ncaa/500/111.png`, color: '#CC0000' },
				awayTeam: { id: 'ncaamh-57', name: 'Boston College Eagles', abbreviation: 'BC', score: 0, logo: `${espnCdn}/ncaa/500/103.png`, color: '#b91f31' },
				venueName: 'TD Garden',
				period: 1, clockSeconds: 1200, status: 'pre',
				startTime: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
				broadcasts: ['ESPNU'],
				odds: {
					details: 'NU -1.5',
					overUnder: 5.5,
					provider: { name: 'Draft Kings', logoUrl: 'https://a.espncdn.com/i/betting/Draftkings_Light.svg' },
				},
			},
			{
				id: 'mock-11',
				league: 'ncaaw',
				sportType: 'basketball',
				homeTeam: { id: '111', name: 'Northeastern Huskies', abbreviation: 'NU', score: 55, logo: `${espnCdn}/ncaa/500/111.png`, color: '#CC0000' },
				awayTeam: { id: '222', name: 'Villanova Wildcats', abbreviation: 'VIL', score: 52, logo: `${espnCdn}/ncaa/500/222.png`, color: '#003366' },
				venueName: 'Cabot Center',
				period: 3, clockSeconds: 420, status: 'in',
				broadcasts: ['ESPN2'],
				odds: {
					details: 'NU -3.5',
					overUnder: 138.5,
					provider: { name: 'Draft Kings', logoUrl: 'https://a.espncdn.com/i/betting/Draftkings_Light.svg' },
				},
			},
			{
				id: 'mock-12',
				league: 'epl',
				sportType: 'soccer',
				homeTeam: { id: '364', name: 'Liverpool FC', abbreviation: 'LIV', score: 1, logo: `${espnCdn}/soccer/500/364.png`, color: '#C8102E' },
				awayTeam: { id: '359', name: 'Arsenal', abbreviation: 'ARS', score: 1, logo: `${espnCdn}/soccer/500/359.png`, color: '#EF0107' },
				venueName: 'Anfield',
				period: 2, clockSeconds: 1980, status: 'in',
				broadcasts: ['Peacock'],
			},
			{
				id: 'mock-13',
				league: 'fifawc',
				sportType: 'soccer',
				homeTeam: { id: '564', name: 'United States', abbreviation: 'USA', score: 1, logo: `${espnCdn}/countries/500/usa.png`, color: '#002868' },
				awayTeam: { id: '239', name: 'Mexico', abbreviation: 'MEX', score: 1, logo: `${espnCdn}/countries/500/mex.png`, color: '#006847' },
				venueName: 'Lincoln Financial Field',
				period: 2, clockSeconds: 2400, status: 'in',
				broadcasts: ['Fox'],
			},
			{
				id: 'mock-14',
				league: 'nhl',
				sportType: 'hockey',
				homeTeam: { id: '3', name: 'New York Rangers', abbreviation: 'NYR', score: 2, logo: `${espnCdn}/nhl/500/nyr.png`, color: '#0038A8' },
				awayTeam: { id: '1', name: 'Boston Bruins', abbreviation: 'BOS', score: 2, logo: `${espnCdn}/nhl/500/bos.png`, color: '#FFB81C' },
				venueName: 'Madison Square Garden',
				period: 4, clockSeconds: 214, status: 'in',
				broadcasts: ['TNT'],
				odds: { details: 'NYR -115', overUnder: 5.5 },
			},
			{
				id: 'mock-15',
				league: 'nba',
				sportType: 'basketball',
				homeTeam: { id: '5', name: 'Cleveland Cavaliers', abbreviation: 'CLE', score: 108, logo: `${espnCdn}/nba/500/cle.png`, color: '#860038' },
				awayTeam: { id: '13', name: 'Milwaukee Bucks', abbreviation: 'MIL', score: 107, logo: `${espnCdn}/nba/500/mil.png`, color: '#00471B' },
				venueName: 'Rocket Mortgage FieldHouse',
				period: 4, clockSeconds: 38, status: 'in',
				broadcasts: ['ESPN'],
				odds: { details: 'CLE -1.5', overUnder: 224.5 },
			},
			{
				id: 'mock-16',
				league: 'mlb',
				sportType: 'baseball',
				homeTeam: { id: '28', name: 'Houston Astros', abbreviation: 'HOU', score: 4, logo: `${espnCdn}/mlb/500/hou.png`, color: '#EB6E1F' },
				awayTeam: { id: '10', name: 'Los Angeles Dodgers', abbreviation: 'LAD', score: 4, logo: `${espnCdn}/mlb/500/lad.png`, color: '#005A9C' },
				venueName: 'Minute Maid Park',
				period: 10, clockSeconds: 0, status: 'in',
				topOfInning: true,
				baseRunners: { first: false, second: true, third: false },
				broadcasts: ['Fox'],
			},
		];

		this.state = new Map();
		for (const g of this.games) {
			this.state.set(g.id, {
				streak: null,
				streakTicks: 0,
				postTicks: 0,
				preTicks: g.status === 'pre' ? preGameTicksBeforeStart : 0,
			});
		}
	}

	/** Advance simulation by one tick and return current game states. */
	tick = (): Game[] => {
		for (const game of this.games) {
			const simState = this.state.get(game.id)!;
			switch (game.status) {
				case 'in':
					this.advanceLive(game, simState);
					break;
				case 'post':
					this.advancePost(game, simState);
					break;
				case 'pre':
					this.advancePre(game, simState);
					break;
			}
		}

		// Return deep copies so consumers can't mutate internal state
		return this.games.map(g => ({
			...g,
			homeTeam: { ...g.homeTeam },
			awayTeam: { ...g.awayTeam },
		}));
	};

	private advanceLive = (game: Game, simState: SimState): void => {
		const regularPeriods = leagueConfigMap[game.league].regularPeriods;

		if (game.sportType === 'baseball') {
			// MLB: simulate half-innings; advance inning every few ticks
			this.scorePoints(game, simState);
			if (Math.random() < baseballInningAdvanceChance) {
				// inning ends
				if (game.period >= regularPeriods && game.homeTeam.score !== game.awayTeam.score) {
					game.status = 'post';
					simState.postTicks = 0;
				} else {
					game.period = Math.min(game.period + 1, regularPeriods + 3);
				}
			}
			return;
		}

		game.clockSeconds = Math.max(0, game.clockSeconds - clockTick);
		this.scorePoints(game, simState);

		if (game.clockSeconds <= 0) {
			if (game.period < regularPeriods) {
				game.period++;
				game.clockSeconds = leagueConfigMap[game.league].periodDurationSecs;
			} else if (game.homeTeam.score === game.awayTeam.score) {
				// Tied → overtime
				game.period++;
				game.clockSeconds = overtimePeriodSeconds;
			} else {
				game.status = 'post';
				simState.postTicks = 0;
			}
		}
	};

	private scorePoints = (game: Game, simState: SimState): void => {
		const params = sportParams[game.sportType];

		// Manage scoring streaks
		if (simState.streak) {
			simState.streakTicks++;
			if (simState.streakTicks > streakMaxTicks || Math.random() < streakEndChance) {
				simState.streak = null;
				simState.streakTicks = 0;
			}
		} else if (Math.random() < streakStartChance) {
			simState.streak = Math.random() < streakHomeChance ? 'home' : 'away';
			simState.streakTicks = 0;
		}

		const homeProb = getStreakAdjustedProb(simState.streak, 'home', params);
		const awayProb = getStreakAdjustedProb(simState.streak, 'away', params);
		const pointsForScore = (): number => (
			Math.random() < rareScoreChance ? params.scoreValues[1] : params.scoreValues[0]
		);

		if (Math.random() < homeProb) game.homeTeam.score += pointsForScore();
		if (Math.random() < awayProb) game.awayTeam.score += pointsForScore();

		// Late-game drama: trailing team gets a boost when losing badly
		const regularPeriods = leagueConfigMap[game.league].regularPeriods;
		const isLate = game.sportType === 'baseball'
			? game.period >= baseballLateInningThreshold
			: game.period >= regularPeriods && game.clockSeconds < lateGameThresholdSeconds;

		if (isLate) {
			const margin = Math.abs(game.homeTeam.score - game.awayTeam.score);
			const bigMargin = getLateGameMarginThreshold(game.sportType);
			if (margin > bigMargin && Math.random() < lateGameComebackChance) {
				const trailing = game.homeTeam.score < game.awayTeam.score ? game.homeTeam : game.awayTeam;
				trailing.score += pointsForScore();
			}
		}
	};

	private advancePost = (game: Game, simState: SimState): void => {
		simState.postTicks++;
		if (simState.postTicks >= resetPostGameAfterTicks) {
			const leagueConfig = leagueConfigMap[game.league];
			game.status = 'in';
			game.period = 1;
			game.clockSeconds = leagueConfig.periodDurationSecs;
			game.homeTeam.score = 0;
			game.awayTeam.score = 0;
			simState.streak = null;
			simState.streakTicks = 0;
		}
	};

	private advancePre = (game: Game, simState: SimState): void => {
		if (simState.preTicks > 0) {
			simState.preTicks--;
		} else {
			const leagueConfig = leagueConfigMap[game.league];
			game.status = 'in';
			game.period = 1;
			game.clockSeconds = leagueConfig.periodDurationSecs;
		}
	};
}
