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
	situation?: Record<string, unknown>;
	season?: Record<string, unknown>;
	notes?: Record<string, unknown>[];
	homeShootoutScore?: number;
	awayShootoutScore?: number;
}): Record<string, unknown> => ({
	id: params.id,
	date: params.date ?? '2026-10-05T00:00:00.000Z',
	...(params.season !== undefined && { season: params.season }),
	competitions: [
		{
			competitors: [
				{
					id: `home-${params.id}`,
					homeAway: 'home',
					score: params.homeScore,
					...(params.homeShootoutScore !== undefined && { shootoutScore: params.homeShootoutScore }),
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
					...(params.awayShootoutScore !== undefined && { shootoutScore: params.awayShootoutScore }),
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
			...(params.notes !== undefined && { notes: params.notes }),
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

const parseEspnDate = (s: string) => new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`);

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
		expect(result.games.map(game => game.id).toSorted()).toEqual(['live-1', 'pre-1']);
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

	test('uses upcomingDays to build the dates query parameter', async () => {
		const fetchMock = jest.fn().mockResolvedValue(createResponse({ events: [] }));
		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		const { fetchGamesWithLeagueLogos } = loadApiClient();

		await fetchGamesWithLeagueLogos(['nba'], { includeUpcoming: true, upcomingDays: 3 });

		const calledUrls = fetchMock.mock.calls.map(([url]) => String(url));
		const datesUrl = calledUrls.find(u => u.includes('dates='));
		expect(datesUrl).toBeDefined();

		// The dates range should span exactly upcomingDays days.
		// ESPN format is YYYYMMDD-YYYYMMDD; extract and compare.
		const datesParam = new URL(datesUrl!).searchParams.get('dates')!;
		const [startStr, endStr] = datesParam.split('-');
		const diffDays = (parseEspnDate(endStr!).getTime() - parseEspnDate(startStr!).getTime()) / (1000 * 60 * 60 * 24);
		expect(diffDays).toBe(3);
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

	test('parses sub-minute clock values sent without a leading "0:" prefix', async () => {
		const fetchMock = jest.fn().mockResolvedValue(createResponse({
			events: [
				makeEvent({ id: 'sub-min-int', state: 'in', period: 4, clock: '45', homeScore: '98', awayScore: '96' }),
				makeEvent({ id: 'sub-min-float', state: 'in', period: 4, clock: '45.3', homeScore: '98', awayScore: '96' }),
				makeEvent({ id: 'sub-min-dec-75', state: 'in', period: 4, clock: '0.75', homeScore: '98', awayScore: '96' }),
				makeEvent({ id: 'sub-min-dec-5', state: 'in', period: 4, clock: '0.5', homeScore: '98', awayScore: '96' }),
			],
		}));
		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		const { fetchGamesWithLeagueLogos } = loadApiClient();

		const result = await fetchGamesWithLeagueLogos(['nba'], { includeUpcoming: false });
		const intGame = result.games.find(g => g.id === 'sub-min-int');
		const floatGame = result.games.find(g => g.id === 'sub-min-float');
		const dec75Game = result.games.find(g => g.id === 'sub-min-dec-75');
		const dec5Game = result.games.find(g => g.id === 'sub-min-dec-5');
		expect(intGame?.clockSeconds).toBe(45);
		expect(floatGame?.clockSeconds).toBe(45);
		expect(dec75Game?.clockSeconds).toBe(45); // 0.75 minutes = 45 seconds
		expect(dec5Game?.clockSeconds).toBe(30);  // 0.5 minutes = 30 seconds
	});

	test('parses soccer prime-notation clock values (e.g. "85\'", "90\'+8\'")', async () => {
		const fetchMock = jest.fn().mockResolvedValue(createResponse({
			events: [
				makeEvent({ id: 'soccer-normal', state: 'in', period: 2, clock: "85'", homeScore: '1', awayScore: '0' }),
				makeEvent({ id: 'soccer-stoppage', state: 'in', period: 2, clock: "90'+8'", homeScore: '1', awayScore: '1' }),
				makeEvent({ id: 'soccer-45', state: 'in', period: 1, clock: "45'", homeScore: '0', awayScore: '0' }),
				makeEvent({ id: 'soccer-zero', state: 'in', period: 1, clock: "0'", homeScore: '0', awayScore: '0' }),
			],
		}));
		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		const { fetchGamesWithLeagueLogos } = loadApiClient();

		const result = await fetchGamesWithLeagueLogos(['mls'], { includeUpcoming: false });
		const normalGame = result.games.find(g => g.id === 'soccer-normal');
		const stoppageGame = result.games.find(g => g.id === 'soccer-stoppage');
		const halfGame = result.games.find(g => g.id === 'soccer-45');
		const zeroGame = result.games.find(g => g.id === 'soccer-zero');
		expect(normalGame?.clockSeconds).toBe(5100);  // 85 * 60
		expect(stoppageGame?.clockSeconds).toBe(5880); // (90 + 8) * 60
		expect(halfGame?.clockSeconds).toBe(2700);    // 45 * 60
		expect(zeroGame?.clockSeconds).toBe(0);       // 0 * 60
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
		(fallbackAway.team as Record<string, unknown>).alternateColor = 'still-not-a-color';
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
		expect(result.games.map(game => game.id).toSorted()).toEqual(['fallback-live', 'odds-variants']);

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
		expect(result.games.map(game => game.id).toSorted()).toEqual(['today-live', 'today-pre', 'upcoming-pre']);
		expect(result.games.some(game => game.status === 'post')).toBe(false);
	});

	test('adds NCAA basketball groups=50 query parameter', async () => {
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

		await fetchLeagueLogos(['ncaab']);

		const calledUrls = fetchMock.mock.calls.map(([url]) => String(url));
		expect(calledUrls).toHaveLength(2);
		expect(calledUrls[0]).toContain('groups=50');
		expect(calledUrls[1]).toContain('groups=50');
	});

	test('adds NCAA womens basketball groups=49 query parameter', async () => {
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

		await fetchLeagueLogos(['ncaaw']);

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
		expect(result.games.map(game => game.id).toSorted()).toEqual(['nba-live', 'nba-pre']);
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

	test('dates range query starts from today so morning pre-game events are not missed', async () => {
		const fetchMock = jest.fn().mockResolvedValue(createResponse({ events: [] }));
		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		const { fetchGamesWithLeagueLogos } = loadApiClient();

		await fetchGamesWithLeagueLogos(['nba']);

		const calledUrls = fetchMock.mock.calls.map(([url]) => String(url));
		const datesUrl = calledUrls.find(u => u.includes('dates='));
		expect(datesUrl).toBeDefined();

		const datesParam = new URL(datesUrl!).searchParams.get('dates')!;
		const [rangeStart] = datesParam.split('-');

		const todayUtc = new Date();
		const expectedToday = `${todayUtc.getUTCFullYear()}${String(todayUtc.getUTCMonth() + 1).padStart(2, '0')}${String(todayUtc.getUTCDate()).padStart(2, '0')}`;
		expect(rangeStart).toBe(expectedToday);
	});

	test('deduplicates events that appear in both default and dates responses', async () => {
		const sharedEvent = makeEvent({
			id: 'shared-live',
			state: 'in',
			period: 2,
			clock: '5:00',
			homeScore: '55',
			awayScore: '52',
		});

		const fetchMock = jest.fn()
			.mockResolvedValueOnce(createResponse({ events: [sharedEvent] }))
			.mockResolvedValueOnce(createResponse({
				events: [
					sharedEvent,
					makeEvent({
						id: 'dates-only-pre',
						state: 'pre',
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
		expect(result.games.map(g => g.id).toSorted()).toEqual(['dates-only-pre', 'shared-live']);
		expect(result.games.filter(g => g.id === 'shared-live')).toHaveLength(1);
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

	test('soccer finished game with odds: [null] does not discard valid events in same response', async () => {
		// ESPN returns null as an array element (not null for the array itself) for finished soccer games.
		// Without EspnCompetitionOddsSchema.nullable() on array elements, Zod rejects the whole
		// response and drops every event — including valid pre-game events. Regression test for that fix.
		const postGame = makeEvent({
			id: 'post-null-odds',
			state: 'post',
			period: 2,
			clock: "90'",
			homeScore: '1',
			awayScore: '0',
		});
		getCompetition(postGame).odds = [null];

		const preGame = makeEvent({
			id: 'pre-valid',
			state: 'scheduled',
			period: 1,
			clock: "0'",
			homeScore: '0',
			awayScore: '0',
		});

		const fetchMock = jest.fn().mockResolvedValue(createResponse({
			events: [postGame, preGame],
		}));
		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		const { fetchGamesWithLeagueLogos } = loadApiClient();

		const result = await fetchGamesWithLeagueLogos(['mls'], { includeUpcoming: false });
		// post game filtered out, pre game must survive despite the null odds on its companion
		expect(result.games.map(g => g.id)).toEqual(['pre-valid']);
		expect(result.games[0]!.status).toBe('pre');
	});

	test('FIFAWC opening-day scenario: multiple finished games with odds: [null] do not hide upcoming matches', async () => {
		// Reproduces the June 11 2026 bug: ESPN today endpoint returned RSA vs MEX and CZE vs KOR,
		// both finished with odds: [null]. Zod failed the whole response, dropping CZE vs KOR entirely
		// even though that game was scheduled for 22:00 ET and should have appeared as upcoming.
		const rsa_mex = makeEvent({ id: 'rsa-mex', state: 'post', period: 2, clock: "90'", homeScore: '0', awayScore: '2' });
		getCompetition(rsa_mex).odds = [null];

		const cze_kor = makeEvent({ id: 'cze-kor', state: 'pre', period: 1, clock: "0'", homeScore: '0', awayScore: '0',
			date: '2026-06-12T02:00:00.000Z' });
		getCompetition(cze_kor).odds = [null];

		const fetchMock = jest.fn().mockResolvedValue(createResponse({
			events: [rsa_mex, cze_kor],
		}));
		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		const { fetchGamesWithLeagueLogos } = loadApiClient();

		const result = await fetchGamesWithLeagueLogos(['fifawc'], { includeUpcoming: false });
		expect(result.games.map(g => g.id)).toEqual(['cze-kor']);
		expect(result.games[0]!.status).toBe('pre');
		expect(result.games[0]!.startTime).toBe('2026-06-12T02:00:00.000Z');
	});

	test('null odds element pattern applies consistently across all three soccer leagues', async () => {
		// MLS, EPL, and FIFAWC all return odds: [null] for finished games. Verify each league
		// correctly surfaces a valid pre-game event even when paired with a null-odds post game.
		const soccerLeagues = ['mls', 'epl', 'fifawc'] as const;
		for (const league of soccerLeagues) {
			const post = makeEvent({ id: 'post', state: 'post', period: 2, clock: "90'", homeScore: '1', awayScore: '0' });
			getCompetition(post).odds = [null];
			const pre = makeEvent({ id: 'pre', state: 'pre', period: 1, clock: "0'", homeScore: '0', awayScore: '0' });

			const fetchMock = jest.fn().mockResolvedValue(createResponse({ events: [post, pre] }));
			(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
			const { fetchGamesWithLeagueLogos } = loadApiClient();

			const result = await fetchGamesWithLeagueLogos([league], { includeUpcoming: false });
			expect(result.games.map(g => g.id)).toEqual(['pre']);
		}
	});

	test('NFL preseason rich odds object with extra fields parses cleanly', async () => {
		// During preseason / before NFL season starts, ESPN returns a much richer odds object than
		// in-season. It includes spread, awayTeamOdds, homeTeamOdds, moneyline, pointSpread, total,
		// link, header, footer. These extra fields are not in EspnCompetitionOddsSchema. Zod's default
		// behavior (non-strict) should silently ignore them — this test locks in that behavior.
		const event = makeEvent({
			id: 'nfl-pre-rich-odds',
			state: 'pre',
			period: 1,
			clock: '0:00',
			homeScore: '0',
			awayScore: '0',
			withOdds: false,
		});
		getCompetition(event).odds = [{
			details: 'SEA -3.5',
			overUnder: 44.5,
			provider: {
				name: 'DraftKings',
				displayName: 'DraftKings',
				logos: [{ href: 'https://cdn.dk.com/dark.png', rel: ['dark'] }],
			},
			// Extra fields that appear in ESPN's NFL preseason data
			spread: -3.5,
			awayTeamOdds: { favorite: false, underdog: true },
			homeTeamOdds: { favorite: true, underdog: false },
			moneyline: { displayName: 'Moneyline', shortDisplayName: 'ML' },
			pointSpread: { displayName: 'Spread' },
			total: { displayName: 'Total' },
			link: 'https://sportsbook.draftkings.com/event/34118042',
			header: 'DraftKings',
			footer: 'footer text',
		}];

		const fetchMock = jest.fn().mockResolvedValue(createResponse({ events: [event] }));
		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		const { fetchGamesWithLeagueLogos } = loadApiClient();

		const result = await fetchGamesWithLeagueLogos(['nfl'], { includeUpcoming: false });
		expect(result.games).toHaveLength(1);
		expect(result.games[0]!.id).toBe('nfl-pre-rich-odds');
		expect(result.games[0]!.odds).toMatchObject({
			details: 'SEA -3.5',
			overUnder: 44.5,
		});
	});

	// ────────────────────────────────────────────────────────────────────────────
	// Per-league full pipeline tests — one test per league proving the Game object
	// is correct end-to-end for each sport type and range/today endpoint pattern.
	// Fixture shapes are derived from live ESPN API responses for each league.
	// ────────────────────────────────────────────────────────────────────────────

	test('NHL: live game with END_PERIOD intermission flag is correctly set', async () => {
		const fetchMock = jest.fn().mockResolvedValue(createResponse({
			leagues: [{ logos: [{ href: 'https://cdn.example/nhl-logo.png' }] }],
			events: [makeEvent({
				id: 'nhl-live',
				state: 'in',
				statusName: 'END_PERIOD',
				period: 2,
				clock: '0:00',
				homeScore: '2',
				awayScore: '1',
			})],
		}));
		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		const { fetchGamesWithLeagueLogos } = loadApiClient();

		const result = await fetchGamesWithLeagueLogos(['nhl'], { includeUpcoming: false });
		expect(result.games).toHaveLength(1);
		const game = result.games[0]!;
		expect(game.sportType).toBe('hockey');
		expect(game.league).toBe('nhl');
		expect(game.status).toBe('in');
		expect(game.period).toBe(2);
		expect(game.intermission).toBe(true);
		expect(game.homeTeam.score).toBe(2);
		expect(game.awayTeam.score).toBe(1);
		expect(game.startTime).toBeUndefined();
	});

	test('NHL: pre-game from range has correct hockey sportType and startTime', async () => {
		const fetchMock = jest.fn()
			.mockResolvedValueOnce(createResponse({ events: [] }))
			.mockResolvedValueOnce(createResponse({
				leagues: [{ logos: [{ href: 'https://cdn.example/nhl-logo.png' }] }],
				events: [makeEvent({
					id: 'nhl-pre-range',
					state: 'pre',
					period: 1,
					clock: '0:00',
					homeScore: '0',
					awayScore: '0',
					date: '2026-10-10T00:00:00.000Z',
				})],
			}));
		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		const { fetchGamesWithLeagueLogos } = loadApiClient();

		const result = await fetchGamesWithLeagueLogos(['nhl']);
		expect(result.games).toHaveLength(1);
		const game = result.games[0]!;
		expect(game.sportType).toBe('hockey');
		expect(game.league).toBe('nhl');
		expect(game.status).toBe('pre');
		expect(game.startTime).toBe('2026-10-10T00:00:00.000Z');
		expect(game.intermission).toBe(false);
		expect(game.topOfInning).toBeUndefined();
		expect(game.baseRunners).toBeUndefined();
	});

	test('MLB: pre-game from range has no topOfInning or baseRunners', async () => {
		// topOfInning and baseRunners are only meaningful for live baseball games.
		// Pre-game events must not have these fields set.
		const fetchMock = jest.fn()
			.mockResolvedValueOnce(createResponse({ events: [] }))
			.mockResolvedValueOnce(createResponse({
				events: [makeEvent({
					id: 'mlb-pre-range',
					state: 'pre',
					period: 1,
					clock: '0:00',
					homeScore: '0',
					awayScore: '0',
					date: '2026-06-14T23:10:00.000Z',
				})],
			}));
		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		const { fetchGamesWithLeagueLogos } = loadApiClient();

		const result = await fetchGamesWithLeagueLogos(['mlb']);
		expect(result.games).toHaveLength(1);
		const game = result.games[0]!;
		expect(game.sportType).toBe('baseball');
		expect(game.league).toBe('mlb');
		expect(game.status).toBe('pre');
		expect(game.startTime).toBe('2026-06-14T23:10:00.000Z');
		expect(game.topOfInning).toBeUndefined();
		expect(game.baseRunners).toBeUndefined();
	});

	test('NFL: preseason game from range with rich spread odds produces valid Game', async () => {
		// NFL preseason range endpoint returns games with a rich odds object:
		// spread, awayTeamOdds, homeTeamOdds, moneyline, etc. Validates the full pipeline.
		const event = makeEvent({
			id: 'nfl-pre-range',
			state: 'pre',
			period: 0,
			clock: '0:00',
			homeScore: '0',
			awayScore: '0',
			date: '2026-08-07T00:00:00.000Z',
			withOdds: false,
		});
		getCompetition(event).odds = [{
			details: 'CAR -1.5',
			overUnder: 35.5,
			provider: { name: 'DraftKings', logos: [{ href: 'https://cdn.dk.com/dark.png', rel: ['dark'] }, { href: 'https://cdn.dk.com/light.png', rel: ['light'] }] },
			spread: -1.5,
			awayTeamOdds: { favorite: false },
			homeTeamOdds: { favorite: true },
			moneyline: { displayName: 'Moneyline' },
			pointSpread: { displayName: 'Spread' },
		}];

		const fetchMock = jest.fn()
			.mockResolvedValueOnce(createResponse({ events: [] }))
			.mockResolvedValueOnce(createResponse({ events: [event] }));
		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		const { fetchGamesWithLeagueLogos } = loadApiClient();

		const result = await fetchGamesWithLeagueLogos(['nfl']);
		expect(result.games).toHaveLength(1);
		const game = result.games[0]!;
		expect(game.sportType).toBe('football');
		expect(game.league).toBe('nfl');
		expect(game.status).toBe('pre');
		expect(game.startTime).toBe('2026-08-07T00:00:00.000Z');
		expect(game.odds).toMatchObject({ details: 'CAR -1.5', overUnder: 35.5 });
		expect(game.topOfInning).toBeUndefined();
		expect(game.baseRunners).toBeUndefined();
	});

	test('NCAAF: preseason game from range produces correct football sportType Game', async () => {
		const fetchMock = jest.fn()
			.mockResolvedValueOnce(createResponse({ events: [] }))
			.mockResolvedValueOnce(createResponse({
				events: [makeEvent({
					id: 'ncaaf-pre-range',
					state: 'pre',
					period: 0,
					clock: '0:00',
					homeScore: '0',
					awayScore: '0',
					date: '2026-08-29T00:00:00.000Z',
				})],
			}));
		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		const { fetchGamesWithLeagueLogos } = loadApiClient();

		const result = await fetchGamesWithLeagueLogos(['ncaaf']);
		expect(result.games).toHaveLength(1);
		const game = result.games[0]!;
		expect(game.sportType).toBe('football');
		expect(game.league).toBe('ncaaf');
		expect(game.status).toBe('pre');
		expect(game.startTime).toBe('2026-08-29T00:00:00.000Z');
	});

	test('WNBA: large batch from range all produce valid Game objects with correct fields', async () => {
		// WNBA has 81 pre-games in a 30-day range during its active summer season.
		// Verifies the pipeline handles large batches and all Games pass required field checks.
		const events = Array.from({ length: 10 }, (_, i) => makeEvent({
			id: `wnba-pre-${i}`,
			state: 'pre',
			period: 1,
			clock: '0:00',
			homeScore: '0',
			awayScore: '0',
			date: `2026-07-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`,
		}));

		const fetchMock = jest.fn()
			.mockResolvedValueOnce(createResponse({ events: [] }))
			.mockResolvedValueOnce(createResponse({ events }));
		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		const { fetchGamesWithLeagueLogos } = loadApiClient();

		const result = await fetchGamesWithLeagueLogos(['wnba']);
		expect(result.games).toHaveLength(10);
		for (const game of result.games) {
			expect(game.sportType).toBe('basketball');
			expect(game.league).toBe('wnba');
			expect(game.status).toBe('pre');
			expect(game.startTime).toBeDefined();
			expect(game.homeTeam.id).toBeTruthy();
			expect(game.awayTeam.id).toBeTruthy();
			expect(typeof game.homeTeam.score).toBe('number');
			expect(typeof game.awayTeam.score).toBe('number');
		}
	});

	test('MLS: in-season live game from today returned when range endpoint is empty', async () => {
		// MLS does not publish far-ahead schedule on ESPN's range endpoint.
		// The extension must still surface live MLS games from the no-date today endpoint.
		const liveGame = makeEvent({
			id: 'mls-live',
			state: 'in',
			period: 2,
			clock: "67'",
			homeScore: '1',
			awayScore: '0',
		});

		const fetchMock = jest.fn()
			.mockResolvedValueOnce(createResponse({ events: [liveGame] }))
			.mockResolvedValueOnce(createResponse({ events: [] }));
		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		const { fetchGamesWithLeagueLogos } = loadApiClient();

		const result = await fetchGamesWithLeagueLogos(['mls']);
		expect(result.games).toHaveLength(1);
		const game = result.games[0]!;
		expect(game.sportType).toBe('soccer');
		expect(game.league).toBe('mls');
		expect(game.status).toBe('in');
		expect(game.clockSeconds).toBe(67 * 60);
		expect(game.startTime).toBeUndefined();
	});

	test('EPL: in-season live game from today returned when range endpoint is empty', async () => {
		const liveGame = makeEvent({
			id: 'epl-live',
			state: 'in',
			period: 1,
			clock: "33'",
			homeScore: '0',
			awayScore: '1',
		});

		const fetchMock = jest.fn()
			.mockResolvedValueOnce(createResponse({ events: [liveGame] }))
			.mockResolvedValueOnce(createResponse({ events: [] }));
		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		const { fetchGamesWithLeagueLogos } = loadApiClient();

		const result = await fetchGamesWithLeagueLogos(['epl']);
		expect(result.games).toHaveLength(1);
		const game = result.games[0]!;
		expect(game.sportType).toBe('soccer');
		expect(game.league).toBe('epl');
		expect(game.status).toBe('in');
		expect(game.clockSeconds).toBe(33 * 60);
		expect(game.startTime).toBeUndefined();
	});

	test('soccer: HALFTIME status name sets intermission=true', async () => {
		// The popup uses game.intermission to show "HALFTIME" badges.
		// Verifies that the regex /HALFTIME|END_PERIOD|INTERMISSION/i fires on all three patterns.
		for (const statusName of ['HALFTIME', 'STATUS_HALFTIME', 'END_PERIOD', 'INTERMISSION']) {
			const game = makeEvent({ id: 'soccer-break', state: 'in', statusName, period: 1, clock: "45'", homeScore: '1', awayScore: '0' });
			const fetchMock = jest.fn().mockResolvedValue(createResponse({ events: [game] }));
			(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
			const { fetchGamesWithLeagueLogos } = loadApiClient();

			const result = await fetchGamesWithLeagueLogos(['mls'], { includeUpcoming: false });
			expect(result.games[0]!.intermission).toBe(true);
		}
	});

	test('FIFAWC: knockout-round placeholder with null odds from range appears as upcoming', async () => {
		// Knockout round games ("2A @ 2B") have odds: [null] on ESPN's range endpoint before
		// opponents are determined. These must survive as valid pre-games so the full bracket
		// shows in the popup's "Up Next" section.
		const knockout = makeEvent({
			id: 'ko-r16',
			state: 'pre',
			period: 1,
			clock: "0'",
			homeScore: '0',
			awayScore: '0',
			date: '2026-06-28T19:00:00.000Z',
		});
		const comp = getCompetition(knockout);
		(comp.competitors as Record<string, unknown>[])[0]!.team = { displayName: 'Group A 2nd Place', abbreviation: '2A' };
		(comp.competitors as Record<string, unknown>[])[1]!.team = { displayName: 'Group B 2nd Place', abbreviation: '2B' };
		comp.odds = [null];

		const fetchMock = jest.fn()
			.mockResolvedValueOnce(createResponse({ events: [] }))
			.mockResolvedValueOnce(createResponse({ events: [knockout] }));
		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		const { fetchGamesWithLeagueLogos } = loadApiClient();

		const result = await fetchGamesWithLeagueLogos(['fifawc']);
		expect(result.games).toHaveLength(1);
		const game = result.games[0]!;
		expect(game.sportType).toBe('soccer');
		expect(game.status).toBe('pre');
		expect(game.startTime).toBe('2026-06-28T19:00:00.000Z');
		expect(game.odds).toBeUndefined();
		expect(game.homeTeam.name).toBe('Group A 2nd Place');
		expect(game.homeTeam.abbreviation).toBe('2A');
	});

	test('FIFAWC: group stage pre-game with rich soccer odds parses details and overUnder correctly', async () => {
		// Group stage games have extra soccer-specific odds fields: drawOdds, total, pointSpread,
		// moneyline. These are unknown to EspnCompetitionOddsSchema but must not cause failures.
		const groupGame = makeEvent({
			id: 'group-bih-can',
			state: 'pre',
			period: 1,
			clock: "0'",
			homeScore: '0',
			awayScore: '0',
			date: '2026-06-12T19:00:00.000Z',
			withOdds: false,
		});
		getCompetition(groupGame).odds = [{
			details: 'CAN -120',
			overUnder: 2.5,
			provider: { name: 'DraftKings', logos: [{ href: 'https://cdn.dk.com/dark.png', rel: ['dark'] }, { href: 'https://cdn.dk.com/light.png', rel: ['light'] }] },
			drawOdds: { moneyLine: 250 },
			total: { displayName: 'Total' },
			pointSpread: { displayName: 'Spread' },
			moneyline: { displayName: 'Moneyline' },
		}];

		const fetchMock = jest.fn()
			.mockResolvedValueOnce(createResponse({ events: [] }))
			.mockResolvedValueOnce(createResponse({ events: [groupGame] }));
		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		const { fetchGamesWithLeagueLogos } = loadApiClient();

		const result = await fetchGamesWithLeagueLogos(['fifawc']);
		expect(result.games).toHaveLength(1);
		const game = result.games[0]!;
		expect(game.odds).toMatchObject({ details: 'CAN -120', overUnder: 2.5 });
		expect(game.odds?.provider?.name).toBe('DraftKings');
	});

	test('FIFAWC: range batch mixing knockout (null odds) and group stage (real odds) returns all', async () => {
		const ko1 = makeEvent({ id: 'ko-1', state: 'pre', period: 1, clock: "0'", homeScore: '0', awayScore: '0', date: '2026-06-28T19:00:00.000Z' });
		getCompetition(ko1).odds = [null];
		const ko2 = makeEvent({ id: 'ko-2', state: 'pre', period: 1, clock: "0'", homeScore: '0', awayScore: '0', date: '2026-06-29T17:00:00.000Z' });
		getCompetition(ko2).odds = [null];
		const group = makeEvent({ id: 'group-1', state: 'pre', period: 1, clock: "0'", homeScore: '0', awayScore: '0', date: '2026-06-12T19:00:00.000Z', withOdds: false });

		const fetchMock = jest.fn()
			.mockResolvedValueOnce(createResponse({ events: [] }))
			.mockResolvedValueOnce(createResponse({ events: [ko1, ko2, group] }));
		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		const { fetchGamesWithLeagueLogos } = loadApiClient();

		const result = await fetchGamesWithLeagueLogos(['fifawc']);
		expect(result.games.map(g => g.id).toSorted()).toEqual(['group-1', 'ko-1', 'ko-2']);
		expect(result.games.find(g => g.id === 'ko-1')!.odds).toBeUndefined();
		expect(result.games.find(g => g.id === 'ko-2')!.odds).toBeUndefined();
		expect(result.games.every(g => g.status === 'pre')).toBe(true);
		expect(result.games.every(g => !!g.startTime)).toBe(true);
	});

	test('NCAAB: off-season returns 0 games gracefully without error or crash', async () => {
		const fetchMock = jest.fn().mockResolvedValue(createResponse({ events: [] }));
		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		const { fetchGamesWithLeagueLogos } = loadApiClient();

		const result = await fetchGamesWithLeagueLogos(['ncaab']);
		expect(result.games).toHaveLength(0);
		expect(result.leagueLogos.ncaab).toBeDefined();
	});

	test('all leagues: pre-game startTime is defined, live game startTime is undefined', async () => {
		// parseEvent only sets startTime when status === 'pre'. This test locks that contract
		// so a refactor can't accidentally set startTime on live games (which breaks the popup's
		// "Up Next" vs "Live Now" distinction).
		const preGame = makeEvent({ id: 'pre', state: 'pre', period: 1, clock: '0:00', homeScore: '0', awayScore: '0', date: '2026-09-01T00:00:00.000Z' });
		const liveGame = makeEvent({ id: 'live', state: 'in', period: 3, clock: '5:00', homeScore: '88', awayScore: '85' });

		const fetchMock = jest.fn()
			.mockResolvedValueOnce(createResponse({ events: [liveGame] }))
			.mockResolvedValueOnce(createResponse({ events: [preGame] }));
		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		const { fetchGamesWithLeagueLogos } = loadApiClient();

		const result = await fetchGamesWithLeagueLogos(['nba']);
		const pre = result.games.find(g => g.id === 'pre')!;
		const live = result.games.find(g => g.id === 'live')!;
		expect(pre.startTime).toBe('2026-09-01T00:00:00.000Z');
		expect(live.startTime).toBeUndefined();
	});

	describe('BSO (balls/strikes/outs) parsing', () => {
		test('populates bso for a live MLB game with full situation', async () => {
			const fetchMock = jest.fn().mockResolvedValue(createResponse({
				events: [makeEvent({ id: 'mlb-bso', state: 'in', period: 7, clock: '0:00', homeScore: '3', awayScore: '2', situation: { balls: 2, strikes: 1, outs: 1 } })],
			}));
			(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
			const { fetchGamesWithLeagueLogos } = loadApiClient();
			const result = await fetchGamesWithLeagueLogos(['mlb'], { includeUpcoming: false });
			expect(result.games.find(g => g.id === 'mlb-bso')?.bso).toEqual({ balls: 2, strikes: 1, outs: 1 });
		});

		test('defaults strikes and outs to 0 when only balls is in situation', async () => {
			const fetchMock = jest.fn().mockResolvedValue(createResponse({
				events: [makeEvent({ id: 'mlb-partial', state: 'in', period: 3, clock: '0:00', homeScore: '0', awayScore: '0', situation: { balls: 3 } })],
			}));
			(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
			const { fetchGamesWithLeagueLogos } = loadApiClient();
			const result = await fetchGamesWithLeagueLogos(['mlb'], { includeUpcoming: false });
			expect(result.games.find(g => g.id === 'mlb-partial')?.bso).toEqual({ balls: 3, strikes: 0, outs: 0 });
		});

		test('leaves bso undefined when situation has no balls field', async () => {
			const fetchMock = jest.fn().mockResolvedValue(createResponse({
				events: [makeEvent({ id: 'mlb-no-bso', state: 'in', period: 5, clock: '0:00', homeScore: '1', awayScore: '0', situation: { onFirst: true } })],
			}));
			(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
			const { fetchGamesWithLeagueLogos } = loadApiClient();
			const result = await fetchGamesWithLeagueLogos(['mlb'], { includeUpcoming: false });
			expect(result.games.find(g => g.id === 'mlb-no-bso')?.bso).toBeUndefined();
		});

		test('leaves bso undefined for a pre-game MLB event', async () => {
			const fetchMock = jest.fn().mockResolvedValue(createResponse({
				events: [makeEvent({ id: 'mlb-pre', state: 'scheduled', period: 1, clock: '0:00', homeScore: '0', awayScore: '0', situation: { balls: 1, strikes: 0, outs: 0 } })],
			}));
			(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
			const { fetchGamesWithLeagueLogos } = loadApiClient();
			const result = await fetchGamesWithLeagueLogos(['mlb'], { includeUpcoming: false });
			const game = result.games.find(g => g.id === 'mlb-pre');
			expect(game?.status).toBe('pre');
			expect(game?.bso).toBeUndefined();
		});

		test('leaves bso undefined for a live non-baseball game even with BSO situation', async () => {
			const fetchMock = jest.fn().mockResolvedValue(createResponse({
				events: [makeEvent({ id: 'nba-bso', state: 'in', period: 3, clock: '5:00', homeScore: '80', awayScore: '78', situation: { balls: 2, strikes: 1, outs: 0 } })],
			}));
			(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
			const { fetchGamesWithLeagueLogos } = loadApiClient();
			const result = await fetchGamesWithLeagueLogos(['nba'], { includeUpcoming: false });
			expect(result.games.find(g => g.id === 'nba-bso')?.bso).toBeUndefined();
		});
	});

	describe('downDistance parsing', () => {
		test('builds down/distance string for a live NFL game', async () => {
			const fetchMock = jest.fn().mockResolvedValue(createResponse({
				events: [makeEvent({ id: 'nfl-dd', state: 'in', period: 3, clock: '7:32', homeScore: '17', awayScore: '14', situation: { down: 2, distance: 8 } })],
			}));
			(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
			const { fetchGamesWithLeagueLogos } = loadApiClient();
			const result = await fetchGamesWithLeagueLogos(['nfl'], { includeUpcoming: false });
			expect(result.games.find(g => g.id === 'nfl-dd')?.downDistance).toBe('2nd & 8');
		});

		test('prefers shortDownDistanceText over computed down/distance', async () => {
			const fetchMock = jest.fn().mockResolvedValue(createResponse({
				events: [makeEvent({ id: 'nfl-short', state: 'in', period: 4, clock: '0:28', homeScore: '24', awayScore: '21', situation: { down: 3, distance: 2, shortDownDistanceText: '3rd & 2' } })],
			}));
			(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
			const { fetchGamesWithLeagueLogos } = loadApiClient();
			const result = await fetchGamesWithLeagueLogos(['nfl'], { includeUpcoming: false });
			expect(result.games.find(g => g.id === 'nfl-short')?.downDistance).toBe('3rd & 2');
		});

		test('returns "Nth & Goal" when distance is 0 or negative', async () => {
			const fetchMock = jest.fn().mockResolvedValue(createResponse({
				events: [makeEvent({ id: 'nfl-goal', state: 'in', period: 1, clock: '12:00', homeScore: '0', awayScore: '0', situation: { down: 3, distance: 0 } })],
			}));
			(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
			const { fetchGamesWithLeagueLogos } = loadApiClient();
			const result = await fetchGamesWithLeagueLogos(['nfl'], { includeUpcoming: false });
			expect(result.games.find(g => g.id === 'nfl-goal')?.downDistance).toBe('3rd & Goal');
		});

		test('returns undefined when down is 0 (between-play state)', async () => {
			const fetchMock = jest.fn().mockResolvedValue(createResponse({
				events: [makeEvent({ id: 'nfl-d0', state: 'in', period: 2, clock: '6:00', homeScore: '7', awayScore: '3', situation: { down: 0, distance: 10 } })],
			}));
			(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
			const { fetchGamesWithLeagueLogos } = loadApiClient();
			const result = await fetchGamesWithLeagueLogos(['nfl'], { includeUpcoming: false });
			expect(result.games.find(g => g.id === 'nfl-d0')?.downDistance).toBeUndefined();
		});

		test('returns undefined when down is out of range (> 4)', async () => {
			const fetchMock = jest.fn().mockResolvedValue(createResponse({
				events: [makeEvent({ id: 'nfl-d5', state: 'in', period: 2, clock: '6:00', homeScore: '7', awayScore: '3', situation: { down: 5, distance: 10 } })],
			}));
			(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
			const { fetchGamesWithLeagueLogos } = loadApiClient();
			const result = await fetchGamesWithLeagueLogos(['nfl'], { includeUpcoming: false });
			expect(result.games.find(g => g.id === 'nfl-d5')?.downDistance).toBeUndefined();
		});

		test('returns undefined for a pre-game NFL event', async () => {
			const fetchMock = jest.fn().mockResolvedValue(createResponse({
				events: [makeEvent({ id: 'nfl-pre', state: 'scheduled', period: 1, clock: '0:00', homeScore: '0', awayScore: '0', situation: { down: 1, distance: 10 } })],
			}));
			(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
			const { fetchGamesWithLeagueLogos } = loadApiClient();
			const result = await fetchGamesWithLeagueLogos(['nfl'], { includeUpcoming: false });
			const game = result.games.find(g => g.id === 'nfl-pre');
			expect(game?.status).toBe('pre');
			expect(game?.downDistance).toBeUndefined();
		});

		test('returns undefined for a live non-football game', async () => {
			const fetchMock = jest.fn().mockResolvedValue(createResponse({
				events: [makeEvent({ id: 'mls-dd', state: 'in', period: 2, clock: '5:00', homeScore: '1', awayScore: '0', situation: { down: 2, distance: 5 } })],
			}));
			(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
			const { fetchGamesWithLeagueLogos } = loadApiClient();
			const result = await fetchGamesWithLeagueLogos(['mls'], { includeUpcoming: false });
			expect(result.games.find(g => g.id === 'mls-dd')?.downDistance).toBeUndefined();
		});

		test('builds all four ordinal downs correctly', async () => {
			const makeNfl = (id: string, down: number, distance: number) => makeEvent({ id, state: 'in', period: 2, clock: '8:00', homeScore: '7', awayScore: '7', situation: { down, distance } });
			const fetchMock = jest.fn().mockResolvedValue(createResponse({
				events: [makeNfl('d1', 1, 10), makeNfl('d2', 2, 7), makeNfl('d3', 3, 4), makeNfl('d4', 4, 1)],
			}));
			(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
			const { fetchGamesWithLeagueLogos } = loadApiClient();
			const result = await fetchGamesWithLeagueLogos(['nfl'], { includeUpcoming: false });
			expect(result.games.find(g => g.id === 'd1')?.downDistance).toBe('1st & 10');
			expect(result.games.find(g => g.id === 'd2')?.downDistance).toBe('2nd & 7');
			expect(result.games.find(g => g.id === 'd3')?.downDistance).toBe('3rd & 4');
			expect(result.games.find(g => g.id === 'd4')?.downDistance).toBe('4th & 1');
		});
	});

	// down/distance/isGoalToGo feed the red-zone boost's down weighting, so they have to survive
	// the shapes ESPN actually sends rather than only the tidy one.
	describe('gridiron down, distance and goal-to-go', () => {
		const parseNfl = async (situation: Record<string, unknown> | undefined, state = 'in') => {
			const fetchMock = jest.fn().mockResolvedValue(createResponse({
				events: [makeEvent({ id: 'n1', state, period: 2, clock: '8:00', homeScore: '7', awayScore: '7', situation })],
			}));
			(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
			const { fetchGamesWithLeagueLogos } = loadApiClient();
			const result = await fetchGamesWithLeagueLogos(['nfl'], { includeUpcoming: false });
			return result.games.find(g => g.id === 'n1');
		};

		test('carries down and distance through', async () => {
			const game = await parseNfl({ down: 3, distance: 7 });
			expect(game?.down).toBe(3);
			expect(game?.distance).toBe(7);
			expect(game?.isGoalToGo).toBe(false);
		});

		test("reads goal-to-go off ESPN's own label", async () => {
			const game = await parseNfl({ down: 4, distance: 1, shortDownDistanceText: '4th & Goal' });
			expect(game?.isGoalToGo).toBe(true);
		});

		test('treats a missing or zero distance on a live down as goal-to-go', async () => {
			expect((await parseNfl({ down: 1 }))?.isGoalToGo).toBe(true);
			expect((await parseNfl({ down: 2, distance: 0 }))?.isGoalToGo).toBe(true);
		});

		test('reports nothing when there is no situation or the game is not live', async () => {
			const noSituation = await parseNfl(undefined);
			expect(noSituation?.down).toBeUndefined();
			expect(noSituation?.isGoalToGo).toBeUndefined();
			const notLive = await parseNfl({ down: 4, distance: 1 }, 'pre');
			expect(notLive?.down).toBeUndefined();
		});

		test('does not attach gridiron fields to non-football leagues', async () => {
			const fetchMock = jest.fn().mockResolvedValue(createResponse({
				events: [makeEvent({ id: 'b1', state: 'in', period: 5, clock: '0:00', homeScore: '2', awayScore: '1', situation: { onFirst: true } })],
			}));
			(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
			const { fetchGamesWithLeagueLogos } = loadApiClient();
			const result = await fetchGamesWithLeagueLogos(['mlb'], { includeUpcoming: false });
			expect(result.games.find(g => g.id === 'b1')?.isGoalToGo).toBeUndefined();
		});
	});

	describe('isPostseason', () => {
		const fetchWith = (events: Record<string, unknown>[]) => {
			const fetchMock = jest.fn().mockResolvedValue(createResponse({ events }));
			(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
			return loadApiClient();
		};

		test('sets isPostseason true when season.type is 3', async () => {
			const { fetchGamesWithLeagueLogos } = fetchWith([
				makeEvent({ id: 'playoff-game', state: 'in', period: 2, clock: '5:00', homeScore: '3', awayScore: '2', season: { year: 2026, type: 3, slug: 'post-season' } }),
			]);
			const result = await fetchGamesWithLeagueLogos(['nba'], { includeUpcoming: false });
			expect(result.games.find(g => g.id === 'playoff-game')?.isPostseason).toBe(true);
		});

		test('sets isPostseason false when season.type is 2 (regular season)', async () => {
			const { fetchGamesWithLeagueLogos } = fetchWith([
				makeEvent({ id: 'reg-game', state: 'in', period: 2, clock: '5:00', homeScore: '3', awayScore: '2', season: { year: 2026, type: 2, slug: 'regular-season' } }),
			]);
			const result = await fetchGamesWithLeagueLogos(['nba'], { includeUpcoming: false });
			expect(result.games.find(g => g.id === 'reg-game')?.isPostseason).toBe(false);
		});

		test('sets isPostseason false when season field is absent', async () => {
			const { fetchGamesWithLeagueLogos } = fetchWith([
				makeEvent({ id: 'no-season', state: 'in', period: 1, clock: '10:00', homeScore: '0', awayScore: '0' }),
			]);
			const result = await fetchGamesWithLeagueLogos(['nba'], { includeUpcoming: false });
			expect(result.games.find(g => g.id === 'no-season')?.isPostseason).toBe(false);
		});

		test('sets isPostseason false when season.type is 1 (preseason)', async () => {
			const { fetchGamesWithLeagueLogos } = fetchWith([
				makeEvent({ id: 'pre-season', state: 'in', period: 1, clock: '10:00', homeScore: '0', awayScore: '0', season: { year: 2025, type: 1, slug: 'pre-season' } }),
			]);
			const result = await fetchGamesWithLeagueLogos(['nba'], { includeUpcoming: false });
			expect(result.games.find(g => g.id === 'pre-season')?.isPostseason).toBe(false);
		});

		// season.type === 3 is an NFL/NBA/MLB/NHL/NCAA convention only. Every season/slug pair
		// below is a real payload verified against ESPN's API, not an invented shape — these
		// competitions use a per-tournament type id that is never 3, so slug is the only signal.
		describe('competitions where season.type is never 3', () => {
			const expectPostseason = async (
				league: Parameters<Awaited<ReturnType<typeof loadApiClient>>['fetchGamesWithLeagueLogos']>[0][number],
				season: Record<string, unknown>,
				expected: boolean,
			) => {
				const { fetchGamesWithLeagueLogos } = fetchWith([
					makeEvent({ id: 'e1', state: 'in', period: 2, clock: '60:00', homeScore: '1', awayScore: '1', season }),
				]);
				const result = await fetchGamesWithLeagueLogos([league], { includeUpcoming: false });
				expect(result.games.find(g => g.id === 'e1')?.isPostseason).toBe(expected);
			};

			test('World Cup: knockout rounds are postseason, group stage is not', async () => {
				await expectPostseason('fifawc', { year: 2022, type: 10948, slug: 'final' }, true);
				await expectPostseason('fifawc', { year: 2022, type: 10952, slug: 'round-of-16' }, true);
				await expectPostseason('fifawc', { year: 2022, type: 10949, slug: '3rd-place-match' }, true);
				await expectPostseason('fifawc', { year: 2022, type: 10953, slug: 'group-stage' }, false);
			});

			test("Women's World Cup uses 3rd-place, not the men's 3rd-place-match", async () => {
				await expectPostseason('fifawwc', { year: 2023, type: 10633, slug: '3rd-place' }, true);
				await expectPostseason('fifawwc', { year: 2023, type: 10632, slug: 'final' }, true);
			});

			test('UCL/UEL: the 2024-25 knockout-round-playoffs counts, the league phase does not', async () => {
				await expectPostseason('ucl', { year: 2024, type: 12886, slug: 'knockout-round-playoffs' }, true);
				await expectPostseason('ucl', { year: 2024, type: 12884, slug: 'round-of-16' }, true);
				await expectPostseason('ucl', { year: 2023, type: 12082, slug: 'final' }, true);
				await expectPostseason('uel', { year: 2024, type: 12886, slug: 'league-phase' }, false);
			});

			test('Liga MX Liguilla and MLS/NWSL playoffs match on their per-tournament slugs', async () => {
				await expectPostseason('ligamx', { year: 2023, type: 11826, slug: 'apertura-2023---finals' }, true);
				await expectPostseason('ligamx', { year: 2023, type: 11800, slug: 'torneo-apertura' }, false);
				await expectPostseason('mls', { year: 2023, type: 12188, slug: 'mls-cup' }, true);
				await expectPostseason('nwsl', { year: 2023, type: 11666, slug: 'playoffs--quarterfinals' }, true);
			});

			test('WBC hyphenates semi-finals and pluralizes finals', async () => {
				await expectPostseason('wbbc', { year: 2023, type: 5, slug: 'semi-finals' }, true);
				await expectPostseason('wbbc', { year: 2023, type: 6, slug: 'finals' }, true);
				await expectPostseason('wbbc', { year: 2023, type: 2, slug: '1st-round' }, false);
			});

			test('domestic leagues have no postseason and their season-long slugs must not match', async () => {
				await expectPostseason('epl', { year: 2023, type: 11864, slug: '2023-24-english-premier-league' }, false);
				await expectPostseason('laliga', { year: 2023, type: 11865, slug: '2023-24-laliga' }, false);
			});
		});

		// The Olympics report `type: 2, slug: 'regular-season'` for every game including the Gold
		// Medal Game — verified against the 2024 Paris basketball and 2026 Milano-Cortina hockey
		// payloads. The round exists only in competition.notes[0].headline.
		describe('Olympic medal rounds, where slug is useless', () => {
			const olympicGame = (id: string, headline?: string) => makeEvent({
				id,
				state: 'in',
				period: 3,
				clock: '5:00',
				homeScore: '70',
				awayScore: '68',
				season: { year: 2024, type: 2, slug: 'regular-season' },
				...(headline !== undefined && { notes: [{ headline }] }),
			});

			const isPostseason = async (event: Record<string, unknown>, league: 'olybkm' | 'olymih' | 'nba') => {
				const { fetchGamesWithLeagueLogos } = fetchWith([event]);
				const result = await fetchGamesWithLeagueLogos([league], { includeUpcoming: false });
				return result.games[0]?.isPostseason;
			};

			test('detects the gold and bronze medal games and the semifinal', async () => {
				expect(await isPostseason(olympicGame('g', "2024 Olympic Men's Basketball - Gold Medal Game"), 'olybkm')).toBe(true);
				expect(await isPostseason(olympicGame('b', "2024 Olympic Men's Basketball - Bronze Medal Game"), 'olybkm')).toBe(true);
				expect(await isPostseason(olympicGame('s', "2024 Olympic Men's Basketball - Semifinal"), 'olybkm')).toBe(true);
				expect(await isPostseason(olympicGame('q', "2024 Olympic Men's Basketball - Quarterfinal"), 'olybkm')).toBe(true);
				expect(await isPostseason(olympicGame('h', 'Milano Cortina 2026 Men\'s Hockey - Gold Medal Game'), 'olymih')).toBe(true);
			});

			test('leaves group-stage games alone', async () => {
				expect(await isPostseason(olympicGame('grp', "2024 Olympic Men's Basketball - Group C"), 'olybkm')).toBe(false);
				expect(await isPostseason(olympicGame('none'), 'olybkm')).toBe(false);
			});

			// The headline check is deliberately scoped to the Olympic leagues: it is free-text
			// editorial copy, and matching it everywhere would sweep in regular-season bracket
			// events like college basketball's November invitationals.
			test('does not apply the headline heuristic to non-Olympic leagues', async () => {
				expect(await isPostseason(olympicGame('nba1', 'Some Invitational - Semifinal'), 'nba')).toBe(false);
			});
		});
	});

	describe('penalty shootout score', () => {
		test('parses shootoutScore onto both teams when ESPN supplies it', async () => {
			const fetchMock = jest.fn().mockResolvedValue(createResponse({
				events: [makeEvent({
					id: 'pens',
					state: 'in',
					period: 5,
					clock: "120'",
					homeScore: '1',
					awayScore: '1',
					homeShootoutScore: 5,
					awayShootoutScore: 3,
				})],
			}));
			(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
			const { fetchGamesWithLeagueLogos } = loadApiClient();
			const result = await fetchGamesWithLeagueLogos(['ucl'], { includeUpcoming: false });
			const game = result.games.find(g => g.id === 'pens');
			// The 120-minute scoreline stays put; the shootout rides alongside it.
			expect(game?.homeTeam.score).toBe(1);
			expect(game?.awayTeam.score).toBe(1);
			expect(game?.homeTeam.shootoutScore).toBe(5);
			expect(game?.awayTeam.shootoutScore).toBe(3);
		});

		test('leaves shootoutScore undefined for every match that never reached one', async () => {
			const fetchMock = jest.fn().mockResolvedValue(createResponse({
				events: [makeEvent({ id: 'normal', state: 'in', period: 2, clock: "60'", homeScore: '2', awayScore: '0' })],
			}));
			(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
			const { fetchGamesWithLeagueLogos } = loadApiClient();
			const result = await fetchGamesWithLeagueLogos(['ucl'], { includeUpcoming: false });
			expect(result.games.find(g => g.id === 'normal')?.homeTeam.shootoutScore).toBeUndefined();
		});
	});
});
