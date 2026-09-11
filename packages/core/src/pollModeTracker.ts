import { pollDormantThresholdPolls, pollHebetudinousHorizonMs, pollLookaheadTtlMs } from './constants';
import type { LeagueId } from './types';

export type PollMode = 'eager' | 'dormant' | 'hebetudinous';

/* What the tracker knows about a league's next kickoff. `undefined` is "nobody has said" and is a
   different state from `null`, which is "asked, and there is nothing in the window" — the first
   keeps a league on the dormant beat until the answer arrives, the second is what puts it to
   sleep. Collapsing the two would send every league that has not been asked yet to the ceiling. */
type NextStart = number | null;

interface Schedule {
	recordedAt: number;
	nextStartMs: NextStart;
}

export interface PollModeTracker {
	recordPollResult(leagueId: LeagueId, hasLiveGames: boolean, nextStartMs?: NextStart, now?: number): void;
	recordLookahead(leagueId: LeagueId, nextStartMs: NextStart, now?: number): void;
	needsLookahead(leagueId: LeagueId, now?: number): boolean;
	getMode(leagueId: LeagueId, now?: number): PollMode;
	getNextStartMs(leagueId: LeagueId, now?: number): NextStart | undefined;
	reset(leagueId?: LeagueId): void;
}

export const createPollModeTracker = (): PollModeTracker => {
	const emptyPollCounts = new Map<LeagueId, number>();
	const schedules = new Map<LeagueId, Schedule>();

	const isQuiet = (leagueId: LeagueId): boolean => (
		(emptyPollCounts.get(leagueId) ?? 0) >= pollDormantThresholdPolls
	);

	// A schedule expires on its own age, and also the moment the kickoff it names has come and gone:
	// a start in the past says nothing about the next one.
	const liveSchedule = (leagueId: LeagueId, now: number): Schedule | undefined => {
		const schedule = schedules.get(leagueId);
		if (!schedule) return undefined;
		if (now - schedule.recordedAt >= pollLookaheadTtlMs) return undefined;
		if (schedule.nextStartMs !== null && schedule.nextStartMs <= now) return undefined;
		return schedule;
	};

	return {
		recordPollResult: (leagueId, hasLiveGames, nextStartMs, now = Date.now()) => {
			if (hasLiveGames) {
				emptyPollCounts.set(leagueId, 0);
			} else {
				emptyPollCounts.set(leagueId, (emptyPollCounts.get(leagueId) ?? 0) + 1);
			}
			// A kickoff seen on the poll's own payload is better than anything a lookahead could
			// return and costs no request, so it replaces the cached answer. A poll that saw none
			// says nothing either way — today's card being empty is exactly the case the lookahead
			// exists for — so it is not recorded as "nothing scheduled".
			if (nextStartMs !== undefined && nextStartMs !== null) {
				schedules.set(leagueId, { recordedAt: now, nextStartMs });
			}
		},

		recordLookahead: (leagueId, nextStartMs, now = Date.now()) => {
			schedules.set(leagueId, { recordedAt: now, nextStartMs });
		},

		needsLookahead: (leagueId, now = Date.now()) => (
			isQuiet(leagueId) && liveSchedule(leagueId, now) === undefined
		),

		getMode: (leagueId, now = Date.now()) => {
			if (!isQuiet(leagueId)) return 'eager';
			const schedule = liveSchedule(leagueId, now);
			// Unasked or expired: dormant is the faster of the two quiet states and the safe answer
			// to give while the lookahead is still out.
			if (!schedule) return 'dormant';
			if (schedule.nextStartMs === null) return 'hebetudinous';
			return schedule.nextStartMs - now > pollHebetudinousHorizonMs ? 'hebetudinous' : 'dormant';
		},

		getNextStartMs: (leagueId, now = Date.now()) => liveSchedule(leagueId, now)?.nextStartMs,

		// Cadence state only. A league's schedule is not a fact about how it has been polled, so it
		// survives — otherwise every preference change would send all 31 leagues to look it up again.
		reset: (leagueId) => {
			if (leagueId === undefined) {
				emptyPollCounts.clear();
			} else {
				emptyPollCounts.delete(leagueId);
			}
		},
	};
};
