import { pollMaxEagerMs } from '@arenaswap/core/constants';
import type { Game } from '@arenaswap/core/types';

export const lateStartGraceMs = 15 * 60 * 1000;

const kickoffDelayMs = (leagueGames: Game[], now: number): number | null => {
	let delay: number | null = null;
	for (const game of leagueGames) {
		if (game.status !== 'pre' || !game.startTime) continue;
		const startMs = new Date(game.startTime).getTime();
		if (!Number.isFinite(startMs)) continue;
		if (now - startMs > lateStartGraceMs && game.delayed !== true) continue;
		const wait = startMs > now ? startMs - now : pollMaxEagerMs;
		if (delay === null || wait < delay) delay = wait;
	}
	return delay;
};

export default kickoffDelayMs;
