import { activePlayers, fantasySignals } from '../signals/fantasy';
import type { PowerScoreMode } from '../types';

// Your roster drives the number, blended 60/40 with Classic so a dead game with your player in it
// doesn't beat a classic without one. A game with none of your players in it is scored as Classic.
export const fantasyMode: PowerScoreMode = {
	id: 'fantasy',
	signals: fantasySignals,
	boosts: [],
	reasonPriority: ['situation', 'production', 'exposure'],
	reasonLimit: 2,
	usesStallPenalty: false,
	usesWinProbability: false,
	classicBlend: { kind: 'mix', weight: 0.6 },
	appliesTo: (_game, context) => activePlayers(context).length > 0,
};
