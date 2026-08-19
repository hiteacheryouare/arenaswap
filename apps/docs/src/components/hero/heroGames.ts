import type { Game } from '@arenaswap/core/types';

// The five games in the hero, and the play-by-play they run through.
//
// Nothing here is a PowerScore. The scores on the cards are computed at render time by
// `computePowerScore` from the `powerscore` package — the same function the extension calls —
// over the score history this timeline produces. That split is the point: this file authors a
// game, and the shipped algorithm decides how good it is. A hardcoded PowerScore would be a
// number nobody could check, and the first implausible one would give the whole hero away.
//
// `scripts/validate-hero-timeline.ts` prints the resulting scores per tick. Run it after
// touching any beat below, because a plausible-looking edit can flatten the ranking the hero
// depends on.

const espnTeamLogo = (path: string) => `https://a.espncdn.com/i/teamlogos/${path}.png`;

// A beat sets state from its tick onwards. Anything it leaves out carries forward, so a run of
// quiet polls costs one line instead of six.
export interface HeroBeat {
	tick: number;
	away?: number;
	home?: number;
	period?: number;
	// Restated whenever the period changes; between beats it moves by `clockPerTick`.
	clock?: number;
	topOfInning?: boolean;
	bso?: { balls: number; strikes: number; outs: number };
	baseRunners?: { first: boolean; second: boolean; third: boolean };
	downDistance?: string;
	fieldPosition?: string;
	isRedZone?: boolean;
	down?: number;
	distance?: number;
	// Not rendered. It labels what this beat is for, so the next person editing the timeline can see
	// the story in the data instead of reconstructing it from score deltas.
	note?: string;
}

export interface HeroGameScript {
	// The parts of the game that do not move.
	base: Omit<Game, 'period' | 'clockSeconds' | 'awayTeam' | 'homeTeam'> & {
		awayTeam: Omit<Game['awayTeam'], 'score'>;
		homeTeam: Omit<Game['homeTeam'], 'score'>;
	};
	video: string;
	poster: string;
	// The stream this tab is pretending to be, as it would read in a browser tab.
	tabTitle: string;
	tabHost: string;
	// Seconds of game clock burned per tick. Soccer counts up, everything else counts down.
	clockPerTick: number;
	clockCountsUp?: boolean;
	// Innings and halves have no running clock to advance.
	clockless?: boolean;
	periodSeconds: number;
	beats: HeroBeat[];
}

export const heroTickMs = 1150;
export const heroTickCount = 24;

// A tick stands in for one poll. The extension polls a good game about every 6 seconds and
// burns roughly this much game clock between polls at the compression the hero runs at.
export const heroGames: HeroGameScript[] = [
	{
		base: {
			id: 'hero-mlb',
			league: 'mlb',
			sportType: 'baseball',
			status: 'in',
			venueName: 'Citizens Bank Park',
			broadcasts: ['ESPN+'],
			awayTeam: { id: '28', name: 'Miami Marlins', abbreviation: 'MIA', logo: espnTeamLogo('mlb/500/mia'), color: '#00A3E0', alternateColor: '#EF3340' },
			homeTeam: { id: '22', name: 'Philadelphia Phillies', abbreviation: 'PHI', logo: espnTeamLogo('mlb/500/phi'), color: '#E81828', alternateColor: '#002D72' },
		},
		video: 'baseball',
		poster: 'baseball',
		tabTitle: 'Marlins at Phillies',
		tabHost: 'espn.com',
		clockPerTick: 0,
		clockless: true,
		periodSeconds: 0,
		beats: [
			{ tick: 0, away: 4, home: 5, period: 8, clock: 0, topOfInning: true, bso: { balls: 1, strikes: 2, outs: 1 }, baseRunners: { first: false, second: true, third: false } },
			{ tick: 2, bso: { balls: 3, strikes: 2, outs: 1 }, baseRunners: { first: true, second: true, third: false } },
			{ tick: 4, bso: { balls: 0, strikes: 0, outs: 2 } },
			{ tick: 6, period: 8, topOfInning: false, bso: { balls: 1, strikes: 1, outs: 0 }, baseRunners: { first: true, second: false, third: false } },
			{ tick: 8, home: 7, bso: { balls: 0, strikes: 1, outs: 1 }, baseRunners: { first: false, second: true, third: false }, note: 'PHI 7' },
			{ tick: 11, home: 9, bso: { balls: 2, strikes: 2, outs: 2 }, baseRunners: { first: true, second: false, third: false }, note: 'PHI 9' },
			// Miami's last at bat, with Philadelphia ahead. The home half of the ninth would not be
			// played from here, so the inning never flips.
			{ tick: 14, period: 9, topOfInning: true, bso: { balls: 0, strikes: 0, outs: 0 }, baseRunners: { first: false, second: false, third: false } },
			{ tick: 18, bso: { balls: 2, strikes: 1, outs: 1 }, baseRunners: { first: true, second: false, third: false } },
			{ tick: 21, bso: { balls: 1, strikes: 2, outs: 2 } },
		],
	},
	{
		base: {
			id: 'hero-nba',
			league: 'nba',
			sportType: 'basketball',
			status: 'in',
			venueName: 'Madison Square Garden',
			broadcasts: ['ESPN'],
			awayTeam: { id: '2', name: 'Boston Celtics', abbreviation: 'BOS', logo: espnTeamLogo('nba/500/bos'), color: '#007A33', alternateColor: '#BA9653' },
			homeTeam: { id: '18', name: 'New York Knicks', abbreviation: 'NYK', logo: espnTeamLogo('nba/500/nyk'), color: '#006BB6', alternateColor: '#F58426' },
		},
		video: 'basketball',
		poster: 'basketball',
		tabTitle: 'Celtics at Knicks',
		tabHost: 'espn.com',
		clockPerTick: 46,
		periodSeconds: 720,
		beats: [
			{ tick: 0, away: 78, home: 74, period: 3, clock: 252 },
			{ tick: 1, away: 80 },
			{ tick: 3, away: 83, home: 79 },
			{ tick: 5, away: 85, home: 84, period: 3, clock: 44 },
			{ tick: 6, period: 4, clock: 720 },
			{ tick: 8, away: 88, home: 87 },
			{ tick: 10, away: 90, home: 92 },
			{ tick: 12, away: 93, home: 95 },
			{ tick: 15, away: 97, home: 98 },
			{ tick: 17, away: 100, home: 100, note: 'Tied 100-100' },
			{ tick: 19, away: 102, home: 103, note: 'NYK by 1' },
			{ tick: 21, away: 104, home: 105 },
			{ tick: 23, away: 106, home: 105, note: 'BOS by 1' },
		],
	},
	{
		base: {
			id: 'hero-nhl',
			league: 'nhl',
			sportType: 'hockey',
			status: 'in',
			venueName: 'Rogers Place',
			broadcasts: ['TNT'],
			awayTeam: { id: '17', name: 'Colorado Avalanche', abbreviation: 'COL', logo: espnTeamLogo('nhl/500/col'), color: '#6F263D', alternateColor: '#236192' },
			homeTeam: { id: '6', name: 'Edmonton Oilers', abbreviation: 'EDM', logo: espnTeamLogo('nhl/500/edm'), color: '#041E42', alternateColor: '#FF4C00' },
		},
		video: 'hockey',
		poster: 'hockey',
		tabTitle: 'Avalanche at Oilers',
		tabHost: 'tntdrama.com',
		clockPerTick: 62,
		periodSeconds: 1200,
		beats: [
			{ tick: 0, away: 1, home: 3, period: 2, clock: 500 },
			{ tick: 3, period: 2, clock: 314 },
			{ tick: 5, away: 2, period: 2, clock: 190, note: 'COL 2' },
			{ tick: 7, period: 3, clock: 1200 },
			{ tick: 8, away: 3, period: 3, clock: 1138, note: 'Tied 3-3' },
			{ tick: 13, home: 4, period: 3, clock: 828, note: 'EDM 4' },
			{ tick: 16, home: 5, period: 3, clock: 642, note: 'EDM 5' },
			{ tick: 20, period: 3, clock: 394 },
		],
	},
	{
		base: {
			id: 'hero-epl',
			league: 'epl',
			sportType: 'soccer',
			status: 'in',
			venueName: 'Emirates Stadium',
			broadcasts: ['USA Network'],
			awayTeam: { id: '364', name: 'Liverpool', abbreviation: 'LIV', logo: espnTeamLogo('soccer/500/364'), color: '#C8102E', alternateColor: '#00B2A9' },
			homeTeam: { id: '359', name: 'Arsenal', abbreviation: 'ARS', logo: espnTeamLogo('soccer/500/359'), color: '#EF0107', alternateColor: '#023474' },
		},
		video: 'soccer',
		poster: 'soccer',
		tabTitle: 'Liverpool at Arsenal',
		tabHost: 'peacocktv.com',
		clockPerTick: 58,
		clockCountsUp: true,
		periodSeconds: 2700,
		beats: [
			{ tick: 0, away: 0, home: 2, period: 2, clock: 3780 },
			{ tick: 10, home: 3, note: 'ARS 3' },
		],
	},
	{
		base: {
			id: 'hero-nfl',
			league: 'nfl',
			sportType: 'football',
			status: 'in',
			venueName: 'Lincoln Financial Field',
			broadcasts: ['FOX'],
			awayTeam: { id: '6', name: 'Dallas Cowboys', abbreviation: 'DAL', logo: espnTeamLogo('nfl/500/dal'), color: '#003594', alternateColor: '#869397' },
			homeTeam: { id: '21', name: 'Philadelphia Eagles', abbreviation: 'PHI', logo: espnTeamLogo('nfl/500/phi'), color: '#004C54', alternateColor: '#A5ACAF' },
		},
		video: 'football',
		poster: 'football',
		tabTitle: 'Cowboys at Eagles',
		tabHost: 'foxsports.com',
		clockPerTick: 58,
		periodSeconds: 900,
		beats: [
			{ tick: 0, away: 24, home: 17, period: 3, clock: 580, downDistance: '2nd & 8', fieldPosition: 'PHI 41', down: 2, distance: 8 },
			{ tick: 2, downDistance: '3rd & 4', fieldPosition: 'PHI 45', down: 3, distance: 4 },
			{ tick: 4, downDistance: '1st & 10', fieldPosition: 'DAL 48', down: 1, distance: 10 },
			{ tick: 7, away: 27, period: 3, clock: 148, downDistance: '1st & 10', fieldPosition: 'PHI 25', down: 1, distance: 10, note: 'DAL 27' },
			{ tick: 9, period: 4, clock: 900, downDistance: '2nd & 6', fieldPosition: 'PHI 29', down: 2, distance: 6 },
			{ tick: 14, downDistance: '3rd & 11', fieldPosition: 'PHI 18', down: 3, distance: 11 },
			{ tick: 18, downDistance: '1st & 10', fieldPosition: 'DAL 44', down: 1, distance: 10 },
		],
	},
];

// Resolves a script to the concrete `Game` the card and the scorer both take.
export const heroGameAt = (script: HeroGameScript, tick: number): Game => {
	// Carried forward field by field. A generic property copy would need a cast through
	// Record<string, unknown>, which is exactly the kind of hole that lets a typo in a beat sit
	// there silently.
	let state: HeroBeat = { tick: 0 };
	let clockAnchor = { tick: 0, clock: 0 };

	for (const beat of script.beats) {
		if (beat.tick > tick) break;
		state = {
			tick: beat.tick,
			away: beat.away ?? state.away,
			home: beat.home ?? state.home,
			period: beat.period ?? state.period,
			clock: beat.clock ?? state.clock,
			topOfInning: beat.topOfInning ?? state.topOfInning,
			bso: beat.bso ?? state.bso,
			baseRunners: beat.baseRunners ?? state.baseRunners,
			downDistance: beat.downDistance ?? state.downDistance,
			fieldPosition: beat.fieldPosition ?? state.fieldPosition,
			isRedZone: beat.isRedZone ?? state.isRedZone,
			down: beat.down ?? state.down,
			distance: beat.distance ?? state.distance,
		};
		if (beat.clock !== undefined) clockAnchor = { tick: beat.tick, clock: beat.clock };
	}

	const elapsed = (tick - clockAnchor.tick) * script.clockPerTick;
	const drift = script.clockCountsUp ? clockAnchor.clock + elapsed : clockAnchor.clock - elapsed;
	const clockSeconds = script.clockless
		? 0
		: script.clockCountsUp
			? Math.min(drift, script.periodSeconds * 2)
			: Math.max(drift, 0);

	return {
		...script.base,
		awayTeam: { ...script.base.awayTeam, score: state.away ?? 0 },
		homeTeam: { ...script.base.homeTeam, score: state.home ?? 0 },
		period: state.period ?? 1,
		clockSeconds,
		topOfInning: state.topOfInning,
		bso: state.bso,
		baseRunners: state.baseRunners,
		downDistance: state.downDistance,
		fieldPosition: state.fieldPosition,
		isRedZone: state.isRedZone,
		down: state.down,
		distance: state.distance,
	};
};
