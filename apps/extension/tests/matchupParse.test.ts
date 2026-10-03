import { emptyMatchup, hasMatchupContent, parseInjuries, parseRecentForm, parseSeasonStats, parseTickets } from '../entrypoints/popup/components/matchupParse';

// Every payload below is trimmed off a live pre-game `/summary` response from 2026-10-02:
// Colts at Commanders (NFL), White Sox at Guardians (MLB), Rangers at Red Wings (NHL) and Leeds at
// Arsenal (Premier League). Only the keys the parser reads are kept.

const formEvent = (id: string, atVs: string, gameDate: string, homeTeamId: string, homeTeamScore: string, awayTeamScore: string, gameResult: string, opponent: string) => ({
	id,
	atVs,
	gameDate,
	homeTeamId,
	homeTeamScore,
	awayTeamScore,
	gameResult,
	opponent: { abbreviation: opponent },
	opponentLogo: `https://a.espncdn.com/i/teamlogos/nfl/500/${opponent.toLowerCase()}.png`,
});

const nflIds = { home: '28', away: '11' };

const nflSummary = {
	header: { competitions: [{ competitors: [{ id: '28', homeAway: 'home' }, { id: '11', homeAway: 'away' }] }] },
	// Home team listed first, which is the order ESPN sends it in for this game.
	lastFiveGames: [
		{
			team: { id: '28' },
			events: [
				formEvent('401872955', 'vs', '2026-09-27T17:00Z', '28', '33', '31', 'W', 'LV'),
				formEvent('401872929', '@', '2026-09-13T20:25Z', '21', '24', '22', 'L', 'PHI'),
				formEvent('401872944', '@', '2026-09-20T20:25Z', '6', '37', '20', 'L', 'DAL'),
			],
		},
		{
			team: { id: '11' },
			events: [
				formEvent('401872930', 'vs', '2026-09-14T17:00Z', '11', '20', '20', 'T', 'HOU'),
			],
		},
	],
	injuries: [
		{
			team: { id: '28' },
			injuries: [
				{ type: { name: 'INJURY_STATUS_QUESTIONABLE' }, details: { type: 'Hamstring' }, athlete: { id: '4241474', displayName: 'Terry McLaurin', shortName: 'T. McLaurin', position: { abbreviation: 'WR' } } },
				{ type: { name: 'INJURY_STATUS_IR' }, details: { type: 'Knee' }, athlete: { id: '1', displayName: 'Long Term', position: { abbreviation: 'LB' } } },
				{ type: { name: 'INJURY_STATUS_OUT' }, details: { type: 'Elbow' }, athlete: { id: '4426348', displayName: 'Jayden Daniels', shortName: 'J. Daniels', position: { abbreviation: 'QB' }, headshot: { href: 'https://a.espncdn.com/i/headshots/nfl/players/full/4426348.png' } } },
				{ type: { name: 'INJURY_STATUS_DOUBTFUL' }, details: { type: 'Not Specified' }, athlete: { id: '3', shortName: 'A. Player' } },
			],
		},
	],
	boxscore: {
		teams: [
			{
				team: { id: '11' },
				statistics: [
					{ name: 'totalPointsPerGame', displayValue: '24.0' },
					{ name: 'yardsPerGame', displayValue: '307.0' },
					{ name: 'totalPointsPerGameAllowed', displayValue: '30.3' },
				],
			},
			{
				team: { id: '28' },
				statistics: [
					{ name: 'totalPointsPerGame', displayValue: '25.0' },
					{ name: 'yardsPerGame', displayValue: '342.7' },
					{ name: 'totalPointsPerGameAllowed', displayValue: '28.7' },
				],
			},
		],
	},
	ticketsInfo: {
		seatSituation: {
			eventLink: 'https://www.vividseats.com/washington-commanders-tickets-tottenham-hotspur-stadium-10-4-2026--sports-nfl-football/production/7027951?wsUser=717',
			summary: 'Tickets as low as $91',
		},
	},
};

describe('parseRecentForm', () => {
	it('pairs each team by id, oldest game first, scored from that team\'s side', () => {
		const form = parseRecentForm(nflSummary, nflIds);
		expect(form.home.map(result => result.id)).toEqual(['401872929', '401872944', '401872955']);
		expect(form.home[0]).toMatchObject({ result: 'L', isAway: true, teamScore: '22', opponentScore: '24', opponentAbbreviation: 'PHI' });
		expect(form.home[2]).toMatchObject({ result: 'W', isAway: false, teamScore: '33', opponentScore: '31' });
	});

	it('keeps a football tie a tie', () => {
		expect(parseRecentForm(nflSummary, nflIds).away[0]?.result).toBe('T');
	});

	// College hockey: the scoreboard's away id is synthesized and never matches, so the header's
	// `homeAway` has to carry the pairing.
	it('falls back to the header side when an id is not ours', () => {
		const data = {
			header: { competitions: [{ competitors: [{ id: '111', homeAway: 'home' }, { id: '103', homeAway: 'away' }] }] },
			lastFiveGames: [{ team: { id: '103' }, events: [formEvent('1', '@', '2026-01-02T00:00Z', '104', '2', '1', 'L', 'BU')] }],
		};
		const form = parseRecentForm(data, { home: '111', away: 'ncaamh-57' });
		expect(form.away).toHaveLength(1);
		expect(form.home).toEqual([]);
	});

	it('drops a block it cannot pin to either side', () => {
		const data = { lastFiveGames: [{ team: { id: '999' }, events: [formEvent('1', 'vs', '2026-01-02T00:00Z', '999', '1', '0', 'W', 'X')] }] };
		expect(parseRecentForm(data, nflIds)).toEqual({ away: [], home: [] });
	});
});

describe('parseInjuries', () => {
	it('keeps only game-day statuses, Out first', () => {
		const injuries = parseInjuries(nflSummary, nflIds);
		expect(injuries.home.map(injury => [injury.name, injury.status])).toEqual([
			['J. Daniels', 'out'],
			['A. Player', 'doubtful'],
			['T. McLaurin', 'questionable'],
		]);
		expect(injuries.away).toEqual([]);
	});

	it('carries position, body part and headshot, minus the placeholder body part', () => {
		const [daniels, player] = parseInjuries(nflSummary, nflIds).home;
		expect(daniels).toMatchObject({ position: 'QB', detail: 'Elbow', headshot: 'https://a.espncdn.com/i/headshots/nfl/players/full/4426348.png' });
		expect(player?.detail).toBeUndefined();
	});
});

describe('parseSeasonStats', () => {
	it('lines up the curated football stats, away then home', () => {
		const stats = parseSeasonStats(nflSummary, 'football', nflIds);
		expect(stats.map(stat => [stat.labelKey, stat.away, stat.home, stat.better])).toEqual([
			['detail.statPoints', '24.0', '25.0', 'home'],
			// Lower is better, so the home side's 28.7 wins.
			['detail.statPointsAllowed', '30.3', '28.7', 'home'],
			['detail.statYards', '307.0', '342.7', 'home'],
		]);
	});

	it('gives the longer half of the bar to the better side when lower wins', () => {
		const allowed = parseSeasonStats(nflSummary, 'football', nflIds)[1];
		expect(allowed?.awayShare).toBeCloseTo(28.7 / (30.3 + 28.7));
	});

	it('reads baseball\'s grouped stats and their league ranks', () => {
		const data = {
			boxscore: {
				teams: [
					{ team: { id: '4' }, statistics: [
						{ name: 'batting', stats: [{ name: 'runs', displayValue: '612', rankDisplayValue: '28th' }, { name: 'homeRuns', displayValue: '168', rankDisplayValue: 'Tied-24th' }] },
						{ name: 'pitching', stats: [{ name: 'runs', displayValue: '801' }, { name: 'ERA', displayValue: '4.71', rankDisplayValue: '27th' }] },
					] },
					{ team: { id: '5' }, statistics: [
						{ name: 'batting', stats: [{ name: 'runs', displayValue: '776', rankDisplayValue: '5th' }, { name: 'homeRuns', displayValue: '211', rankDisplayValue: '5th' }] },
						{ name: 'pitching', stats: [{ name: 'runs', displayValue: '640' }, { name: 'ERA', displayValue: '3.58', rankDisplayValue: '3rd' }] },
					] },
				],
			},
		};
		const stats = parseSeasonStats(data, 'baseball', { home: '5', away: '4' });
		// Batting runs, not the pitching staff's runs allowed under the same name.
		expect(stats[0]).toMatchObject({ labelKey: 'detail.statRuns', away: '612', home: '776', awayRank: 28, homeRank: 5 });
		expect(stats[1]).toMatchObject({ awayRank: 24 });
		expect(stats[2]).toMatchObject({ labelKey: 'detail.statEra', better: 'home', homeRank: 3 });
	});

	it('drops a stat neither team has played into, and one only one side has', () => {
		const data = {
			boxscore: {
				teams: [
					{ team: { id: '11' }, statistics: [{ name: 'avgPoints', displayValue: '0.0' }, { name: 'avgRebounds', displayValue: '34.6' }, { name: 'streak', displayValue: '-' }] },
					{ team: { id: '28' }, statistics: [{ name: 'avgPoints', displayValue: '0.0' }] },
				],
			},
		};
		expect(parseSeasonStats(data, 'basketball', nflIds)).toEqual([]);
	});

	// Opening week staggers debuts, and a team yet to play would otherwise allow the fewest points.
	it('drops a row where only one side has played', () => {
		const data = {
			boxscore: {
				teams: [
					{ team: { id: '11' }, statistics: [{ name: 'avgPointsAgainst', displayValue: '0.0' }, { name: 'avgPoints', displayValue: '0.0' }] },
					{ team: { id: '28' }, statistics: [{ name: 'avgPointsAgainst', displayValue: '108.0' }, { name: 'avgPoints', displayValue: '112.0' }] },
				],
			},
		};
		expect(parseSeasonStats(data, 'basketball', nflIds)).toEqual([]);
	});

	it('keeps a real soccer zero, like a clean sheet', () => {
		const data = {
			boxscore: {
				teams: [
					{ team: { id: '359' }, statistics: [{ name: 'goalsConceded', displayValue: '0' }] },
					{ team: { id: '357' }, statistics: [{ name: 'goalsConceded', displayValue: '3' }] },
				],
			},
		};
		expect(parseSeasonStats(data, 'soccer', { home: '359', away: '357' })[0]).toMatchObject({ better: 'home', awayShare: 0 });
	});

	it('draws no bar for a goal difference either side of zero', () => {
		const data = {
			boxscore: {
				teams: [
					{ team: { id: '359' }, statistics: [{ name: 'goalDifference', displayValue: '9' }] },
					{ team: { id: '357' }, statistics: [{ name: 'goalDifference', displayValue: '-4' }] },
				],
			},
		};
		const [difference] = parseSeasonStats(data, 'soccer', { home: '359', away: '357' });
		expect(difference).toMatchObject({ better: 'home', awayShare: null });
	});
});

describe('parseTickets', () => {
	it('strips the referral tag and reads the lowest price', () => {
		expect(parseTickets(nflSummary)).toEqual({
			url: 'https://www.vividseats.com/washington-commanders-tickets-tottenham-hotspur-stadium-10-4-2026--sports-nfl-football/production/7027951',
			minPrice: 91,
		});
	});

	it('keeps the seller\'s other parameters and a price with a thousands separator', () => {
		const tickets = parseTickets({ ticketsInfo: { seatSituation: { eventLink: 'https://example.com/e?a=1&wsUser=717&b=2', summary: 'Tickets as low as $1,250' } } });
		expect(tickets).toEqual({ url: 'https://example.com/e?a=1&b=2', minPrice: 1250 });
	});

	it('shows the link without a price when none is sent', () => {
		expect(parseTickets({ ticketsInfo: { seatSituation: { eventLink: 'https://example.com/e' } } })).toEqual({ url: 'https://example.com/e', minPrice: undefined });
	});

	it('refuses anything that is not an https link', () => {
		for (const eventLink of ['http://example.com/e', 'javascript:alert(1)', 'not a url']) {
			expect(parseTickets({ ticketsInfo: { seatSituation: { eventLink } } })).toBeNull();
		}
		expect(parseTickets({})).toBeNull();
	});
});

describe('hasMatchupContent', () => {
	it('is false only when every block came back empty', () => {
		expect(hasMatchupContent(emptyMatchup)).toBe(false);
		expect(hasMatchupContent({ ...emptyMatchup, injuries: { away: [], home: parseInjuries(nflSummary, nflIds).home } })).toBe(true);
	});
});
