import {
	buildLiveGameSnapshots,
	createTeamColorShadePalette,
	findFavoriteTeamScoreConfettiBursts,
} from '../entrypoints/popup/scoreConfettiHelpers';
import { createFavoriteTeamKey } from '@arenaswap/core/constants';
import type { Game } from '@arenaswap/core/types';

const makeLiveGame = (overrides: Partial<Game> = {}): Game => ({
	id: overrides.id ?? 'g1',
	league: overrides.league ?? 'nba',
	sportType: overrides.sportType ?? 'basketball',
	homeTeam: {
		id: 'home-1',
		name: 'Home',
		abbreviation: 'HOM',
		score: 10,
		color: '#112233',
		...(overrides.homeTeam ?? {}),
	},
	awayTeam: {
		id: 'away-1',
		name: 'Away',
		abbreviation: 'AWY',
		score: 8,
		color: '#aabbcc',
		...(overrides.awayTeam ?? {}),
	},
	period: 1,
	clockSeconds: 600,
	status: 'in',
	...overrides,
});

describe('createTeamColorShadePalette', () => {
	test('returns five unique normalized shades for a six-digit hex color', () => {
		const palette = createTeamColorShadePalette('#f75c03');
		expect(palette).toHaveLength(5);
		expect(new Set(palette).size).toBe(5);
		palette.forEach(color => expect(color).toMatch(/^#[0-9A-F]{6}$/));
	});

	test('expands three-digit hex shorthand before shading', () => {
		const palette = createTeamColorShadePalette('#abc');
		expect(palette[2]).toBe('#AABBCC');
	});

	test('falls back to the default gray when given a non-hex value', () => {
		const palette = createTeamColorShadePalette('not-a-color');
		expect(palette[2]).toBe('#DEE2E6');
	});

	test('handles undefined input without throwing', () => {
		expect(() => createTeamColorShadePalette(undefined)).not.toThrow();
		const palette = createTeamColorShadePalette(undefined);
		expect(palette[2]).toBe('#DEE2E6');
	});

	test('trims surrounding whitespace before parsing hex', () => {
		const palette = createTeamColorShadePalette('  #aBcDeF  ');
		expect(palette[2]).toBe('#ABCDEF');
	});

	test('uppercases lowercase hex input on its mid-shade', () => {
		const palette = createTeamColorShadePalette('#0f1a2b');
		expect(palette[2]).toBe('#0F1A2B');
	});

	test('rejects 4-character hex like "#abcd" and uses the default', () => {
		const palette = createTeamColorShadePalette('#abcd');
		expect(palette[2]).toBe('#DEE2E6');
	});

	test('produces shades darker-to-lighter across the offsets', () => {
		const palette = createTeamColorShadePalette('#808080');
		const numeric = (hex: string): number => parseInt(hex.slice(1), 16);
		const ascending = palette.every((c, i) => i === 0 || numeric(c) >= numeric(palette[i - 1]));
		expect(ascending).toBe(true);
	});

	test('returns at most five entries even when the palette would have produced clipped duplicates', () => {
		// White at the lightest end clips to '#FFFFFF' more than once; dedup ensures the set stays small.
		const palette = createTeamColorShadePalette('#fafafa');
		expect(palette.length).toBeLessThanOrEqual(5);
		expect(new Set(palette).size).toBe(palette.length);
	});
});

describe('buildLiveGameSnapshots', () => {
	test('only includes games whose status is in-progress', () => {
		const live = makeLiveGame({ id: 'live-1' });
		const pre = makeLiveGame({ id: 'pre-1', status: 'pre' });
		const post = makeLiveGame({ id: 'post-1', status: 'post' });

		const snapshots = buildLiveGameSnapshots([live, pre, post]);

		expect([...snapshots.keys()]).toEqual(['live-1']);
		expect(snapshots.get('live-1')).toMatchObject({
			homeScore: 10,
			awayScore: 8,
			league: 'nba',
		});
	});

	test('returns an empty map when no live games are present', () => {
		const snapshots = buildLiveGameSnapshots([makeLiveGame({ status: 'post' })]);
		expect(snapshots.size).toBe(0);
	});

	test('preserves period, team ids, and both team colors per snapshot', () => {
		const snapshots = buildLiveGameSnapshots([makeLiveGame({ id: 'g1', period: 4 })]);
		expect(snapshots.get('g1')).toEqual({
			league: 'nba',
			period: 4,
			homeTeamId: 'home-1',
			awayTeamId: 'away-1',
			homeScore: 10,
			awayScore: 8,
			homeColor: '#112233',
			awayColor: '#aabbcc',
		});
	});

	test('keeps undefined when a team has no color set', () => {
		const snapshot = buildLiveGameSnapshots([
			makeLiveGame({
				id: 'g1',
				homeTeam: { id: 'home-1', name: 'Home', abbreviation: 'HOM', score: 1 },
				awayTeam: { id: 'away-1', name: 'Away', abbreviation: 'AWY', score: 2 },
			}),
		]).get('g1');
		expect(snapshot?.homeColor).toBeUndefined();
		expect(snapshot?.awayColor).toBeUndefined();
	});

	test('includes every live game in a mixed batch', () => {
		const snapshots = buildLiveGameSnapshots([
			makeLiveGame({ id: 'live-1' }),
			makeLiveGame({ id: 'live-2', league: 'nfl', sportType: 'football' }),
			makeLiveGame({ id: 'pre-1', status: 'pre' }),
		]);
		expect([...snapshots.keys()].sort()).toEqual(['live-1', 'live-2']);
	});
});

describe('findFavoriteTeamScoreConfettiBursts', () => {
	const favoriteHomeKey = createFavoriteTeamKey('nba', 'home-1');
	const favoriteAwayKey = createFavoriteTeamKey('nba', 'away-1');

	test('produces a normal home-side burst when a favorited home team scores', () => {
		const previous = buildLiveGameSnapshots([makeLiveGame({ id: 'g1' })]);
		const next = buildLiveGameSnapshots([
			makeLiveGame({
				id: 'g1',
				homeTeam: { id: 'home-1', name: 'Home', abbreviation: 'HOM', score: 12, color: '#112233' },
			}),
		]);

		const bursts = findFavoriteTeamScoreConfettiBursts(previous, next, new Set([favoriteHomeKey]));

		expect(bursts).toHaveLength(1);
		expect(bursts[0]).toMatchObject({
			particleCount: 90,
			spread: 72,
			origin: { x: 0.75, y: 0.34 },
		});
		expect(bursts[0].colors.length).toBeGreaterThan(0);
	});

	test('boosts particle count and spread when a favorited team overtakes the opponent', () => {
		const previous = buildLiveGameSnapshots([
			makeLiveGame({
				id: 'g1',
				homeTeam: { id: 'home-1', name: 'Home', abbreviation: 'HOM', score: 8, color: '#112233' },
				awayTeam: { id: 'away-1', name: 'Away', abbreviation: 'AWY', score: 10, color: '#aabbcc' },
			}),
		]);
		const next = buildLiveGameSnapshots([
			makeLiveGame({
				id: 'g1',
				homeTeam: { id: 'home-1', name: 'Home', abbreviation: 'HOM', score: 11, color: '#112233' },
				awayTeam: { id: 'away-1', name: 'Away', abbreviation: 'AWY', score: 10, color: '#aabbcc' },
			}),
		]);

		const [burst] = findFavoriteTeamScoreConfettiBursts(previous, next, new Set([favoriteHomeKey]));

		expect(burst.particleCount).toBe(170);
		expect(burst.spread).toBe(95);
	});

	test('doubles the particle count when the game is in overtime', () => {
		const previous = buildLiveGameSnapshots([makeLiveGame({ id: 'g1', period: 5 })]);
		const next = buildLiveGameSnapshots([
			makeLiveGame({
				id: 'g1',
				period: 5,
				homeTeam: { id: 'home-1', name: 'Home', abbreviation: 'HOM', score: 12, color: '#112233' },
			}),
		]);

		const [burst] = findFavoriteTeamScoreConfettiBursts(previous, next, new Set([favoriteHomeKey]));
		expect(burst.particleCount).toBe(180);
	});

	test('emits an away-side burst at the left-origin when the favorited away team scores', () => {
		const previous = buildLiveGameSnapshots([makeLiveGame({ id: 'g1' })]);
		const next = buildLiveGameSnapshots([
			makeLiveGame({
				id: 'g1',
				awayTeam: { id: 'away-1', name: 'Away', abbreviation: 'AWY', score: 12, color: '#aabbcc' },
			}),
		]);

		const bursts = findFavoriteTeamScoreConfettiBursts(previous, next, new Set([favoriteAwayKey]));
		expect(bursts).toHaveLength(1);
		expect(bursts[0].origin).toEqual({ x: 0.25, y: 0.34 });
	});

	test('emits no burst when no favorited team is in the matchup', () => {
		const previous = buildLiveGameSnapshots([makeLiveGame({ id: 'g1' })]);
		const next = buildLiveGameSnapshots([
			makeLiveGame({
				id: 'g1',
				homeTeam: { id: 'home-1', name: 'Home', abbreviation: 'HOM', score: 12, color: '#112233' },
			}),
		]);

		const bursts = findFavoriteTeamScoreConfettiBursts(previous, next, new Set([createFavoriteTeamKey('nba', 'someone-else')]));
		expect(bursts).toEqual([]);
	});

	test('emits no burst when there is no previous snapshot to compare against', () => {
		const previous = new Map();
		const next = buildLiveGameSnapshots([makeLiveGame({ id: 'new-game' })]);
		const bursts = findFavoriteTeamScoreConfettiBursts(previous, next, new Set([favoriteHomeKey]));
		expect(bursts).toEqual([]);
	});

	test('emits two bursts when both favorited teams score on the same poll', () => {
		const previous = buildLiveGameSnapshots([makeLiveGame({ id: 'g1' })]);
		const next = buildLiveGameSnapshots([
			makeLiveGame({
				id: 'g1',
				homeTeam: { id: 'home-1', name: 'Home', abbreviation: 'HOM', score: 12, color: '#112233' },
				awayTeam: { id: 'away-1', name: 'Away', abbreviation: 'AWY', score: 10, color: '#aabbcc' },
			}),
		]);

		const bursts = findFavoriteTeamScoreConfettiBursts(previous, next, new Set([favoriteHomeKey, favoriteAwayKey]));
		expect(bursts).toHaveLength(2);
	});

	test('emits no burst when the favorited team has not scored since the previous poll', () => {
		const previous = buildLiveGameSnapshots([makeLiveGame({ id: 'g1' })]);
		const next = buildLiveGameSnapshots([makeLiveGame({ id: 'g1' })]);
		const bursts = findFavoriteTeamScoreConfettiBursts(previous, next, new Set([favoriteHomeKey, favoriteAwayKey]));
		expect(bursts).toEqual([]);
	});

	test('emits no burst when the opponent of the favorited team scores', () => {
		const previous = buildLiveGameSnapshots([makeLiveGame({ id: 'g1' })]);
		const next = buildLiveGameSnapshots([
			makeLiveGame({
				id: 'g1',
				awayTeam: { id: 'away-1', name: 'Away', abbreviation: 'AWY', score: 14, color: '#aabbcc' },
			}),
		]);

		const bursts = findFavoriteTeamScoreConfettiBursts(previous, next, new Set([favoriteHomeKey]));
		expect(bursts).toEqual([]);
	});

	test('emits no burst when a score corrects downward (refs reverse a basket)', () => {
		const previous = buildLiveGameSnapshots([makeLiveGame({ id: 'g1' })]);
		const next = buildLiveGameSnapshots([
			makeLiveGame({
				id: 'g1',
				homeTeam: { id: 'home-1', name: 'Home', abbreviation: 'HOM', score: 8, color: '#112233' },
			}),
		]);
		const bursts = findFavoriteTeamScoreConfettiBursts(previous, next, new Set([favoriteHomeKey]));
		expect(bursts).toEqual([]);
	});

	test('uses normal particle count for a multi-point score that does not change the lead', () => {
		const previous = buildLiveGameSnapshots([
			makeLiveGame({
				id: 'g1',
				homeTeam: { id: 'home-1', name: 'Home', abbreviation: 'HOM', score: 20, color: '#112233' },
				awayTeam: { id: 'away-1', name: 'Away', abbreviation: 'AWY', score: 10, color: '#aabbcc' },
			}),
		]);
		const next = buildLiveGameSnapshots([
			makeLiveGame({
				id: 'g1',
				homeTeam: { id: 'home-1', name: 'Home', abbreviation: 'HOM', score: 23, color: '#112233' },
				awayTeam: { id: 'away-1', name: 'Away', abbreviation: 'AWY', score: 10, color: '#aabbcc' },
			}),
		]);
		const [burst] = findFavoriteTeamScoreConfettiBursts(previous, next, new Set([favoriteHomeKey]));
		expect(burst.particleCount).toBe(90);
		expect(burst.spread).toBe(72);
	});

	test('skips games that disappeared between polls', () => {
		const previous = buildLiveGameSnapshots([
			makeLiveGame({ id: 'g1' }),
			makeLiveGame({ id: 'g2', league: 'nfl', sportType: 'football' }),
		]);
		const next = buildLiveGameSnapshots([makeLiveGame({ id: 'g1' })]);
		const bursts = findFavoriteTeamScoreConfettiBursts(previous, next, new Set([favoriteHomeKey]));
		expect(bursts).toEqual([]);
	});

	test('emits bursts across multiple unrelated games on the same poll', () => {
		const previous = buildLiveGameSnapshots([
			makeLiveGame({ id: 'g1' }),
			makeLiveGame({ id: 'g2' }),
		]);
		const next = buildLiveGameSnapshots([
			makeLiveGame({
				id: 'g1',
				homeTeam: { id: 'home-1', name: 'Home', abbreviation: 'HOM', score: 14, color: '#112233' },
			}),
			makeLiveGame({
				id: 'g2',
				homeTeam: { id: 'home-1', name: 'Home', abbreviation: 'HOM', score: 11, color: '#112233' },
			}),
		]);
		const bursts = findFavoriteTeamScoreConfettiBursts(previous, next, new Set([favoriteHomeKey]));
		expect(bursts).toHaveLength(2);
	});

	test('does not treat NHL period 4 as overtime (NHL regular period count is 3)', () => {
		const nhlGame = (homeScore: number): Game => makeLiveGame({
			id: 'nhl-1',
			league: 'nhl',
			sportType: 'hockey',
			period: 4,
			homeTeam: { id: 'home-1', name: 'Home', abbreviation: 'HOM', score: homeScore, color: '#112233' },
		});
		const previous = buildLiveGameSnapshots([nhlGame(2)]);
		const next = buildLiveGameSnapshots([nhlGame(3)]);
		const [burst] = findFavoriteTeamScoreConfettiBursts(previous, next, new Set([createFavoriteTeamKey('nhl', 'home-1')]));
		// Period 4 > 3 regular periods → counted as overtime → doubled particles.
		expect(burst.particleCount).toBe(180);
	});

	test('uses the away team\'s color palette for an away-side burst', () => {
		const previous = buildLiveGameSnapshots([makeLiveGame({ id: 'g1' })]);
		const next = buildLiveGameSnapshots([
			makeLiveGame({
				id: 'g1',
				awayTeam: { id: 'away-1', name: 'Away', abbreviation: 'AWY', score: 14, color: '#FF0000' },
			}),
		]);
		const [burst] = findFavoriteTeamScoreConfettiBursts(previous, next, new Set([favoriteAwayKey]));
		expect(burst.colors).toEqual(createTeamColorShadePalette('#FF0000'));
	});
});
