import { estimatedWrapMs } from './constants';
import type { Game } from './types';

export const stuckQuietMs = 30 * 60_000;

export interface GameProgress {
	key: string;
	since: number;
}

export type GameProgressMap = Record<string, GameProgress>;

const progressKeyOf = (game: Game): string => [
	game.awayTeam.score,
	game.homeTeam.score,
	game.period,
	game.clockSeconds,
	game.topOfInning,
	game.bso?.outs,
	game.intermission,
].join('|');

export const trackProgress = (previous: GameProgressMap, liveGames: Game[], now: number): GameProgressMap => {
	const next: GameProgressMap = {};
	for (const game of liveGames) {
		const key = progressKeyOf(game);
		const before = previous[game.id];
		next[game.id] = before?.key === key ? before : { key, since: now };
	}
	return next;
};

export const isStuckLive = (game: Game, progress: GameProgress | undefined, now: number): boolean => (
	game.status === 'in'
	&& game.delayed !== true
	&& progress !== undefined
	&& now > estimatedWrapMs(game, now)
	&& now - progress.since >= stuckQuietMs
);

export const stuckSinceOf = (liveGames: Game[], progress: GameProgressMap, now: number): Record<string, number> => Object.fromEntries(
	liveGames.flatMap(game => isStuckLive(game, progress[game.id], now) ? [[game.id, progress[game.id]!.since]] : []),
);
