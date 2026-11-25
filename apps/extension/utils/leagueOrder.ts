import { leagueConfigs } from '@arenaswap/core/constants';
import type { LeagueId, SportType } from '@arenaswap/core/types';

export const leagueOrder = Object.fromEntries(leagueConfigs.map((config, index) => [config.id, index])) as Record<LeagueId, number>;

export const leaguesBySportType = leagueConfigs.reduce<Record<SportType, typeof leagueConfigs>>((groups, config) => {
	if (config.sportType in groups) groups[config.sportType].push(config);
	return groups;
}, {
	basketball: [],
	football: [],
	hockey: [],
	baseball: [],
	softball: [],
	soccer: [],
});

// Drops the league just after the last enabled one that canonically precedes it, so it lands
// beside its nearest familiar neighbour even when the list has been hand-sorted.
export const insertLeagueAtDefaultPosition = (order: LeagueId[], leagueId: LeagueId): LeagueId[] => {
	if (order.includes(leagueId)) return order;
	const rank = leagueOrder[leagueId] ?? 99;
	const lastPredecessor = order.findLastIndex(id => (leagueOrder[id] ?? 99) < rank);
	const insertAt = lastPredecessor + 1;
	return [...order.slice(0, insertAt), leagueId, ...order.slice(insertAt)];
};

export const moveLeague = (order: LeagueId[], fromIndex: number, toIndex: number): LeagueId[] => {
	const moved = order[fromIndex];
	if (moved === undefined) return order;
	const target = Math.max(0, Math.min(order.length - 1, toIndex));
	if (target === fromIndex) return order;
	const next = order.filter((_, index) => index !== fromIndex);
	next.splice(target, 0, moved);
	return next;
};
