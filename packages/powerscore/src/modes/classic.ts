import { boostBucketCaps } from '../constants';
import { classicSignals } from '../signals/classic';
import { scoringOpportunityBoost } from '../boosts/scoringOpportunity';
import { goAheadRunBoost } from '../boosts/goAheadRun';
import { twoMinuteDrillBoost } from '../boosts/twoMinuteDrill';
import { redCardBoost } from '../boosts/redCard';
import { noHitterBoost } from '../boosts/noHitter';
import { upsetWatchBoost } from '../boosts/upsetWatch';
import { stakesBoost } from '../boosts/stakes';
import { lastShotBoost } from '../boosts/lastShot';
import { suddenDeathBoost } from '../boosts/suddenDeath';
import type { PowerScoreMode } from '../types';

export const classicMode: PowerScoreMode = {
	id: 'classic',
	signals: classicSignals,
	boosts: [
		scoringOpportunityBoost,
		goAheadRunBoost,
		twoMinuteDrillBoost,
		lastShotBoost,
		suddenDeathBoost,
		redCardBoost,
		noHitterBoost,
		upsetWatchBoost,
		stakesBoost,
	],
	bucketCaps: boostBucketCaps,
	reasonPriority: ['momentum', 'comeback', 'leadChanges', 'lateGame', 'closeness'],
	usesBreakPenalty: true,
	usesWinProbability: true,
};
