import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import type { LeagueId, LeagueLastGoodAt } from '@arenaswap/core/types';
import { useT } from './i18nContext';
import { formatStaleNote, staleLeagueMinutes } from './staleLeagues';
import type { StaleLeagueMinutes } from './staleLeagues';

const staleClockMs = 15_000;
const secondMs = 1_000;

const StaleLeaguesContext = createContext<StaleLeagueMinutes>({});

// One clock for every card, running only while some league is not answering. A site demo or a
// test that mounts a card without this provider simply never has a stale league.
export const StaleLeaguesProvider = ({ shedLeagues, lastGoodAt, children }: {
	shedLeagues: LeagueId[] | undefined;
	lastGoodAt: LeagueLastGoodAt | undefined;
	children: ReactNode;
}) => {
	const stale = (shedLeagues?.length ?? 0) > 0;
	const subscribe = useCallback((onTick: () => void) => {
		if (!stale) return () => {};
		const timer = setInterval(onTick, staleClockMs);
		return () => clearInterval(timer);
	}, [stale]);
	// A snapshot has to hold still between calls, so the clock is read in whole seconds rather than raw.
	const nowMs = useSyncExternalStore(subscribe, () => Math.floor(Date.now() / secondMs) * secondMs);

	const minutes = useMemo(
		() => staleLeagueMinutes(shedLeagues ?? [], lastGoodAt ?? {}, nowMs),
		[shedLeagues, lastGoodAt, nowMs]
	);

	return <StaleLeaguesContext.Provider value={minutes}>{children}</StaleLeaguesContext.Provider>;
};

export const StaleLeagueNote = ({ league }: { league: LeagueId }) => {
	const t = useT();
	const minutes = useContext(StaleLeaguesContext)[league];
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
