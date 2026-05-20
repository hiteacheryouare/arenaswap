import { leagueLogoFallbacks } from '../src/constants';

interface MockResponseInit {
	ok?: boolean;
	status?: number;
}

const createResponse = (data: unknown, init: MockResponseInit = {}): Response => ({
	ok: init.ok ?? true,
	status: init.status ?? 200,
	json: async () => data,
} as Response);

const makeEvent = (params: {
	id: string;
	state: string;
	statusName?: string;
	shortDetail?: string;
	period: number;
	clock: string;
	homeScore: string;
	awayScore: string;
	date?: string;
	withOdds?: boolean;
	situation?: { onFirst?: boolean; onSecond?: boolean; onThird?: boolean };
}): Record<string, unknown> => ({
	id: params.id,
	date: params.date ?? '2026-10-05T00:00:00.000Z',
	competitions: [
		{
			competitors: [
				{
					id: `home-${params.id}`,
					homeAway: 'home',
					score: params.homeScore,
					team: {
						displayName: 'Home Team',
						abbreviation: 'HOM',
						logo: 'https://cdn.example/home.png',
						color: 'abc',
						alternateColor: '123abc',
					},
				},
				{
					id: `away-${params.id}`,
					homeAway: 'away',
					score: params.awayScore,
					team: {
						displayName: 'Away Team',
						abbreviation: 'AWY',
						logo: 'https://cdn.example/away.png',
						color: 'not-a-color',
						alternateColor: '0f0',
					},
				},
			],
			status: {
				period: params.period,
				displayClock: params.clock,
				type: {
					state: params.state,
					name: params.statusName ?? 'STATUS',
					...(params.shortDetail !== undefined && { shortDetail: params.shortDetail }),
				},
			},
			situation: params.situation,
			venue: { fullName: 'Arena Name' },
			broadcasts: [{ names: [' ESPN ', 'ESPN'] }],
			geoBroadcasts: [{ media: { shortName: 'ESPN2' } }],
			odds: params.withOdds === false
				? undefined
				: [{
					details: 'HOM -2.5',
					overUnder: '210.5',
					provider: {
						displayName: 'DraftKings',
						logos: [
							{ href: 'https://cdn.example/dark.png', rel: ['dark'] },
							{ href: 'https://cdn.example/light.png', rel: ['light'] },
						],
					},
				}],
		},
	],
});

const getCompetition = (event: Record<string, unknown>): Record<string, unknown> => (
	(event.competitions as Record<string, unknown>[])[0]!
);

const toUrl = (input: RequestInfo | URL): string => {
	if (typeof input === 'string') return input;
	if (input instanceof URL) return input.toString();
	return input.url;
};

const loadApiClient = (): typeof import('../src/apiClient') => {
	jest.resetModules();
	return require('../src/apiClient') as typeof import('../src/apiClient');
};

describe('apiClient', () => {
	test('returns empty results and avoids fetch when enabled leagues list is empty', async () => {
		const fetchMock = jest.fn();
		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;

		const { fetchGamesWithLeagueLogos, fetchGames } = loadApiClient();
		expect(await fetchGamesWithLeagueLogos([])).toEqual({ games: [], leagueLogos: {} });
		expect(await fetchGames([])).toEqual([]);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	test('fetches and parses teams for requested leagues, including NCAA groups params', async () => {
		const fetchMock = jest.fn().mockImplementation(async (input: RequestInfo | URL) => {
			const url = toUrl(input);
			if (url.includes('/basketball/nba/teams')) {
				return createResponse({
					sports: [{
						leagues: [{
							teams: [{
								team: {
									id: '1610612738',
									displayName: 'Boston Celtics',
									abbreviation: 'BOS',
									logos: [{ href: 'https://cdn.example/celtics.png' }],
								},
							}],
						}],
					}],
				});
			}
			if (url.includes('/basketball/mens-college-basketball/teams')) {
				return createResponse({
					sports: [{
						leagues: [{
							teams: [{
								team: {
									id: '194',
									displayName: 'Duke Blue Devils',
									logos: [{ href: 'https://cdn.example/duke.png' }],
								},
							}, {
								team: {
									id: '',
									displayName: 'Ignore Me',
									abbreviation: 'IGN',
								},
							}],
						}],
					}],
				});
			}
			throw new Error(`Unexpected URL requested: ${url}`);
		});

		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		const { fetchTeamsForLeagues } = loadApiClient();

		const teams = await fetchTeamsForLeagues(['nba', 'ncaab']);

		expect(teams).toEqual([
			{
				leagueId: 'nba',
				id: '1610612738',
				name: 'Boston Celtics',
				abbreviation: 'BOS',
				logo: 'https://cdn.example/celtics.png',
			},
			{
				leagueId: 'ncaab',
				id: '194',
				name: 'Duke Blue Devils',
				abbreviation: 'DUK',
				logo: 'https://cdn.example/duke.png',
			},
		]);

		const requestedUrls = fetchMock.mock.calls.map(([input]) => new URL(toUrl(input as RequestInfo | URL)));
		expect(requestedUrls.map(url => url.pathname)).toEqual([
			'/apis/site/v2/sports/basketball/nba/teams',
			'/apis/site/v2/sports/basketball/mens-college-basketball/teams',
		]);
		expect(requestedUrls[0]?.searchParams.get('limit')).toBe('200');
		expect(requestedUrls[0]?.searchParams.get('groups')).toBeNull();
		expect(requestedUrls[1]?.searchParams.get('limit')).toBe('200');
		expect(requestedUrls[1]?.searchParams.get('groups')).toBe('50');
	});

	test('keeps successful team results when one league request fails', async () => {
		const fetchMock = jest.fn().mockImplementation(async (input: RequestInfo | URL) => {
			const url = toUrl(input);
			if (url.includes('/basketball/nba/teams')) {
				return createResponse({
					sports: [{
						leagues: [{
							teams: [{
								team: {
									id: '1610612747',
									displayName: 'Los Angeles Lakers',
									abbreviation: 'LAL',
								},
							}],
						}],
					}],
				});
			}
			if (url.includes('/football/nfl/teams')) return createResponse({ message: 'temporary outage' }, { ok: false, status: 503 });
			throw new Error(`Unexpected URL requested: ${url}`);
		});

		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		const { fetchTeamsForLeagues } = loadApiClient();

		await expect(fetchTeamsForLeagues(['nba', 'nfl'])).resolves.toEqual([
			{
				leagueId: 'nba',
				id: '1610612747',
				name: 'Los Angeles Lakers',
				abbreviation: 'LAL',
				logo: undefined,
			},
		]);
	});

	test('throws when every team request fails', async () => {
		const fetchMock = jest.fn()
			.mockResolvedValueOnce(createResponse({ message: 'temporary outage' }, { ok: false, status: 503 }))
			.mockRejectedValueOnce(new Error('network down'));

		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		const { fetchTeamsForLeagues } = loadApiClient();

		await expect(fetchTeamsForLeagues(['nba', 'nfl'])).rejects.toThrow('Failed to fetch teams for nba: HTTP 503');
	});

	test('parses live and upcoming games with logos, broadcasts, odds, and colors', async () => {
		const fetchMock = jest.fn()
			.mockResolvedValueOnce(createResponse({
				leagues: [{ logos: [{ href: 'https://cdn.example/nba-logo.png' }] }],
				events: [
					makeEvent({
						id: 'live-1',
						state: 'in_progress',
						statusName: 'HALFTIME',
						period: 2,
						clock: '10:05',
						homeScore: '101',
						awayScore: '99',
					}),
					makeEvent({
						id: 'final-1',
						state: 'post',
						period: 4,
						clock: '0:00',
						homeScore: '120',
						awayScore: '112',
					}),
				],
			}))
			.mockResolvedValueOnce(createResponse({
				events: [
					makeEvent({
						id: 'pre-1',
						state: 'scheduled',
						period: 1,
						clock: '0:00',
						homeScore: '0',
						awayScore: '0',
					}),
				],
			}));

		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		const { fetchGamesWithLeagueLogos } = loadApiClient();

		const result = await fetchGamesWithLeagueLogos(['nba']);
		expect(result.games.map(game => game.id).sort()).toEqual(['live-1', 'pre-1']);
		expect(result.leagueLogos.nba).toBe('https://cdn.example/nba-logo.png');

		const live = result.games.find(game => game.id === 'live-1');
		expect(live).toMatchObject({
			status: 'in',
			intermission: true,
			period: 2,
			clockSeconds: 605,
			venueName: 'Arena Name',
			broadcasts: ['ESPN', 'ESPN2'],
			odds: {
				details: 'HOM -2.5',
				overUnder: 210.5,
				provider: {
					name: 'DraftKings',
					logoUrl: 'https://cdn.example/light.png',
					darkLogoUrl: 'https://cdn.example/dark.png',
				},
			},
		});
		expect(live?.homeTeam.color).toBe('#AABBCC');
		expect(live?.awayTeam.color).toBe('#00FF00');

		const upcoming = result.games.find(game => game.id === 'pre-1');
		expect(upcoming?.status).toBe('pre');
		expect(upcoming?.startTime).toBe('2026-10-05T00:00:00.000Z');

		const calledUrls = fetchMock.mock.calls.map(([url]) => String(url));
		expect(calledUrls[0]).toContain('/basketball/nba/scoreboard');
		expect(calledUrls[1]).toContain('dates=');
	});

	test('supports includeUpcoming=false with only one scoreboard request', async () => {
		const fetchMock = jest.fn().mockResolvedValue(createResponse({
			events: [
				makeEvent({
					id: 'mlb-live',
					state: 'in',
					period: 7,
					clock: '0:00',
					homeScore: '3',
					awayScore: '2',
				}),
			],
		}));

		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		const { fetchGamesWithLeagueLogos } = loadApiClient();

		const result = await fetchGamesWithLeagueLogos(['mlb'], { includeUpcoming: false });
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(result.games).toHaveLength(1);
		expect(String(fetchMock.mock.calls[0][0])).not.toContain('dates=');
		expect(result.leagueLogos.mlb).toBe(leagueLogoFallbacks.mlb);
	});

	test('defensively handles malformed events, clocks, colors, and odds variants', async () => {
		const missingCompetitors = makeEvent({
			id: 'missing-competitors',
			state: 'in',
			period: 1,
			clock: '9:59',
			homeScore: '5',
			awayScore: '4',
		});
		const missingCompetitorsCompetition = getCompetition(missingCompetitors);
		const competitors = missingCompetitorsCompetition.competitors as Record<string, unknown>[];
		missingCompetitorsCompetition.competitors = [competitors[0]];

		const malformedStatus = makeEvent({
			id: 'malformed-status',
			state: 'in',
			period: 2,
			clock: '4:30',
			homeScore: '12',
			awayScore: '10',
		});
		getCompetition(malformedStatus).status = { type: {} };

		const fallbackLive = makeEvent({
			id: 'fallback-live',
			state: 'in_progress',
			period: 4,
			clock: 'not-a-clock',
			homeScore: 'abc',
			awayScore: '7',
		});
		const fallbackCompetition = getCompetition(fallbackLive);
		fallbackCompetition.status = { type: { state: ' in_progress ' }, displayClock: 'not-a-clock' };
		const fallbackCompetitors = fallbackCompetition.competitors as Record<string, unknown>[];
		const fallbackHome = fallbackCompetitors.find(c => c.homeAway === 'home') as Record<string, unknown>;
		const fallbackAway = fallbackCompetitors.find(c => c.homeAway === 'away') as Record<string, unknown>;
		(fallbackHome.team as Record<string, unknown>).color = 'not-a-color';
		(fallbackHome.team as Record<string, unknown>).alternateColor = 'still-not-a-color';
		(fallbackAway.team as Record<string, unknown>).color = '112233';
		(fallbackAway.team as Record<string, unknown>).alternateColor = 'bad';
		fallbackCompetition.odds = [{ details: '   ', overUnder: 'NaN' }];

		const oddsVariants = makeEvent({
			id: 'odds-variants',
			state: 'live',
			period: 3,
			clock: '2:11',
			homeScore: '88',
			awayScore: '87',
		});
		getCompetition(oddsVariants).odds = [{
			details: ' AWY +1.5 ',
			overUnder: '205.5',
			provider: {
				name: 'Caesars',
				logos: [{ href: 'https://cdn.example/first-logo.png', rel: ['dark'] }],
			},
		}];

		const fetchMock = jest.fn().mockResolvedValue(createResponse({
			events: [missingCompetitors, malformedStatus, fallbackLive, oddsVariants],
		}));
		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		const { fetchGamesWithLeagueLogos } = loadApiClient();

		const result = await fetchGamesWithLeagueLogos(['nba'], { includeUpcoming: false });
		expect(result.games.map(game => game.id).sort()).toEqual(['fallback-live', 'odds-variants']);

		const fallbackGame = result.games.find(game => game.id === 'fallback-live');
		expect(fallbackGame).toMatchObject({
			status: 'in',
			period: 1,
			clockSeconds: 0,
		});
		expect(fallbackGame?.homeTeam.score).toBe(0);
		expect(fallbackGame?.homeTeam.color).toBeUndefined();
		expect(fallbackGame?.awayTeam.color).toBe('#112233');
		expect(fallbackGame?.odds).toBeUndefined();

		const oddsGame = result.games.find(game => game.id === 'odds-variants');
		expect(oddsGame?.odds).toEqual({
			details: 'AWY +1.5',
			overUnder: 205.5,
			provider: {
				name: 'Caesars',
				logoUrl: 'https://cdn.example/first-logo.png',
				darkLogoUrl: 'https://cdn.example/first-logo.png',
			},
		});
	});

	test('filters out post games while combining today and upcoming responses', async () => {
		const fetchMock = jest.fn()
			.mockResolvedValueOnce(createResponse({
				events: [
					makeEvent({
						id: 'today-live',
						state: 'in',
						period: 3,
						clock: '1:15',
						homeScore: '100',
						awayScore: '98',
					}),
					makeEvent({
						id: 'today-pre',
						state: 'scheduled',
						period: 1,
						clock: '0:00',
						homeScore: '0',
						awayScore: '0',
					}),
					makeEvent({
						id: 'today-post',
						state: 'post',
						period: 4,
						clock: '0:00',
						homeScore: '110',
						awayScore: '103',
					}),
				],
			}))
			.mockResolvedValueOnce(createResponse({
				events: [
					makeEvent({
						id: 'upcoming-pre',
						state: 'pre',
						period: 1,
						clock: '0:00',
						homeScore: '0',
						awayScore: '0',
					}),
					makeEvent({
						id: 'upcoming-post',
						state: 'post',
						period: 4,
						clock: '0:00',
						homeScore: '91',
						awayScore: '90',
					}),
				],
			}));

		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		const { fetchGamesWithLeagueLogos } = loadApiClient();

		const result = await fetchGamesWithLeagueLogos(['nba']);
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(result.games.map(game => game.id).sort()).toEqual(['today-live', 'today-pre', 'upcoming-pre']);
		expect(result.games.some(game => game.status === 'post')).toBe(false);
	});

	test('adds NCAA basketball groups=50 query and uses fallback league logo when needed', async () => {
		const fetchMock = jest.fn()
			.mockResolvedValueOnce(createResponse({ events: [makeEvent({
				id: 'ncaab-live',
				state: 'live',
				period: 2,
				clock: '3:20',
				homeScore: '77',
				awayScore: '74',
				withOdds: false,
			})] }))
			.mockResolvedValueOnce(createResponse({ events: [] }));

		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		const { fetchLeagueLogos } = loadApiClient();

		const logos = await fetchLeagueLogos(['ncaab']);
		expect(logos.ncaab).toBe(leagueLogoFallbacks.ncaab);

		const calledUrls = fetchMock.mock.calls.map(([url]) => String(url));
		expect(calledUrls).toHaveLength(2);
		expect(calledUrls[0]).toContain('groups=50');
		expect(calledUrls[1]).toContain('groups=50');
	});

	test('adds NCAA womens basketball groups=49 query and uses fallback league logo when needed', async () => {
		const fetchMock = jest.fn()
			.mockResolvedValueOnce(createResponse({ events: [makeEvent({
				id: 'ncaaw-live',
				state: 'live',
				period: 3,
				clock: '5:00',
				homeScore: '60',
				awayScore: '58',
				withOdds: false,
			})] }))
			.mockResolvedValueOnce(createResponse({ events: [] }));

		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		const { fetchLeagueLogos } = loadApiClient();

		const logos = await fetchLeagueLogos(['ncaaw']);
		expect(logos.ncaaw).toBe(leagueLogoFallbacks.ncaaw);

		const calledUrls = fetchMock.mock.calls.map(([url]) => String(url));
		expect(calledUrls).toHaveLength(2);
		expect(calledUrls[0]).toContain('groups=49');
		expect(calledUrls[1]).toContain('groups=49');
		expect(calledUrls[0]).toContain('/basketball/womens-college-basketball/scoreboard');
	});

	test('fetches EPL scoreboard from correct ESPN path without groups param', async () => {
		const fetchMock = jest.fn()
			.mockResolvedValueOnce(createResponse({
				leagues: [{ logos: [{ href: 'https://cdn.example/epl-logo.png' }] }],
				events: [makeEvent({
					id: 'epl-live',
					state: 'in',
					period: 2,
					clock: '25:00',
					homeScore: '1',
					awayScore: '0',
					withOdds: false,
				})],
			}))
			.mockResolvedValueOnce(createResponse({ events: [] }));

		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		const { fetchGamesWithLeagueLogos } = loadApiClient();

		const result = await fetchGamesWithLeagueLogos(['epl']);
		expect(result.leagueLogos.epl).toBe('https://cdn.example/epl-logo.png');
		expect(result.games).toHaveLength(1);
		expect(result.games[0]!.id).toBe('epl-live');
		expect(result.games[0]!.league).toBe('epl');
		expect(result.games[0]!.sportType).toBe('soccer');

		const calledUrls = fetchMock.mock.calls.map(([url]) => String(url));
		expect(calledUrls[0]).toContain('/soccer/eng.1/scoreboard');
		expect(calledUrls[0]).not.toContain('groups=');
	});

	test('fetches FIFA World Cup scoreboard from correct ESPN path without groups param', async () => {
		const fetchMock = jest.fn()
			.mockResolvedValueOnce(createResponse({
				leagues: [{ logos: [{ href: 'https://cdn.example/fifawc-logo.png' }] }],
				events: [makeEvent({
					id: 'fifawc-live',
					state: 'in',
					period: 2,
					clock: '40:00',
					homeScore: '1',
					awayScore: '1',
					withOdds: false,
				})],
			}))
			.mockResolvedValueOnce(createResponse({ events: [] }));

		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		const { fetchGamesWithLeagueLogos } = loadApiClient();

		const result = await fetchGamesWithLeagueLogos(['fifawc']);
		expect(result.leagueLogos.fifawc).toBe('https://cdn.example/fifawc-logo.png');
		expect(result.games).toHaveLength(1);
		expect(result.games[0]!.id).toBe('fifawc-live');
		expect(result.games[0]!.league).toBe('fifawc');
		expect(result.games[0]!.sportType).toBe('soccer');

		const calledUrls = fetchMock.mock.calls.map(([url]) => String(url));
		expect(calledUrls[0]).toContain('/soccer/fifa.world/scoreboard');
		expect(calledUrls[0]).not.toContain('groups=');
	});

	test('keeps fulfilled games when one scoreboard request fails for a league', async () => {
		const fetchMock = jest.fn(async (url: string) => {
			if (url.includes('/basketball/nba/scoreboard') && !url.includes('dates=')) {
				return createResponse({}, { ok: false, status: 500 });
			}
			if (url.includes('/basketball/nba/scoreboard') && url.includes('dates=')) {
				return createResponse({
					leagues: [{ logos: [{ href: 'https://cdn.example/nba-upcoming-logo.png' }] }],
					events: [makeEvent({
						id: 'upcoming-only',
						state: 'scheduled',
						period: 1,
						clock: '0:00',
						homeScore: '0',
						awayScore: '0',
					})],
				});
			}
			throw new Error(`Unexpected url: ${url}`);
		});

		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		const { fetchGamesWithLeagueLogos } = loadApiClient();

		const result = await fetchGamesWithLeagueLogos(['nba']);
		expect(result.games.map(game => game.id)).toEqual(['upcoming-only']);
		expect(result.leagueLogos.nba).toBe('https://cdn.example/nba-upcoming-logo.png');
	});

	test('aggregates fulfilled leagues when another league fails entirely', async () => {
		const fetchMock = jest.fn(async (url: string) => {
			if (url.includes('/basketball/nba/scoreboard') && !url.includes('dates=')) {
				return createResponse({
					leagues: [{ logos: [{ href: 'https://cdn.example/nba-logo.png' }] }],
					events: [makeEvent({
						id: 'nba-live',
						state: 'in',
						period: 2,
						clock: '5:00',
						homeScore: '60',
						awayScore: '58',
					})],
				});
			}
			if (url.includes('/basketball/nba/scoreboard') && url.includes('dates=')) {
				return createResponse({
					events: [makeEvent({
						id: 'nba-pre',
						state: 'pre',
						period: 1,
						clock: '0:00',
						homeScore: '0',
						awayScore: '0',
					})],
				});
			}
			if (url.includes('/football/nfl/scoreboard')) {
				return createResponse({}, { ok: false, status: 500 });
			}
			throw new Error(`Unexpected url: ${url}`);
		});

		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		const { fetchGamesWithLeagueLogos } = loadApiClient();

		const result = await fetchGamesWithLeagueLogos(['nba', 'nfl']);
		expect(result.games.map(game => game.id).sort()).toEqual(['nba-live', 'nba-pre']);
		expect(result.games.every(game => game.league === 'nba')).toBe(true);
		expect(result.leagueLogos).toEqual({ nba: 'https://cdn.example/nba-logo.png' });
	});

	test('parses baseball top-of-inning and base runners from situation', async () => {
		const fetchMock = jest.fn().mockResolvedValue(createResponse({
			events: [
				makeEvent({
					id: 'mlb-top',
					state: 'in',
					period: 7,
					clock: '0:00',
					homeScore: '3',
					awayScore: '2',
					shortDetail: 'Top 7th',
					situation: { onFirst: true, onSecond: false, onThird: true },
				}),
				makeEvent({
					id: 'mlb-bot',
					state: 'in',
					period: 4,
					clock: '0:00',
					homeScore: '1',
					awayScore: '1',
					shortDetail: 'Bot 4th',
					situation: { onFirst: false, onSecond: true, onThird: false },
				}),
			],
		}));

		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		const { fetchGamesWithLeagueLogos } = loadApiClient();

		const result = await fetchGamesWithLeagueLogos(['mlb'], { includeUpcoming: false });
		const top = result.games.find(g => g.id === 'mlb-top');
		const bot = result.games.find(g => g.id === 'mlb-bot');

		expect(top?.topOfInning).toBe(true);
		expect(top?.baseRunners).toEqual({ first: true, second: false, third: true });

		expect(bot?.topOfInning).toBe(false);
		expect(bot?.baseRunners).toEqual({ first: false, second: true, third: false });
	});

	test('sets topOfInning=false for Mid inning and undefined baseRunners when no situation', async () => {
		const fetchMock = jest.fn().mockResolvedValue(createResponse({
			events: [
				makeEvent({
					id: 'mlb-mid',
					state: 'in',
					period: 5,
					clock: '0:00',
					homeScore: '2',
					awayScore: '0',
					shortDetail: 'Mid 5th',
				}),
				makeEvent({
					id: 'mlb-no-shortdetail',
					state: 'in',
					period: 3,
					clock: '0:00',
					homeScore: '0',
					awayScore: '0',
				}),
			],
		}));

		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		const { fetchGamesWithLeagueLogos } = loadApiClient();

		const result = await fetchGamesWithLeagueLogos(['mlb'], { includeUpcoming: false });
		const mid = result.games.find(g => g.id === 'mlb-mid');
		const noDetail = result.games.find(g => g.id === 'mlb-no-shortdetail');

		expect(mid?.topOfInning).toBe(false);
		expect(mid?.baseRunners).toBeUndefined();

		expect(noDetail?.topOfInning).toBeUndefined();
		expect(noDetail?.baseRunners).toBeUndefined();
	});

	test('does not set topOfInning or baseRunners for non-baseball sports', async () => {
		const fetchMock = jest.fn().mockResolvedValue(createResponse({
			events: [
				makeEvent({
					id: 'nba-live',
					state: 'in',
					period: 3,
					clock: '5:00',
					homeScore: '88',
					awayScore: '84',
					shortDetail: 'Q3 5:00',
					situation: { onFirst: true, onSecond: true, onThird: true },
				}),
			],
		}));

		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		const { fetchGamesWithLeagueLogos } = loadApiClient();

		const result = await fetchGamesWithLeagueLogos(['nba'], { includeUpcoming: false });
		const game = result.games[0];

		expect(game?.topOfInning).toBeUndefined();
		expect(game?.baseRunners).toBeUndefined();
	});

	test('fetchLiveGames filters out pre-game entries', async () => {
		const fetchMock = jest.fn()
			.mockResolvedValueOnce(createResponse({
				events: [makeEvent({
					id: 'live-only',
					state: 'in',
					period: 3,
					clock: '1:30',
					homeScore: '95',
					awayScore: '94',
				})],
			}))
			.mockResolvedValueOnce(createResponse({
				events: [makeEvent({
					id: 'upcoming-only',
					state: 'pre',
					period: 1,
					clock: '0:00',
					homeScore: '0',
					awayScore: '0',
				})],
			}));

		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		const { fetchLiveGames } = loadApiClient();

		const games = await fetchLiveGames(['nba']);
		expect(games).toHaveLength(1);
		expect(games[0]!.id).toBe('live-only');
		expect(games[0]!.status).toBe('in');
	});
});
