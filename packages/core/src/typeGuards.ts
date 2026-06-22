import { normalizePowerScoreResult } from 'powerscore';
import type { Game, LeagueLogoMap, PowerScoreHistoryMap, PowerScoreResult, PowerScoreSnapshot, ScoreHistoryMap, ScoreSnapshot } from './types';

export const isObjectRecord = (value: unknown): value is Record<string, unknown> => (
	typeof value === 'object' && value !== null
);

export const isFiniteNumber = (value: unknown): value is number => (
	typeof value === 'number' && Number.isFinite(value)
);

export const isScoreSnapshotLike = (value: unknown): value is ScoreSnapshot => (
	isObjectRecord(value)
	&& typeof value.gameId === 'string'
	&& isFiniteNumber(value.timestamp)
	&& isFiniteNumber(value.homeScore)
	&& isFiniteNumber(value.awayScore)
);

export const isPowerScoreSnapshotLike = (value: unknown): value is PowerScoreSnapshot => (
	isObjectRecord(value)
	&& typeof value.gameId === 'string'
	&& isFiniteNumber(value.timestamp)
	&& isFiniteNumber(value.total)
	&& isFiniteNumber(value.closeness)
	&& isFiniteNumber(value.lateGame)
	&& isFiniteNumber(value.momentum)
	&& isFiniteNumber(value.leadChanges)
	&& isFiniteNumber(value.comeback)
	&& isFiniteNumber(value.baseTotal)
	&& isFiniteNumber(value.favoriteBonus)
	&& isFiniteNumber(value.favoriteTeamCount)
	&& typeof value.stalled === 'boolean'
	&& typeof value.reason === 'string'
	// gameBoost is optional — older snapshots won't have it; hydration fills it with 0
	&& (value.gameBoost === undefined || isFiniteNumber(value.gameBoost))
);


export const normalizeGameBoosts = (value: unknown): Record<string, number> => {
	if (!isObjectRecord(value)) return {};
	const result: Record<string, number> = {};
	for (const [k, v] of Object.entries(value)) {
		if (isFiniteNumber(v) && v > 0) result[k] = v;
	}
	return result;
};

export const isGameArray = (value: unknown): value is Game[] => Array.isArray(value);

export const isLeagueLogoMap = (value: unknown): value is LeagueLogoMap => isObjectRecord(value);

const isPowerScoreLike = (value: unknown): value is Partial<PowerScoreResult> & Pick<PowerScoreResult, 'gameId'> => (
	isObjectRecord(value) && typeof value.gameId === 'string'
);

export const normalizeScores = (value: unknown): PowerScoreResult[] => {
	if (!Array.isArray(value)) return [];
	return value
		.filter(isPowerScoreLike)
		.map(score => normalizePowerScoreResult(score, { allowTotalOverflow: true }));
};

export const normalizeScoreHistory = (value: unknown): ScoreHistoryMap => {
	if (!isObjectRecord(value)) return {};
	return Object.entries(value).reduce<ScoreHistoryMap>((acc, [gameId, snapshots]) => {
		if (!Array.isArray(snapshots)) return acc;
		acc[gameId] = snapshots.filter(isScoreSnapshotLike);
		return acc;
	}, {});
};

export const normalizePowerScoreHistory = (value: unknown): PowerScoreHistoryMap => {
	if (!isObjectRecord(value)) return {};
	return Object.entries(value).reduce<PowerScoreHistoryMap>((acc, [gameId, snapshots]) => {
		if (!Array.isArray(snapshots)) return acc;
		acc[gameId] = snapshots.filter(isPowerScoreSnapshotLike);
		return acc;
	}, {});
};
