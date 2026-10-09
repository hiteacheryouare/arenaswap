import { pollIntervalMs } from './constants';

/* A failed poll retries at `baseMs`, then doubles for every failure in a row, and never waits
   longer than the league's own normal interval. The cap is what keeps a dormant league's slow
   cadence from being turned into a faster one by an outage, and what stops a live league being
   pushed past the interval it was already on. A normal interval shorter than `baseMs` wins
   outright: a retry is never slower than a healthy poll would have been, and never faster. */
export const computeRetryDelayMs = (
	consecutiveFailures: number,
	normalMs: number,
	jitterMs = 0,
	baseMs = pollIntervalMs,
): number => {
	const doublings = Math.max(0, consecutiveFailures - 1);
	return Math.min(normalMs, (baseMs * (2 ** doublings)) + jitterMs);
};
