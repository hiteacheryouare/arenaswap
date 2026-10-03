import {
	redZoneDownMultipliers,
	scoringOpportunityBaseRunnerBoosts,
	scoringOpportunityRedZoneBoost,
	scoringOpportunityRedZoneFringeBoost,
	thirdAndShortDistance,
} from '../constants';
import { isPlayFrozen } from '../progress';
import type { BoostDefinition, Game, SignalInput, SportTypeConfig } from '../types';

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

export const computeScoringOpportunity = ({ game, sport, margin }: Pick<SignalInput, 'game' | 'sport' | 'margin'>): number => {
	if (game.status !== 'in') return 0;
	// A freeze holds the situation in place (runners stay on base, the offense stays in the red
	// zone), so the boost would otherwise keep paying out while nothing can happen.
	if (isPlayFrozen(game)) return 0;
	if (game.sportType === 'baseball' || game.sportType === 'softball') {
		const r = game.baseRunners;
		if (!r) return 0;
		return scoringOpportunityBaseRunnerBoosts[[r.first, r.second, r.third].filter(Boolean).length] ?? 0;
	}
	if (game.sportType === 'football' && game.isRedZone) return getRedZoneBoost(game, sport, margin);
	return 0;
};

export const scoringOpportunityBoost: BoostDefinition = {
	id: 'scoringOpportunity',
	compute: input => ({ points: computeScoringOpportunity(input) }),
};
