import type { Game } from '@arenaswap/core/types';

const espnTeamLogo = (path: string) => `https://a.espncdn.com/i/teamlogos/${path}.png`;
const ncaaLogo = (id: string) => espnTeamLogo(`ncaa/500/${id}`);

export interface HeroBeat {
	tick: number;
	away?: number;
	home?: number;
	period?: number;
	clock?: number;
	intermission?: boolean;
	topOfInning?: boolean;
	bso?: { balls: number; strikes: number; outs: number };
	baseRunners?: { first: boolean; second: boolean; third: boolean };
	downDistance?: string;
	fieldPosition?: string;
	isRedZone?: boolean;
	down?: number;
	distance?: number;
	note?: string;
}

export interface HeroGameScript {
	base: Omit<Game, 'period' | 'clockSeconds' | 'awayTeam' | 'homeTeam'> & {
		awayTeam: Omit<Game['awayTeam'], 'score'>;
		homeTeam: Omit<Game['homeTeam'], 'score'>;
	};
	video: string;
	poster: string;
	tabTitle: string;
	tabHost: string;
	clockPerTick: number;
	clockCountsUp?: boolean;
	clockless?: boolean;
	periodSeconds: number;
	beats: HeroBeat[];
}

export const heroTickMs = 1150;
export const heroTickCount = 21;

const emptyBases = { first: false, second: false, third: false };

export const heroGames: HeroGameScript[] = [
	{
		base: {
			id: 'hero-mlb',
			league: 'mlb',
			sportType: 'baseball',
			status: 'in',
			venueName: 'Busch Stadium',
			broadcasts: ['MLB.TV'],
			awayTeam: { id: '30', name: 'Tampa Bay Rays', abbreviation: 'TB', logo: espnTeamLogo('mlb/500/tb'), color: '#092c5c', alternateColor: '#8fbce6' },
			homeTeam: { id: '24', name: 'St. Louis Cardinals', abbreviation: 'STL', logo: espnTeamLogo('mlb/500/stl'), color: '#be0a14', alternateColor: '#001541' },
		},
		video: 'baseball',
		poster: 'baseball',
		tabTitle: 'Tampa Bay at St. Louis',
		tabHost: 'mlb.com',
		clockPerTick: 0,
		clockless: true,
		periodSeconds: 0,
		beats: [
			{ tick: 0, away: 0, home: 0, period: 3, topOfInning: false, bso: { balls: 0, strikes: 2, outs: 0 }, baseRunners: emptyBases, note: 'Wetherholt up, 0-2' },
			{ tick: 6, home: 1, bso: { balls: 0, strikes: 0, outs: 0 }, note: 'STL 1, Wetherholt homers' },
			{ tick: 10, bso: { balls: 1, strikes: 1, outs: 1 } },
			{ tick: 14, bso: { balls: 2, strikes: 2, outs: 2 } },
			{ tick: 18, bso: { balls: 0, strikes: 0, outs: 3 } },
			{ tick: 19, period: 4, topOfInning: true, bso: { balls: 0, strikes: 1, outs: 0 } },
		],
	},
	{
		base: {
			id: 'hero-ncaamh',
			league: 'ncaamh',
			sportType: 'hockey',
			status: 'in',
			venueName: 'Sanford Center',
			broadcasts: ['FloHockey'],
			awayTeam: { id: '2364', name: 'Minnesota State Mavericks', abbreviation: 'MNST', logo: ncaaLogo('2364'), color: '#FFC72C', alternateColor: '#582C83' },
			homeTeam: { id: '132', name: 'Bemidji State Beavers', abbreviation: 'BST', logo: ncaaLogo('132'), color: '#00694E', alternateColor: '#FFFFFF' },
		},
		video: 'hockey',
		poster: 'hockey',
		tabTitle: 'Minnesota State at Bemidji State',
		tabHost: 'flohockey.tv',
		clockPerTick: 92,
		periodSeconds: 1200,
		beats: [
			{ tick: 0, away: 2, home: 0, period: 1, clock: 0, intermission: true, note: 'First intermission' },
			{ tick: 4, period: 2, clock: 828, intermission: false },
			{ tick: 8, home: 1, clock: 460, note: 'BST 1, the goal that pulls the hero here' },
			{ tick: 11, home: 2, clock: 184, note: 'BST 2, tied: the goal in the clip' },
			{ tick: 13, clock: 0, intermission: true, note: 'Second intermission' },
		],
	},
	{
		base: {
			id: 'hero-ncaaf',
			league: 'ncaaf',
			sportType: 'football',
			status: 'in',
			venueName: 'Martin Stadium',
			broadcasts: ['FOX'],
			awayTeam: { id: '2483', name: 'Oregon Ducks', abbreviation: 'ORE', logo: ncaaLogo('2483'), color: '#00934b', alternateColor: '#fff41b' },
			homeTeam: { id: '265', name: 'Washington State Cougars', abbreviation: 'WSU', logo: ncaaLogo('265'), color: '#a60f2d', alternateColor: '#4d4d4d' },
		},
		video: 'football',
		poster: 'football',
		tabTitle: 'Oregon at Washington State',
		tabHost: 'foxsports.com',
		clockPerTick: 49,
		periodSeconds: 900,
		beats: [
			{ tick: 0, away: 17, home: 27, period: 4, clock: 839, downDistance: '1st & 10', fieldPosition: 'WSU 30', down: 1, distance: 10 },
			{ tick: 9, away: 20, clock: 398, downDistance: '1st & 10', fieldPosition: 'WSU 25', note: 'ORE FG, 6:38' },
			{ tick: 11, downDistance: '1st & 10', fieldPosition: 'ORE 41' },
			{ tick: 12, clock: 232, downDistance: '1st & 10', fieldPosition: 'ORE 23' },
			{ tick: 13, clock: 227, downDistance: '2nd & 9', fieldPosition: 'ORE 22', down: 2, distance: 9, note: 'The clip starts here' },
			{ tick: 14, clock: 226 },
			{ tick: 15, clock: 225 },
			{ tick: 16, clock: 224 },
			{ tick: 17, clock: 223 },
			{ tick: 18, clock: 222 },
			{ tick: 19, clock: 221 },
			{ tick: 20, clock: 221, note: 'The catch is on screen; the scoreboard has not caught up' },
		],
	},
];

export const heroGameAt = (script: HeroGameScript, tick: number): Game => {
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
			intermission: beat.intermission ?? state.intermission,
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
		intermission: state.intermission,
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
