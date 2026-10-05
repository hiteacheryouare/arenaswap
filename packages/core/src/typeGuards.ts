import { normalizePowerScoreResult } from 'powerscore';
import type { Game, LeagueLogoMap, LiveScore, PowerScoreHistoryMap, PowerScoreResult, PowerScoreSnapshot, ReasonFragment, ScoreBreakdown, ScoreHistoryMap, ScoreSnapshot } from './types';

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

const isNumberRecord = (value: unknown): value is Record<string, number> => (
	isObjectRecord(value) && Object.values(value).every(isFiniteNumber)
);

const isReasonFragment = (value: unknown): value is ReasonFragment => (
	isObjectRecord(value) && typeof value.key === 'string'
	&& (value.params === undefined || (isObjectRecord(value.params) && Object.values(value.params).every(param => typeof param === 'string' || isFiniteNumber(param))))
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
	&& isFiniteNumber(value.signalsSubtotal)
	&& isFiniteNumber(value.favoriteBonus)
	&& isFiniteNumber(value.favoriteTeamCount)
	&& typeof value.stalled === 'boolean'
	&& typeof value.reason === 'string'
	// The boosts and volatility are optional: older snapshots predate them, and volatility is
	// absent whenever ESPN gave us no line.
	&& (value.gameBoost === undefined || isFiniteNumber(value.gameBoost))
	&& (value.scoringOpportunityBoost === undefined || isFiniteNumber(value.scoringOpportunityBoost))
	&& (value.postseasonBoost === undefined || isFiniteNumber(value.postseasonBoost))
	&& (value.stallPenalty === undefined || isFiniteNumber(value.stallPenalty))
	&& (value.winProbabilityVariance === undefined || isFiniteNumber(value.winProbabilityVariance))
	&& (value.modeId === undefined || typeof value.modeId === 'string')
	&& (value.signals === undefined || isNumberRecord(value.signals))
	&& (value.boosts === undefined || isNumberRecord(value.boosts))
	&& (value.reasons === undefined || (Array.isArray(value.reasons) && value.reasons.every(isReasonFragment)))
);


const isScoredItem = (value: unknown): value is { id: string; points: number; ceiling?: unknown } => (
	isObjectRecord(value) && typeof value.id === 'string' && isFiniteNumber(value.points)
);

const isBlendResult = (value: unknown): value is ScoreBreakdown['blend'] => (
	isObjectRecord(value)
	&& (value.kind === 'floor' || value.kind === 'mix' || value.kind === 'boost')
	&& isFiniteNumber(value.weight) && isFiniteNumber(value.ownTotal) && isFiniteNumber(value.classicTotal)
	&& (value.floorApplied === undefined || typeof value.floorApplied === 'boolean')
);

// Validated whole or dropped whole: half a breakdown would draw a chart that disagrees with itself.
const normalizeBreakdown = (value: unknown): ScoreBreakdown | undefined => {
	if (!isObjectRecord(value) || typeof value.modeId !== 'string') return undefined;
	const { signals, boosts, reasons } = value;
	if (!Array.isArray(signals) || !signals.every(signal => isScoredItem(signal) && isFiniteNumber(signal.ceiling))) return undefined;
	if (!Array.isArray(boosts) || !boosts.every(isScoredItem)) return undefined;
	if (!Array.isArray(reasons) || !reasons.every(isReasonFragment)) return undefined;
	return {
		modeId: value.modeId,
		signals: signals as ScoreBreakdown['signals'],
		boosts: boosts as ScoreBreakdown['boosts'],
		reasons: reasons as ReasonFragment[],
		frozen: value.frozen === true,
		scaledSubtotal: isFiniteNumber(value.scaledSubtotal) ? value.scaledSubtotal : 0,
		signalCeiling: isFiniteNumber(value.signalCeiling) ? value.signalCeiling : 0,
		...(isFiniteNumber(value.classicTotal) ? { classicTotal: value.classicTotal } : {}),
		...(isBlendResult(value.blend) ? { blend: value.blend } : {}),
	};
};


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

export const normalizeScores = (value: unknown): LiveScore[] => {
	if (!Array.isArray(value)) return [];
	return value
		.filter(isPowerScoreLike)
		.map(score => {
			const breakdown = normalizeBreakdown((score as { breakdown?: unknown }).breakdown);
			const normalized = normalizePowerScoreResult(score, { allowTotalOverflow: true });
			return breakdown ? { ...normalized, breakdown } : normalized;
		});
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
