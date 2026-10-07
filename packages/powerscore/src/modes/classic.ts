import { boostBucketCaps } from '../constants';
import { classicSignals } from '../signals/classic';
import { scoringOpportunityBoost } from '../boosts/scoringOpportunity';
import { goAheadRunBoost } from '../boosts/goAheadRun';
import { twoMinuteDrillBoost } from '../boosts/twoMinuteDrill';
import { redCardBoost } from '../boosts/redCard';
import { noHitterBoost } from '../boosts/noHitter';
import { upsetWatchBoost } from '../boosts/upsetWatch';
import { stakesBoost } from '../boosts/stakes';
import type { PowerScoreMode } from '../types';

export const classicMode: PowerScoreMode = {
	id: 'classic',
	signals: classicSignals,
	boosts: [
		scoringOpportunityBoost,
		goAheadRunBoost,
		twoMinuteDrillBoost,
		redCardBoost,
		noHitterBoost,
		upsetWatchBoost,
		stakesBoost,
	],
	bucketCaps: boostBucketCaps,
	reasonPriority: ['momentum', 'comeback', 'leadChanges', 'lateGame', 'closeness'],
	reasonLimit: 2,
	usesStallPenalty: true,
	usesWinProbability: true,
};
