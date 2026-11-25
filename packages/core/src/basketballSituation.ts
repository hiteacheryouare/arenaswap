export interface BasketballTeamSituation {
	timeoutsLeft?: number;
	bonus?: 'bonus' | 'double';
	foulsToGive?: number;
	periodFouls?: number;
}

export interface BasketballSituation {
	home: BasketballTeamSituation;
	away: BasketballTeamSituation;
}
