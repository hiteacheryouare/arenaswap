import { leagueConfigMap, sportTypeConfigMap } from './constants';
import type { Game, LeagueConfig, LeagueId, SportType, SportTypeConfig } from './types';

// A league the table has never heard of is scored like its sport's best-known league, so a feed
// with its own league ids keeps the right period count and clock length.
const defaultLeagueBySport: Record<SportType, LeagueId> = {
	basketball: 'nba',
	hockey: 'nhl',
	baseball: 'mlb',
	football: 'nfl',
	softball: 'csoft',
	soccer: 'mls',
};

export const resolveSportConfig = (sportType: SportType, override?: Partial<SportTypeConfig>): SportTypeConfig => {
	const base = sportTypeConfigMap[sportType] ?? sportTypeConfigMap.basketball;
	return override ? { ...base, ...override } : base;
};

export const resolveLeagueConfig = (game: Pick<Game, 'league' | 'sportType'>, override?: Partial<LeagueConfig>): LeagueConfig => {
	const base = leagueConfigMap[game.league as LeagueId]
		?? leagueConfigMap[defaultLeagueBySport[game.sportType] ?? 'nba'];
	return override ? { ...base, ...override } : base;
};
