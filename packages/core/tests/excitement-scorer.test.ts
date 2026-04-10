import {
	SCORER_TUNABLES,
	STALL_PENALTY_MULTIPLIER,
	STALL_THRESHOLD_POLLS,
} from '../src/constants';
import { computeExcitement } from '../src/excitement-scorer';
import type { Game, ScoreSnapshot } from '../src/types';

const makeGame = (overrides: Partial<Game> = {}): Game => ({
	id: 'game-1',
	league: 'nba',
	sportType: 'basketball',
	homeTeam: {
		id: 'home',
		name: 'Home Team',
		abbreviation: 'HOM',
		score: 80,
	},
	awayTeam: {
		id: 'away',
		name: 'Away Team',
		abbreviation: 'AWY',
		score: 78,
	},
	period: 2,
	clockSeconds: 600,
	status: 'in',
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

describe('computeExcitement', () => {
	test('returns zeroed score for intermission games', () => {
		const game = makeGame({ intermission: true });
		expect(computeExcitement(game, makeHistory([[80, 78], [82, 78], [84, 78]]))).toEqual({
			gameId: 'game-1',
			total: 0,
			closeness: 0,
			lateGame: 0,
			momentum: 0,
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

		const basketballResult = computeExcitement(basketball, []);
		const soccerResult = computeExcitement(soccer, []);

		expect(basketballResult.closeness).toBe(SCORER_TUNABLES.scores.closeness.zeroZero);
		expect(soccerResult.closeness).toBe(SCORER_TUNABLES.scores.closeness.tied);
	});

	test('applies basketball closeness thresholds at boundary margins', () => {
		const cases = [
			{ margin: 5, expected: SCORER_TUNABLES.scores.closeness.tight, expectedReason: '5-point game' },
			{ margin: 6, expected: SCORER_TUNABLES.scores.closeness.close, expectedReason: '6-point game' },
			{ margin: 10, expected: SCORER_TUNABLES.scores.closeness.close, expectedReason: '10-point game' },
			{ margin: 11, expected: SCORER_TUNABLES.scores.closeness.fringe, expectedReason: SCORER_TUNABLES.reasons.fallback },
			{ margin: 18, expected: SCORER_TUNABLES.scores.closeness.fringe, expectedReason: SCORER_TUNABLES.reasons.fallback },
			{ margin: 19, expected: SCORER_TUNABLES.scores.closeness.none, expectedReason: SCORER_TUNABLES.reasons.fallback },
		];

		for (const { margin, expected, expectedReason } of cases) {
			const game = makeGame({
				period: 1,
				clockSeconds: 600,
				homeTeam: { ...makeGame().homeTeam, score: 90 },
				awayTeam: { ...makeGame().awayTeam, score: 90 - margin },
			});

			const result = computeExcitement(game, []);
			expect(result.closeness).toBe(expected);
			expect(result.reason).toBe(expectedReason);
		}
	});

	test('applies late-game clock pressure for countdown sports', () => {
		const game = makeGame({
			period: 4,
			clockSeconds: 119,
			homeTeam: { ...makeGame().homeTeam, score: 90 },
			awayTeam: { ...makeGame().awayTeam, score: 88 },
		});

		const result = computeExcitement(game, []);
		expect(result.lateGame).toBe(SCORER_TUNABLES.scores.lateGame.clockBased.critical);
		expect(result.reason).toContain('left');
		expect(result.reason).toContain('2-point game');
	});

	test('uses elapsed-clock conversion for soccer late-game scoring', () => {
		const game = makeGame({
			league: 'mls',
			sportType: 'soccer',
			period: 2,
			clockSeconds: 2_600,
			homeTeam: { ...makeGame().homeTeam, score: 1 },
			awayTeam: { ...makeGame().awayTeam, score: 1 },
		});

		const result = computeExcitement(game, []);
		expect(result.lateGame).toBe(SCORER_TUNABLES.scores.lateGame.clockBased.critical);
	});

	test('applies clock-based late-game thresholds at boundaries for countdown sports', () => {
		const withClock = (period: number, clockSeconds: number) => makeGame({
			period,
			clockSeconds,
			homeTeam: { ...makeGame().homeTeam, score: 110 },
			awayTeam: { ...makeGame().awayTeam, score: 90 },
		});

		const critical = computeExcitement(withClock(4, 120), []);
		expect(critical.lateGame).toBe(SCORER_TUNABLES.scores.lateGame.clockBased.critical);
		expect(critical.reason).toBe('2:00 left');

		const tenseAtBoundary = computeExcitement(withClock(4, 300), []);
		expect(tenseAtBoundary.lateGame).toBe(SCORER_TUNABLES.scores.lateGame.clockBased.tense);
		expect(tenseAtBoundary.reason).toBe('under 5 min left');

		const tenseJustAfterCritical = computeExcitement(withClock(4, 121), []);
		expect(tenseJustAfterCritical.lateGame).toBe(SCORER_TUNABLES.scores.lateGame.clockBased.tense);

		const previousPeriodBoundary = computeExcitement(withClock(3, 300), []);
		expect(previousPeriodBoundary.lateGame).toBe(SCORER_TUNABLES.scores.lateGame.clockBased.previousPeriod);
		expect(previousPeriodBoundary.reason).toBe(SCORER_TUNABLES.reasons.fallback);

		const none = computeExcitement(withClock(3, 301), []);
		expect(none.lateGame).toBe(SCORER_TUNABLES.scores.lateGame.none);
		expect(none.reason).toBe(SCORER_TUNABLES.reasons.fallback);
	});

	test('applies count-up late-game thresholds at boundaries for soccer', () => {
		const withElapsed = (clockSeconds: number) => makeGame({
			league: 'mls',
			sportType: 'soccer',
			period: 2,
			clockSeconds,
			homeTeam: { ...makeGame().homeTeam, score: 4 },
			awayTeam: { ...makeGame().awayTeam, score: 0 },
		});

		const critical = computeExcitement(withElapsed(2_520), []);
		expect(critical.lateGame).toBe(SCORER_TUNABLES.scores.lateGame.clockBased.critical);
		expect(critical.reason).toBe('3:00 left');

		const tense = computeExcitement(withElapsed(2_519), []);
		expect(tense.lateGame).toBe(SCORER_TUNABLES.scores.lateGame.clockBased.tense);
		expect(tense.reason).toBe('under 10 min left');

		const tenseBoundary = computeExcitement(withElapsed(2_100), []);
		expect(tenseBoundary.lateGame).toBe(SCORER_TUNABLES.scores.lateGame.clockBased.tense);

		const none = computeExcitement(withElapsed(2_099), []);
		expect(none.lateGame).toBe(SCORER_TUNABLES.scores.lateGame.none);
		expect(none.reason).toBe(SCORER_TUNABLES.reasons.fallback);
	});

	test('scores extra innings for baseball overtime periods', () => {
		const game = makeGame({
			league: 'mlb',
			sportType: 'baseball',
			period: 10,
			clockSeconds: 0,
			homeTeam: { ...makeGame().homeTeam, score: 4 },
			awayTeam: { ...makeGame().awayTeam, score: 4 },
		});

		const result = computeExcitement(game, []);
		expect(result.lateGame).toBe(SCORER_TUNABLES.scores.lateGame.overtime);
		expect(result.reason).toContain('extra innings');
	});

	test('detects big momentum runs from history snapshots', () => {
		const game = makeGame({
			homeTeam: { ...makeGame().homeTeam, abbreviation: 'HOM', score: 70 },
			awayTeam: { ...makeGame().awayTeam, abbreviation: 'AWY', score: 60 },
		});
		const history = makeHistory([[60, 60], [64, 60], [70, 60]]);
		const result = computeExcitement(game, history);

		expect(result.momentum).toBe(SCORER_TUNABLES.scores.momentum.bigRun);
		expect(result.reason).toContain('HOM on a 10-0 run');
	});

	test('applies momentum boundaries for none, small, and big runs', () => {
		const game = makeGame({
			homeTeam: { ...makeGame().homeTeam, abbreviation: 'HOM', score: 100 },
			awayTeam: { ...makeGame().awayTeam, abbreviation: 'AWY', score: 70 },
			period: 1,
			clockSeconds: 720,
		});

		const noRun = computeExcitement(game, makeHistory([[50, 50], [52, 50], [54, 50]]));
		expect(noRun.momentum).toBe(SCORER_TUNABLES.scores.momentum.none);
		expect(noRun.reason).toBe(SCORER_TUNABLES.reasons.fallback);

		const smallRun = computeExcitement(game, makeHistory([[50, 50], [53, 50], [55, 50]]));
		expect(smallRun.momentum).toBe(SCORER_TUNABLES.scores.momentum.smallRun);
		expect(smallRun.reason).toBe('HOM rolling');

		const bigRun = computeExcitement(game, makeHistory([[50, 50], [55, 50], [60, 50]]));
		expect(bigRun.momentum).toBe(SCORER_TUNABLES.scores.momentum.bigRun);
		expect(bigRun.reason).toBe('HOM on a 10-0 run');
	});

	test('orders reasons by momentum then late game and truncates extra reasons', () => {
		const game = makeGame({
			period: 4,
			clockSeconds: 119,
			homeTeam: { ...makeGame().homeTeam, abbreviation: 'HOM', score: 80 },
			awayTeam: { ...makeGame().awayTeam, abbreviation: 'AWY', score: 78 },
		});
		const history = makeHistory([[60, 60], [66, 60], [70, 60]]);

		const result = computeExcitement(game, history);
		expect(result.reason).toBe('HOM on a 10-0 run, 1:59 left');
		expect(result.reason).not.toContain('2-point game');
	});

	test('uses fallback reason when only non-reason scoring signals are present', () => {
		const game = makeGame({
			period: 3,
			clockSeconds: 300,
			homeTeam: { ...makeGame().homeTeam, score: 111 },
			awayTeam: { ...makeGame().awayTeam, score: 100 },
		});
		const history = makeHistory([[60, 60], [62, 60], [64, 60]]);

		const result = computeExcitement(game, history);
		expect(result.closeness).toBe(SCORER_TUNABLES.scores.closeness.fringe);
		expect(result.lateGame).toBe(SCORER_TUNABLES.scores.lateGame.clockBased.previousPeriod);
		expect(result.momentum).toBe(SCORER_TUNABLES.scores.momentum.none);
		expect(result.total).toBe(18);
		expect(result.reason).toBe(SCORER_TUNABLES.reasons.fallback);
	});

	test('applies stall penalty when threshold is met', () => {
		const game = makeGame({
			homeTeam: { ...makeGame().homeTeam, score: 100 },
			awayTeam: { ...makeGame().awayTeam, score: 92 },
			period: 2,
			clockSeconds: 600,
		});

		const raw = computeExcitement(game, [], STALL_THRESHOLD_POLLS - 1);
		const stalled = computeExcitement(game, [], STALL_THRESHOLD_POLLS);

		expect(raw.stalled).toBe(false);
		expect(raw.total).toBe(raw.closeness + raw.lateGame + raw.momentum);
		expect(stalled.stalled).toBe(true);
		expect(stalled.total).toBe(Math.round(raw.total * STALL_PENALTY_MULTIPLIER));
	});

	test('falls back to default reason when no signal reasons are present', () => {
		const game = makeGame({
			homeTeam: { ...makeGame().homeTeam, score: 120 },
			awayTeam: { ...makeGame().awayTeam, score: 80 },
			period: 1,
			clockSeconds: 650,
		});

		const result = computeExcitement(game, makeHistory([[120, 80], [120, 80], [120, 80]]));
		expect(result.reason).toBe(SCORER_TUNABLES.reasons.fallback);
		expect(result.momentum).toBe(0);
		expect(result.lateGame).toBe(0);
		expect(result.closeness).toBe(0);
	});
});
