import type { MultiviewBox } from '@arenaswap/core/types';

// How long a box gets to start playing before the next box on its site starts anyway.
export const boxQueueWaitMs = 15_000;

const siteOf = (url: string): string => {
	try {
		return new URL(url).hostname;
	} catch {
		return '';
	}
};

// When each box started loading, keyed by game. Two boxes on one streaming site that start
// together can both land on the same game (Xfinity Stream sends the second to the first's), so a
// box waits until every box ahead of it on its site is playing or has had its wait.
export const startBoxes = (
	boxes: readonly MultiviewBox[],
	startedAt: ReadonlyMap<string, number>,
	readyIds: ReadonlySet<string>,
	now: number,
): Map<string, number> => {
	const isLoading = (gameId: string, at: number) => !readyIds.has(gameId) && now - at < boxQueueWaitMs;
	const busySites = new Set<string>();
	for (const box of boxes) {
		const at = startedAt.get(box.gameId);
		if (at !== undefined && isLoading(box.gameId, at)) busySites.add(siteOf(box.url));
	}

	const started = new Map<string, number>();
	for (const box of boxes) {
		const at = startedAt.get(box.gameId);
		if (at !== undefined) {
			started.set(box.gameId, at);
			continue;
		}
		const site = siteOf(box.url);
		if (site && busySites.has(site)) continue;
		started.set(box.gameId, now);
		if (site) busySites.add(site);
	}
	return started;
};
