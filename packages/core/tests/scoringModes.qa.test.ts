import { createDefaultUserPreferences, normalizeUserPreferences } from '../src/constants';
import { normalizeFantasyRoster, rosterInGame, fantasyRosterLimit } from '../src/fantasy';
import { modesInUse, resolveModeForGame } from '../src/scoringMode';
import { scoreLiveGame } from '../src/scoring';
import type { LiveScoringInput, ScoringPrefs } from '../src/scoring';
import type { Game, LeagueId, UserPreferences } from '../src/types';

const now = 5_000_000;

const game = (league: LeagueId, sportType: Game['sportType'], home: number, away: number, period: number, clockSeconds: number): Game => ({
	id: `${league}-game`,
	league,
	sportType,
	status: 'in',
	period,
	clockSeconds,
	homeTeam: { id: '11', name: 'Home', abbreviation: 'HOM', score: home },
	awayTeam: { id: '22', name: 'Away', abbreviation: 'AWY', score: away },
});

const rout = game('nba', 'basketball', 90, 58, 3, 300);
const nflOneScore = game('nfl', 'football', 17, 14, 4, 240);
const mlbTied = game('mlb', 'baseball', 3, 3, 8, 0);

const scoringPrefs = (prefs: Partial<UserPreferences>): UserPreferences => normalizeUserPreferences({ ...createDefaultUserPreferences(), ...prefs });

const score = (target: Game, prefs: ScoringPrefs, extras: LiveScoringInput['extras'] = {}) => (
	scoreLiveGame({ game: target, history: [], stallCount: 0, winProbability: [], now, extras }, prefs, 0)
);

describe('Custom scoring, one mode per league', () => {
	const custom = scoringPrefs({
		scoringMode: 'custom',
		leagueModes: { nba: 'blowouts', nfl: 'fantasy' },
		enabledLeagues: ['nba', 'nfl', 'mlb'] as LeagueId[],
	});

	test('scores each game in the mode its league was given, and the rest in Classic', () => {
		const receiver = { id: 'wr', name: 'Receiver', side: 'home' as const, position: 'WR' as const };
		expect(score(rout, custom).modeId).toBe('blowouts');
		expect(score(nflOneScore, custom, { fantasy: [receiver] }).modeId).toBe('fantasy');
		expect(score(mlbTied, custom).modeId).toBe('classic');
	});

	test('scores a Fantasy league\'s game as Classic when none of the user\'s players are in it', () => {
		const classic = scoringPrefs({ scoringMode: 'classic' });
		expect(score(nflOneScore, custom).modeId).toBe('classic');
		expect(score(nflOneScore, custom).total).toBe(score(nflOneScore, classic).total);
	});

	test('turns a rout into the best game on the slate only in the league that asked for routs', () => {
		const classic = scoringPrefs({ scoringMode: 'classic' });
		expect(score(rout, custom).total).toBeGreaterThan(score(rout, classic).total);
		expect(score(mlbTied, custom).total).toBe(score(mlbTied, classic).total);
	});

	test('lists only the modes an enabled league actually uses', () => {
		expect(modesInUse(custom)).toEqual(['classic', 'blowouts', 'fantasy']);
		expect(modesInUse({ ...custom, enabledLeagues: ['nba'] as LeagueId[] })).toEqual(['blowouts']);
		expect(modesInUse({ ...custom, scoringMode: 'fantasy' })).toEqual(['fantasy']);
	});

	test('ignores the per-league table unless Custom is chosen', () => {
		expect(resolveModeForGame({ scoringMode: 'blowouts', leagueModes: { nba: 'fantasy' } }, rout)).toBe('blowouts');
	});

	test('switches off a Blowouts signal only in Blowouts', () => {
		const prefs = scoringPrefs({ ...custom, modeDisabledSignals: { blowouts: ['timing'] } });
		expect(score(rout, prefs).signals.find(signal => signal.id === 'timing')?.points ?? 0).toBe(0);
		expect(score(rout, custom).signals.find(signal => signal.id === 'timing')?.points).toBeGreaterThan(0);
	});
});

describe('scoring settings read back from sync storage', () => {
	test('drops a league or a mode it does not know, keeping the rest of the table', () => {
		const prefs = normalizeUserPreferences({ scoringMode: 'custom', leagueModes: { nba: 'blowouts', xfl: 'classic', nfl: 'chaos' } });
		expect(prefs.scoringMode).toBe('custom');
		expect(prefs.leagueModes).toEqual({ nba: 'blowouts' });
	});

	test('falls back to Classic for a mode name from a future or past version', () => {
		expect(normalizeUserPreferences({ scoringMode: 'drama' }).scoringMode).toBe('classic');
	});

	test('will not store a list that switches every Blowouts signal off', () => {
		const prefs = normalizeUserPreferences({ modeDisabledSignals: { blowouts: ['blowoutMargin', 'sustained', 'timing', 'pileOn'], fantasy: ['exposure', 'renamedSignal'] } });
		expect(prefs.modeDisabledSignals).toEqual({ fantasy: ['exposure'] });
	});

	test('keeps a fantasy rule inside its bounds and the Fantasy blend inside 0 to 100', () => {
		const prefs = normalizeUserPreferences({
			fantasyBlend: 140,
			fantasyScoring: { football: { passingTouchdowns: 6, receptions: 0.5, madeUpRule: 3 }, hockey: { goals: '3' } },
		});
		expect(prefs.fantasyBlend).toBe(100);
		expect(prefs.fantasyScoring).toEqual({ football: { passingTouchdowns: 6, receptions: 0.5 } });
	});

	// The scorer clamps an out-of-range rule to its bound, while the prefs reader throws it away and
	// so lands on the default instead. Pinned so a change to either one is a decision, not a drift.
	test('discards an out-of-range rule outright rather than clamping it to the bound', () => {
		const prefs = normalizeUserPreferences({ fantasyScoring: { football: { passingTouchdowns: 12 } } });
		expect(prefs.fantasyScoring).toEqual({});
	});
});

const entry = (athleteId: string, overrides: Record<string, unknown> = {}) => ({
	league: 'nfl', athleteId, name: `Player ${athleteId}`, teamId: '11', position: 'WR', ...overrides,
});

describe('a fantasy roster read back from storage', () => {
	test('keeps the first of a player added twice and drops entries it cannot use', () => {
		const roster = normalizeFantasyRoster([
			entry('1'),
			entry('1', { name: 'Duplicate' }),
			entry('2', { league: 'xfl' }),
			entry('3', { position: 'LB' }),
			entry('4', { teamId: 11 }),
			null,
			'nonsense',
			entry('5', { league: 'nba', position: 'player' }),
		]);
		expect(roster.map(player => `${player.league}:${player.athleteId}`)).toEqual(['nfl:1', 'nba:5']);
		expect(roster[0]!.name).toBe('Player 1');
	});

	test('holds the roster to its limit and a name to sixty characters', () => {
		const roster = normalizeFantasyRoster(Array.from({ length: fantasyRosterLimit + 10 }, (_, i) => entry(String(i), { name: 'x'.repeat(80) })));
		expect(roster).toHaveLength(fantasyRosterLimit);
		expect(roster[0]!.name).toHaveLength(60);
	});

	test('reads anything that is not a list as an empty roster', () => {
		expect(normalizeFantasyRoster({ '0': entry('1') })).toEqual([]);
		expect(normalizeFantasyRoster(undefined)).toEqual([]);
	});

	// Our sources number teams per league, so the same id is a different club in another sport.
	test('matches a player to a game by league as well as team id', () => {
		const roster = normalizeFantasyRoster([entry('wr', { teamId: '11' }), entry('pg', { league: 'nba', teamId: '11', position: 'player' })]);
		expect(rosterInGame(roster, nflOneScore).map(player => player.athleteId)).toEqual(['wr']);
		expect(rosterInGame(roster, rout).map(player => player.athleteId)).toEqual(['pg']);
	});
});
