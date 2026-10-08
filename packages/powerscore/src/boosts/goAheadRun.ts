import { goAheadRunTunables } from '../constants';
import { isBaseball, isLive, none, ramp } from './shared';
import type { BoostDefinition, ReasonFragment } from '../types';

// On top of the runner count: the batting team has the go-ahead run on base (tied with anyone on,
// down one with two on, down two with the bases loaded), or failing that the tying run on base.
export const goAheadRunBoost: BoostDefinition = {
	id: 'goAheadRun',
	bucket: 'moment',
	compute: ({ game, sport }) => {
		const curve = sport.lateGameCurve;
		if (!isBaseball(game) || !isLive(game) || !curve || game.topOfInning === undefined || !game.baseRunners || game.period === undefined) return none;
		if ((game.outs ?? 0) >= 3) return none;
		const battingHome = !game.topOfInning;
		const deficit = battingHome ? game.awayTeam.score - game.homeTeam.score : game.homeTeam.score - game.awayTeam.score;
		const { first, second, third } = game.baseRunners;
		const runners = [first, second, third].filter(Boolean).length;
		const base = deficit >= 0 && deficit <= 2 && runners >= deficit + 1
			? goAheadRunTunables.goAhead
			: deficit >= 1 && deficit <= 3 && runners === deficit ? goAheadRunTunables.tyingRun : 0;
		if (base === 0) return none;

		const inning = game.period;
		const inningFactor = inning > curve.regulationInnings
			? 1
			: inning < curve.regulationStartInning
				? goAheadRunTunables.earlyFactor
				// Climbs to full value in the last inning, with leverage: a 7th-inning chance shouldn't
				// outrank a late drive elsewhere.
				: goAheadRunTunables.earlyFactor + (1 - goAheadRunTunables.earlyFactor) * ramp(inning, curve.regulationStartInning, curve.regulationInnings);
		// The last chance: the home team's go-ahead run is the winning run, and a trailing road team
		// may not bat again.
		const lastChance = inning >= curve.regulationInnings && (battingHome || deficit > 0);
		const team = (battingHome ? game.homeTeam : game.awayTeam).abbreviation ?? '?';
		const goAhead = base === goAheadRunTunables.goAhead;
		const details: ReasonFragment[] = goAhead && lastChance && battingHome
			? [{ key: 'winningRun', params: { team } }]
			: [{ key: goAhead ? 'goAheadRun' : 'tyingRun', params: { team } }, ...(lastChance ? [{ key: 'lastChance' }] : [])];
		return { points: Math.round(base * inningFactor * (lastChance ? goAheadRunTunables.lastChanceFactor : 1)), details };
	},
};
