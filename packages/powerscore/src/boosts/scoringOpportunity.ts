import {
	redZoneDownMultipliers,
	scoringOpportunityBaseRunnerBoosts,
	scoringOpportunityRedZoneBoost,
	scoringOpportunityRedZoneFringeBoost,
	thirdAndShortDistance,
} from '../constants';
import { isPlayFrozen } from '../progress';
import { hockeyScoringOpportunity, hockeyScoringOpportunityDetails } from './hockey';
import type { BoostDefinition, Game, ReasonFragment, SignalInput, SportTypeConfig } from '../types';

// An unknown down (between plays, or a feed that doesn't report one) falls through to `other`, so a
// missing field costs the boost its bonus rather than the whole thing.
const getRedZoneDownMultiplier = (game: Game<string>): number => {
	if (game.down === 4) return game.isGoalToGo ? redZoneDownMultipliers.fourthDownGoalToGo : redZoneDownMultipliers.fourthDown;
	if (game.down === 3 && typeof game.distance === 'number' && game.distance <= thirdAndShortDistance) return redZoneDownMultipliers.thirdAndShort;
	return redZoneDownMultipliers.other;
};

// Gated on the margin because closeness and lateGame have already scored a blowout correctly low,
// and an unconditional +10 on top would undo that.
const getRedZoneBoost = (game: Game<string>, sport: SportTypeConfig, margin: number): number => {
	const [, t2, t3] = sport.closenessMargins;
	const base = margin <= t2 ? scoringOpportunityRedZoneBoost : margin <= t3 ? scoringOpportunityRedZoneFringeBoost : 0;
	if (base === 0) return 0;
	return Math.round(base * getRedZoneDownMultiplier(game));
};

export const computeScoringOpportunity = (input: SignalInput): number => {
	const { game, sport, margin } = input;
	if (game.status !== 'in') return 0;
	// A freeze holds the situation in place (runners stay on base, the offense stays in the red
	// zone), so the boost would otherwise keep paying out while nothing can happen.
	if (isPlayFrozen(game)) return 0;
	if (game.sportType === 'baseball' || game.sportType === 'softball') {
		const r = game.baseRunners;
		// Runners can linger on the scoreboard for a poll after the third out.
		if (!r || (game.outs ?? 0) >= 3) return 0;
		return scoringOpportunityBaseRunnerBoosts[[r.first, r.second, r.third].filter(Boolean).length] ?? 0;
	}
	if (game.sportType === 'football' && game.isRedZone) return getRedZoneBoost(game, sport, margin);
	if (game.sportType === 'hockey') return hockeyScoringOpportunity(input);
	return 0;
};

const baseKeys: Record<string, string> = {
	'100': 'runnerFirst',
	'010': 'runnerSecond',
	'001': 'runnerThird',
	'110': 'runnersFirstSecond',
	'101': 'runnersFirstThird',
	'011': 'runnersSecondThird',
	'111': 'basesLoaded',
};

const redZoneKey = (game: Game<string>): string => {
	if (game.down === 4) return 'redZoneFourthDown';
	if (game.down === 3 && typeof game.distance === 'number' && game.distance <= thirdAndShortDistance) return 'redZoneThirdAndShort';
	return 'redZone';
};

// Says nothing when the boost has nothing to read: a game not yet live, or play stopped.
const scoringOpportunityDetails = (input: SignalInput, points: number): ReasonFragment[] => {
	const { game } = input;
	if (game.status !== 'in' || isPlayFrozen(game)) return [];
	if (game.sportType === 'baseball' || game.sportType === 'softball') {
		const r = game.baseRunners;
		if ((game.outs ?? 0) >= 3) return [{ key: 'inningOver' }];
		if (!r) return [];
		return [{ key: baseKeys[[r.first, r.second, r.third].map(Number).join('')] ?? 'basesEmpty' }];
	}
	if (game.sportType === 'football') {
		if (game.isRedZone === undefined) return [];
		if (!game.isRedZone) return [{ key: 'outsideRedZone' }];
		const team = game.possession && (game.possession === 'home' ? game.homeTeam : game.awayTeam).abbreviation;
		if (!team) return [];
		return [{ key: points > 0 ? redZoneKey(game) : 'redZoneNotClose', params: { team } }];
	}
	if (game.sportType === 'hockey') return hockeyScoringOpportunityDetails(input);
	return [{ key: 'noScoringPosition' }];
};

export const scoringOpportunityBoost: BoostDefinition = {
	id: 'scoringOpportunity',
	bucket: 'moment',
	compute: input => {
		const points = computeScoringOpportunity(input);
		const details = scoringOpportunityDetails(input, points);
		return details.length > 0 ? { points, details } : { points };
	},
};
