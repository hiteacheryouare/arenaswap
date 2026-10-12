import { fetchConferenceDirectory } from '../src/collegeConferences';

const core = 'http://sports.core.api.espn.com/v2/sports';

const abs = (path: string) => `http://sports.core.api.espn.com${path}`;

const ok = (data: unknown): Response => ({ ok: true, status: 200, json: async () => data } as Response);

const refs = (...urls: string[]) => ({ count: urls.length, items: urls.map($ref => ({ $ref })) });

// Answers by path, ignoring the query, the way the real API ignores `lang` and `region`.
const routeFetch = (routes: Record<string, unknown>) => {
	const fetchMock = jest.fn().mockImplementation(async (url: string) => {
		const { pathname } = new URL(url);
		const body = routes[pathname];
		if (body === undefined) return { ok: false, status: 404, json: async () => ({}) } as Response;
		return ok(body);
	});
	(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
	return fetchMock;
};

describe('fetchConferenceDirectory', () => {
	test('football lists conferences under FBS and FCS, and places every team in its division', async () => {
		const base = '/v2/sports/football/leagues/college-football';
		const groups = `${base}/seasons/2026/types/2/groups`;
		const fetchMock = routeFetch({
			[base]: { season: { year: 2026 } },
			[`${groups}/80/children`]: refs(`${core}/football/leagues/college-football/seasons/2026/types/2/groups/8`),
			[`${groups}/81/children`]: refs(`${core}/football/leagues/college-football/seasons/2026/types/2/groups/177`),
			[`${groups}/8`]: {
				id: '8',
				name: 'Southeastern Conference',
				shortName: 'SEC',
				logos: [{ href: 'https://a.espncdn.com/i/teamlogos/ncaa_conf/500/sec.png' }],
			},
			[`${groups}/177`]: { id: '177', name: 'United Athletic Conference', shortName: 'UAC' },
			[`${groups}/80/teams`]: refs(`${core}/football/leagues/college-football/seasons/2026/teams/333?lang=en`),
			[`${groups}/81/teams`]: refs(`${core}/football/leagues/college-football/seasons/2026/teams/149?lang=en`),
		});

		const directory = await fetchConferenceDirectory('ncaaf');

		expect(directory.seasonYear).toBe(2026);
		expect(directory.conferences).toEqual([
			{ id: '8', name: 'Southeastern Conference', shortName: 'SEC', divisionKey: '80', crestSlug: 'sec' },
			{ id: '177', name: 'United Athletic Conference', shortName: 'UAC', divisionKey: '81', crestSlug: undefined },
		]);
		expect(directory.teamDivision).toEqual({ 333: '80', 149: '81' });
		expect(directory.teamConference).toEqual({});
		// Refs arrive as http; nothing may be fetched that way from an extension page.
		expect(fetchMock.mock.calls.every(([url]) => String(url).startsWith('https://'))).toBe(true);
	});

	test('baseball walks down from Division I and reads teams off standings, since it lists none', async () => {
		const base = '/v2/sports/baseball/leagues/college-baseball';
		const groups = `${base}/seasons/2026/types/2/groups`;
		routeFetch({
			[base]: { season: { year: 2026 } },
			[groups]: refs(abs(`${groups}/26`)),
			[`${groups}/26`]: { id: '26', name: 'NCAA Division I', children: { $ref: abs(`${groups}/26/children`) } },
			[`${groups}/26/children`]: refs(abs(`${groups}/58`), abs(`${groups}/52`)),
			[`${groups}/58`]: { id: '58', name: 'American Athletic Conference', shortName: 'American', standings: { $ref: abs(`${groups}/58/standings`) } },
			[`${groups}/58/standings`]: refs(abs(`${groups}/58/standings/0`)),
			[`${groups}/58/standings/0`]: { standings: [{ team: { $ref: abs(`${base}/seasons/2026/teams/151`) } }, { team: { $ref: abs(`${base}/seasons/2026/teams/2655`) } }] },
			// An empty table comes back with no `standings` at all.
			[`${groups}/52`]: { id: '52', name: 'Metro Atlantic Athletic Conference', shortName: 'Metro', standings: { $ref: abs(`${groups}/52/standings`) } },
			[`${groups}/52/standings`]: refs(abs(`${groups}/52/standings/0`)),
			[`${groups}/52/standings/0`]: { id: '0', name: 'overall' },
		});

		const directory = await fetchConferenceDirectory('cbase');

		expect(directory.conferences.map(conference => [conference.shortName, conference.divisionKey, conference.crestSlug])).toEqual([
			['American', 'd1', 'american'],
			['Metro', 'd1', 'maac'],
		]);
		expect(directory.teamConference).toEqual({ 151: '58', 2655: '58' });
	});

	test('a request that fails sinks the whole directory rather than leaving holes in it', async () => {
		const base = '/v2/sports/hockey/leagues/mens-college-hockey';
		routeFetch({ [base]: { season: { year: 2027 } } });
		await expect(fetchConferenceDirectory('ncaamh')).rejects.toThrow('HTTP 404');
	});
});
