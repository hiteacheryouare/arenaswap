import { scorerTunables, scoreWinProbVarianceMax } from './constants';
import { clamp } from './math';

export const computeWinProbVarianceScore = (winProbHistory: readonly number[]): number | undefined => {
	const { maxAvgDist, minDataPoints } = scorerTunables.scores.winProbabilityVariance;
	const samples = winProbHistory.filter(p => typeof p === 'number' && Number.isFinite(p));
	if (samples.length < minDataPoints) return undefined;
	const avgDistFromMid = samples.reduce((total, p) => total + Math.abs(p - 0.5), 0) / samples.length;
	const raw = scoreWinProbVarianceMax - (avgDistFromMid / maxAvgDist) * 2 * scoreWinProbVarianceMax;
	return Math.round(clamp(raw, -scoreWinProbVarianceMax, scoreWinProbVarianceMax));
};
