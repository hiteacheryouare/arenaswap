import { sensitivityThresholds } from '@arenaswap/core/constants';
import type { UserPreferences } from '@arenaswap/core/types';

export interface multiviewCandidate {
	gameId: string;
	tabId: number;
	url?: string;
}

export interface multiviewPlanInput {
	candidates: readonly multiviewCandidate[];
	scores: readonly { gameId: string; total: number; breakPenalty?: number }[];
	boxedGameIds: readonly string[];
	shown: boolean;
	threshold: number;
	games: UserPreferences['multiviewGames'];
	maxBoxes: number;
	sensitivity: UserPreferences['sensitivity'];
}

export interface multiviewPlan {
	open: boolean;
	warm: boolean;
	gameIds: string[];
	tabIdByGameId: Map<string, number>;
	urlByGameId: Map<string, string>;
}

export const isFrameableUrl = (url: string | undefined): url is string => {
	if (!url) return false;
	try {
		const { protocol } = new URL(url);
		return protocol === 'https:' || protocol === 'http:';
	} catch {
		return false;
	}
};

const marginFor = (sensitivity: UserPreferences['sensitivity']): number => sensitivityThresholds[sensitivity] ?? 0;

export const multiviewWarmupPoints = 10;

export const planMultiview = ({ candidates, scores, boxedGameIds, shown, threshold, games, maxBoxes, sensitivity }: multiviewPlanInput): multiviewPlan => {
	const totalByGameId = new Map(scores.map(score => [score.gameId, score.total]));
	const breakPenaltyByGameId = new Map(scores.map(score => [score.gameId, score.breakPenalty ?? 0]));
	const tabIdByGameId = new Map<string, number>();
	const urlByGameId = new Map<string, string>();
	for (const candidate of candidates) {
		if (tabIdByGameId.has(candidate.gameId) || !totalByGameId.has(candidate.gameId) || !isFrameableUrl(candidate.url)) continue;
		tabIdByGameId.set(candidate.gameId, candidate.tabId);
		urlByGameId.set(candidate.gameId, candidate.url);
	}

	const boxed = new Set(boxedGameIds);
	const margin = shown ? marginFor(sensitivity) : 0;
	const totalOf = (gameId: string): number => totalByGameId.get(gameId) ?? 0;
	const keepingTotal = (gameId: string): number => totalOf(gameId) + (shown ? breakPenaltyByGameId.get(gameId) ?? 0 : 0);
	const isHot = (gameId: string): boolean => (boxed.has(gameId) ? keepingTotal(gameId) >= threshold - margin : totalOf(gameId) >= threshold);

	const eligible = [...tabIdByGameId.keys()];
	const hot = eligible.filter(isHot);
	const near = eligible.filter(gameId => totalOf(gameId) >= threshold - multiviewWarmupPoints);
	const open = hot.length >= 2;
	const warm = !open && hot.length === 1 && near.length >= 2;
	if (!open && !warm) return { open: false, warm: false, gameIds: [], tabIdByGameId, urlByGameId };

	const members = games === 'all' ? eligible : open ? hot : near;
	const kept = new Set(
		members.toSorted((a, b) => totalOf(b) - totalOf(a)).slice(0, maxBoxes)
	);
	const staying = boxedGameIds.filter(gameId => kept.has(gameId));
	const joining = [...kept]
		.filter(gameId => !boxed.has(gameId))
		.toSorted((a, b) => totalOf(b) - totalOf(a));
	return { open, warm, gameIds: [...staying, ...joining], tabIdByGameId, urlByGameId };
};

export interface featuredInput {
	gameIds: readonly string[];
	scores: readonly { gameId: string; total: number }[];
	current: string | null;
	sensitivity: UserPreferences['sensitivity'];
	canChange: boolean;
}

export const chooseFeatured = ({ gameIds, scores, current, sensitivity, canChange }: featuredInput): string | null => {
	const ranked = scores
		.filter(score => gameIds.includes(score.gameId))
		.toSorted((a, b) => b.total - a.total);
	const best = ranked[0];
	if (!best) return null;
	if (current === null || !gameIds.includes(current)) return best.gameId;
	if (best.gameId === current || !canChange) return current;
	const currentTotal = ranked.find(score => score.gameId === current)?.total ?? 0;
	return best.total >= currentTotal + marginFor(sensitivity) ? best.gameId : current;
};

export interface overtakenInput {
	soloGameId: string | null;
	boxedGameIds: readonly string[];
	candidateGameIds: readonly string[];
	scores: readonly { gameId: string; total: number }[];
	sensitivity: UserPreferences['sensitivity'];
}

export const isOvertaken = ({ soloGameId, boxedGameIds, candidateGameIds, scores, sensitivity }: overtakenInput): boolean => {
	const soloTotal = scores.find(score => score.gameId === soloGameId)?.total;
	if (soloTotal === undefined) return true;
	return scores.some(score => (
		candidateGameIds.includes(score.gameId)
		&& !boxedGameIds.includes(score.gameId)
		&& score.total >= soloTotal + marginFor(sensitivity)
	));
};
