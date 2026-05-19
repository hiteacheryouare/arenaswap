import {
	buildFavoritePinnedComparator,
	byLeague,
	formatTabLabel,
	getRandomLoadingMessage,
	groupByLeague,
	isFavoriteTeamGame,
	leaguesBySportType,
	loadingMessages,
	normalizeBackgroundState,
} from '../entrypoints/popup/popupHelpers';
import { createFavoriteTeamKey } from '@arenaswap/core/constants';
import type { Game } from '@arenaswap/core/types';

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
});

describe('getRandomLoadingMessage', () => {
	test('returns one of the configured loading messages', () => {
		const message = getRandomLoadingMessage();
		expect(loadingMessages).toContain(message);
	});
});

describe('byLeague', () => {
	test('orders games by their league order index', () => {
		const games: Game[] = [
			makeGame({ id: 'nfl-1', league: 'nfl', sportType: 'football' }),
			makeGame({ id: 'nba-1', league: 'nba' }),
		];
		const sorted = [...games].sort(byLeague);
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

		const comparator = buildFavoritePinnedComparator(favorites, scores);
		const sorted = [plain, fav].sort(comparator);
		expect(sorted.map(g => g.id)).toEqual(['fav', 'plain']);
	});

	test('falls back to descending PowerScore when both games have the same favorite status', () => {
		const high = makeGame({ id: 'high' });
		const low = makeGame({ id: 'low' });
		const scores = new Map<string, number>([
			['high', 80],
			['low', 20],
		]);
		const comparator = buildFavoritePinnedComparator(new Set(), scores);
		const sorted = [low, high].sort(comparator);
		expect(sorted.map(g => g.id)).toEqual(['high', 'low']);
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
		expect(normalizeBackgroundState(null)).toEqual({
			games: [],
			scores: [],
			leagueLogos: {},
			scoreHistory: {},
			powerScoreHistory: {},
			gameBoosts: {},
		});
		expect(normalizeBackgroundState(undefined)).toEqual({
			games: [],
			scores: [],
			leagueLogos: {},
			scoreHistory: {},
			powerScoreHistory: {},
			gameBoosts: {},
		});
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
