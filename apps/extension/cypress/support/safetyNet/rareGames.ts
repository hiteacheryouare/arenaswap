import type { Game, Team } from '@arenaswap/core/types';

const hour = 60 * 60 * 1000;

const team = (id: string, abbreviation: string, score: number, color: string, extra: Partial<Team> = {}): Team => ({
	id, name: abbreviation, abbreviation, score, color, ...extra,
});

const startedAgo = (hours: number) => new Date(Date.now() - (hours * hour)).toISOString();

const base = (id: string, league: Game['league'], sportType: Game['sportType'], status: Game['status']): Game => ({
	id, league, sportType, status, period: 1, clockSeconds: 0, startTime: startedAgo(2),
	homeTeam: team(`${id}-h`, 'HOM', 0, '#13274F'),
	awayTeam: team(`${id}-a`, 'AWY', 0, '#E31837'),
});

export interface rareGame {
	game: Game;
	label: string;
	expected?: { status?: string; period?: string };
}

export const rareGames: rareGame[] = [
	{ label: 'a 152-148 shootout of a basketball game', game: { ...base('rare-152-148', 'nba', 'basketball', 'in'), period: 5, clockSeconds: 61, homeTeam: team('den', 'DEN', 152, '#0E2240'), awayTeam: team('sac', 'SAC', 148, '#5A2D81') } },
	{ label: 'a 152-8 exhibition blowout', game: { ...base('rare-152-8', 'ncaab', 'basketball', 'in'), period: 2, clockSeconds: 120, homeTeam: team('gonz', 'GONZ', 152, '#041E42'), awayTeam: team('div3', 'D3U', 8, '#7A0019') } },
	{ label: 'a 73-0 football final', game: { ...base('rare-73-0', 'nfl', 'football', 'post'), period: 4, homeTeam: team('chi', 'CHI', 73, '#0B162A'), awayTeam: team('was', 'WSH', 0, '#5A1414') }, expected: { status: 'Final' } },
	{ label: 'a 25-run baseball final', game: { ...base('rare-25-4', 'mlb', 'baseball', 'post'), period: 9, homeTeam: team('tex', 'TEX', 25, '#003278'), awayTeam: team('bal', 'BAL', 4, '#DF4601') } },
	{ label: 'a 9-0 soccer final', game: { ...base('rare-9-0', 'epl', 'soccer', 'post'), period: 2, homeTeam: team('mci', 'MCI', 9, '#6CABDD'), awayTeam: team('bou', 'BOU', 0, '#DA291C') } },
	{ label: 'a 0-0 draw', game: { ...base('rare-0-0', 'mls', 'soccer', 'post'), period: 2, homeTeam: team('phi', 'PHI', 0, '#071B2C'), awayTeam: team('nyc', 'NYC', 0, '#6CACE4') } },
	{ label: 'an NFL tie', game: { ...base('rare-tie', 'nfl', 'football', 'post'), period: 5, finalPeriodSuffix: 'OT', homeTeam: team('pit', 'PIT', 20, '#FFB612'), awayTeam: team('det', 'DET', 20, '#0076B6') }, expected: { status: 'Final/OT' } },
	{ label: 'a five-overtime basketball final', game: { ...base('rare-5ot', 'ncaab', 'basketball', 'post'), period: 7, finalPeriodSuffix: '5OT', homeTeam: team('syr', 'SYR', 127, '#F76900'), awayTeam: team('uconn', 'CONN', 117, '#000E2F') }, expected: { status: 'Final/5OT' } },
	{ label: 'a 19-inning final', game: { ...base('rare-19', 'mlb', 'baseball', 'post'), period: 19, finalPeriodSuffix: '19', homeTeam: team('nym', 'NYM', 4, '#002D72'), awayTeam: team('stl', 'STL', 3, '#C41E3A') }, expected: { status: 'Final/19' } },
	{ label: 'a mercy-rule softball final', game: { ...base('rare-mercy', 'csoft', 'softball', 'post'), period: 5, finalPeriodSuffix: '5', homeTeam: team('okla', 'OU', 12, '#841617'), awayTeam: team('tulsa', 'TLSA', 0, '#003595') }, expected: { status: 'Final/5' } },
	{ label: 'a final after extra time', game: { ...base('rare-aet', 'fifawc', 'soccer', 'post'), period: 4, finalPeriodSuffix: 'AET', homeTeam: team('arg', 'ARG', 2, '#74ACDF'), awayTeam: team('ned', 'NED', 1, '#F36C21') }, expected: { status: 'Final/AET' } },
	{ label: 'a final on penalties', game: { ...base('rare-pens', 'fifawc', 'soccer', 'post'), period: 5, finalPeriodSuffix: 'Pens', homeTeam: team('cro', 'CRO', 1, '#ED1C24', { shootoutScore: 4 }), awayTeam: team('bra', 'BRA', 1, '#009C3B', { shootoutScore: 2 }) }, expected: { status: 'Final/Pens' } },
	{ label: 'an Olympic gold medal game in a second overtime', game: { ...base('rare-gold-2ot', 'olymih', 'hockey', 'in'), period: 5, clockSeconds: 840, isPostseason: true, postseasonLabel: 'Gold Medal Game', homeTeam: team('can', 'CAN', 2, '#D80621'), awayTeam: team('usa', 'USA', 2, '#002868') }, expected: { period: '2OT' } },
	{ label: 'a soccer match deep in stoppage time', game: { ...base('rare-stoppage', 'epl', 'soccer', 'in'), period: 2, clockSeconds: 97 * 60, clockStoppageMinutes: 7, homeTeam: team('liv', 'LIV', 2, '#C8102E'), awayTeam: team('eve', 'EVE', 2, '#003399') } },
	{ label: 'a canceled game', game: { ...base('rare-canceled', 'mls', 'soccer', 'post'), disruption: 'canceled' }, expected: { status: 'Canceled' } },
	{ label: 'an abandoned match', game: { ...base('rare-abandoned', 'epl', 'soccer', 'post'), period: 2, clockSeconds: 67 * 60, disruption: 'abandoned', homeTeam: team('ars', 'ARS', 2, '#EF0107'), awayTeam: team('tot', 'TOT', 1, '#132257') }, expected: { status: 'Abandoned', period: "67'" } },
	{ label: 'a postponed game with no reason given', game: { ...base('rare-postponed', 'nba', 'basketball', 'post'), disruption: 'postponed' }, expected: { status: 'Postponed' } },
	{ label: 'a suspended game resumed today', game: { ...base('rare-resumed', 'mlb', 'baseball', 'in'), period: 8, startTime: startedAgo(26), homeTeam: team('bos', 'BOS', 3, '#BD3039'), awayTeam: team('nyy', 'NYY', 3, '#0C2340') } },
	{ label: 'game 1 of a doubleheader', game: { ...base('rare-dh1', 'mlb', 'baseball', 'pre'), startTime: new Date(Date.now() + hour).toISOString(), doubleheaderGame: 1 } },
	{ label: 'game 2 of a postseason doubleheader', game: { ...base('rare-dh-post', 'mlb', 'baseball', 'pre'), startTime: new Date(Date.now() + (4 * hour)).toISOString(), doubleheaderGame: 2, isPostseason: true, postseasonLabel: 'World Series - Game 6' } },
	{ label: 'a bracket game with both teams to be decided', game: { ...base('rare-tbd', 'ncaab', 'basketball', 'pre'), startTime: new Date(Date.now() + (2 * hour)).toISOString(), homeTeam: { id: '-1', name: 'TBD', abbreviation: 'TBD', score: 0 }, awayTeam: { id: '-2', name: 'TBD', abbreviation: 'TBD', score: 0 } } },
	{ label: 'a 1 v 16 tournament game', game: { ...base('rare-seeds', 'ncaab', 'basketball', 'in'), period: 2, clockSeconds: 300, collegeSeeded: true, isPostseason: true, postseasonLabel: 'East Region - 1st Round', homeTeam: team('duke', 'DUKE', 61, '#00539B', { rank: 1 }), awayTeam: team('sie', 'SIE', 55, '#006B54', { rank: 16 }) } },
	{ label: 'a rain delay before first pitch', game: { ...base('rare-pre-delay', 'mlb', 'baseball', 'pre'), startTime: startedAgo(1), delayed: true, delayDescription: 'Rain Delay' } },
	{ label: 'the longest ranked college matchup', game: { ...base('rare-long-names', 'ncaaf', 'football', 'in'), period: 3, clockSeconds: 400, homeTeam: team('tamucc', 'TAMUCC', 31, '#0067C5', { rank: 25 }), awayTeam: team('utrgv', 'UTRGV', 28, '#F05023', { rank: 24 }) } },
	{ label: 'a best-of-five series going the distance', game: { ...base('rare-bo5', 'mlb', 'baseball', 'in'), period: 9, isPostseason: true, postseasonLabel: 'ALDS - Game 5', series: { kind: 'playoff', homeWins: 2, awayWins: 2, bestOf: 5 }, homeTeam: team('sea', 'SEA', 2, '#0C2C56'), awayTeam: team('det', 'DET', 1, '#0C2340') } },
	{ label: "a women's college game in the third quarter", game: { ...base('rare-ncaaw', 'ncaaw', 'basketball', 'in'), period: 3, clockSeconds: 222, homeTeam: team('sc', 'SC', 54, '#73000A'), awayTeam: team('ucla', 'UCLA', 50, '#2D68C4') }, expected: { period: 'Q3' } },
];
