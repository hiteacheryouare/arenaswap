import {
	redZoneDownMultipliers,
	scoringOpportunityBaseRunnerBoosts,
	scoringOpportunityRedZoneBoost,
	scoringOpportunityRedZoneFringeBoost,
	thirdAndShortDistance,
} from '../constants';
import { isPlayFrozen } from '../progress';
import { hockeyScoringOpportunity, hockeyScoringOpportunityDetails } from './hockey';
import { baseMask, runnersOn } from './shared';
import type { BoostDefinition, Game, ReasonFragment, SignalInput, SportTypeConfig } from '../types';

const getRedZoneDownMultiplier = (game: Game<string>): number => {
	if (game.down === 4) return game.isGoalToGo ? redZoneDownMultipliers.fourthDownGoalToGo : redZoneDownMultipliers.fourthDown;
	if (game.down === 3 && typeof game.distance === 'number' && game.distance <= thirdAndShortDistance) return redZoneDownMultipliers.thirdAndShort;
	return redZoneDownMultipliers.other;
};

const getRedZoneBoost = (game: Game<string>, sport: SportTypeConfig, margin: number): number => {
	const [, t2, t3] = sport.closenessMargins;
	const base = margin <= t2 ? scoringOpportunityRedZoneBoost : margin <= t3 ? scoringOpportunityRedZoneFringeBoost : 0;
	if (base === 0) return 0;
	return Math.round(base * getRedZoneDownMultiplier(game));
};

export const computeScoringOpportunity = (input: SignalInput): number => {
	const { game, sport, margin } = input;
	if (game.status !== 'in') return 0;
	if (isPlayFrozen(game)) return 0;
	if (game.sportType === 'baseball' || game.sportType === 'softball') {
		const r = game.baseRunners;
		// Runners can linger on the scoreboard for a poll after the third out.
		if (!r || (game.outs ?? 0) >= 3) return 0;
		return scoringOpportunityBaseRunnerBoosts[runnersOn(baseMask(r))] ?? 0;
	}
	if (game.sportType === 'football' && game.isRedZone) return getRedZoneBoost(game, sport, margin);
	if (game.sportType === 'hockey') return hockeyScoringOpportunity(input);
	return 0;
};

const baseKeys = [
	'basesEmpty',
	'runnerFirst',
	'runnerSecond',
	'runnersFirstSecond',
	'runnerThird',
	'runnersFirstThird',
	'runnersSecondThird',
	'basesLoaded',
];

const redZoneKey = (game: Game<string>): string => {
	if (game.down === 4) return 'redZoneFourthDown';
	if (game.down === 3 && typeof game.distance === 'number' && game.distance <= thirdAndShortDistance) return 'redZoneThirdAndShort';
	return 'redZone';
};

const scoringOpportunityDetails = (input: SignalInput, points: number): ReasonFragment[] => {
	const { game } = input;
	if (game.status !== 'in' || isPlayFrozen(game)) return [];
	if (game.sportType === 'baseball' || game.sportType === 'softball') {
		const r = game.baseRunners;
		if ((game.outs ?? 0) >= 3) return [{ key: 'inningOver' }];
		if (!r) return [];
		return [{ key: baseKeys[baseMask(r)]! }];
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
