import { boostPoints, scoreGame, scorerTunables, signalPoints } from '../src';
import type { Game, LeagueId, SportType } from '../src';

// A feed that is not ours: its own league ids, and only the fields it happens to publish.
const feedGame = (overrides: Partial<Game<string>> & Pick<Game<string>, 'league' | 'sportType'>): Game<string> => ({
	id: 'feed-1',
	homeTeam: { score: 2 },
	awayTeam: { score: 1 },
	...overrides,
});

const sportTypes: SportType[] = ['basketball', 'football', 'hockey', 'baseball', 'softball', 'soccer'];

describe('a feed that only publishes the score', () => {
	test.each(sportTypes)('%s scores as a whole number from 0 to 100 with a reason to show', sportType => {
		const score = scoreGame(feedGame({ league: `elsewhere-${sportType}`, sportType }));
		expect(Number.isInteger(score.total)).toBe(true);
		expect(score.total).toBeGreaterThanOrEqual(0);
		expect(score.total).toBeLessThanOrEqual(100);
		expect(score.signals.every(signal => Number.isInteger(signal.points))).toBe(true);
		expect(score.reason.length).toBeGreaterThan(0);
		expect(score.frozen).toBe(false);
	});

	test('reads a missing period as the start of a game, never its finish', () => {
		const scoreOnly = scoreGame(feedGame({ league: 'khl', sportType: 'hockey', homeTeam: { score: 2 }, awayTeam: { score: 2 } }));
		const finalMinute = scoreGame(feedGame({ league: 'khl', sportType: 'hockey', homeTeam: { score: 2 }, awayTeam: { score: 2 }, period: 3, clockSeconds: 30 }));
		expect(signalPoints(scoreOnly, 'lateGame')).toBe(0);
		expect(signalPoints(scoreOnly, 'closeness')).toBe(scorerTunables.scores.closenessFlatFloor);
		expect(finalMinute.total).toBeGreaterThan(scoreOnly.total + 40);
	});
});

describe('a league the built-in tables have never heard of', () => {
	const knownCounterparts: Array<[SportType, LeagueId, Partial<Game<string>>]> = [
		['basketball', 'nba', { period: 4, clockSeconds: 100, homeTeam: { score: 101 }, awayTeam: { score: 99 } }],
		['hockey', 'nhl', { period: 3, clockSeconds: 240, homeTeam: { score: 2 }, awayTeam: { score: 2 } }],
		['baseball', 'mlb', { period: 8, topOfInning: false, homeTeam: { score: 3 }, awayTeam: { score: 2 } }],
		['football', 'nfl', { period: 4, clockSeconds: 110, homeTeam: { score: 20 }, awayTeam: { score: 17 } }],
		['soccer', 'mls', { period: 2, clockSeconds: 5100, homeTeam: { score: 1 }, awayTeam: { score: 1 } }],
		['softball', 'csoft', { period: 6, homeTeam: { score: 4 }, awayTeam: { score: 3 } }],
	];

	test.each(knownCounterparts)('an unknown %s league is scored exactly like %s', (sportType, known, situation) => {
		const unknown = scoreGame(feedGame({ league: `elsewhere-${sportType}`, sportType, status: 'in', ...situation }));
		const builtIn = scoreGame(feedGame({ league: known, sportType, status: 'in', ...situation }));
		expect(unknown).toEqual(builtIn);
		expect(signalPoints(unknown, 'lateGame')).toBeGreaterThan(0);
	});

	test('an unknown hockey league\'s third period is its last, not the third of four basketball quarters', () => {
		const khl = feedGame({ league: 'khl', sportType: 'hockey', period: 3, clockSeconds: 240, homeTeam: { score: 2 }, awayTeam: { score: 2 } });
		const asHockey = scoreGame(khl);
		const asFourQuarters = scoreGame(khl, {}, { league: { regularPeriods: 4, periodDurationSecs: 720 } });
		expect(asHockey.reasons).toContainEqual({ key: 'underMinutes', params: { minutes: 4 } });
		expect(signalPoints(asHockey, 'lateGame')).toBeGreaterThan(signalPoints(asFourQuarters, 'lateGame') + 10);
	});
});

describe('overriding the tables for a league that plays differently', () => {
	test('a basketball league played in two halves ramps up late in the second half', () => {
		const game = feedGame({ league: 'nbl1', sportType: 'basketball', period: 2, clockSeconds: 120, homeTeam: { score: 70 }, awayTeam: { score: 68 } });
		const asQuarters = scoreGame(game);
		const asHalves = scoreGame(game, {}, { league: { regularPeriods: 2, periodDurationSecs: 1200 } });
		expect(signalPoints(asQuarters, 'lateGame')).toBe(0);
		expect(signalPoints(asHalves, 'lateGame')).toBeGreaterThan(20);
		expect(asHalves.reasons).toContainEqual({ key: 'underMinutes', params: { minutes: 2 } });
	});

	test('a sport with tighter margins reads a three-point game as loose', () => {
		const game = feedGame({
			league: 'fiba3x3', sportType: 'basketball', period: 1, clockSeconds: 120,
			homeTeam: { abbreviation: 'NED', score: 15 }, awayTeam: { abbreviation: 'LAT', score: 12 },
		});
		const singlePeriod = { regularPeriods: 1, periodDurationSecs: 600 };
		const fullCourtMargins = scoreGame(game, {}, { league: singlePeriod });
		const halfCourtMargins = scoreGame(game, {}, { league: singlePeriod, sport: { closenessMargins: [1, 2, 3] } });
		expect(fullCourtMargins.reasons).toContainEqual({ key: 'margin', params: { margin: 3, unit: 'point' } });
		expect(halfCourtMargins.reasons.some(reason => reason.key === 'margin')).toBe(false);
		expect(signalPoints(halfCourtMargins, 'closeness')).toBeLessThan(signalPoints(fullCourtMargins, 'closeness'));
		expect(signalPoints(halfCourtMargins, 'lateGame')).toBeGreaterThan(0);
	});
});

describe('a feed that publishes more as it matures', () => {
	test('each field it adds lights up the signal that reads it', () => {
		const scoresOnly = feedGame({ league: 'kbo', sportType: 'baseball', homeTeam: { score: 3 }, awayTeam: { score: 4 } });
		const withInning = { ...scoresOnly, period: 7, topOfInning: false };
		const withRunners = { ...withInning, status: 'in' as const, baseRunners: { first: true, second: false, third: true } };
		const history = ([[3, 2], [3, 3], [3, 4]] as const).map(([homeScore, awayScore], index) => ({
			gameId: 'feed-1', timestamp: 1_790_000_000_000 + index * 60_000, homeScore, awayScore,
		}));
		const winProbability = [0.45, 0.52, 0.48, 0.5, 0.55, 0.47];

		const steps = [
			scoreGame(scoresOnly),
			scoreGame(withInning),
			scoreGame(withRunners),
			scoreGame(withRunners, { history }),
			scoreGame(withRunners, { history, winProbability }),
		];

		expect(signalPoints(steps[0]!, 'lateGame')).toBe(0);
		expect(steps[1]!.reasons).toContainEqual({ key: 'inning', params: { inning: 7 } });
		expect(boostPoints(steps[1]!, 'scoringOpportunity')).toBe(0);
		expect(boostPoints(steps[2]!, 'scoringOpportunity')).toBe(6);
		expect(signalPoints(steps[3]!, 'leadChanges')).toBeGreaterThan(0);
		expect(steps[3]!.reasons).toContainEqual({ key: 'justTookLead' });
		expect(steps[3]!.winProbabilityVariance).toBeUndefined();
		expect(steps[4]!.winProbabilityVariance).toBeGreaterThan(0);
		for (let i = 1; i < steps.length; i++) expect(steps[i]!.total).toBeGreaterThan(steps[i - 1]!.total);
	});
});
