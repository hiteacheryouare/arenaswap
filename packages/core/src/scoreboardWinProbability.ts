import type { EspnSituation } from './espnSchemas';
import { isObjectRecord } from './typeGuards';
import type { Game, LeagueId } from './types';

// Leagues whose scoreboard carries the home side's win probability on a live game, checked against
// recorded live feeds: it agrees with the last entry of the summary's line. In these the line is
// built from our own polls instead of the summary's history. Basketball sends it too but is left
// out, because its summary also carries the box score's lead-change count, so nothing would be
// saved. College basketball and the UFL had no live game to check.
export const scoreboardWinProbabilityLeagues: ReadonlySet<LeagueId> = new Set<LeagueId>(['nfl', 'ncaaf']);

// The summary's line has one entry per play, and a poll that lands between plays reads the same
// play again, so one reading is kept per play. That keeps the average weighted the way the
// summary's was. A football game runs to about 200 plays and a basketball game to about 500.
const maxReadingsPerGame = 600;

export const readHomeWinProbability = (situation: EspnSituation): number | undefined => {
	const value = situation.lastPlay?.probability?.homeWinPercentage;
	return typeof value === 'number' && Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : undefined;
};

export interface SummaryNeeds {
	// The scoreboard has already given this game a win probability reading.
	hasScoreboardReadings: boolean;
	// The closing line is read from the summary once and kept, so one look is enough.
	hasSeenSummary: boolean;
	hasRosteredPlayer: boolean;
}

// The summary also carries the closing line, the box score behind the fantasy points, and
// basketball's running lead-change count, so it is only dropped once none of them still need it.
export const summaryStillNeeded = (game: Pick<Game, 'league' | 'sportType'>, needs: SummaryNeeds): boolean => (
	!scoreboardWinProbabilityLeagues.has(game.league)
	|| !needs.hasScoreboardReadings
	|| !needs.hasSeenSummary
	|| needs.hasRosteredPlayer
	|| game.sportType === 'basketball'
);

export const createWinProbabilityTracker = () => {
	const readings = new Map<string, number[]>();
	const lastPlayIds = new Map<string, string>();

	// Without a play id on either side, a reading that matches the last one is taken as the same play.
	const isSamePlay = (game: Game, line: number[]): boolean => {
		const previousPlayId = lastPlayIds.get(game.id);
		if (game.lastPlayId !== undefined && previousPlayId !== undefined) return game.lastPlayId === previousPlayId;
		return line[line.length - 1] === game.homeWinProbability;
	};

	const record = (games: readonly Game[]) => {
		for (const game of games) {
			if (game.status !== 'in' || !scoreboardWinProbabilityLeagues.has(game.league)) continue;
			if (game.homeWinProbability === undefined) continue;
			const line = readings.get(game.id) ?? [];
			if (line.length > 0 && isSamePlay(game, line)) continue;
			if (game.lastPlayId !== undefined) lastPlayIds.set(game.id, game.lastPlayId);
			line.push(game.homeWinProbability);
			if (line.length > maxReadingsPerGame) line.shift();
			readings.set(game.id, line);
		}
	};

	const historyOf = (gameId: string): number[] | undefined => readings.get(gameId);

	const retainOnly = (gameIds: ReadonlySet<string>) => {
		for (const gameId of readings.keys()) {
			if (gameIds.has(gameId)) continue;
			readings.delete(gameId);
			lastPlayIds.delete(gameId);
		}
	};

	const clear = () => {
		readings.clear();
		lastPlayIds.clear();
	};

	const serialize = (): Record<string, number[]> => Object.fromEntries(readings);

	const hydrate = (stored: unknown) => {
		clear();
		if (!isObjectRecord(stored)) return;
		for (const [gameId, line] of Object.entries(stored)) {
			if (!Array.isArray(line)) continue;
			const valid = line.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
			if (valid.length > 0) readings.set(gameId, valid.slice(-maxReadingsPerGame));
		}
	};

	return { record, historyOf, retainOnly, clear, serialize, hydrate };
};

export type WinProbabilityTracker = ReturnType<typeof createWinProbabilityTracker>;
