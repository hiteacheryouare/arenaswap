import { useEffect, useState } from 'react';
import { fetchGamesWithLeagueLogos } from '@arenaswap/sideline';
import { allLeagueIds } from '@arenaswap/core/constants';
import type { LeagueLogoMap, LeagueScheduleMap } from '@arenaswap/core/types';
import { isLeagueLogoCacheFresh, leagueLogoCacheKey, seededLeagueLogos } from '../../utils/leagueLogoCache';

export default () => {
	const [allLeagueLogoCache, setAllLeagueLogoCache] = useState<LeagueLogoMap>(seededLeagueLogos);
	const [leagueSchedules, setLeagueSchedules] = useState<LeagueScheduleMap>({});

	useEffect(() => {
		let cancelled = false;
		void (async () => {
			try {
				const stored = (await browser.storage.local.get(leagueLogoCacheKey))[leagueLogoCacheKey];
				if (isLeagueLogoCacheFresh(stored, Date.now())) {
					if (cancelled) return;
					setAllLeagueLogoCache(current => ({ ...current, ...stored.logos }));
					setLeagueSchedules(stored.schedules);
					return;
				}
				const { leagueLogos: logos, leagueSchedules: schedules } = await fetchGamesWithLeagueLogos(allLeagueIds, { includeUpcoming: false });
				if (Object.keys(logos).length === 0) return;
				await browser.storage.local.set({ [leagueLogoCacheKey]: { fetchedAt: Date.now(), logos, schedules } });
				if (cancelled) return;
				setAllLeagueLogoCache(current => ({ ...current, ...logos }));
				setLeagueSchedules(schedules);
			} catch {
			}
		})();
		return () => { cancelled = true; };
	}, []);

	return { allLeagueLogoCache, leagueSchedules };
};
