import { normalizeCollegeFilters } from './college';
export * from './college';
import type { BuiltInModeId, FinishedTabAction, Game, LeagueId, ScoringModeChoice, SignalName, SportType, ResolvedTheme, ThemePreference, UserPreferences } from './types';
import type { FantasyRule, FantasySport } from 'powerscore';
import {
	allLeagueIds,
	scoreMaxCloseness,
	scoreMaxLateGame,
	scoreMaxMomentum,
	scoreMaxLeadChanges,
	scoreMaxComeback,
	scoreMaxTotal,
	scoreMaxSignalsSubtotal,
	scoreWinProbVarianceMax,
	scorerTunables,
	sportTypeConfigs,
	sportTypeConfigMap,
	leagueConfigs,
	leagueConfigMap,
	builtInModes,
	defaultFantasyScoring,
} from 'powerscore';

export {
	allLeagueIds,
	scoreMaxCloseness,
	scoreMaxLateGame,
	scoreMaxMomentum,
	scoreMaxLeadChanges,
	scoreMaxComeback,
	scoreMaxTotal,
	scoreMaxSignalsSubtotal,
	scoreWinProbVarianceMax,
	scorerTunables,
	sportTypeConfigs,
	sportTypeConfigMap,
	leagueConfigs,
	leagueConfigMap,
};

export const pollIntervalMs = 15_000;

export const finalRetentionMs = 24 * 60 * 60 * 1000;

export const sportWrapAllowanceMs: Record<SportType, number> = {
	football:   3.5  * 60 * 60 * 1000,
	baseball:   3.25 * 60 * 60 * 1000,
	softball:   2.5  * 60 * 60 * 1000,
	basketball: 2.5  * 60 * 60 * 1000,
	hockey:     2.75 * 60 * 60 * 1000,
	soccer:     2.5  * 60 * 60 * 1000,
};

export const estimatedWrapMs = (game: Pick<Game, 'sportType' | 'startTime'>, now: number): number => {
	if (!game.startTime) return now;
	const startMs = new Date(game.startTime).getTime();
	if (!Number.isFinite(startMs)) return now;
	return startMs + (sportWrapAllowanceMs[game.sportType] ?? sportWrapAllowanceMs.basketball);
};

export const isWithinFinalRetention = (
	game: Pick<Game, 'sportType' | 'startTime'>,
	now: number = Date.now(),
): boolean => now - estimatedWrapMs(game, now) <= finalRetentionMs;

export const hasMissedItsWindow = (
	game: Pick<Game, 'status' | 'sportType' | 'startTime'>,
	now: number = Date.now(),
): boolean => game.status === 'pre' && now > estimatedWrapMs(game, now);
export const historyWindowMs = 300_000;

export const pollDormantThresholdPolls = 2;
export const pollDormantMinMs = 120_000;
export const pollDormantMaxMs = 180_000;

export const pollHebetudinousHorizonMs = 24 * 60 * 60 * 1000;
export const pollHebetudinousMaxMs = 30 * 60 * 1000;

export const pollLookaheadDays = 7;
export const pollLookaheadTtlMs = 6 * 60 * 60 * 1000;

/* The floor is ESPN's, not ours. The scoreboard answers with `cache-control: max-age=12` and our
   fetch uses the HTTP cache, so a poll inside that window is served the bytes it already has: the
   6s floor this used to hold spent every other request on the hottest game in the product to be
   told nothing. This value is only the assumption made until a response says otherwise —
   `scoreboardRefreshMs` reads the max-age each league actually sent and floors that league there
   instead, so a league ESPN refreshes faster is polled faster without anyone editing this. */
export const pollMinEagerMs = 12_000;
export const pollMaxEagerMs = 25_000;
export const pollIntermissionMs = 40_000;

export const defaultSensitivity = 4 as const;
export const defaultCooldownSecs = 45;
export const defaultSwitchDelaySecs = 0;
export const defaultMultiviewThreshold = 55;
export const multiviewMaxBoxesMin = 2;
export const multiviewMaxBoxesMax = 8;
export const defaultMultiviewMaxBoxes = 4;
export const defaultFavoriteTeamBonusPoints = 10;
export const defaultPostseasonBoostPoints = 8;
export const defaultFantasyBlend = 60;
export const defaultUpcomingGamesDays = 7;
export const upcomingGamesDaysMin = 1;
export const upcomingGamesDaysMax = 14;

export const guideMinUpcomingDays = 3;

export const sensitivityThresholds: Record<number, number> = {
	1: 37,
	2: 27,
	3: 18,
	4: 11,
	5: 6,
	6: 3,
	7: 1
};

const leagueLogoOverrides: Partial<Record<LeagueId, string>> = {
	cbase: 'https://a.espncdn.com/i/espn/misc_logos/500/ncaa_baseball.png',
	csoft: 'https://a.espncdn.com/i/espn/misc_logos/500/ncaa_womens_softball.png',
	olybb: 'https://a.espncdn.com/i/espn/misc_logos/500-dark/olympics.png',
	olymih: 'https://a.espncdn.com/i/espn/misc_logos/500-dark/olympics.png',
	olywih: 'https://a.espncdn.com/i/espn/misc_logos/500-dark/olympics.png',
	olybkm: 'https://a.espncdn.com/i/espn/misc_logos/500-dark/olympics.png',
	olybkw: 'https://a.espncdn.com/i/espn/misc_logos/500-dark/olympics.png',
	olysocm: 'https://a.espncdn.com/i/espn/misc_logos/500-dark/olympics.png',
	olysocw: 'https://a.espncdn.com/i/espn/misc_logos/500-dark/olympics.png',
};

export const leagueLogoFallbacks: Partial<Record<LeagueId, string>> = {
	nba: 'https://a.espncdn.com/i/teamlogos/leagues/500/nba.png',
	wnba: 'https://a.espncdn.com/i/teamlogos/leagues/500/wnba.png',
	nhl: 'https://a.espncdn.com/i/teamlogos/leagues/500/nhl.png',
	mlb: 'https://a.espncdn.com/i/teamlogos/leagues/500/mlb.png',
	nfl: 'https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png',
	ncaab: 'https://a.espncdn.com/i/espn/misc_logos/500-dark/ncaa.png',
	ncaaw: 'https://a.espncdn.com/i/espn/misc_logos/500-dark/ncaa.png',
	ncaaf: 'https://a.espncdn.com/i/espn/misc_logos/500-dark/ncaa.png',
	ncaamh: 'https://a.espncdn.com/i/espn/misc_logos/500-dark/ncaa.png',
	mls: 'https://a.espncdn.com/i/teamlogos/leagues/500/mls.png',
	epl: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/23.png',
	fifawc: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/4.png',
	wbbc: 'https://a.espncdn.com/redesign/assets/img/icons/ESPN-icon-baseball.png',
	ufl: 'https://a.espncdn.com/i/teamlogos/leagues/500/ufl.png',
	laliga: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/15.png',
	bundesliga: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/10.png',
	seriea: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/12.png',
	ligamx: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/22.png',
	ucl: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/2.png',
	uel: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/2310.png',
	nwsl: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/2323.png',
	fifawwc: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/60.png',
};

export const leagueLabels = Object.fromEntries(leagueConfigs.map(config => [config.id, config.label])) as Record<LeagueId, string>;

const homeFirstLeagues: ReadonlySet<LeagueId> = new Set<LeagueId>(['olybkm', 'olybkw', 'olymih', 'olywih']);

export const isHomeFirst = (game: Pick<Game, 'league' | 'sportType'>): boolean => (
	game.sportType === 'soccer' || homeFirstLeagues.has(game.league)
);

export const leagueShortLabels: Record<LeagueId, string> = {
	nba: 'NBA',
	wnba: 'WNBA',
	ncaab: 'NCAAM',
	nhl: 'NHL',
	ncaamh: 'NCAAH',
	mlb: 'MLB',
	nfl: 'NFL',
	ncaaf: 'CFB',
	mls: 'MLS',
	ncaaw: 'NCAAW',
	epl: 'EPL',
	fifawc: 'WC',
	cbase: 'NCAA BSB',
	csoft: 'NCAA SB',
	olybb: 'OLY BSB',
	wbbc: 'WBC',
	ufl: 'UFL',
	olymih: 'OLY MIH',
	olywih: 'OLY WIH',
	olybkm: 'OLY MBB',
	olybkw: 'OLY WBB',
	olysocm: 'OLY MSOC',
	olysocw: 'OLY WSOC',
	laliga: 'La Liga',
	bundesliga: 'Bundesliga',
	seriea: 'Serie A',
	ligamx: 'Liga MX',
	ucl: 'UCL',
	uel: 'UEL',
	nwsl: 'NWSL',
	fifawwc: 'WWC',
};

export const resolveLeagueLogoUrl = (leagueId: LeagueId, espnLogoUrl?: string, surface: ResolvedTheme = 'dark'): string => {
	const url = leagueLogoOverrides[leagueId]
		?? (typeof espnLogoUrl === 'string' && espnLogoUrl.length > 0 ? espnLogoUrl : leagueLogoFallbacks[leagueId])
		?? '';
	return surface === 'light' ? url.replace('/500-dark/', '/500/') : url;
};

export const teamLogoOnColor = (logo: string | undefined): string | undefined => (
	logo?.replace(/(\/i\/teamlogos\/[^/]+)\/500\//, '$1/500-dark/')
);

export const isLeagueId = (value: unknown): value is LeagueId => (
	typeof value === 'string' && allLeagueIds.includes(value as LeagueId)
);

export const parseFavoriteTeamKey = (value: string): { leagueId: LeagueId; teamId: string } | null => {
	const trimmed = value.trim();
	const separatorIndex = trimmed.indexOf(':');
	if (separatorIndex <= 0 || separatorIndex >= trimmed.length - 1) return null;

	const leagueCandidate = trimmed.slice(0, separatorIndex);
	const teamCandidate = trimmed.slice(separatorIndex + 1).trim();
	if (!isLeagueId(leagueCandidate) || teamCandidate.length === 0) return null;

	return { leagueId: leagueCandidate, teamId: teamCandidate };
};

export const createFavoriteTeamKey = (leagueId: LeagueId, teamId: string): string => (
	`${leagueId}:${teamId.trim()}`
);

export const isFavoriteTeamGame = (
	game: Pick<Game, 'league' | 'homeTeam' | 'awayTeam'>,
	favoriteTeamIds: Set<string>,
): boolean => (
	favoriteTeamIds.has(createFavoriteTeamKey(game.league, game.homeTeam.id))
	|| favoriteTeamIds.has(createFavoriteTeamKey(game.league, game.awayTeam.id))
);

export const allSignalNames: readonly SignalName[] = ['closeness', 'lateGame', 'momentum', 'leadChanges', 'comeback'] as const;

const isSensitivityValue = (value: unknown): value is UserPreferences['sensitivity'] => (
	typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 7
);

export const secondsSliderSteps: readonly number[] = [0, 15, 30, 45, 60, 90, 120, 180];

const snapToSliderStep = (value: number): number => (
	secondsSliderSteps.reduce((nearest, step) => (
		Math.abs(step - value) < Math.abs(nearest - value) ? step : nearest
	))
);

const normalizeSecondsPreference = (value: unknown, fallback: number): number => (
	typeof value === 'number' && Number.isFinite(value)
		? snapToSliderStep(value)
		: fallback
);

export const boostPointsMax = scoreMaxTotal;

export const clampBoostPoints = (value: number): number => (
	Number.isFinite(value) ? Math.max(0, Math.min(boostPointsMax, Math.round(value))) : 0
);

const normalizeBoostPreference = (value: unknown, fallback: number): number => (
	typeof value === 'number' && Number.isFinite(value) ? clampBoostPoints(value) : fallback
);

const normalizeFavoriteTeamIds = (value: unknown): string[] => {
	if (!Array.isArray(value)) return [];

	const deduped: string[] = [];
	const seen = new Set<string>();

	for (const candidate of value) {
		if (typeof candidate !== 'string') continue;
		const parsedFavoriteTeamKey = parseFavoriteTeamKey(candidate);
		if (!parsedFavoriteTeamKey) continue;

		const favoriteTeamKey = createFavoriteTeamKey(parsedFavoriteTeamKey.leagueId, parsedFavoriteTeamKey.teamId);
		if (seen.has(favoriteTeamKey)) continue;
		seen.add(favoriteTeamKey);
		deduped.push(favoriteTeamKey);
	}

	return deduped;
};

export const createDefaultUserPreferences = (): UserPreferences => ({
	sensitivity: defaultSensitivity,
	cooldownSeconds: defaultCooldownSecs,
	switchDelaySeconds: defaultSwitchDelaySecs,
	contentAwareSwitching: false,
	enabled: true,
	enabledLeagues: [],
	favoriteTeamIds: [],
	favoriteTeamBonusPoints: defaultFavoriteTeamBonusPoints,
	rivalTeamIds: [],
	showUpcomingGames: true,
	groupByLeague: false,
	keepFinalGames: false,
	finishedTabAction: 'keep' as const,
	proTipsEnabled: true,
	notificationsEnabled: true,
	bossDecoyUrl: '',
	standbyStreamEnabled: false,
	standbyStreamThreshold: 20,
	multiviewEnabled: false,
	multiviewThreshold: defaultMultiviewThreshold,
	multiviewGames: 'hot' as const,
	multiviewMaxBoxes: defaultMultiviewMaxBoxes,
	bettingEnabled: false,
	temperatureUnit: 'F' as const,
	romerUnlocked: false,
	openRevealEnabled: true,
	theme: 'dark' as const,
	holidayDecorationsEnabled: true,
	holidaySnowEnabled: true,
	holidayLightsEnabled: true,
	holidayLeavesEnabled: true,
	holidayChristmasEnabled: true,
	holidayBuntingEnabled: true,
	holidayFireworksEnabled: true,
	postseasonBoostPoints: defaultPostseasonBoostPoints,
	upcomingGamesDays: defaultUpcomingGamesDays,
	disabledSignals: [],
	scoringMode: 'classic' as const,
	leagueModes: {},
	modeDisabledSignals: {},
	fantasyBlend: defaultFantasyBlend,
	fantasyScoring: {},
	collegeFilters: {},
});

const normalizeTemperatureUnit = (value: unknown): UserPreferences['temperatureUnit'] => (
	value === 'C' || value === 'Ro' ? value : 'F'
);

const normalizeFinishedTabAction = (value: unknown): FinishedTabAction => (
	value === 'free' || value === 'close' ? value : 'keep'
);

const normalizeTheme = (value: unknown): ThemePreference => (
	value === 'light' || value === 'system' ? value : 'dark'
);

const builtInModeIds: readonly BuiltInModeId[] = ['classic', 'blowouts', 'fantasy'];
const isBuiltInModeId = (value: unknown): value is BuiltInModeId => builtInModeIds.includes(value as BuiltInModeId);

const normalizeScoringMode = (value: unknown): ScoringModeChoice => (isBuiltInModeId(value) || value === 'custom' ? value : 'classic');

const normalizeLeagueModes = (value: unknown): UserPreferences['leagueModes'] => {
	if (!value || typeof value !== 'object') return {};
	return Object.fromEntries(Object.entries(value).filter(([league, mode]) => isLeagueId(league) && isBuiltInModeId(mode)));
};

const normalizeModeDisabledSignals = (value: unknown): UserPreferences['modeDisabledSignals'] => {
	if (!value || typeof value !== 'object') return {};
	const result: UserPreferences['modeDisabledSignals'] = {};
	for (const mode of ['blowouts', 'fantasy'] as const) {
		const stored = (value as Record<string, unknown>)[mode];
		if (!Array.isArray(stored)) continue;
		const known = new Set(builtInModes[mode].signals.map(signal => signal.id));
		const kept = [...new Set(stored.filter((id): id is string => typeof id === 'string' && known.has(id)))];
		if (kept.length > 0 && kept.length < known.size) result[mode] = kept;
	}
	return result;
};

const normalizeFantasyScoring = (value: unknown): UserPreferences['fantasyScoring'] => {
	if (!value || typeof value !== 'object') return {};
	const result: UserPreferences['fantasyScoring'] = {};
	for (const [sport, rules] of Object.entries(defaultFantasyScoring) as [FantasySport, Record<string, FantasyRule>][]) {
		const stored = (value as Record<string, unknown>)[sport];
		if (!stored || typeof stored !== 'object') continue;
		const kept = Object.fromEntries(Object.entries(stored).filter(([key, points]) => (
			rules[key] !== undefined && typeof points === 'number' && Number.isFinite(points) && points >= rules[key].min && points <= rules[key].max
		)));
		if (Object.keys(kept).length > 0) result[sport] = kept;
	}
	return result;
};

export const normalizeUserPreferences = (storedPrefs: unknown): UserPreferences => {
	const defaults = createDefaultUserPreferences();
	if (!storedPrefs || typeof storedPrefs !== 'object') return defaults;

	const candidate = storedPrefs as Partial<UserPreferences> & { enabledLeagues?: unknown; favoriteTeamIds?: unknown };
	const parsedEnabledLeagues = Array.isArray(candidate.enabledLeagues)
		? [...new Set(candidate.enabledLeagues.filter(isLeagueId))]
		: [];
	const favoriteTeamIds = normalizeFavoriteTeamIds(candidate.favoriteTeamIds);
	const favoriteSet = new Set(favoriteTeamIds);
	const parsedDisabledSignals = Array.isArray(candidate.disabledSignals)
		? [...new Set((candidate.disabledSignals as unknown[]).filter((s): s is SignalName => allSignalNames.includes(s as SignalName)))]
		: defaults.disabledSignals;

	return {
		sensitivity: isSensitivityValue(candidate.sensitivity) ? candidate.sensitivity : defaults.sensitivity,
		cooldownSeconds: normalizeSecondsPreference(candidate.cooldownSeconds, defaults.cooldownSeconds),
		switchDelaySeconds: normalizeSecondsPreference(candidate.switchDelaySeconds, defaults.switchDelaySeconds),
		contentAwareSwitching: typeof candidate.contentAwareSwitching === 'boolean' ? candidate.contentAwareSwitching : defaults.contentAwareSwitching,
		enabled: typeof candidate.enabled === 'boolean' ? candidate.enabled : defaults.enabled,
		enabledLeagues: Array.isArray(candidate.enabledLeagues) ? parsedEnabledLeagues : allLeagueIds,
		favoriteTeamIds,
		favoriteTeamBonusPoints: normalizeBoostPreference(candidate.favoriteTeamBonusPoints, defaults.favoriteTeamBonusPoints),
		rivalTeamIds: normalizeFavoriteTeamIds(candidate.rivalTeamIds).filter(key => !favoriteSet.has(key)),
		showUpcomingGames: typeof candidate.showUpcomingGames === 'boolean' ? candidate.showUpcomingGames : defaults.showUpcomingGames,
		groupByLeague: typeof candidate.groupByLeague === 'boolean' ? candidate.groupByLeague : true,
		keepFinalGames: typeof candidate.keepFinalGames === 'boolean' ? candidate.keepFinalGames : defaults.keepFinalGames,
		finishedTabAction: normalizeFinishedTabAction(candidate.finishedTabAction),
		proTipsEnabled: typeof candidate.proTipsEnabled === 'boolean' ? candidate.proTipsEnabled : defaults.proTipsEnabled,
		notificationsEnabled: typeof candidate.notificationsEnabled === 'boolean' ? candidate.notificationsEnabled : defaults.notificationsEnabled,
		bossDecoyUrl: typeof candidate.bossDecoyUrl === 'string' ? candidate.bossDecoyUrl.trim().slice(0, 2048) : defaults.bossDecoyUrl,
		standbyStreamEnabled: typeof candidate.standbyStreamEnabled === 'boolean' ? candidate.standbyStreamEnabled : defaults.standbyStreamEnabled,
		standbyStreamThreshold: typeof candidate.standbyStreamThreshold === 'number' && isFinite(candidate.standbyStreamThreshold)
			? Math.max(0, Math.min(100, Math.round(candidate.standbyStreamThreshold)))
			: defaults.standbyStreamThreshold,
		multiviewEnabled: typeof candidate.multiviewEnabled === 'boolean' ? candidate.multiviewEnabled : defaults.multiviewEnabled,
		multiviewThreshold: typeof candidate.multiviewThreshold === 'number' && Number.isFinite(candidate.multiviewThreshold)
			? Math.max(0, Math.min(100, Math.round(candidate.multiviewThreshold)))
			: defaults.multiviewThreshold,
		multiviewGames: candidate.multiviewGames === 'all' ? 'all' : 'hot',
		multiviewMaxBoxes: typeof candidate.multiviewMaxBoxes === 'number' && Number.isFinite(candidate.multiviewMaxBoxes)
			? Math.max(multiviewMaxBoxesMin, Math.min(multiviewMaxBoxesMax, Math.round(candidate.multiviewMaxBoxes)))
			: defaults.multiviewMaxBoxes,
		bettingEnabled: typeof candidate.bettingEnabled === 'boolean' ? candidate.bettingEnabled : defaults.bettingEnabled,
		temperatureUnit: normalizeTemperatureUnit(candidate.temperatureUnit),
		romerUnlocked: candidate.romerUnlocked === true || candidate.temperatureUnit === 'Ro',
		openRevealEnabled: typeof candidate.openRevealEnabled === 'boolean' ? candidate.openRevealEnabled : defaults.openRevealEnabled,
		theme: normalizeTheme(candidate.theme),
		holidayDecorationsEnabled: typeof candidate.holidayDecorationsEnabled === 'boolean' ? candidate.holidayDecorationsEnabled : defaults.holidayDecorationsEnabled,
		holidaySnowEnabled: typeof candidate.holidaySnowEnabled === 'boolean' ? candidate.holidaySnowEnabled : defaults.holidaySnowEnabled,
		holidayLightsEnabled: typeof candidate.holidayLightsEnabled === 'boolean' ? candidate.holidayLightsEnabled : defaults.holidayLightsEnabled,
		holidayLeavesEnabled: typeof candidate.holidayLeavesEnabled === 'boolean' ? candidate.holidayLeavesEnabled : defaults.holidayLeavesEnabled,
		holidayChristmasEnabled: typeof candidate.holidayChristmasEnabled === 'boolean' ? candidate.holidayChristmasEnabled : defaults.holidayChristmasEnabled,
		holidayBuntingEnabled: typeof candidate.holidayBuntingEnabled === 'boolean' ? candidate.holidayBuntingEnabled : defaults.holidayBuntingEnabled,
		holidayFireworksEnabled: typeof candidate.holidayFireworksEnabled === 'boolean' ? candidate.holidayFireworksEnabled : defaults.holidayFireworksEnabled,
		postseasonBoostPoints: normalizeBoostPreference(candidate.postseasonBoostPoints, defaults.postseasonBoostPoints),
		upcomingGamesDays: typeof candidate.upcomingGamesDays === 'number' && Number.isFinite(candidate.upcomingGamesDays)
			? Math.max(upcomingGamesDaysMin, Math.min(upcomingGamesDaysMax, Math.round(candidate.upcomingGamesDays)))
			: defaults.upcomingGamesDays,
		disabledSignals: parsedDisabledSignals.length < allSignalNames.length ? parsedDisabledSignals : defaults.disabledSignals,
		scoringMode: normalizeScoringMode(candidate.scoringMode),
		leagueModes: normalizeLeagueModes(candidate.leagueModes),
		modeDisabledSignals: normalizeModeDisabledSignals(candidate.modeDisabledSignals),
		fantasyBlend: typeof candidate.fantasyBlend === 'number' && Number.isFinite(candidate.fantasyBlend)
			? Math.max(0, Math.min(100, Math.round(candidate.fantasyBlend)))
			: defaults.fantasyBlend,
		fantasyScoring: normalizeFantasyScoring(candidate.fantasyScoring),
		collegeFilters: normalizeCollegeFilters(candidate.collegeFilters),
	};
};
