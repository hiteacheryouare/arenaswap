import { boostBucketCaps } from '../constants';
import { blowoutsSignals } from '../signals/blowouts';
import { noHitterBoost } from '../boosts/noHitter';
import { upsetRoutBoost } from '../boosts/upsetWatch';
import type { PowerScoreMode } from '../types';

// The premise inverted: margin and a lead held score high. Close games keep 30% of their Classic
// score as a floor, so a night with no beatdown still has something to switch to, and any real
// beatdown outranks the best of them. A blowout has settled the result, so a playoff game pays no
// postseason boost here.
export const blowoutsMode: PowerScoreMode = {
	id: 'blowouts',
	signals: blowoutsSignals,
	boosts: [noHitterBoost, upsetRoutBoost],
	bucketCaps: boostBucketCaps,
	reasonPriority: ['pileOn', 'blowoutMargin', 'sustained', 'timing'],
	reasonLimit: 2,
	usesStallPenalty: true,
	usesWinProbability: false,
	classicBlend: { kind: 'floor', factor: 0.3 },
	paysPostseason: false,
};
