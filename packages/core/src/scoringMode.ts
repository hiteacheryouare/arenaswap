import type { BuiltInModeId, Game, UserPreferences } from './types';

export const resolveModeForGame = (prefs: Pick<UserPreferences, 'scoringMode' | 'leagueModes'>, game: Pick<Game, 'league'>): BuiltInModeId => (
	prefs.scoringMode === 'custom' ? (prefs.leagueModes[game.league] ?? 'classic') : prefs.scoringMode
);

export const modesInUse = (prefs: Pick<UserPreferences, 'scoringMode' | 'leagueModes' | 'enabledLeagues'>): BuiltInModeId[] => {
	if (prefs.scoringMode !== 'custom') return [prefs.scoringMode];
	const modes = new Set<BuiltInModeId>(prefs.enabledLeagues.map(league => prefs.leagueModes[league] ?? 'classic'));
	return (['classic', 'blowouts', 'fantasy'] as const).filter(mode => modes.has(mode));
};
