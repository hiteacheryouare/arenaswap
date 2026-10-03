import { hockeyTunables } from '../constants';
import { isLive, leadOf, none, secondsLeftInPeriod } from './shared';
import type { BoostDefinition, Side } from '../types';

const sideOf = (value: Side | boolean | undefined): Side | undefined => (value === 'home' || value === 'away' ? value : undefined);

// A pulled goalie late in the 3rd of a one- or two-goal game. When the feed says whose net is empty
// it pays only for the trailing team's: the leader's empty net is a delayed penalty.
export const emptyNetBoost: BoostDefinition = {
	id: 'emptyNet',
	bucket: 'moment',
	compute: ({ game, context, sport, league, margin }) => {
		if (game.sportType !== 'hockey' || !isLive(game) || !context.emptyNet || game.period !== league.regularPeriods) return none;
		const secsLeft = secondsLeftInPeriod(game, sport, league);
		if (secsLeft === null || secsLeft > hockeyTunables.emptyNetWindowSecs) return none;
		const side = sideOf(context.emptyNet);
		if (side !== undefined && leadOf(game, side) >= 0) return none;
		return { points: margin === 1 ? 12 : margin === 2 ? 7 : 0 };
	},
};

// Without a side, the value assumes the trailing team is as likely to have it as not.
const sideFreeValue = (margin: number, late: boolean): number => {
	if (margin === 0) return late ? 10 : 4;
	if (margin === 1) return late ? 7 : 3;
	if (margin === 2) return late ? 3 : 2;
	return 0;
};

const sidedValue = (margin: number, trailingOnPowerPlay: boolean, late: boolean): number => {
	if (margin === 0) return late ? 10 : 4;
	if (margin === 1) return trailingOnPowerPlay ? (late ? 10 : 4) : (late ? 5 : 2);
	if (margin === 2) return trailingOnPowerPlay ? (late ? 5 : 2) : 0;
	return 0;
};

export const powerPlayBoost: BoostDefinition = {
	id: 'powerPlay',
	bucket: 'moment',
	compute: ({ game, context, league, margin }) => {
		if (game.sportType !== 'hockey' || !isLive(game) || !context.powerPlay || game.period === undefined) return none;
		const late = game.period >= league.regularPeriods;
		const side = sideOf(context.powerPlay);
		const points = side === undefined ? sideFreeValue(margin, late) : sidedValue(margin, leadOf(game, side) < 0, late);
		return points > 0 ? { points } : none;
	},
};
