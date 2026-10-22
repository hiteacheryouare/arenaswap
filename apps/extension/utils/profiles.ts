import { normalizeUserPreferences } from '@arenaswap/core/constants';
import { fantasyRosterStorageKey, logWarn, normalizeFantasyRoster } from '@arenaswap/core';
import type { FantasyRosterEntry } from '@arenaswap/core';
import type { UserPreferences } from '@arenaswap/core/types';
import { writeOpenRevealEnabled } from '../entrypoints/popup/cardReveal';
import { loadFantasyRoster, rosterPayload } from './fantasyRosterStorage';
import { loadStoredUserPreferences, prefsPayload, prefsStorageUpdatedAtKey } from './prefsStorage';
import { themeStorageKey } from './theme';

export const defaultProfileId = 'main';
export const defaultProfileName = 'main';
export const profileNameLimit = 40;
export const activeProfileSyncKey = 'activeProfile';

const profilesKey = 'profiles';
const activeProfileIdKey = 'activeProfileId';
const profileSetupsKey = 'profileSetups';
const syncedSeenKey = 'activeProfileSeen';
const rosterUpdatedAtKey = `${fantasyRosterStorageKey}UpdatedAt`;

export interface profileEntry {
	id: string;
	name: string;
}

export interface profileSetup {
	prefs: UserPreferences;
	fantasyRoster: FantasyRosterEntry[];
}

export interface profileList {
	profiles: profileEntry[];
	activeId: string;
}

interface storedSetup extends profileSetup {
	updatedAt: number;
}

// The profile in use is the live prefs and roster every other part of the extension reads, so only
// the ones set aside are kept here.
interface profilesState extends profileList {
	setups: Record<string, unknown>;
	seen: string | null;
	localLive: { prefs: unknown; fantasyRoster: unknown; updatedAt: number } | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
	typeof value === 'object' && value !== null && !Array.isArray(value)
);

export const normalizeProfileName = (value: unknown): string => (
	typeof value === 'string' ? value.trim().slice(0, profileNameLimit) : ''
);

const normalizeEntry = (value: unknown): profileEntry | null => {
	if (!isRecord(value) || typeof value.id !== 'string' || !value.id) return null;
	return { id: value.id, name: normalizeProfileName(value.name) || defaultProfileName };
};

const normalizeEntries = (value: unknown): profileEntry[] => {
	const seen = new Set<string>();
	return (Array.isArray(value) ? value : []).flatMap(item => {
		const entry = normalizeEntry(item);
		if (!entry || seen.has(entry.id)) return [];
		seen.add(entry.id);
		return [entry];
	});
};

const normalizeSetup = (value: unknown): profileSetup => {
	const setup = isRecord(value) ? value : {};
	return { prefs: normalizeUserPreferences(setup.prefs), fantasyRoster: normalizeFantasyRoster(setup.fantasyRoster) };
};

const sameName = (a: string, b: string) => a.toLocaleLowerCase() === b.toLocaleLowerCase();

export const isProfileNameTaken = (name: string, profiles: readonly profileEntry[], exceptId?: string): boolean => (
	profiles.some(entry => entry.id !== exceptId && sameName(entry.name, normalizeProfileName(name)))
);

export const uniqueProfileName = (name: string, profiles: readonly profileEntry[], exceptId?: string): string => {
	const base = normalizeProfileName(name) || defaultProfileName;
	if (!isProfileNameTaken(base, profiles, exceptId)) return base;
	for (let count = 2; ; count++) {
		const suffix = ` ${count}`;
		const candidate = `${base.slice(0, profileNameLimit - suffix.length).trimEnd()}${suffix}`;
		if (!isProfileNameTaken(candidate, profiles, exceptId)) return candidate;
	}
};

const timestamp = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

const setupTime = (value: unknown): number => (isRecord(value) ? timestamp(value.updatedAt) : 0);

// One read, so a follow running in another context at the same moment is seen whole or not at all.
const readState = async (): Promise<profilesState> => {
	const local = await browser.storage.local.get({
		[profilesKey]: null,
		[activeProfileIdKey]: null,
		[profileSetupsKey]: {},
		[syncedSeenKey]: null,
		prefs: null,
		[prefsStorageUpdatedAtKey]: 0,
		[fantasyRosterStorageKey]: null,
		[rosterUpdatedAtKey]: 0,
	});
	const stored = normalizeEntries(local[profilesKey]);
	const fallback = { id: defaultProfileId, name: defaultProfileName };
	const profiles = stored.length > 0 ? stored : [fallback];
	return {
		profiles,
		activeId: (profiles.find(entry => entry.id === local[activeProfileIdKey]) ?? profiles[0] ?? fallback).id,
		setups: isRecord(local[profileSetupsKey]) ? local[profileSetupsKey] : {},
		seen: typeof local[syncedSeenKey] === 'string' ? local[syncedSeenKey] : null,
		localLive: local.prefs === null ? null : {
			prefs: local.prefs,
			fantasyRoster: local[fantasyRosterStorageKey] ?? [],
			updatedAt: Math.max(timestamp(local[prefsStorageUpdatedAtKey]), timestamp(local[rosterUpdatedAtKey])),
		},
	};
};

export const loadProfiles = async (): Promise<profileList> => {
	const { profiles, activeId } = await readState();
	return { profiles, activeId };
};

const readSyncedActive = async (): Promise<profileEntry | null> => {
	try {
		return normalizeEntry((await browser.storage.sync.get({ [activeProfileSyncKey]: null }))[activeProfileSyncKey]);
	} catch {
		return null;
	}
};

const livePayload = (setup: profileSetup, updatedAt: number) => ({
	...prefsPayload(setup.prefs, updatedAt),
	...rosterPayload(setup.fantasyRoster, updatedAt),
});

const syncLive = async (payload: Record<string, unknown>): Promise<boolean> => (
	browser.storage.sync.set(payload).then(() => true, err => {
		logWarn('Could not sync the profile in use.', err);
		return false;
	})
);

// Only the profile in use syncs, so a switch in another browser arrives as new live prefs under a new
// profile id. The profile this browser was on is set aside from its local copy, which that browser
// never writes. Each copy keeps the time it was last edited, so whichever copy of the arriving
// profile is newer wins, and a newer one set aside here goes back out to the rest.
export const followSyncedProfile = async (): Promise<profileList> => {
	const [state, synced] = await Promise.all([readState(), readSyncedActive()]);
	const unchanged = { profiles: state.profiles, activeId: state.activeId };
	if (!synced) return unchanged;

	if (synced.id === state.activeId) {
		const current = state.profiles.find(entry => entry.id === synced.id);
		if (current?.name === synced.name) return unchanged;
		const profiles = state.profiles.map(entry => (entry.id === synced.id ? synced : entry));
		await browser.storage.local.set({ [profilesKey]: profiles });
		return { profiles, activeId: synced.id };
	}
	// Still the last profile this browser saw in sync: its own switch hasn't reached sync yet.
	if (synced.id === state.seen) return unchanged;

	const remote = await browser.storage.sync.get({ prefs: null, [prefsStorageUpdatedAtKey]: 0, [fantasyRosterStorageKey]: null, [rosterUpdatedAtKey]: 0 });
	const remoteAt = Math.max(timestamp(remote[prefsStorageUpdatedAtKey]), timestamp(remote[rosterUpdatedAtKey]));
	const { [synced.id]: arriving, ...setups } = state.setups;
	if (state.localLive) setups[state.activeId] = state.localLive;
	const profiles = [
		...state.profiles.filter(entry => entry.id !== synced.id && (state.localLive || entry.id !== state.activeId)),
		synced,
	];

	const keepOwn = arriving !== undefined && setupTime(arriving) > remoteAt;
	const live = keepOwn
		? livePayload(normalizeSetup(arriving), setupTime(arriving))
		: {
			...(remote.prefs === null ? {} : { prefs: remote.prefs, [prefsStorageUpdatedAtKey]: remote[prefsStorageUpdatedAtKey] }),
			...(remote[fantasyRosterStorageKey] === null ? {} : { [fantasyRosterStorageKey]: remote[fantasyRosterStorageKey], [rosterUpdatedAtKey]: remote[rosterUpdatedAtKey] }),
		};
	await browser.storage.local.set({ ...live, [profilesKey]: profiles, [activeProfileIdKey]: synced.id, [profileSetupsKey]: setups, [syncedSeenKey]: synced.id });
	if (keepOwn) await syncLive(live);
	return { profiles, activeId: synced.id };
};

const loadLiveSetup = async (): Promise<storedSetup> => {
	const stamps = { [prefsStorageUpdatedAtKey]: 0, [rosterUpdatedAtKey]: 0 };
	const [prefs, fantasyRoster, localStamps, syncStamps] = await Promise.all([
		loadStoredUserPreferences(),
		loadFantasyRoster().catch(() => []),
		browser.storage.local.get(stamps).catch(() => stamps),
		browser.storage.sync.get(stamps).catch(() => stamps),
	]);
	const updatedAt = Math.max(...[localStamps, syncStamps].flatMap(area => Object.values(area).map(timestamp)));
	return { prefs, fantasyRoster, updatedAt };
};

export const loadProfileSetup = async (id: string): Promise<profileSetup> => {
	const { activeId, setups } = await readState();
	return id === activeId ? loadLiveSetup() : normalizeSetup(setups[id]);
};

// Local first, in one write, so a browser hearing the synced switch finds this one already moved.
const writeLiveSetup = async (entry: profileEntry, setup: profileSetup, local: Record<string, unknown>, updatedAt = Date.now()): Promise<void> => {
	const live = livePayload(setup, updatedAt);
	await browser.storage.local.set({ ...live, ...local, [activeProfileIdKey]: entry.id });
	if (await syncLive({ ...live, [activeProfileSyncKey]: entry })) await browser.storage.local.set({ [syncedSeenKey]: entry.id });

	globalThis.localStorage?.setItem(themeStorageKey, live.prefs.theme);
	writeOpenRevealEnabled(live.prefs.openRevealEnabled);
	await browser.runtime.sendMessage({ type: 'UPDATE_PREFS', prefs: live.prefs }).catch(() => {});
};

export const switchProfile = async (id: string): Promise<profileList> => {
	const { profiles, activeId, setups } = await readState();
	const target = profiles.find(entry => entry.id === id);
	if (!target || id === activeId) return { profiles, activeId };

	const current = await loadLiveSetup();
	const { [id]: next, ...rest } = setups;
	await writeLiveSetup(target, normalizeSetup(next), { [profileSetupsKey]: { ...rest, [activeId]: current } }, setupTime(next) || Date.now());
	return { profiles, activeId: id };
};

// Without a setup the new profile starts as a copy of the one in use.
export const createProfile = async (name: string, setup?: profileSetup): Promise<profileList> => {
	const { profiles, activeId, setups } = await readState();
	const current = await loadLiveSetup();
	const entry = { id: crypto.randomUUID(), name: uniqueProfileName(name, profiles) };
	const next = [...profiles, entry];
	await writeLiveSetup(entry, setup ?? current, { [profilesKey]: next, [profileSetupsKey]: { ...setups, [activeId]: current } });
	return { profiles: next, activeId: entry.id };
};

export const replaceActiveProfile = async (name: string, setup: profileSetup): Promise<profileList> => {
	const { profiles, activeId } = await readState();
	const entry = { id: activeId, name: uniqueProfileName(name, profiles, activeId) };
	const next = profiles.map(profile => (profile.id === activeId ? entry : profile));
	await writeLiveSetup(entry, setup, { [profilesKey]: next });
	return { profiles: next, activeId };
};

export const renameProfile = async (id: string, name: string): Promise<profileList> => {
	const { profiles, activeId } = await readState();
	const entry = { id, name: uniqueProfileName(name, profiles, id) };
	const next = profiles.map(profile => (profile.id === id ? entry : profile));
	await browser.storage.local.set({ [profilesKey]: next });
	if (id === activeId) await browser.storage.sync.set({ [activeProfileSyncKey]: entry }).catch(err => logWarn('Could not sync the profile name.', err));
	return { profiles: next, activeId };
};

export const deleteProfile = async (id: string): Promise<profileList> => {
	const { profiles, activeId, setups } = await readState();
	if (id === activeId) return { profiles, activeId };
	const { [id]: _deleted, ...rest } = setups;
	const next = profiles.filter(profile => profile.id !== id);
	await browser.storage.local.set({ [profilesKey]: next, [profileSetupsKey]: rest });
	return { profiles: next, activeId };
};
