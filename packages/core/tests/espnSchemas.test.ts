import { parseScoreboard, parseTeams } from '../src/espnSchemas';

const makeEvent = (id: string, overrides: Record<string, unknown> = {}) => ({
	id,
	competitions: [{
		competitors: [
			{ id: `h${id}`, homeAway: 'home', score: '5', team: { displayName: `Home ${id}` } },
			{ id: `a${id}`, homeAway: 'away', score: '4', team: { displayName: `Away ${id}` } },
		],
		status: { period: 1, type: { state: 'in' } },
	}],
	...overrides,
});

const withCompetitor = (id: string, competitor: Record<string, unknown>) => {
	const event = makeEvent(id);
	event.competitions[0]!.competitors[0] = competitor as never;
	return event;
};

describe('parseScoreboard', () => {
	test('keeps every event in a healthy payload', () => {
		const result = parseScoreboard({ events: [makeEvent('1'), makeEvent('2')] });
		expect(result.events.map(e => e.id)).toEqual(['1', '2']);
		expect(result.droppedEvents).toBe(0);
	});

	// The whole reason parsing is per-event: rejecting the array as a unit blanks out the league.
	test('drops only the malformed event, not the whole league', () => {
		const good = Array.from({ length: 199 }, (_, i) => makeEvent(`g${i}`));
		const bad = withCompetitor('bad', { id: 'x', homeAway: 'home', team: {} });

		const result = parseScoreboard({ events: [...good, bad] });

		expect(result.events).toHaveLength(199);
		expect(result.droppedEvents).toBe(1);
		expect(result.events.some(e => e.id === 'bad')).toBe(false);
	});

	test('accepts numeric scores and ids, normalizing them to strings', () => {
		const numeric = withCompetitor('n1', { id: 42, homeAway: 'home', score: 7, team: { displayName: 'Home' } });

		const result = parseScoreboard({ events: [numeric] });

		expect(result.droppedEvents).toBe(0);
		const competitor = result.events[0]!.competitions[0]!.competitors[0]!;
		expect(competitor.id).toBe('42');
		expect(competitor.score).toBe('7');
	});

	test('survives a malformed leagues block without losing events', () => {
		const result = parseScoreboard({ events: [makeEvent('1')], leagues: 'not-an-array' });
		expect(result.events).toHaveLength(1);
		expect(result.leagues).toEqual([]);
	});

	test('returns an empty result for a payload that is not an object', () => {
		expect(parseScoreboard('nope')).toEqual({ events: [], leagues: [], droppedEvents: 0 });
		expect(parseScoreboard(null)).toEqual({ events: [], leagues: [], droppedEvents: 0 });
	});
});

const makeTeamRow = (id: string) => ({
	team: { id, displayName: `Team ${id}`, abbreviation: id.toUpperCase() },
});

const wrapTeams = (teams: unknown[]) => ({ sports: [{ leagues: [{ teams }] }] });

describe('parseTeams', () => {
	test('keeps every team in a healthy payload', () => {
		const result = parseTeams(wrapTeams([makeTeamRow('a'), makeTeamRow('b')]));
		expect(result.teams.map(t => t.team.id)).toEqual(['a', 'b']);
		expect(result.droppedTeams).toBe(0);
	});

	// The whole reason parsing is per-team: rejecting the array as a unit left the onboarding picker
	// with nothing to offer for that league, and nothing in the console to explain it.
	test('drops only the malformed team, not the whole league', () => {
		const good = Array.from({ length: 25 }, (_, i) => makeTeamRow(`g${i}`));
		const bad = { team: { id: 'bad' } };

		const result = parseTeams(wrapTeams([...good, bad]));

		expect(result.teams).toHaveLength(25);
		expect(result.droppedTeams).toBe(1);
		expect(result.teams.some(t => t.team.id === 'bad')).toBe(false);
	});

	test('returns an empty result when the league carries no teams array', () => {
		expect(parseTeams({ sports: [{ leagues: [{}] }] })).toEqual({ teams: [], droppedTeams: 0 });
	});

	test('returns an empty result for a payload that is not an object', () => {
		expect(parseTeams('nope')).toEqual({ teams: [], droppedTeams: 0 });
		expect(parseTeams(null)).toEqual({ teams: [], droppedTeams: 0 });
	});
	describe('the per-competitor blocks only some sports send', () => {
		test('keeps probables, records and leaders through the parse', () => {
			const event = withCompetitor('rich', {
				id: 'h1',
				homeAway: 'home',
				score: '0',
				team: { displayName: 'Home' },
				probables: [{ name: 'probableStartingPitcher', athlete: { shortName: 'D. Peterson' }, record: '(7-7, 5.17)' }],
				records: [{ type: 'total', summary: '76-58' }],
				leaders: [{ name: 'homeRuns', shortDisplayName: 'HR', leaders: [{ displayValue: '33', athlete: { shortName: 'J. Soto' } }] }],
			});

			const competitor = parseScoreboard({ events: [event] }).events[0]?.competitions[0]?.competitors[0];

			expect(competitor?.probables?.[0]?.record).toBe('(7-7, 5.17)');
			expect(competitor?.records?.[0]?.summary).toBe('76-58');
			expect(competitor?.leaders?.[0]?.leaders?.[0]?.displayValue).toBe('33');
		});

		// Cricket returns a `$ref` string where every other sport returns an array. Not a league we
		// ship, but adding one must not be able to take the event down with it.
		test('survives leaders arriving as a $ref string instead of an array', () => {
			const event = withCompetitor('ref', {
				id: 'h1',
				homeAway: 'home',
				score: '0',
				team: { displayName: 'Home' },
				leaders: 'http://sports.core.api.espn.com/v2/leaders?lang=en',
			});

			const result = parseScoreboard({ events: [event] });

			expect(result.droppedEvents).toBe(0);
			expect(result.events[0]?.competitions[0]?.competitors[0]?.leaders).toEqual([]);
		});

		test('coerces a jersey number sent as a number rather than a string', () => {
			const event = withCompetitor('jersey', {
				id: 'h1',
				homeAway: 'home',
				score: '0',
				team: { displayName: 'Home' },
				probables: [{ name: 'probableStartingGoalie', athlete: { shortName: 'C. Ellis', jersey: 92 } }],
			});

			const competitor = parseScoreboard({ events: [event] }).events[0]?.competitions[0]?.competitors[0];

			expect(competitor?.probables?.[0]?.athlete?.jersey).toBe('92');
		});
	});
});
