import {
	buildFavoritePinnedComparator,
	buildLeagueRank,
	buildUpcomingComparator,
	byLeague,
	fetchState,
	formatTabLabel,
	getRandomLoadingMessage,
	groupByLeague,
	insertLeagueAtDefaultPosition,
	isFavoriteTeamGame,
	leagueOrder,
	leaguesBySportType,
	moveLeague,
	normalizeBackgroundState,
} from '../entrypoints/popup/popupHelpers';
import { createFavoriteTeamKey, leagueConfigs } from '@arenaswap/core/constants';
import type { Game, LeagueId } from '@arenaswap/core/types';

const mockSendMessage = (returnValue: unknown) => {
	const fn = jest.fn().mockResolvedValueOnce(returnValue);
	(globalThis as unknown as { browser: { runtime: { sendMessage: typeof fn } } }).browser = {
		runtime: { sendMessage: fn },
	};
	return fn;
};

const makeGame = (overrides: Partial<Game> & { id: string }): Game => ({
	league: 'nba',
	sportType: 'basketball',
	homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 0 },
	awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 0 },
	period: 1,
	clockSeconds: 600,
	status: 'in',
	...overrides,
});

describe('leaguesBySportType', () => {
	test('groups every configured league under the right sport bucket', () => {
		expect(leaguesBySportType.basketball.length).toBeGreaterThan(0);
		expect(leaguesBySportType.football.length).toBeGreaterThan(0);
		expect(leaguesBySportType.basketball.every(l => l.sportType === 'basketball')).toBe(true);
		expect(leaguesBySportType.football.every(l => l.sportType === 'football')).toBe(true);
	});

	// Regression: without the `in` guard this crashed on any unknown sport type.
	test('includes every configured league in exactly one sport bucket with no duplicates', () => {
		const allIds = leagueConfigs.map(c => c.id).toSorted();
		const bucketedIds = (Object.values(leaguesBySportType) as (typeof leagueConfigs)[])
			.flatMap(configs => configs.map(c => c.id))
			.toSorted();
		expect(bucketedIds).toEqual(allIds);
	});

	test('silently drops a league with an unrecognised sport type instead of crashing', () => {
		jest.isolateModules(() => {
			jest.mock('@arenaswap/core/constants', () => {
				const real = jest.requireActual('@arenaswap/core/constants') as Record<string, unknown>;
				return {
					...real,
					leagueConfigs: [
						...(real.leagueConfigs as unknown[]),
						{ id: 'lacrosse-1', sportType: 'lacrosse', label: 'Lacrosse' },
					],
				};
			});
			expect(() => require('../entrypoints/popup/popupHelpers')).not.toThrow();
		});
	});
});

describe('getRandomLoadingMessage', () => {
	test('returns a non-empty localized loading message', () => {
		const message = getRandomLoadingMessage();
		expect(typeof message).toBe('string');
		expect(message.length).toBeGreaterThan(0);
	});
});

describe('byLeague', () => {
	test('orders games by their league order index', () => {
		const games: Game[] = [
			makeGame({ id: 'nfl-1', league: 'nfl', sportType: 'football' }),
			makeGame({ id: 'nba-1', league: 'nba' }),
		];
		const sorted = games.toSorted(byLeague);
		expect(sorted[0]!.league).toBe('nba');
	});
});

describe('isFavoriteTeamGame', () => {
	test('returns true if either team is favorited', () => {
		const game = makeGame({
			id: 'g1',
			homeTeam: { id: 'home-1', name: 'Home', abbreviation: 'HOM', score: 0 },
			awayTeam: { id: 'away-1', name: 'Away', abbreviation: 'AWY', score: 0 },
		});
		const favoriteHome = new Set([createFavoriteTeamKey('nba', 'home-1')]);
		const favoriteAway = new Set([createFavoriteTeamKey('nba', 'away-1')]);
		const noFavorites = new Set<string>();

		expect(isFavoriteTeamGame(game, favoriteHome)).toBe(true);
		expect(isFavoriteTeamGame(game, favoriteAway)).toBe(true);
		expect(isFavoriteTeamGame(game, noFavorites)).toBe(false);
	});
});

describe('buildFavoritePinnedComparator', () => {
	test('pins favorited games above non-favorited within the same league', () => {
		const fav = makeGame({
			id: 'fav',
			homeTeam: { id: 'home-1', name: 'Home', abbreviation: 'HOM', score: 0 },
			awayTeam: { id: 'away-x', name: 'Away', abbreviation: 'AWY', score: 0 },
		});
		const plain = makeGame({
			id: 'plain',
			homeTeam: { id: 'home-2', name: 'Home', abbreviation: 'HOM', score: 0 },
			awayTeam: { id: 'away-y', name: 'Away', abbreviation: 'AWY', score: 0 },
		});
		const favorites = new Set([createFavoriteTeamKey('nba', 'home-1')]);
		const scores = new Map<string, number>([
			['fav', 10],
			['plain', 50],
		]);

		const comparator = buildFavoritePinnedComparator(leagueOrder, favorites, scores);
		const sorted = [plain, fav].toSorted(comparator);
		expect(sorted.map(g => g.id)).toEqual(['fav', 'plain']);
	});

	test('falls back to descending PowerScore when both games have the same favorite status', () => {
		const high = makeGame({ id: 'high' });
		const low = makeGame({ id: 'low' });
		const scores = new Map<string, number>([
			['high', 80],
			['low', 20],
		]);
		const comparator = buildFavoritePinnedComparator(leagueOrder, new Set(), scores);
		const sorted = [low, high].toSorted(comparator);
		expect(sorted.map(g => g.id)).toEqual(['high', 'low']);
	});

	test('honours the user league order ahead of favorites and PowerScore', () => {
		const nbaFav = makeGame({
			id: 'nba-fav',
			homeTeam: { id: 'home-1', name: 'Home', abbreviation: 'HOM', score: 0 },
			awayTeam: { id: 'away-1', name: 'Away', abbreviation: 'AWY', score: 0 },
		});
		const nfl = makeGame({ id: 'nfl-1', league: 'nfl', sportType: 'football' });
		const favorites = new Set([createFavoriteTeamKey('nba', 'home-1')]);
		const scores = new Map<string, number>([['nba-fav', 99], ['nfl-1', 1]]);

		const defaultSorted = [nfl, nbaFav].toSorted(buildFavoritePinnedComparator(leagueOrder, favorites, scores));
		expect(defaultSorted.map(g => g.id)).toEqual(['nba-fav', 'nfl-1']);

		const customRank = buildLeagueRank(['nfl', 'nba']);
		const customSorted = [nbaFav, nfl].toSorted(buildFavoritePinnedComparator(customRank, favorites, scores));
		expect(customSorted.map(g => g.id)).toEqual(['nfl-1', 'nba-fav']);
	});
});

describe('buildLeagueRank', () => {
	test('ranks enabled leagues by their position in the custom order', () => {
		const rank = buildLeagueRank(['nhl', 'mlb', 'nba']);
		expect(rank.nhl).toBe(0);
		expect(rank.mlb).toBe(1);
		expect(rank.nba).toBe(2);
	});

	test('sorts leagues outside the custom order after every enabled one', () => {
		const enabled: LeagueId[] = ['nhl', 'mlb'];
		const rank = buildLeagueRank(enabled);
		expect(rank.nfl).toBeGreaterThanOrEqual(enabled.length);
		expect(rank.nhl).toBeLessThan(rank.nfl);
		expect(rank.mlb).toBeLessThan(rank.nfl);
	});

	test('keeps canonical order among the leagues outside the custom order', () => {
		const rank = buildLeagueRank(['mls']);
		expect(rank.nba).toBeLessThan(rank.nfl);
	});

	test('assigns a rank to every configured league', () => {
		const rank = buildLeagueRank([]);
		for (const config of leagueConfigs) {
			expect(typeof rank[config.id]).toBe('number');
		}
	});
});

describe('insertLeagueAtDefaultPosition', () => {
	test('inserts a re-enabled league at its canonical slot rather than the end', () => {
		expect(insertLeagueAtDefaultPosition(['nba', 'mls'], 'nhl')).toEqual(['nba', 'nhl', 'mls']);
	});

	test('appends when the league sorts after everything already enabled', () => {
		const result = insertLeagueAtDefaultPosition(['nba', 'nhl'], 'mls');
		expect(result[result.length - 1]).toBe('mls');
	});

	test('prepends when the league sorts before everything already enabled', () => {
		expect(insertLeagueAtDefaultPosition(['nhl', 'mls'], 'nba')).toEqual(['nba', 'nhl', 'mls']);
	});

	test('returns the original array untouched when the league is already present', () => {
		const order: LeagueId[] = ['nba', 'nhl'];
		expect(insertLeagueAtDefaultPosition(order, 'nba')).toBe(order);
	});

	test('respects a custom order when picking the insertion point', () => {
		// mls was dragged above nba; re-enabling nhl still slots it after nba.
		expect(insertLeagueAtDefaultPosition(['mls', 'nba'], 'nhl')).toEqual(['mls', 'nba', 'nhl']);
	});
});

describe('moveLeague', () => {
	test('moves a league up', () => {
		expect(moveLeague(['nba', 'nhl', 'mlb'], 1, 0)).toEqual(['nhl', 'nba', 'mlb']);
	});

	test('moves a league down', () => {
		expect(moveLeague(['nba', 'nhl', 'mlb'], 0, 2)).toEqual(['nhl', 'mlb', 'nba']);
	});

	test('clamps a target index past the end of the list', () => {
		expect(moveLeague(['nba', 'nhl'], 0, 9)).toEqual(['nhl', 'nba']);
	});

	test('clamps a negative target index', () => {
		expect(moveLeague(['nba', 'nhl'], 1, -3)).toEqual(['nhl', 'nba']);
	});

	test('returns the original array for a no-op or out-of-range source', () => {
		const order: LeagueId[] = ['nba', 'nhl'];
		expect(moveLeague(order, 1, 1)).toBe(order);
		expect(moveLeague(order, 5, 0)).toBe(order);
		expect(moveLeague(order, -1, 0)).toBe(order);
	});
});

describe('buildUpcomingComparator', () => {
	test('still buckets by day before applying the custom league order', () => {
		const today = new Date();
		const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
		const nbaTomorrow = makeGame({ id: 'nba-tmr', status: 'pre', startTime: tomorrow.toISOString() });
		const nflToday = makeGame({ id: 'nfl-today', league: 'nfl', sportType: 'football', status: 'pre', startTime: today.toISOString() });

		const comparator = buildUpcomingComparator(buildLeagueRank(['nba', 'nfl']), new Set(), new Map());
		expect([nbaTomorrow, nflToday].toSorted(comparator).map(g => g.id)).toEqual(['nfl-today', 'nba-tmr']);
	});
});

describe('groupByLeague', () => {
	test('groups consecutive same-league games into one bucket', () => {
		const games: Game[] = [
			makeGame({ id: 'nba-1' }),
			makeGame({ id: 'nba-2' }),
			makeGame({ id: 'nfl-1', league: 'nfl', sportType: 'football' }),
			makeGame({ id: 'nba-3' }),
		];
		const groups = groupByLeague(games);
		expect(groups.map(g => g.league)).toEqual(['nba', 'nfl', 'nba']);
		expect(groups[0]!.games.map(g => g.id)).toEqual(['nba-1', 'nba-2']);
		expect(groups[2]!.games.map(g => g.id)).toEqual(['nba-3']);
	});

	test('returns an empty array for an empty input', () => {
		expect(groupByLeague([])).toEqual([]);
	});
});

describe('formatTabLabel', () => {
	test('falls back to a Tab #<id> label when the tab has no title', () => {
		expect(formatTabLabel({ id: 42 }, [{ id: 42 }])).toBe('Tab #42');
	});

	test('truncates a single-occurrence title to 35 characters', () => {
		const title = 'A very long tab title that exceeds the truncation limit by quite a lot';
		expect(formatTabLabel({ id: 1, title }, [{ id: 1, title }])).toBe(title.slice(0, 35));
	});

	test('disambiguates duplicate titles with the URL pathname', () => {
		const title = 'GitHub';
		const result = formatTabLabel(
			{ id: 1, title, url: 'https://github.com/anthropics/claude-code' },
			[{ id: 1, title }, { id: 2, title }],
		);
		expect(result).toBe('GitHub (/anthropics/claude-code)');
	});

	test('truncates a long pathname with an ellipsis', () => {
		const title = 'Docs';
		const longPath = '/very/deep/nested/path/that/keeps/going/and/going';
		const result = formatTabLabel(
			{ id: 1, title, url: `https://example.com${longPath}` },
			[{ id: 1, title }, { id: 2, title }],
		);
		expect(result.endsWith('...)')).toBe(true);
		expect(result.startsWith('Docs (')).toBe(true);
	});

	test('falls back to the tab id when a duplicate-title tab has an invalid URL', () => {
		const title = 'Inbox';
		const result = formatTabLabel(
			{ id: 7, title, url: 'not a real url' },
			[{ id: 7, title }, { id: 8, title }],
		);
		expect(result).toBe('Inbox (#7)');
	});

	test('does not invoke pathname disambiguation when the title is unique', () => {
		const result = formatTabLabel(
			{ id: 1, title: 'Unique', url: 'about:blank' },
			[{ id: 1, title: 'Unique' }, { id: 2, title: 'Different' }],
		);
		expect(result).toBe('Unique');
	});
});

describe('normalizeBackgroundState', () => {
	test('returns an empty default state for non-object input', () => {
		const emptyState = {
			games: [],
			scores: [],
			leagueLogos: {},
			scoreHistory: {},
			powerScoreHistory: {},
			gameBoosts: {},
			onStandbyStream: false,
			standbyStreamTabId: null,
		};
		expect(normalizeBackgroundState(null)).toEqual(emptyState);
		expect(normalizeBackgroundState(undefined)).toEqual(emptyState);
	});

	test('drops malformed score snapshots while keeping valid ones', () => {
		const result = normalizeBackgroundState({
			scoreHistory: {
				g1: [
					{ gameId: 'g1', timestamp: 1, homeScore: 0, awayScore: 0 },
					{ gameId: 'g1', timestamp: 'oops', homeScore: 0, awayScore: 0 },
					null,
				],
			},
		});
		expect(result.scoreHistory.g1).toHaveLength(1);
	});

	test('keeps only positive finite numeric game boosts', () => {
		const result = normalizeBackgroundState({
			gameBoosts: { a: 5, b: 0, c: -1, d: Number.NaN, e: '10' },
		});
		expect(result.gameBoosts).toEqual({ a: 5 });
	});
});

describe('fetchState', () => {
	// Regression: fetchState(true) triggered a full tick() that overwrote the games array, and
	// SWR's default revalidateIfStale then clobbered data a SCORES_UPDATED mutation had set.


	const liveGameState = {
		games: [makeGame({ id: 'live-1', status: 'in' })],
		scores: [],
		leagueLogos: {},
		scoreHistory: {},
		powerScoreHistory: {},
		gameBoosts: {},
	};

	test('sends GET_STATE with forceRefresh:false to preserve per-league cached game data', async () => {
		const send = mockSendMessage(liveGameState);
		const result = await fetchState(false);
		expect(send).toHaveBeenCalledWith({ type: 'GET_STATE', forceRefresh: false });
		expect(result.games).toHaveLength(1);
		expect(result.games[0]!.id).toBe('live-1');
	});

	test('sends GET_STATE with forceRefresh:true for explicit user-triggered refreshes', async () => {
		const send = mockSendMessage(liveGameState);
		await fetchState(true);
		expect(send).toHaveBeenCalledWith({ type: 'GET_STATE', forceRefresh: true });
	});
});
