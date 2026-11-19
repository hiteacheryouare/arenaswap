import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { scoreGame } from '../src/compose';
import { scoreWinProbVarianceMax } from '../src/constants';
import { computePowerScore, computeWinProbVarianceScore } from '../src/scorer';
import { getTimelineProgress } from '../src/progress';
import { resolveLeagueConfig, resolveSportConfig } from '../src/config';
import type { Game, WinProbabilityReading } from '../src/types';

interface Arc {
	name: string;
	readings: Array<[number, number]>;
}

const arcs: Record<'surge' | 'coinFlip' | 'blowout' | 'wildEarly', Arc> = JSON.parse(
	readFileSync(join(__dirname, 'fixtures', 'winProbabilityArcs.json'), 'utf8'),
);

const readingsOf = (arc: Arc): WinProbabilityReading[] => arc.readings.map(([homeWinProbability, progress]) => ({ homeWinProbability, progress }));

const termsThrough = (arc: Arc) => {
	const readings = readingsOf(arc);
	return readings.map((reading, i) => ({ progress: reading.progress, term: computeWinProbVarianceScore(readings.slice(0, i + 1)) }));
};

const termsBetween = (arc: Arc, from: number, to: number) => (
	termsThrough(arc).filter(moment => moment.progress >= from && moment.progress < to).map(moment => moment.term!)
);

const average = (values: number[]) => values.reduce((total, value) => total + value, 0) / values.length;

const steady = (count: number, probability: number, until: number): WinProbabilityReading[] => (
	Array.from({ length: count }, (_, i) => ({ homeWinProbability: probability, progress: (until * (i + 1)) / count }))
);

const game = (period: number, clockSeconds: number): Game => ({
	id: 'g',
	league: 'ncaab',
	sportType: 'basketball',
	homeTeam: { abbreviation: 'HOM', score: 70 },
	awayTeam: { abbreviation: 'AWY', score: 70 },
	period,
	clockSeconds,
	status: 'in',
});

describe('computeWinProbVarianceScore on real games', () => {
	test('CSUF @ UCLA: a lopsided night that swings late climbs from a penalty to a bonus', () => {
		expect(average(termsBetween(arcs.surge, 0.55, 0.75))).toBeLessThanOrEqual(-3);
		const run = termsBetween(arcs.surge, 0.887, 0.97);
		expect(Math.min(...run)).toBeGreaterThanOrEqual(2);
		expect(Math.max(...run)).toBeGreaterThanOrEqual(4);
	});

	test('CSUF @ UCLA: the bonus is gone once UCLA puts it away', () => {
		const terms = termsThrough(arcs.surge);
		expect(terms[terms.length - 1]!.term).toBe(0);
	});

	test('a game close from tip to overtime earns a steady bonus late and through overtime', () => {
		const late = termsBetween(arcs.coinFlip, 0.85, 1.12);
		expect(Math.min(...late)).toBeGreaterThanOrEqual(2);
		expect(average(late)).toBeGreaterThanOrEqual(3.5);
	});

	test('a blowout is never penalized in the first half, and takes the full penalty in the second', () => {
		expect(termsBetween(arcs.blowout, 0.1, 0.5).every(term => term === 0)).toBe(true);
		expect(average(termsBetween(arcs.blowout, 0.6, 1))).toBe(-scoreWinProbVarianceMax);
	});

	test('a wild first half earns a bonus, and the penalty returns once the game is decided', () => {
		expect(Math.max(...termsBetween(arcs.wildEarly, 0.1, 0.5))).toBeGreaterThanOrEqual(2);
		expect(average(termsBetween(arcs.wildEarly, 0.9, 1))).toBeLessThanOrEqual(-3);
	});

	test('every moment of every game stays within the term\'s range', () => {
		for (const arc of Object.values(arcs)) {
			for (const { term } of termsThrough(arc)) {
				if (term === undefined) continue;
				expect(Math.abs(term)).toBeLessThanOrEqual(scoreWinProbVarianceMax);
			}
		}
	});
});

describe('computeWinProbVarianceScore edge cases', () => {
	test('stays out of the score until a tenth of the game is played', () => {
		expect(computeWinProbVarianceScore(steady(30, 0.5, 0.08))).toBeUndefined();
		expect(computeWinProbVarianceScore(steady(30, 0.5, 0.12))).toBeDefined();
	});

	test('needs more than a couple of readings', () => {
		expect(computeWinProbVarianceScore([])).toBeUndefined();
		expect(computeWinProbVarianceScore(steady(2, 0.5, 0.6))).toBeUndefined();
	});

	test('a single reading that jumps and comes straight back is not a swing', () => {
		const quiet = steady(60, 0.99, 0.8);
		const corrected = quiet.map((reading, i) => (i === 50 ? { ...reading, homeWinProbability: 0.6 } : reading));
		expect(computeWinProbVarianceScore(corrected)).toBe(computeWinProbVarianceScore(quiet));
	});

	test('ignores readings that are not finite numbers', () => {
		const readings = readingsOf(arcs.surge).slice(0, 420);
		const noisy = [...readings.slice(0, 200), { homeWinProbability: Number.NaN, progress: 0.5 }, ...readings.slice(200)];
		expect(computeWinProbVarianceScore(noisy)).toBe(computeWinProbVarianceScore(readings));
	});

	test('a bare list of probabilities is spread evenly up to the current point of the game', () => {
		const flat = Array.from({ length: 30 }, () => 0.5);
		expect(computeWinProbVarianceScore(flat, 0.08)).toBeUndefined();
		expect(computeWinProbVarianceScore(flat, 0.6)).toBeDefined();
	});
});

describe('the volatility term inside a full PowerScore', () => {
	const csufUpSix: Game = {
		id: '401920158',
		league: 'ncaab',
		sportType: 'basketball',
		homeTeam: { abbreviation: 'UCLA', score: 58 },
		awayTeam: { abbreviation: 'CSUF', score: 64 },
		period: 2,
		clockSeconds: 272,
		status: 'in',
	};
	const sport = resolveSportConfig('basketball');
	const league = resolveLeagueConfig(csufUpSix);

	test('CSUF up six with 4:32 left gets the bonus, measured against the game clock', () => {
		const now = getTimelineProgress(csufUpSix, sport, league);
		const readings = readingsOf(arcs.surge).filter(reading => reading.progress <= now);
		const withWinChance = scoreGame(csufUpSix, { winProbability: readings });
		const without = scoreGame(csufUpSix, {});
		expect(withWinChance.winProbabilityVariance).toBeGreaterThanOrEqual(2);
		expect(withWinChance.total).toBeGreaterThan(without.total);
	});

	test('the 2.x computePowerScore still takes a bare list', () => {
		const bare = readingsOf(arcs.blowout).map(reading => reading.homeWinProbability);
		const result = computePowerScore({ ...csufUpSix, homeTeam: { abbreviation: 'PAC', score: 90 }, awayTeam: { abbreviation: 'PUC', score: 38 } }, [], bare);
		expect(result.winProbabilityVariance).toBe(-scoreWinProbVarianceMax);
	});
});

describe('getTimelineProgress', () => {
	const sport = resolveSportConfig('basketball');
	test('matches regulation progress, then keeps counting through overtime', () => {
		const league = resolveLeagueConfig(game(2, 600));
		expect(getTimelineProgress(game(2, 600), sport, league)).toBeCloseTo(0.75);
		expect(getTimelineProgress(game(3, 300), sport, league)).toBeCloseTo(1);
		expect(getTimelineProgress(game(3, 150), sport, league)).toBeCloseTo(1 + 150 / 2400);
		expect(getTimelineProgress(game(4, 300), sport, league)).toBeCloseTo(1 + 300 / 2400);
	});

	test('extra innings run past the ninth', () => {
		const baseball = resolveSportConfig('baseball');
		const extras: Game = { ...game(10, 0), league: 'mlb', sportType: 'baseball', topOfInning: false };
		expect(getTimelineProgress(extras, baseball, resolveLeagueConfig(extras))).toBeCloseTo(9.75 / 9);
	});
});
