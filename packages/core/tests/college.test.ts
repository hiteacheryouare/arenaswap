import {
	collegeFetchGroups,
	conferenceCrestSlug,
	defaultCollegeFilter,
	filterCollegeGames,
	isConferenceCovered,
	needsConferenceDirectory,
	normalizeCollegeFilters,
	passesCollegeFilter,
	readCollegeBracket,
	resolveConferenceCrest,
	withCollegeFilter,
} from '../src/college';
import { normalizeUserPreferences } from '../src/constants';
import type { CollegeFilter, ConferenceDirectory, Game, LeagueId, Team } from '../src/types';

const team = (id: string, extra: Partial<Team> = {}): Team => ({ id, name: id, abbreviation: id, score: 0, ...extra });

const game = (league: LeagueId, home: Partial<Team> & { id: string }, away: Partial<Team> & { id: string }, extra: Partial<Game> = {}): Game => ({
	id: `${league}-${home.id}-${away.id}`,
	league,
	sportType: 'football',
	homeTeam: team(home.id, home),
	awayTeam: team(away.id, away),
	period: 1,
	clockSeconds: 0,
	status: 'in',
	...extra,
});

const filter = (partial: Partial<CollegeFilter>): CollegeFilter => ({ divisions: [], conferences: [], ranked: false, titleRounds: false, ...partial });

const footballDirectory: ConferenceDirectory = {
	leagueId: 'ncaaf',
	seasonYear: 2026,
	conferences: [
		{ id: '8', name: 'Southeastern Conference', shortName: 'SEC', divisionKey: '80', crestSlug: 'sec' },
		{ id: '20', name: 'Big Sky Conference', shortName: 'Big Sky', divisionKey: '81', crestSlug: 'big_sky' },
	],
	teamConference: {},
	teamDivision: { alabama: '80', montana: '81' },
	fetchedAt: 0,
};

const baseballDirectory: ConferenceDirectory = {
	leagueId: 'cbase',
	seasonYear: 2026,
	conferences: [{ id: '58', name: 'American Athletic Conference', shortName: 'American', divisionKey: 'd1', crestSlug: 'american' }],
	teamConference: { ecu: '58', tulane: '58' },
	teamDivision: {},
	fetchedAt: 0,
};

describe('college filter preferences', () => {
	test('stores only the leagues someone changed', () => {
		expect(normalizeCollegeFilters({
			ncaaf: { divisions: ['80'], conferences: [], ranked: false },
			ncaab: { divisions: [], conferences: ['23', '23', 7, ''], ranked: true },
			nba: { divisions: ['50'], conferences: [], ranked: true },
		})).toEqual({
			ncaab: { divisions: [], conferences: ['23'], ranked: true, titleRounds: true },
		});
	});

	test('drops divisions a league does not have', () => {
		expect(normalizeCollegeFilters({ ncaab: { divisions: ['80', '50'], conferences: [], ranked: 'yes' } })).toEqual({});
		expect(normalizeCollegeFilters({ ncaaf: { divisions: ['81', 'd1'] } })).toEqual({
			ncaaf: { divisions: ['81'], conferences: [], ranked: false, titleRounds: true },
		});
	});

	test('survives junk, and prefs from before the setting existed', () => {
		expect(normalizeCollegeFilters('ncaaf')).toEqual({});
		expect(normalizeCollegeFilters([{ divisions: ['81'] }])).toEqual({});
		expect(normalizeUserPreferences({ enabledLeagues: ['ncaaf'] }).collegeFilters).toEqual({});
	});

	test('setting a league back to its default removes it', () => {
		const changed = withCollegeFilter({}, 'ncaaf', filter({ divisions: ['80', '81'] }));
		expect(changed).toEqual({ ncaaf: { divisions: ['80', '81'], conferences: [], ranked: false, titleRounds: false } });
		expect(withCollegeFilter(changed, 'ncaaf', defaultCollegeFilter('ncaaf'))).toEqual({});
	});
});

describe('which division scoreboards to fetch', () => {
	test('leagues with one division always ask for the same thing', () => {
		expect(collegeFetchGroups('ncaab', filter({}))).toEqual(['50']);
		expect(collegeFetchGroups('ncaaw')).toEqual(['50']);
		expect(collegeFetchGroups('ncaamh', filter({ conferences: ['52'] }))).toEqual([]);
		expect(collegeFetchGroups('nba')).toEqual([]);
	});

	test('football defaults to FBS, which is what the scoreboard returned before any filter', () => {
		expect(collegeFetchGroups('ncaaf')).toEqual(['80']);
		expect(collegeFetchGroups('ncaaf', defaultCollegeFilter('ncaaf'))).toEqual(['80']);
	});

	test('football fetches each division something picked could match', () => {
		expect(collegeFetchGroups('ncaaf', filter({ divisions: ['81', '58'] }))).toEqual(['81', '58']);
		expect(collegeFetchGroups('ncaaf', filter({ conferences: ['20'] }), footballDirectory)).toEqual(['81']);
		expect(collegeFetchGroups('ncaaf', filter({ ranked: true }))).toEqual(['80']);
		expect(collegeFetchGroups('ncaaf', filter({ divisions: ['80'] }), footballDirectory, ['montana'])).toEqual(['80', '81']);
	});

	test('a conference it cannot place fetches every division that has conferences', () => {
		expect(collegeFetchGroups('ncaaf', filter({ conferences: ['8'] }))).toEqual(['80', '81']);
	});

	test('nothing picked still polls the default scoreboard', () => {
		expect(collegeFetchGroups('ncaaf', filter({}))).toEqual(['80']);
	});
});

describe('passesCollegeFilter', () => {
	test('a division keeps every game that division returned, including cross-division ones', () => {
		const fcsOnly = filter({ divisions: ['81'] });
		expect(passesCollegeFilter(game('ncaaf', { id: 'a' }, { id: 'b' }, { collegeGroups: ['81'] }), fcsOnly, undefined, false)).toBe(true);
		expect(passesCollegeFilter(game('ncaaf', { id: 'a' }, { id: 'b' }, { collegeGroups: ['80', '81'] }), fcsOnly, undefined, false)).toBe(true);
		expect(passesCollegeFilter(game('ncaaf', { id: 'a' }, { id: 'b' }, { collegeGroups: ['80'] }), fcsOnly, undefined, false)).toBe(false);
	});

	test('a conference keeps a game if either team plays in it', () => {
		const secOnly = filter({ conferences: ['8'] });
		const secAtHome = game('ncaaf', { id: 'a', conferenceId: '8' }, { id: 'b', conferenceId: '1' }, { collegeGroups: ['80'] });
		const noSec = game('ncaaf', { id: 'a', conferenceId: '5' }, { id: 'b', conferenceId: '1' }, { collegeGroups: ['80'] });
		expect(passesCollegeFilter(secAtHome, secOnly, footballDirectory, false)).toBe(true);
		expect(passesCollegeFilter(noSec, secOnly, footballDirectory, false)).toBe(false);
	});

	test('Top 25 keeps a game with one ranked team', () => {
		const rankedOnly = filter({ ranked: true });
		expect(passesCollegeFilter(game('ncaab', { id: 'a', rank: 12 }, { id: 'b' }), rankedOnly, undefined, false)).toBe(true);
		expect(passesCollegeFilter(game('ncaab', { id: 'a' }, { id: 'b' }), rankedOnly, undefined, false)).toBe(false);
	});

	test('a favorite team gets through whatever is picked', () => {
		expect(passesCollegeFilter(game('ncaaf', { id: 'a' }, { id: 'b' }, { collegeGroups: ['58'] }), filter({}), undefined, true)).toBe(true);
	});

	test('nothing picked drops everything', () => {
		expect(passesCollegeFilter(game('ncaab', { id: 'a', rank: 1, conferenceId: '23' }, { id: 'b' }), filter({}), undefined, false)).toBe(false);
	});

	test('Division I on in a one-division league keeps everything', () => {
		expect(passesCollegeFilter(game('ncaamh', { id: 'a' }, { id: 'b' }), defaultCollegeFilter('ncaamh'), undefined, false)).toBe(true);
	});

	test('baseball reads conferences from the directory, with an Other bucket for the rest', () => {
		const american = filter({ conferences: ['58'] });
		const other = filter({ conferences: ['other'] });
		const ecuVsUnknown = game('cbase', { id: 'ecu' }, { id: 'mystery' });
		const twoUnknowns = game('cbase', { id: 'x' }, { id: 'y' });
		expect(passesCollegeFilter(ecuVsUnknown, american, baseballDirectory, false)).toBe(true);
		expect(passesCollegeFilter(twoUnknowns, american, baseballDirectory, false)).toBe(false);
		expect(passesCollegeFilter(twoUnknowns, other, baseballDirectory, false)).toBe(true);
	});

	test('without a directory, a conference filter in a league that needs one lets everything through', () => {
		expect(passesCollegeFilter(game('cbase', { id: 'x' }, { id: 'y' }), filter({ conferences: ['58'] }), undefined, false)).toBe(true);
		// Football carries its own conference ids, so it has no reason to give up.
		expect(passesCollegeFilter(game('ncaaf', { id: 'x', conferenceId: '1' }, { id: 'y' }), filter({ conferences: ['8'] }), undefined, false)).toBe(false);
	});

	test('filterCollegeGames leaves every other league alone and reads each league its own filter', () => {
		const games = [
			game('nfl', { id: 'kc' }, { id: 'buf' }),
			game('ncaaf', { id: 'a' }, { id: 'b' }, { collegeGroups: ['80'] }),
			game('ncaaf', { id: 'c' }, { id: 'd' }, { collegeGroups: ['81'] }),
			game('ncaab', { id: 'e' }, { id: 'f' }),
		];
		const kept = filterCollegeGames(games, { ncaaf: filter({ divisions: ['81'] }) }, {}, () => false);
		expect(kept.map(g => g.id)).toEqual(['nfl-kc-buf', 'ncaaf-c-d', 'ncaab-e-f']);
	});
});

describe('picker helpers', () => {
	test('a division covers its own conferences, and Division I covers all of them', () => {
		expect(isConferenceCovered('ncaaf', filter({ divisions: ['80'] }), '80')).toBe(true);
		expect(isConferenceCovered('ncaaf', filter({ divisions: ['80'] }), '81')).toBe(false);
		expect(isConferenceCovered('ncaab', defaultCollegeFilter('ncaab'), '50')).toBe(true);
		expect(isConferenceCovered('cbase', filter({}), 'd1')).toBe(false);
	});

	test('only asks for a directory when the filter cannot work without one', () => {
		expect(needsConferenceDirectory('ncaab', filter({ conferences: ['23'] }), true)).toBe(false);
		expect(needsConferenceDirectory('cbase', filter({ conferences: ['58'] }), false)).toBe(true);
		expect(needsConferenceDirectory('cbase', defaultCollegeFilter('cbase'), true)).toBe(false);
		expect(needsConferenceDirectory('ncaaf', defaultCollegeFilter('ncaaf'), false)).toBe(false);
		expect(needsConferenceDirectory('ncaaf', defaultCollegeFilter('ncaaf'), true)).toBe(true);
	});
});

describe('conference crests', () => {
	test('a crest is found by name, never by a non-football id', () => {
		// Basketball's SEC is 23 and its 8 is the Big 12, so the slug is what points at the right art.
		const slug = conferenceCrestSlug('ncaab', 'SEC', 'https://a.espncdn.com/i/teamlogos/ncaa_conf/500/sec.png');
		expect(slug).toBe('sec');
		expect(resolveConferenceCrest(slug, 'light')).toEqual({
			src: 'https://a.espncdn.com/i/teamlogos/ncaa_conf/500/8.png',
			fallbackSrc: 'https://a.espncdn.com/i/teamlogos/ncaa_conf/500/sec.png',
			drawnForDark: false,
		});
	});

	test('dark uses the art drawn for a dark ground where there is one', () => {
		expect(resolveConferenceCrest('big_ten', 'dark')).toMatchObject({
			src: 'https://a.espncdn.com/i/teamlogos/ncaa_conf/500-dark/5.png',
			drawnForDark: true,
		});
		expect(resolveConferenceCrest('ivy', 'dark')).toMatchObject({
			src: 'https://a.espncdn.com/i/teamlogos/ncaa_conf/500/22.png',
			drawnForDark: false,
		});
		expect(resolveConferenceCrest('west_coast', 'dark')).toEqual({
			src: 'https://a.espncdn.com/i/teamlogos/ncaa_conf/500/west_coast.png',
			drawnForDark: false,
		});
	});

	test('conferences without a logo borrow one by name, except where none exists', () => {
		expect(conferenceCrestSlug('cbase', 'Big 10')).toBe('big_ten');
		expect(conferenceCrestSlug('ncaamh', 'IND')).toBeUndefined();
		expect(resolveConferenceCrest(undefined, 'dark')).toEqual({ drawnForDark: false });
	});
});

describe('the title rounds', () => {
	test('read off the round headline, per sport', () => {
		expect(readCollegeBracket('ncaab', "NCAA Men's Basketball Championship - East Region - 1st Round")).toEqual({ collegeTitleRound: true, collegeSeeded: true });
		expect(readCollegeBracket('ncaab', "NCAA Men's Basketball Championship - West Region - First Four").collegeTitleRound).toBeUndefined();
		expect(readCollegeBracket('ncaab', 'NIT - 1st Round')).toEqual({});
		expect(readCollegeBracket('ncaaw', "NCAA Women's Basketball Championship - Regional 3 in Fort Worth - 1st Round").collegeTitleRound).toBeUndefined();
		expect(readCollegeBracket('ncaaw', "NCAA Women's Basketball Championship - Regional 1 in Fort Worth - Sweet 16").collegeTitleRound).toBe(true);
		expect(readCollegeBracket('ncaaw', "Women's NIT - 3rd Round")).toEqual({});
		expect(readCollegeBracket('ncaaf', 'College Football Playoff First Round Game')).toEqual({ collegeTitleRound: true, collegeSeeded: true });
		expect(readCollegeBracket('ncaaf', 'FCS Championship - Semifinals')).toEqual({});
		expect(readCollegeBracket('ncaaf', 'Pop-Tarts Bowl')).toEqual({});
		expect(readCollegeBracket('ncaamh', "NCAA Men's Hockey Championship - Albany Regional Semifinal").collegeTitleRound).toBe(true);
		expect(readCollegeBracket('cbase', "Men's College World Series - Elimination Game").collegeTitleRound).toBe(true);
		expect(readCollegeBracket('cbase', 'NCAA Baseball Championship - Athens Super Regional - Game 1')).toEqual({});
		expect(readCollegeBracket('csoft', "Women's College World Series - Finals - Game 1").collegeTitleRound).toBe(true);
		expect(readCollegeBracket('nba', 'NBA Finals - Game 1')).toEqual({});
	});

	test('get past a filter that would otherwise drop them, while the switch is on', () => {
		const bigTenOnly = filter({ conferences: ['7'] });
		const eliteEight = game('ncaab', { id: 'a', conferenceId: '2' }, { id: 'b', conferenceId: '8' }, { collegeTitleRound: true });
		expect(passesCollegeFilter(eliteEight, { ...bigTenOnly, titleRounds: true }, undefined, false)).toBe(true);
		expect(passesCollegeFilter(eliteEight, bigTenOnly, undefined, false)).toBe(false);
	});

	// In March the rank field holds the seed, and every team in the field has one.
	test('Top 25 ignores a seed, and still trusts a bowl\'s poll rank', () => {
		const rankedOnly = filter({ ranked: true });
		const sixteenSeeds = game('ncaab', { id: 'a', rank: 16 }, { id: 'b', rank: 1 }, { collegeSeeded: true });
		const rankedBowl = game('ncaaf', { id: 'a', rank: 12 }, { id: 'b', rank: 22 }, { collegeGroups: ['80'] });
		expect(passesCollegeFilter(sixteenSeeds, rankedOnly, undefined, false)).toBe(false);
		expect(passesCollegeFilter(rankedBowl, rankedOnly, undefined, false)).toBe(true);
	});

	test('are on by default, and a switched-off one is stored', () => {
		expect(defaultCollegeFilter('ncaab').titleRounds).toBe(true);
		expect(normalizeCollegeFilters({ ncaab: { divisions: ['50'], conferences: [], ranked: false, titleRounds: false } })).toEqual({
			ncaab: { divisions: ['50'], conferences: [], ranked: false, titleRounds: false },
		});
	});

	test('keep FBS on the fetch list for an FCS-only football filter, since the Playoff is FBS', () => {
		expect(collegeFetchGroups('ncaaf', filter({ divisions: ['81'], titleRounds: true }))).toEqual(['80', '81']);
		expect(collegeFetchGroups('ncaaf', filter({ divisions: ['81'] }))).toEqual(['81']);
	});
});
