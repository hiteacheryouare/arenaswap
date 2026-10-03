import type { SportType } from '@arenaswap/core/types';

export interface SeasonStatSpec {
	// ESPN's `name` for the stat in the pre-game `boxscore` block.
	name: string;
	// Baseball sends `runs` and `homeRuns` under both batting and pitching, so it is keyed by group.
	group?: string;
	labelKey: typeof seasonStatLabelKeys[number];
	lowerIsBetter?: true;
	// Soccer sends season totals, where a clean sheet or a level goal difference is a real zero.
	zeroIsReal?: true;
}

const seasonStatLabelKeys = [
	'detail.statPoints',
	'detail.statPointsAllowed',
	'detail.statYards',
	'detail.statYardsAllowed',
	'detail.statPassingYards',
	'detail.statRushingYards',
	'detail.statFieldGoalPct',
	'detail.statThreePointPct',
	'detail.statRebounds',
	'detail.statAssists',
	'detail.statGoals',
	'detail.statGoalsAllowed',
	'detail.statPowerPlayPct',
	'detail.statPenaltyKillPct',
	'detail.statShots',
	'detail.statRuns',
	'detail.statHomeRuns',
	'detail.statBattingAvg',
	'detail.statOps',
	'detail.statEra',
	'detail.statWhip',
	'detail.statGoalDifference',
] as const;

// A handful per sport rather than everything ESPN sends: the block carries eleven hockey stats and
// thirteen basketball ones, several of them duplicates, and the point is a glance at who is better
// at what. Order is the order they render in.
const seasonStatSpecs: Record<SportType, SeasonStatSpec[]> = {
	football: [
		{ name: 'totalPointsPerGame', labelKey: 'detail.statPoints' },
		{ name: 'totalPointsPerGameAllowed', labelKey: 'detail.statPointsAllowed', lowerIsBetter: true },
		{ name: 'yardsPerGame', labelKey: 'detail.statYards' },
		{ name: 'yardsPerGameAllowed', labelKey: 'detail.statYardsAllowed', lowerIsBetter: true },
		{ name: 'passingYardsPerGame', labelKey: 'detail.statPassingYards' },
		{ name: 'rushingYardsPerGame', labelKey: 'detail.statRushingYards' },
	],
	basketball: [
		{ name: 'avgPoints', labelKey: 'detail.statPoints' },
		{ name: 'avgPointsAgainst', labelKey: 'detail.statPointsAllowed', lowerIsBetter: true },
		{ name: 'fieldGoalPct', labelKey: 'detail.statFieldGoalPct' },
		{ name: 'threePointFieldGoalPct', labelKey: 'detail.statThreePointPct' },
		{ name: 'avgRebounds', labelKey: 'detail.statRebounds' },
		{ name: 'avgAssists', labelKey: 'detail.statAssists' },
	],
	hockey: [
		{ name: 'avgGoals', labelKey: 'detail.statGoals' },
		{ name: 'avgGoalsAgainst', labelKey: 'detail.statGoalsAllowed', lowerIsBetter: true },
		{ name: 'powerPlayPct', labelKey: 'detail.statPowerPlayPct' },
		{ name: 'penaltyKillPct', labelKey: 'detail.statPenaltyKillPct' },
		{ name: 'avgShots', labelKey: 'detail.statShots' },
	],
	baseball: [
		{ name: 'runs', group: 'batting', labelKey: 'detail.statRuns' },
		{ name: 'homeRuns', group: 'batting', labelKey: 'detail.statHomeRuns' },
		{ name: 'avg', group: 'batting', labelKey: 'detail.statBattingAvg' },
		{ name: 'OPS', group: 'batting', labelKey: 'detail.statOps' },
		{ name: 'ERA', group: 'pitching', labelKey: 'detail.statEra', lowerIsBetter: true },
		{ name: 'WHIP', group: 'pitching', labelKey: 'detail.statWhip', lowerIsBetter: true },
	],
	softball: [
		{ name: 'runs', group: 'batting', labelKey: 'detail.statRuns' },
		{ name: 'homeRuns', group: 'batting', labelKey: 'detail.statHomeRuns' },
		{ name: 'avg', group: 'batting', labelKey: 'detail.statBattingAvg' },
		{ name: 'ERA', group: 'pitching', labelKey: 'detail.statEra', lowerIsBetter: true },
	],
	soccer: [
		{ name: 'totalGoals', labelKey: 'detail.statGoals', zeroIsReal: true },
		{ name: 'goalsConceded', labelKey: 'detail.statGoalsAllowed', lowerIsBetter: true, zeroIsReal: true },
		{ name: 'goalDifference', labelKey: 'detail.statGoalDifference', zeroIsReal: true },
	],
};

export const seasonStatSpecsFor = (sportType: SportType | undefined): SeasonStatSpec[] => (
	sportType ? seasonStatSpecs[sportType] : []
);

export type InjuryStatus = 'out' | 'doubtful' | 'questionable' | 'dayToDay';

// The game-day statuses only. The injured lists (10-, 15- and 60-day, IR) and paternity leave are
// dropped: they run to a dozen names a team in baseball, and none of them is news on game day.
export const injuryStatusByType: Record<string, InjuryStatus> = {
	INJURY_STATUS_OUT: 'out',
	INJURY_STATUS_DOUBTFUL: 'doubtful',
	INJURY_STATUS_QUESTIONABLE: 'questionable',
	INJURY_STATUS_DAYTODAY: 'dayToDay',
};

export const injuryStatusOrder: readonly InjuryStatus[] = ['out', 'doubtful', 'questionable', 'dayToDay'];

export const injuryStatusLabelKeys = {
	out: 'detail.injuryOut',
	doubtful: 'detail.injuryDoubtful',
	questionable: 'detail.injuryQuestionable',
	dayToDay: 'detail.injuryDayToDay',
} as const satisfies Record<InjuryStatus, string>;

// Only where a short turnaround is news. A football week and a baseball series both run on a
// fixed rhythm that nobody previews a game by.
export const showsRestDays = (sportType: SportType | undefined): boolean => (
	sportType === 'basketball' || sportType === 'hockey'
);
