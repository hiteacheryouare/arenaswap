import type { Game } from '@arenaswap/core/types';

// The three games in the hero, and the play-by-play they run through.
//
// Each one is the game that is actually playing in its clip, in a league ArenaSwap tracks. The
// hockey clip is Bemidji State against Minnesota State at the Sanford Center, which is readable off
// the jerseys and the boards; the baseball clip is JJ Wetherholt's first big-league hit, a solo home
// run in the bottom of the third on Opening Day 2026; the football clip is Gardner Minshew's 22-yard
// touchdown to Dezmon Patmon with 3:40 left, the score that put Oregon away at Martin Stadium in
// 2018. A card naming a different game from the one on screen would be the first thing anybody
// noticed, and describing what you are watching is the popup's whole job.
//
// The baseball and football beats are the real games wherever the record says what happened: the
// scores, the inning and count, the quarter, the clock and the down on screen. Only the polls in
// between are authored. The hockey game is authored throughout, around the goal in its clip.
//
// Each clip starts from the top when its tab comes up, so a beat lines up with the footage: the
// switch-in tick is the clip's first frame, and every tick after it is another 1.15 seconds in.
//
// Team ids, abbreviations, colours and crests come from ESPN's own teams endpoint, which is where
// the extension gets them too. The two hockey colours are the schools' own: ESPN returns empty
// strings for college hockey, and a grey card would say more about ESPN's feed than about the game.
// Minnesota State plays in its alternate: its crest is drawn in its primary, so on a card painted in
// it the crest disappears.
//
// Nothing here is a PowerScore. The scores on the cards are computed at render time by
// `computePowerScore` from the `powerscore` package — the same function the extension calls — over
// the score history this timeline produces. That split is the point: this file authors a game, and
// the shipped algorithm decides how good it is. A hardcoded PowerScore would be a number nobody
// could check, and the first implausible one would give the whole hero away.
//
// `npm run docs:validate-hero` asserts the result. Run it after touching any beat below.

const espnTeamLogo = (path: string) => `https://a.espncdn.com/i/teamlogos/${path}.png`;
const ncaaLogo = (id: string) => espnTeamLogo(`ncaa/500/${id}`);

// A beat sets state from its tick onwards. Anything it leaves out carries forward, so a run of
// quiet polls costs one line instead of six.
export interface HeroBeat {
	tick: number;
	away?: number;
	home?: number;
	period?: number;
	// Restated whenever the period changes; between beats it moves by `clockPerTick`.
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
	// Seconds of game clock burned per tick. Soccer counts up, everything else counts down. A beat's
	// clock has to be a whole number of ticks from its period's anchor, or the derived clock
	// overshoots and the next beat jumps it back the wrong way. The validator checks this.
	clockPerTick: number;
	clockCountsUp?: boolean;
	// Innings and halves have no running clock to advance.
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
		// Where the hero opens: scoreless in the bottom of the third, Wetherholt leading off on an 0-2
		// count. He makes contact two seconds into the clip, and the run posts once the ball has had
		// time to land. The hero leaves while he is rounding first.
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
		// The middle. Bemidji State's first goal pulls the hero here, the tying goal is three seconds
		// into the clip, and the second intermission scores zero, which hands the hero to football.
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
		// Last on screen. Oregon's comeback has it at 27-17 to start the fourth and 27-20 after a field
		// goal at 6:38, and the clip is Washington State's next drive: 2nd & 9 at the Oregon 22 with
		// 3:47 left. The card's clock follows the footage. The hero loops during the celebration,
		// before the scoreboard has caught up with the catch, which in the extension takes about 30
		// seconds.
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
