import type { PowerScoreSnapshot, ScoreSnapshot } from './types';

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
);
