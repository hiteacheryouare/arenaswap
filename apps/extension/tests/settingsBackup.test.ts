import { createDefaultUserPreferences, normalizeUserPreferences } from '@arenaswap/core/constants';
import type { UserPreferences } from '@arenaswap/core/types';
import { loadFantasyRoster } from '../utils/fantasyRosterStorage';
import { loadStoredUserPreferences } from '../utils/prefsStorage';
import { createProfile, loadProfiles, loadProfileSetup } from '../utils/profiles';
import {
	addSettingsProfile,
	applySettingsProfile,
	createSettingsFile,
	loadSettingsProfile,
	parseSettingsFile,
	settingsFileName,
	settingsFileVersion,
} from '../utils/settingsBackup';

interface fakeBrowser {
	areas: Record<'sync' | 'local', Map<string, unknown>>;
	localStorage: Map<string, string>;
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
	const localStorage = new Map<string, string>();
	const sent: fakeBrowser['sent'] = [];
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
	return { areas, localStorage, sent };
};

const tunedPrefs = (): UserPreferences => normalizeUserPreferences({
	...createDefaultUserPreferences(),
	enabledLeagues: ['nba', 'nfl'],
	favoriteTeamIds: ['nba:20', 'nfl:21'],
	sensitivity: 2,
	scoringMode: 'fantasy',
	theme: 'light',
	openRevealEnabled: false,
});

const truncated = (profile: Record<string, unknown>) => JSON.stringify({ format: 'arenaswap-settings', version: 1, profile });

const roster = [{ league: 'nfl' as const, athleteId: '3139477', name: 'Patrick Mahomes', teamId: '12', position: 'QB' }];

describe('settings backup', () => {
	afterEach(() => {
		delete (globalThis as { browser?: unknown }).browser;
		delete (globalThis as { localStorage?: unknown }).localStorage;
	});

	test('a setup exported from one browser arrives whole in a fresh one', async () => {
		const laptop = installBrowser();
		const prefs = tunedPrefs();
		laptop.areas.sync.set('prefs', prefs);
		laptop.areas.sync.set('fantasyRoster', roster);
		laptop.areas.local.set('onboardingCompleted', true);
		laptop.areas.local.set('demoMode', true);
		laptop.areas.local.set('demoSeason', 'december');
		laptop.localStorage.set('arenaswap.breakdownCollapsed', JSON.stringify(['sport', 'signals']));

		const exported = JSON.stringify(createSettingsFile(await loadSettingsProfile(), new Date('2026-10-21T19:04:00Z'), '3.0.0'));

		const desktop = installBrowser();
		const parsed = parseSettingsFile(exported);
		if (!parsed.ok) throw new Error(`parse failed: ${parsed.problem}`);
		await applySettingsProfile(parsed.file.profile);

		expect(await loadStoredUserPreferences()).toEqual(prefs);
		expect(desktop.areas.sync.get('prefs')).toEqual(prefs);
		expect(await loadFantasyRoster()).toEqual(roster);
		expect(desktop.areas.local.get('onboardingCompleted')).toBe(true);
		expect(desktop.areas.local.get('demoSeason')).toBe('december');
		expect(JSON.parse(desktop.localStorage.get('arenaswap.breakdownCollapsed') ?? '[]')).toEqual(['signals', 'sport']);
		expect(desktop.localStorage.get('arenaswap.theme')).toBe('light');
		expect(desktop.localStorage.get('arenaswap.openRevealEnabled')).toBe('off');
		expect(desktop.sent).toEqual([
			{ type: 'UPDATE_PREFS', prefs },
			{ type: 'SET_DEMO_MODE', enabled: true },
		]);
	});

	test('leaves the demo simulator alone when the file agrees with this browser', async () => {
		const browser = installBrowser();
		browser.areas.local.set('demoMode', false);
		const profile = await loadSettingsProfile();
		await applySettingsProfile(profile);
		expect(browser.sent.map(message => message.type)).toEqual(['UPDATE_PREFS']);
	});

	test('a replaced profile takes the file\'s name, and an added one sits beside the rest', async () => {
		const fake = installBrowser();
		fake.areas.local.set('demoMode', false);
		const file = { ...(await loadSettingsProfile()), name: 'Weekend', prefs: tunedPrefs(), fantasyRoster: roster };

		await applySettingsProfile(file);
		expect((await loadProfiles()).profiles).toEqual([{ id: 'main', name: 'Weekend' }]);
		expect(fake.areas.sync.get('activeProfile')).toEqual({ id: 'main', name: 'Weekend' });

		const added = await addSettingsProfile({ ...file, prefs: createDefaultUserPreferences(), fantasyRoster: [] });
		expect(added.profiles.map(profile => profile.name)).toEqual(['Weekend', 'Weekend 2']);
		expect(added.activeId).not.toBe('main');
		expect((await loadProfileSetup('main')).prefs).toEqual(tunedPrefs());
		expect(await loadFantasyRoster()).toEqual([]);
	});

	test('exports any profile, with this browser\'s device settings', async () => {
		const fake = installBrowser();
		fake.areas.local.set('onboardingCompleted', true);
		fake.areas.sync.set('prefs', tunedPrefs());
		const { activeId } = await createProfile('Weekend', { prefs: createDefaultUserPreferences(), fantasyRoster: [] });
		const main = await loadSettingsProfile('main');
		expect(main.name).toBe('main');
		expect(main.prefs).toEqual(tunedPrefs());
		expect(main.device.onboardingCompleted).toBe(true);
		expect((await loadSettingsProfile()).name).toBe('Weekend');
		expect((await loadSettingsProfile(activeId)).prefs.enabledLeagues).toEqual([]);
	});

	test('says why a file was turned away', () => {
		expect(parseSettingsFile('{"format": "arenaswap-se')).toEqual({ ok: false, problem: 'unreadable' });
		expect(parseSettingsFile('{"bookmarks": []}')).toEqual({ ok: false, problem: 'notOurs' });
		expect(parseSettingsFile(JSON.stringify({ format: 'arenaswap-settings' }))).toEqual({ ok: false, problem: 'notOurs' });
		expect(parseSettingsFile(JSON.stringify({ format: 'arenaswap-settings', version: settingsFileVersion + 1, profile: {} })))
			.toEqual({ ok: false, problem: 'tooNew' });
	});

	// Every field normalizes to its default, so accepting this would quietly reset someone's whole setup.
	test('refuses a file with the settings cut out of it', () => {
		expect(parseSettingsFile(truncated({ name: 'main' }))).toEqual({ ok: false, problem: 'notOurs' });
		expect(parseSettingsFile(truncated({ prefs: createDefaultUserPreferences() }))).toEqual({ ok: false, problem: 'notOurs' });
		expect(parseSettingsFile(truncated({ prefs: createDefaultUserPreferences(), fantasyRoster: [] })).ok).toBe(true);
	});

	test('a hand-edited file is cleaned up rather than trusted', () => {
		const parsed = parseSettingsFile(JSON.stringify({
			format: 'arenaswap-settings',
			version: 1,
			profile: {
				name: '   ',
				prefs: { sensitivity: 9000, enabledLeagues: ['nba', 'not-a-league'], theme: 'neon' },
				fantasyRoster: [{ name: 'everyone' }],
				device: { onboardingCompleted: 'yes', demoSeason: 'halloween', breakdownCollapsed: ['sport', 'sport', 'secrets'] },
			},
		}));
		if (!parsed.ok) throw new Error(`parse failed: ${parsed.problem}`);
		const { profile } = parsed.file;
		expect(profile.name).toBe('main');
		expect(profile.prefs.sensitivity).toBeLessThanOrEqual(5);
		expect(profile.prefs.enabledLeagues).toEqual(['nba']);
		expect(profile.prefs.theme).toBe(createDefaultUserPreferences().theme);
		expect(profile.fantasyRoster).toEqual([]);
		expect(profile.device).toEqual({ onboardingCompleted: false, standbyOnboardingDone: false, demoMode: false, demoSeason: 'real', breakdownCollapsed: ['sport'] });
	});

	test('names the file after the profile and the day it was made', () => {
		const day = new Date(2026, 9, 21, 23, 30);
		expect(settingsFileName('main', day)).toBe('arenaswap-settings-main-2026-10-21.json');
		expect(settingsFileName('College Saturday!', day)).toBe('arenaswap-settings-college-saturday-2026-10-21.json');
		expect(settingsFileName('サッカー', day)).toBe('arenaswap-settings-サッカー-2026-10-21.json');
		expect(settingsFileName('!!!', day)).toBe('arenaswap-settings-main-2026-10-21.json');
	});
});
