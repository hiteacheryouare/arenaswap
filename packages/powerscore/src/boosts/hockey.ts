import { hockeyTunables } from '../constants';
import { formatClock } from '../reasons';
import { isDecided, leadOf, secondsLeftInPeriod, teamOf } from './shared';
import type { ReasonFragment, Side, SignalInput } from '../types';

const sideOf = (value: Side | boolean | undefined): Side | undefined => (value === 'home' || value === 'away' ? value : undefined);

// A pulled goalie late in the 3rd of a one- or two-goal game. When the feed says whose net is empty
// it pays only for the trailing team's: the leader's empty net is a delayed penalty.
const emptyNetPoints = ({ game, context, sport, league, margin }: SignalInput): number => {
	if (!context.emptyNet || game.period !== league.regularPeriods) return 0;
	const secsLeft = secondsLeftInPeriod(game, sport, league);
	if (secsLeft === null || secsLeft > hockeyTunables.emptyNetWindowSecs) return 0;
	const side = sideOf(context.emptyNet);
	if (side !== undefined && leadOf(game, side) >= 0) return 0;
	return margin === 1 ? 12 : margin === 2 ? 7 : 0;
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

const powerPlayPoints = (input: SignalInput): number => {
	const { game, context, league, margin } = input;
	if (!context.powerPlay || game.period === undefined || isDecided(input)) return 0;
	const late = game.period >= league.regularPeriods;
	const side = sideOf(context.powerPlay);
	return side === undefined ? sideFreeValue(margin, late) : sidedValue(margin, leadOf(game, side) < 0, late);
};

// Without a side, the trailing team is the one that pulls its goalie.
const emptyNetDetail = ({ game, context, sport, league, margin }: SignalInput): ReasonFragment => {
	const puller = sideOf(context.emptyNet) ?? (leadOf(game, 'home') < 0 ? 'home' : 'away');
	const secsLeft = secondsLeftInPeriod(game, sport, league) ?? 0;
	return { key: 'emptyNet', params: { team: teamOf(game, puller).abbreviation ?? '?', margin, clock: formatClock(secsLeft) } };
};

const powerPlayDetail = ({ game, context, margin }: SignalInput): ReasonFragment => {
	const side = sideOf(context.powerPlay);
	if (side === undefined) return margin === 0 ? { key: 'powerPlayTied' } : { key: 'powerPlayClose', params: { margin } };
	const team = teamOf(game, side).abbreviation ?? '?';
	const lead = leadOf(game, side);
	if (lead === 0) return { key: 'powerPlayTeamTied', params: { team } };
	return { key: lead < 0 ? 'powerPlayTeamTrailing' : 'powerPlayTeamLeading', params: { team, margin } };
};

// A 6-on-4 is both at once, so they stack and the moment bucket's cap trims the sum.
export const hockeyScoringOpportunity = (input: SignalInput): number => emptyNetPoints(input) + powerPlayPoints(input);

export const hockeyScoringOpportunityDetails = (input: SignalInput): ReasonFragment[] => [
	...(emptyNetPoints(input) > 0 ? [emptyNetDetail(input)] : []),
	...(powerPlayPoints(input) > 0 ? [powerPlayDetail(input)] : []),
];
