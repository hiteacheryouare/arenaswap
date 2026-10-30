import { createSignalInput, scoreGame } from '../src/compose';
import { computeFantasySituation } from '../src/signals/fantasy';
import type { FantasyPlayerState, Game } from '../src/types';

// Indianapolis has the ball against Washington, a field goal game in the fourth.
const drive = (yardsToEndZone: number, down = 1, overrides: Partial<Game> = {}): Game => ({
	id: 'g',
	league: 'nfl',
	sportType: 'football',
	status: 'in',
	period: 4,
	clockSeconds: 400,
	homeTeam: { score: 20, abbreviation: 'WSH' },
	awayTeam: { score: 17, abbreviation: 'IND' },
	possession: 'away',
	down,
	distance: 7,
	yardsToEndZone,
	...overrides,
});

const taylor: FantasyPlayerState = { id: 'jt', name: 'Jonathan Taylor', side: 'away', position: 'RB' };
const kicker: FantasyPlayerState = { id: 'k', name: 'Spencer Shrader', side: 'away', position: 'K' };
const washingtonDefense: FantasyPlayerState = { id: 'dst:28', name: 'Commanders D/ST', side: 'home', position: 'DST' };
const washingtonReceiver: FantasyPlayerState = { id: 'wr', name: 'Terry McLaurin', side: 'home', position: 'WR' };

const situation = (game: Game, fantasy: FantasyPlayerState[]) => computeFantasySituation(createSignalInput(game, { fantasy }));

describe('where the user\'s players are on a drive', () => {
	test('a running back is worth more the closer his team gets', () => {
		const midfield = situation(drive(55), [taylor]).points;
		const plusTerritory = situation(drive(40), [taylor]).points;
		const redZone = situation(drive(15), [taylor]).points;
		const goalLine = situation(drive(2), [taylor]).points;
		expect([midfield, plusTerritory, redZone, goalLine]).toEqual([20, 28, 32, 50]);
		expect(situation(drive(2), [taylor]).reason).toEqual({ key: 'fantasyRedZone', params: { name: 'Jonathan Taylor' } });
	});

	test('a player on the team without the ball has nothing going on', () => {
		expect(situation(drive(2), [washingtonReceiver]).points).toBe(0);
	});

	test('a kicker comes alive in range, and most of all on fourth down', () => {
		expect(situation(drive(45), [kicker]).points).toBe(8);
		expect(situation(drive(30), [kicker]).points).toBe(30);
		expect(situation(drive(30, 4), [kicker]).points).toBe(45);
	});

	test('a college kicker needs to be closer than a pro', () => {
		expect(situation(drive(35, 4, { league: 'ncaaf' }), [kicker]).points).toBe(8);
		expect(situation(drive(35, 4), [kicker]).points).toBe(45);
	});

	test('a defense is in it while the other team has the ball, more so with its back to the goal', () => {
		expect(situation(drive(60), [washingtonDefense]).points).toBe(20);
		expect(situation(drive(10), [washingtonDefense]).points).toBe(25);
		expect(situation(drive(10, 1, { possession: 'home' }), [washingtonDefense]).points).toBe(0);
	});

	test('counts the best player in full and a quarter of everyone else', () => {
		// Goal line: Taylor 50, Washington's defense 25.
		expect(situation(drive(2), [taylor, washingtonDefense]).points).toBe(56);
	});

	test('reads nothing between plays, when there is no down to read', () => {
		expect(situation(drive(2, 0), [taylor]).points).toBe(0);
		expect(situation(drive(2, 1, { possession: undefined }), [taylor]).points).toBe(0);
	});

	test('ignores a player the feed has ruled out', () => {
		expect(situation(drive(2), [{ ...taylor, active: false }]).points).toBe(0);
	});
});

describe('the drive lifting the game under Fantasy', () => {
	test('a goal-line carry outranks the same game at midfield', () => {
		const goalLine = scoreGame(drive(2), { fantasy: [taylor] }, { mode: 'fantasy' });
		const midfield = scoreGame(drive(55), { fantasy: [taylor] }, { mode: 'fantasy' });
		expect(goalLine.total).toBeGreaterThan(midfield.total);
		expect(goalLine.modeId).toBe('fantasy');
	});
});

// Detroit pitching the top of the sixth, up a run on Cleveland.
const ballgame = (baseRunners?: Game['baseRunners']): Game => ({
	id: 'b',
	league: 'mlb',
	sportType: 'baseball',
	status: 'in',
	period: 6,
	clockSeconds: 0,
	topOfInning: true,
	outs: 1,
	homeTeam: { score: 2, abbreviation: 'DET' },
	awayTeam: { score: 1, abbreviation: 'CLE' },
	...(baseRunners ? { baseRunners } : {}),
});

const pitcher: FantasyPlayerState = { id: 'p', name: 'Tarik Skubal', side: 'home', position: 'P', role: 'pitching' };

describe('a pitcher on the mound', () => {
	test.each([
		[true, false, false],
		[false, true, false],
		[false, false, true],
		[true, true, false],
		[true, false, true],
		[false, true, true],
		[true, true, true],
	])('works harder with first %s, second %s, third %s', (first, second, third) => {
		expect(situation(ballgame({ first, second, third }), [pitcher])).toEqual({ points: 40, reason: { key: 'fantasyPitching', params: { name: 'Tarik Skubal' } } });
	});

	test('reads the bases empty, or unreported, as the quieter spot', () => {
		expect(situation(ballgame({ first: false, second: false, third: false }), [pitcher]).points).toBe(30);
		expect(situation(ballgame(), [pitcher]).points).toBe(30);
	});
});
