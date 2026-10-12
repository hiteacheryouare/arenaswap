import type { LeagueSchedule } from './types';

const dayMs = 24 * 60 * 60 * 1000;

/* A future season's calendar is the regular season alone, with the postseason added once the
   bracket is set, so the last listed day is not the last day of games. Two weeks covers that lag,
   and the popup's cached copy is never older than one, so a stale calendar is replaced before it
   can label a league in the middle of its playoffs. */
export const offseasonGraceMs = 14 * dayMs;

export interface LeagueOffseason {
	returnsAt?: number;
}

// `undefined` is a league we have never heard back about, which says nothing. An empty schedule is
// ESPN sending no calendar at all, which only happens once a season has finished.
export const resolveOffseason = (schedule: LeagueSchedule | undefined, now: number): LeagueOffseason | null => {
	if (!schedule) return null;
	const { startsAt, endsAt } = schedule;
	if (startsAt === undefined || endsAt === undefined) return {};
	if (now < startsAt) return { returnsAt: startsAt };
	return now > endsAt + offseasonGraceMs ? {} : null;
};
