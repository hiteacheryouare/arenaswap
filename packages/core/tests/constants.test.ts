import pkg from '../package.json';
import {
	ALL_LEAGUE_IDS,
	APP_DESCRIPTION,
	APP_NAME,
	APP_VERSION,
	LEAGUE_CONFIG_MAP,
	LEAGUE_LOGO_FALLBACKS,
	createDefaultUserPreferences,
	normalizeUserPreferences,
	resolveLeagueLogoUrl,
} from '../src/constants';

describe('constants', () => {
	test('exports app metadata from package.json', () => {
		expect(APP_NAME).toBe(pkg.name);
		expect(APP_VERSION).toBe(pkg.version);
		expect(APP_DESCRIPTION).toBe(pkg.description);
	});

	test('resolves league logo URLs with ESPN value first, then fallback', () => {
		const fallback = LEAGUE_LOGO_FALLBACKS.nba;
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
			showUpcomingGames: false,
		})).toEqual({
			sensitivity: 4,
			cooldownSeconds: 0,
			switchDelaySeconds: 15,
			enabled: true,
			enabledLeagues: ['nba'],
			showUpcomingGames: false,
		});
	});

	test('defaults to all leagues when enabledLeagues field is missing', () => {
		const normalized = normalizeUserPreferences({ enabled: false });
		expect(normalized.enabledLeagues).toEqual(ALL_LEAGUE_IDS);
		expect(normalized.enabled).toBe(false);
	});

	test('contains league and sport configuration maps for each league id', () => {
		for (const leagueId of ALL_LEAGUE_IDS) {
			expect(LEAGUE_CONFIG_MAP[leagueId]).toBeDefined();
		}
	});
});
