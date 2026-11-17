
import { computePowerScore } from '../src/scorer';
import { leagueConfigs, scorerTunables, sportTypeConfigMap } from '../src/constants';
import type { Game, ScoreSnapshot } from '../src/types';

const snapshots = (rows: Array<[number, number]>): ScoreSnapshot[] => (
	rows.map(([homeScore, awayScore], index) => ({
		gameId: 'game-1',
		timestamp: index * 20_000,
		homeScore,
		awayScore,
	}))
);

const clockLeagues = leagueConfigs.filter(league => sportTypeConfigMap[league.sportType].clockBased);
const inningLeagues = leagueConfigs.filter(league => !sportTypeConfigMap[league.sportType].clockBased);

const clockForElapsed = (league: typeof leagueConfigs[number], period: number, elapsedSecs: number): number => {
	const config = sportTypeConfigMap[league.sportType];
	if (!config.clockCountsUp) return league.periodDurationSecs - elapsedSecs;
	return config.clockIsFullGameElapsed
		? (period - 1) * league.periodDurationSecs + elapsedSecs
		: elapsedSecs;
};

describe('a slate of concurrent games ranks the way a fan would pick', () => {
	const slate = {
		overtimeThriller: computePowerScore(
			{
				id: 'ot', league: 'nba', sportType: 'basketball',
				homeTeam: { abbreviation: 'BOS', score: 112 },
				awayTeam: { abbreviation: 'LAL', score: 112 },
				period: 5, clockSeconds: 30, status: 'in',
			},
			snapshots([[100, 104], [106, 106], [108, 110], [112, 112]]),
		),
		tiedFinalMinute: computePowerScore(
			{
				id: 'tied', league: 'nba', sportType: 'basketball',
				homeTeam: { abbreviation: 'DEN', score: 98 },
				awayTeam: { abbreviation: 'PHX', score: 98 },
				period: 4, clockSeconds: 40, status: 'in',
			},
			snapshots([[92, 95], [95, 96], [98, 98]]),
		),
		closeThirdQuarter: computePowerScore(
			{
				id: 'close', league: 'nba', sportType: 'basketball',
				homeTeam: { abbreviation: 'MIA', score: 70 },
				awayTeam: { abbreviation: 'NYK', score: 66 },
				period: 3, clockSeconds: 360, status: 'in',
			},
			snapshots([[64, 62], [67, 64], [70, 66]]),
		),
		blowout: computePowerScore(
			{
				id: 'blowout', league: 'nba', sportType: 'basketball',
				homeTeam: { abbreviation: 'GSW', score: 120 },
				awayTeam: { abbreviation: 'DET', score: 82 },
				period: 4, clockSeconds: 300, status: 'in',
			},
			snapshots([[110, 78], [115, 80], [120, 82]]),
		),
		openingTip: computePowerScore({
			id: 'tip', league: 'nba', sportType: 'basketball',
			homeTeam: { abbreviation: 'ORL', score: 0 },
			awayTeam: { abbreviation: 'CHA', score: 0 },
			period: 1, clockSeconds: 700, status: 'in',
		}),
		halftime: computePowerScore({
			id: 'half', league: 'nba', sportType: 'basketball',
			homeTeam: { abbreviation: 'MIL', score: 55 },
			awayTeam: { abbreviation: 'CLE', score: 55 },
			period: 2, clockSeconds: 0, intermission: true, status: 'in',
		}),
	};

	test('puts the overtime thriller ahead of every other game on the slate', () => {
		const beaten = Object.entries(slate)
			.filter(([name]) => name !== 'overtimeThriller')
			.filter(([, result]) => result.total >= slate.overtimeThriller.total)
			.map(([name, result]) => `${name} scored ${result.total}`);
		expect(beaten).toEqual([]);
	});

	test('orders the live games by how much is at stake, not by how much scoring happened', () => {
		expect(slate.tiedFinalMinute.total).toBeGreaterThan(slate.closeThirdQuarter.total);
		expect(slate.closeThirdQuarter.total).toBeGreaterThan(slate.blowout.total);
		expect(slate.blowout.total).toBeGreaterThan(slate.openingTip.total);
	});

	test('drops a tied game at halftime below every game that is actually being played', () => {
		expect(slate.halftime.total).toBe(0);
		expect(slate.blowout.total).toBeGreaterThan(slate.halftime.total);
		expect(slate.openingTip.total).toBeGreaterThan(slate.halftime.total);
	});
});

describe('a score never dips while the game is being played', () => {
	test.each(clockLeagues.map(league => [league.id, league] as const))(
		'%s: a tied game only ever climbs from the opening whistle to the final buzzer',
		(_id, league) => {
			const step = Math.max(1, Math.floor(league.periodDurationSecs / 15));
			const walk: { period: number; elapsed: number; total: number }[] = [];
			for (let period = 1; period <= league.regularPeriods; period++) {
				for (let elapsed = 0; elapsed <= league.periodDurationSecs; elapsed += step) {
					const game: Game = {
						id: 'game-1', league: league.id, sportType: league.sportType,
						homeTeam: { abbreviation: 'HOM', score: 2 },
						awayTeam: { abbreviation: 'AWY', score: 2 },
						period,
						clockSeconds: clockForElapsed(league, period, elapsed),
						status: 'in',
					};
					walk.push({ period, elapsed, total: computePowerScore(game).total });
				}
			}
			const dips = walk.filter((point, index) => index > 0 && point.total < walk[index - 1]!.total);
			expect(dips).toEqual([]);
			expect(walk[walk.length - 1]!.total).toBeGreaterThan(walk[0]!.total);
		},
	);

	test.each(inningLeagues.map(league => [league.id, league] as const))(
		'%s: a one-run game only ever climbs as the innings advance',
		(_id, league) => {
			const walk: { inning: number; topOfInning: boolean; total: number }[] = [];
			for (let inning = 1; inning <= league.regularPeriods; inning++) {
				for (const topOfInning of [true, false]) {
					const game: Game = {
						id: 'game-1', league: league.id, sportType: league.sportType,
						homeTeam: { abbreviation: 'HOM', score: 3 },
						awayTeam: { abbreviation: 'AWY', score: 2 },
						period: inning, topOfInning, status: 'in',
					};
					walk.push({ inning, topOfInning, total: computePowerScore(game).total });
				}
			}
			const dips = walk.filter((point, index) => index > 0 && point.total < walk[index - 1]!.total);
			expect(dips).toEqual([]);
			expect(walk[walk.length - 1]!.total).toBeGreaterThan(walk[0]!.total);
		},
	);
});

describe('a signal is worth almost nothing by the time it leaves the history window', () => {
	test.each(leagueConfigs.map(league => [league.id, league] as const))(
		'%s: discarding the oldest snapshot moves the total by at most a point or two',
		(_id, league) => {
			const config = sportTypeConfigMap[league.sportType];
			const window = config.historyWindowMs;
			const run = config.momentumBigRun;
			const game: Game = {
				id: 'game-1', league: league.id, sportType: league.sportType,
				homeTeam: { abbreviation: 'HOM', score: run },
				awayTeam: { abbreviation: 'AWY', score: 0 },
				period: 2, clockSeconds: 300, status: 'in',
			};
			const stillInWindow = computePowerScore(game, [
				{ gameId: 'game-1', timestamp: 0, homeScore: 0, awayScore: 0 },
				{ gameId: 'game-1', timestamp: 1_000, homeScore: run, awayScore: 0 },
				{ gameId: 'game-1', timestamp: window, homeScore: run, awayScore: 0 },
			]);
			const agedOut = computePowerScore(game, [
				{ gameId: 'game-1', timestamp: window, homeScore: run, awayScore: 0 },
				{ gameId: 'game-1', timestamp: window + 10_000, homeScore: run, awayScore: 0 },
				{ gameId: 'game-1', timestamp: window + 20_000, homeScore: run, awayScore: 0 },
			]);
			expect(agedOut.momentum).toBe(0);
			expect(stillInWindow.total - agedOut.total).toBeLessThanOrEqual(2);
		},
	);
});

describe('the feed revises a score after a video review', () => {
	const disallowedGoal = () => computePowerScore(
		{
			id: 'game-1', league: 'nhl', sportType: 'hockey',
			homeTeam: { abbreviation: 'BOS', score: 1 },
			awayTeam: { abbreviation: 'MTL', score: 1 },
			period: 3, clockSeconds: 300, status: 'in',
		},
		snapshots([[3, 1], [3, 1], [1, 1]]),
	);

	test('does not credit the other team with a scoring run it never had', () => {
		expect(disallowedGoal().momentum).toBe(0);
	});

	test('never describes a run as having happened 0-0', () => {
		expect(disallowedGoal().reason).not.toContain('0-0');
	});

	const mixedWindow = (rows: Array<[number, number]>) => computePowerScore(
		{
			id: 'game-1', league: 'nba', sportType: 'basketball',
			homeTeam: { abbreviation: 'HOM', score: rows[rows.length - 1]![0] },
			awayTeam: { abbreviation: 'AWY', score: rows[rows.length - 1]![1] },
			period: 4, clockSeconds: 300, status: 'in',
		},
		snapshots(rows),
	);

	test('scores a mixed window on the points scored, not on the points taken away', () => {
		const result = mixedWindow([[100, 100], [100, 100], [105, 96]]);
		expect(result.momentum).toBe(scorerTunables.scores.momentum.smallRun);
	});

	test('does not turn one basket plus a correction into a run', () => {
		expect(mixedWindow([[100, 100], [100, 100], [102, 94]]).momentum).toBe(0);
	});

	test('credits the run to the team that scored it', () => {
		const result = mixedWindow([[100, 100], [100, 100], [109, 96]]);
		expect(result.reason).toMatch(/^HOM on a 9–0 run\./);
	});

	test('needs at least a one-point run everywhere, so a tied window is never attributed', () => {
		for (const config of Object.values(sportTypeConfigMap)) {
			expect(config.momentumSmallRun).toBeGreaterThanOrEqual(1);
		}
	});

	test('never prints a negative scoreline in the run description', () => {
		expect(mixedWindow([[100, 100], [100, 100], [109, 96]]).reason).not.toContain('--');
	});
});
