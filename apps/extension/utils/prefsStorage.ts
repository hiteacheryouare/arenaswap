import { normalizeUserPreferences } from '@arenaswap/core/constants';
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
	return localTimestamp > syncTimestamp ? localPrefs : syncPrefs;
};

export const loadStoredUserPreferences = async (): Promise<UserPreferences> => {
	const [syncResult, localResult] = await Promise.all([
		browser.storage.sync.get({ prefs: null, [prefsStorageUpdatedAtKey]: 0 }).catch(err => {
			console.warn('ArenaSwap: storage.sync unavailable while loading prefs.', err);
			return { prefs: null, [prefsStorageUpdatedAtKey]: 0 };
		}),
		browser.storage.local.get({ prefs: null, [prefsStorageUpdatedAtKey]: 0 }).catch(err => {
			console.warn('ArenaSwap: storage.local unavailable while loading prefs.', err);
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

	await browser.storage.local.set(payload);
	await browser.storage.sync.set(payload).catch(err => {
		console.warn('ArenaSwap: storage.sync unavailable, prefs saved to storage.local only.', err);
	});
};
