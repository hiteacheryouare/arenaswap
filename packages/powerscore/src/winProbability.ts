import { scorerTunables, scoreWinProbVarianceMax } from './constants';
import { clamp } from './math';

// Despite the name, this measures mean absolute distance from 50%, not variance. Known limitation:
// a line oscillating between 10% and 90% scores the same penalty as a steady 90% blowout.
export const computeWinProbVarianceScore = (winProbHistory: readonly number[]): number | undefined => {
	const { maxAvgDist, minDataPoints } = scorerTunables.scores.winProbabilityVariance;
	// A single non-finite entry from a partial feed used to poison the average.
	const samples = winProbHistory.filter(p => typeof p === 'number' && Number.isFinite(p));
	if (samples.length < minDataPoints) return undefined;
	const avgDistFromMid = samples.reduce((total, p) => total + Math.abs(p - 0.5), 0) / samples.length;
	const raw = scoreWinProbVarianceMax - (avgDistFromMid / maxAvgDist) * 2 * scoreWinProbVarianceMax;
	return Math.round(clamp(raw, -scoreWinProbVarianceMax, scoreWinProbVarianceMax));
};
