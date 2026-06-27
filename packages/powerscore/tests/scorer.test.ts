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
	sportTypeConfigMap,
	stallPenaltySteps,
} from '../src/constants';
import { computePowerScore, computeScoringOpportunityBoost, normalizePowerScoreResult } from '../src/scorer';
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

	test('passes through gameBoost field when overflow is allowed', () => {
		const normalized = normalizePowerScoreResult({
			gameId: 'boost-test',
			closeness: 30,
			lateGame: 30,
			momentum: 20,
			leadChanges: 12,
			comeback: 8,
			baseTotal: 100,
			favoriteBonus: 0,
			favoriteTeamCount: 0,
			gameBoost: 25,
			total: 125,
			reason: 'late game, game boost (+25)',
		}, { allowTotalOverflow: true });

		expect(normalized.total).toBe(125);
		expect(normalized.gameBoost).toBe(25);
		expect(normalized.baseTotal).toBe(100);
	});

	test('stacks favoriteBonus and gameBoost correctly with overflow', () => {
		const normalized = normalizePowerScoreResult({
			gameId: 'stacked-boost',
			closeness: 30,
			lateGame: 30,
			momentum: 20,
			leadChanges: 12,
			comeback: 8,
			baseTotal: 100,
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

		// Closeness is progress-scaled, so we assert the tier ORDERING rather than raw tier values:
		// a 0-0 game in a penalty period (reduced tie credit) scores below a later full-tie 0-0, and
		// every active 0-0 keeps a positive floor.
		expect(basketballResult.closeness).toBeGreaterThan(0);
		expect(earlyHockeyResult.closeness).toBeGreaterThan(0);
		expect(lateHockeyResult.closeness).toBeGreaterThan(earlyHockeyResult.closeness);
		expect(lateSoccerResult.closeness).toBeGreaterThan(earlySoccerResult.closeness);
		expect(earlyHockeyResult.reason).toBe(scorerTunables.reasons.tied);
		expect(lateHockeyResult.reason).toContain(scorerTunables.reasons.tied);
	});

	test('applies basketball closeness thresholds at boundary margins', () => {
		// Reason classification still keys off the raw tier; the closeness VALUE is progress-scaled.
		// At period 1 (early) every active tier sits near its small floor, so we assert the tier
		// ordering (non-increasing as the margin widens), a positive floor for the fringe, and 0 once
		// the game is a blowout — plus the unchanged reason strings.
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
		expect(earlyTie.closeness).toBeLessThanOrEqual(10);
		expect(lateTie.closeness).toBeGreaterThan(earlyTie.closeness);
		expect(lateTie.closeness).toBeLessThanOrEqual(scoreMaxCloseness);
	});

	test('builds a monotonic whole-period late-game ramp for countdown sports', () => {
		// Close + non-tied (factor 1, no OT pre-boost). NBA: regularPeriods 4, 12-min Q; previous = Q3.
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
		expect(finalEnd.lateGame).toBeLessThanOrEqual(scorerTunables.scores.lateGame.otEdgeMax);
		expect(finalMid.reason).toContain('min left');
	});

	test('late-game ramp is near-linear across the final period (no end spike)', () => {
		const { otEdgeMax, finalPeriodStart } = scorerTunables.scores.lateGame;
		const sample = (fraction: number) => computePowerScore(makeGame({
			period: 4,
			clockSeconds: Math.round(720 * (1 - fraction)),
			homeTeam: { ...makeGame().homeTeam, score: 110 }, // close + non-tied → factor 1, no OT pre-boost
			awayTeam: { ...makeGame().awayTeam, score: 103 },
		}), []).lateGame;

		const points = [0, 0.25, 0.5, 0.75, 1].map(sample);
		expect(points[0]).toBe(finalPeriodStart);
		expect(points[4]).toBe(otEdgeMax);

		const deltas = points.slice(1).map((value, index) => value - points[index]!);
		const expectedStep = (otEdgeMax - finalPeriodStart) / 4;
		for (const delta of deltas) {
			// every quarter-step is within ~1.5 points of a perfectly linear step → no back-loaded spike
			expect(Math.abs(delta - expectedStep)).toBeLessThanOrEqual(1.5);
		}
	});

	test('builds a monotonic whole-period late-game ramp for count-up sports', () => {
		// Soccer clock counts UP (elapsed). MLS: regularPeriods 2 (45-min halves); previous = 1st half.
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
		expect(finalEnd.lateGame).toBeLessThanOrEqual(scorerTunables.scores.lateGame.otEdgeMax);
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

	test('every clock league ramps the whole final period up to the OT edge', () => {
		const representativeLeagueIds = ['nba', 'nhl', 'nfl', 'mls'] as const;
		const { otEdgeMax } = scorerTunables.scores.lateGame;

		for (const leagueId of representativeLeagueIds) {
			const league = leagueConfigMap[leagueId];
			const sportConfig = sportTypeConfigMap[league.sportType];
			// secsRemaining → clockSeconds (soccer counts up with full-game elapsed, others count down)
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
			expect(endFinal.lateGame).toBe(otEdgeMax);
		}
	});

	test('ramps baseball late-game across regulation innings up to the OT edge', () => {
		const { otEdgeMax, finalPeriodStart } = scorerTunables.scores.lateGame;
		const withInning = (period: number) => makeGame({
			league: 'mlb',
			sportType: 'baseball',
			period,
			clockSeconds: 0,
			homeTeam: { ...makeGame().homeTeam, score: 4 },
			awayTeam: { ...makeGame().awayTeam, score: 1 },
		});

		const fifth = computePowerScore(withInning(5), []);   // before regulation pressure window
		const sixth = computePowerScore(withInning(6), []);   // ramp starts
		const eighth = computePowerScore(withInning(8), []);
		const ninth = computePowerScore(withInning(9), []);

		expect(fifth.lateGame).toBe(0);
		expect(sixth.lateGame).toBe(finalPeriodStart);
		expect(eighth.lateGame).toBeGreaterThan(sixth.lateGame);
		expect(ninth.lateGame).toBe(otEdgeMax);
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
		// Tied final minute: closeness near max, late-game at the OT edge + tied pre-boost, but the
		// run/lead-change/comeback signals are modest → high score that still leaves headroom for OT.
		expect(result.total).toBeGreaterThanOrEqual(70);
		expect(result.total).toBeLessThan(scoreMaxTotal);
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
		expect(smallRun.reason).toBe('HOM on a roll');

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
		expect(result.reason).toBe('HOM on a 10-0 run, under 2 min left');
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

	test('applies no stall penalty below the first threshold', () => {
		const game = makeGame({
			homeTeam: { ...makeGame().homeTeam, score: 100 },
			awayTeam: { ...makeGame().awayTeam, score: 92 },
			period: 2,
			clockSeconds: 600,
		});

		// stallPenaltySteps is sorted descending — first entry has the highest minPolls
		const lightStep = stallPenaltySteps[stallPenaltySteps.length - 1];
		const result = computePowerScore(game, [], (lightStep?.minPolls ?? 8) - 1);
		expect(result.stalled).toBe(false);
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
		expect(stalled.total).toBe(Math.round(raw.total * lightStep.multiplier));
		expect(stalled.baseTotal).toBe(raw.total);
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
		expect(stalled.total).toBe(Math.round(raw.total * heavyStep.multiplier));
		expect(stalled.baseTotal).toBe(raw.total);
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

		// Single lead change — the flip lands on the latest snapshot (age 0 → undecayed tier value).
		const singleChange = computePowerScore(
			makeGame({ homeTeam: { abbreviation: 'HOM', score: 50 }, awayTeam: { abbreviation: 'AWY', score: 51 } }),
			makeHistory([[50, 48], [51, 50], [50, 51]]),
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

		// Comeback is progress-scaled, so use a near-buzzer game (progress ≈ 1) where the floored value
		// reaches the tier ceiling, with the shrink landing on the latest snapshot (age 0 → undecayed).
		// Moderate comeback — deficit shrinks by 5 (basketball small=3, big=6)
		const moderateComeback = computePowerScore(
			makeGame({ period: 4, clockSeconds: 1, homeTeam: { ...makeGame().homeTeam, score: 89 }, awayTeam: { ...makeGame().awayTeam, score: 84 } }),
			makeHistory([[80, 70], [83, 75], [89, 84]]),
		);
		// oldDiff=10, newDiff=5, shrinkage=5 => moderate
		expect(moderateComeback.comeback).toBe(scorerTunables.scores.comeback.moderate);
		expect(moderateComeback.reason).toContain('closing the gap');

		// Big comeback — deficit shrinks by 8 (basketball big=6)
		const bigComeback = computePowerScore(
			makeGame({ period: 4, clockSeconds: 1, homeTeam: { ...makeGame().homeTeam, score: 90 }, awayTeam: { ...makeGame().awayTeam, score: 88 } }),
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
		// All three share the SAME 8-0 run; they differ only in how long ago it happened relative to
		// the newest snapshot ("now"). Basketball momentum half-life is 45s (3 polls).
		const fresh = computePowerScore(runGame(), makeHistory([[60, 60], [64, 60], [68, 60]]));
		const oneHalfLife = computePowerScore(runGame(), makeHistory([[60, 60], [68, 60], [68, 60], [68, 60], [68, 60]]));
		const stale = computePowerScore(runGame(), makeHistory([[60, 60], [68, 60], [68, 60], [68, 60], [68, 60], [68, 60], [68, 60]]));

		expect(fresh.momentum).toBe(scorerTunables.scores.momentum.bigRun);
		expect(oneHalfLife.momentum).toBeLessThan(fresh.momentum);
		expect(stale.momentum).toBeLessThan(oneHalfLife.momentum);
		expect(stale.momentum).toBeGreaterThan(0);
		// one half-life out ≈ half the spiked value
		expect(oneHalfLife.momentum).toBeGreaterThanOrEqual(Math.round(scorerTunables.scores.momentum.bigRun * 0.5) - 1);
		expect(oneHalfLife.momentum).toBeLessThanOrEqual(Math.round(scorerTunables.scores.momentum.bigRun * 0.5) + 1);
	});

	test('low-scoring sports retain a scoring spike longer than basketball', () => {
		// Identical run and identical age — only the sport-scaled half-life differs.
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
		// Big run long in the past with nothing since — momentum decays to 0, so decaySignal clears its
		// reason and the run no longer headlines.
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

		// Tied game ramps past the OT edge toward the reserved max as the clock runs out.
		expect(tied30.lateGame).toBeGreaterThan(tied60.lateGame);
		expect(tied1.lateGame).toBeGreaterThan(tied30.lateGame);
		expect(tied1.lateGame).toBe(scoreMaxLateGame);
		expect(tied1.reason).toContain(scorerTunables.reasons.overtimeAnticipation);
		// A non-tied buzzer caps at the OT edge — no pre-boost — so OT-bound games separate.
		expect(nonTiedBuzzer.lateGame).toBe(scorerTunables.scores.lateGame.otEdgeMax);
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

	test('returns 0 for football when not in red zone', () => {
		expect(computeScoringOpportunityBoost(makeFootballGame({ isRedZone: false }))).toBe(0);
		expect(computeScoringOpportunityBoost(makeFootballGame({ isRedZone: undefined }))).toBe(0);
	});

	test('returns 10 for football in red zone', () => {
		expect(computeScoringOpportunityBoost(makeFootballGame({ isRedZone: true }))).toBe(10);
	});

	test('returns 0 for other sport types', () => {
		const basketball: Game = { id: 'g1', league: 'nba', sportType: 'basketball',
			homeTeam: { score: 80 }, awayTeam: { score: 78 }, status: 'in' };
		expect(computeScoringOpportunityBoost(basketball)).toBe(0);
	});
});
