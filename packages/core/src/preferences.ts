import { allLeagueIds, builtInModes, defaultFantasyScoring, scoreMaxTotal } from 'powerscore';
import type { FantasyRule, FantasySport } from 'powerscore';
import { normalizeCollegeFilters } from './college';
import { createFavoriteTeamKey, isLeagueId, parseFavoriteTeamKey } from './leagues';
import type { BuiltInModeId, FinishedTabAction, ScoringModeChoice, SignalName, ThemePreference, UserPreferences } from './types';

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
