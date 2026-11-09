import { chooseSwitchTarget, scoreLiveGame, scoreOptionsFor, toLiveScore } from '../src/scoring';
import { createDefaultUserPreferences, normalizeUserPreferences } from '../src/constants';
import type { ScoringPrefs, SwitchCandidateTab } from '../src/scoring';
import type { Game, Team } from '../src/types';

const team = (id: string, abbreviation: string, name: string, score: number): Team => ({ id, name, abbreviation, score });

const eaglesCowboys = (eagles: number, cowboys: number): Game => ({
	id: 'phi-dal',
	league: 'nfl',
	sportType: 'football',
	homeTeam: team('21', 'PHI', 'Philadelphia Eagles', eagles),
	awayTeam: team('6', 'DAL', 'Dallas Cowboys', cowboys),
	period: 3,
	clockSeconds: 600,
	status: 'in',
});

const celticsHeat = (celtics: number, heat: number): Game => ({
	id: 'bos-mia',
	league: 'nba',
	sportType: 'basketball',
	homeTeam: team('2', 'BOS', 'Boston Celtics', celtics),
	awayTeam: team('14', 'MIA', 'Miami Heat', heat),
	period: 3,
	clockSeconds: 300,
	status: 'in',
});

const now = Date.UTC(2026, 10, 9, 21, 0);
const blowoutsWithCowboys: ScoringPrefs = {
	favoriteTeamIds: [],
	favoriteTeamBonusPoints: 10,
	postseasonBoostPoints: 0,
	disabledSignals: [],
	scoringMode: 'blowouts',
	rivalTeamIds: ['nfl:6'],
};

const live = (game: Game, prefs: ScoringPrefs) => toLiveScore(scoreLiveGame({ game, history: [], onBreak: false, winProbability: [], now }, prefs, 0));

describe('stored rivals', () => {
	test('start empty', () => {
		expect(createDefaultUserPreferences().rivalTeamIds).toEqual([]);
		expect(normalizeUserPreferences({}).rivalTeamIds).toEqual([]);
	});

	test('drop junk and repeats, and never keep a team that is also a favorite', () => {
		const prefs = normalizeUserPreferences({
			favoriteTeamIds: ['nfl:21'],
			rivalTeamIds: ['nfl:6', 'nfl:6', 'ncaamh:104', 'nfl:21', 'nope', 42],
		});
		expect(prefs.favoriteTeamIds).toEqual(['nfl:21']);
		expect(prefs.rivalTeamIds).toEqual(['nfl:6', 'ncaamh:104']);
	});
});

describe('scoring with rivals', () => {
	test('only Blowouts hears about them', () => {
		const game = eaglesCowboys(31, 7);
		expect(scoreOptionsFor(game, blowoutsWithCowboys, 0).rivalSides).toEqual(['away']);
		expect(scoreOptionsFor(game, { ...blowoutsWithCowboys, scoringMode: 'classic' }, 0).rivalSides).toBeUndefined();
		expect(scoreOptionsFor(game, { ...blowoutsWithCowboys, scoringMode: 'custom', leagueModes: { nfl: 'fantasy' } }, 0).rivalSides).toBeUndefined();
		expect(scoreOptionsFor(game, { ...blowoutsWithCowboys, rivalTeamIds: [] }, 0).rivalSides).toBeUndefined();
	});

	test('a game without a rival in it still gets squeezed under the rivals', () => {
		expect(scoreOptionsFor(celticsHeat(98, 54), blowoutsWithCowboys, 0).rivalSides).toEqual([]);
	});

	test('the breakdown the popup reads says a rival is getting beaten', () => {
		expect(live(eaglesCowboys(31, 7), blowoutsWithCowboys).breakdown?.rivalry).toMatchObject({ kind: 'beatdown', side: 'away' });
	});
});

describe('switching to a rival getting beaten', () => {
	const registry: SwitchCandidateTab[] = [{ tabId: 1, gameId: 'bos-mia' }, { tabId: 2, gameId: 'phi-dal' }];
	const heldRout = Array.from({ length: 21 }, (_, i) => ({
		gameId: 'bos-mia', timestamp: now - 300_000 + i * 15_000, homeScore: 80 + Math.round(18 * i / 20), awayScore: 50 + Math.round(4 * i / 20),
	}));
	const rout = toLiveScore(scoreLiveGame({ game: { ...celticsHeat(98, 54), period: 2 }, history: heldRout, onBreak: false, winProbability: [], now }, blowoutsWithCowboys, 0));
	const beatdown = live(eaglesCowboys(24, 7), blowoutsWithCowboys);
	const decide = (sensitivity: 1 | 7) => chooseSwitchTarget({
		registry, scores: [rout, beatdown], activeTabId: 1, sensitivity, cooldownSeconds: 0, lastSwitchTime: 0, now,
	});

	test('ranks the rival above the rout', () => {
		expect(beatdown.total).toBeGreaterThan(rout.total);
	});

	test('still needs the Sensitivity gap to switch', () => {
		expect(beatdown.total - rout.total).toBeLessThan(37);
		expect(decide(1)).toBeNull();
		expect(decide(7)).toMatchObject({ tabId: 2, gameId: 'phi-dal' });
	});
});
