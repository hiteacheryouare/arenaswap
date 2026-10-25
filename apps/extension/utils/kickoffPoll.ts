import { pollMaxEagerMs } from '@arenaswap/core/constants';
import type { Game } from '@arenaswap/core/types';

// How long past its listed start a game that has not gone live is still waited on at the live beat.
export const lateStartGraceMs = 15 * 60 * 1000;

// How soon a quiet league should poll to see its next game go live: at the listed start, or at the
// live beat once a start has passed with the game still scheduled. Null when nothing is starting.
const kickoffDelayMs = (leagueGames: Game[], now: number): number | null => {
	let delay: number | null = null;
	for (const game of leagueGames) {
		if (game.status !== 'pre' || !game.startTime) continue;
		const startMs = new Date(game.startTime).getTime();
		if (!Number.isFinite(startMs) || now - startMs > lateStartGraceMs) continue;
		const wait = startMs > now ? startMs - now : pollMaxEagerMs;
		if (delay === null || wait < delay) delay = wait;
	}
	return delay;
};

export default kickoffDelayMs;
