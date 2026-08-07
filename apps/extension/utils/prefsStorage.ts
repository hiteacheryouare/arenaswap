import { normalizeUserPreferences } from '@arenaswap/core/constants';
import { logWarn } from '@arenaswap/core';
import type { UserPreferences } from '@arenaswap/core/types';

export const prefsStorageUpdatedAtKey = 'prefsUpdatedAt';

const normalizeTimestamp = (value: unknown): number => (
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
	// A tie (notably 0/0, neither copy timestamped) prefers sync: legacy prefs were sync-only.
	return localTimestamp > syncTimestamp ? localPrefs : syncPrefs;
};

export const loadStoredUserPreferences = async (): Promise<UserPreferences> => {
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

	return normalizeUserPreferences(pickNewestPrefs(
		syncResult.prefs,
		syncResult[prefsStorageUpdatedAtKey],
		localResult.prefs,
		localResult[prefsStorageUpdatedAtKey],
	));
};

export const hasStoredUserPreferences = async (): Promise<boolean> => {
	const [syncResult, localResult] = await Promise.all([
		browser.storage.sync.get({ prefs: null }).catch(() => ({ prefs: null })),
		browser.storage.local.get({ prefs: null }).catch(() => ({ prefs: null })),
	]);

	return syncResult.prefs !== null || localResult.prefs !== null;
};

export const persistStoredUserPreferences = async (prefs: UserPreferences): Promise<void> => {
	const normalized = normalizeUserPreferences(prefs);
	const prefsUpdatedAt = Date.now();
	const payload = { prefs: normalized, [prefsStorageUpdatedAtKey]: prefsUpdatedAt };

	// Caught per store so a quota or availability failure in one still lets the other write.
	await Promise.all([
		browser.storage.local.set(payload).catch(err => {
			logWarn('storage.local unavailable while saving prefs.', err);
		}),
		browser.storage.sync.set(payload).catch(err => {
			logWarn('storage.sync unavailable; prefs saved to storage.local only.', err);
		}),
	]);
};
