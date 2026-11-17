import { useEffect, useState } from 'react';
import { logWarn } from '@arenaswap/core';
import { fetchCompetitionSituation, readBasketballSituation } from '@arenaswap/sideline';
import type { BasketballSituation } from '@arenaswap/sideline';
import { pollIntervalMs } from '@arenaswap/core/constants';
import type { Game } from '@arenaswap/core/types';

interface loadedSituation {
	gameId: string;
	situation: BasketballSituation | null;
}

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
		const timer = setInterval(() => {
			if (!document.hidden) load();
		}, pollIntervalMs);
		return () => {
			cancelled = true;
			clearInterval(timer);
		};
	}, [id, league, live]);

	return live && loaded?.gameId === id ? loaded.situation : null;
};

export default useBasketballSituation;
