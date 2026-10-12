// Demo-mode `/summary` blocks for the pre-game demo games, shaped like the real response so the
// Matchup tab runs the same parser it does live. Only the four blocks it reads are here.

const logo = (path: string) => `https://a.espncdn.com/i/teamlogos/${path}.png`;
const shot = (path: string) => `https://a.espncdn.com/i/headshots/${path}.png`;

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 3600_000).toISOString();

type FormGame = [atVs: '@' | 'vs', opponent: string, opponentLogo: string, teamScore: number, opponentScore: number, result: 'W' | 'L' | 'D', days: number];

const lastFive = (teamId: string, games: FormGame[]) => ({
	team: { id: teamId },
	events: games.map(([atVs, opponent, opponentLogo, teamScore, opponentScore, result, days], index) => ({
		id: `${teamId}-${index}`,
		atVs,
		gameDate: daysAgo(days),
		homeTeamId: atVs === 'vs' ? teamId : 'opponent',
		homeTeamScore: String(atVs === 'vs' ? teamScore : opponentScore),
		awayTeamScore: String(atVs === 'vs' ? opponentScore : teamScore),
		gameResult: result,
		opponent: { abbreviation: opponent },
		opponentLogo: logo(opponentLogo),
	})),
});

type InjuryRow = [name: string, position: string, status: string, detail: string, headshot?: string];

const injuries = (teamId: string, rows: InjuryRow[]) => ({
	team: { id: teamId },
	injuries: rows.map(([name, position, status, detail, headshot], index) => ({
		type: { name: `INJURY_STATUS_${status}` },
		details: { type: detail },
		athlete: { id: `${teamId}-${index}`, shortName: name, position: { abbreviation: position }, headshot: headshot ? { href: shot(headshot) } : undefined },
	})),
});

const flatStats = (teamId: string, stats: Record<string, string>) => ({
	team: { id: teamId },
	statistics: Object.entries(stats).map(([name, displayValue]) => ({ name, displayValue })),
});

type RankedStat = [value: string, rank: string];

const groupedStats = (teamId: string, groups: Record<string, Record<string, RankedStat>>) => ({
	team: { id: teamId },
	statistics: Object.entries(groups).map(([name, stats]) => ({
		name,
		stats: Object.entries(stats).map(([stat, [displayValue, rankDisplayValue]]) => ({ name: stat, displayValue, rankDisplayValue })),
	})),
});

const tickets = (slug: string, price: number) => ({
	seatSituation: {
		eventLink: `https://www.vividseats.com/${slug}?wsUser=717`,
		summary: `Tickets as low as $${price}`,
	},
});

export const mockMatchupPayloads: Record<string, unknown> = {
	'mock-6': {
		lastFiveGames: [
			lastFive('218', [['@', 'UCF', 'ncaa/500/2116', 17, 31, 'L', 34], ['vs', 'TLSA', 'ncaa/500/202', 24, 21, 'W', 27], ['@', 'USF', 'ncaa/500/58', 10, 38, 'L', 20], ['vs', 'ECU', 'ncaa/500/151', 20, 27, 'L', 13], ['@', 'NAVY', 'ncaa/500/2426', 14, 35, 'L', 6]]),
			lastFive('213', [['vs', 'MICH', 'ncaa/500/130', 27, 24, 'W', 34], ['@', 'OSU', 'ncaa/500/194', 17, 20, 'L', 27], ['vs', 'IOWA', 'ncaa/500/2294', 31, 10, 'W', 20], ['@', 'MD', 'ncaa/500/120', 38, 14, 'W', 13], ['vs', 'RUTG', 'ncaa/500/164', 42, 7, 'W', 6]]),
		],
		boxscore: {
			teams: [
				flatStats('213', { totalPointsPerGame: '34.6', totalPointsPerGameAllowed: '15.2', yardsPerGame: '432.8', yardsPerGameAllowed: '298.1', passingYardsPerGame: '221.4', rushingYardsPerGame: '211.4' }),
				flatStats('218', { totalPointsPerGame: '20.1', totalPointsPerGameAllowed: '31.8', yardsPerGame: '341.0', yardsPerGameAllowed: '452.6', passingYardsPerGame: '238.9', rushingYardsPerGame: '102.1' }),
			],
		},
		ticketsInfo: tickets('temple-owls-football-tickets', 18),
	},
	'mock-18': {
		lastFiveGames: [
			lastFive('19', [['vs', 'ATL', 'mlb/500/atl', 5, 3, 'W', 5], ['vs', 'ATL', 'mlb/500/atl', 2, 6, 'L', 4], ['@', 'PHI', 'mlb/500/phi', 4, 1, 'W', 3], ['@', 'PHI', 'mlb/500/phi', 7, 2, 'W', 2], ['@', 'PHI', 'mlb/500/phi', 3, 4, 'L', 1]]),
			lastFive('16', [['@', 'CLE', 'mlb/500/cle', 1, 0, 'W', 5], ['@', 'CLE', 'mlb/500/cle', 3, 5, 'L', 4], ['vs', 'KC', 'mlb/500/kc', 6, 2, 'W', 3], ['vs', 'KC', 'mlb/500/kc', 8, 7, 'W', 2], ['vs', 'KC', 'mlb/500/kc', 2, 3, 'L', 1]]),
		],
		boxscore: {
			teams: [
				groupedStats('16', { batting: { runs: ['712', '9th'], homeRuns: ['198', '8th'], avg: ['.248', 'Tied-14th'], OPS: ['.725', '12th'] }, pitching: { ERA: ['3.61', '4th'], WHIP: ['1.18', '3rd'] } }),
				groupedStats('19', { batting: { runs: ['768', '3rd'], homeRuns: ['221', '2nd'], avg: ['.253', '9th'], OPS: ['.758', '4th'] }, pitching: { ERA: ['4.02', '16th'], WHIP: ['1.27', '17th'] } }),
			],
		},
		injuries: [
			injuries('19', [['F. Montas', 'SP', '60DAYIL', 'Shoulder'], ['J. McNeil', '2B', 'DAYTODAY', 'Wrist', 'mlb/players/full/33916'], ['S. Manaea', 'SP', '15DAYIL', 'Elbow']]),
			injuries('16', [['P. Meadows', 'CF', 'OUT', 'Hamstring'], ['M. Vierling', '3B', 'DAYTODAY', 'Back']]),
		],
		ticketsInfo: tickets('new-york-mets-tickets', 34),
	},
	'mock-19': {
		lastFiveGames: [
			lastFive('1', [['vs', 'TOR', 'nhl/500/tor', 4, 2, 'W', 9], ['@', 'BUF', 'nhl/500/buf', 2, 3, 'L', 7], ['vs', 'FLA', 'nhl/500/fla', 3, 1, 'W', 4], ['@', 'NYR', 'nhl/500/nyr', 5, 4, 'W', 2], ['@', 'DET', 'nhl/500/det', 1, 2, 'L', 1]]),
			lastFive('2', [['@', 'OTT', 'nhl/500/ott', 3, 2, 'W', 10], ['vs', 'TB', 'nhl/500/tb', 1, 4, 'L', 8], ['vs', 'CAR', 'nhl/500/car', 2, 1, 'W', 6], ['@', 'PIT', 'nhl/500/pit', 4, 5, 'L', 5], ['vs', 'NJ', 'nhl/500/nj', 3, 0, 'W', 3]]),
		],
		boxscore: {
			teams: [
				flatStats('2', { avgGoals: '3.05', avgGoalsAgainst: '3.22', powerPlayPct: '21.4', penaltyKillPct: '78.9', avgShots: '28.7' }),
				flatStats('1', { avgGoals: '3.18', avgGoalsAgainst: '2.64', powerPlayPct: '24.8', penaltyKillPct: '83.1', avgShots: '31.2' }),
			],
		},
		injuries: [
			injuries('1', [['H. Lindholm', 'D', 'OUT', 'Lower Body', 'nhl/players/full/3042010'], ['C. Coyle', 'C', 'QUESTIONABLE', 'Upper Body'], ['B. Marchand', 'LW', 'DAYTODAY', 'Not Specified'], ['M. Geekie', 'C', 'DOUBTFUL', 'Knee'], ['N. Lauko', 'LW', 'OUT', 'Ankle']]),
			injuries('2', []),
		],
		ticketsInfo: tickets('boston-bruins-tickets', 61),
	},
};
