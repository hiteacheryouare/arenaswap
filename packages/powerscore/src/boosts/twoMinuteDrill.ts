import { twoMinuteDrillTunables } from '../constants';
import { clamp } from '../math';
import { formatClock } from '../reasons';
import { isDecided, isLive, leadOf, none, secondsLeftInPeriod, teamOf } from './shared';
import type { BoostDefinition } from '../types';

interface FootballLeagueRules {
	// The deficit one possession can erase.
	oneScore: number;
	// Yards from the end zone where field position stops mattering.
	peakYards: number;
	// College overtime has no game clock, so there is no drill to run.
	untimedOvertime?: boolean;
}

// The UFL's 3-point try makes 9 a one-score game.
const footballRules: Record<string, Partial<FootballLeagueRules>> = {
	ncaaf: { peakYards: 30, untimedOvertime: true },
	ufl: { oneScore: 9 },
};

const marginFactor = (trailBy: number): number => {
	if (trailBy <= 2) return 1;
	if (trailBy === 3) return 0.95;
	if (trailBy <= 6) return 0.85;
	if (trailBy === 7) return 0.8;
	if (trailBy === 8) return 0.7;
	return 0.65;
};

// The trailing team driving late with a one-score deficit (either team when tied). The leader
// running out the clock pays nothing.
export const twoMinuteDrillBoost: BoostDefinition = {
	id: 'twoMinuteDrill',
	bucket: 'moment',
	compute: ({ game, sport, league }) => {
		if (game.sportType !== 'football' || !isLive(game) || game.period === undefined || isDecided({ game, sport, league, margin: Math.abs(game.homeTeam.score - game.awayTeam.score) })) return none;
		const rules: FootballLeagueRules = { oneScore: twoMinuteDrillTunables.oneScore, peakYards: twoMinuteDrillTunables.peakYards, ...footballRules[game.league] };
		if (game.period < league.regularPeriods || (rules.untimedOvertime && game.period > league.regularPeriods)) return none;
		if (game.possession === undefined || game.yardsToEndZone === undefined) return none;
		// Between plays, after a score, the feed sends a down of -1 and a yard line that means nothing.
		if (!(game.down !== undefined && game.down >= 1 && (game.distance ?? 0) >= 0)) return none;
		const secsLeft = secondsLeftInPeriod(game, sport, league);
		if (secsLeft === null) return none;

		const trailBy = -leadOf(game, game.possession);
		if (trailBy < 0 || trailBy > rules.oneScore) return none;
		const window = trailBy === 0 ? 120 : 240;
		if (secsLeft > window) return none;

		const time = secsLeft <= 40 ? 1 : secsLeft <= 120 ? 0.6 + 0.4 * (120 - secsLeft) / 80 : 0.35 + 0.25 * (240 - secsLeft) / 120;
		const yards = game.yardsToEndZone;
		const field = yards <= rules.peakYards
			? 1
			: twoMinuteDrillTunables.ownTwentyFactor + (1 - twoMinuteDrillTunables.ownTwentyFactor) * clamp((80 - yards) / (80 - rules.peakYards), 0, 1);
		const timeouts = teamOf(game, game.possession).timeouts;
		// Timeouts move the win odds more than whether a fan wants to watch, so they nudge rather than gate.
		const clockControl = timeouts === undefined ? 0.925 : 0.85 + 0.05 * clamp(timeouts, 0, 3);
		const points = Math.round(twoMinuteDrillTunables.max * time * field * clockControl * marginFactor(trailBy));
		const params = { team: teamOf(game, game.possession).abbreviation ?? '?', clock: formatClock(secsLeft), yards, trailBy };
		const details = [{ key: trailBy === 0 ? 'driveTied' : 'driveTrailing', params }];
		return points > 0 ? { points, meta: { secondsLeft: secsLeft, trailBy }, details } : none;
	},
};
