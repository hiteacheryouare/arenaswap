import { activePlayers, fantasySignals } from '../signals/fantasy';
import type { PowerScoreMode } from '../types';

// Your players lift a game: 60% of what they're doing is added to its Classic score, so their games
// pull ahead when they matter and never sink below a game without them. A game with none of your
// players in it is scored as Classic.
export const fantasyMode: PowerScoreMode = {
	id: 'fantasy',
	signals: fantasySignals,
	boosts: [],
	reasonPriority: ['situation', 'production', 'exposure'],
	reasonLimit: 2,
	usesStallPenalty: false,
	usesWinProbability: false,
	classicBlend: { kind: 'boost', weight: 0.6 },
	appliesTo: (_game, context) => activePlayers(context).length > 0,
};
