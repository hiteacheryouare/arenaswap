import { sensitivityThresholds } from '@arenaswap/core/constants';
import type { UserPreferences } from '@arenaswap/core/types';

export interface multiviewCandidate {
	gameId: string;
	tabId: number;
	url?: string;
}

export interface multiviewPlanInput {
	// Registered game tabs that are still open, in registry order.
	candidates: readonly multiviewCandidate[];
	scores: readonly { gameId: string; total: number; breakPenalty?: number }[];
	// Games boxed right now, in the order they joined. Empty while Multiview is closed.
	boxedGameIds: readonly string[];
	// Whether those boxes are on screen. Only a box the user has seen keeps its place below the threshold.
	shown: boolean;
	threshold: number;
	games: UserPreferences['multiviewGames'];
	maxBoxes: number;
	sensitivity: UserPreferences['sensitivity'];
}

export interface multiviewPlan {
	open: boolean;
	// Not open yet, but close enough that Multiview starts loading its boxes out of sight.
	warm: boolean;
	// Box order: games already boxed keep their place, newcomers join behind them, best first.
	gameIds: string[];
	tabIdByGameId: Map<string, number>;
	urlByGameId: Map<string, string>;
}

// Only a web page can go in a box. Another extension page, a browser page or a file cannot.
export const isFrameableUrl = (url: string | undefined): url is string => {
	if (!url) return false;
	try {
		const { protocol } = new URL(url);
		return protocol === 'https:' || protocol === 'http:';
	} catch {
		return false;
	}
};

// The Sensitivity margin a boxed game can sink below the threshold before it loses its box, so a
// game sitting on the line does not blink in and out with every poll.
const marginFor = (sensitivity: UserPreferences['sensitivity']): number => sensitivityThresholds[sensitivity] ?? 0;

// How far under the threshold a second game can be while one game is over it for Multiview to
// start warming up.
export const multiviewWarmupPoints = 10;

export const planMultiview = ({ candidates, scores, boxedGameIds, shown, threshold, games, maxBoxes, sensitivity }: multiviewPlanInput): multiviewPlan => {
	const totalByGameId = new Map(scores.map(score => [score.gameId, score.total]));
	const breakPenaltyByGameId = new Map(scores.map(score => [score.gameId, score.breakPenalty ?? 0]));
	const tabIdByGameId = new Map<string, number>();
	const urlByGameId = new Map<string, string>();
	// A game registered on two tabs takes the first one, the same tab switching would pick.
	for (const candidate of candidates) {
		if (tabIdByGameId.has(candidate.gameId) || !totalByGameId.has(candidate.gameId) || !isFrameableUrl(candidate.url)) continue;
		tabIdByGameId.set(candidate.gameId, candidate.tabId);
		urlByGameId.set(candidate.gameId, candidate.url);
	}

	const boxed = new Set(boxedGameIds);
	const margin = shown ? marginFor(sensitivity) : 0;
	const totalOf = (gameId: string): number => totalByGameId.get(gameId) ?? 0;
	// A commercial takes more off a game than the margin allows, so a box on screen gets those points
	// back. Only those: a game that sank on its own still loses its box during the break.
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
	// False while the cooldown since the big box last changed is still running.
	canChange: boolean;
}

// The big box goes to the best game, but only takes it off the current one the way a switch would:
// by the Sensitivity margin, once the cooldown is over. A featured game that lost its box always yields.
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
	// Every registered game with an open tab, boxable or not.
	candidateGameIds: readonly string[];
	scores: readonly { gameId: string; total: number }[];
	sensitivity: UserPreferences['sensitivity'];
}

// A game outside Multiview has pulled ahead of the one it shows alone by enough to switch to.
export const isOvertaken = ({ soloGameId, boxedGameIds, candidateGameIds, scores, sensitivity }: overtakenInput): boolean => {
	const soloTotal = scores.find(score => score.gameId === soloGameId)?.total;
	if (soloTotal === undefined) return true;
	return scores.some(score => (
		candidateGameIds.includes(score.gameId)
		&& !boxedGameIds.includes(score.gameId)
		&& score.total >= soloTotal + marginFor(sensitivity)
	));
};
