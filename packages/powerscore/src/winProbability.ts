import { scorerTunables, scoreWinProbVarianceMax } from './constants';
import { clamp } from './math';
import type { SportTypeConfig, WinProbabilityReading } from './types';

const minReadings = 3;
const movementReachHalfLives = 4;
const swingReachHalfLives = 3;
const swingHalfLifeMultiple = 2;
const maxStepPerPlay = 0.5;
const spikeJump = 0.15;
const spikeReturn = 0.05;

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const toReadings = (line: readonly WinProbabilityReading[] | readonly number[], nowProgress: number): WinProbabilityReading[] => {
	const bare = line.filter(isFiniteNumber);
	if (bare.length > 0) return bare.map((homeWinProbability, i) => ({ homeWinProbability, progress: (nowProgress * (i + 1)) / bare.length }));
	return (line as readonly WinProbabilityReading[]).filter(reading => (
		isFiniteNumber(reading?.homeWinProbability) && isFiniteNumber(reading?.progress)
	));
};

// A reading that jumps away and comes straight back is a corrected play, not a swing.
const despike = (probabilities: readonly number[]): number[] => probabilities.map((p, i) => {
	if (i === 0 || i === probabilities.length - 1) return p;
	const before = probabilities[i - 1]!;
	const after = probabilities[i + 1]!;
	return Math.abs(p - before) > spikeJump && Math.abs(after - before) < spikeReturn ? before : p;
});

export const computeWinProbVarianceScore = (
	line: readonly WinProbabilityReading[] | readonly number[],
	nowProgress?: number,
	sport?: Pick<SportTypeConfig, 'winProbabilityScales'>,
): number | undefined => {
	const tunables = scorerTunables.scores.winProbabilityVariance;
	const scales = sport?.winProbabilityScales ?? tunables.scales;
	const readings = toReadings(line, nowProgress ?? 1);
	if (readings.length < minReadings) return undefined;
	const now = Math.max(nowProgress ?? 0, readings[readings.length - 1]!.progress);
	if (now < tunables.halfLife) return undefined;

	const probabilities = despike(readings.map(reading => reading.homeWinProbability));
	const current = probabilities[probabilities.length - 1]!;
	let movement = 0;
	let swing = 0;
	let distanceSum = 0;
	let weightSum = 0;
	for (let k = probabilities.length - 1; k >= 1; k--) {
		const age = Math.max(0, now - readings[k]!.progress);
		if (age > movementReachHalfLives * tunables.halfLife) break;
		const weight = 0.5 ** (age / tunables.halfLife);
		distanceSum += weight * Math.abs(probabilities[k]! - 0.5);
		weightSum += weight;
		if (k >= 2) movement += weight * Math.min(Math.abs(probabilities[k]! - probabilities[k - 1]!), maxStepPerPlay);
		if (age <= swingReachHalfLives * tunables.halfLife) {
			swing = Math.max(swing, Math.abs(current - probabilities[k]!) * 0.5 ** (age / (swingHalfLifeMultiple * tunables.halfLife)));
		}
	}

	const blend = (1 - tunables.swingWeight) * Math.min(1, movement / scales.movementFullScale)
		+ tunables.swingWeight * Math.min(1, swing / scales.swingFullScale);
	const lead = Math.max(current, 1 - current);
	const stillOpen = clamp((tunables.decidedLead - lead) / (tunables.decidedLead - tunables.openLead), 0, 1);
	const swingBonus = blend >= scales.neutralBlend
		? scoreWinProbVarianceMax * ((blend - scales.neutralBlend) / (1 - scales.neutralBlend)) * stillOpen
		: 0;
	const averageDistance = weightSum > 0 ? distanceSum / weightSum : 0.5;
	const coinFlipBonus = scoreWinProbVarianceMax * clamp(1 - averageDistance / tunables.coinFlipZeroDistance, 0, 1);

	if (blend >= scales.neutralBlend || coinFlipBonus > 0) return Math.round(Math.max(swingBonus, coinFlipBonus)) + 0;
	if (now < tunables.penaltyFromProgress) return 0;
	return Math.round(-scoreWinProbVarianceMax * (1 - blend / scales.neutralBlend) * (1 - stillOpen)) + 0;
};
