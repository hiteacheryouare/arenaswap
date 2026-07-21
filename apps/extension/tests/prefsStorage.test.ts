import { createDefaultUserPreferences } from '@arenaswap/core/constants';
import type { UserPreferences } from '@arenaswap/core/types';
import {
	loadStoredUserPreferences,
	persistStoredUserPreferences,
	prefsStorageUpdatedAtKey,
} from '../utils/prefsStorage';

const setBrowserStorage = ({
	syncGet,
	syncSet = jest.fn().mockResolvedValue(undefined),
	localGet,
	localSet = jest.fn().mockResolvedValue(undefined),
}: {
	syncGet: jest.Mock;
	syncSet?: jest.Mock;
	localGet: jest.Mock;
	localSet?: jest.Mock;
}) => {
	(globalThis as { browser?: unknown }).browser = {
		storage: {
			sync: { get: syncGet, set: syncSet },
			local: { get: localGet, set: localSet },
		},
	};

	return { syncSet, localSet };
};

describe('prefs storage', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	test('loads the local prefs when they have the newest timestamp', async () => {
		const syncPrefs: UserPreferences = { ...createDefaultUserPreferences(), enabledLeagues: ['nba'] };
		const localPrefs: UserPreferences = { ...createDefaultUserPreferences(), enabledLeagues: ['nba', 'mlb'] };
		setBrowserStorage({
			syncGet: jest.fn().mockResolvedValue({ prefs: syncPrefs, [prefsStorageUpdatedAtKey]: 10 }),
			localGet: jest.fn().mockResolvedValue({ prefs: localPrefs, [prefsStorageUpdatedAtKey]: 20 }),
		});

		await expect(loadStoredUserPreferences()).resolves.toEqual(localPrefs);
	});

	test('keeps sync prefs as the legacy source when neither copy is timestamped', async () => {
		const syncPrefs: UserPreferences = { ...createDefaultUserPreferences(), enabledLeagues: ['nba'] };
		const localPrefs: UserPreferences = { ...createDefaultUserPreferences(), enabledLeagues: ['mlb'] };
		setBrowserStorage({
			syncGet: jest.fn().mockResolvedValue({ prefs: syncPrefs }),
			localGet: jest.fn().mockResolvedValue({ prefs: localPrefs }),
		});

		await expect(loadStoredUserPreferences()).resolves.toEqual(syncPrefs);
	});

	test('persists to local even when sync rejects', async () => {
		jest.spyOn(Date, 'now').mockReturnValue(1234);
		const prefs: UserPreferences = { ...createDefaultUserPreferences(), enabledLeagues: ['nba', 'mlb'] };
		const { syncSet, localSet } = setBrowserStorage({
			syncGet: jest.fn(),
			syncSet: jest.fn().mockRejectedValue(new Error('quota')),
			localGet: jest.fn(),
			localSet: jest.fn().mockResolvedValue(undefined),
		});

		await persistStoredUserPreferences(prefs);

		const payload = { prefs, [prefsStorageUpdatedAtKey]: 1234 };
		expect(localSet).toHaveBeenCalledWith(payload);
		expect(syncSet).toHaveBeenCalledWith(payload);
	});
});
