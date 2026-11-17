import { activePlayers, fantasySignals } from '../signals/fantasy';
import type { PowerScoreMode } from '../types';

export const fantasyMode: PowerScoreMode = {
	id: 'fantasy',
	signals: fantasySignals,
	boosts: [],
	reasonPriority: ['situation', 'production', 'exposure'],
	usesBreakPenalty: false,
	usesWinProbability: false,
	classicBlend: { kind: 'boost', weight: 0.6 },
	appliesTo: (_game, context) => activePlayers(context).length > 0,
};
