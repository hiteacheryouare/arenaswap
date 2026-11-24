import type { LeagueId } from '@arenaswap/core';

const createResponse = (data: unknown, init: { ok?: boolean; status?: number } = {}): Response => ({
	ok: init.ok ?? true,
	status: init.status ?? 200,
	headers: new Headers(),
	json: async () => data,
} as Response);

const loadTeamLogos = (): typeof import('../src/teamLogos') => {
	jest.resetModules();
	return require('../src/teamLogos') as typeof import('../src/teamLogos');
};

const espnHref = (name: string) => `https://a.espncdn.com/i/teamlogos/nba/500/${name}.png`;

const teamsPayload = (teams: unknown[]) => ({ sports: [{ leagues: [{ teams }] }] });

const teamRow = (id: string, logos: unknown[]) => ({ team: { id, displayName: `Team ${id}`, logos } });

describe('resizing a mark through ESPN\'s own combiner', () => {
	test('rewrites a 4096px source to the size the bar actually draws', () => {
		expect(loadTeamLogos().monoLogoUrl(espnHref('det'), 120))
			.toBe('https://a.espncdn.com/combiner/i?img=/i/teamlogos/nba/500/det.png&w=120&h=120');
	});

	test('refuses a host that is not ESPN\'s image CDN, which is all-or-nothing', () => {
		expect(loadTeamLogos().monoLogoUrl('https://cdn.example.com/i/det.png', 120)).toBeUndefined();
		expect(loadTeamLogos().monoLogoUrl('https://a.espncdn.com.evil.test/i/det.png', 120)).toBeUndefined();
	});

	test('an absent href is absent rather than a broken URL', () => {
		expect(loadTeamLogos().monoLogoUrl(undefined, 120)).toBeUndefined();
	});
});

describe('picking the white and black marks out of a team\'s logo list', () => {
	test('takes both when ESPN has drawn both', () => {
		const marks = loadTeamLogos().monoMarksFromLogos([
			{ href: espnHref('det'), rel: ['full', 'default'] },
			{ href: espnHref('det-white'), rel: ['full', 'primary_logo_white'] },
			{ href: espnHref('det-black'), rel: ['full', 'primary_logo_black'] },
		]);

		expect(marks).toEqual({
			white: 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/nba/500/det-white.png&w=120&h=120',
			black: 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/nba/500/det-black.png&w=120&h=120',
		});
	});

	test('takes the one it has rather than insisting on the pair', () => {
		const marks = loadTeamLogos().monoMarksFromLogos([{ href: espnHref('det-white'), rel: ['primary_logo_white'] }]);

		expect(Object.keys(marks ?? {})).toEqual(['white']);
	});

	test('answers null when the team has only its ordinary colour logo', () => {
		expect(loadTeamLogos().monoMarksFromLogos([{ href: espnHref('det'), rel: ['default'] }])).toBeNull();
	});

	test('answers null for a team with no logos at all rather than an empty object', () => {
		expect(loadTeamLogos().monoMarksFromLogos(undefined)).toBeNull();
		expect(loadTeamLogos().monoMarksFromLogos([])).toBeNull();
	});

	test('a mark ESPN hosts elsewhere is skipped without taking its sibling with it', () => {
		const marks = loadTeamLogos().monoMarksFromLogos([
			{ href: 'https://elsewhere.test/det-white.png', rel: ['primary_logo_white'] },
			{ href: espnHref('det-black'), rel: ['primary_logo_black'] },
		]);

		expect(Object.keys(marks ?? {})).toEqual(['black']);
	});
});

describe('fetching a whole league\'s marks', () => {
	const mockFetch = (handler: (url: string) => Response | Promise<Response>) => {
		const fetchMock = jest.fn(async (input: RequestInfo | URL) => handler(String(input)));
		(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
		return { fetchMock, api: loadTeamLogos() };
	};

	test('keys the league\'s teams by id', async () => {
		const { api } = mockFetch(() => createResponse(teamsPayload([
			teamRow('19', [{ href: espnHref('det-white'), rel: ['primary_logo_white'] }]),
			teamRow('25', [{ href: espnHref('bos-white'), rel: ['primary_logo_white'] }]),
		])));

		const marks = await api.fetchTeamMonoLogos(['nba'] as LeagueId[]);

		expect(Object.keys(marks.nba ?? {})).toEqual(['19', '25']);
	});

	test('honours the size the caller asked for', async () => {
		const { api } = mockFetch(() => createResponse(teamsPayload([
			teamRow('19', [{ href: espnHref('det-white'), rel: ['primary_logo_white'] }]),
		])));

		const marks = await api.fetchTeamMonoLogos(['nba'] as LeagueId[], 48);

		expect(marks.nba?.['19']?.white).toContain('w=48&h=48');
	});

	test('a league ESPN refuses drops out and the others still land', async () => {
		const { api } = mockFetch(url => (
			url.includes('/nhl/')
				? createResponse({}, { ok: false, status: 403 })
				: createResponse(teamsPayload([teamRow('19', [{ href: espnHref('det-white'), rel: ['primary_logo_white'] }])]))
		));

		const marks = await api.fetchTeamMonoLogos(['nba', 'nhl'] as LeagueId[]);

		expect(Object.keys(marks)).toEqual(['nba']);
	});

	test('a league whose teams have no marks gets no entry rather than an empty one', async () => {
		const { api } = mockFetch(() => createResponse(teamsPayload([
			teamRow('19', [{ href: espnHref('det'), rel: ['default'] }]),
		])));

		expect(await api.fetchTeamMonoLogos(['nba'] as LeagueId[])).toEqual({});
	});

	test('asks nothing and answers empty for a league we do not ship', async () => {
		const { fetchMock, api } = mockFetch(() => createResponse({}));

		expect(await api.fetchTeamMonoLogos(['quidditch'] as unknown as LeagueId[])).toEqual({});
		expect(fetchMock).not.toHaveBeenCalled();
	});

	test('every league failing is an empty map rather than a throw', async () => {
		const { api } = mockFetch(() => createResponse({}, { ok: false, status: 403 }));

		expect(await api.fetchTeamMonoLogos(['nba', 'nhl'] as LeagueId[])).toEqual({});
	});
});
