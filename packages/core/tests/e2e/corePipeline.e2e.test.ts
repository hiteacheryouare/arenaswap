import type { ScoreSnapshot } from '../../src/types';

const toUrl = (input: RequestInfo | URL): string => {
	if (typeof input === 'string') return input;
	if (input instanceof URL) return input.toString();
	return input.url;
};

const jsonResponse = (body: unknown, status: number = 200): Response => ({
	ok: status >= 200 && status < 300,
	status,
	json: async () => body,
} as Response);

const basketballEvent = (params: {
	id: string;
	state: 'pre' | 'in' | 'post';
	period: number;
	displayClock: string;
	homeScore: number;
	awayScore: number;
	date: string;
}) => ({
	id: params.id,
	date: params.date,
	competitions: [
		{
			competitors: [
				{
					id: `${params.id}-home`,
					homeAway: 'home',
					score: String(params.homeScore),
					team: {
						displayName: 'Home Team',
						abbreviation: 'HOM',
						color: '336699',
					},
				},
				{
					id: `${params.id}-away`,
					homeAway: 'away',
					score: String(params.awayScore),
					team: {
						displayName: 'Away Team',
						abbreviation: 'AWY',
						alternateColor: 'ffcc00',
					},
				},
			],
			status: {
				period: params.period,
				displayClock: params.displayClock,
				type: {
					state: params.state,
					name: params.state === 'post' ? 'STATUS_FINAL' : 'STATUS_IN_PROGRESS',
				},
			},
			venue: {
				fullName: 'ArenaSwap Arena',
			},
			broadcasts: [{ names: ['ESPN'] }],
			geoBroadcasts: [{ media: { shortName: 'ABC' } }],
			odds: [
				{
					details: 'HOM -1.5',
					overUnder: '223.5',
					provider: {
						displayName: 'DraftKings',
						logos: [
							{
								href: 'https://example.com/dk-light.svg',
								rel: ['light'],
							},
						],
					},
				},
			],
		},
	],
});

describe('core API + excitement e2e flow', () => {
	beforeEach(() => {
		jest.resetModules();
	});

	it('parses mocked scoreboard payloads and ranks live games above upcoming games', async () => {
		const todayPayload = {
			leagues: [{ logos: [{ href: 'https://example.com/nba-logo.png' }] }],
			events: [
				basketballEvent({
					id: 'nba-live-1',
					state: 'in',
					period: 4,
					displayClock: '1:15',
					homeScore: 95,
					awayScore: 95,
					date: '2026-02-11T00:00:00.000Z',
				}),
				basketballEvent({
					id: 'nba-final-1',
					state: 'post',
					period: 4,
					displayClock: '0:00',
					homeScore: 108,
					awayScore: 101,
					date: '2026-02-11T00:00:00.000Z',
				}),
			],
		};
		const upcomingPayload = {
			leagues: [{ logos: [{ href: 'https://example.com/nba-logo-upcoming.png' }] }],
			events: [
				basketballEvent({
					id: 'nba-pre-1',
					state: 'pre',
					period: 1,
					displayClock: '0:00',
					homeScore: 0,
					awayScore: 0,
					date: '2026-02-12T00:00:00.000Z',
				}),
			],
		};

		const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
			const url = toUrl(input);
			if (!url.includes('/basketball/nba/scoreboard')) {
				throw new Error(`Unexpected URL requested: ${url}`);
			}
			if (url.includes('dates=')) return jsonResponse(upcomingPayload);
			return jsonResponse(todayPayload);
		});

		const { fetchGames, fetchLiveGames } = await import('../../src/apiClient');
		const { computePowerScore } = await import('powerscore');

		const games = await fetchGames(['nba']);
		expect(games.map(game => game.id).sort()).toEqual(['nba-live-1', 'nba-pre-1']);
		expect(games.every(game => game.status !== 'post')).toBe(true);

		const liveGames = await fetchLiveGames(['nba']);
		expect(liveGames.map(game => game.id)).toEqual(['nba-live-1']);

		const historyByGameId: Record<string, ScoreSnapshot[]> = {
			'nba-live-1': [
				{ gameId: 'nba-live-1', timestamp: 1, homeScore: 85, awayScore: 95 },
				{ gameId: 'nba-live-1', timestamp: 2, homeScore: 90, awayScore: 95 },
				{ gameId: 'nba-live-1', timestamp: 3, homeScore: 95, awayScore: 95 },
			],
			'nba-pre-1': [],
		};

		const rankedScores = games
			.map(game => ({
				game,
				score: computePowerScore(game, historyByGameId[game.id] ?? []),
			}))
			.sort((a, b) => b.score.total - a.score.total);

		expect(rankedScores[0]?.game.id).toBe('nba-live-1');
		expect(rankedScores[0]?.score.total).toBeGreaterThan(rankedScores[1]?.score.total ?? 0);
		expect(rankedScores[0]?.score.reason).toContain('10-0 run');
		expect(rankedScores[0]?.score.reason).toContain('cutting into it');

		const requestedUrls = fetchSpy.mock.calls.map(([input]) => toUrl(input as RequestInfo | URL));
		expect(requestedUrls.length).toBeGreaterThanOrEqual(4);
		expect(requestedUrls.some(url => url.includes('dates='))).toBe(true);
	});

	it('uses only today scoreboard when includeUpcoming=false and returns non-final games', async () => {
		const todayPayload = {
			leagues: [{ logos: [{ href: 'https://example.com/nba-today-logo.png' }] }],
			events: [
				basketballEvent({
					id: 'nba-live-today-only',
					state: 'in',
					period: 4,
					displayClock: '3:12',
					homeScore: 104,
					awayScore: 102,
					date: '2026-02-11T00:00:00.000Z',
				}),
				basketballEvent({
					id: 'nba-pre-today-only',
					state: 'pre',
					period: 1,
					displayClock: '0:00',
					homeScore: 0,
					awayScore: 0,
					date: '2026-02-11T02:30:00.000Z',
				}),
				basketballEvent({
					id: 'nba-final-today-only',
					state: 'post',
					period: 4,
					displayClock: '0:00',
					homeScore: 112,
					awayScore: 109,
					date: '2026-02-11T00:00:00.000Z',
				}),
			],
		};

		const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
			const url = toUrl(input);
			if (!url.includes('/basketball/nba/scoreboard')) throw new Error(`Unexpected URL requested: ${url}`);
			if (url.includes('dates=')) throw new Error('Upcoming dates query should not be requested');
			return jsonResponse(todayPayload);
		});

		const { fetchGamesWithLeagueLogos } = await import('../../src/apiClient');

		const result = await fetchGamesWithLeagueLogos(['nba'], { includeUpcoming: false });

		expect(result.games.map(game => game.id).sort()).toEqual(['nba-live-today-only', 'nba-pre-today-only']);
		expect(result.games.every(game => game.status !== 'post')).toBe(true);
		expect(result.games.find(game => game.id === 'nba-pre-today-only')?.startTime).toBe('2026-02-11T02:30:00.000Z');
		expect(result.leagueLogos.nba).toBe('https://example.com/nba-today-logo.png');

		const requestedUrls = fetchSpy.mock.calls.map(([input]) => toUrl(input as RequestInfo | URL));
		expect(requestedUrls).toHaveLength(1);
		expect(requestedUrls[0]).toContain('/basketball/nba/scoreboard');
		expect(requestedUrls[0]).not.toContain('dates=');
	});

	it('keeps successful leagues when one league fails in a multi-league fetch', async () => {
		const nbaPayload = {
			leagues: [{ logos: [{ href: 'https://example.com/nba-logo.png' }] }],
			events: [
				basketballEvent({
					id: 'nba-live-multi',
					state: 'in',
					period: 4,
					displayClock: '4:20',
					homeScore: 99,
					awayScore: 97,
					date: '2026-02-11T00:00:00.000Z',
				}),
			],
		};
		const wnbaPayload = {
			leagues: [{ logos: [{ href: 'https://example.com/wnba-logo.png' }] }],
			events: [
				basketballEvent({
					id: 'wnba-live-multi',
					state: 'in',
					period: 4,
					displayClock: '2:01',
					homeScore: 81,
					awayScore: 80,
					date: '2026-02-11T00:00:00.000Z',
				}),
			],
		};

		const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
			const url = toUrl(input);
			if (url.includes('/basketball/nba/scoreboard')) return jsonResponse(nbaPayload);
			if (url.includes('/basketball/wnba/scoreboard')) return jsonResponse(wnbaPayload);
			if (url.includes('/hockey/nhl/scoreboard')) return jsonResponse({ message: 'temporary outage' }, 503);
			throw new Error(`Unexpected URL requested: ${url}`);
		});

		const { fetchGamesWithLeagueLogos } = await import('../../src/apiClient');

		const result = await fetchGamesWithLeagueLogos(['nba', 'nhl', 'wnba'], { includeUpcoming: false });

		expect(result.games.map(game => game.id).sort()).toEqual(['nba-live-multi', 'wnba-live-multi']);
		expect(result.leagueLogos).toEqual({
			nba: 'https://example.com/nba-logo.png',
			wnba: 'https://example.com/wnba-logo.png',
		});

		const requestedUrls = fetchSpy.mock.calls.map(([input]) => toUrl(input as RequestInfo | URL));
		expect(requestedUrls.filter(url => url.includes('/hockey/nhl/scoreboard'))).toHaveLength(1);
	});

	it('ranks multiple live games by deterministic excitement totals', async () => {
		const todayPayload = {
			leagues: [{ logos: [{ href: 'https://example.com/nba-logo.png' }] }],
			events: [
				basketballEvent({
					id: 'nba-live-momentum',
					state: 'in',
					period: 4,
					displayClock: '2:30',
					homeScore: 100,
					awayScore: 100,
					date: '2026-02-11T00:00:00.000Z',
				}),
				basketballEvent({
					id: 'nba-live-critical',
					state: 'in',
					period: 4,
					displayClock: '0:45',
					homeScore: 98,
					awayScore: 98,
					date: '2026-02-11T00:00:00.000Z',
				}),
				basketballEvent({
					id: 'nba-live-fringe',
					state: 'in',
					period: 2,
					displayClock: '6:00',
					homeScore: 88,
					awayScore: 70,
					date: '2026-02-11T00:00:00.000Z',
				}),
			],
		};

		jest.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
			const url = toUrl(input);
			if (!url.includes('/basketball/nba/scoreboard')) throw new Error(`Unexpected URL requested: ${url}`);
			if (url.includes('dates=')) throw new Error('Upcoming dates query should not be requested');
			return jsonResponse(todayPayload);
		});

		const { fetchGamesWithLeagueLogos } = await import('../../src/apiClient');
		const { computePowerScore } = await import('powerscore');

		const result = await fetchGamesWithLeagueLogos(['nba'], { includeUpcoming: false });
		const historyByGameId: Record<string, ScoreSnapshot[]> = {
			'nba-live-momentum': [
				{ gameId: 'nba-live-momentum', timestamp: 1, homeScore: 90, awayScore: 100 },
				{ gameId: 'nba-live-momentum', timestamp: 2, homeScore: 95, awayScore: 100 },
				{ gameId: 'nba-live-momentum', timestamp: 3, homeScore: 100, awayScore: 100 },
			],
			'nba-live-critical': [
				{ gameId: 'nba-live-critical', timestamp: 1, homeScore: 96, awayScore: 96 },
				{ gameId: 'nba-live-critical', timestamp: 2, homeScore: 97, awayScore: 97 },
				{ gameId: 'nba-live-critical', timestamp: 3, homeScore: 98, awayScore: 98 },
			],
			'nba-live-fringe': [],
		};

		const ranked = result.games
			.map(game => ({
				id: game.id,
				score: computePowerScore(game, historyByGameId[game.id] ?? []),
			}))
			.sort((a, b) => b.score.total - a.score.total);

		expect(ranked.map(item => item.id)).toEqual(['nba-live-momentum', 'nba-live-critical', 'nba-live-fringe']);
		expect(ranked.map(item => item.score.total)).toEqual([80, 52, 5]);
		expect(ranked[0]?.score.reason).toContain('HOM on a 10-0 run');
		expect(ranked[1]?.score.reason).toContain('under 5 min left');
		expect(ranked[1]?.score.reason).toContain('tied');
	});

	it('keeps upcoming games when today fetch fails but date-range fetch succeeds', async () => {
		const upcomingPayload = {
			leagues: [{ logos: [{ href: 'https://example.com/nba-upcoming-only-logo.png' }] }],
			events: [
				basketballEvent({
					id: 'nba-pre-recovery',
					state: 'pre',
					period: 1,
					displayClock: '0:00',
					homeScore: 0,
					awayScore: 0,
					date: '2026-02-12T00:00:00.000Z',
				}),
				basketballEvent({
					id: 'nba-final-recovery',
					state: 'post',
					period: 4,
					displayClock: '0:00',
					homeScore: 100,
					awayScore: 95,
					date: '2026-02-12T00:00:00.000Z',
				}),
			],
		};

		const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
			const url = toUrl(input);
			if (!url.includes('/basketball/nba/scoreboard')) throw new Error(`Unexpected URL requested: ${url}`);
			if (url.includes('dates=')) return jsonResponse(upcomingPayload);
			return jsonResponse({ message: 'today scoreboard unavailable' }, 503);
		});

		const { fetchGamesWithLeagueLogos } = await import('../../src/apiClient');

		const result = await fetchGamesWithLeagueLogos(['nba']);

		expect(result.games.map(game => game.id)).toEqual(['nba-pre-recovery']);
		expect(result.games[0]?.status).toBe('pre');
		expect(result.leagueLogos.nba).toBe('https://example.com/nba-upcoming-only-logo.png');

		const requestedUrls = fetchSpy.mock.calls.map(([input]) => toUrl(input as RequestInfo | URL));
		expect(requestedUrls).toHaveLength(2);
		expect(requestedUrls.some(url => url.includes('dates='))).toBe(true);
	});

});
