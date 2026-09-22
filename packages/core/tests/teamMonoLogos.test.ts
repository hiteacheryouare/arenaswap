import type { LeagueId } from '../src/types';

/* The single-colour team marks. The scoreboard carries one logo per competitor and no variants, so
   any surface that wants the white one has to ask `/teams` — and none of this had coverage.

   The failure here is cosmetic rather than dangerous: a missing mark falls back to a tinted disc,
   which is the state every team outside North America is in anyway. What is worth pinning is that
   it degrades that way instead of throwing, and that the host check is the single point where all
   of it would silently go dark at once. */

const createResponse = (data: unknown, init: { ok?: boolean; status?: number } = {}): Response => ({
	ok: init.ok ?? true,
	status: init.status ?? 200,
	headers: new Headers(),
	json: async () => data,
} as Response);

const loadApiClient = (): typeof import('../src/apiClient') => {
	jest.resetModules();
	return require('../src/apiClient') as typeof import('../src/apiClient');
};

const espnHref = (name: string) => `https://a.espncdn.com/i/teamlogos/nba/500/${name}.png`;

const teamsPayload = (teams: unknown[]) => ({ sports: [{ leagues: [{ teams }] }] });

const teamRow = (id: string, logos: unknown[]) => ({ team: { id, displayName: `Team ${id}`, logos } });

describe('resizing a mark through ESPN\'s own combiner', () => {
	test('rewrites a 4096px source to the size the bar actually draws', () => {
		expect(loadApiClient().monoLogoUrl(espnHref('det'), 120))
			.toBe('https://a.espncdn.com/combiner/i?img=/i/teamlogos/nba/500/det.png&w=120&h=120');
	});

	/* The one line that could take every mark in the product out at once. It is a prefix check
	   against a hard-coded host, so the day ESPN serves artwork from anywhere else, every team in
	   every league falls back to the tinted disc together — quietly, because a missing mark is a
	   supported state rather than an error. */
	test('refuses a host that is not ESPN\'s image CDN, which is all-or-nothing', () => {
		expect(loadApiClient().monoLogoUrl('https://cdn.example.com/i/det.png', 120)).toBeUndefined();
		expect(loadApiClient().monoLogoUrl('https://a.espncdn.com.evil.test/i/det.png', 120)).toBeUndefined();
	});

	test('an absent href is absent rather than a broken URL', () => {
		expect(loadApiClient().monoLogoUrl(undefined, 120)).toBeUndefined();
	});
});

describe('picking the white and black marks out of a team\'s logo list', () => {
	test('takes both when ESPN has drawn both', () => {
		const marks = loadApiClient().monoMarksFromLogos([
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
		const marks = loadApiClient().monoMarksFromLogos([{ href: espnHref('det-white'), rel: ['primary_logo_white'] }]);

		expect(Object.keys(marks ?? {})).toEqual(['white']);
	});

	test('answers null when the team has only its ordinary colour logo', () => {
		expect(loadApiClient().monoMarksFromLogos([{ href: espnHref('det'), rel: ['default'] }])).toBeNull();
	});

	test('answers null for a team with no logos at all rather than an empty object', () => {
		// The caller keys a map on a non-null answer, so the difference decides whether the team
		// gets an entry that promises artwork it does not have.
		expect(loadApiClient().monoMarksFromLogos(undefined)).toBeNull();
		expect(loadApiClient().monoMarksFromLogos([])).toBeNull();
	});

	test('a mark ESPN hosts elsewhere is skipped without taking its sibling with it', () => {
		const marks = loadApiClient().monoMarksFromLogos([
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
		return { fetchMock, api: loadApiClient() };
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
		// Deliberately the opposite of fetchTeamsForLeagues, which throws when every league fails.
		// Artwork has a fallback and a team picker does not.
		const { api } = mockFetch(() => createResponse({}, { ok: false, status: 403 }));

		expect(await api.fetchTeamMonoLogos(['nba', 'nhl'] as LeagueId[])).toEqual({});
	});
});
