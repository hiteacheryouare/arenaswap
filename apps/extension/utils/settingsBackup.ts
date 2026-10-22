import { normalizeUserPreferences } from '@arenaswap/core/constants';
import { normalizeFantasyRoster } from '@arenaswap/core';
import type { FantasyRosterEntry } from '@arenaswap/core';
import type { UserPreferences } from '@arenaswap/core/types';
import { breakdownFoldsKey, type breakdownSectionId } from './breakdownFolds';
import { isDemoSeason, type demoSeason } from './holidayDecorations';
import {
	createProfile,
	defaultProfileName,
	loadProfiles,
	loadProfileSetup,
	normalizeProfileName,
	replaceActiveProfile,
	type profileList,
} from './profiles';

export const settingsFileFormat = 'arenaswap-settings';
export const settingsFileVersion = 1;

const breakdownSections: readonly breakdownSectionId[] = ['signals', 'general', 'sport'];

export interface deviceSettings {
	onboardingCompleted: boolean;
	standbyOnboardingDone: boolean;
	demoMode: boolean;
	demoSeason: demoSeason;
	breakdownCollapsed: breakdownSectionId[];
}

export interface settingsProfile {
	name: string;
	prefs: UserPreferences;
	fantasyRoster: FantasyRosterEntry[];
	device: deviceSettings;
}

export interface settingsFile {
	format: typeof settingsFileFormat;
	version: number;
	exportedAt: string;
	extensionVersion: string;
	profile: settingsProfile;
}

export type settingsFileProblem = 'unreadable' | 'notOurs' | 'tooNew';

export type parsedSettingsFile =
	| { ok: true; file: settingsFile }
	| { ok: false; problem: settingsFileProblem };

const isRecord = (value: unknown): value is Record<string, unknown> => (
	typeof value === 'object' && value !== null && !Array.isArray(value)
);

const normalizeBreakdownCollapsed = (value: unknown): breakdownSectionId[] => (
	Array.isArray(value) ? breakdownSections.filter(section => value.includes(section)) : []
);

const normalizeDeviceSettings = (value: unknown): deviceSettings => {
	const device = isRecord(value) ? value : {};
	return {
		onboardingCompleted: device.onboardingCompleted === true,
		standbyOnboardingDone: device.standbyOnboardingDone === true,
		demoMode: device.demoMode === true,
		demoSeason: isDemoSeason(device.demoSeason) ? device.demoSeason : 'real',
		breakdownCollapsed: normalizeBreakdownCollapsed(device.breakdownCollapsed),
	};
};

export const normalizeSettingsProfile = (value: unknown): settingsProfile => {
	const profile = isRecord(value) ? value : {};
	return {
		name: normalizeProfileName(profile.name) || defaultProfileName,
		prefs: normalizeUserPreferences(profile.prefs),
		fantasyRoster: normalizeFantasyRoster(profile.fantasyRoster),
		device: normalizeDeviceSettings(profile.device),
	};
};

export const parseSettingsFile = (text: string): parsedSettingsFile => {
	let raw: unknown;
	try {
		raw = JSON.parse(text);
	} catch {
		return { ok: false, problem: 'unreadable' };
	}
	if (!isRecord(raw) || raw.format !== settingsFileFormat || !isRecord(raw.profile)) return { ok: false, problem: 'notOurs' };
	const version = typeof raw.version === 'number' && Number.isFinite(raw.version) ? raw.version : 0;
	if (version > settingsFileVersion) return { ok: false, problem: 'tooNew' };
	// Every field would normalize to its default, so a file missing its settings would quietly reset them all.
	if (!isRecord(raw.profile.prefs) || !Array.isArray(raw.profile.fantasyRoster)) return { ok: false, problem: 'notOurs' };

	return {
		ok: true,
		file: {
			format: settingsFileFormat,
			version,
			exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : '',
			extensionVersion: typeof raw.extensionVersion === 'string' ? raw.extensionVersion : '',
			profile: normalizeSettingsProfile(raw.profile),
		},
	};
};

const readLocalJson = (key: string): unknown => {
	try {
		return JSON.parse(globalThis.localStorage?.getItem(key) ?? 'null');
	} catch {
		return null;
	}
};

// Device settings stay with the browser, so every profile exports this browser's.
export const loadSettingsProfile = async (profileId?: string): Promise<settingsProfile> => {
	const { profiles, activeId } = await loadProfiles();
	const entry = profiles.find(profile => profile.id === (profileId ?? activeId)) ?? profiles.find(profile => profile.id === activeId);
	const [setup, local] = await Promise.all([
		loadProfileSetup(entry?.id ?? activeId),
		browser.storage.local.get({ onboardingCompleted: null, standbyOnboardingDone: false, demoMode: false, demoSeason: 'real' }),
	]);
	return {
		name: entry?.name ?? defaultProfileName,
		...setup,
		device: normalizeDeviceSettings({ ...local, breakdownCollapsed: readLocalJson(breakdownFoldsKey) }),
	};
};

export const createSettingsFile = (profile: settingsProfile, now: Date, extensionVersion: string): settingsFile => ({
	format: settingsFileFormat,
	version: settingsFileVersion,
	exportedAt: now.toISOString(),
	extensionVersion,
	profile,
});

const fileNameSlug = (name: string): string => (
	name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || defaultProfileName
);

const localDateStamp = (now: Date): string => [
	now.getFullYear(),
	String(now.getMonth() + 1).padStart(2, '0'),
	String(now.getDate()).padStart(2, '0'),
].join('-');

export const settingsFileName = (profileName: string, now: Date): string => (
	`arenaswap-settings-${fileNameSlug(profileName)}-${localDateStamp(now)}.json`
);

// Runs from the backup tab, never the popup: a Save As dialog closes a Firefox popup, and the blob
// URL dies with the document that made it. The revoke waits for the download to read the blob.
export const downloadSettingsFile = async (profileId?: string, now = new Date()): Promise<void> => {
	const profile = await loadSettingsProfile(profileId);
	const file = createSettingsFile(profile, now, browser.runtime.getManifest().version);
	const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, '\t')], { type: 'application/json' }));
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = settingsFileName(profile.name, now);
	anchor.click();
	setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

export type backupSection = 'import' | 'export';

// A tab rather than the popup: Firefox closes the popup the moment a file dialog opens.
export const openBackupTab = (section?: backupSection, profileId?: string) => {
	const hash = section ? `#${section}${profileId ? `=${encodeURIComponent(profileId)}` : ''}` : '';
	void browser.tabs.create({ url: browser.runtime.getURL(`/settingsBackup.html${hash}`) });
};

export const readBackupHash = (hash: string): { section: string; profileId?: string } => {
	const [section = '', profileId] = hash.replace(/^#/, '').split('=');
	return { section, profileId: profileId ? decodeURIComponent(profileId) : undefined };
};

// The popup is shut while this runs in its own tab, so the background hears about the new prefs
// from the profile write. Demo mode is the background's to store, as it is for the popup's own
// toggle, and only goes out when it changes: the message restarts the simulator.
export const applySettingsProfile = async (profile: settingsProfile): Promise<profileList> => {
	const { prefs, fantasyRoster, device } = profile;
	const { demoMode: wasDemoMode } = await browser.storage.local.get({ demoMode: false });

	const list = await replaceActiveProfile(profile.name, { prefs, fantasyRoster });
	await browser.storage.local.set({
		onboardingCompleted: device.onboardingCompleted,
		standbyOnboardingDone: device.standbyOnboardingDone,
		demoSeason: device.demoSeason,
	});
	globalThis.localStorage?.setItem(breakdownFoldsKey, JSON.stringify(device.breakdownCollapsed));
	if (wasDemoMode !== device.demoMode) await browser.runtime.sendMessage({ type: 'SET_DEMO_MODE', enabled: device.demoMode }).catch(() => {});
	return list;
};

// A file added beside the others brings only its setup; this browser's own device settings stay.
export const addSettingsProfile = (profile: settingsProfile): Promise<profileList> => (
	createProfile(profile.name, { prefs: profile.prefs, fantasyRoster: profile.fantasyRoster })
);
