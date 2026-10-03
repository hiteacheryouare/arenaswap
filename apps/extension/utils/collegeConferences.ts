import { fetchConferenceDirectory, isObjectRecord, logWarn } from '@arenaswap/core';
import type { CollegeLeagueId, ConferenceDirectory } from '@arenaswap/core/types';

// Conferences realign once a year at most, so a week is plenty and keeps the core API's ~30
// requests per league from repeating on every popup open.
export const conferenceDirectoryTtlMs = 7 * 24 * 60 * 60 * 1000;

export const conferenceDirectoryKey = (leagueId: CollegeLeagueId): string => `arenaswap.collegeConferences.${leagueId}`;

export const isConferenceDirectory = (value: unknown, leagueId: CollegeLeagueId): value is ConferenceDirectory => (
	isObjectRecord(value)
	&& value.leagueId === leagueId
	&& typeof value.fetchedAt === 'number'
	&& Array.isArray(value.conferences)
	&& isObjectRecord(value.teamConference)
	&& isObjectRecord(value.teamDivision)
);

// A stamp in the future is stale, which is what a clock that moved backwards would otherwise pin.
export const isConferenceDirectoryFresh = (directory: ConferenceDirectory, now: number): boolean => (
	now >= directory.fetchedAt && now - directory.fetchedAt < conferenceDirectoryTtlMs
);

export const readConferenceDirectory = async (leagueId: CollegeLeagueId): Promise<ConferenceDirectory | undefined> => {
	const key = conferenceDirectoryKey(leagueId);
	const stored = (await browser.storage.local.get(key))[key];
	return isConferenceDirectory(stored, leagueId) ? stored : undefined;
};

const pending = new Map<CollegeLeagueId, Promise<ConferenceDirectory>>();

// Cached first; a failed refresh keeps serving last week's answer rather than none.
export const loadConferenceDirectory = async (leagueId: CollegeLeagueId): Promise<ConferenceDirectory> => {
	const cached = await readConferenceDirectory(leagueId);
	if (cached && isConferenceDirectoryFresh(cached, Date.now())) return cached;

	const running = pending.get(leagueId);
	if (running) return await running;

	const request = (async () => {
		try {
			const fresh = await fetchConferenceDirectory(leagueId);
			await browser.storage.local.set({ [conferenceDirectoryKey(leagueId)]: fresh });
			return fresh;
		} catch (err) {
			if (!cached) throw err;
			logWarn(`Could not refresh the ${leagueId} conference list; keeping the last one.`, err);
			return cached;
		}
	})();
	pending.set(leagueId, request);
	try {
		return await request;
	} finally {
		pending.delete(leagueId);
	}
};
