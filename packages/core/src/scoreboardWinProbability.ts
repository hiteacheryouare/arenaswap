import type { WinProbabilityReading } from 'powerscore';
import { timelineProgressOf } from './scoring';
import { isObjectRecord } from './typeGuards';
import type { Game, LeagueId } from './types';

export const scoreboardWinProbabilityLeagues: ReadonlySet<LeagueId> = new Set<LeagueId>(['nfl', 'ncaaf']);

const maxReadingsPerGame = 600;

export interface SummaryNeeds {
	hasScoreboardReadings: boolean;
	hasSummaryLine: boolean;
	hasRosteredPlayer: boolean;
}

const summaryCarriesLeadChanges = (game: Pick<Game, 'sportType'>): boolean => game.sportType === 'basketball';

export const summaryStillNeeded = (game: Pick<Game, 'league' | 'sportType'>, needs: SummaryNeeds): boolean => (
	!scoreboardWinProbabilityLeagues.has(game.league)
	|| !needs.hasScoreboardReadings
	|| !needs.hasSummaryLine
	|| needs.hasRosteredPlayer
	|| summaryCarriesLeadChanges(game)
);

const isReading = (value: unknown): value is WinProbabilityReading => (
	isObjectRecord(value)
	&& typeof value.homeWinProbability === 'number' && Number.isFinite(value.homeWinProbability)
	&& typeof value.progress === 'number' && Number.isFinite(value.progress)
);

export const createWinProbabilityTracker = () => {
	const readings = new Map<string, WinProbabilityReading[]>();
	const lastPlayIds = new Map<string, string>();

	const isSamePlay = (game: Game, line: WinProbabilityReading[]): boolean => {
		const previousPlayId = lastPlayIds.get(game.id);
		if (game.lastPlayId !== undefined && previousPlayId !== undefined) return game.lastPlayId === previousPlayId;
		return line[line.length - 1]?.homeWinProbability === game.homeWinProbability;
	};

	const record = (games: readonly Game[]) => {
		for (const game of games) {
			if (game.status !== 'in' || !scoreboardWinProbabilityLeagues.has(game.league)) continue;
			if (game.homeWinProbability === undefined) continue;
			const line = readings.get(game.id) ?? [];
			if (line.length > 0 && isSamePlay(game, line)) continue;
			if (game.lastPlayId !== undefined) lastPlayIds.set(game.id, game.lastPlayId);
			line.push({ homeWinProbability: game.homeWinProbability, progress: timelineProgressOf(game) });
			if (line.length > maxReadingsPerGame) line.shift();
			readings.set(game.id, line);
		}
	};

	const historyOf = (gameId: string): WinProbabilityReading[] | undefined => readings.get(gameId);

	const adopt = (gameId: string, summaryLine: readonly WinProbabilityReading[]) => {
		const own = readings.get(gameId);
		if (!own || summaryLine.length <= own.length) return;
		readings.set(gameId, summaryLine.slice(-maxReadingsPerGame));
	};

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

	const serialize = (): Record<string, WinProbabilityReading[]> => Object.fromEntries(readings);

	const hydrate = (stored: unknown) => {
		clear();
		if (!isObjectRecord(stored)) return;
		for (const [gameId, line] of Object.entries(stored)) {
			if (!Array.isArray(line)) continue;
			const valid = line.filter(isReading);
			if (valid.length > 0) readings.set(gameId, valid.slice(-maxReadingsPerGame));
		}
	};

	return { record, historyOf, adopt, retainOnly, clear, serialize, hydrate };
};

export type WinProbabilityTracker = ReturnType<typeof createWinProbabilityTracker>;
