import { pollDormantThresholdPolls, pollHebetudinousHorizonMs, pollLookaheadTtlMs } from './constants';
import type { LeagueId } from './types';

export type PollMode = 'eager' | 'dormant' | 'hebetudinous';

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
			if (!schedule) return 'dormant';
			if (schedule.nextStartMs === null) return 'hebetudinous';
			return schedule.nextStartMs - now > pollHebetudinousHorizonMs ? 'hebetudinous' : 'dormant';
		},

		getNextStartMs: (leagueId, now = Date.now()) => liveSchedule(leagueId, now)?.nextStartMs,

		reset: (leagueId) => {
			if (leagueId === undefined) {
				emptyPollCounts.clear();
			} else {
				emptyPollCounts.delete(leagueId);
			}
		},
	};
};
