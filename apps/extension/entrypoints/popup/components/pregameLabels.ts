import type { SportType } from '@arenaswap/core/types';

// Baseball and hockey are the only sports ESPN names a starter for, and they are not the same
// person: a pitcher is the whole shape of the game to come, a goalie is one line of it.
// `as const` keeps the literals so these stay assignable to i18n.t's key union.
const starterHeadingKeys = {
	baseball: 'detail.probablePitchers',
	softball: 'detail.probablePitchers',
	hockey: 'detail.probableGoalies',
	basketball: undefined,
	football: undefined,
	soccer: undefined,
} as const satisfies Record<SportType, string | undefined>;

export const starterHeadingKey = (sportType: SportType | undefined) => (
	sportType ? starterHeadingKeys[sportType] : undefined
);

// ESPN's category names collide across sports: `points` and `assists` mean one thing in
// basketball and another in hockey, and `goals` is shared by hockey and soccer. The lookup is
// keyed by sport first for that reason — a flat map would print a hockey points leader as a
// basketball one. Keys are the normalized names parseTeamLeaders produces.
const leaderLabelKeys = {
	baseball: {
		avg: 'detail.leaderAvg',
		homeruns: 'detail.leaderHomeRuns',
		rbis: 'detail.leaderRbis',
	},
	softball: {
		avg: 'detail.leaderAvg',
		homeruns: 'detail.leaderHomeRuns',
		rbis: 'detail.leaderRbis',
	},
	basketball: {
		points: 'detail.leaderPoints',
		rebounds: 'detail.leaderRebounds',
		assists: 'detail.leaderAssists',
	},
	// Hockey points are goals plus assists, not basketball's points, so they do not share a label.
	hockey: {
		goals: 'detail.leaderGoals',
		assists: 'detail.leaderHockeyAssists',
		points: 'detail.leaderHockeyPoints',
	},
	football: {
		passing: 'detail.leaderPassing',
		rushing: 'detail.leaderRushing',
		receiving: 'detail.leaderReceiving',
	},
	soccer: {
		goals: 'detail.leaderGoals',
	},
} as const satisfies Record<SportType, Record<string, string>>;

// Mapped over SportType rather than indexed by it: `keyof` on a union of the per-sport objects
// gives the keys they have in common, which is none of them, so the union collapses to never.
type LeaderLabelKey = { [S in SportType]: typeof leaderLabelKeys[S][keyof typeof leaderLabelKeys[S]] }[SportType];

// A category we have no label for falls back to ESPN's own abbreviation rather than rendering a
// raw key, so a league that starts sending a new one degrades instead of breaking.
export const leaderLabelKey = (sportType: SportType | undefined, category: string): LeaderLabelKey | undefined => {
	const forSport: Partial<Record<string, LeaderLabelKey>> = sportType ? leaderLabelKeys[sportType] : {};
	return forSport[category];
};
