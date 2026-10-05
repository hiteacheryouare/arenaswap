import { fantasyRosterStorageKey, logWarn, normalizeFantasyRoster } from '@arenaswap/core';
import type { FantasyRosterEntry } from '@arenaswap/core';

// The roster lives under its own key, beside prefs rather than inside them, so a full roster can't
// push the prefs item past sync storage's per-item limit. Saved to both stores; the newer wins.
const updatedAtKey = `${fantasyRosterStorageKey}UpdatedAt`;

export const loadFantasyRoster = async (): Promise<FantasyRosterEntry[]> => {
	const empty = { [fantasyRosterStorageKey]: null, [updatedAtKey]: 0 };
	const [sync, local] = await Promise.all([
		browser.storage.sync.get(empty).catch(() => empty),
		browser.storage.local.get(empty).catch(() => empty),
	]);
	const newer = Number(local[updatedAtKey]) > Number(sync[updatedAtKey]) ? local : sync;
	return normalizeFantasyRoster(newer[fantasyRosterStorageKey] ?? local[fantasyRosterStorageKey]);
};

export const saveFantasyRoster = async (roster: FantasyRosterEntry[]): Promise<void> => {
	const value = { [fantasyRosterStorageKey]: normalizeFantasyRoster(roster), [updatedAtKey]: Date.now() };
	await Promise.all([
		browser.storage.sync.set(value).catch(err => logWarn('Could not sync the fantasy roster.', err)),
		browser.storage.local.set(value),
	]);
};

export const isFantasyRosterChange = (changes: Record<string, unknown>): boolean => fantasyRosterStorageKey in changes;
