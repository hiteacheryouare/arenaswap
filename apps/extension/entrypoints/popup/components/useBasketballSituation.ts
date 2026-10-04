import { useEffect, useState } from 'react';
import { fetchCompetitionSituation, logWarn, readBasketballSituation } from '@arenaswap/core';
import type { BasketballSituation } from '@arenaswap/core';
import { pollIntervalMs } from '@arenaswap/core/constants';
import type { Game } from '@arenaswap/core/types';

interface loadedSituation {
	gameId: string;
	situation: BasketballSituation | null;
}

// Timeouts and fouls for the live basketball game on screen, asked for only while this screen is
// open and at the scoreboard's own pace. The background never fetches it: nothing it scores reads
// either, and one more request per live game would be spent on screens nobody has open.
const useBasketballSituation = (game: Pick<Game, 'id' | 'league' | 'sportType' | 'status'>): BasketballSituation | null => {
	const { id, league, sportType, status } = game;
	const live = sportType === 'basketball' && status === 'in' && !id.startsWith('mock-');
	const [loaded, setLoaded] = useState<loadedSituation | null>(null);

	useEffect(() => {
		if (!live) return;
		let cancelled = false;
		const load = () => {
			fetchCompetitionSituation({ id, league })
				.then(raw => {
					if (!cancelled) setLoaded({ gameId: id, situation: readBasketballSituation(raw) ?? null });
				})
				.catch((err: unknown) => logWarn(`Failed to fetch the situation for ${id}.`, err));
		};
		load();
		const timer = setInterval(load, pollIntervalMs);
		return () => {
			cancelled = true;
			clearInterval(timer);
		};
	}, [id, league, live]);

	return live && loaded?.gameId === id ? loaded.situation : null;
};

export default useBasketballSituation;
