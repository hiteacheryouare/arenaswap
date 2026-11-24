import { normalizeUserPreferences } from '@arenaswap/core/constants';
import { logWarn } from '@arenaswap/core';
import type { ExtensionMessage, UserPreferences } from '@arenaswap/core/types';

export const prefsStorageUpdatedAtKey = 'prefsUpdatedAt';

export const normalizeTimestamp = (value: unknown): number => (
	typeof value === 'number' && Number.isFinite(value) ? value : 0
);

const pickNewestPrefs = (
	syncPrefs: unknown,
	syncUpdatedAt: unknown,
	localPrefs: unknown,
	localUpdatedAt: unknown,
): unknown => {
	const hasSyncPrefs = syncPrefs !== null && syncPrefs !== undefined;
	const hasLocalPrefs = localPrefs !== null && localPrefs !== undefined;
	if (!hasSyncPrefs) return localPrefs;
	if (!hasLocalPrefs) return syncPrefs;

	const syncTimestamp = normalizeTimestamp(syncUpdatedAt);
	const localTimestamp = normalizeTimestamp(localUpdatedAt);
	return localTimestamp > syncTimestamp ? localPrefs : syncPrefs;
};

interface storedUserPreferencesResult {
	prefs: UserPreferences;
	hasStored: boolean;
}

export const loadStoredUserPreferencesWithPresence = async (): Promise<storedUserPreferencesResult> => {
	const [syncResult, localResult] = await Promise.all([
		browser.storage.sync.get({ prefs: null, [prefsStorageUpdatedAtKey]: 0 }).catch(err => {
			logWarn('storage.sync unavailable while loading prefs.', err);
			return { prefs: null, [prefsStorageUpdatedAtKey]: 0 };
		}),
		browser.storage.local.get({ prefs: null, [prefsStorageUpdatedAtKey]: 0 }).catch(err => {
			logWarn('storage.local unavailable while loading prefs.', err);
			return { prefs: null, [prefsStorageUpdatedAtKey]: 0 };
		}),
	]);

	return {
		prefs: normalizeUserPreferences(pickNewestPrefs(
			syncResult.prefs,
			syncResult[prefsStorageUpdatedAtKey],
			localResult.prefs,
			localResult[prefsStorageUpdatedAtKey],
		)),
		hasStored: syncResult.prefs !== null || localResult.prefs !== null,
	};
};

export const loadStoredUserPreferences = async (): Promise<UserPreferences> => (
	(await loadStoredUserPreferencesWithPresence()).prefs
);

export const prefsPayload = (prefs: UserPreferences, now = Date.now()) => ({
	prefs: normalizeUserPreferences(prefs),
	[prefsStorageUpdatedAtKey]: now,
});

export const persistStoredUserPreferences = async (prefs: UserPreferences): Promise<void> => {
	const payload = prefsPayload(prefs);

	await Promise.all([
		browser.storage.local.set(payload).catch(err => {
			logWarn('storage.local unavailable while saving prefs.', err);
		}),
		browser.storage.sync.set(payload).catch(err => {
			logWarn('storage.sync unavailable; prefs saved to storage.local only.', err);
		}),
	]);
};

export const saveUserPrefs = async (prefs: UserPreferences): Promise<void> => {
	await persistStoredUserPreferences(prefs);
	await browser.runtime.sendMessage({ type: 'UPDATE_PREFS', prefs } satisfies ExtensionMessage);
};
