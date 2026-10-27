import {
	allLeagueIds,
	createFavoriteTeamKey,
	leagueConfigMap,
	leagueLogoFallbacks,
	leagueShortLabels,
	createDefaultUserPreferences,
	normalizeUserPreferences,
	resolveLeagueLogoUrl,
	teamLogoOnColor,
} from '../src/constants';

describe('constants', () => {
	test('resolves league logo URLs with ESPN value first, then fallback', () => {
		const fallback = leagueLogoFallbacks.nba;
		expect(resolveLeagueLogoUrl('nba', 'https://cdn.example/logo.png')).toBe('https://cdn.example/logo.png');
		expect(resolveLeagueLogoUrl('nba', '')).toBe(fallback);
		expect(resolveLeagueLogoUrl('nba')).toBe(fallback);
	});

	// A dark-ground mark is white, and on the light theme it is not there at all. The EPL lion was
	// the one that went missing first.
	test('swaps a dark-ground league logo for its light-ground variant on a light surface', () => {
		const eplDark = 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/23.png';
		expect(resolveLeagueLogoUrl('epl', eplDark, 'light')).toBe('https://a.espncdn.com/i/leaguelogos/soccer/500/23.png');
		expect(resolveLeagueLogoUrl('epl', eplDark)).toBe(eplDark);
		expect(resolveLeagueLogoUrl('ncaab', undefined, 'light')).toBe('https://a.espncdn.com/i/espn/misc_logos/500/ncaa.png');
		expect(resolveLeagueLogoUrl('nba', undefined, 'light')).toBe(leagueLogoFallbacks.nba);
		// An override is still a dark-ground mark, and the Olympics' are all seven of them.
		expect(resolveLeagueLogoUrl('olybb', undefined, 'light')).toBe('https://a.espncdn.com/i/espn/misc_logos/500/olympics.png');
	});

	test('creates default user preferences', () => {
		expect(createDefaultUserPreferences()).toEqual({
			sensitivity: 4,
			cooldownSeconds: 45,
			switchDelaySeconds: 0,
			contentAwareSwitching: true,
			enabled: true,
			enabledLeagues: [],
			favoriteTeamIds: [],
			favoriteTeamBonusPoints: 10,
			showUpcomingGames: true,
			groupByLeague: false,
			keepFinalGames: false,
			finishedTabAction: 'keep',
			proTipsEnabled: true,
			notificationsEnabled: true,
			bossDecoyUrl: '',
			standbyStreamEnabled: false,
			standbyStreamThreshold: 20,
			multiviewEnabled: false,
			multiviewThreshold: 65,
			multiviewGames: 'hot',
			multiviewMaxBoxes: 4,
			bettingEnabled: false,
			temperatureUnit: 'F',
			romerUnlocked: false,
			openRevealEnabled: true,
			theme: 'dark',
			holidayDecorationsEnabled: true,
			holidaySnowEnabled: true,
			holidayLightsEnabled: true,
			holidayLeavesEnabled: true,
			postseasonBoostPoints: 8,
			upcomingGamesDays: 7,
			disabledSignals: [],
			scoringMode: 'classic',
			leagueModes: {},
			modeDisabledSignals: {},
			fantasyBlend: 60,
			fantasyScoring: {},
			collegeFilters: {},
		});
	});

	// The whole feature hangs off this surviving a round trip through storage: the popup writes
	// through normalizeUserPreferences and the background reads back through it, so a value this
	// dropped would leave the setting looking set and doing nothing.
	test('keeps a stored finished-tab choice', () => {
		expect(normalizeUserPreferences({ finishedTabAction: 'close' }).finishedTabAction).toBe('close');
		expect(normalizeUserPreferences({ finishedTabAction: 'free' }).finishedTabAction).toBe('free');
	});

	// Same round trip, and the same failure if it breaks: the animation reads its own copy of this in
	// localStorage, and that copy is only ever written from what comes back through here.
	test('keeps a stored opening-animation choice', () => {
		expect(normalizeUserPreferences({ openRevealEnabled: false }).openRevealEnabled).toBe(false);
		expect(normalizeUserPreferences({ openRevealEnabled: 'false' }).openRevealEnabled).toBe(true);
	});

	test('keeps Multiview settings inside their ranges', () => {
		const normalized = normalizeUserPreferences({ multiviewEnabled: true, multiviewThreshold: 140, multiviewGames: 'all', multiviewMaxBoxes: 12.4 });
		expect(normalized).toMatchObject({ multiviewEnabled: true, multiviewThreshold: 100, multiviewGames: 'all', multiviewMaxBoxes: 8 });
		expect(normalizeUserPreferences({ multiviewThreshold: -5, multiviewMaxBoxes: 1, multiviewGames: 'some' }))
			.toMatchObject({ multiviewThreshold: 0, multiviewMaxBoxes: 2, multiviewGames: 'hot' });
		expect(normalizeUserPreferences({ multiviewEnabled: 'yes' }).multiviewEnabled).toBe(false);
	});

	test('starts a fresh install on the mixed list and keeps league sections for anyone upgrading', () => {
		expect(normalizeUserPreferences(undefined).groupByLeague).toBe(false);
		expect(normalizeUserPreferences({ enabledLeagues: ['nba'] }).groupByLeague).toBe(true);
		expect(normalizeUserPreferences({ groupByLeague: false }).groupByLeague).toBe(false);
		expect(normalizeUserPreferences({ groupByLeague: true }).groupByLeague).toBe(true);
	});

	test('waits for a break in play on a fresh install and keeps switching straight away for anyone upgrading', () => {
		expect(normalizeUserPreferences(undefined).contentAwareSwitching).toBe(true);
		expect(normalizeUserPreferences({ enabledLeagues: ['nba'] }).contentAwareSwitching).toBe(false);
		expect(normalizeUserPreferences({ contentAwareSwitching: true }).contentAwareSwitching).toBe(true);
	});

	test('has a short label for every league, short enough for a card status row', () => {
		for (const leagueId of allLeagueIds) {
			expect(leagueShortLabels[leagueId]).toBeTruthy();
			expect(leagueShortLabels[leagueId].length).toBeLessThanOrEqual(10);
		}
	});

	// Dark is the only look the extension had before this setting, so an unknown value lands there
	// rather than flipping somebody's popup to a theme they never picked.
	test('keeps a stored theme and falls back to dark', () => {
		expect(normalizeUserPreferences({ theme: 'light' }).theme).toBe('light');
		expect(normalizeUserPreferences({ theme: 'system' }).theme).toBe('system');
		expect(normalizeUserPreferences({ theme: 'LIGHT' }).theme).toBe('dark');
		expect(normalizeUserPreferences({ theme: 1 }).theme).toBe('dark');
	});

	// 'keep' is the one value that touches nobody's tabs, so anything unrecognised lands there
	// rather than on a setting that closes things.
	test.each([undefined, null, 'CLOSE', 'remove', 7, {}])('falls back to keep for %p', value => {
		expect(normalizeUserPreferences({ finishedTabAction: value }).finishedTabAction).toBe('keep');
	});

	test('caps the favorite and postseason boosts at the top of the scale', () => {
		const normalized = normalizeUserPreferences({ favoriteTeamBonusPoints: 99999, postseasonBoostPoints: -4 });
		expect(normalized.favoriteTeamBonusPoints).toBe(100);
		expect(normalized.postseasonBoostPoints).toBe(0);
	});

	// The switch thresholds are indexed by step, so a fractional one read as a threshold of 0.
	test('a sensitivity between steps falls back to the default', () => {
		expect(normalizeUserPreferences({ sensitivity: 4.5 }).sensitivity).toBe(createDefaultUserPreferences().sensitivity);
		expect(normalizeUserPreferences({ sensitivity: 6 }).sensitivity).toBe(6);
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
			contentAwareSwitching: false,
			enabled: true,
			enabledLeagues: ['nba'],
			favoriteTeamIds: ['nba:20', 'nfl:20'],
			favoriteTeamBonusPoints: 11,
			showUpcomingGames: false,
			groupByLeague: true,
			keepFinalGames: false,
			finishedTabAction: 'keep',
			proTipsEnabled: false,
			notificationsEnabled: true,
			bossDecoyUrl: '',
			standbyStreamEnabled: false,
			standbyStreamThreshold: 20,
			multiviewEnabled: false,
			multiviewThreshold: 65,
			multiviewGames: 'hot',
			multiviewMaxBoxes: 4,
			bettingEnabled: false,
			temperatureUnit: 'F',
			romerUnlocked: false,
			openRevealEnabled: true,
			theme: 'dark',
			holidayDecorationsEnabled: true,
			holidaySnowEnabled: true,
			holidayLightsEnabled: true,
			holidayLeavesEnabled: true,
			postseasonBoostPoints: 8,
			upcomingGamesDays: 7,
			disabledSignals: [],
			scoringMode: 'classic',
			leagueModes: {},
			modeDisabledSignals: {},
			fantasyBlend: 60,
			fantasyScoring: {},
			collegeFilters: {},
		});
	});

	test('keeps a trimmed decoy address and drops anything that is not text', () => {
		expect(normalizeUserPreferences({ bossDecoyUrl: '  https://example.com/board  ' }).bossDecoyUrl).toBe('https://example.com/board');
		expect(normalizeUserPreferences({ bossDecoyUrl: 42 }).bossDecoyUrl).toBe('');
		expect(normalizeUserPreferences({ bossDecoyUrl: `https://example.com/${'a'.repeat(5000)}` }).bossDecoyUrl).toHaveLength(2048);
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

	test('postseasonBoostPoints defaults to 8 and normalizes fractional/negative values', () => {
		expect(createDefaultUserPreferences().postseasonBoostPoints).toBe(8);
		expect(normalizeUserPreferences({}).postseasonBoostPoints).toBe(8);
		expect(normalizeUserPreferences({ postseasonBoostPoints: 12 }).postseasonBoostPoints).toBe(12);
		expect(normalizeUserPreferences({ postseasonBoostPoints: 7.9 }).postseasonBoostPoints).toBe(8);
		expect(normalizeUserPreferences({ postseasonBoostPoints: -2 }).postseasonBoostPoints).toBe(0);
		expect(normalizeUserPreferences({ postseasonBoostPoints: 'bad' }).postseasonBoostPoints).toBe(8);
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

	describe('teamLogoOnColor', () => {
		test('swaps a scoreboard crest for the one drawn on a dark ground', () => {
			expect(teamLogoOnColor('https://a.espncdn.com/i/teamlogos/mlb/500/scoreboard/bos.png'))
				.toBe('https://a.espncdn.com/i/teamlogos/mlb/500-dark/scoreboard/bos.png');
			expect(teamLogoOnColor('https://a.espncdn.com/i/teamlogos/ncaa/500/120.png'))
				.toBe('https://a.espncdn.com/i/teamlogos/ncaa/500-dark/120.png');
		});

		test('leaves a crest that is already the dark variant alone', () => {
			const dark = 'https://a.espncdn.com/i/teamlogos/soccer/500-dark/359.png';
			expect(teamLogoOnColor(dark)).toBe(dark);
		});

		test('leaves artwork from anywhere else as it came', () => {
			expect(teamLogoOnColor('https://example.com/500/logo.png')).toBe('https://example.com/500/logo.png');
			expect(teamLogoOnColor(undefined)).toBeUndefined();
		});
	});
});
