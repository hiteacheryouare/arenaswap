import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import type { LeagueId, LeagueLastGoodAt } from '@arenaswap/core/types';
import { useT } from './i18nContext';
import { formatStaleNote, staleLeagueMinutes, stuckGameMinutes } from './staleLeagues';
import type { StaleLeagueMinutes } from './staleLeagues';

const staleClockMs = 15_000;
const secondMs = 1_000;

interface staleMinutes {
	leagues: StaleLeagueMinutes;
	games: Record<string, number>;
}

const StaleLeaguesContext = createContext<staleMinutes>({ leagues: {}, games: {} });

export const StaleLeaguesProvider = ({ shedLeagues, lastGoodAt, stuckSince, children }: {
	shedLeagues: LeagueId[] | undefined;
	lastGoodAt: LeagueLastGoodAt | undefined;
	stuckSince?: Record<string, number>;
	children: ReactNode;
}) => {
	const stale = (shedLeagues?.length ?? 0) > 0 || Object.keys(stuckSince ?? {}).length > 0;
	const subscribe = useCallback((onTick: () => void) => {
		if (!stale) return () => {};
		const timer = setInterval(onTick, staleClockMs);
		return () => clearInterval(timer);
	}, [stale]);
	// A snapshot has to hold still between calls, so the clock is read in whole seconds rather than raw.
	const nowMs = useSyncExternalStore(subscribe, () => Math.floor(Date.now() / secondMs) * secondMs);

	const minutes = useMemo(
		() => ({ leagues: staleLeagueMinutes(shedLeagues ?? [], lastGoodAt ?? {}, nowMs), games: stuckGameMinutes(stuckSince ?? {}, nowMs) }),
		[shedLeagues, lastGoodAt, stuckSince, nowMs]
	);

	return <StaleLeaguesContext.Provider value={minutes}>{children}</StaleLeaguesContext.Provider>;
};

export const StaleLeagueNote = ({ league, gameId }: { league: LeagueId; gameId?: string }) => {
	const t = useT();
	const stale = useContext(StaleLeaguesContext);
	const minutes = stale.leagues[league] ?? (gameId === undefined ? undefined : stale.games[gameId]);
	if (minutes === undefined) return null;

	return (
		<div className='d-flex flex-column align-items-center game-meta'>
			<div className='d-flex align-items-center gap-1 text-center game-meta-venue'>
				<i className='bi bi-clock-history' aria-hidden='true' />
				{formatStaleNote(minutes, t)}
			</div>
		</div>
	);
};
