// Journeys through games as a viewer actually experiences them: a whole slate competing for the
// tab, a clock winding down period by period, and a feed that revises a score after a review.

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

// Soccer's feed reports total elapsed time rather than a per-period clock, and count-up sports
// report elapsed rather than remaining, so a shared walk has to translate for each.
const clockForElapsed = (league: typeof leagueConfigs[number], period: number, elapsedSecs: number): number => {
	const config = sportTypeConfigMap[league.sportType];
	if (!config.clockCountsUp) return league.periodDurationSecs - elapsedSecs;
	return config.clockIsFullGameElapsed
		? (period - 1) * league.periodDurationSecs + elapsedSecs
		: elapsedSecs;
};

describe('a slate of concurrent games ranks the way a fan would pick', () => {
	// This is the product: given everything on at once, PowerScore decides which tab the viewer is
	// looking at. If this ordering inverts, the extension quietly sends people to boring games.
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
		// The blowout has the busiest history of the three, and must still finish behind a quiet
		// one-score game: a 38-point lead is the least watchable thing on the slate.
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
	// A dip makes the extension switch away from a game and back again for no reason the viewer can
	// see. Every per-signal ramp is monotonic on its own; this walks the composed total across the
	// period boundaries, which is where a discontinuity would actually show up.
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
			// It has to actually climb, or a flat zero would satisfy monotonicity trivially.
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
	// historyWindowMs is sized at 4x the longest half-life so a signal fades out rather than being
	// cut off. Retuning a half-life without the window would put a visible step in the graph at the
	// moment the oldest snapshot is discarded.
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
	// ESPN really does send a score backwards: a goal is overturned on review, a touchdown is
	// reversed, a run is rescored. The scorer reads history as a differential, so a score going
	// down looks exactly like the other team going on a run.
	const disallowedGoal = () => computePowerScore(
		{
			id: 'game-1', league: 'nhl', sportType: 'hockey',
			homeTeam: { abbreviation: 'BOS', score: 1 },
			awayTeam: { abbreviation: 'MTL', score: 1 },
			period: 3, clockSeconds: 300, status: 'in',
		},
		// Boston led 3-1, then had two goals wiped out on review. Montreal has not scored.
		snapshots([[3, 1], [3, 1], [1, 1]]),
	);

	test('does not credit the other team with a scoring run it never had', () => {
		expect(disallowedGoal().momentum).toBe(0);
	});

	test('never describes a run as having happened 0-0', () => {
		expect(disallowedGoal().reason).not.toContain('0-0');
	});

	// The harder version: the review lands while the other team is genuinely scoring, so the
	// window holds a real run and a correction at the same time. Read signed, the correction is
	// added to the run and inflates the tier.
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
		// Home scored five while away had four wiped out. That is a five-point run, which basketball
		// calls a small one; signed, the nine-point swing reads as the biggest run there is.
		const result = mixedWindow([[100, 100], [100, 100], [105, 96]]);
		expect(result.momentum).toBe(scorerTunables.scores.momentum.smallRun);
	});

	test('does not turn one basket plus a correction into a run', () => {
		// Two points for home, six taken off away. Nobody is rolling.
		expect(mixedWindow([[100, 100], [100, 100], [102, 94]]).momentum).toBe(0);
	});

	test('credits the run to the team that scored it', () => {
		// Both sides are named, so what is being checked is the order: the team on the run reads
		// first and the team chasing reads second.
		const result = mixedWindow([[100, 100], [100, 100], [109, 96]]);
		expect(result.reason).toContain('HOM');
		expect(result.reason.indexOf('HOM')).toBeLessThan(result.reason.indexOf('AWY'));
	});

	// The tie the floor creates. Two teams that both had points taken off come out with equal
	// floored deltas, and `homeIsRunning` resolves a tie to the away team on nothing but the
	// comparison operator. Nothing reads that attribution today, because a tie means a run of 0
	// and every sport needs at least 1 to register. This is the assumption that keeps it unread.
	test('needs at least a one-point run everywhere, so a tied window is never attributed', () => {
		for (const config of Object.values(sportTypeConfigMap)) {
			expect(config.momentumSmallRun).toBeGreaterThanOrEqual(1);
		}
	});

	test('never prints a negative scoreline in the run description', () => {
		// "HOM outscoring AWY 9--4" is what a signed differential renders.
		expect(mixedWindow([[100, 100], [100, 100], [109, 96]]).reason).not.toContain('--');
	});
});
