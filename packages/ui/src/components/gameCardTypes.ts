import type { ReactNode } from 'react';
import type { Game, LeagueId, PowerScoreResult } from '@arenaswap/core/types';
import type { temperatureDisplayUnit } from './weatherUtils';

export interface BettingDisplayPrefs {
	bettingEnabled: boolean;
}

export interface WeatherDisplayPrefs {
	temperatureUnit: temperatureDisplayUnit;
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
	// Absent while the list groups games under league headers, which already name the league.
	leagueSlot?: ReactNode;
	// Set under the Up Next day pager, which already names the day, so a card there shows the time alone.
	dayNamedAbove?: boolean;
	// False on the website's demo cards: no details button, and the stars and odds tooltip leave the tab order.
	interactive?: boolean;
}
