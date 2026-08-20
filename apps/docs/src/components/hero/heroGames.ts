import type { Game } from '@arenaswap/core/types';

// The three games in the hero, and the play-by-play they run through.
//
// Each one is the game that is actually playing in its clip, in a league ArenaSwap tracks. The
// basketball clip is Hawai'i's own highlights of their Northern Arizona game and opens on a title
// card reading the final score; the football clip is the Army-Navy game; the hockey clip is Bemidji
// State against Minnesota State at the Sanford Center, which is readable off the jerseys and the
// boards. A card naming a different game from the one on screen would be the first thing anybody
// noticed, and describing what you are watching is the popup's whole job.
//
// Team ids, abbreviations, colours and crests come from ESPN's own teams endpoint, which is where
// the extension gets them too. The two hockey colours are the schools' own: ESPN returns empty
// strings for college hockey, and a grey card would say more about ESPN's feed than about the game.
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
export const heroTickCount = 24;

export const heroGames: HeroGameScript[] = [
	{
		base: {
			id: 'hero-ncaaf',
			league: 'ncaaf',
			sportType: 'football',
			status: 'in',
			venueName: 'Lincoln Financial Field',
			broadcasts: ['CBS'],
			awayTeam: { id: '349', name: 'Army Black Knights', abbreviation: 'ARMY', logo: ncaaLogo('349'), color: '#000000', alternateColor: '#d3bc8d' },
			homeTeam: { id: '2426', name: 'Navy Midshipmen', abbreviation: 'NAVY', logo: ncaaLogo('2426'), color: '#00225b', alternateColor: '#b5a67c' },
		},
		video: 'football',
		poster: 'football',
		tabTitle: 'Army at Navy',
		tabHost: 'paramountplus.com',
		clockPerTick: 45,
		periodSeconds: 900,
		// Last on the board and last on screen: two lead changes inside the fourth quarter, then a
		// drive into the red zone with the game inside a score.
		beats: [
			{ tick: 0, away: 10, home: 0, period: 3, clock: 495, downDistance: '2nd & 7', fieldPosition: 'NAVY 38', down: 2, distance: 7 },
			{ tick: 3, home: 3, period: 3, clock: 360, downDistance: '1st & 10', fieldPosition: 'ARMY 41', down: 1, distance: 10, note: 'NAVY 3' },
			{ tick: 7, period: 3, clock: 180, downDistance: '2nd & 6', fieldPosition: 'ARMY 45', down: 2, distance: 6 },
			{ tick: 11, period: 4, clock: 900, downDistance: '1st & 10', fieldPosition: 'NAVY 48', down: 1, distance: 10 },
			{ tick: 14, home: 10, period: 4, clock: 765, downDistance: '1st & 10', fieldPosition: 'ARMY 25', down: 1, distance: 10, note: 'NAVY 10, within three' },
			{ tick: 17, home: 13, period: 4, clock: 630, downDistance: '1st & 10', fieldPosition: 'NAVY 30', down: 1, distance: 10, note: 'NAVY 13, first lead change' },
			{ tick: 20, away: 17, period: 4, clock: 495, downDistance: '1st & 10', fieldPosition: 'ARMY 28', down: 1, distance: 10, note: 'ARMY 17, second lead change' },
			{ tick: 22, downDistance: '2nd & 6', fieldPosition: 'ARMY 12', down: 2, distance: 6, isRedZone: true, note: 'Navy in the red zone, down four' },
			{ tick: 23, downDistance: '3rd & 2', fieldPosition: 'ARMY 8', down: 3, distance: 2, isRedZone: true },
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
			awayTeam: { id: '2364', name: 'Minnesota State Mavericks', abbreviation: 'MNST', logo: ncaaLogo('2364'), color: '#582C83', alternateColor: '#FFC72C' },
			homeTeam: { id: '132', name: 'Bemidji State Beavers', abbreviation: 'BST', logo: ncaaLogo('132'), color: '#00694E', alternateColor: '#FFFFFF' },
		},
		video: 'hockey',
		poster: 'hockey',
		tabTitle: 'Minnesota State at Bemidji State',
		tabHost: 'flohockey.tv',
		clockPerTick: 62,
		periodSeconds: 1200,
		// The middle of the story: Bemidji State ties it, which is worth a lot in a sport where a goal
		// is rare, and then Minnesota State pulls two clear and it drains away again.
		beats: [
			{ tick: 0, away: 2, home: 0, period: 2, clock: 620 },
			{ tick: 4, period: 2, clock: 372 },
			{ tick: 7, home: 1, period: 2, clock: 186, note: 'BST 1' },
			{ tick: 9, home: 2, period: 2, clock: 62, note: 'BST 2, tied late in the second' },
			{ tick: 11, period: 3, clock: 1200 },
			{ tick: 14, away: 3, period: 3, clock: 1014, note: 'MNST 3' },
			{ tick: 17, away: 4, period: 3, clock: 828, note: 'MNST 4, two clear' },
			{ tick: 21, period: 3, clock: 580 },
		],
	},
	{
		base: {
			id: 'hero-ncaab',
			league: 'ncaab',
			sportType: 'basketball',
			status: 'in',
			venueName: 'Stan Sheriff Center',
			broadcasts: ['Spectrum Sports'],
			awayTeam: { id: '2464', name: 'Northern Arizona Lumberjacks', abbreviation: 'NAU', logo: ncaaLogo('2464'), color: '#003976', alternateColor: '#f1c40f' },
			homeTeam: { id: '62', name: "Hawai'i Rainbow Warriors", abbreviation: 'HAW', logo: ncaaLogo('62'), color: '#005737', alternateColor: '#000000' },
		},
		video: 'basketball',
		poster: 'basketball',
		tabTitle: "Northern Arizona at Hawai'i",
		tabHost: 'spectrumsportsnet.com',
		// 20-minute halves, so the clock burns faster per poll than the football or hockey ones.
		clockPerTick: 54,
		periodSeconds: 1200,
		// Where the hero opens: a one-possession second half, until Hawai'i pulls away and it stops
		// being the best thing on. It finishes as the blowout the clip's own title card says it was.
		beats: [
			{ tick: 0, away: 34, home: 36, period: 2, clock: 1092 },
			{ tick: 2, away: 37, home: 38 },
			{ tick: 4, away: 39, home: 41 },
			{ tick: 6, away: 41, home: 44 },
			{ tick: 8, away: 44, home: 47 },
			{ tick: 10, away: 46, home: 52, note: 'HAW start to pull away' },
			{ tick: 12, away: 48, home: 56 },
			{ tick: 15, away: 51, home: 62 },
			{ tick: 18, away: 55, home: 68 },
			{ tick: 21, away: 59, home: 74 },
			{ tick: 23, away: 64, home: 80, note: 'On its way to the 85-68 the highlight reel opens on' },
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
