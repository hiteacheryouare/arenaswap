import { pollDormantThresholdPolls } from './constants';
import type { LeagueId } from './types';

export type PollMode = 'eager' | 'dormant';

export interface PollModeTracker {
	recordPollResult(leagueId: LeagueId, hasLiveGames: boolean): void;
	getMode(leagueId: LeagueId): PollMode;
	reset(leagueId?: LeagueId): void;
}

export const createPollModeTracker = (): PollModeTracker => {
	const emptyPollCounts = new Map<LeagueId, number>();

	return {
		recordPollResult: (leagueId, hasLiveGames) => {
			if (hasLiveGames) {
				emptyPollCounts.set(leagueId, 0);
			} else {
				emptyPollCounts.set(leagueId, (emptyPollCounts.get(leagueId) ?? 0) + 1);
			}
		},
		getMode: (leagueId) => {
			return (emptyPollCounts.get(leagueId) ?? 0) >= pollDormantThresholdPolls ? 'dormant' : 'eager';
		},
		reset: (leagueId) => {
			if (leagueId === undefined) {
				emptyPollCounts.clear();
			} else {
				emptyPollCounts.delete(leagueId);
			}
		},
	};
};
