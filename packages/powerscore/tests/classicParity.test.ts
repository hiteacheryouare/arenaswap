import { scoreGame, signalPoints, boostPoints } from '../src/compose';
import { classicMode } from '../src/modes';
import { scoringOpportunityBoost } from '../src/boosts/scoringOpportunity';
import { leagueConfigs } from '../src/constants';
import type { Game, ScoreSnapshot } from '../src/types';
import { scoreGameV2, type V2PostseasonRound, type V2SignalName } from './legacy/v2/compose';
import type { Game as V2Game } from './legacy/v2/types';

const signalNames: V2SignalName[] = ['closeness', 'lateGame', 'momentum', 'leadChanges', 'comeback'];

const createRandom = (seed: number) => {
	let state = seed >>> 0;
	const next = () => {
		state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
		return state / 2 ** 32;
	};
	const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
	const pick = <T>(items: readonly T[]): T => items[int(0, items.length - 1)]!;
	const chance = (p: number) => next() < p;
	return { next, int, pick, chance };
};

type Random = ReturnType<typeof createRandom>;

const buildHistory = (random: Random, gameId: string, home: number, away: number): ScoreSnapshot[] => {
	const length = random.pick([0, 1, 2, 3, 5, 9, 16]);
	const snapshots: ScoreSnapshot[] = [];
	let h = Math.max(0, home - random.int(0, 12));
	let a = Math.max(0, away - random.int(0, 12));
	let t = 1_700_000_000_000;
	for (let i = 0; i < length; i++) {
		t += random.int(5_000, 40_000);
		if (i === length - 1) {
			h = home;
			a = away;
		} else {
			if (random.chance(0.3)) h = Math.min(home, h + random.int(1, 3));
			if (random.chance(0.3)) a = Math.min(away, a + random.int(1, 3));
			// Feeds revise scores down after a review.
			if (random.chance(0.03)) h = Math.max(0, h - 2);
		}
		snapshots.push({ gameId, timestamp: t, homeScore: h, awayScore: a });
	}
	return snapshots;
};

const buildGame = (random: Random, index: number): Game => {
	const league = random.pick(leagueConfigs);
	const scoreScale = { basketball: 110, football: 35, hockey: 5, baseball: 8, softball: 8, soccer: 4 }[league.sportType];
	const home = random.int(0, scoreScale);
	const away = random.chance(0.25) ? home : Math.max(0, home + random.int(-Math.ceil(scoreScale / 3), Math.ceil(scoreScale / 3)));
	const periodRoll = random.int(0, league.regularPeriods + 2);
	const clockSeconds = random.chance(0.1)
		? undefined
		: league.sportType === 'soccer'
			? random.int(0, 6000)
			: random.int(0, Math.max(0, league.periodDurationSecs));
	const game: Game = {
		id: `g${index}`,
		league: league.id,
		sportType: league.sportType,
		homeTeam: { score: home, abbreviation: 'HOM' },
		awayTeam: { score: away, abbreviation: random.chance(0.05) ? undefined : 'AWY' },
		...(periodRoll === 0 ? {} : { period: periodRoll }),
		...(clockSeconds === undefined ? {} : { clockSeconds }),
		status: random.pick(['in', 'in', 'in', 'pre', 'post'] as const),
		...(random.chance(0.05) ? { intermission: true } : {}),
		...(random.chance(0.03) ? { delayed: true } : {}),
	};
	if (league.sportType === 'baseball' || league.sportType === 'softball') {
		if (random.chance(0.8)) game.topOfInning = random.chance(0.5);
		if (random.chance(0.8)) game.baseRunners = { first: random.chance(0.4), second: random.chance(0.3), third: random.chance(0.25) };
	}
	if (league.sportType === 'football' && random.chance(0.6)) {
		game.isRedZone = random.chance(0.6);
		if (random.chance(0.8)) game.down = random.int(1, 4);
		if (random.chance(0.8)) game.distance = random.int(1, 15);
		game.isGoalToGo = random.chance(0.3);
	}
	return game;
};

const buildWinProbability = (random: Random): number[] => {
	if (random.chance(0.4)) return [];
	const length = random.int(1, 30);
	const center = random.next();
	return Array.from({ length }, () => (random.chance(0.03) ? Number.NaN : Math.min(1, Math.max(0, center + (random.next() - 0.5) * 0.4))));
};

// Classic with only the boost 2.2.0 had, so the sweep pins the pipeline itself. The boosts added
// since are tested on their own.
const classicAsShipped = { ...classicMode, boosts: [scoringOpportunityBoost] };

describe('v3 Classic matches the 2.2.0 pipeline', () => {
	const random = createRandom(20261003);
	const cases = 20_000;

	test(`${cases} seeded games agree field by field`, () => {
		const mismatches: string[] = [];
		const seen = { highTotal: 0, overflow: 0, disabled: 0, stalled: 0, scoringOpportunity: 0, postseason: 0, momentum: 0, leadChanges: 0, comeback: 0, frozen: 0 };
		for (let i = 0; i < cases; i++) {
			const game = buildGame(random, i);
			const history = buildHistory(random, game.id, game.homeTeam.score, game.awayTeam.score);
			const stallCount = random.pick([0, 0, 0, 3, 8, 12, 15, 20]);
			const winProbability = buildWinProbability(random);
			const disabledSignals = random.chance(0.6) ? [] : signalNames.filter(() => random.chance(0.35));
			const favoriteTeamCount = random.pick([0, 0, 1, 2]);
			const favoriteBoostPoints = random.pick([0, 10, 25]);
			const postseasonBoostPoints = random.pick([0, 8, 20]);
			const postseasonRound = random.pick([undefined, 0, 1, 2, 3] as const) as V2PostseasonRound | undefined;
			const gameBoost = random.pick([0, 0, 0, 15, 40]);
			game.postseasonRound = postseasonRound;

			const v2 = scoreGameV2(game as V2Game, history, stallCount, winProbability, {
				disabledSignals,
				favoriteTeamCount,
				favoriteBonusPoints: favoriteBoostPoints,
				postseasonBoostPoints,
				postseasonRound,
				gameBoost,
			});
			const v3 = scoreGame(game, { history, stallCount, winProbability }, {
				mode: classicAsShipped,
				disabledSignals,
				favoriteTeamCount,
				favoriteBoostPoints,
				postseasonBoostPoints,
				gameBoost,
			});

			const fields: [string, unknown, unknown][] = [
				...signalNames.map((name): [string, unknown, unknown] => [name, v2[name], signalPoints(v3, name)]),
				['signalsSubtotal', v2.signalsSubtotal ?? 0, v3.scaledSubtotal],
				['stallPenalty', v2.stallPenalty ?? 0, v3.stallPenalty],
				['winProbabilityVariance', v2.winProbabilityVariance, v3.winProbabilityVariance],
				['favoriteBonus', v2.favoriteBonus, boostPoints(v3, 'favoriteBoost')],
				['gameBoost', v2.gameBoost, boostPoints(v3, 'gameBoost')],
				['scoringOpportunityBoost', v2.scoringOpportunityBoost, boostPoints(v3, 'scoringOpportunity')],
				['postseasonBoost', v2.postseasonBoost, boostPoints(v3, 'postseasonBoost')],
			];

			// The two deliberate changes. 2.x kept a disabled signal's reason in the line, and its
			// disabled path floored after adding win probability instead of before.
			if (disabledSignals.length === 0) fields.push(['reason', v2.reason, v3.reason]);
			const subtotalUnderStall = v3.scaledSubtotal < v3.stallPenalty && (v3.winProbabilityVariance ?? 0) > 0;
			if (disabledSignals.length === 0 || !subtotalUnderStall) fields.push(['total', v2.total, v3.total]);

			if (v3.total >= 70) seen.highTotal++;
			if (v3.total > 100) seen.overflow++;
			if (disabledSignals.length > 0) seen.disabled++;
			if (v3.stalled) seen.stalled++;
			if (boostPoints(v3, 'scoringOpportunity') > 0) seen.scoringOpportunity++;
			if (boostPoints(v3, 'postseasonBoost') > 0) seen.postseason++;
			if (signalPoints(v3, 'momentum') > 0) seen.momentum++;
			if (signalPoints(v3, 'leadChanges') > 0) seen.leadChanges++;
			if (signalPoints(v3, 'comeback') > 0) seen.comeback++;
			if (game.intermission || game.delayed) seen.frozen++;

			for (const [name, expected, actual] of fields) {
				if (expected !== actual && mismatches.length < 20)
					mismatches.push(`case ${i} ${game.league} ${name}: v2=${String(expected)} v3=${String(actual)}`);
			}
		}
		expect(mismatches).toEqual([]);
		// The sweep only proves something if it reached the states that matter.
		for (const [state, count] of Object.entries(seen)) expect([state, count >= 50]).toEqual([state, true]);
	});
});
