import { pollIntervalMs } from './constants';

export const computeRetryDelayMs = (
	consecutiveFailures: number,
	normalMs: number,
	jitterMs = 0,
	baseMs = pollIntervalMs,
): number => {
	const doublings = Math.max(0, consecutiveFailures - 1);
	return Math.min(normalMs, (baseMs * (2 ** doublings)) + jitterMs);
};
