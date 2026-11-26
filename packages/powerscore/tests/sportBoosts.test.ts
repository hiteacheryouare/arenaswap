import { boostPoints, scoreGame } from '../src';
import type { Game, PowerScore, ScoreSnapshot, ScoringContext } from '../src';

const classic = (game: Game<string>, context: ScoringContext = {}): PowerScore => scoreGame(game, context, { mode: 'classic' });

const detailsOf = (score: PowerScore, id: string) => score.boosts.find(boost => boost.id === id)?.details;

const now = Date.UTC(2026, 10, 26, 22, 0);

const hoops = (secs: number, home: number, away: number, extra: Partial<Game<string>> = {}): Game<string> => ({
	id: 'bos-phi',
	league: 'nba',
	sportType: 'basketball',
	homeTeam: { abbreviation: 'PHI', score: home },
	awayTeam: { abbreviation: 'BOS', score: away },
	period: 4,
	clockSeconds: secs,
	status: 'in',
	...extra,
});

describe('the last shot', () => {
	const lastShot = (game: Game<string>) => boostPoints(classic(game), 'lastShot');

	test('waits for the game clock to drop under the shot clock, then builds to 12', () => {
		expect(lastShot(hoops(25, 100, 100))).toBe(0);
		expect(lastShot(hoops(24, 100, 100))).toBe(7);
		expect(lastShot(hoops(20, 100, 100))).toBe(8);
		expect(lastShot(hoops(5, 100, 100))).toBe(12);
		expect(lastShot(hoops(1, 100, 100))).toBe(12);
	});

	test('one possession is up to three points, and needing a three costs a quarter', () => {
		expect(lastShot(hoops(5, 99, 100))).toBe(12);
		expect(lastShot(hoops(5, 98, 100))).toBe(12);
		expect(lastShot(hoops(5, 97, 100))).toBe(9);
		expect(lastShot(hoops(5, 96, 100))).toBe(0);
	});

	test('college plays to a 30-second shot clock', () => {
		expect(lastShot(hoops(28, 70, 70, { league: 'ncaab', period: 2 }))).toBe(8);
		expect(lastShot(hoops(28, 70, 70, { league: 'ncaaw' }))).toBe(8);
		expect(lastShot(hoops(28, 70, 70))).toBe(0);
	});

	test('pays at the end of overtime, but not at the end of an earlier quarter', () => {
		expect(lastShot(hoops(5, 110, 110, { period: 5 }))).toBe(12);
		expect(lastShot(hoops(5, 80, 80, { period: 3 }))).toBe(0);
	});

	test('nothing at the buzzer or during a stoppage that freezes play', () => {
		expect(lastShot(hoops(0, 100, 100))).toBe(0);
		expect(lastShot(hoops(5, 100, 100, { delayed: true }))).toBe(0);
	});

	test('says the clock, and the margin when it is not tied', () => {
		expect(detailsOf(classic(hoops(12, 100, 100)), 'lastShot')).toEqual([{ key: 'lastShotTied', params: { clock: '0:12' } }]);
		expect(detailsOf(classic(hoops(12, 98, 100)), 'lastShot')).toEqual([{ key: 'lastShotClose', params: { margin: 2, clock: '0:12' } }]);
	});
});

const rink = (period: number, extra: Partial<Game<string>> = {}): Game<string> => ({
	id: 'nyr-phi',
	league: 'nhl',
	sportType: 'hockey',
	homeTeam: { abbreviation: 'PHI', score: 2 },
	awayTeam: { abbreviation: 'NYR', score: 2 },
	period,
	clockSeconds: 600,
	status: 'in',
	...extra,
});

const pitch = (period: number, shootout?: [number, number]): Game<string> => ({
	id: 'che-liv',
	league: 'epl',
	sportType: 'soccer',
	homeTeam: { abbreviation: 'LIV', score: 1, ...(shootout ? { shootoutScore: shootout[0] } : {}) },
	awayTeam: { abbreviation: 'CHE', score: 1, ...(shootout ? { shootoutScore: shootout[1] } : {}) },
	period,
	clockSeconds: 7200,
	status: 'in',
});

const gridiron = (period: number, home: number, away: number, league = 'ncaaf'): Game<string> => ({
	id: 'mich-osu',
	league,
	sportType: 'football',
	homeTeam: { abbreviation: 'OSU', score: home },
	awayTeam: { abbreviation: 'MICH', score: away },
	period,
	clockSeconds: 0,
	status: 'in',
});

describe('sudden death', () => {
	const suddenDeath = (game: Game<string>) => boostPoints(classic(game), 'suddenDeath');

	test('playoff hockey overtime adds 4 an overtime, up to 12', () => {
		const playoff = { seasonType: 'postseason' as const };
		expect(suddenDeath(rink(3, playoff))).toBe(0);
		expect(suddenDeath(rink(4, playoff))).toBe(4);
		expect(suddenDeath(rink(5, playoff))).toBe(8);
		expect(suddenDeath(rink(6, playoff))).toBe(12);
		expect(suddenDeath(rink(7, playoff))).toBe(12);
		expect(detailsOf(classic(rink(6, playoff)), 'suddenDeath')).toEqual([{ key: 'playoffOvertimeDeep', params: { overtime: 3 } }]);
	});

	test('regular-season 3-on-3 overtime pays nothing, and the shootout after it pays 10', () => {
		expect(suddenDeath(rink(4))).toBe(0);
		expect(suddenDeath(rink(5))).toBe(10);
		expect(detailsOf(classic(rink(5)), 'suddenDeath')).toEqual([{ key: 'hockeyShootout' }]);
	});

	test('a penalty shootout pays most when it is level and less as one team pulls ahead', () => {
		expect(suddenDeath(pitch(3))).toBe(0);
		expect(suddenDeath(pitch(5, [4, 4]))).toBe(12);
		expect(suddenDeath(pitch(5, [4, 3]))).toBe(8);
		expect(suddenDeath(pitch(5, [3, 1]))).toBe(4);
		expect(suddenDeath(pitch(5, [3, 0]))).toBe(0);
	});

	test('a shootout names the leader, and falls back to a flat 10 without shootout goals', () => {
		expect(detailsOf(classic(pitch(5, [4, 3])), 'suddenDeath')).toEqual([{ key: 'shootoutLeading', params: { team: 'LIV', scored: 4, conceded: 3 } }]);
		expect(detailsOf(classic(pitch(5, [2, 2])), 'suddenDeath')).toEqual([{ key: 'shootoutTied', params: { goals: 2 } }]);
		expect(suddenDeath(pitch(5))).toBe(10);
	});

	test('college overtime grows each overtime and maxes out once it is two-point tries', () => {
		expect(suddenDeath(gridiron(5, 24, 24))).toBe(4);
		expect(suddenDeath(gridiron(6, 31, 31))).toBe(8);
		expect(suddenDeath(gridiron(7, 33, 33))).toBe(12);
		expect(detailsOf(classic(gridiron(7, 33, 33)), 'suddenDeath')).toEqual([{ key: 'twoPointTries' }]);
	});

	test('college overtime needs a one-score game, the UFL starts at two-point tries, and the NFL sits out', () => {
		expect(suddenDeath(gridiron(5, 24, 31))).toBe(4);
		expect(suddenDeath(gridiron(5, 24, 34))).toBe(0);
		expect(suddenDeath(gridiron(5, 20, 20, 'ufl'))).toBe(12);
		expect(suddenDeath(gridiron(5, 20, 20, 'nfl'))).toBe(0);
	});
});

const kickoff = (secs: number, home: number, away: number, extra: Partial<Game<string>> = {}): Game<string> => ({
	id: 'dal-phi',
	league: 'nfl',
	sportType: 'football',
	homeTeam: { abbreviation: 'PHI', score: home, timeouts: 2 },
	awayTeam: { abbreviation: 'DAL', score: away, timeouts: 2 },
	period: 4,
	clockSeconds: secs,
	status: 'in',
	down: -1,
	...extra,
});

describe('the onside kick', () => {
	const scored = (before: [number, number], after: [number, number], agoMs = 30_000): ScoringContext => {
		const history: ScoreSnapshot[] = [
			{ gameId: 'dal-phi', timestamp: now - agoMs - 120_000, homeScore: before[0], awayScore: before[1] },
			{ gameId: 'dal-phi', timestamp: now - agoMs, homeScore: after[0], awayScore: after[1] },
			{ gameId: 'dal-phi', timestamp: now, homeScore: after[0], awayScore: after[1] },
		];
		return { history };
	};
	test('a late score that still leaves the scorer one score down sets up the kickoff', () => {
		const score = scoreGame(kickoff(90, 24, 27), scored([17, 27], [24, 27]), { mode: 'classic' });
		expect(score.boosts.find(boost => boost.id === 'twoMinuteDrill')?.details).toEqual([{ key: 'onsideKick', params: { team: 'PHI', clock: '1:30', trailBy: 3 } }]);
	});

	test('pays three quarters of a drill from the same spot in the clock', () => {
		expect(boostPoints(scoreGame(kickoff(90, 24, 27), scored([17, 27], [24, 27])), 'twoMinuteDrill')).toBe(6);
		expect(boostPoints(scoreGame(kickoff(30, 24, 27), scored([17, 27], [24, 27])), 'twoMinuteDrill')).toBe(9);
	});

	test('nothing when the score put the scorer ahead, or left them more than one score down', () => {
		expect(boostPoints(scoreGame(kickoff(90, 30, 27), scored([23, 27], [30, 27])), 'twoMinuteDrill')).toBe(0);
		expect(boostPoints(scoreGame(kickoff(90, 17, 27), scored([14, 27], [17, 27])), 'twoMinuteDrill')).toBe(0);
	});

	test('nothing once the kick is away, in the 3rd quarter, before the 4:00 mark, or long after the score', () => {
		const context = scored([17, 27], [24, 27]);
		expect(boostPoints(scoreGame(kickoff(85, 24, 27, { down: 1, distance: 10, possession: 'away', yardsToEndZone: 75 }), context), 'twoMinuteDrill')).toBe(0);
		expect(boostPoints(scoreGame(kickoff(90, 24, 27, { period: 3 }), context), 'twoMinuteDrill')).toBe(0);
		expect(boostPoints(scoreGame(kickoff(241, 24, 27), context), 'twoMinuteDrill')).toBe(0);
		expect(boostPoints(scoreGame(kickoff(90, 24, 27), scored([17, 27], [24, 27], 6 * 60_000)), 'twoMinuteDrill')).toBe(0);
	});
});

const extras = (extra: Partial<Game<string>> = {}): Game<string> => ({
	id: 'nym-phi',
	league: 'mlb',
	sportType: 'baseball',
	homeTeam: { abbreviation: 'PHI', score: 3, hits: 8 },
	awayTeam: { abbreviation: 'NYM', score: 3, hits: 8 },
	period: 10,
	topOfInning: false,
	outs: 0,
	baseRunners: { first: false, second: true, third: false },
	status: 'in',
	...extra,
});

describe('the extra-inning automatic runner', () => {
	const runnerBoosts = (game: Game<string>) => {
		const score = classic(game);
		return boostPoints(score, 'scoringOpportunity') + boostPoints(score, 'goAheadRun');
	};

	test('counts half until the inning does something', () => {
		expect(runnerBoosts(extras())).toBe(7);
		expect(runnerBoosts(extras({ topOfInning: true }))).toBe(6);
		expect(runnerBoosts(extras({ outs: 1 }))).toBe(13);
		expect(runnerBoosts(extras({ baseRunners: { first: true, second: true, third: false } }))).toBe(16);
	});

	test('says the runner started there', () => {
		const score = classic(extras());
		expect(detailsOf(score, 'scoringOpportunity')).toEqual([{ key: 'automaticRunner' }]);
		expect(detailsOf(score, 'goAheadRun')).toEqual([{ key: 'winningRun', params: { team: 'PHI' } }, { key: 'automaticRunner' }]);
	});

	test('only where the rule applies: MLB in the regular season, the World Baseball Classic, and college softball from the 8th', () => {
		expect(runnerBoosts(extras({ seasonType: 'postseason' }))).toBe(13);
		expect(runnerBoosts(extras({ league: 'cbase' }))).toBe(13);
		expect(runnerBoosts(extras({ league: 'wbbc' }))).toBe(7);
		expect(runnerBoosts(extras({ league: 'csoft', sportType: 'softball', period: 8 }))).toBe(7);
		expect(runnerBoosts(extras({ period: 9 }))).toBe(13);
	});
});
