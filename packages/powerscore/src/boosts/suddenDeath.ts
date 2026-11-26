import { suddenDeathTunables } from '../constants';
import { isLive, isPostseason, none, teamOf } from './shared';
import type { BoostDefinition, BoostOutput, Game, LeagueConfig, SportTypeConfig } from '../types';

const twoPointTriesFrom: Record<string, number> = { ncaaf: 3, ufl: 1 };

const byOvertime = (overtime: number): number => Math.min(suddenDeathTunables.max, suddenDeathTunables.perOvertime * overtime);

const hockey = (game: Game<string>, overtime: number): BoostOutput => {
	if (isPostseason(game)) {
		const details = [overtime === 1 ? { key: 'playoffOvertime' } : { key: 'playoffOvertimeDeep', params: { overtime } }];
		return { points: byOvertime(overtime), meta: { overtime }, details };
	}
	if (overtime < 2) return none;
	return { points: suddenDeathTunables.untrackedShootout, details: [{ key: 'hockeyShootout' }] };
};

const soccer = (game: Game<string>, league: LeagueConfig): BoostOutput => {
	const home = game.homeTeam.shootoutScore;
	const away = game.awayTeam.shootoutScore;
	const tracked = home !== undefined && away !== undefined;
	if (!tracked && game.period! <= league.regularPeriods + 2) return none;
	if (!tracked) return { points: suddenDeathTunables.untrackedShootout, details: [{ key: 'penaltyShootout' }] };

	const points = suddenDeathTunables.shootoutByGap.at(Math.abs(home - away)) ?? 0;
	if (points === 0) return none;
	if (home === away) return { points, details: [{ key: 'shootoutTied', params: { goals: home } }] };
	const leader = home > away ? 'home' : 'away';
	const details = [{ key: 'shootoutLeading', params: { team: teamOf(game, leader).abbreviation ?? '?', scored: Math.max(home, away), conceded: Math.min(home, away) } }];
	return { points, details };
};

const football = (game: Game<string>, sport: SportTypeConfig, margin: number, overtime: number): BoostOutput => {
	const twoPointFrom = twoPointTriesFrom[game.league];
	if (twoPointFrom === undefined || margin > sport.closenessMargins[1]) return none;
	if (overtime >= twoPointFrom) return { points: suddenDeathTunables.max, meta: { overtime }, details: [{ key: 'twoPointTries' }] };
	const details = [overtime === 1 ? { key: 'footballOvertime' } : { key: 'footballOvertimeDeep', params: { overtime } }];
	return { points: byOvertime(overtime), meta: { overtime }, details };
};

export const suddenDeathBoost: BoostDefinition = {
	id: 'suddenDeath',
	bucket: 'moment',
	compute: ({ game, sport, league, margin }) => {
		if (!isLive(game) || game.period === undefined || game.period <= league.regularPeriods) return none;
		const overtime = game.period - league.regularPeriods;
		if (game.sportType === 'hockey') return hockey(game, overtime);
		if (game.sportType === 'soccer') return soccer(game, league);
		if (game.sportType === 'football') return football(game, sport, margin, overtime);
		return none;
	},
};
