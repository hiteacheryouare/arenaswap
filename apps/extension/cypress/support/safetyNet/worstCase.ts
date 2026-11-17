import type { Game, Team } from '@arenaswap/core/types';
import { makeGame } from '../fixtures';

type teamIdentity = Omit<Team, 'score'>;

export const worstTeams = {
	longIsland: { id: '110133', name: 'Long Island University Long Island University', nickname: 'Long Island University', shortName: 'Long Island University', abbreviation: 'LIU' },
	minnesotaDuluth: { id: '134', name: 'Minnesota Duluth Bulldogs', nickname: 'Bulldogs', shortName: 'Minnesota Duluth', abbreviation: 'UMD' },
	stonehill: { id: '284', name: 'Stonehill Stonehill', nickname: 'Stonehill', shortName: 'Stonehill', abbreviation: 'STONEHILL' },
	// Its nickname really arrives with the trailing space.
	colgate: { id: '2142', name: 'Colgate Raiders', nickname: 'Raiders ', shortName: 'Colgate', abbreviation: 'COLG' },
	americanInternational: { id: '2022', name: 'American International Yellow Jackets', nickname: 'Yellow Jackets', shortName: 'American Int\'l', abbreviation: 'AIC', color: '#000000' },
	centralConnecticut: { id: '2115', name: 'Central Connecticut Blue Devils', nickname: 'Blue Devils', shortName: 'C Connecticut', abbreviation: 'CCSU', color: '#1B49A2', alternateColor: '#D1D5D8' },
	gladbach: { id: '268', name: 'Borussia Mönchengladbach', nickname: 'Borussia Mönchengladbach', shortName: 'Gladbach', abbreviation: 'BMG', color: '#FFFFFF', alternateColor: '#03915C' },
	cologne: { id: '122', name: 'FC Cologne', nickname: 'FC Cologne', shortName: 'Cologne', abbreviation: 'KOE', color: '#FFFFFF', alternateColor: '#DA0308' },
	celtics: { id: '2', name: 'Boston Celtics', nickname: 'Celtics', shortName: 'Celtics', abbreviation: 'BOS', color: '#008348', alternateColor: '#FFFFFF' },
	sixers: { id: '20', name: 'Philadelphia 76ers', nickname: '76ers', shortName: '76ers', abbreviation: 'PHI', color: '#1D428A', alternateColor: '#E01234' },
} satisfies Record<string, teamIdentity>;

export const worstVenues = {
	longestName: { venueName: 'Northwestern Medicine Field at Martin Stadium', venueLocation: 'Evanston, USA' },
	longestWord: { venueName: 'RheinEnergieStadion', venueLocation: 'Cologne, Germany' },
	longestLocation: { venueName: 'Estadio Universitario', venueLocation: 'San Nicolás de los Garza, Mexico' },
} satisfies Record<string, Pick<Game, 'venueName' | 'venueLocation'>>;

export const widestScore = 144;

export const worstBroadcasts = ['ESPN+', 'Scripps Sports', 'KONG', 'KING 5', 'KHN', 'Prime Video (Local)'];

export const busiestSlateSize = 65;

export const worstUserText = {
	profileName: 'W'.repeat(40),
	tabTitleUrl: 'https://watch.example-stream.test/live/basketball/2026-10-10/boston-celtics-vs-philadelphia-76ers?feed=home&quality=1080p',
	tabTitle: 'Philadelphia 76ers at Boston Celtics | NBA Preseason 2026 | Live Stream, Highlights and Box Score',
	unbroken: (length: number) => 'W'.repeat(length),
};

const team = (identity: teamIdentity, score: number): Team => ({ ...identity, score });

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

export const slateOf = (count: number): Game[] => Array.from({ length: count }, (_, index) => {
	const base = worstCaseGames[index % worstCaseGames.length].game;
	return { ...base, id: `${base.id}-${index}` };
});

export const slateSizes = { none: 0, one: 1, many: busiestSlateSize } as const;
