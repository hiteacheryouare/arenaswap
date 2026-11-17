import { estimatedWrapMs, historyWindowMs, sportTypeConfigMap } from '@arenaswap/core/constants';
import type { Game } from '@arenaswap/core/types';

const startToleranceFraction = 0.1;

const endCoverageFraction = 0.9;

interface timestamped { timestamp: number }

export const chartHistory = <T extends timestamped>(
	history: readonly T[],
	game: Pick<Game, 'sportType' | 'status'>,
	now: number = Date.now(),
): T[] => {
	if (game.status === 'post') return [...history];
	const windowMs = sportTypeConfigMap[game.sportType]?.historyWindowMs ?? historyWindowMs;
	const recent = history.filter(snapshot => snapshot.timestamp >= now - windowMs);
	return recent.length > 0 ? recent : history.slice(-1);
};

const gameSpan = (game: Pick<Game, 'sportType' | 'startTime'>, now: number): { startMs: number; lengthMs: number } | null => {
	if (!game.startTime) return null;
	const startMs = new Date(game.startTime).getTime();
	if (!Number.isFinite(startMs)) return null;
	const lengthMs = estimatedWrapMs(game, now) - startMs;
	return lengthMs > 0 ? { startMs, lengthMs } : null;
};

export const coversWholeGame = (
	history: readonly timestamped[],
	game: Pick<Game, 'sportType' | 'startTime'>,
	now: number = Date.now(),
): boolean => {
	if (history.length < 2) return false;
	const span = gameSpan(game, now);
	if (!span) return false;

	const first = history[0]!.timestamp;
	const last = history[history.length - 1]!.timestamp;
	if (first - span.startMs > span.lengthMs * startToleranceFraction) return false;
	return last - span.startMs >= span.lengthMs * endCoverageFraction;
};
