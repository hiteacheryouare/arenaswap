import { twoMinuteDrillTunables } from '../constants';
import { clamp } from '../math';
import { formatClock } from '../reasons';
import { isDecided, isLive, leadOf, none, secondsLeftInPeriod, teamOf } from './shared';
import type { BoostDefinition, ScoreSnapshot, Side } from '../types';

interface FootballLeagueRules {
	oneScore: number;
	peakYards: number;
	untimedOvertime?: boolean;
}

const footballRules: Record<string, Partial<FootballLeagueRules>> = {
	ncaaf: { peakYards: 30, untimedOvertime: true },
	ufl: { oneScore: 9, untimedOvertime: true },
};

const justScored = (history: readonly ScoreSnapshot[], now: number): Side | undefined => {
	for (let i = history.length - 1; i >= 1; i--) {
		const cur = history[i]!;
		const prev = history[i - 1]!;
		if (cur.homeScore === prev.homeScore && cur.awayScore === prev.awayScore) continue;
		if (now - cur.timestamp > twoMinuteDrillTunables.onsideWindowMs) return undefined;
		return cur.homeScore > prev.homeScore ? 'home' : cur.awayScore > prev.awayScore ? 'away' : undefined;
	}
	return undefined;
};

const timeFactor = (secsLeft: number): number => (
	secsLeft <= 40 ? 1 : secsLeft <= 120 ? 0.6 + 0.4 * (120 - secsLeft) / 80 : 0.35 + 0.25 * (240 - secsLeft) / 120
);

const marginFactor = (trailBy: number): number => {
	if (trailBy <= 2) return 1;
	if (trailBy === 3) return 0.95;
	if (trailBy <= 6) return 0.85;
	if (trailBy === 7) return 0.8;
	if (trailBy === 8) return 0.7;
	return 0.65;
};

export const twoMinuteDrillBoost: BoostDefinition = {
	id: 'twoMinuteDrill',
	bucket: 'moment',
	compute: ({ game, sport, league, context, now }) => {
		if (game.sportType !== 'football' || !isLive(game) || game.period === undefined || isDecided({ game, sport, league, margin: Math.abs(game.homeTeam.score - game.awayTeam.score) })) return none;
		const rules: FootballLeagueRules = { oneScore: twoMinuteDrillTunables.oneScore, peakYards: twoMinuteDrillTunables.peakYards, ...footballRules[game.league] };
		if (game.period < league.regularPeriods || (rules.untimedOvertime && game.period > league.regularPeriods)) return none;
		const secsLeft = secondsLeftInPeriod(game, sport, league);
		if (secsLeft === null) return none;
		// Between plays, after a score, the feed sends a down of -1 and a yard line that means nothing.
		const betweenPlays = !(game.down !== undefined && game.down >= 1 && (game.distance ?? 0) >= 0);
		if (betweenPlays) {
			const kicking = game.period === league.regularPeriods && secsLeft <= 240 ? justScored(context.history ?? [], now) : undefined;
			const trailBy = kicking === undefined ? 0 : -leadOf(game, kicking);
			if (kicking === undefined || trailBy < 1 || trailBy > rules.oneScore) return none;
			const points = Math.round(twoMinuteDrillTunables.max * twoMinuteDrillTunables.onsideFactor * timeFactor(secsLeft) * marginFactor(trailBy));
			const params = { team: teamOf(game, kicking).abbreviation ?? '?', clock: formatClock(secsLeft), trailBy };
			return { points, meta: { secondsLeft: secsLeft, trailBy }, details: [{ key: 'onsideKick', params }] };
		}
		if (game.possession === undefined || game.yardsToEndZone === undefined) return none;

		const trailBy = -leadOf(game, game.possession);
		if (trailBy < 0 || trailBy > rules.oneScore) return none;
		const window = trailBy === 0 ? 120 : 240;
		if (secsLeft > window) return none;

		const time = timeFactor(secsLeft);
		const yards = game.yardsToEndZone;
		const field = yards <= rules.peakYards
			? 1
			: twoMinuteDrillTunables.ownTwentyFactor + (1 - twoMinuteDrillTunables.ownTwentyFactor) * clamp((80 - yards) / (80 - rules.peakYards), 0, 1);
		const timeouts = teamOf(game, game.possession).timeouts;
		const clockControl = timeouts === undefined ? 0.925 : 0.85 + 0.05 * clamp(timeouts, 0, 3);
		const points = Math.round(twoMinuteDrillTunables.max * time * field * clockControl * marginFactor(trailBy));
		const params = { team: teamOf(game, game.possession).abbreviation ?? '?', clock: formatClock(secsLeft), yards, trailBy };
		const details = [{ key: trailBy === 0 ? 'driveTied' : 'driveTrailing', params }];
		return points > 0 ? { points, meta: { secondsLeft: secsLeft, trailBy }, details } : none;
	},
};
