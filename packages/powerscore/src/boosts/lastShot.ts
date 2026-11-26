import { lastShotTunables } from '../constants';
import { formatClock } from '../reasons';
import { isLive, none, ramp, secondsLeftInPeriod } from './shared';
import type { BoostDefinition, ReasonFragment } from '../types';

const shotClockSecs: Record<string, number> = { ncaab: 30, ncaaw: 30 };

export const lastShotBoost: BoostDefinition = {
	id: 'lastShot',
	bucket: 'moment',
	compute: ({ game, sport, league, margin }) => {
		if (game.sportType !== 'basketball' || !isLive(game) || game.period === undefined || game.period < league.regularPeriods || margin > 3) return none;
		const secsLeft = secondsLeftInPeriod(game, sport, league);
		const shotClock = shotClockSecs[game.league] ?? lastShotTunables.shotClockSecs;
		if (secsLeft === null || secsLeft <= 0 || secsLeft > shotClock) return none;

		const { max, peakSecs, earlyFactor, needsThreeFactor } = lastShotTunables;
		const time = earlyFactor + (1 - earlyFactor) * ramp(shotClock - secsLeft, 0, shotClock - peakSecs);
		const points = Math.round(max * time * (margin === 3 ? needsThreeFactor : 1));
		const clock = formatClock(secsLeft);
		const details: ReasonFragment[] = [margin === 0 ? { key: 'lastShotTied', params: { clock } } : { key: 'lastShotClose', params: { margin, clock } }];
		return { points, meta: { secondsLeft: secsLeft }, details };
	},
};
