import type { Game, Team } from '@arenaswap/core/types';
import { makeGame } from '../fixtures';

// Every team, venue and score below is copied from scripts/powerscore/recordings (2026-10-03 to
// 2026-10-11), shaped the way packages/sideline/src/apiClient.ts maps a scoreboard event. Each is
// the longest or widest of its kind in those nine days. The fields are real; putting the longest
// of each into one game is not, which is the point.

type teamIdentity = Omit<Team, 'score'>;

export const worstTeams = {
	// Longest name (45 characters), and the longest short name and nickname. ncaamh 401905040.
	longIsland: { id: '110133', name: 'Long Island University Long Island University', nickname: 'Long Island University', shortName: 'Long Island University', abbreviation: 'LIU' },
	minnesotaDuluth: { id: '134', name: 'Minnesota Duluth Bulldogs', nickname: 'Bulldogs', shortName: 'Minnesota Duluth', abbreviation: 'UMD' },
	// Longest abbreviation by far (nine letters). ncaamh 401904956.
	stonehill: { id: '284', name: 'Stonehill Stonehill', nickname: 'Stonehill', shortName: 'Stonehill', abbreviation: 'STONEHILL' },
	// Its nickname really arrives with the trailing space.
	colgate: { id: '2142', name: 'Colgate Raiders', nickname: 'Raiders ', shortName: 'Colgate', abbreviation: 'COLG' },
	// Longest name that does not repeat itself. ncaaf 401867907.
	americanInternational: { id: '2022', name: 'American International Yellow Jackets', nickname: 'Yellow Jackets', shortName: 'American Int\'l', abbreviation: 'AIC', color: '#000000' },
	centralConnecticut: { id: '2115', name: 'Central Connecticut Blue Devils', nickname: 'Blue Devils', shortName: 'C Connecticut', abbreviation: 'CCSU', color: '#1B49A2', alternateColor: '#D1D5D8' },
	// Longest unbroken word in a team name, with a diacritic. bundesliga 401884774.
	gladbach: { id: '268', name: 'Borussia Mönchengladbach', nickname: 'Borussia Mönchengladbach', shortName: 'Gladbach', abbreviation: 'BMG', color: '#FFFFFF', alternateColor: '#03915C' },
	cologne: { id: '122', name: 'FC Cologne', nickname: 'FC Cologne', shortName: 'Cologne', abbreviation: 'KOE', color: '#FFFFFF', alternateColor: '#DA0308' },
	// The widest score, 144, final of nba 401898398.
	celtics: { id: '2', name: 'Boston Celtics', nickname: 'Celtics', shortName: 'Celtics', abbreviation: 'BOS', color: '#008348', alternateColor: '#FFFFFF' },
	sixers: { id: '20', name: 'Philadelphia 76ers', nickname: '76ers', shortName: '76ers', abbreviation: 'PHI', color: '#1D428A', alternateColor: '#E01234' },
} satisfies Record<string, teamIdentity>;

export const worstVenues = {
	// Longest venue name. nwsl 401854090.
	longestName: { venueName: 'Northwestern Medicine Field at Martin Stadium', venueLocation: 'Evanston, USA' },
	// Longest single word in any venue. bundesliga 401884774.
	longestWord: { venueName: 'RheinEnergieStadion', venueLocation: 'Cologne, Germany' },
	// Longest location. ligamx 401876953.
	longestLocation: { venueName: 'Estadio Universitario', venueLocation: 'San Nicolás de los Garza, Mexico' },
} satisfies Record<string, Pick<Game, 'venueName' | 'venueLocation'>>;

export const widestScore = 144;

// Longest list of networks on one game. nhl 401892454.
export const worstBroadcasts = ['ESPN+', 'Scripps Sports', 'KONG', 'KING 5', 'KHN', 'Prime Video (Local)'];

// The most games live at once in the recordings: 65, at 2026-10-11T00:11Z.
export const busiestSlateSize = 65;

// What people type and what browsers name tabs. Not from our sources, so not real data: the worst
// a person or a page can hand us.
export const worstUserText = {
	// `profileNameLimit` (utils/profiles.ts) characters of the widest Latin capital, with no space to break on.
	profileName: 'W'.repeat(40),
	// A page with no <title> gets its URL as the tab title, which is one unbroken string.
	tabTitleUrl: 'https://watch.example-stream.test/live/basketball/2026-10-10/boston-celtics-vs-philadelphia-76ers?feed=home&quality=1080p',
	tabTitle: 'Philadelphia 76ers at Boston Celtics | NBA Preseason 2026 | Live Stream, Highlights and Box Score',
	unbroken: (length: number) => 'W'.repeat(length),
};

const team = (identity: teamIdentity, score: number): Team => ({ ...identity, score });

// Live, so every live-only line (clock, period, PowerScore) is on the card alongside the names.
export const worstCaseGames: readonly { label: string; game: Game }[] = [
	{
		label: 'longest names and venue',
		game: makeGame('worst-longest-names', {
			league: 'ncaamh', sportType: 'hockey', period: 3, clockSeconds: 754,
			awayTeam: team(worstTeams.longIsland, 0), homeTeam: team(worstTeams.minnesotaDuluth, 4),
			...worstVenues.longestName,
		}),
	},
	{
		label: 'longest abbreviation',
		game: makeGame('worst-longest-abbreviation', {
			league: 'ncaamh', sportType: 'hockey', period: 3, clockSeconds: 0,
			awayTeam: team(worstTeams.colgate, 1), homeTeam: team(worstTeams.stonehill, 3),
			...worstVenues.longestLocation,
		}),
	},
	{
		label: 'longest football names',
		game: makeGame('worst-football-names', {
			league: 'ncaaf', sportType: 'football', period: 4, clockSeconds: 29, downDistance: '3rd & Goal', fieldPosition: 'CCSU 4',
			awayTeam: team(worstTeams.americanInternational, 14), homeTeam: team(worstTeams.centralConnecticut, 51),
		}),
	},
	{
		label: 'longest unbroken word',
		game: makeGame('worst-unbroken-word', {
			league: 'bundesliga', sportType: 'soccer', period: 2, clockSeconds: 5400, clockStoppageMinutes: 6,
			awayTeam: team(worstTeams.gladbach, 1), homeTeam: team(worstTeams.cologne, 2),
			...worstVenues.longestWord,
		}),
	},
	{
		label: 'widest score',
		game: makeGame('worst-widest-score', {
			league: 'nba', sportType: 'basketball', period: 4, clockSeconds: 0,
			awayTeam: team(worstTeams.sixers, 106), homeTeam: team(worstTeams.celtics, widestScore),
			venueName: 'TD Garden', venueLocation: 'Boston, MA',
		}),
	},
];

// 0, 1 and many: an empty list, one game, and the busiest real slate's worth of copies.
export const slateOf = (count: number): Game[] => Array.from({ length: count }, (_, index) => {
	const base = worstCaseGames[index % worstCaseGames.length].game;
	return { ...base, id: `${base.id}-${index}` };
});

export const slateSizes = { none: 0, one: 1, many: busiestSlateSize } as const;
