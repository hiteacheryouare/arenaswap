import pkg from '../package.json';
import type { LeagueId, SignalName, UserPreferences } from './types';
import {
	allLeagueIds,
	stallPenaltySteps,
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
} from 'powerscore';

export {
	allLeagueIds,
	stallPenaltySteps,
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

export const appName = pkg.name;
export const appVersion = pkg.version;
export const appDescription = pkg.description;

export const pollIntervalMs = 15_000;
// Safety net for sports not yet in sportTypeConfigMap; in practice every config defines its own.
export const historyWindowMs = 300_000;

// After this many consecutive empty polls a league switches to dormant mode
export const pollDormantThresholdPolls = 2;
export const pollDormantMinMs = 120_000;
export const pollDormantMaxMs = 180_000;

// The interval scales continuously with PowerScore: high scores approach pollMinEagerMs, low
// scores pollMaxEagerMs. Every live game is polled at least every pollMaxEagerMs so a boring one
// can still catch a momentum shift. pollIntervalMs remains the stagger, demo and fallback value.
export const pollMinEagerMs = 6_000;
export const pollMaxEagerMs = 25_000;
export const pollIntermissionMs = 40_000;

export const defaultSensitivity = 4 as const;
export const defaultCooldownSecs = 45;
export const defaultSwitchDelaySecs = 0;
export const defaultFavoriteTeamBonusPoints = 10;
export const defaultPostseasonBoostPoints = 5;
export const defaultUpcomingGamesDays = 7;
export const upcomingGamesDaysMin = 1;
export const upcomingGamesDaysMax = 14;


// Score delta required to trigger a switch. Calibrated via `npm run powerscore:simulate`, then
// nudged ~25% stickier; level 4 sits just above the median best-vs-runner-up gap.
export const sensitivityThresholds: Record<number, number> = {
	1: 37,
	2: 27,
	3: 18,
	4: 11,
	5: 6,
	6: 3,
	7: 1
};

// Win over ESPN's API, which for these leagues returns only a generic sport icon.
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

// ESPN serves a usable logo for most of these, so the fallback only shows before the first fetch:
// the demo tab and the onboarding picker both render leagues with no scoreboard response behind
// them, and a league missing from here draws no crest at all.
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

export const resolveLeagueLogoUrl = (leagueId: LeagueId, espnLogoUrl?: string): string => {
	const override = leagueLogoOverrides[leagueId];
	if (override) return override;
	return typeof espnLogoUrl === 'string' && espnLogoUrl.length > 0
		? espnLogoUrl
		: (leagueLogoFallbacks[leagueId] ?? '');
};

const isLeagueId = (value: unknown): value is LeagueId => (
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

export const isFavoriteTeamKey = (value: unknown): value is string => (
	typeof value === 'string' && parseFavoriteTeamKey(value) !== null
);

export const allSignalNames: readonly SignalName[] = ['closeness', 'lateGame', 'momentum', 'leadChanges', 'comeback'] as const;

const signalMaxMap: Record<SignalName, number> = {
	closeness: scoreMaxCloseness,
	lateGame: scoreMaxLateGame,
	momentum: scoreMaxMomentum,
	leadChanges: scoreMaxLeadChanges,
	comeback: scoreMaxComeback,
};

export const applyDisabledSignals = (
	result: import('powerscore').PowerScoreResult,
	disabledSignals: readonly SignalName[],
): import('powerscore').PowerScoreResult => {
	if (disabledSignals.length === 0) return result;

	const disabled = new Set<SignalName>(disabledSignals);
	const enabledMax = allSignalNames
		.filter(s => !disabled.has(s))
		.reduce((sum, s) => sum + signalMaxMap[s], 0);

	if (enabledMax === 0) return result;

	const closeness = disabled.has('closeness') ? 0 : result.closeness;
	const lateGame = disabled.has('lateGame') ? 0 : result.lateGame;
	const momentum = disabled.has('momentum') ? 0 : result.momentum;
	const leadChanges = disabled.has('leadChanges') ? 0 : result.leadChanges;
	const comeback = disabled.has('comeback') ? 0 : result.comeback;

	// Turning signals off shrinks the reachable ceiling, so the survivors are rescaled to keep the
	// 0-100 range meaningful — otherwise a closeness-only setup could never exceed 42.
	//
	// The scale targets scoreMaxSignalsSubtotal, not scoreMaxTotal: signalsSubtotal is the raw
	// pre-cap subtotal (see scorer.ts, which clamps it to the signals ceiling deliberately), and
	// `total` gets capped at 100 downstream. Scaling to 100 here would double-apply that cap and
	// deflate every score — disabling comeback alone cost 26%.
	const enabledSum = closeness + lateGame + momentum + leadChanges + comeback;
	const scalingFactor = scoreMaxSignalsSubtotal / enabledMax;
	const newSignalsSubtotal = Math.min(Math.round(enabledSum * scalingFactor), scoreMaxSignalsSubtotal);

	// The stall penalty comes off the signals subtotal, so it rescales with them; volatility sits
	// on top of that subtotal and carries over at full value.
	const scaledStallPenalty = Math.round((result.stallPenalty ?? 0) * scalingFactor);
	const variance = result.winProbabilityVariance ?? 0;
	const newTotal = Math.min(Math.max(newSignalsSubtotal - scaledStallPenalty + variance, 0), scoreMaxTotal);

	return {
		...result,
		closeness,
		lateGame,
		momentum,
		leadChanges,
		comeback,
		signalsSubtotal: newSignalsSubtotal,
		total: newTotal,
		...(result.stallPenalty !== undefined ? { stallPenalty: scaledStallPenalty } : {}),
	};
};

const isSensitivityValue = (value: unknown): value is UserPreferences['sensitivity'] => (
	typeof value === 'number' && value >= 1 && value <= 7
);

const normalizeSecondsPreference = (value: unknown, fallback: number): number => (
	typeof value === 'number' && Number.isFinite(value)
		? Math.max(0, Math.round(value))
		: fallback
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
	enabled: true,
	enabledLeagues: [],
	favoriteTeamIds: [],
	favoriteTeamBonusPoints: defaultFavoriteTeamBonusPoints,
	showUpcomingGames: true,
	proTipsEnabled: true,
	notificationsEnabled: true,
	standbyStreamEnabled: false,
	standbyStreamThreshold: 20,
	bettingEnabled: false,
	temperatureUnit: 'F' as const,
	romerUnlocked: false,
	holidayDecorationsEnabled: true,
	holidaySnowEnabled: true,
	holidayLightsEnabled: true,
	holidayLeavesEnabled: true,
	postseasonBoostPoints: defaultPostseasonBoostPoints,
	upcomingGamesDays: defaultUpcomingGamesDays,
	disabledSignals: [],
});

const normalizeTemperatureUnit = (value: unknown): UserPreferences['temperatureUnit'] => (
	value === 'C' || value === 'Ro' ? value : 'F'
);

export const normalizeUserPreferences = (storedPrefs: unknown): UserPreferences => {
	const defaults = createDefaultUserPreferences();
	if (!storedPrefs || typeof storedPrefs !== 'object') return defaults;

	const candidate = storedPrefs as Partial<UserPreferences> & { enabledLeagues?: unknown; favoriteTeamIds?: unknown };
	const hasEnabledLeaguesField = Object.prototype.hasOwnProperty.call(candidate, 'enabledLeagues');
	// Order is the user's league display order, so it is preserved — but a repeated id would break
	// the reorder UI's index math and duplicate React keys.
	const parsedEnabledLeagues = Array.isArray(candidate.enabledLeagues)
		? [...new Set(candidate.enabledLeagues.filter(isLeagueId))]
		: [];

	return {
		sensitivity: isSensitivityValue(candidate.sensitivity) ? candidate.sensitivity : defaults.sensitivity,
		cooldownSeconds: normalizeSecondsPreference(candidate.cooldownSeconds, defaults.cooldownSeconds),
		switchDelaySeconds: normalizeSecondsPreference(candidate.switchDelaySeconds, defaults.switchDelaySeconds),
		enabled: typeof candidate.enabled === 'boolean' ? candidate.enabled : defaults.enabled,
		enabledLeagues: hasEnabledLeaguesField ? parsedEnabledLeagues : allLeagueIds,
		favoriteTeamIds: normalizeFavoriteTeamIds(candidate.favoriteTeamIds),
		favoriteTeamBonusPoints: normalizeSecondsPreference(candidate.favoriteTeamBonusPoints, defaults.favoriteTeamBonusPoints),
		showUpcomingGames: typeof candidate.showUpcomingGames === 'boolean' ? candidate.showUpcomingGames : defaults.showUpcomingGames,
		proTipsEnabled: typeof candidate.proTipsEnabled === 'boolean' ? candidate.proTipsEnabled : defaults.proTipsEnabled,
		notificationsEnabled: typeof candidate.notificationsEnabled === 'boolean' ? candidate.notificationsEnabled : defaults.notificationsEnabled,
		standbyStreamEnabled: typeof candidate.standbyStreamEnabled === 'boolean' ? candidate.standbyStreamEnabled : defaults.standbyStreamEnabled,
		standbyStreamThreshold: typeof candidate.standbyStreamThreshold === 'number' && isFinite(candidate.standbyStreamThreshold)
			? Math.max(0, Math.min(100, Math.round(candidate.standbyStreamThreshold)))
			: defaults.standbyStreamThreshold,
		bettingEnabled: typeof candidate.bettingEnabled === 'boolean' ? candidate.bettingEnabled : defaults.bettingEnabled,
		temperatureUnit: normalizeTemperatureUnit(candidate.temperatureUnit),
		// A stored Rømer unit is itself proof the unlock happened, so the two can never
		// disagree in the direction that would strand someone on a unit they cannot cycle back to.
		romerUnlocked: candidate.romerUnlocked === true || candidate.temperatureUnit === 'Ro',
		holidayDecorationsEnabled: typeof candidate.holidayDecorationsEnabled === 'boolean' ? candidate.holidayDecorationsEnabled : defaults.holidayDecorationsEnabled,
		holidaySnowEnabled: typeof candidate.holidaySnowEnabled === 'boolean' ? candidate.holidaySnowEnabled : defaults.holidaySnowEnabled,
		holidayLightsEnabled: typeof candidate.holidayLightsEnabled === 'boolean' ? candidate.holidayLightsEnabled : defaults.holidayLightsEnabled,
		holidayLeavesEnabled: typeof candidate.holidayLeavesEnabled === 'boolean' ? candidate.holidayLeavesEnabled : defaults.holidayLeavesEnabled,
		postseasonBoostPoints: normalizeSecondsPreference(candidate.postseasonBoostPoints, defaults.postseasonBoostPoints),
		upcomingGamesDays: typeof candidate.upcomingGamesDays === 'number' && Number.isFinite(candidate.upcomingGamesDays)
			? Math.max(upcomingGamesDaysMin, Math.min(upcomingGamesDaysMax, Math.round(candidate.upcomingGamesDays)))
			: defaults.upcomingGamesDays,
		disabledSignals: Array.isArray(candidate.disabledSignals)
			? (candidate.disabledSignals as unknown[]).filter((s): s is SignalName => allSignalNames.includes(s as SignalName))
			: defaults.disabledSignals,
	};
};
