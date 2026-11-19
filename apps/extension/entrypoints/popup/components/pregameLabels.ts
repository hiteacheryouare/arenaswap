import type { SportType } from '@arenaswap/core/types';

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
	// The NBA and the college leagues send season totals; the WNBA sends per-game averages under
	// their own names. Both are labelled for what they are rather than collapsed into one.
	basketball: {
		points: 'detail.leaderPoints',
		rebounds: 'detail.leaderRebounds',
		assists: 'detail.leaderAssists',
		pointspergame: 'detail.leaderPointsPerGame',
		reboundspergame: 'detail.leaderReboundsPerGame',
		assistspergame: 'detail.leaderAssistsPerGame',
	},
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

type LeaderLabelKey = { [S in SportType]: typeof leaderLabelKeys[S][keyof typeof leaderLabelKeys[S]] }[SportType];

export const leaderLabelKey = (sportType: SportType | undefined, category: string): LeaderLabelKey | undefined => {
	const forSport: Partial<Record<string, LeaderLabelKey>> = sportType ? leaderLabelKeys[sportType] : {};
	return forSport[category];
};

// Two letters for the circle a missing headshot leaves behind. ESPN's shortName is already
// initialled — "D. Peterson", "P. Crow-Armstrong" — so splitting on dots and spaces gives the
// first initial and the surname's, which is what a placeholder avatar wants.
export { playerInitials } from '@arenaswap/ui/src/components/playerInitials';
