import { BackgroundStateSchema } from '@arenaswap/core';
import { estimatedWrapMs, isFavoriteTeamGame, leagueConfigs } from '@arenaswap/core/constants';
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
const LOADING_MESSAGE_COUNT = 112;

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

// Re-exported rather than redefined: it moved to core so the guide can ask the same question.
export { isFavoriteTeamGame };

type gameComparator = (a: Game, b: Game) => number;

const firstDifference = (...comparators: (gameComparator | false)[]): gameComparator => (a, b) => {
	for (const comparator of comparators) {
		if (!comparator) continue;
		const difference = comparator(a, b);
		if (difference !== 0) return difference;
	}
	return 0;
};

const startMs = (game: Game): number => (
	game.startTime ? new Date(game.startTime).getTime() : Number.POSITIVE_INFINITY
);

const dayStart = (game: Game): number => {
	if (!game.startTime) return Number.POSITIVE_INFINITY;
	const date = new Date(game.startTime);
	return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
};

// Subtracting two infinities is NaN, which a sort reads as "equal" and then trips over.
const ascending = (a: number, b: number): number => (a === b ? 0 : a - b);

const byLeagueRank = (leagueRank: Record<LeagueId, number>): gameComparator => (a, b) => (
	(leagueRank[a.league] ?? Number.MAX_SAFE_INTEGER) - (leagueRank[b.league] ?? Number.MAX_SAFE_INTEGER)
);
const favoritesFirst = (favoriteTeamIds: Set<string>): gameComparator => (a, b) => (
	Number(isFavoriteTeamGame(b, favoriteTeamIds)) - Number(isFavoriteTeamGame(a, favoriteTeamIds))
);
const highestScoreFirst = (scoreByGameId: Map<string, number>): gameComparator => (a, b) => (
	(scoreByGameId.get(b.id) ?? 0) - (scoreByGameId.get(a.id) ?? 0)
);
const earliestStartFirst: gameComparator = (a, b) => ascending(startMs(a), startMs(b));
const earliestDayFirst: gameComparator = (a, b) => ascending(dayStart(a), dayStart(b));
const byId: gameComparator = (a, b) => a.id.localeCompare(b.id);

// Grouped, the league comes first so each league is one unbroken run under its header. Mixed, it
// drops to a tiebreaker and favorites are pinned above every other league's games.
export const buildLiveComparator = (
	leagueRank: Record<LeagueId, number>,
	favoriteTeamIds: Set<string>,
	scoreByGameId: Map<string, number>,
	grouped: boolean,
) => firstDifference(
	grouped && byLeagueRank(leagueRank),
	favoritesFirst(favoriteTeamIds),
	highestScoreFirst(scoreByGameId),
	earliestStartFirst,
	byLeagueRank(leagueRank),
	byId,
);

// Up Next pages by day, so the day comes before anything else in either mode.
export const buildUpcomingComparator = (
	leagueRank: Record<LeagueId, number>,
	favoriteTeamIds: Set<string>,
	grouped: boolean,
) => firstDifference(
	earliestDayFirst,
	grouped && byLeagueRank(leagueRank),
	favoritesFirst(favoriteTeamIds),
	earliestStartFirst,
	byLeagueRank(leagueRank),
	byId,
);

// Your teams first, then most recently wrapped. Finished games are read as a list of results
// rather than a set of choices, so PowerScore has no say here — the background stops scoring a game
// the moment it stops being live, and ranking results by how exciting they were would put
// yesterday's thriller above the game that ended ten minutes ago.
export const buildFinalComparator = (
	leagueRank: Record<LeagueId, number>,
	favoriteTeamIds: Set<string>,
	grouped: boolean,
) => {
	const now = Date.now();
	return firstDifference(
		grouped && byLeagueRank(leagueRank),
		favoritesFirst(favoriteTeamIds),
		(a, b) => estimatedWrapMs(b, now) - estimatedWrapMs(a, now),
		byLeagueRank(leagueRank),
		byId,
	);
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
