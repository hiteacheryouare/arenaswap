import type { ReactNode } from 'react';
import type { Game, LeagueId, PowerScoreResult } from '@arenaswap/core/types';

export interface BettingDisplayPrefs {
	bettingEnabled: boolean;
}

export interface WeatherDisplayPrefs {
	temperatureUnit: 'F' | 'C';
}

export interface GameCardDisplayProps {
	game: Game | undefined;
	excitementResult: PowerScoreResult | undefined;
	favoriteTeamIds: Set<string>;
	onToggleFavoriteTeam: (leagueId: LeagueId, teamId: string) => void;
	onOpenGameDetail: (gameId: string) => void;
	bettingPrefs: BettingDisplayPrefs;
	weatherPrefs?: WeatherDisplayPrefs;
	tabSlot?: ReactNode;
}
