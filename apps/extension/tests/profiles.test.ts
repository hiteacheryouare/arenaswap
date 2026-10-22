import { createDefaultUserPreferences, normalizeUserPreferences } from '@arenaswap/core/constants';
import type { UserPreferences } from '@arenaswap/core/types';
import { loadFantasyRoster } from '../utils/fantasyRosterStorage';
import { loadStoredUserPreferences } from '../utils/prefsStorage';
import {
	createProfile,
	deleteProfile,
	followSyncedProfile,
	loadProfiles,
	loadProfileSetup,
	renameProfile,
	switchProfile,
	uniqueProfileName,
} from '../utils/profiles';

interface fakeBrowser {
	areas: Record<'sync' | 'local', Map<string, unknown>>;
	sent: { type: string; [key: string]: unknown }[];
}

const storageArea = (store: Map<string, unknown>) => ({
	get: async (defaults: Record<string, unknown>) => Object.fromEntries(
		Object.entries(defaults).map(([key, fallback]) => [key, store.has(key) ? structuredClone(store.get(key)) : fallback]),
	),
	set: async (values: Record<string, unknown>) => {
		Object.entries(values).forEach(([key, value]) => store.set(key, structuredClone(value)));
	},
});

const installBrowser = (): fakeBrowser => {
	const areas = { sync: new Map<string, unknown>(), local: new Map<string, unknown>() };
	const sent: fakeBrowser['sent'] = [];
	const localStorage = new Map<string, string>();
	Object.assign(globalThis, {
		browser: {
			storage: { sync: storageArea(areas.sync), local: storageArea(areas.local) },
			runtime: { sendMessage: async (message: fakeBrowser['sent'][number]) => { sent.push(message); } },
		},
		localStorage: {
			getItem: (key: string) => localStorage.get(key) ?? null,
			setItem: (key: string, value: string) => { localStorage.set(key, value); },
		},
	});
	return { areas, sent };
};

const prefsWith = (overrides: Partial<UserPreferences>): UserPreferences => normalizeUserPreferences({ ...createDefaultUserPreferences(), ...overrides });

const weekdayPrefs = prefsWith({ enabledLeagues: ['nba'], sensitivity: 2 });
const weekendPrefs = prefsWith({ enabledLeagues: ['nfl', 'nhl'], favoriteTeamIds: ['nfl:21'], scoringMode: 'fantasy' });
const roster = [{ league: 'nfl' as const, athleteId: '3139477', name: 'Patrick Mahomes', teamId: '12', position: 'QB' as const }];

// Both stores, the way the popup saves: whatever is in use right now.
const seedLive = (fake: fakeBrowser, prefs: UserPreferences, fantasyRoster: unknown[] = []) => {
	for (const area of [fake.areas.sync, fake.areas.local]) {
		area.set('prefs', prefs);
		area.set('prefsUpdatedAt', 1);
		area.set('fantasyRoster', fantasyRoster);
		area.set('fantasyRosterUpdatedAt', 1);
	}
};

describe('profiles', () => {
	afterEach(() => {
		delete (globalThis as { browser?: unknown }).browser;
		delete (globalThis as { localStorage?: unknown }).localStorage;
	});

	test('an existing setup is the main profile, with nothing set aside', async () => {
		const fake = installBrowser();
		seedLive(fake, weekdayPrefs);
		expect(await loadProfiles()).toEqual({ profiles: [{ id: 'main', name: 'main' }], activeId: 'main' });
		expect((await loadProfileSetup('main')).prefs).toEqual(weekdayPrefs);
	});

	test('a copy starts identical, and switching back and forth keeps each setup its own', async () => {
		const fake = installBrowser();
		seedLive(fake, weekdayPrefs);

		const created = await createProfile('Weekend');
		const weekend = created.profiles[1];
		expect(created.activeId).toBe(weekend.id);
		expect(await loadStoredUserPreferences()).toEqual(weekdayPrefs);

		// Edited while in use, the way the popup saves a setting.
		seedLive(fake, weekendPrefs, roster);
		await switchProfile('main');
		expect(await loadStoredUserPreferences()).toEqual(weekdayPrefs);
		expect(await loadFantasyRoster()).toEqual([]);
		expect(fake.areas.sync.get('activeProfile')).toEqual({ id: 'main', name: 'main' });

		await switchProfile(weekend.id);
		expect(await loadStoredUserPreferences()).toEqual(weekendPrefs);
		expect(await loadFantasyRoster()).toEqual(roster);
		expect(fake.sent.at(-1)).toEqual({ type: 'UPDATE_PREFS', prefs: weekendPrefs });
	});

	test('a fresh profile takes the setup it is given', async () => {
		const fake = installBrowser();
		seedLive(fake, weekdayPrefs, roster);
		await createProfile('Blank', { prefs: createDefaultUserPreferences(), fantasyRoster: [] });
		expect((await loadStoredUserPreferences()).enabledLeagues).toEqual([]);
		expect(await loadFantasyRoster()).toEqual([]);
		expect((await loadProfileSetup('main')).fantasyRoster).toEqual(roster);
	});

	test('names stay unique, ignoring case', async () => {
		const fake = installBrowser();
		seedLive(fake, weekdayPrefs);
		const { profiles } = await createProfile('MAIN');
		expect(profiles.map(profile => profile.name)).toEqual(['main', 'MAIN 2']);
		expect(uniqueProfileName('x'.repeat(40), [{ id: 'a', name: 'x'.repeat(40) }])).toBe(`${'x'.repeat(38)} 2`);
	});

	test('renaming the profile in use renames it everywhere it syncs', async () => {
		const fake = installBrowser();
		seedLive(fake, weekdayPrefs);
		await renameProfile('main', '  Weeknights  ');
		expect((await loadProfiles()).profiles).toEqual([{ id: 'main', name: 'Weeknights' }]);
		expect(fake.areas.sync.get('activeProfile')).toEqual({ id: 'main', name: 'Weeknights' });
	});

	test('only a profile not in use can be deleted', async () => {
		const fake = installBrowser();
		seedLive(fake, weekdayPrefs);
		const { activeId } = await createProfile('Weekend');
		expect((await deleteProfile(activeId)).profiles).toHaveLength(2);

		const { profiles } = await deleteProfile('main');
		expect(profiles.map(profile => profile.name)).toEqual(['Weekend']);
		expect(fake.areas.local.get('profileSetups')).toEqual({});
	});

	test('follows a switch made in another browser, setting its own profile aside first', async () => {
		const desktop = installBrowser();
		seedLive(desktop, weekdayPrefs);
		// The laptop switched to Weekend: its setup and name arrive through sync.
		desktop.areas.sync.set('prefs', weekendPrefs);
		desktop.areas.sync.set('prefsUpdatedAt', 0);
		desktop.areas.sync.set('fantasyRoster', roster);
		desktop.areas.sync.set('activeProfile', { id: 'w1', name: 'Weekend' });

		expect(await followSyncedProfile()).toEqual({
			profiles: [{ id: 'main', name: 'main' }, { id: 'w1', name: 'Weekend' }],
			activeId: 'w1',
		});
		// The synced copy wins even though its clock reads older.
		expect(await loadStoredUserPreferences()).toEqual(weekendPrefs);
		expect(await loadFantasyRoster()).toEqual(roster);
		expect((await loadProfileSetup('main')).prefs).toEqual(weekdayPrefs);
		expect(await followSyncedProfile()).toEqual(await loadProfiles());
	});

	// Laptop edits main, then switches to Weekend. The desktop never saw that edit, so the main it sets
	// aside is older, and switching back to it there must not overwrite the laptop's newer copy.
	test('a stale copy of a profile loses to the newer one set aside in another browser', async () => {
		const laptop = installBrowser();
		seedLive(laptop, weekdayPrefs);
		laptop.areas.local.set('prefsUpdatedAt', 50);
		laptop.areas.sync.set('prefsUpdatedAt', 50);
		const { activeId: weekendId } = await createProfile('Weekend', { prefs: weekendPrefs, fantasyRoster: [] });
		expect(laptop.areas.local.get('profileSetups')).toHaveProperty(['main', 'updatedAt'], 50);

		// The desktop's main arrives through sync with the older time it was last edited.
		laptop.areas.sync.set('prefs', prefsWith({ enabledLeagues: ['mlb'] }));
		laptop.areas.sync.set('prefsUpdatedAt', 10);
		laptop.areas.sync.set('fantasyRosterUpdatedAt', 10);
		laptop.areas.sync.set('activeProfile', { id: 'main', name: 'main' });

		expect((await followSyncedProfile()).activeId).toBe('main');
		expect(await loadStoredUserPreferences()).toEqual(weekdayPrefs);
		expect(laptop.areas.sync.get('prefs')).toEqual(weekdayPrefs);
		expect((await loadProfileSetup(weekendId)).prefs).toEqual(weekendPrefs);
	});

	test('a switch whose sync write failed is not undone by the next follow', async () => {
		const fake = installBrowser();
		seedLive(fake, weekdayPrefs);
		fake.areas.sync.set('activeProfile', { id: 'main', name: 'main' });
		const { activeId } = await createProfile('Weekend', { prefs: weekendPrefs, fantasyRoster: [] });
		await switchProfile('main');
		const sync = (globalThis as unknown as { browser: { storage: { sync: { set: unknown } } } }).browser.storage.sync;
		sync.set = async () => { throw new Error('MAX_WRITE_OPERATIONS_PER_MINUTE'); };

		await switchProfile(activeId);
		expect(fake.areas.sync.get('activeProfile')).toEqual({ id: 'main', name: 'main' });
		expect((await followSyncedProfile()).activeId).toBe(activeId);
		expect(await loadStoredUserPreferences()).toEqual(weekendPrefs);
	});

	test('a new browser joins the profile in use without inventing an empty main', async () => {
		const fake = installBrowser();
		fake.areas.sync.set('prefs', weekendPrefs);
		fake.areas.sync.set('activeProfile', { id: 'w1', name: 'Weekend' });
		expect(await followSyncedProfile()).toEqual({ profiles: [{ id: 'w1', name: 'Weekend' }], activeId: 'w1' });
	});

	test('picks up a rename made in another browser', async () => {
		const fake = installBrowser();
		seedLive(fake, weekdayPrefs);
		fake.areas.sync.set('activeProfile', { id: 'main', name: 'Weeknights' });
		expect((await followSyncedProfile()).profiles).toEqual([{ id: 'main', name: 'Weeknights' }]);
		expect(await loadStoredUserPreferences()).toEqual(weekdayPrefs);
	});
});
