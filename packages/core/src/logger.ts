/**
 * One funnel for diagnostics.
 *
 * A bare `catch {}` is invisible: when someone reports that ArenaSwap "just stopped switching"
 * there is nothing in the console to tell a network blip from a schema change from a storage
 * quota error. Every swallowed failure routes through here instead, so the policy for what
 * reaches the console lives in one place rather than in a dozen catch blocks.
 *
 * Left on by default — a warning in a user's console is what makes a bug report actionable.
 * Call `setVerboseLogging(false)` to silence it (tests do this in their setup files).
 */

const prefix = 'ArenaSwap:';

// Jest sets NODE_ENV=test, so test runs start quiet without every suite having to opt out — which
// matters because `jest.resetModules()` hands each test a fresh copy of this module. In a browser
// bundle there is no `process`, so the default is on.
const isTestEnv = (): boolean => (
	(globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.NODE_ENV === 'test'
);

let verbose = !isTestEnv();

export const setVerboseLogging = (value: boolean): void => {
	verbose = value;
};

export const isVerboseLogging = (): boolean => verbose;

/* eslint-disable no-console -- this module is the one place console is the intended output */

export const logWarn = (message: string, err?: unknown): void => {
	if (!verbose) return;
	if (err === undefined) console.warn(prefix, message);
	else console.warn(prefix, message, err);
};

export const logError = (message: string, err?: unknown): void => {
	if (!verbose) return;
	if (err === undefined) console.error(prefix, message);
	else console.error(prefix, message, err);
};
