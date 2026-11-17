const prefix = 'ArenaSwap:';

// Jest sets NODE_ENV=test, so runs start quiet without every suite opting out — which matters
// because `jest.resetModules()` hands each test a fresh copy of this module.
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
