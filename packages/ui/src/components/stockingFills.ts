import type { Game } from '@arenaswap/core/types';

export interface stockingFill {
	treats: number;
	coal: boolean;
}

export const maxTreats = 3;

const fillFor = (score: number, opponentScore: number, lostAtFinal: boolean): stockingFill => {
	if (lostAtFinal) return { treats: 0, coal: true };
	const leader = Math.max(score, opponentScore);
	if (score <= 0 || leader <= 0) return { treats: 0, coal: false };
	return { treats: Math.max(1, Math.round((maxTreats * score) / leader)), coal: false };
};

export const stockingFills = (game: Game): { home: stockingFill; away: stockingFill } => {
	const home = game.homeTeam.score;
	const away = game.awayTeam.score;
	const final = game.status === 'post';
	const homeDecider = home === away ? (game.homeTeam.shootoutScore ?? 0) : home;
	const awayDecider = home === away ? (game.awayTeam.shootoutScore ?? 0) : away;
	return {
		home: fillFor(home, away, final && homeDecider < awayDecider),
		away: fillFor(away, home, final && awayDecider < homeDecider),
	};
};
