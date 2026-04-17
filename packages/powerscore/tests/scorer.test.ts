import {
	leagueConfigs,
	scorerTunables,
	scoreMaxCloseness,
	scoreMaxLateGame,
	scoreMaxMomentum,
	scoreMaxLeadChanges,
	scoreMaxComeback,
	scoreMaxTotal,
	stallPenaltyMultiplier,
	stallThresholdPolls,
} from '../src/constants';
import { computePowerScore, normalizePowerScoreResult } from '../src/scorer';
import type { Game, PowerScoreResult, ScoreSnapshot } from '../src/types';

const makeGame = (overrides: Partial<Game> = {}): Game => ({
	id: 'game-1',
	league: 'nba',
	sportType: 'basketball',
	homeTeam: { abbreviation: 'HOM', score: 80 },
	awayTeam: { abbreviation: 'AWY', score: 78 },
	period: 2,
	clockSeconds: 600,
	...overrides,
});

const makeHistory = (scores: Array<[number, number]>): ScoreSnapshot[] => (
	scores.map(([homeScore, awayScore], index) => ({
		gameId: 'game-1',
		timestamp: index * 15_000,
		homeScore,
		awayScore,
	}))
);

describe('computePowerScore', () => {
	test('normalizes legacy score payloads with missing new signals', () => {
		const legacyResult: Partial<PowerScoreResult> & Pick<PowerScoreResult, 'gameId'> = {
			gameId: 'legacy-game',
			total: 35,
			closeness: 35,
			lateGame: 0,
			momentum: 0,
			reason: 'tied',
		};

		const normalized = normalizePowerScoreResult(legacyResult);
		expect(normalized.leadChanges).toBe(0);
		expect(normalized.comeback).toBe(0);
		expect(normalized.total).toBe(35);
	});

	test('clamps normalized signal values and total to configured maxes', () => {
		const normalized = normalizePowerScoreResult({
			gameId: 'legacy-overflow',
			closeness: 40,
			lateGame: 100,
			momentum: -1,
			leadChanges: 99,
			comeback: 15,
			total: 999,
		});

		expect(normalized.closeness).toBe(scoreMaxCloseness);
		expect(normalized.lateGame).toBe(scoreMaxLateGame);
		expect(normalized.momentum).toBe(0);
		expect(normalized.leadChanges).toBe(scoreMaxLeadChanges);
		expect(normalized.comeback).toBe(scoreMaxComeback);
		expect(normalized.total).toBe(scoreMaxTotal);
	});

	test('can preserve totals above 100 when overflow is allowed', () => {
		const normalized = normalizePowerScoreResult({
			gameId: 'favorite-overflow',
			closeness: 30,
			lateGame: 30,
			momentum: 20,
			leadChanges: 12,
			comeback: 8,
			baseTotal: 100,
			favoriteBonus: 20,
			favoriteTeamCount: 2,
			total: 120,
			reason: 'favorite bonus',
		}, { allowTotalOverflow: true });

		expect(normalized.total).toBe(120);
		expect(normalized.baseTotal).toBe(100);
		expect(normalized.favoriteBonus).toBe(20);
		expect(normalized.favoriteTeamCount).toBe(2);
	});

	test('returns zeroed score for intermission games', () => {
		const game = makeGame({ intermission: true });
		expect(computePowerScore(game, makeHistory([[80, 78], [82, 78], [84, 78]]))).toEqual({
			gameId: 'game-1',
			total: 0,
			closeness: 0,
			lateGame: 0,
			momentum: 0,
			leadChanges: 0,
			comeback: 0,
			reason: '',
			stalled: false,
		});
	});

	test('scores 0-0 differently by sport type', () => {
		const basketball = makeGame({
			league: 'nba',
			sportType: 'basketball',
			homeTeam: { ...makeGame().homeTeam, score: 0 },
			awayTeam: { ...makeGame().awayTeam, score: 0 },
		});
		const soccer = makeGame({
			league: 'mls',
			sportType: 'soccer',
			period: 1,
			clockSeconds: 1_000,
			homeTeam: { ...makeGame().homeTeam, score: 0 },
			awayTeam: { ...makeGame().awayTeam, score: 0 },
		});

		const basketballResult = computePowerScore(basketball, []);
		const soccerResult = computePowerScore(soccer, []);

		expect(basketballResult.closeness).toBe(scorerTunables.scores.closeness.zeroZero);
		expect(soccerResult.closeness).toBe(scorerTunables.scores.closeness.tied);
	});

	test('applies basketball closeness thresholds at boundary margins', () => {
		const cases = [
			{ margin: 5, expected: scorerTunables.scores.closeness.tight, expectedReason: '5-point game' },
			{ margin: 6, expected: scorerTunables.scores.closeness.close, expectedReason: '6-point game' },
			{ margin: 10, expected: scorerTunables.scores.closeness.close, expectedReason: '10-point game' },
			{ margin: 11, expected: scorerTunables.scores.closeness.fringe, expectedReason: scorerTunables.reasons.fallback },
			{ margin: 18, expected: scorerTunables.scores.closeness.fringe, expectedReason: scorerTunables.reasons.fallback },
			{ margin: 19, expected: scorerTunables.scores.closeness.none, expectedReason: scorerTunables.reasons.fallback },
		];

		for (const { margin, expected, expectedReason } of cases) {
			const game = makeGame({
				period: 1,
				clockSeconds: 600,
				homeTeam: { ...makeGame().homeTeam, score: 90 },
				awayTeam: { ...makeGame().awayTeam, score: 90 - margin },
			});

			const result = computePowerScore(game, []);
			expect(result.closeness).toBe(expected);
			expect(result.reason).toBe(expectedReason);
		}
	});

	test('builds a monotonic late-game gradient for countdown sports', () => {
		const withClock = (period: number, clockSeconds: number) => makeGame({
			period,
			clockSeconds,
			homeTeam: { ...makeGame().homeTeam, score: 110 },
			awayTeam: { ...makeGame().awayTeam, score: 90 },
		});

		const beforeWindow = computePowerScore(withClock(3, 301), []);
		const early = computePowerScore(withClock(3, 299), []);
		const mid = computePowerScore(withClock(4, 300), []);
		const late = computePowerScore(withClock(4, 120), []);
		const endOfRegulation = computePowerScore(withClock(4, 1), []);

		expect(beforeWindow.lateGame).toBe(0);
		expect(early.lateGame).toBeGreaterThan(beforeWindow.lateGame);
		expect(mid.lateGame).toBeGreaterThan(early.lateGame);
		expect(late.lateGame).toBeGreaterThan(mid.lateGame);
		expect(endOfRegulation.lateGame).toBeGreaterThan(late.lateGame);
		expect(endOfRegulation.lateGame).toBeGreaterThanOrEqual(Math.ceil(scoreMaxLateGame * 0.8));
		expect(endOfRegulation.lateGame).toBeLessThanOrEqual(scoreMaxLateGame);
		expect(mid.reason).toContain('under 5 min left');
	});

	test('builds a monotonic late-game gradient for count-up sports', () => {
		const withElapsed = (period: number, clockSeconds: number) => makeGame({
			league: 'mls',
			sportType: 'soccer',
			period,
			clockSeconds,
			homeTeam: { ...makeGame().homeTeam, score: 4 },
			awayTeam: { ...makeGame().awayTeam, score: 0 },
		});

		const beforeWindow = computePowerScore(withElapsed(1, 2_099), []);
		const early = computePowerScore(withElapsed(1, 2_101), []);
		const mid = computePowerScore(withElapsed(2, 2_100), []);
		const late = computePowerScore(withElapsed(2, 2_520), []);
		const endOfRegulation = computePowerScore(withElapsed(2, 2_699), []);

		expect(beforeWindow.lateGame).toBe(0);
		expect(early.lateGame).toBeGreaterThan(beforeWindow.lateGame);
		expect(mid.lateGame).toBeGreaterThan(early.lateGame);
		expect(late.lateGame).toBeGreaterThan(mid.lateGame);
		expect(endOfRegulation.lateGame).toBeGreaterThan(late.lateGame);
		expect(endOfRegulation.lateGame).toBeGreaterThanOrEqual(Math.ceil(scoreMaxLateGame * 0.8));
		expect(endOfRegulation.lateGame).toBeLessThanOrEqual(scoreMaxLateGame);
		expect(mid.reason).toContain('under 10 min left');
	});

	test('builds a monotonic late-game gradient for baseball innings', () => {
		const withInning = (period: number) => makeGame({
			league: 'mlb',
			sportType: 'baseball',
			period,
			clockSeconds: 0,
			homeTeam: { ...makeGame().homeTeam, score: 4 },
			awayTeam: { ...makeGame().awayTeam, score: 2 },
		});

		const beforeWindow = computePowerScore(withInning(5), []);
		const early = computePowerScore(withInning(6), []);
		const mid = computePowerScore(withInning(7), []);
		const late = computePowerScore(withInning(8), []);
		const endOfRegulation = computePowerScore(withInning(9), []);

		expect(beforeWindow.lateGame).toBe(0);
		expect(early.lateGame).toBeGreaterThan(beforeWindow.lateGame);
		expect(mid.lateGame).toBeGreaterThan(early.lateGame);
		expect(late.lateGame).toBeGreaterThan(mid.lateGame);
		expect(endOfRegulation.lateGame).toBeGreaterThan(late.lateGame);
		expect(endOfRegulation.lateGame).toBeGreaterThanOrEqual(Math.ceil(scoreMaxLateGame * 0.8));
		expect(endOfRegulation.lateGame).toBeLessThanOrEqual(scoreMaxLateGame);
		expect(endOfRegulation.reason).toContain('inning');
	});

	test('scores overtime and extra innings at max late-game pressure', () => {
		const overtime = makeGame({
			period: 5,
			clockSeconds: 120,
			homeTeam: { ...makeGame().homeTeam, score: 105 },
			awayTeam: { ...makeGame().awayTeam, score: 105 },
		});

		const game = makeGame({
			league: 'mlb',
			sportType: 'baseball',
			period: 10,
			clockSeconds: 0,
			homeTeam: { ...makeGame().homeTeam, score: 4 },
			awayTeam: { ...makeGame().awayTeam, score: 4 },
		});

		const overtimeResult = computePowerScore(overtime, []);
		const extraInningsResult = computePowerScore(game, []);

		expect(overtimeResult.lateGame).toBe(scoreMaxLateGame);
		expect(overtimeResult.reason).toContain('overtime');
		expect(extraInningsResult.lateGame).toBe(scoreMaxLateGame);
		expect(extraInningsResult.reason).toContain('extra innings');
	});

	test('pushes intense late regulation games into the 80s without maxing out', () => {
		const game = makeGame({
			period: 4,
			clockSeconds: 12,
			homeTeam: { abbreviation: 'HOM', score: 78 },
			awayTeam: { abbreviation: 'AWY', score: 78 },
		});
		const history = makeHistory([
			[70, 65],
			[72, 73],
			[75, 76],
		]);

		const result = computePowerScore(game, history);
		expect(result.total).toBeGreaterThanOrEqual(80);
		expect(result.total).toBeLessThan(scoreMaxTotal);
	});

	test('reserves 100 for exceptional overtime scenarios', () => {
		const game = makeGame({
			period: 5,
			clockSeconds: 120,
			homeTeam: { abbreviation: 'HOM', score: 115 },
			awayTeam: { abbreviation: 'AWY', score: 115 },
		});
		const history = makeHistory([
			[95, 80],
			[100, 102],
			[110, 102],
			[110, 112],
		]);

		const result = computePowerScore(game, history);
		expect(result.closeness).toBe(scoreMaxCloseness);
		expect(result.lateGame).toBe(scoreMaxLateGame);
		expect(result.momentum).toBe(scoreMaxMomentum);
		expect(result.leadChanges).toBe(scoreMaxLeadChanges);
		expect(result.comeback).toBe(scoreMaxComeback);
		expect(result.total).toBe(scoreMaxTotal);
	});

	test('detects big momentum runs from history snapshots', () => {
		const game = makeGame({
			homeTeam: { abbreviation: 'HOM', score: 70 },
			awayTeam: { abbreviation: 'AWY', score: 60 },
		});
		const history = makeHistory([[60, 60], [64, 60], [70, 60]]);
		const result = computePowerScore(game, history);

		expect(result.momentum).toBe(scorerTunables.scores.momentum.bigRun);
		expect(result.reason).toContain('HOM on a 10-0 run');
	});

	test('applies momentum boundaries for none, small, and big runs', () => {
		const game = makeGame({
			homeTeam: { abbreviation: 'HOM', score: 100 },
			awayTeam: { abbreviation: 'AWY', score: 70 },
			period: 1,
			clockSeconds: 720,
		});

		const noRun = computePowerScore(game, makeHistory([[90, 60], [92, 62], [94, 64]]));
		expect(noRun.momentum).toBe(scorerTunables.scores.momentum.none);
		expect(noRun.reason).toBe(scorerTunables.reasons.fallback);

		const smallRun = computePowerScore(game, makeHistory([[90, 60], [93, 60], [95, 60]]));
		expect(smallRun.momentum).toBe(scorerTunables.scores.momentum.smallRun);
		expect(smallRun.reason).toBe('HOM heating up');

		const bigRun = computePowerScore(game, makeHistory([[90, 60], [95, 60], [100, 60]]));
		expect(bigRun.momentum).toBe(scorerTunables.scores.momentum.bigRun);
		expect(bigRun.reason).toBe('HOM on a 10-0 run');
	});

	test('orders reasons by momentum then late game and truncates extra reasons', () => {
		const game = makeGame({
			period: 4,
			clockSeconds: 119,
			homeTeam: { abbreviation: 'HOM', score: 80 },
			awayTeam: { abbreviation: 'AWY', score: 78 },
		});
		// Home led throughout with a 10-0 run — no lead change or comeback to interfere
		const history = makeHistory([[60, 56], [65, 56], [70, 56]]);

		const result = computePowerScore(game, history);
		expect(result.reason).toBe('HOM on a 10-0 run, under 5 min left');
		expect(result.reason).not.toContain('2-point game');
	});

	test('uses fallback reason when only non-reason scoring signals are present', () => {
		const game = makeGame({
			period: 3,
			clockSeconds: 300,
			homeTeam: { ...makeGame().homeTeam, score: 111 },
			awayTeam: { ...makeGame().awayTeam, score: 100 },
		});
		// Home led throughout — no lead change or comeback; parallel scoring rate avoids momentum run
		const history = makeHistory([[100, 90], [103, 93], [106, 96]]);

		const result = computePowerScore(game, history);
		expect(result.closeness).toBe(scorerTunables.scores.closeness.fringe);
		expect(result.lateGame).toBeGreaterThan(0);
		expect(result.lateGame).toBeLessThan(scoreMaxLateGame);
		expect(result.momentum).toBe(scorerTunables.scores.momentum.none);
		expect(result.total).toBe(result.closeness + result.lateGame + result.momentum + result.leadChanges + result.comeback);
		expect(result.reason).toBe(scorerTunables.reasons.fallback);
	});

	test('applies stall penalty when threshold is met', () => {
		const game = makeGame({
			homeTeam: { ...makeGame().homeTeam, score: 100 },
			awayTeam: { ...makeGame().awayTeam, score: 92 },
			period: 2,
			clockSeconds: 600,
		});

		const raw = computePowerScore(game, [], stallThresholdPolls - 1);
		const stalled = computePowerScore(game, [], stallThresholdPolls);

		expect(raw.stalled).toBe(false);
		expect(raw.total).toBe(raw.closeness + raw.lateGame + raw.momentum + raw.leadChanges + raw.comeback);
		expect(stalled.stalled).toBe(true);
		expect(stalled.total).toBe(Math.round(raw.total * stallPenaltyMultiplier));
	});

	test('falls back to default reason when no signal reasons are present', () => {
		const game = makeGame({
			homeTeam: { ...makeGame().homeTeam, score: 120 },
			awayTeam: { ...makeGame().awayTeam, score: 80 },
			period: 1,
			clockSeconds: 650,
		});

		const result = computePowerScore(game, makeHistory([[120, 80], [120, 80], [120, 80]]));
		expect(result.reason).toBe(scorerTunables.reasons.fallback);
		expect(result.momentum).toBe(0);
		expect(result.lateGame).toBe(0);
		expect(result.closeness).toBe(0);
	});

	test('scores lead changes: none, single, and multiple', () => {
		const game = makeGame({ period: 2, clockSeconds: 600 });

		// No lead change — home leads throughout
		const noChange = computePowerScore(game, makeHistory([[50, 48], [52, 48], [54, 50]]));
		expect(noChange.leadChanges).toBe(scorerTunables.scores.leadChanges.none);

		// Single lead change — away takes the lead directly without passing through a tie
		const singleChange = computePowerScore(
			makeGame({ homeTeam: { abbreviation: 'HOM', score: 55 }, awayTeam: { abbreviation: 'AWY', score: 58 } }),
			makeHistory([[50, 48], [50, 54], [52, 56]]),
		);
		expect(singleChange.leadChanges).toBe(scorerTunables.scores.leadChanges.single);
		expect(singleChange.reason).toContain(scorerTunables.reasons.leadChangeSingle);

		// Multiple lead changes — lead flips twice
		const multiChange = computePowerScore(
			makeGame({ homeTeam: { abbreviation: 'HOM', score: 60 }, awayTeam: { abbreviation: 'AWY', score: 58 } }),
			makeHistory([[50, 48], [50, 52], [54, 52], [54, 56], [60, 58]]),
		);
		expect(multiChange.leadChanges).toBe(scorerTunables.scores.leadChanges.multiple);
		expect(multiChange.reason).toContain(scorerTunables.reasons.leadChangeMultiple);
	});

	test('scores comeback: none, moderate, and big', () => {
		// No comeback — deficit unchanged
		const noComeback = computePowerScore(
			makeGame({ homeTeam: { ...makeGame().homeTeam, score: 90 }, awayTeam: { ...makeGame().awayTeam, score: 80 } }),
			makeHistory([[80, 70], [84, 74], [90, 80]]),
		);
		expect(noComeback.comeback).toBe(scorerTunables.scores.comeback.none);

		// Moderate comeback — deficit shrinks by 5 (basketball small=3, big=6)
		const moderateComeback = computePowerScore(
			makeGame({ homeTeam: { ...makeGame().homeTeam, score: 89 }, awayTeam: { ...makeGame().awayTeam, score: 84 } }),
			makeHistory([[80, 70], [83, 75], [89, 84]]),
		);
		// oldDiff=10, newDiff=5, shrinkage=5 => moderate
		expect(moderateComeback.comeback).toBe(scorerTunables.scores.comeback.moderate);
		expect(moderateComeback.reason).toContain('closing the gap');

		// Big comeback — deficit shrinks by 8 (basketball big=6)
		const bigComeback = computePowerScore(
			makeGame({ homeTeam: { ...makeGame().homeTeam, score: 90 }, awayTeam: { ...makeGame().awayTeam, score: 88 } }),
			makeHistory([[80, 70], [84, 74], [90, 88]]),
		);
		// oldDiff=10, newDiff=2, shrinkage=8 >= big(6)
		expect(bigComeback.comeback).toBe(scorerTunables.scores.comeback.big);
		expect(bigComeback.reason).toContain('cutting into it');
	});

	test('reason priority: momentum > comeback > leadChanges > lateGame > closeness', () => {
		// Home was up 10, away erased the deficit to tie; shrinkage=10 → comeback.big
		// Momentum also fires (away on a run), so reason slot 1 = momentum, slot 2 = comeback
		const game = makeGame({
			period: 2,
			clockSeconds: 600,
			homeTeam: { ...makeGame().homeTeam, score: 84 },
			awayTeam: { ...makeGame().awayTeam, score: 84 },
		});
		const history = makeHistory([[80, 70], [81, 75], [84, 84]]);
		const result = computePowerScore(game, history);
		expect(result.comeback).toBe(scorerTunables.scores.comeback.big);
		expect(result.reason).toContain('cutting into it');
	});

	test('produces numeric lead-change and comeback scores for every league', () => {
		for (const league of leagueConfigs) {
			const game = makeGame({
				league: league.id,
				sportType: league.sportType,
				period: Math.max(1, league.regularPeriods - 1),
				clockSeconds: league.periodDurationSecs > 0 ? Math.min(600, league.periodDurationSecs) : 0,
				homeTeam: { abbreviation: 'HOM', score: 16 },
				awayTeam: { abbreviation: 'AWY', score: 15 },
			});

			const history = makeHistory([
				[10, 0],
				[10, 12],
				[14, 12],
				[15, 14],
			]);

			const result = computePowerScore(game, history);
			expect(Number.isFinite(result.leadChanges)).toBe(true);
			expect(Number.isFinite(result.comeback)).toBe(true);
			expect(result.leadChanges).toBeGreaterThan(0);
			expect(result.comeback).toBeGreaterThan(0);
		}
	});
});
