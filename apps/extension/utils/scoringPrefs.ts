import { builtInModes, defaultFantasyScoring, type FantasySport } from 'powerscore';
import { allSignalNames } from '@arenaswap/core/constants';
import { fantasyLeagues } from '@arenaswap/core';
import type { BuiltInModeId, LeagueId, SignalName, UserPreferences } from '@arenaswap/core/types';

type nonClassicMode = Exclude<BuiltInModeId, 'classic'>;

export const modeSignalNames = (mode: BuiltInModeId): string[] => builtInModes[mode].signals.map(signal => signal.id);

export const disabledSignalsOf = (prefs: Pick<UserPreferences, 'disabledSignals' | 'modeDisabledSignals'>, mode: BuiltInModeId): readonly string[] => (
	mode === 'classic' ? prefs.disabledSignals : (prefs.modeDisabledSignals[mode] ?? [])
);

// Every mode keeps at least one signal on, so a switch that would turn the last one off does nothing.
export const toggleModeSignal = (prefs: UserPreferences, mode: BuiltInModeId, signal: string): UserPreferences => {
	const all = mode === 'classic' ? allSignalNames as readonly string[] : modeSignalNames(mode);
	if (!all.includes(signal)) return prefs;
	const disabled = new Set(disabledSignalsOf(prefs, mode));
	if (disabled.has(signal)) {
		disabled.delete(signal);
	} else {
		if (all.filter(id => !disabled.has(id) && id !== signal).length === 0) return prefs;
		disabled.add(signal);
	}
	if (mode === 'classic') return { ...prefs, disabledSignals: [...disabled] as SignalName[] };
	const modeDisabledSignals = { ...prefs.modeDisabledSignals };
	if (disabled.size === 0) delete modeDisabledSignals[mode as nonClassicMode];
	else modeDisabledSignals[mode as nonClassicMode] = [...disabled];
	return { ...prefs, modeDisabledSignals };
};

// Fantasy scores rostered players, and the roster only holds players from these leagues.
export const canUseFantasy = (league: LeagueId): boolean => fantasyLeagues.includes(league);

// A league left out scores as Classic, so Classic is stored as no entry at all.
export const withLeagueMode = (leagueModes: UserPreferences['leagueModes'], league: LeagueId, mode: BuiltInModeId): UserPreferences['leagueModes'] => {
	const next = { ...leagueModes };
	if (mode === 'classic' || (mode === 'fantasy' && !canUseFantasy(league))) delete next[league];
	else next[league] = mode;
	return next;
};

// Only a value that differs from the default is kept.
export const withFantasyRule = (scoring: UserPreferences['fantasyScoring'], sport: FantasySport, rule: string, points: number): UserPreferences['fantasyScoring'] => {
	const defaults = defaultFantasyScoring[sport][rule];
	if (!defaults) return scoring;
	const clamped = Math.min(defaults.max, Math.max(defaults.min, points));
	const sportRules = { ...scoring[sport] };
	if (clamped === defaults.points) delete sportRules[rule];
	else sportRules[rule] = clamped;
	const next = { ...scoring };
	if (Object.keys(sportRules).length === 0) delete next[sport];
	else next[sport] = sportRules;
	return next;
};

export const withoutFantasySport = (scoring: UserPreferences['fantasyScoring'], sport: FantasySport): UserPreferences['fantasyScoring'] => {
	const next = { ...scoring };
	delete next[sport];
	return next;
};

export const fantasyRulePoints = (scoring: UserPreferences['fantasyScoring'], sport: FantasySport, rule: string): number => (
	scoring[sport]?.[rule] ?? defaultFantasyScoring[sport][rule]?.points ?? 0
);

export const changedFantasyRuleCount = (scoring: UserPreferences['fantasyScoring']): number => (
	Object.values(scoring).reduce((count, rules) => count + Object.keys(rules ?? {}).length, 0)
);
