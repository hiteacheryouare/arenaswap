import { boostBucketCaps } from '../constants';
import { blowoutsSignals } from '../signals/blowouts';
import { noHitterBoost } from '../boosts/noHitter';
import { upsetRoutBoost } from '../boosts/upsetWatch';
import type { PowerScoreMode } from '../types';

export const blowoutsMode: PowerScoreMode = {
	id: 'blowouts',
	signals: blowoutsSignals,
	boosts: [noHitterBoost, upsetRoutBoost],
	bucketCaps: boostBucketCaps,
	reasonPriority: ['pileOn', 'blowoutMargin', 'sustained', 'timing'],
	usesBreakPenalty: true,
	usesWinProbability: false,
	classicBlend: { kind: 'floor', factor: 0.3 },
	paysPostseason: false,
	rivals: { ordinaryCeiling: 85 },
};
