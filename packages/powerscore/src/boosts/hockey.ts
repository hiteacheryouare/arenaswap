import { hockeyTunables } from '../constants';
import { formatClock } from '../reasons';
import { isDecided, isLive, leadOf, none, secondsLeftInPeriod, teamOf } from './shared';
import type { BoostDefinition, Game, ReasonFragment, Side } from '../types';

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
		const points = margin === 1 ? 12 : margin === 2 ? 7 : 0;
		// Without a side, the trailing team is the one that pulls its goalie.
		const puller = side ?? (leadOf(game, 'home') < 0 ? 'home' : 'away');
		const details = [{ key: 'emptyNet', params: { team: teamOf(game, puller).abbreviation ?? '?', margin, clock: formatClock(secsLeft) } }];
		return points > 0 ? { points, details } : none;
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

const powerPlayDetail = (game: Game<string>, side: Side | undefined, margin: number): ReasonFragment => {
	if (side === undefined) return margin === 0 ? { key: 'powerPlayTied' } : { key: 'powerPlayClose', params: { margin } };
	const team = teamOf(game, side).abbreviation ?? '?';
	const lead = leadOf(game, side);
	if (lead === 0) return { key: 'powerPlayTeamTied', params: { team } };
	return { key: lead < 0 ? 'powerPlayTeamTrailing' : 'powerPlayTeamLeading', params: { team, margin } };
};

export const powerPlayBoost: BoostDefinition = {
	id: 'powerPlay',
	bucket: 'moment',
	compute: ({ game, context, sport, league, margin }) => {
		if (game.sportType !== 'hockey' || !isLive(game) || !context.powerPlay || game.period === undefined || isDecided({ game, sport, league, margin })) return none;
		const late = game.period >= league.regularPeriods;
		const side = sideOf(context.powerPlay);
		const points = side === undefined ? sideFreeValue(margin, late) : sidedValue(margin, leadOf(game, side) < 0, late);
		return points > 0 ? { points, details: [powerPlayDetail(game, side, margin)] } : none;
	},
};
