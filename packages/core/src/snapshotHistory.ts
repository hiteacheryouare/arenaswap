import { sportTypeConfigMap } from 'powerscore';
import type { ScoreSnapshot } from 'powerscore';
import type { Game } from './types';

export const getHistoryWindowMsForGame = (game: Pick<Game, 'sportType'>): number => (
	(sportTypeConfigMap[game.sportType] ?? sportTypeConfigMap.basketball).historyWindowMs
);

export const maxSnapshotsPerGame = 400;

const coarseSampleIntervalMs = 120_000;

const thinToCap = <T extends { timestamp: number }>(coarse: T[], recent: T[]): T[] => {
	let kept = coarse;
	while (kept.length + recent.length > maxSnapshotsPerGame && kept.length > 2) {
		kept = kept.filter((_, index) => index % 2 === 0 || index === kept.length - 1);
	}
	return [...kept, ...recent].slice(-maxSnapshotsPerGame);
};

export const recentSnapshots = <T extends { timestamp: number }>(snapshots: readonly T[], cutoff: number): T[] => {
	const recent = snapshots.filter(snapshot => snapshot.timestamp >= cutoff);
	return recent.length > 0 ? recent : snapshots.slice(-1);
};

export const retainSnapshots = <T extends { timestamp: number }>(snapshots: T[], cutoff: number, keepWholeGame: boolean): T[] => {
	if (!keepWholeGame) return recentSnapshots(snapshots, cutoff);
	const coarse: T[] = [];
	const recent: T[] = [];
	for (const snapshot of snapshots) {
		if (snapshot.timestamp >= cutoff) {
			recent.push(snapshot);
			continue;
		}
		const previous = coarse[coarse.length - 1];
		if (!previous || snapshot.timestamp - previous.timestamp >= coarseSampleIntervalMs) coarse.push(snapshot);
	}
	if (recent.length === 0) {
		const newest = snapshots[snapshots.length - 1];
		if (newest && coarse[coarse.length - 1] !== newest) coarse.push(newest);
	}
	return thinToCap(coarse, recent);
};

export const toScoreSnapshot = (game: Game, timestamp: number): ScoreSnapshot => ({
	gameId: game.id,
	timestamp,
	homeScore: game.homeTeam.score,
	awayScore: game.awayTeam.score,
});
