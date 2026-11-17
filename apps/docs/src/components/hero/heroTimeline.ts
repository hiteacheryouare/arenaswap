import { computePowerScore } from 'powerscore';
import type { ScoreSnapshot } from 'powerscore';
import { defaultCooldownSecs, defaultSensitivity, pollIntervalMs, sensitivityThresholds } from '@arenaswap/core/constants';
import type { Game, PowerScoreResult } from '@arenaswap/core/types';
import { heroGameAt, heroGames } from './heroGames';

export const switchThreshold = sensitivityThresholds[defaultSensitivity];
export const cooldownTicks = Math.round((defaultCooldownSecs * 1000) / pollIntervalMs);

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
	return { id: script.base.id, game, index, result: computePowerScore(game, snapshots, probabilities) };
});

export const bestOf = (board: ScoredGame[]): ScoredGame => (
	board.reduce((a, b) => (b.result.total > a.result.total ? b : a))
);

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

export const openingIndex = bestOf(scoreBoardAt(0)).index;

export const replayThrough = (tick: number): HeroStateAt => {
	let onScreenIndex = openingIndex;
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
