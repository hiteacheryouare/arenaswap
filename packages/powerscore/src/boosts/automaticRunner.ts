import { baseMask, isPostseason } from './shared';
import type { Game } from '../types';

interface AutomaticRunnerRule {
	fromInning: number;
	regularSeasonOnly?: boolean;
}

const automaticRunnerRules: Record<string, AutomaticRunnerRule> = {
	mlb: { fromInning: 10, regularSeasonOnly: true },
	wbbc: { fromInning: 10 },
	csoft: { fromInning: 8 },
};

const secondBaseOnly = 2;

// With no outs and nobody else aboard, the runner on second is still the one the rules put there.
export const isUntouchedAutomaticRunner = (game: Game<string>): boolean => {
	const rule = automaticRunnerRules[game.league];
	if (!rule || !game.baseRunners || game.period === undefined || game.period < rule.fromInning) return false;
	if (rule.regularSeasonOnly && isPostseason(game)) return false;
	return (game.outs ?? 0) === 0 && baseMask(game.baseRunners) === secondBaseOnly;
};
