import { pollDormantMinMs, pollHebetudinousMaxMs, pollIntervalMs } from '../src/constants';
import { computeRetryDelayMs } from '../src/pollBackoff';

const schedule = (normalMs: number, failures: number): number[] => (
	Array.from({ length: failures }, (_, index) => computeRetryDelayMs(index + 1, normalMs))
);

describe('computeRetryDelayMs', () => {
	test('doubles from the base retry on every consecutive failure', () => {
		expect(schedule(pollHebetudinousMaxMs, 6)).toEqual([15_000, 30_000, 60_000, 120_000, 240_000, 480_000]);
	});

	test('stops at the league\'s normal interval', () => {
		expect(schedule(pollDormantMinMs, 6)).toEqual([15_000, 30_000, 60_000, 120_000, 120_000, 120_000]);
		expect(computeRetryDelayMs(40, pollHebetudinousMaxMs)).toBe(pollHebetudinousMaxMs);
	});

	test('never retries faster than a healthy poll would have', () => {
		expect(schedule(12_000, 3)).toEqual([12_000, 12_000, 12_000]);
		expect(computeRetryDelayMs(1, 12_000)).toBeLessThan(pollIntervalMs);
	});

	test('keeps jitter on the way up and drops it at the cap', () => {
		expect(computeRetryDelayMs(2, pollDormantMinMs, -2_000)).toBe(28_000);
		expect(computeRetryDelayMs(2, pollDormantMinMs, 2_000)).toBe(32_000);
		expect(computeRetryDelayMs(9, pollDormantMinMs, -2_000)).toBe(pollDormantMinMs);
	});
});
