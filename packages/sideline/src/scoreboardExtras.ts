import { conferenceSlugFromName, isCollegeLeagueId } from '@arenaswap/core';
import type { BroadcastLogo, GameConference, LeagueId } from '@arenaswap/core';
import type { EspnCompetition } from './espnSchemas';

export const parseBroadcastLogos = (comp: EspnCompetition): Record<string, BroadcastLogo> | undefined => {
	const logos: Record<string, BroadcastLogo> = {};
	for (const geoBroadcast of comp.geoBroadcasts ?? []) {
		const name = geoBroadcast.media?.shortName?.trim();
		const logo = geoBroadcast.media?.logo?.trim();
		const darkLogo = geoBroadcast.media?.darkLogo?.trim();
		if (!name || (!logo && !darkLogo) || logos[name]) continue;
		logos[name] = { ...(logo ? { logo } : {}), ...(darkLogo ? { darkLogo } : {}) };
	}
	return Object.keys(logos).length > 0 ? logos : undefined;
};

export const parseConference = (comp: EspnCompetition, league: LeagueId): GameConference | undefined => {
	if (!isCollegeLeagueId(league) || comp.conferenceCompetition !== true) return undefined;
	const id = comp.groups?.id;
	const shortName = comp.groups?.shortName?.trim();
	if (!id || !shortName) return undefined;
	const crestSlug = conferenceSlugFromName(shortName);
	return { id, shortName, ...(crestSlug ? { crestSlug } : {}) };
};
