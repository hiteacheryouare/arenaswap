import { createDefaultUserPreferences } from '@arenaswap/core/constants';
import type { UserPreferences } from '@arenaswap/core/types';
import {
	loadStoredUserPreferences,
	loadStoredUserPreferencesWithPresence,
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

	/* Firefox without a Mozilla account, and Chrome once a profile trips its sync quota, both
	   reject the read outright rather than answering with nothing. Letting that take the whole load
	   down would hand the user a factory-reset popup — no leagues, no favourites, onboarding again. */
	test('falls back to the local copy when storage.sync cannot be read at all', async () => {
		jest.spyOn(console, 'warn').mockImplementation(() => {});
		const localPrefs: UserPreferences = {
			...createDefaultUserPreferences(),
			enabledLeagues: ['nhl'],
			favoriteTeamIds: ['nhl:15'],
			cooldownSeconds: 120,
		};
		setBrowserStorage({
			syncGet: jest.fn().mockRejectedValue(new Error('sync is disabled')),
			localGet: jest.fn().mockResolvedValue({ prefs: localPrefs, [prefsStorageUpdatedAtKey]: 5 }),
		});

		const { prefs, hasStored } = await loadStoredUserPreferencesWithPresence();

		expect(prefs.enabledLeagues).toEqual(['nhl']);
		expect(prefs.favoriteTeamIds).toEqual(['nhl:15']);
		expect(prefs.cooldownSeconds).toBe(120);
		expect(hasStored).toBe(true);
	});

	test('reports nothing stored when neither store has ever been written', async () => {
		setBrowserStorage({
			syncGet: jest.fn().mockResolvedValue({ prefs: null, [prefsStorageUpdatedAtKey]: 0 }),
			localGet: jest.fn().mockResolvedValue({ prefs: null, [prefsStorageUpdatedAtKey]: 0 }),
		});

		const { prefs, hasStored } = await loadStoredUserPreferencesWithPresence();

		expect(hasStored).toBe(false);
		expect(prefs).toEqual(createDefaultUserPreferences());
	});

	test('does not mistake a store it could not read for a first install', async () => {
		jest.spyOn(console, 'warn').mockImplementation(() => {});
		setBrowserStorage({
			syncGet: jest.fn().mockRejectedValue(new Error('sync is disabled')),
			localGet: jest.fn().mockResolvedValue({ prefs: createDefaultUserPreferences(), [prefsStorageUpdatedAtKey]: 1 }),
		});

		await expect(loadStoredUserPreferencesWithPresence()).resolves.toMatchObject({ hasStored: true });
	});

	/* What an upgrade looks like from here: a blob written by a version that had fewer settings in
	   it. The ones the user chose have to come through untouched and the ones they never saw have
	   to arrive at their defaults — a load that dropped either would silently undo their setup. */
	test('carries an older version settings across and defaults the ones it never knew about', async () => {
		const legacyPrefs = {
			enabled: true,
			enabledLeagues: ['nba', 'nhl'],
			sensitivity: 7,
			cooldownSeconds: 90,
			favoriteTeamIds: ['nba:20'],
		};
		setBrowserStorage({
			syncGet: jest.fn().mockResolvedValue({ prefs: legacyPrefs, [prefsStorageUpdatedAtKey]: 0 }),
			localGet: jest.fn().mockResolvedValue({ prefs: null, [prefsStorageUpdatedAtKey]: 0 }),
		});

		const prefs = await loadStoredUserPreferences();
		const defaults = createDefaultUserPreferences();

		expect(prefs.enabledLeagues).toEqual(['nba', 'nhl']);
		expect(prefs.sensitivity).toBe(7);
		expect(prefs.cooldownSeconds).toBe(90);
		expect(prefs.favoriteTeamIds).toEqual(['nba:20']);
		// Settings that did not exist in the stored blob.
		expect(prefs.standbyStreamEnabled).toBe(defaults.standbyStreamEnabled);
		expect(prefs.finishedTabAction).toBe(defaults.finishedTabAction);
		expect(prefs.upcomingGamesDays).toBe(defaults.upcomingGamesDays);
	});

	// A downgrade, a corrupted store, or a hand-edited profile. Sensitivity is the dial the switch
	// threshold is read from, so an out-of-range one landing in prefs would break switching outright.
	test('falls back to the default for a stored value the current version cannot use', async () => {
		setBrowserStorage({
			syncGet: jest.fn().mockResolvedValue({
				prefs: { ...createDefaultUserPreferences(), sensitivity: 42, finishedTabAction: 'detonate' },
				[prefsStorageUpdatedAtKey]: 1,
			}),
			localGet: jest.fn().mockResolvedValue({ prefs: null, [prefsStorageUpdatedAtKey]: 0 }),
		});

		const prefs = await loadStoredUserPreferences();
		const defaults = createDefaultUserPreferences();

		expect(prefs.sensitivity).toBe(defaults.sensitivity);
		expect(prefs.finishedTabAction).toBe(defaults.finishedTabAction);
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
