import type { Game } from '../src/types';

const createResponse = (data: unknown): Response => ({
	ok: true,
	status: 200,
	headers: new Headers(),
	json: async () => data,
} as Response);

const scoreboardEvent = (id: string) => ({
	id,
	date: '2026-10-03T19:00:00.000Z',
	competitions: [{
		competitors: [
			{ id: `${id}-h`, homeAway: 'home', score: '7', team: { displayName: 'Home', abbreviation: 'HOM', conferenceId: '8' } },
			{ id: `${id}-a`, homeAway: 'away', score: '3', team: { displayName: 'Away', abbreviation: 'AWY', conferenceId: 20 } },
		],
		status: { period: 2, displayClock: '5:00', type: { state: 'in', name: 'STATUS_IN_PROGRESS' } },
	}],
});

const loadApiClient = (): typeof import('../src/apiClient') => {
	jest.resetModules();
	return require('../src/apiClient') as typeof import('../src/apiClient');
};

const idsOf = (games: Game[]): string[] => games.map(game => game.id);

const groupsOf = (fetchMock: jest.Mock): (string | null)[] => [...new Set(fetchMock.mock.calls
	.map(([url]) => new URL(String(url)).searchParams.get('groups')))];

describe('college division scoreboards', () => {
	test('football asks for FBS by default', async () => {
		const fetchMock = jest.fn().mockResolvedValue(createResponse({ events: [] }));
		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		await loadApiClient().fetchGamesWithLeagueLogos(['ncaaf'], { includeUpcoming: false });
		expect(groupsOf(fetchMock)).toEqual(['80']);
	});

	test('each division is its own request, and a game both return is listed once with both tags', async () => {
		const fetchMock = jest.fn().mockImplementation(async (url: string) => {
			const groups = new URL(url).searchParams.get('groups');
			return createResponse({ events: groups === '80' ? [scoreboardEvent('shared'), scoreboardEvent('fbs')] : [scoreboardEvent('shared'), scoreboardEvent('fcs')] });
		});
		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;

		const { games } = await loadApiClient().fetchGamesWithLeagueLogos(['ncaaf'], {
			includeUpcoming: false,
			groupsByLeague: { ncaaf: ['80', '81'] },
		});

		expect(groupsOf(fetchMock).toSorted()).toEqual(['80', '81']);
		const byId = Object.fromEntries(games.map(game => [game.id, game.collegeGroups]));
		expect(byId).toEqual({ shared: ['80', '81'], fbs: ['80'], fcs: ['81'] });
	});

	test('carries each team\'s conference, whatever type it arrives as', async () => {
		const fetchMock = jest.fn().mockResolvedValue(createResponse({ events: [scoreboardEvent('one')] }));
		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		const { games } = await loadApiClient().fetchGamesWithLeagueLogos(['ncaaf'], { includeUpcoming: false });
		expect(games[0]?.homeTeam.conferenceId).toBe('8');
		expect(games[0]?.awayTeam.conferenceId).toBe('20');
	});

	test('two divisions on the same day are cached apart', async () => {
		const fetchMock = jest.fn().mockImplementation(async (url: string) => (
			createResponse({ events: [scoreboardEvent(`only-${new URL(url).searchParams.get('groups')}`)] })
		));
		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		const client = loadApiClient();

		const fbs = await client.fetchGamesWithLeagueLogos(['ncaaf'], { upcomingDays: 3, groupsByLeague: { ncaaf: ['80'] } });
		const fcs = await client.fetchGamesWithLeagueLogos(['ncaaf'], { upcomingDays: 3, groupsByLeague: { ncaaf: ['81'] } });

		expect(idsOf(fbs.games)).toEqual(['only-80']);
		expect(idsOf(fcs.games)).toEqual(['only-81']);
	});
});
