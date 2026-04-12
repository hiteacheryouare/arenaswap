import pkg from '../package.json';
import {
	allLeagueIds,
	appDescription,
	appName,
	appVersion,
	leagueConfigMap,
	leagueLogoFallbacks,
	createDefaultUserPreferences,
	normalizeUserPreferences,
	resolveLeagueLogoUrl,
} from '../src/constants';

describe('constants', () => {
	test('exports app metadata from package.json', () => {
		expect(appName).toBe(pkg.name);
		expect(appVersion).toBe(pkg.version);
		expect(appDescription).toBe(pkg.description);
	});

	test('resolves league logo URLs with ESPN value first, then fallback', () => {
		const fallback = leagueLogoFallbacks.nba;
		expect(resolveLeagueLogoUrl('nba', 'https://cdn.example/logo.png')).toBe('https://cdn.example/logo.png');
		expect(resolveLeagueLogoUrl('nba', '')).toBe(fallback);
		expect(resolveLeagueLogoUrl('nba')).toBe(fallback);
	});

	test('creates default user preferences', () => {
		expect(createDefaultUserPreferences()).toEqual({
			sensitivity: 4,
			cooldownSeconds: 45,
			switchDelaySeconds: 0,
			enabled: true,
			enabledLeagues: [],
			favoriteTeamIds: [],
			favoriteTeamBonusPoints: 10,
			showUpcomingGames: true,
		});
	});

	test('normalizes invalid user preference input safely', () => {
		expect(normalizeUserPreferences(null)).toEqual(createDefaultUserPreferences());

		expect(normalizeUserPreferences({
			sensitivity: 99,
			cooldownSeconds: -3.2,
			switchDelaySeconds: 14.7,
			enabled: 'true',
			enabledLeagues: ['nba', 'not-a-league', 123],
			favoriteTeamIds: ['team-a', ' team-a ', 123, 'team-b', ''],
			favoriteTeamBonusPoints: 10.8,
			showUpcomingGames: false,
		})).toEqual({
			sensitivity: 4,
			cooldownSeconds: 0,
			switchDelaySeconds: 15,
			enabled: true,
			enabledLeagues: ['nba'],
			favoriteTeamIds: ['team-a', 'team-b'],
			favoriteTeamBonusPoints: 11,
			showUpcomingGames: false,
		});
	});

	test('defaults to all leagues when enabledLeagues field is missing', () => {
		const normalized = normalizeUserPreferences({ enabled: false });
		expect(normalized.enabledLeagues).toEqual(allLeagueIds);
		expect(normalized.enabled).toBe(false);
		expect(normalized.favoriteTeamIds).toEqual([]);
		expect(normalized.favoriteTeamBonusPoints).toBe(10);
	});

	test('contains league and sport configuration maps for each league id', () => {
		for (const leagueId of allLeagueIds) {
			expect(leagueConfigMap[leagueId]).toBeDefined();
		}
	});
});
