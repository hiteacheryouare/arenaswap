import { upsetTunables } from '../constants';
import { clamp } from '../math';
import { isDecided, isLive, leadOf, none, otherSide, teamOf } from './shared';
import type { BoostDefinition, PregameLine, ReasonFragment, SignalInput, SportType } from '../types';

// Spread → win probability uses the spread of final margins around the line.
const marginSigma: Record<string, number> = { nfl: 13.5, ufl: 13.5, ncaaf: 16, nba: 12, wnba: 11, ncaab: 11, ncaaw: 12 };
const sportSigma: Partial<Record<SportType, number>> = { football: 13.5, basketball: 12 };

// Win probability where the boost starts, and where it is full.
const sizeRange: Record<SportType, [number, number]> = {
	basketball: [0.38, 0.1],
	football: [0.38, 0.1],
	hockey: [0.42, 0.25],
	baseball: [0.38, 0.25],
	softball: [0.38, 0.25],
	soccer: [0.35, 0.15],
};

// Progress at which an underdog hanging around counts as late.
const lateProgress: Record<SportType, number> = { basketball: 0.75, football: 0.75, hockey: 0.667, soccer: 0.667, baseball: 0.667, softball: 0.571 };

const impliedProbability = (moneyline: number): number => (moneyline < 0 ? -moneyline / (-moneyline + 100) : 100 / (moneyline + 100));

// Abramowitz & Stegun 7.1.26, plenty for a boost that rounds to whole points.
const normalCdf = (x: number): number => {
	const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
	const erf = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(x * x) / 2);
	return x >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
};

// The underdog's chance before kickoff. A draw counts as half an upset. A puck or run line alone
// says who is favored but not by how much, so it is not enough.
export const underdogProbability = (line: PregameLine, sportType: SportType, league: string): number | undefined => {
	if (line.favoriteMoneyline !== undefined && line.underdogMoneyline !== undefined) {
		const favorite = impliedProbability(line.favoriteMoneyline);
		const underdog = impliedProbability(line.underdogMoneyline);
		if (line.drawMoneyline !== undefined) {
			const draw = impliedProbability(line.drawMoneyline);
			const total = favorite + underdog + draw;
			return underdog / total + 0.5 * (draw / total);
		}
		return underdog / (underdog + favorite);
	}
	const sigma = marginSigma[league] ?? sportSigma[sportType];
	if (line.spread !== undefined && line.spread > 0 && sigma !== undefined) return normalCdf(-line.spread / sigma);
	return undefined;
};

// The chance the underdog wins outright, for saying so. A draw is not a win here.
const underdogWinChance = (line: PregameLine, p: number): number => {
	if (line.drawMoneyline === undefined || line.favoriteMoneyline === undefined || line.underdogMoneyline === undefined) return p;
	const underdog = impliedProbability(line.underdogMoneyline);
	return underdog / (underdog + impliedProbability(line.favoriteMoneyline) + impliedProbability(line.drawMoneyline));
};

const upsetParts = (input: Pick<SignalInput, 'game' | 'context' | 'sport' | 'progress' | 'league' | 'margin'>) => {
	const { game, context, sport, progress } = input;
	const line = context.pregameLine;
	if (!line || !isLive(game) || isDecided({ game, sport, league: input.league, margin: input.margin })) return undefined;
	const p = underdogProbability(line, game.sportType, game.league);
	if (p === undefined) return undefined;
	const [zero, full] = sizeRange[game.sportType];
	const size = clamp((zero - p) / (zero - full), 0, 1);
	const late = lateProgress[game.sportType];
	const phase = progress < 0.5 ? 0 : progress < late ? 0.5 : 1;
	const underdog = otherSide(line.favorite);
	return {
		size,
		phase,
		underdogLead: leadOf(game, underdog),
		sport,
		team: teamOf(game, underdog).abbreviation ?? '?',
		chance: Math.round(100 * underdogWinChance(line, p)),
	};
};

const upsetDetail = ({ team, chance, underdogLead }: { team: string; chance: number; underdogLead: number }): ReasonFragment => {
	if (underdogLead > 0) return { key: 'underdogLeading', params: { team, chance, margin: underdogLead } };
	if (underdogLead === 0) return { key: 'underdogLevel', params: { team, chance } };
	return { key: 'underdogClose', params: { team, chance, margin: -underdogLead } };
};

// The pregame underdog leading, level, or within one score once the game is past halfway.
export const upsetWatchBoost: BoostDefinition = {
	id: 'upsetWatch',
	bucket: 'context',
	compute: input => {
		const parts = upsetParts(input);
		if (!parts) return none;
		const { size, phase, underdogLead, sport } = parts;
		const oneScore = input.game.sportType === 'football' ? (input.game.league === 'ufl' ? 9 : 8) : sport.closenessMargins[0];
		const state = underdogLead > 0 ? 1 : underdogLead === 0 ? (input.game.sportType === 'soccer' ? 0.7 : 0.8) : -underdogLead <= oneScore ? 0.5 : 0;
		const points = Math.round(upsetTunables.max * size * phase * state);
		return points > 0 ? { points, details: [upsetDetail(parts)] } : none;
	},
};

// Blowouts' version: the underdog running the favorite off the field.
export const upsetRoutBoost: BoostDefinition = {
	id: 'upsetRout',
	compute: input => {
		const parts = upsetParts(input);
		if (!parts || parts.underdogLead <= parts.sport.closenessMargins[2]) return none;
		const points = Math.round(upsetTunables.max * parts.size * parts.phase);
		return points > 0 ? { points, details: [upsetDetail(parts)] } : none;
	},
};
