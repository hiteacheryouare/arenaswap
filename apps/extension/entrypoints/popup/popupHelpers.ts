import { BackgroundStateSchema } from '@arenaswap/core';
import { createFavoriteTeamKey, leagueConfigs } from '@arenaswap/core/constants';
import type {
	BackgroundState,
	Game,
	LeagueId,
	SportType,
} from '@arenaswap/core/types';
import type { Browser } from 'wxt/browser';
import { i18n } from '#i18n';

export type popupView = 'main' | 'setup' | 'detail' | 'suggest';
export interface leagueGroup { league: LeagueId; games: Game[] }
export interface dateGroup { key: string; dateLabel: string; games: Game[] }

export const leagueOrder = Object.fromEntries(leagueConfigs.map((config, index) => [config.id, index])) as Record<LeagueId, number>;
export const sportTypeOrder: Record<SportType, number> = {
	basketball: 0,
	football: 1,
	hockey: 2,
	baseball: 3,
	softball: 4,
	soccer: 5,
};
export const sportTypeLabels: Record<SportType, string> = {
	basketball: i18n.t('sport.basketball'),
	football: i18n.t('sport.football'),
	hockey: i18n.t('sport.hockey'),
	baseball: i18n.t('sport.baseball'),
	softball: i18n.t('sport.softball'),
	soccer: i18n.t('sport.soccer'),
};
export const leagueLabels = Object.fromEntries(leagueConfigs.map(config => [config.id, config.label])) as Record<LeagueId, string>;

// Must match the number of `loading.mN` keys in the locale files.
const LOADING_MESSAGE_COUNT = 73;

export const getRandomLoadingMessage = (): string => {
	const index = Math.floor(Math.random() * LOADING_MESSAGE_COUNT) + 1;
	return i18n.t(`loading.m${index}` as Parameters<typeof i18n.t>[0]);
};

// Must match the number of `noGames.mN` keys in the locale files.
const NO_GAMES_MESSAGE_COUNT = 7;

export const getRandomNoGamesMessage = (): { title: string; sub: string } => {
	const index = Math.floor(Math.random() * NO_GAMES_MESSAGE_COUNT) + 1;
	return {
		title: i18n.t(`noGames.m${index}.title` as Parameters<typeof i18n.t>[0]),
		sub: i18n.t(`noGames.m${index}.sub` as Parameters<typeof i18n.t>[0]),
	};
};
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

export const byLeague = (a: Game, b: Game) => (leagueOrder[a.league] ?? 99) - (leagueOrder[b.league] ?? 99);

// Leagues absent from `enabledLeagues` sort after every enabled one, keeping their canonical
// order relative to each other.
export const buildLeagueRank = (enabledLeagues: LeagueId[]): Record<LeagueId, number> => {
	const ranks = {} as Record<LeagueId, number>;
	for (const [index, leagueId] of enabledLeagues.entries()) {
		if (ranks[leagueId] === undefined) ranks[leagueId] = index;
	}
	for (const leagueId of Object.keys(leagueOrder) as LeagueId[]) {
		if (ranks[leagueId] === undefined) ranks[leagueId] = enabledLeagues.length + leagueOrder[leagueId];
	}
	return ranks;
};

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

export const isFavoriteTeamGame = (game: Game, favoriteTeamIds: Set<string>): boolean => (
	favoriteTeamIds.has(createFavoriteTeamKey(game.league, game.homeTeam.id))
	|| favoriteTeamIds.has(createFavoriteTeamKey(game.league, game.awayTeam.id))
);

export const buildFavoritePinnedComparator = (
	leagueRank: Record<LeagueId, number>,
	favoriteTeamIds: Set<string>,
	scoreByGameId: Map<string, number>,
) => (a: Game, b: Game): number => {
	const leagueDiff = (leagueRank[a.league] ?? 99) - (leagueRank[b.league] ?? 99);
	if (leagueDiff !== 0) return leagueDiff;
	const aFav = isFavoriteTeamGame(a, favoriteTeamIds);
	const bFav = isFavoriteTeamGame(b, favoriteTeamIds);
	if (aFav !== bFav) return aFav ? -1 : 1;
	return (scoreByGameId.get(b.id) ?? 0) - (scoreByGameId.get(a.id) ?? 0);
};

const dayStart = (game: Game): number => {
	if (!game.startTime) return Number.POSITIVE_INFINITY;
	const date = new Date(game.startTime);
	return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
};

export const buildUpcomingComparator = (
	leagueRank: Record<LeagueId, number>,
	favoriteTeamIds: Set<string>,
	scoreByGameId: Map<string, number>,
) => {
	const fallbackSort = buildFavoritePinnedComparator(leagueRank, favoriteTeamIds, scoreByGameId);
	return (a: Game, b: Game): number => {
		const aDay = dayStart(a);
		const bDay = dayStart(b);
		if (aDay !== bDay) return aDay - bDay;
		return fallbackSort(a, b);
	};
};

const toKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

const formatDateLabel = (dateStr: string): string => {
	const today = new Date();
	const tomorrow = new Date(today);
	tomorrow.setDate(today.getDate() + 1);
	const gameDate = new Date(dateStr);
	if (toKey(gameDate) === toKey(today)) return i18n.t('date.today');
	if (toKey(gameDate) === toKey(tomorrow)) return i18n.t('date.tomorrow');
	return gameDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
};

export const groupByDate = (games: Game[]): dateGroup[] => {
	const groups = new Map<string, Game[]>();
	for (const game of games) {
		const key = game.startTime
			? new Date(game.startTime).toDateString()
			: 'Unknown';
		const group = groups.get(key) ?? [];
		group.push(game);
		groups.set(key, group);
	}
	return Array.from(groups.entries()).map(([key, grpGames]) => {
		const first = grpGames[0];
		return {
			key,
			dateLabel: first?.startTime ? formatDateLabel(first.startTime) : i18n.t('date.upcoming'),
			games: grpGames,
		};
	});
};

// Up Next pages one day at a time, and the day list is rebuilt on every poll: games kick off and
// leave the pre list, the day range setting moves, midnight rolls the labels forward. The page is
// therefore held as a date key rather than an index, so the popup cannot silently land you on a
// different date than the one you navigated to.
export const resolveSelectedDayIndex = (days: dateGroup[], selectedKey: string | null): number => {
	if (!selectedKey) return 0;
	const index = days.findIndex(d => d.key === selectedKey);
	return index >= 0 ? index : 0;
};

export const groupByLeague = (games: Game[]): leagueGroup[] => (
	games.reduce<leagueGroup[]>((groups, game) => {
		const last = groups[groups.length - 1];
		if (last?.league === game.league) {
			last.games.push(game);
			return groups;
		}
		return [...groups, { league: game.league, games: [game] }];
	}, [])
);

export const normalizeBackgroundState = (value: unknown): BackgroundState =>
	BackgroundStateSchema.parse(value);

export const fetchState = async (forceRefresh = false): Promise<BackgroundState> => {
	const state = await browser.runtime.sendMessage({ type: 'GET_STATE', forceRefresh });
	return normalizeBackgroundState(state);
};

export const formatTabLabel = (tab: Browser.tabs.Tab, allTabs: Browser.tabs.Tab[]): string => {
	const title = tab.title ?? '';
	if (!title) return i18n.t('tab.fallback', [String(tab.id)]);
	const duplicates = allTabs.filter(t => t.title === title);
	if (duplicates.length <= 1) return title.slice(0, 35);
	try {
		const pathname = new URL(tab.url ?? '').pathname;
		const truncated = pathname.length > 25 ? `${pathname.slice(0, 22)}...` : pathname;
		return `${title.slice(0, 25)} (${truncated})`;
	} catch {
		return `${title.slice(0, 30)} (#${tab.id})`;
	}
};
