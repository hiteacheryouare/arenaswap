// The engine is published to npm and fed straight from ESPN, so it is handed partial and
// malformed payloads in normal operation. Its output is then sorted numerically to pick a tab: a
// single non-finite total poisons that comparison and the switcher silently stops working.

import { computePowerScore } from '../src/scorer';
import { leagueConfigs, scoreMaxTotal, scoreMaxCloseness, scoreMaxLateGame, scoreMaxMomentum, scoreMaxLeadChanges, scoreMaxComeback, stallPenaltySteps } from '../src/constants';
import type { Game, PowerScoreResult, ScoreSnapshot } from '../src/types';

const makeRandom = (seed: number) => {
	let state = seed >>> 0;
	return (): number => {
		state = (state * 1664525 + 1013904223) >>> 0;
		return state / 4294967296;
	};
};

const baseGame = (overrides: Partial<Game> = {}): Game => ({
	id: 'game-1',
	league: 'nba',
	sportType: 'basketball',
	homeTeam: { abbreviation: 'HOM', score: 80 },
	awayTeam: { abbreviation: 'AWY', score: 78 },
	period: 4,
	clockSeconds: 60,
	status: 'in',
	...overrides,
});

const signalCeilings: Array<[keyof PowerScoreResult, number]> = [
	['closeness', scoreMaxCloseness],
	['lateGame', scoreMaxLateGame],
	['momentum', scoreMaxMomentum],
	['leadChanges', scoreMaxLeadChanges],
	['comeback', scoreMaxComeback],
];

const describeBadShape = (result: PowerScoreResult): string | null => {
	if (!Number.isInteger(result.total)) return `total ${result.total} is not a whole number`;
	if (result.total < 0 || result.total > scoreMaxTotal) return `total ${result.total} is outside 0-${scoreMaxTotal}`;
	for (const [key, ceiling] of signalCeilings) {
		const value = result[key] as number;
		if (!Number.isInteger(value)) return `${String(key)} ${value} is not a whole number`;
		if (value < 0 || value > ceiling) return `${String(key)} ${value} is outside 0-${ceiling}`;
	}
	return null;
};

describe('the composed total always agrees with the parts it is built from', () => {
	// Signals are verified one at a time elsewhere. This walks the whole pipeline — signals, then
	// the stall deduction, then the win-probability adjustment, then the cap — over a broad spread
	// of real league/period/clock/history combinations, because the arithmetic joining them is
	// where a retune goes wrong without any single signal test noticing.
	test('signals minus the stall penalty plus the variance adjustment is the published total', () => {
		const disagreements: string[] = [];
		for (let seed = 0; seed < 3_000; seed++) {
			const random = makeRandom(seed);
			const league = leagueConfigs[Math.floor(random() * leagueConfigs.length)]!;
			const game: Game = {
				id: `game-${seed}`,
				league: league.id,
				sportType: league.sportType,
				homeTeam: { abbreviation: 'HOM', score: Math.floor(random() * 40) },
				awayTeam: { abbreviation: 'AWY', score: Math.floor(random() * 40) },
				period: 1 + Math.floor(random() * 6),
				clockSeconds: random() < 0.15 ? undefined : Math.floor(random() * (league.periodDurationSecs || 1)),
				topOfInning: random() < 0.33 ? undefined : random() < 0.5,
				status: 'in',
			};

			const history: ScoreSnapshot[] = [];
			let home = 0;
			let away = 0;
			for (let i = 0, length = Math.floor(random() * 8); i < length; i++) {
				home += Math.floor(random() * 4);
				away += Math.floor(random() * 4);
				history.push({ gameId: game.id, timestamp: i * 20_000, homeScore: home, awayScore: away });
			}

			const stallCount = Math.floor(random() * 20);
			const winProbability = Array.from({ length: Math.floor(random() * 9) }, () => random());
			const result = computePowerScore(game, history, stallCount, winProbability);

			const shape = describeBadShape(result);
			if (shape !== null) disagreements.push(`${league.id} seed ${seed}: ${shape}`);

			const signalSum = result.closeness + result.lateGame + result.momentum + result.leadChanges + result.comeback;
			if (result.signalsSubtotal !== signalSum)
				disagreements.push(`${league.id} seed ${seed}: signalsSubtotal ${result.signalsSubtotal} but signals add to ${signalSum}`);

			const expectedPenalty = stallPenaltySteps.find(step => stallCount >= step.minPolls)?.deduction ?? 0;
			if (result.stallPenalty !== expectedPenalty)
				disagreements.push(`${league.id} seed ${seed}: ${stallCount} stalled polls deducted ${result.stallPenalty}, expected ${expectedPenalty}`);

			const composed = Math.min(
				scoreMaxTotal,
				Math.max(0, Math.max(0, signalSum - expectedPenalty) + (result.winProbabilityVariance ?? 0)),
			);
			if (result.total !== composed)
				disagreements.push(`${league.id} seed ${seed}: total ${result.total}, composition gives ${composed}`);
		}
		expect(disagreements.slice(0, 10)).toEqual([]);
	});
});

describe('a hole in the ESPN payload still produces a score worth sorting', () => {
	// Each of these is a shape the feed has a real reason to send: a score that has not been
	// populated yet, a game between innings with no clock, a league added upstream before it was
	// added here. None of them may produce NaN, because NaN in the comparator silently leaves the
	// slate unsorted rather than raising anything.
	const brokenPayloads: Array<[string, Game]> = [
		['a score the feed has not filled in yet', baseGame({ homeTeam: { abbreviation: 'HOM', score: undefined as unknown as number } })],
		['a score that parsed to NaN', baseGame({ homeTeam: { abbreviation: 'HOM', score: NaN } })],
		['a score that arrived as null', baseGame({ awayTeam: { abbreviation: 'AWY', score: null as unknown as number } })],
		['both scores missing', baseGame({ homeTeam: { score: undefined as unknown as number }, awayTeam: { score: undefined as unknown as number } })],
		['no period reported', baseGame({ period: undefined })],
		['no clock reported', baseGame({ clockSeconds: undefined })],
		['a clock that parsed to NaN', baseGame({ clockSeconds: NaN })],
		['a period beyond anything the league plays', baseGame({ period: 99 })],
		['a league this build has never heard of', baseGame({ league: 'kabaddi' as Game['league'] })],
		['a sport type this build has never heard of', baseGame({ sportType: 'cricket' as Game['sportType'] })],
		['nothing but an id', { id: 'game-1', homeTeam: {}, awayTeam: {} } as unknown as Game],
	];

	test.each(brokenPayloads)('%s', (_label, game) => {
		expect(describeBadShape(computePowerScore(game))).toBeNull();
	});

	test('a history full of junk cannot poison the total either', () => {
		const junkHistory = [
			{ gameId: 'game-1', timestamp: NaN, homeScore: 10, awayScore: 8 },
			{ gameId: 'game-1', timestamp: 20_000, homeScore: NaN, awayScore: 8 },
			{ gameId: 'game-1', timestamp: 40_000, homeScore: 14, awayScore: undefined },
		] as unknown as ScoreSnapshot[];
		expect(describeBadShape(computePowerScore(baseGame(), junkHistory))).toBeNull();
	});

	test('a non-finite stall count is treated as no stall rather than an unknown deduction', () => {
		const result = computePowerScore(baseGame(), [], NaN);
		expect(result.stallPenalty).toBe(0);
		expect(describeBadShape(result)).toBeNull();
	});
});

describe('a longer stall is never punished more lightly than a shorter one', () => {
	// The deduction is picked with a `find` over stallPenaltySteps, so it depends on that array
	// staying sorted from most to least severe. Reordering it silently halves the penalty on the
	// longest stalls, which is exactly the case the penalty exists for.
	test('the deduction only ever grows as the feed goes quiet for longer', () => {
		const game = baseGame({ period: 2, clockSeconds: 600 });
		const regressions: string[] = [];
		let previous = 0;
		for (let stallCount = 0; stallCount <= 40; stallCount++) {
			const { stallPenalty = 0 } = computePowerScore(game, [], stallCount);
			if (stallPenalty < previous)
				regressions.push(`${stallCount} stalled polls deducted ${stallPenalty}, down from ${previous}`);
			previous = stallPenalty;
		}
		expect(regressions).toEqual([]);
		expect(previous).toBe(Math.max(...stallPenaltySteps.map(step => step.deduction)));
	});
});
