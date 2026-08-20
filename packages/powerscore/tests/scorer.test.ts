import {
	leagueConfigs,
	leagueConfigMap,
	scorerTunables,
	scoreMaxCloseness,
	scoreMaxLateGame,
	scoreMaxMomentum,
	scoreMaxLeadChanges,
	scoreMaxComeback,
	scoreMaxTotal,
	scoreWinProbVarianceMax,
	sportTypeConfigMap,
	stallPenaltySteps,
} from '../src/constants';
import { computePowerScore, computeScoringOpportunityBoost, computeWinProbVarianceScore, isPlayFrozen, normalizePowerScoreResult } from '../src/scorer';
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
			closeness: 50,
			lateGame: 100,
			momentum: -1,
			leadChanges: 99,
			comeback: 25,
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
			signalsSubtotal: 100,
			favoriteBonus: 20,
			favoriteTeamCount: 2,
			total: 120,
			reason: 'favorite bonus',
		}, { allowTotalOverflow: true });

		expect(normalized.total).toBe(120);
		expect(normalized.signalsSubtotal).toBe(100);
		expect(normalized.favoriteBonus).toBe(20);
		expect(normalized.favoriteTeamCount).toBe(2);
	});

	test('passes through gameBoost field when overflow is allowed', () => {
		const normalized = normalizePowerScoreResult({
			gameId: 'boost-test',
			closeness: 30,
			lateGame: 30,
			momentum: 20,
			leadChanges: 12,
			comeback: 8,
			signalsSubtotal: 100,
			favoriteBonus: 0,
			favoriteTeamCount: 0,
			gameBoost: 25,
			total: 125,
			reason: 'late game, game boost (+25)',
		}, { allowTotalOverflow: true });

		expect(normalized.total).toBe(125);
		expect(normalized.gameBoost).toBe(25);
		expect(normalized.signalsSubtotal).toBe(100);
	});

	test('stacks favoriteBonus and gameBoost correctly with overflow', () => {
		const normalized = normalizePowerScoreResult({
			gameId: 'stacked-boost',
			closeness: 30,
			lateGame: 30,
			momentum: 20,
			leadChanges: 12,
			comeback: 8,
			signalsSubtotal: 100,
			favoriteBonus: 10,
			favoriteTeamCount: 1,
			gameBoost: 15,
			total: 125,
			reason: 'favorite bonus (+10), game boost (+15)',
		}, { allowTotalOverflow: true });

		expect(normalized.total).toBe(125);
		expect(normalized.favoriteBonus).toBe(10);
		expect(normalized.gameBoost).toBe(15);
	});

	test('passes through postseasonBoost when provided with overflow', () => {
		const normalized = normalizePowerScoreResult({
			gameId: 'postseason-test',
			closeness: 25,
			lateGame: 20,
			momentum: 15,
			leadChanges: 10,
			comeback: 6,
			signalsSubtotal: 76,
			favoriteBonus: 0,
			favoriteTeamCount: 0,
			gameBoost: 0,
			postseasonBoost: 5,
			total: 81,
			reason: 'postseason (+5)',
		}, { allowTotalOverflow: true });

		expect(normalized.total).toBe(81);
		expect(normalized.postseasonBoost).toBe(5);
		expect(normalized.signalsSubtotal).toBe(76);
	});

	test('postseasonBoost is absent when not provided', () => {
		const normalized = normalizePowerScoreResult({
			gameId: 'no-postseason',
			closeness: 20,
			lateGame: 10,
			momentum: 5,
			leadChanges: 0,
			comeback: 0,
			total: 35,
			reason: 'best game available',
		});

		expect(normalized.postseasonBoost).toBeUndefined();
	});

	test('clamps negative postseasonBoost to zero', () => {
		const normalized = normalizePowerScoreResult({
			gameId: 'negative-postseason',
			closeness: 20,
			lateGame: 10,
			momentum: 5,
			leadChanges: 0,
			comeback: 0,
			postseasonBoost: -3,
			total: 35,
			reason: 'postseason',
		}, { allowTotalOverflow: true });

		expect(normalized.postseasonBoost).toBe(0);
	});

	test('rounds fractional postseasonBoost to nearest integer', () => {
		const normalized = normalizePowerScoreResult({
			gameId: 'fractional-postseason',
			closeness: 20,
			lateGame: 10,
			momentum: 5,
			leadChanges: 0,
			comeback: 0,
			postseasonBoost: 4.7,
			total: 40,
			reason: 'postseason',
		}, { allowTotalOverflow: true });

		expect(normalized.postseasonBoost).toBe(5);
	});

	test('stacks postseasonBoost alongside favoriteBonus and gameBoost with overflow', () => {
		const normalized = normalizePowerScoreResult({
			gameId: 'all-bonuses',
			closeness: 30,
			lateGame: 25,
			momentum: 20,
			leadChanges: 15,
			comeback: 10,
			signalsSubtotal: 100,
			favoriteBonus: 10,
			favoriteTeamCount: 1,
			gameBoost: 8,
			postseasonBoost: 5,
			total: 123,
			reason: 'favorite bonus (+10), game boost (+8), postseason (+5)',
		}, { allowTotalOverflow: true });

		expect(normalized.total).toBe(123);
		expect(normalized.favoriteBonus).toBe(10);
		expect(normalized.gameBoost).toBe(8);
		expect(normalized.postseasonBoost).toBe(5);
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

	test('returns zeroed score for delayed games', () => {
		const game = makeGame({ delayed: true });
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

	test('flags halftime, intermissions and delays as frozen play', () => {
		expect(isPlayFrozen(makeGame())).toBe(false);
		expect(isPlayFrozen(makeGame({ intermission: true }))).toBe(true);
		expect(isPlayFrozen(makeGame({ delayed: true }))).toBe(true);
		expect(isPlayFrozen(makeGame({ intermission: false, delayed: false }))).toBe(false);
	});

	test('a delayed game never out-scores the same game while live', () => {
		const history = makeHistory([[80, 78], [82, 78], [84, 78]]);
		const live = computePowerScore(makeGame(), history);
		const delayed = computePowerScore(makeGame({ delayed: true }), history);

		expect(live.total).toBeGreaterThan(0);
		expect(delayed.total).toBe(0);
	});

	test('scores 0-0 with sport-specific period caveats', () => {
		const basketball = makeGame({
			league: 'nba',
			sportType: 'basketball',
			homeTeam: { ...makeGame().homeTeam, score: 0 },
			awayTeam: { ...makeGame().awayTeam, score: 0 },
		});
		const earlyHockey = makeGame({
			league: 'nhl',
			sportType: 'hockey',
			period: 2,
			clockSeconds: 600,
			homeTeam: { ...makeGame().homeTeam, score: 0 },
			awayTeam: { ...makeGame().awayTeam, score: 0 },
		});
		const lateHockey = makeGame({
			league: 'nhl',
			sportType: 'hockey',
			period: 3,
			clockSeconds: 600,
			homeTeam: { ...makeGame().homeTeam, score: 0 },
			awayTeam: { ...makeGame().awayTeam, score: 0 },
		});
		const earlySoccer = makeGame({
			league: 'mls',
			sportType: 'soccer',
			period: 1,
			clockSeconds: 1_000,
			homeTeam: { ...makeGame().homeTeam, score: 0 },
			awayTeam: { ...makeGame().awayTeam, score: 0 },
		});
		const lateSoccer = makeGame({
			league: 'mls',
			sportType: 'soccer',
			period: 2,
			clockSeconds: 2_500,
			homeTeam: { ...makeGame().homeTeam, score: 0 },
			awayTeam: { ...makeGame().awayTeam, score: 0 },
		});

		const basketballResult = computePowerScore(basketball, []);
		const earlyHockeyResult = computePowerScore(earlyHockey, []);
		const lateHockeyResult = computePowerScore(lateHockey, []);
		const earlySoccerResult = computePowerScore(earlySoccer, []);
		const lateSoccerResult = computePowerScore(lateSoccer, []);

		// Closeness is progress-scaled, so the assertion is on tier ordering, not raw tier values.
		expect(basketballResult.closeness).toBeGreaterThan(0);
		expect(earlyHockeyResult.closeness).toBeGreaterThan(0);
		expect(lateHockeyResult.closeness).toBeGreaterThan(earlyHockeyResult.closeness);
		expect(lateSoccerResult.closeness).toBeGreaterThan(earlySoccerResult.closeness);
		expect(earlyHockeyResult.reason).toBe(scorerTunables.reasons.tied);
		expect(lateHockeyResult.reason).toContain(scorerTunables.reasons.tied);
	});

	test('applies basketball closeness thresholds at boundary margins', () => {
		// Reason classification keys off the raw tier; the value is progress-scaled, so at period 1
		// every active tier sits near its floor and only the ordering is meaningful.
		const cases = [
			{ margin: 5, expectedReason: '5-point game', positive: true },
			{ margin: 6, expectedReason: '6-point game', positive: true },
			{ margin: 10, expectedReason: '10-point game', positive: true },
			{ margin: 11, expectedReason: scorerTunables.reasons.fallback, positive: true },
			{ margin: 18, expectedReason: scorerTunables.reasons.fallback, positive: true },
			{ margin: 19, expectedReason: scorerTunables.reasons.fallback, positive: false },
		];

		let previousCloseness = Number.POSITIVE_INFINITY;
		for (const { margin, expectedReason, positive } of cases) {
			const game = makeGame({
				period: 1,
				clockSeconds: 600,
				homeTeam: { ...makeGame().homeTeam, score: 90 },
				awayTeam: { ...makeGame().awayTeam, score: 90 - margin },
			});

			const result = computePowerScore(game, []);
			expect(result.reason).toBe(expectedReason);
			expect(result.closeness).toBeLessThanOrEqual(previousCloseness);
			if (positive) expect(result.closeness).toBeGreaterThan(0);
			else expect(result.closeness).toBe(0);
			previousCloseness = result.closeness;
		}
	});

	test('closeness ramps with game progress (early ties score far below late ties)', () => {
		const tiedAt = (period: number, clockSeconds: number) => makeGame({
			period,
			clockSeconds,
			homeTeam: { ...makeGame().homeTeam, score: 50 },
			awayTeam: { ...makeGame().awayTeam, score: 50 },
		});

		const earlyTie = computePowerScore(tiedAt(1, 700), []);
		const lateTie = computePowerScore(tiedAt(4, 30), []);

		expect(earlyTie.closeness).toBeGreaterThan(0);
		expect(earlyTie.closeness).toBeLessThanOrEqual(20);
		expect(lateTie.closeness).toBeGreaterThan(earlyTie.closeness);
		expect(lateTie.closeness).toBeLessThanOrEqual(scoreMaxCloseness);
	});

	test('builds a monotonic whole-period late-game ramp for countdown sports', () => {
		const withClock = (period: number, clockSeconds: number) => makeGame({
			period,
			clockSeconds,
			homeTeam: { ...makeGame().homeTeam, score: 110 },
			awayTeam: { ...makeGame().awayTeam, score: 103 },
		});

		const firstHalf = computePowerScore(withClock(1, 300), []);     // before previous period → none
		const prevStart = computePowerScore(withClock(3, 720), []);     // start of Q3 → touch ramp at 0
		const prevEnd = computePowerScore(withClock(3, 1), []);         // end of Q3 → top of the touch
		const finalStart = computePowerScore(withClock(4, 720), []);    // start of Q4
		const finalMid = computePowerScore(withClock(4, 360), []);      // mid Q4
		const finalEnd = computePowerScore(withClock(4, 1), []);        // buzzer

		expect(firstHalf.lateGame).toBe(0);
		expect(prevStart.lateGame).toBe(0);
		expect(prevEnd.lateGame).toBeGreaterThan(prevStart.lateGame);
		expect(finalStart.lateGame).toBeGreaterThanOrEqual(prevEnd.lateGame);
		expect(finalMid.lateGame).toBeGreaterThan(finalStart.lateGame);
		expect(finalEnd.lateGame).toBeGreaterThan(finalMid.lateGame);
		expect(finalEnd.lateGame).toBeGreaterThanOrEqual(Math.ceil(scoreMaxLateGame * 0.8));
		expect(finalEnd.lateGame).toBeLessThanOrEqual(scorerTunables.scores.lateGame.closeCeiling);
		expect(finalMid.reason).toContain('min left');
	});

	test('late-game ramp is near-linear across the final period (no end spike)', () => {
		const { closeCeiling, finalPeriodStart } = scorerTunables.scores.lateGame;
		const sample = (fraction: number) => computePowerScore(makeGame({
			period: 4,
			clockSeconds: Math.round(720 * (1 - fraction)),
			homeTeam: { ...makeGame().homeTeam, score: 110 }, // tight (7-pt) + non-tied → closeCeiling, no OT pre-boost
			awayTeam: { ...makeGame().awayTeam, score: 103 },
		}), []).lateGame;

		const points = [0, 0.25, 0.5, 0.75, 1].map(sample);
		expect(points[0]).toBe(finalPeriodStart);
		expect(points[4]).toBe(closeCeiling);

		const deltas = points.slice(1).map((value, index) => value - points[index]!);
		const expectedStep = (closeCeiling - finalPeriodStart) / 4;
		for (const delta of deltas) {
			// Within ~1.5 points of a perfectly linear step, so there is no back-loaded spike.
			expect(Math.abs(delta - expectedStep)).toBeLessThanOrEqual(1.5);
		}
	});

	test('builds a monotonic whole-period late-game ramp for count-up sports', () => {
		const withElapsed = (period: number, clockSeconds: number) => makeGame({
			league: 'mls',
			sportType: 'soccer',
			period,
			clockSeconds,
			homeTeam: { ...makeGame().homeTeam, score: 2 }, // close + non-tied → factor 1, no OT pre-boost
			awayTeam: { ...makeGame().awayTeam, score: 1 },
		});

		const prevStart = computePowerScore(withElapsed(1, 0), []);         // kickoff, 1st half (0')
		const prevEnd = computePowerScore(withElapsed(1, 2_700), []);       // end of 1st half (45')
		const finalStart = computePowerScore(withElapsed(2, 2_700), []);    // start of 2nd half (45')
		const finalMid = computePowerScore(withElapsed(2, 4_050), []);      // mid 2nd half (67.5')
		const finalEnd = computePowerScore(withElapsed(2, 5_399), []);      // stoppage (89.98')

		expect(prevStart.lateGame).toBe(0);
		expect(prevEnd.lateGame).toBeGreaterThan(prevStart.lateGame);
		expect(finalStart.lateGame).toBeGreaterThanOrEqual(prevEnd.lateGame);
		expect(finalMid.lateGame).toBeGreaterThan(finalStart.lateGame);
		expect(finalEnd.lateGame).toBeGreaterThan(finalMid.lateGame);
		expect(finalEnd.lateGame).toBeGreaterThanOrEqual(Math.ceil(scoreMaxLateGame * 0.8));
		expect(finalEnd.lateGame).toBeLessThanOrEqual(scorerTunables.scores.lateGame.closeCeiling);
		expect(finalMid.reason).toContain('min left');
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

	test('every clock league ramps the whole final period up to the close ceiling', () => {
		const representativeLeagueIds = ['nba', 'nhl', 'nfl', 'mls'] as const;
		const { closeCeiling } = scorerTunables.scores.lateGame;

		for (const leagueId of representativeLeagueIds) {
			const league = leagueConfigMap[leagueId];
			const sportConfig = sportTypeConfigMap[league.sportType];
			const toClockSeconds = (secsRemaining: number): number => {
				if (sportConfig.clockCountsUp) {
					const inPeriodElapsed = Math.max(0, league.periodDurationSecs - secsRemaining);
					const priorPeriodsOffset = sportConfig.clockIsFullGameElapsed
						? (league.regularPeriods - 1) * league.periodDurationSecs
						: 0;
					return priorPeriodsOffset + inPeriodElapsed;
				}
				return secsRemaining;
			};
			const inFinalPeriod = (secsRemaining: number) => makeGame({
				league: league.id,
				sportType: league.sportType,
				period: league.regularPeriods,
				clockSeconds: toClockSeconds(secsRemaining),
				homeTeam: { ...makeGame().homeTeam, score: 3 }, // close (≤ every sport's tier-2) + non-tied
				awayTeam: { ...makeGame().awayTeam, score: 2 },
			});

			const startFinal = computePowerScore(inFinalPeriod(league.periodDurationSecs), []);
			const midFinal = computePowerScore(inFinalPeriod(Math.floor(league.periodDurationSecs / 2)), []);
			const endFinal = computePowerScore(inFinalPeriod(1), []);

			expect(midFinal.lateGame).toBeGreaterThan(startFinal.lateGame);
			expect(endFinal.lateGame).toBeGreaterThan(midFinal.lateGame);
			expect(endFinal.lateGame).toBe(closeCeiling);
		}
	});

	test('ramps baseball late-game across regulation innings up to the close ceiling', () => {
		const { closeCeiling, finalPeriodStart } = scorerTunables.scores.lateGame;
		const withInning = (period: number) => makeGame({
			league: 'mlb',
			sportType: 'baseball',
			period,
			clockSeconds: 0,
			homeTeam: { ...makeGame().homeTeam, score: 4 },
			awayTeam: { ...makeGame().awayTeam, score: 1 },  // 3-run lead: margin=3 ≤ t2=3 → closeCeiling
		});

		const fifth = computePowerScore(withInning(5), []);   // before regulation pressure window
		const sixth = computePowerScore(withInning(6), []);   // ramp starts
		const eighth = computePowerScore(withInning(8), []);
		const ninth = computePowerScore(withInning(9), []);

		expect(fifth.lateGame).toBe(0);
		expect(sixth.lateGame).toBe(finalPeriodStart);
		expect(eighth.lateGame).toBeGreaterThan(sixth.lateGame);
		expect(ninth.lateGame).toBe(closeCeiling);
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

	test('scores a tense tied late regulation game high but below max', () => {
		const game = makeGame({
			period: 4,
			clockSeconds: 10,
			homeTeam: { abbreviation: 'HOM', score: 78 },
			awayTeam: { abbreviation: 'AWY', score: 78 },
		});
		const history = makeHistory([
			[70, 65],
			[72, 73],
			[75, 76],
		]);

		const result = computePowerScore(game, history);
		expect(result.total).toBeGreaterThanOrEqual(78);
		expect(result.lateGame).toBe(scoreMaxLateGame); // OT pre-boost pushes a tied buzzer to the cap
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
		expect(result.reason).toContain('HOM outscoring AWY 10-0');
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
		expect(smallRun.reason).toBe('HOM on a roll');

		const bigRun = computePowerScore(game, makeHistory([[90, 60], [95, 60], [100, 60]]));
		expect(bigRun.momentum).toBe(scorerTunables.scores.momentum.bigRun);
		expect(bigRun.reason).toBe('HOM outscoring AWY 10-0');
	});

	test('orders reasons by momentum then late game and truncates extra reasons', () => {
		const game = makeGame({
			period: 4,
			clockSeconds: 119,
			homeTeam: { abbreviation: 'HOM', score: 80 },
			awayTeam: { abbreviation: 'AWY', score: 78 },
		});
		const history = makeHistory([[60, 56], [65, 56], [70, 56]]);

		const result = computePowerScore(game, history);
		expect(result.reason).toBe('HOM outscoring AWY 10-0, under 2 min left');
		expect(result.reason).not.toContain('2-point game');
	});

	test('uses fallback reason when only non-reason scoring signals are present', () => {
		const game = makeGame({
			period: 3,
			clockSeconds: 300,
			homeTeam: { ...makeGame().homeTeam, score: 111 },
			awayTeam: { ...makeGame().awayTeam, score: 100 },
		});
		const history = makeHistory([[100, 90], [103, 93], [106, 96]]);

		const result = computePowerScore(game, history);
		expect(result.closeness).toBe(scorerTunables.scores.closeness.fringe);
		expect(result.lateGame).toBeGreaterThan(0);
		expect(result.lateGame).toBeLessThan(scoreMaxLateGame);
		expect(result.momentum).toBe(scorerTunables.scores.momentum.none);
		expect(result.total).toBe(result.closeness + result.lateGame + result.momentum + result.leadChanges + result.comeback);
		expect(result.reason).toBe(scorerTunables.reasons.fallback);
	});

	test('applies no stall penalty below the first threshold', () => {
		const game = makeGame({
			homeTeam: { ...makeGame().homeTeam, score: 100 },
			awayTeam: { ...makeGame().awayTeam, score: 92 },
			period: 2,
			clockSeconds: 600,
		});

		const lightStep = stallPenaltySteps[stallPenaltySteps.length - 1];
		const result = computePowerScore(game, [], (lightStep?.minPolls ?? 8) - 1);
		expect(result.stalled).toBe(false);
		expect(result.stallPenalty).toBe(0);
		expect(result.total).toBe(result.closeness + result.lateGame + result.momentum + result.leadChanges + result.comeback);
	});

	test('applies light stall penalty at the first step threshold', () => {
		const game = makeGame({
			homeTeam: { ...makeGame().homeTeam, score: 100 },
			awayTeam: { ...makeGame().awayTeam, score: 92 },
			period: 2,
			clockSeconds: 600,
		});

		const lightStep = stallPenaltySteps[stallPenaltySteps.length - 1];
		if (!lightStep) return;
		const raw = computePowerScore(game, [], lightStep.minPolls - 1);
		const stalled = computePowerScore(game, [], lightStep.minPolls);
		expect(stalled.stalled).toBe(true);
		expect(stalled.total).toBe(Math.max(0, raw.total - lightStep.deduction));
		expect(stalled.signalsSubtotal).toBe(raw.total);
		expect(stalled.stallPenalty).toBe(lightStep.deduction);
	});

	test('applies heavy stall penalty at the highest step threshold', () => {
		const game = makeGame({
			homeTeam: { ...makeGame().homeTeam, score: 100 },
			awayTeam: { ...makeGame().awayTeam, score: 92 },
			period: 2,
			clockSeconds: 600,
		});

		const heavyStep = stallPenaltySteps[0];
		if (!heavyStep) return;
		const raw = computePowerScore(game, [], 0);
		const stalled = computePowerScore(game, [], heavyStep.minPolls);
		expect(stalled.stalled).toBe(true);
		expect(stalled.total).toBe(Math.max(0, raw.total - heavyStep.deduction));
		expect(stalled.signalsSubtotal).toBe(raw.total);
		expect(stalled.stallPenalty).toBe(heavyStep.deduction);
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

		const noChange = computePowerScore(game, makeHistory([[50, 48], [52, 48], [54, 50]]));
		expect(noChange.leadChanges).toBe(scorerTunables.scores.leadChanges.none);

		// The flip lands on the latest snapshot, so the tier value is undecayed.
		const singleChange = computePowerScore(
			makeGame({ homeTeam: { abbreviation: 'HOM', score: 50 }, awayTeam: { abbreviation: 'AWY', score: 51 } }),
			makeHistory([[50, 48], [51, 50], [50, 51]]),
		);
		expect(singleChange.leadChanges).toBe(scorerTunables.scores.leadChanges.single);
		expect(singleChange.reason).toContain(scorerTunables.reasons.leadChangeSingle);

		const multiChange = computePowerScore(
			makeGame({ homeTeam: { abbreviation: 'HOM', score: 60 }, awayTeam: { abbreviation: 'AWY', score: 58 } }),
			makeHistory([[50, 48], [50, 52], [54, 52], [54, 56], [60, 58]]),
		);
		expect(multiChange.leadChanges).toBe(scorerTunables.scores.leadChanges.multiple);
		expect(multiChange.reason).toContain(scorerTunables.reasons.leadChangeMultiple);
	});

	test('scores comeback: none, moderate, and big', () => {
		const noComeback = computePowerScore(
			makeGame({ homeTeam: { ...makeGame().homeTeam, score: 90 }, awayTeam: { ...makeGame().awayTeam, score: 80 } }),
			makeHistory([[80, 70], [84, 74], [90, 80]]),
		);
		expect(noComeback.comeback).toBe(scorerTunables.scores.comeback.none);

		// Comeback is progress-scaled, so this uses a near-buzzer game where the floored value reaches
		// the tier ceiling and the shrink lands undecayed on the latest snapshot.
		const moderateComeback = computePowerScore(
			makeGame({ period: 4, clockSeconds: 1, homeTeam: { ...makeGame().homeTeam, score: 89 }, awayTeam: { ...makeGame().awayTeam, score: 84 } }),
			makeHistory([[80, 70], [83, 75], [89, 84]]),
		);
		expect(moderateComeback.comeback).toBe(scorerTunables.scores.comeback.moderate);
		expect(moderateComeback.reason).toContain('closing the gap');

		const bigComeback = computePowerScore(
			makeGame({ period: 4, clockSeconds: 1, homeTeam: { ...makeGame().homeTeam, score: 90 }, awayTeam: { ...makeGame().awayTeam, score: 88 } }),
			makeHistory([[80, 70], [84, 74], [90, 88]]),
		);
		expect(bigComeback.comeback).toBe(scorerTunables.scores.comeback.big);
		expect(bigComeback.reason).toContain('cutting into it');
	});

	test('reason priority: momentum > comeback > leadChanges > lateGame > closeness', () => {
		// Momentum also fires here, so it takes the first reason slot and comeback the second.
		const game = makeGame({
			period: 2,
			clockSeconds: 600,
			homeTeam: { ...makeGame().homeTeam, score: 84 },
			awayTeam: { ...makeGame().awayTeam, score: 84 },
		});
		const history = makeHistory([[80, 70], [81, 75], [84, 84]]);
		const result = computePowerScore(game, history);
		expect(result.comeback).toBeGreaterThan(0);
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

describe('PowerScore v2 — live-action decay & overtime anticipation', () => {
	const runGame = (overrides: Partial<Game> = {}) => makeGame({
		period: 1,
		clockSeconds: 720,
		homeTeam: { abbreviation: 'HOM', score: 68 },
		awayTeam: { abbreviation: 'AWY', score: 60 },
		...overrides,
	});

	test('momentum fades as the scoring run ages (≈half a basketball half-life out)', () => {
		// All three share the same 8-0 run and differ only in how long ago it happened. Basketball's
		// momentum half-life is 45s.
		const fresh = computePowerScore(runGame(), makeHistory([[60, 60], [64, 60], [68, 60]]));
		const oneHalfLife = computePowerScore(runGame(), makeHistory([[60, 60], [68, 60], [68, 60], [68, 60], [68, 60]]));
		const stale = computePowerScore(runGame(), makeHistory([[60, 60], [68, 60], [68, 60], [68, 60], [68, 60], [68, 60], [68, 60]]));

		expect(fresh.momentum).toBe(scorerTunables.scores.momentum.bigRun);
		expect(oneHalfLife.momentum).toBeLessThan(fresh.momentum);
		expect(stale.momentum).toBeLessThan(oneHalfLife.momentum);
		expect(stale.momentum).toBeGreaterThan(0);
		expect(oneHalfLife.momentum).toBeGreaterThanOrEqual(Math.round(scorerTunables.scores.momentum.bigRun * 0.5) - 1);
		expect(oneHalfLife.momentum).toBeLessThanOrEqual(Math.round(scorerTunables.scores.momentum.bigRun * 0.5) + 1);
	});

	test('low-scoring sports retain a scoring spike longer than basketball', () => {
		// Identical run and age; only the sport-scaled half-life differs.
		const agedHistory = makeHistory([[5, 5], [13, 5], [13, 5]]);
		const basketball = computePowerScore(
			makeGame({ league: 'nba', sportType: 'basketball', period: 1, clockSeconds: 720, homeTeam: { abbreviation: 'HOM', score: 13 }, awayTeam: { abbreviation: 'AWY', score: 5 } }),
			agedHistory,
		);
		const hockey = computePowerScore(
			makeGame({ league: 'nhl', sportType: 'hockey', period: 1, clockSeconds: 1_200, homeTeam: { abbreviation: 'HOM', score: 13 }, awayTeam: { abbreviation: 'AWY', score: 5 } }),
			agedHistory,
		);

		expect(hockey.momentum).toBeGreaterThan(basketball.momentum);
		expect(basketball.momentum).toBeGreaterThan(0);
	});

	test('a fully faded signal stops appearing in the headline reason', () => {
		// A big run long in the past with nothing since decays to 0, which clears its reason too.
		const longQuiet = makeHistory([[10, 10], [30, 10], ...Array.from({ length: 20 }, () => [30, 10] as [number, number])]);
		const result = computePowerScore(
			makeGame({ league: 'nba', sportType: 'basketball', period: 1, clockSeconds: 720, homeTeam: { abbreviation: 'HOM', score: 30 }, awayTeam: { abbreviation: 'AWY', score: 10 } }),
			longQuiet,
		);
		expect(result.momentum).toBe(0);
		expect(result.reason).not.toContain('run');
	});

	test('tied games earn a ramping OT pre-boost in the final minute', () => {
		const tiedAt = (clockSeconds: number) => computePowerScore(makeGame({
			period: 4,
			clockSeconds,
			homeTeam: { abbreviation: 'HOM', score: 100 },
			awayTeam: { abbreviation: 'AWY', score: 100 },
		}), []);
		const nonTiedBuzzer = computePowerScore(makeGame({
			period: 4,
			clockSeconds: 1,
			homeTeam: { abbreviation: 'HOM', score: 100 },
			awayTeam: { abbreviation: 'AWY', score: 98 },
		}), []);

		const tied60 = tiedAt(60);
		const tied30 = tiedAt(30);
		const tied1 = tiedAt(1);

		expect(tied30.lateGame).toBeGreaterThan(tied60.lateGame);
		expect(tied1.lateGame).toBeGreaterThan(tied30.lateGame);
		expect(tied1.lateGame).toBe(scoreMaxLateGame);
		expect(tied1.reason).toContain(scorerTunables.reasons.overtimeAnticipation);
		// A non-tied buzzer caps at the close ceiling, so OT-bound games separate from it.
		expect(nonTiedBuzzer.lateGame).toBe(scorerTunables.scores.lateGame.closeCeiling);
		expect(tied1.lateGame).toBeGreaterThan(nonTiedBuzzer.lateGame);
	});

	test('no OT pre-boost for clockless baseball extra innings (jumps straight to overtime)', () => {
		const extraInnings = computePowerScore(makeGame({
			league: 'mlb',
			sportType: 'baseball',
			period: 10,
			clockSeconds: 0,
			homeTeam: { abbreviation: 'HOM', score: 3 },
			awayTeam: { abbreviation: 'AWY', score: 3 },
		}), []);
		expect(extraInnings.lateGame).toBe(scorerTunables.scores.lateGame.overtime);
	});

	test('history shorter than three snapshots yields no live-action signals', () => {
		const game = makeGame({ period: 2, clockSeconds: 400, homeTeam: { abbreviation: 'HOM', score: 70 }, awayTeam: { abbreviation: 'AWY', score: 60 } });
		for (const history of [[], makeHistory([[60, 60]]), makeHistory([[60, 60], [68, 60]])]) {
			const result = computePowerScore(game, history);
			expect(result.momentum).toBe(0);
			expect(result.leadChanges).toBe(0);
			expect(result.comeback).toBe(0);
		}
	});
});

describe('PowerScore calibration targets', () => {
	test('tied buzzer with no history scores ≥ 78 (closeness+lateGame floor)', () => {
		const game = makeGame({
			period: 4,
			clockSeconds: 1,
			homeTeam: { abbreviation: 'HOM', score: 100 },
			awayTeam: { abbreviation: 'AWY', score: 100 },
		});
		const result = computePowerScore(game, []);
		expect(result.total).toBeGreaterThanOrEqual(78);
	});

	test('1-pt game final minute with no history scores ≥ 63', () => {
		const game = makeGame({
			period: 4,
			clockSeconds: 30,
			homeTeam: { abbreviation: 'HOM', score: 100 },
			awayTeam: { abbreviation: 'AWY', score: 99 },
		});
		const result = computePowerScore(game, []);
		expect(result.total).toBeGreaterThanOrEqual(63);
	});

	test('stall penalty is a flat deduction, not a fraction of the original score', () => {
		// High-scoring enough that the base total exceeds the heaviest deduction.
		const game = makeGame({
			period: 4,
			clockSeconds: 120,
			homeTeam: { abbreviation: 'HOM', score: 100 },
			awayTeam: { abbreviation: 'AWY', score: 98 },
		});

		const rawA = computePowerScore(game, [], 0);
		const lightDeduction = stallPenaltySteps[stallPenaltySteps.length - 1]!.deduction;
		const heavyDeduction = stallPenaltySteps[0]!.deduction;
		const stalledLight = computePowerScore(game, [], stallPenaltySteps[stallPenaltySteps.length - 1]!.minPolls);
		const stalledHeavy = computePowerScore(game, [], stallPenaltySteps[0]!.minPolls);

		expect(rawA.total).toBeGreaterThan(heavyDeduction); // guard: base score exceeds max deduction
		expect(rawA.total - stalledLight.total).toBe(lightDeduction);
		expect(rawA.total - stalledHeavy.total).toBe(heavyDeduction);
	});

	test('blowout (>t3) scores lower lateGame ceiling than a close game in same period', () => {
		const closeGame = makeGame({
			period: 4,
			clockSeconds: 1,
			homeTeam: { abbreviation: 'HOM', score: 100 },
			awayTeam: { abbreviation: 'AWY', score: 99 },
		});
		const blowout = makeGame({
			period: 4,
			clockSeconds: 1,
			homeTeam: { abbreviation: 'HOM', score: 120 },
			awayTeam: { abbreviation: 'AWY', score: 90 },  // 30-pt lead, NBA t3=18 → blowout
		});
		const closeResult = computePowerScore(closeGame, []);
		const blowoutResult = computePowerScore(blowout, []);
		expect(closeResult.lateGame).toBeGreaterThan(blowoutResult.lateGame);
	});

	test('sport-agnostic: close hockey game at buzzer scores ≥ 63', () => {
		const game = makeGame({
			league: 'nhl',
			sportType: 'hockey',
			period: 3,
			clockSeconds: 1,
			homeTeam: { abbreviation: 'HOM', score: 2 },
			awayTeam: { abbreviation: 'AWY', score: 1 },
		});
		const result = computePowerScore(game, []);
		expect(result.total).toBeGreaterThanOrEqual(63);
	});

	test('sport-agnostic: close football game at buzzer scores ≥ 63', () => {
		const game = makeGame({
			league: 'nfl',
			sportType: 'football',
			period: 4,
			clockSeconds: 1,
			homeTeam: { abbreviation: 'HOM', score: 21 },
			awayTeam: { abbreviation: 'AWY', score: 18 },  // 3-pt game
		});
		const result = computePowerScore(game, []);
		expect(result.total).toBeGreaterThanOrEqual(63);
	});
});

const makeBaseballGame = (overrides: Partial<Game> = {}): Game => ({
	id: 'g1', league: 'mlb', sportType: 'baseball',
	homeTeam: { score: 2 }, awayTeam: { score: 1 },
	status: 'in', ...overrides,
});
const makeFootballGame = (overrides: Partial<Game> = {}): Game => ({
	id: 'g1', league: 'nfl', sportType: 'football',
	homeTeam: { score: 7 }, awayTeam: { score: 10 },
	status: 'in', ...overrides,
});

describe('computeScoringOpportunityBoost', () => {

	test('returns 0 for non-live games', () => {
		expect(computeScoringOpportunityBoost(makeBaseballGame({ status: 'pre' }))).toBe(0);
		expect(computeScoringOpportunityBoost(makeBaseballGame({ status: 'post' }))).toBe(0);
	});

	test('returns 0 for baseball with no runners on base', () => {
		expect(computeScoringOpportunityBoost(makeBaseballGame({
			baseRunners: { first: false, second: false, third: false },
		}))).toBe(0);
	});

	test('returns 0 for baseball when baseRunners is undefined', () => {
		expect(computeScoringOpportunityBoost(makeBaseballGame({ baseRunners: undefined }))).toBe(0);
	});

	test('boosts baseball by runner count', () => {
		expect(computeScoringOpportunityBoost(makeBaseballGame({
			baseRunners: { first: true, second: false, third: false },
		}))).toBe(3); // 1 runner
		expect(computeScoringOpportunityBoost(makeBaseballGame({
			baseRunners: { first: true, second: true, third: false },
		}))).toBe(6); // 2 runners
		expect(computeScoringOpportunityBoost(makeBaseballGame({
			baseRunners: { first: true, second: true, third: true },
		}))).toBe(10); // bases loaded
	});

	test('softball also scales with runners', () => {
		const game: Game = { ...makeBaseballGame(), league: 'csoft', sportType: 'softball',
			baseRunners: { first: false, second: true, third: true } };
		expect(computeScoringOpportunityBoost(game)).toBe(6);
	});

	test('returns 0 for delayed games with a frozen scoring opportunity', () => {
		expect(computeScoringOpportunityBoost(makeBaseballGame({
			delayed: true,
			baseRunners: { first: true, second: true, third: true },
		}))).toBe(0);
		expect(computeScoringOpportunityBoost(makeFootballGame({ delayed: true, isRedZone: true }))).toBe(0);
	});

	test('returns 0 during an intermission', () => {
		expect(computeScoringOpportunityBoost(makeBaseballGame({
			intermission: true,
			baseRunners: { first: true, second: true, third: true },
		}))).toBe(0);
		expect(computeScoringOpportunityBoost(makeFootballGame({ intermission: true, isRedZone: true }))).toBe(0);
	});

	test('returns 0 for football when not in red zone', () => {
		expect(computeScoringOpportunityBoost(makeFootballGame({ isRedZone: false }))).toBe(0);
		expect(computeScoringOpportunityBoost(makeFootballGame({ isRedZone: undefined }))).toBe(0);
	});

	test('returns 10 for football in red zone', () => {
		expect(computeScoringOpportunityBoost(makeFootballGame({ isRedZone: true }))).toBe(10);
	});

	// Football's closenessMargins are [3, 9, 14].
	describe('red zone scaling', () => {
		const redZone = (margin: number, extra: Partial<Game> = {}) => computeScoringOpportunityBoost(
			makeFootballGame({ isRedZone: true, awayTeam: { score: 7 + margin }, ...extra }),
		);

		test('pays full value while the game is within two scores', () => {
			expect(redZone(0)).toBe(10);
			expect(redZone(3)).toBe(10); // t1
			expect(redZone(9)).toBe(10); // t2, still a two-score game
		});

		test('pays a reduced value in the fringe band', () => {
			expect(redZone(10)).toBe(5);
			expect(redZone(14)).toBe(5); // t3, the outer edge of live
		});

		test('pays nothing once the game is a blowout', () => {
			expect(redZone(15)).toBe(0);
			expect(redZone(31)).toBe(0);
			// The base is zero before down and distance apply, so they cannot resurrect a blowout.
			expect(redZone(31, { down: 4, isGoalToGo: true })).toBe(0);
		});

		test('weights the snap by down, with 4th-and-goal the highest-leverage case', () => {
			expect(redZone(3, { down: 1, distance: 10 })).toBe(10); // ×1.0
			expect(redZone(3, { down: 2, distance: 4 })).toBe(10); // ×1.0
			expect(redZone(3, { down: 3, distance: 8 })).toBe(10); // 3rd-and-long, ×1.0
			expect(redZone(3, { down: 3, distance: 2 })).toBe(12); // 3rd-and-short, ×1.15 → 11.5
			expect(redZone(3, { down: 4, distance: 5 })).toBe(14); // ×1.35 → 13.5
			expect(redZone(3, { down: 4, distance: 1, isGoalToGo: true })).toBe(15); // ×1.5
		});

		test('scales the down weighting off the reduced fringe base, not the full one', () => {
			expect(redZone(12, { down: 4, isGoalToGo: true })).toBe(8); // 5 × 1.5 = 7.5
			expect(redZone(12, { down: 4, distance: 2 })).toBe(7); // 5 × 1.35 = 6.75
		});

		test('falls back to the unweighted base when ESPN reports no down', () => {
			// A missing down should cost the bonus, not the whole boost.
			expect(redZone(3, { down: undefined })).toBe(10);
			expect(redZone(3, { down: 3, distance: undefined })).toBe(10);
		});

		test('goal-to-go only lifts 4th down, since on early downs it is a scoring odds signal', () => {
			expect(redZone(3, { down: 1, isGoalToGo: true })).toBe(10);
			expect(redZone(3, { down: 2, isGoalToGo: true })).toBe(10);
		});
	});

	test('returns 0 for other sport types', () => {
		const basketball: Game = { id: 'g1', league: 'nba', sportType: 'basketball',
			homeTeam: { score: 80 }, awayTeam: { score: 78 }, status: 'in' };
		expect(computeScoringOpportunityBoost(basketball)).toBe(0);
	});
});

describe('computeWinProbVarianceScore', () => {
	test('returns undefined when fewer than minDataPoints values provided', () => {
		expect(computeWinProbVarianceScore([])).toBeUndefined();
		expect(computeWinProbVarianceScore([0.5, 0.6, 0.4, 0.5])).toBeUndefined();
	});

	test('returns the minimum penalty for a one-sided game (avg distance from 50% ≥ maxAvgDist)', () => {
		const dominated = Array.from({ length: 20 }, () => 0.85);
		expect(computeWinProbVarianceScore(dominated)).toBe(-scoreWinProbVarianceMax);
	});

	test('returns positive score for a contested game close to 50/50', () => {
		const contested = Array.from({ length: 20 }, (_, i) => (i % 2 === 0 ? 0.47 : 0.53));
		const score = computeWinProbVarianceScore(contested);
		expect(score).toBeGreaterThan(0);
		expect(score).toBeLessThanOrEqual(scoreWinProbVarianceMax);
	});

	test('returns the maximum boost for a perfectly contested game (avg distance from 50% = 0)', () => {
		const perfectlyContested = Array.from({ length: 30 }, () => 0.5);
		expect(computeWinProbVarianceScore(perfectlyContested)).toBe(scoreWinProbVarianceMax);
	});

	test('returns 0 at the neutral midpoint (avg distance from 50% = maxAvgDist / 2)', () => {
		// avg|p−0.5| lands at exactly maxAvgDist/2, which maps to 0.
		const neutral = Array.from({ length: 30 }, (_, i) => (i % 2 === 0 ? 0.325 : 0.675));
		const score = computeWinProbVarianceScore(neutral);
		expect(score).toBeGreaterThanOrEqual(-1);
		expect(score).toBeLessThanOrEqual(1);
	});

	test('clamps the result to the configured five-point range', () => {
		const score = computeWinProbVarianceScore([0, 0, 0, 1, 1, 1, 0, 1, 0, 1]);
		expect(score).toBeGreaterThanOrEqual(-scoreWinProbVarianceMax);
		expect(score).toBeLessThanOrEqual(scoreWinProbVarianceMax);
	});

	test('close game near 50/50 earns a boost', () => {
		const close = [0.51, 0.52, 0.50, 0.51, 0.49, 0.50, 0.52, 0.51, 0.50, 0.49];
		const score = computeWinProbVarianceScore(close);
		expect(score).toBeGreaterThan(0);
	});
});

describe('computePowerScore — win probability volatility boost/penalty integration', () => {
	const baseGame = makeGame({
		period: 3,
		clockSeconds: 300,
		homeTeam: { abbreviation: 'HOM', score: 80 },
		awayTeam: { abbreviation: 'AWY', score: 78 },
	});
	const shortHistory = makeHistory([[78, 76], [79, 77], [80, 78]]);

	test('omits winProbabilityVariance from result when no win prob history is supplied', () => {
		const result = computePowerScore(baseGame, shortHistory, 0, []);
		expect(result.winProbabilityVariance).toBeUndefined();
	});

	test('omits winProbabilityVariance when history is shorter than minDataPoints', () => {
		const result = computePowerScore(baseGame, shortHistory, 0, [0.5, 0.6]);
		expect(result.winProbabilityVariance).toBeUndefined();
	});

	test('includes winProbabilityVariance when sufficient win prob history is supplied', () => {
		// Alternating far from the middle averages out to maxAvgDist, clamping to the full penalty.
		const winProb = Array.from({ length: 20 }, (_, i) => (i % 2 === 0 ? 0.15 : 0.85));
		const result = computePowerScore(baseGame, shortHistory, 0, winProb);
		expect(result.winProbabilityVariance).toBeDefined();
		expect(result.winProbabilityVariance).toBeLessThan(0);
	});

	test('close-to-50% game has a higher total than a one-sided game (other signals equal)', () => {
		const contestedProb = Array.from({ length: 30 }, () => 0.5);     // avg dist = 0 → +max
		const dominatedProb = Array.from({ length: 30 }, () => 0.8);     // avg dist = 0.3 → negative
		const contestedResult = computePowerScore(baseGame, shortHistory, 0, contestedProb);
		const dominatedResult = computePowerScore(baseGame, shortHistory, 0, dominatedProb);
		expect(contestedResult.total).toBeGreaterThan(dominatedResult.total);
	});

	test('signalsSubtotal holds pure signals subtotal, unaffected by variance', () => {
		const winProb = Array.from({ length: 20 }, () => 0.8); // stable → variance penalty
		const result = computePowerScore(baseGame, shortHistory, 0, winProb);
		const signalsSubtotal = result.closeness + result.lateGame + result.momentum + result.leadChanges + result.comeback;
		expect(result.signalsSubtotal).toBe(signalsSubtotal);
		expect(result.winProbabilityVariance).toBeDefined();
		expect(result.total).toBe(signalsSubtotal + (result.winProbabilityVariance ?? 0));
	});

	test('win prob volatility does not appear in reason string', () => {
		const winProb = Array.from({ length: 20 }, (_, i) => (i % 2 === 0 ? 0.2 : 0.8));
		const result = computePowerScore(baseGame, shortHistory, 0, winProb);
		expect(result.reason).not.toContain('variance');
	});
});

describe('normalizePowerScoreResult — winProbabilityVariance', () => {
	test('stores winProbabilityVariance as a standalone field separate from signals', () => {
		const result = normalizePowerScoreResult({
			gameId: 'test',
			closeness: 20,
			lateGame: 10,
			momentum: 5,
			leadChanges: 0,
			comeback: 0,
			winProbabilityVariance: 4,
			total: 39,
			reason: 'test',
		});
		expect(result.winProbabilityVariance).toBe(4);
		expect(result.total).toBe(39);
	});

	test('clamps winProbabilityVariance to the configured max', () => {
		const high = normalizePowerScoreResult({ gameId: 'g', winProbabilityVariance: 15, total: 50, reason: '' });
		const low = normalizePowerScoreResult({ gameId: 'g', winProbabilityVariance: -15, total: 50, reason: '' });
		expect(high.winProbabilityVariance).toBe(scoreWinProbVarianceMax);
		expect(low.winProbabilityVariance).toBe(-scoreWinProbVarianceMax);
	});

	test('omits winProbabilityVariance from result when not provided', () => {
		const result = normalizePowerScoreResult({ gameId: 'g', total: 30, reason: '' });
		expect(result.winProbabilityVariance).toBeUndefined();
	});
});

describe('computePowerScore — a missing clock means unknown, not 0:00', () => {
	const nbaFinalPeriod = (clockSeconds?: number): Game => makeGame({
		period: 4,
		clockSeconds,
		homeTeam: { abbreviation: 'HOM', score: 100 },
		awayTeam: { abbreviation: 'AWY', score: 99 },
	});

	test('countdown sport: an absent clock holds at the period start instead of paying the buzzer', () => {
		const withClock = computePowerScore(nbaFinalPeriod(700), []);
		const withoutClock = computePowerScore(nbaFinalPeriod(undefined), []);

		expect(withoutClock.lateGame).toBe(scorerTunables.scores.lateGame.finalPeriodStart);
		expect(withoutClock.lateGame).toBeLessThan(scoreMaxLateGame);
		expect(withoutClock.total).toBeLessThanOrEqual(withClock.total);
		expect(withoutClock.reason).not.toContain('left');
		expect(withoutClock.reason).not.toContain('0:00');
	});

	test('countdown sport: the clock is still reported when it is known', () => {
		expect(computePowerScore(nbaFinalPeriod(20), []).reason).toContain('0:20 left');
	});

	test('count-up sport: an absent clock does not claim a position in the half', () => {
		const soccerAt = (clockSeconds?: number): Game => makeGame({
			league: 'mls',
			sportType: 'soccer',
			period: 2,
			clockSeconds,
			homeTeam: { abbreviation: 'HOM', score: 2 },
			awayTeam: { abbreviation: 'AWY', score: 1 },
		});
		const withClock = computePowerScore(soccerAt(5_340), []);
		const withoutClock = computePowerScore(soccerAt(undefined), []);

		expect(withClock.lateGame).toBeGreaterThan(withoutClock.lateGame);
		expect(withoutClock.lateGame).toBe(scorerTunables.scores.lateGame.finalPeriodStart);
		expect(withoutClock.reason).not.toContain('min left');
	});

	test('a non-finite clock is treated the same as an absent one', () => {
		const nan = computePowerScore(nbaFinalPeriod(Number.NaN), []);
		expect(nan.lateGame).toBe(scorerTunables.scores.lateGame.finalPeriodStart);
		expect(Number.isFinite(nan.total)).toBe(true);
	});
});

describe('computePowerScore — soccer has no overtime', () => {
	const soccerAt = (period: number, clockSeconds: number, home: number, away: number): Game => makeGame({
		league: 'mls',
		sportType: 'soccer',
		period,
		clockSeconds,
		homeTeam: { abbreviation: 'HOM', score: home },
		awayTeam: { abbreviation: 'AWY', score: away },
	});

	test('calls the two extra-time halves extra time', () => {
		for (const period of [3, 4]) {
			const result = computePowerScore(soccerAt(period, 300, 1, 1), []);
			expect(result.lateGame).toBe(scoreMaxLateGame);
			expect(result.reason).toContain(scorerTunables.reasons.extraTime);
			expect(result.reason).not.toContain(scorerTunables.reasons.overtime);
		}
	});

	test('calls a shootout penalties, the same way the card labels it PENS', () => {
		const result = computePowerScore(soccerAt(5, 0, 1, 1), []);
		expect(result.lateGame).toBe(scoreMaxLateGame);
		expect(result.reason).toContain(scorerTunables.reasons.shootout);
		expect(result.reason).not.toContain(scorerTunables.reasons.overtime);
	});

	test('keeps the pre-boost for a late level match but does not call it overtime-bound', () => {
		const result = computePowerScore(soccerAt(2, 5_390, 1, 1), []);
		expect(result.lateGame).toBe(scoreMaxLateGame);
		expect(result.lateGame).toBeGreaterThan(scorerTunables.scores.lateGame.closeCeiling);
		expect(result.reason).toContain(scorerTunables.reasons.drawAnticipation);
		expect(result.reason).not.toContain(scorerTunables.reasons.overtime);
	});

	test('reports elapsed minutes past 90 rather than a countdown that reached zero', () => {
		const result = computePowerScore(soccerAt(2, 5_640, 2, 1), []);
		expect(result.reason).toContain('94 min in');
		expect(result.reason).not.toContain('0:00');
	});

	test('still calls overtime overtime in the sports that have it', () => {
		const result = computePowerScore(makeGame({
			period: 5,
			clockSeconds: 120,
			homeTeam: { abbreviation: 'HOM', score: 105 },
			awayTeam: { abbreviation: 'AWY', score: 105 },
		}), []);
		expect(result.reason).toContain(scorerTunables.reasons.overtime);
	});
});

describe('computePowerScore — a tie is not a lead change', () => {
	test('counts trailing, level, then ahead as a single lead change', () => {
		const result = computePowerScore(
			makeGame({
				league: 'nfl',
				sportType: 'football',
				period: 4,
				clockSeconds: 600,
				homeTeam: { abbreviation: 'HOM', score: 31 },
				awayTeam: { abbreviation: 'AWY', score: 24 },
			}),
			makeHistory([[17, 24], [24, 24], [31, 24]]),
		);
		expect(result.leadChanges).toBe(scorerTunables.scores.leadChanges.single);
	});

	test('counts ahead, level, then behind as a single lead change', () => {
		const result = computePowerScore(
			makeGame({
				league: 'nhl',
				sportType: 'hockey',
				period: 3,
				clockSeconds: 600,
				homeTeam: { abbreviation: 'HOM', score: 1 },
				awayTeam: { abbreviation: 'AWY', score: 2 },
			}),
			makeHistory([[1, 0], [1, 1], [1, 2]]),
		);
		expect(result.leadChanges).toBe(scorerTunables.scores.leadChanges.single);
	});

	test('counts ahead, level, then ahead again as no lead change at all', () => {
		const result = computePowerScore(
			makeGame({
				league: 'nhl',
				sportType: 'hockey',
				period: 3,
				clockSeconds: 600,
				homeTeam: { abbreviation: 'HOM', score: 2 },
				awayTeam: { abbreviation: 'AWY', score: 1 },
			}),
			makeHistory([[1, 0], [1, 1], [2, 1]]),
		);
		expect(result.leadChanges).toBe(scorerTunables.scores.leadChanges.none);
	});

	test('still counts a genuine back-and-forth as multiple lead changes', () => {
		const result = computePowerScore(
			makeGame({
				homeTeam: { abbreviation: 'HOM', score: 60 },
				awayTeam: { abbreviation: 'AWY', score: 58 },
			}),
			makeHistory([[50, 48], [48, 52], [54, 52], [52, 56], [60, 58]]),
		);
		expect(result.leadChanges).toBe(scorerTunables.scores.leadChanges.multiple);
	});
});

describe('computePowerScore — momentum reasons state what the number supports', () => {
	test('names both scores, because the run value is a differential', () => {
		const result = computePowerScore(
			makeGame({
				homeTeam: { abbreviation: 'BOS', score: 70 },
				awayTeam: { abbreviation: 'LAL', score: 62 },
			}),
			makeHistory([[60, 60], [65, 61], [70, 62]]),
		);
		expect(result.momentum).toBe(scorerTunables.scores.momentum.bigRun);
		expect(result.reason).toContain('BOS outscoring LAL 10-2');
		expect(result.reason).not.toContain('8-0');
	});
});

describe('computePowerScore — non-finite win probability input', () => {
	const game = makeGame({
		period: 4,
		clockSeconds: 30,
		homeTeam: { abbreviation: 'HOM', score: 100 },
		awayTeam: { abbreviation: 'AWY', score: 99 },
	});
	const history = makeHistory([[94, 93], [97, 96], [100, 99]]);

	test('a single NaN cannot hand a stalled game its penalty back', () => {
		const clean = computePowerScore(game, history, 15, []);
		const poisoned = computePowerScore(game, history, 15, [0.5, 0.5, Number.NaN, 0.5, 0.5]);

		expect(clean.stallPenalty).toBe(25);
		expect(poisoned.stallPenalty).toBe(25);
		expect(poisoned.stalled).toBe(true);
		expect(poisoned.total).toBe(clean.total);
		expect(poisoned.total).toBeLessThan(poisoned.signalsSubtotal!);
	});

	test('drops non-finite samples and scores the finite ones that remain', () => {
		const finiteOnly = computeWinProbVarianceScore([0.5, 0.5, 0.5, 0.5, 0.5]);
		expect(computeWinProbVarianceScore([0.5, 0.5, Number.NaN, 0.5, 0.5, 0.5])).toBe(finiteOnly);
	});

	test('returns undefined once too few finite samples are left', () => {
		expect(computeWinProbVarianceScore([0.5, 0.5, Number.NaN, 0.5, 0.5])).toBeUndefined();
		expect(computeWinProbVarianceScore([0.5, Number.POSITIVE_INFINITY, 0.5, 0.5, 0.5])).toBeUndefined();
	});

	test('a non-finite total falls back to the post-penalty subtotal, not the raw signal sum', () => {
		const normalized = normalizePowerScoreResult({
			gameId: 'nan-total',
			total: Number.NaN,
			closeness: 42,
			lateGame: 20,
			momentum: 10,
			leadChanges: 5,
			comeback: 2,
			stalled: true,
			stallPenalty: 25,
			reason: '',
		});
		expect(normalized.total).toBe(54);
	});
});

describe('computePowerScore — leagues the map has never heard of', () => {
	test('scores instead of throwing, the way an unknown sport type does', () => {
		const game: Game = {
			...makeGame({ period: 4, clockSeconds: 60 }),
			league: 'kabaddi' as unknown as Game['league'],
		};
		expect(() => computePowerScore(game, [])).not.toThrow();

		const result = computePowerScore(game, []);
		expect(Number.isFinite(result.total)).toBe(true);
		expect(result.total).toBeGreaterThanOrEqual(0);
		expect(result.total).toBeLessThanOrEqual(scoreMaxTotal);
	});
});

describe('computePowerScore — baseball half-innings', () => {
	const mlbNinth = (topOfInning?: boolean): Game => makeGame({
		league: 'mlb',
		sportType: 'baseball',
		period: 9,
		clockSeconds: 0,
		topOfInning,
		homeTeam: { abbreviation: 'HOM', score: 3 },
		awayTeam: { abbreviation: 'AWY', score: 2 },
	});

	test('scores the bottom of the 9th above the top of the 9th', () => {
		const top = computePowerScore(mlbNinth(true), []);
		const bottom = computePowerScore(mlbNinth(false), []);
		expect(bottom.closeness).toBeGreaterThan(top.closeness);
		expect(bottom.total).toBeGreaterThan(top.total);
	});

	test('sits between the two halves when the feed does not report one', () => {
		const unknown = computePowerScore(mlbNinth(undefined), []);
		const top = computePowerScore(mlbNinth(true), []);
		const bottom = computePowerScore(mlbNinth(false), []);
		expect(unknown.closeness).toBeGreaterThanOrEqual(top.closeness);
		expect(unknown.closeness).toBeLessThanOrEqual(bottom.closeness);
	});
});
