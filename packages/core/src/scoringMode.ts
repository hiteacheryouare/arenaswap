import type { BuiltInModeId, Game, ScoringModeChoice, UserPreferences } from './types';

// The mode a game is scored in: the global choice, or under Custom the league's own.
export const resolveModeForGame = (prefs: Pick<UserPreferences, 'scoringMode' | 'leagueModes'>, game: Pick<Game, 'league'>): BuiltInModeId => (
	prefs.scoringMode === 'custom' ? (prefs.leagueModes[game.league] ?? 'classic') : prefs.scoringMode
);

// Every mode a user might see a score from, so Settings shows only the switches that matter.
export const modesInUse = (prefs: Pick<UserPreferences, 'scoringMode' | 'leagueModes' | 'enabledLeagues'>): BuiltInModeId[] => {
	if (prefs.scoringMode !== 'custom') return [prefs.scoringMode];
	const modes = new Set<BuiltInModeId>(prefs.enabledLeagues.map(league => prefs.leagueModes[league] ?? 'classic'));
	return (['classic', 'blowouts', 'fantasy'] as const).filter(mode => modes.has(mode));
};

export const isScoringModeChoice = (value: unknown): value is ScoringModeChoice => (
	value === 'classic' || value === 'blowouts' || value === 'fantasy' || value === 'custom'
);
