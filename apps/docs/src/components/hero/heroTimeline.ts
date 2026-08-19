import { computePowerScore } from 'powerscore';
import type { ScoreSnapshot } from 'powerscore';
import { defaultCooldownSecs, defaultSensitivity, pollIntervalMs, sensitivityThresholds } from '@arenaswap/core/constants';
import type { Game, PowerScoreResult } from '@arenaswap/core/types';
import { heroGameAt, heroGames } from './heroGames';

// The scoring and switching behind the hero, as pure functions of a tick.
//
// This used to accumulate score history into refs as the animation advanced, which had two
// problems. It mutated during render, so React was free to run it twice and desynchronise the
// history from the board. And it meant the state at tick 18 could only be reached by having played
// ticks 0 to 17, so the reduced-motion still frame — which jumps straight there — scored every card
// against a two-entry history and under-reported the whole board by 20-odd points.
//
// Everything here is derived from the timeline instead, so tick 18 scores the same whether you
// watched the seventeen ticks before it or not. The history is at most 27 entries per game, so
// rebuilding it per tick costs nothing.
//
// `scripts/docs/validateHeroTimeline.ts` prints the output of these same functions, so the table it
// prints is the hero rather than a second implementation of it.

export const switchThreshold = sensitivityThresholds[defaultSensitivity];
export const cooldownTicks = Math.round((defaultCooldownSecs * 1000) / pollIntervalMs);

// A fixed base instead of Date.now(), so a server render and the first client render agree. The
// scorer only reads differences between snapshot timestamps, so the absolute value is arbitrary.
const heroEpoch = 1_767_225_600_000;

export interface ScoredGame {
	id: string;
	game: Game;
	result: PowerScoreResult;
	index: number;
}

export interface HeroSwitch {
	tick: number;
	from: string;
	to: string;
	gap: number;
}

// ESPN's win probability is not in this demo's data, so it is derived from the margin. It only
// feeds the ±5 variance boost, and omitting it would silently drop a signal the popup does show.
const winProbability = (game: Game): number => (
	Math.min(0.97, Math.max(0.03, 0.5 + (game.homeTeam.score - game.awayTeam.score) * 0.045))
);

export const scoreBoardAt = (tick: number): ScoredGame[] => heroGames.map((script, index) => {
	const snapshots: ScoreSnapshot[] = [];
	const probabilities: number[] = [];

	for (let past = 0; past <= tick; past++) {
		const at = heroGameAt(script, past);
		snapshots.push({
			gameId: script.base.id,
			timestamp: heroEpoch + past * pollIntervalMs,
			homeScore: at.homeTeam.score,
			awayScore: at.awayTeam.score,
		});
		probabilities.push(winProbability(at));
	}

	const game = heroGameAt(script, tick);
	return { id: script.base.id, game, index, result: computePowerScore(game, snapshots, 0, probabilities) };
});

export const bestOf = (board: ScoredGame[]): ScoredGame => (
	board.reduce((a, b) => (b.result.total > a.result.total ? b : a))
);

// The shipped rule: clear the sensitivity gap, and be off cooldown.
export const shouldSwitch = (
	board: ScoredGame[],
	onScreenIndex: number,
	tick: number,
	lastSwitchTick: number,
): ScoredGame | null => {
	const best = bestOf(board);
	if (best.index === onScreenIndex) return null;
	if (best.result.total - board[onScreenIndex].result.total < switchThreshold) return null;
	if (tick - lastSwitchTick < cooldownTicks) return null;
	return best;
};

export interface HeroStateAt {
	board: ScoredGame[];
	onScreenIndex: number;
	lastSwitch: HeroSwitch | null;
	switches: HeroSwitch[];
}

// Runs the whole thing from the first tick, which is the only honest way to answer "which tab would
// you be on at tick N": being on a tab is a consequence of every switch decision before it.
export const replayThrough = (tick: number): HeroStateAt => {
	let onScreenIndex = 0;
	let lastSwitchTick = -cooldownTicks;
	let lastSwitch: HeroSwitch | null = null;
	const switches: HeroSwitch[] = [];
	let board = scoreBoardAt(0);

	for (let at = 0; at <= tick; at++) {
		board = scoreBoardAt(at);
		const target = shouldSwitch(board, onScreenIndex, at, lastSwitchTick);
		if (!target) continue;
		lastSwitch = {
			tick: at,
			from: heroGames[onScreenIndex].tabTitle,
			to: heroGames[target.index].tabTitle,
			gap: target.result.total - board[onScreenIndex].result.total,
		};
		switches.push(lastSwitch);
		onScreenIndex = target.index;
		lastSwitchTick = at;
	}

	return { board, onScreenIndex, lastSwitch, switches };
};
