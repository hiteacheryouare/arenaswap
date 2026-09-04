import pkg from '../package.json';
import {
	allLeagueIds,
	applyDisabledSignals,
	appDescription,
	appName,
	appVersion,
	createFavoriteTeamKey,
	isFavoriteTeamKey,
	leagueConfigMap,
	leagueLogoFallbacks,
	createDefaultUserPreferences,
	normalizeUserPreferences,
	resolveLeagueLogoUrl,
	scoreMaxCloseness,
	scoreMaxComeback,
	scoreMaxSignalsSubtotal,
	scoreMaxTotal,
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
			proTipsEnabled: true,
			notificationsEnabled: true,
			standbyStreamEnabled: false,
			standbyStreamThreshold: 20,
			bettingEnabled: false,
			temperatureUnit: 'F',
			romerUnlocked: false,
			postseasonBoostPoints: 5,
			upcomingGamesDays: 7,
			disabledSignals: [],
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
			favoriteTeamIds: ['team-a', ' nba:20 ', 123, 'nba:20', 'nfl:20', '', 'invalid:team'],
			favoriteTeamBonusPoints: 10.8,
			showUpcomingGames: false,
			proTipsEnabled: false,
		})).toEqual({
			sensitivity: 4,
			cooldownSeconds: 0,
			switchDelaySeconds: 15,
			enabled: true,
			enabledLeagues: ['nba'],
			favoriteTeamIds: ['nba:20', 'nfl:20'],
			favoriteTeamBonusPoints: 11,
			showUpcomingGames: false,
			proTipsEnabled: false,
			notificationsEnabled: true,
			standbyStreamEnabled: false,
			standbyStreamThreshold: 20,
			bettingEnabled: false,
			temperatureUnit: 'F',
			romerUnlocked: false,
			postseasonBoostPoints: 5,
			upcomingGamesDays: 7,
			disabledSignals: [],
		});
	});

	test('keeps a stored Rømer unit instead of silently rewriting it to Fahrenheit', () => {
		expect(normalizeUserPreferences({ temperatureUnit: 'Ro', romerUnlocked: true }).temperatureUnit).toBe('Ro');
		expect(normalizeUserPreferences({ temperatureUnit: 'C' }).temperatureUnit).toBe('C');
	});

	test('falls back to Fahrenheit for a temperature unit it does not recognize', () => {
		expect(normalizeUserPreferences({ temperatureUnit: 'K' }).temperatureUnit).toBe('F');
		expect(normalizeUserPreferences({ temperatureUnit: 7 }).temperatureUnit).toBe('F');
	});

	test('treats a stored Rømer unit as proof the unlock already happened', () => {
		const normalized = normalizeUserPreferences({ temperatureUnit: 'Ro' });
		expect(normalized.romerUnlocked).toBe(true);
		expect(normalizeUserPreferences({ temperatureUnit: 'F' }).romerUnlocked).toBe(false);
	});

	test('resets legacy raw team ids while keeping valid league-scoped keys', () => {
		const normalized = normalizeUserPreferences({
			favoriteTeamIds: ['20', 'nba:20', '  mlb:20  ', 'nfl:21', 'bad-format', 'nba:'],
		});

		expect(normalized.favoriteTeamIds).toEqual(['nba:20', 'mlb:20', 'nfl:21']);
	});

	test('creates league-scoped favorite keys that prevent cross-league collisions', () => {
		const nbaTeam = createFavoriteTeamKey('nba', '21');
		const nflTeam = createFavoriteTeamKey('nfl', '21');

		expect(nbaTeam).toBe('nba:21');
		expect(nflTeam).toBe('nfl:21');
		expect(nbaTeam).not.toBe(nflTeam);
	});

	test('validates favorite team key format', () => {
		expect(isFavoriteTeamKey('nba:20')).toBe(true);
		expect(isFavoriteTeamKey('  nfl:21 ')).toBe(true);
		expect(isFavoriteTeamKey('20')).toBe(false);
		expect(isFavoriteTeamKey('nba:')).toBe(false);
		expect(isFavoriteTeamKey('notaleague:20')).toBe(false);
	});

	test('defaults to all leagues when enabledLeagues field is missing', () => {
		const normalized = normalizeUserPreferences({ enabled: false });
		expect(normalized.enabledLeagues).toEqual(allLeagueIds);
		expect(normalized.enabled).toBe(false);
		expect(normalized.favoriteTeamIds).toEqual([]);
		expect(normalized.favoriteTeamBonusPoints).toBe(10);
	});

	// The order is the user's league display order, so normalization must not re-sort it.
	test('preserves the stored enabledLeagues order verbatim', () => {
		const custom = ['nhl', 'mlb', 'nba'];
		expect(normalizeUserPreferences({ enabledLeagues: custom }).enabledLeagues).toEqual(custom);
	});

	test('drops duplicate enabledLeagues while keeping the first occurrence', () => {
		const normalized = normalizeUserPreferences({ enabledLeagues: ['nhl', 'nba', 'nhl', 'mlb', 'nba'] });
		expect(normalized.enabledLeagues).toEqual(['nhl', 'nba', 'mlb']);
	});

	test('upcomingGamesDays defaults to 7 and clamps to the 1–14 range', () => {
		expect(createDefaultUserPreferences().upcomingGamesDays).toBe(7);
		expect(normalizeUserPreferences({}).upcomingGamesDays).toBe(7);
		expect(normalizeUserPreferences({ upcomingGamesDays: 3 }).upcomingGamesDays).toBe(3);
		expect(normalizeUserPreferences({ upcomingGamesDays: 14 }).upcomingGamesDays).toBe(14);
		expect(normalizeUserPreferences({ upcomingGamesDays: 0 }).upcomingGamesDays).toBe(1);
		expect(normalizeUserPreferences({ upcomingGamesDays: -5 }).upcomingGamesDays).toBe(1);
		expect(normalizeUserPreferences({ upcomingGamesDays: 20 }).upcomingGamesDays).toBe(14);
		expect(normalizeUserPreferences({ upcomingGamesDays: 3.7 }).upcomingGamesDays).toBe(4);
		expect(normalizeUserPreferences({ upcomingGamesDays: 'bad' }).upcomingGamesDays).toBe(7);
	});

	test('disabledSignals defaults to [] and filters out invalid values on normalize', () => {
		expect(createDefaultUserPreferences().disabledSignals).toEqual([]);
		expect(normalizeUserPreferences({}).disabledSignals).toEqual([]);
		expect(normalizeUserPreferences({ disabledSignals: ['closeness', 'momentum'] }).disabledSignals).toEqual(['closeness', 'momentum']);
		expect(normalizeUserPreferences({ disabledSignals: ['closeness', 'notASignal', 123] }).disabledSignals).toEqual(['closeness']);
		expect(normalizeUserPreferences({ disabledSignals: 'bad' }).disabledSignals).toEqual([]);
	});

	test('applyDisabledSignals returns unchanged result when nothing is disabled', () => {
		const base = { gameId: 'g1', total: 60, closeness: 30, lateGame: 15, momentum: 10, leadChanges: 5, comeback: 0, reason: 'tied', stalled: false };
		expect(applyDisabledSignals(base, [])).toBe(base);
	});

	test('applyDisabledSignals zeros disabled signals and scales total to maintain 0-100 range', () => {
		// Read from the constant, not hardcoded: a change to scoreMaxCloseness has broken this before.
		const base = { gameId: 'g1', total: scoreMaxCloseness, closeness: scoreMaxCloseness, lateGame: 0, momentum: 0, leadChanges: 0, comeback: 0, reason: 'tied', stalled: false };
		const result = applyDisabledSignals(base, ['lateGame', 'momentum', 'leadChanges', 'comeback']);
		expect(result.closeness).toBe(scoreMaxCloseness);
		expect(result.lateGame).toBe(0);
		expect(result.momentum).toBe(0);
		expect(result.total).toBe(100);
	});

	test('applyDisabledSignals scales survivors up, not down, when one signal is disabled', () => {
		// The four-disabled case below happens to cancel a wrong scaling factor out, so this covers
		// the common case: one signal off. signalsSubtotal is the pre-cap subtotal, so the survivors
		// scale into scoreMaxSignalsSubtotal — scaling into scoreMaxTotal deflated every score by 26%.
		const enabledMax = scoreMaxSignalsSubtotal - scoreMaxComeback;
		const base = { gameId: 'g1', total: 0, closeness: 40, lateGame: 30, momentum: 20, leadChanges: 10, comeback: 0, reason: 'tied', stalled: false };
		const enabledSum = 40 + 30 + 20 + 10;
		const result = applyDisabledSignals(base, ['comeback']);

		expect(result.signalsSubtotal).toBe(Math.round(enabledSum * (scoreMaxSignalsSubtotal / enabledMax)));
		expect(result.signalsSubtotal).toBeGreaterThan(enabledSum);
		expect(result.comeback).toBe(0);
		expect(result.closeness).toBe(40);
	});

	test('applyDisabledSignals lets a maxed-out survivor set reach the cap', () => {
		// Everything the enabled signals can produce should still be able to saturate the meter.
		const base = {
			gameId: 'g1', total: 0,
			closeness: scoreMaxCloseness, lateGame: 0, momentum: 0, leadChanges: 0, comeback: 0,
			reason: 'tied', stalled: false,
		};
		const result = applyDisabledSignals(base, ['lateGame', 'momentum', 'leadChanges', 'comeback']);
		expect(result.total).toBe(scoreMaxTotal);
	});

	test('applyDisabledSignals returns unchanged result when all signals are disabled', () => {
		const base = { gameId: 'g1', total: 40, closeness: 40, lateGame: 0, momentum: 0, leadChanges: 0, comeback: 0, reason: 'tied', stalled: false };
		const result = applyDisabledSignals(base, ['closeness', 'lateGame', 'momentum', 'leadChanges', 'comeback']);
		expect(result).toBe(base);
	});

	test('postseasonBoostPoints defaults to 5 and normalizes fractional/negative values', () => {
		expect(createDefaultUserPreferences().postseasonBoostPoints).toBe(5);
		expect(normalizeUserPreferences({}).postseasonBoostPoints).toBe(5);
		expect(normalizeUserPreferences({ postseasonBoostPoints: 12 }).postseasonBoostPoints).toBe(12);
		expect(normalizeUserPreferences({ postseasonBoostPoints: 7.9 }).postseasonBoostPoints).toBe(8);
		expect(normalizeUserPreferences({ postseasonBoostPoints: -2 }).postseasonBoostPoints).toBe(0);
		expect(normalizeUserPreferences({ postseasonBoostPoints: 'bad' }).postseasonBoostPoints).toBe(5);
	});

	test('contains league and sport configuration maps for each league id', () => {
		for (const leagueId of allLeagueIds) {
			expect(leagueConfigMap[leagueId]).toBeDefined();
		}
	});

	test('has logo fallbacks defined for epl and fifawc', () => {
		expect(leagueLogoFallbacks.epl).toMatch(/^https?:\/\//);
		expect(leagueLogoFallbacks.fifawc).toMatch(/^https?:\/\//);
	});

	test('resolves NCAA womens basketball using ESPN logo when provided, generic NCAA mark otherwise', () => {
		expect(resolveLeagueLogoUrl('ncaaw', 'https://cdn.example/ncaaw.png')).toBe('https://cdn.example/ncaaw.png');
		expect(resolveLeagueLogoUrl('ncaaw')).toBe(leagueLogoFallbacks.ncaaw);
	});

	// The demo tab and the onboarding picker resolve logos with no ESPN response behind them, so a
	// league with neither an override nor a fallback renders no crest at all.
	test('resolves a fallback for every NCAA league without an ESPN logo', () => {
		for (const leagueId of ['ncaab', 'ncaaw', 'ncaaf', 'ncaamh'] as const) {
			expect(resolveLeagueLogoUrl(leagueId)).toMatch(/^https?:\/\//);
		}
	});

	test('resolves epl and fifawc league logo URLs with ESPN value first, then fallback', () => {
		expect(resolveLeagueLogoUrl('epl', 'https://cdn.example/epl.png')).toBe('https://cdn.example/epl.png');
		expect(resolveLeagueLogoUrl('epl')).toBe(leagueLogoFallbacks.epl);
		expect(resolveLeagueLogoUrl('fifawc', 'https://cdn.example/fifawc.png')).toBe('https://cdn.example/fifawc.png');
		expect(resolveLeagueLogoUrl('fifawc')).toBe(leagueLogoFallbacks.fifawc);
	});
});
