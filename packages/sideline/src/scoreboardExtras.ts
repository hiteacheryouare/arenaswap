import { conferenceSlugFromName, isCollegeLeagueId } from '@arenaswap/core';
import type { BroadcastLogo, GameConference, GoalEvent, LeagueId } from '@arenaswap/core';
import type { EspnCompetition } from './espnSchemas';

type EspnDetail = NonNullable<EspnCompetition['details']>[number];

// The clock leaves stoppage time out of `value`, so a goal at 90'+6' reads 90 minutes and the six
// are only in the display string.
export const detailClock = (detail: EspnDetail): { minute: number; addedMinutes?: number } | undefined => {
	if (typeof detail.clock?.value !== 'number') return undefined;
	const added = Number(/\+(\d+)/.exec(detail.clock.displayValue ?? '')?.[1]);
	return { minute: detail.clock.value / 60, ...(added > 0 ? { addedMinutes: added } : {}) };
};

const surname = (athlete: { displayName?: string; shortName?: string } | undefined): string | undefined => (
	athlete?.shortName?.replace(/^\S+\.\s+/, '').trim() || athlete?.displayName?.trim() || undefined
);

export const parseGoalEvents = (comp: EspnCompetition): GoalEvent[] | undefined => {
	const goals = (comp.details ?? []).flatMap((detail): GoalEvent[] => {
		if (detail.scoringPlay !== true || detail.shootout === true || detail.team?.id === undefined) return [];
		const clock = detailClock(detail);
		if (!clock) return [];
		const player = surname(detail.athletesInvolved?.[0]);
		return [{
			teamId: detail.team.id,
			...clock,
			...(player ? { player } : {}),
			...(detail.ownGoal ? { ownGoal: true } : {}),
			...(detail.penaltyKick ? { penalty: true } : {}),
		}];
	});
	return goals.length > 0 ? goals : undefined;
};

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
