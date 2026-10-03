import { classicSignals } from '../signals/classic';
import { scoringOpportunityBoost } from '../boosts/scoringOpportunity';
import type { PowerScoreMode } from '../types';

export const classicMode: PowerScoreMode = {
	id: 'classic',
	signals: classicSignals,
	boosts: [scoringOpportunityBoost],
	reasonPriority: ['momentum', 'comeback', 'leadChanges', 'lateGame', 'closeness'],
	reasonLimit: 2,
	usesStallPenalty: true,
	usesWinProbability: true,
};
