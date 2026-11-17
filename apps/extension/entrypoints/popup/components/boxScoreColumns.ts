import type { LeagueId, SportType } from '@arenaswap/core/types';
import type { BoxScore, BoxScoreAthlete, BoxScoreCategory, BoxScoreTeam, TeamComparisonRow } from '@arenaswap/sideline';

interface columnSpec {
	statKey: string;
	labelKey: string;
}

interface categorySpec {
	name: string;
	headingKey: string;
	columns: readonly columnSpec[];
	rowCap: number;
	showTotals: boolean;
}

const baseballCategories = [
	{
		name: 'batting',
		headingKey: 'box.batting',
		columns: [
			{ statKey: 'hits-atBats', labelKey: 'box.hitsAtBats' },
			{ statKey: 'runs', labelKey: 'box.runs' },
			{ statKey: 'RBIs', labelKey: 'box.rbi' },
			{ statKey: 'homeRuns', labelKey: 'box.homeRuns' },
			{ statKey: 'walks', labelKey: 'box.walks' },
			{ statKey: 'strikeouts', labelKey: 'box.strikeouts' },
		],
		rowCap: 0,
		showTotals: true,
	},
	{
		name: 'pitching',
		headingKey: 'box.pitching',
		columns: [
			{ statKey: 'fullInnings.partInnings', labelKey: 'box.inningsPitched' },
			{ statKey: 'hits', labelKey: 'box.hits' },
			{ statKey: 'runs', labelKey: 'box.runs' },
			{ statKey: 'earnedRuns', labelKey: 'box.earnedRuns' },
			{ statKey: 'walks', labelKey: 'box.walks' },
			{ statKey: 'strikeouts', labelKey: 'box.strikeouts' },
		],
		rowCap: 0,
		showTotals: true,
	},
] as const;

const footballCategories = [
	{
		name: 'passing',
		headingKey: 'box.passing',
		columns: [
			{ statKey: 'completions/passingAttempts', labelKey: 'box.completionsAttempts' },
			{ statKey: 'passingYards', labelKey: 'box.yards' },
			{ statKey: 'yardsPerPassAttempt', labelKey: 'box.average' },
			{ statKey: 'passingTouchdowns', labelKey: 'box.touchdowns' },
			{ statKey: 'interceptions', labelKey: 'box.interceptions' },
			{ statKey: 'sacks-sackYardsLost', labelKey: 'box.sacks' },
		],
		rowCap: 3,
		showTotals: false,
	},
	{
		name: 'rushing',
		headingKey: 'box.rushing',
		columns: [
			{ statKey: 'rushingAttempts', labelKey: 'box.carries' },
			{ statKey: 'rushingYards', labelKey: 'box.yards' },
			{ statKey: 'yardsPerRushAttempt', labelKey: 'box.average' },
			{ statKey: 'rushingTouchdowns', labelKey: 'box.touchdowns' },
			{ statKey: 'longRushing', labelKey: 'box.long' },
		],
		rowCap: 5,
		showTotals: false,
	},
	{
		name: 'receiving',
		headingKey: 'box.receiving',
		columns: [
			{ statKey: 'receptions', labelKey: 'box.receptions' },
			{ statKey: 'receivingYards', labelKey: 'box.yards' },
			{ statKey: 'yardsPerReception', labelKey: 'box.average' },
			{ statKey: 'receivingTouchdowns', labelKey: 'box.touchdowns' },
			{ statKey: 'longReception', labelKey: 'box.long' },
			{ statKey: 'receivingTargets', labelKey: 'box.targets' },
		],
		rowCap: 6,
		showTotals: false,
	},
	{
		name: 'defensive',
		headingKey: 'box.defensive',
		columns: [
			{ statKey: 'totalTackles', labelKey: 'box.totalTackles' },
			{ statKey: 'soloTackles', labelKey: 'box.soloTackles' },
			{ statKey: 'sacks', labelKey: 'box.sacks' },
			{ statKey: 'tacklesForLoss', labelKey: 'box.tacklesForLoss' },
			{ statKey: 'passesDefended', labelKey: 'box.passesDefended' },
			{ statKey: 'defensiveTouchdowns', labelKey: 'box.touchdowns' },
		],
		rowCap: 6,
		showTotals: false,
	},
	{
		name: 'interceptions',
		headingKey: 'box.interceptionsHeading',
		columns: [
			{ statKey: 'interceptions', labelKey: 'box.interceptions' },
			{ statKey: 'interceptionYards', labelKey: 'box.yards' },
			{ statKey: 'interceptionTouchdowns', labelKey: 'box.touchdowns' },
		],
		rowCap: 0,
		showTotals: false,
	},
] as const;

const basketballColumns = [
	{ statKey: 'minutes', labelKey: 'box.minutes' },
	{ statKey: 'points', labelKey: 'box.points' },
	{ statKey: 'rebounds', labelKey: 'box.rebounds' },
	{ statKey: 'assists', labelKey: 'box.assists' },
	{ statKey: 'fieldGoalsMade-fieldGoalsAttempted', labelKey: 'box.fieldGoals' },
	{ statKey: 'threePointFieldGoalsMade-threePointFieldGoalsAttempted', labelKey: 'box.threePointers' },
] as const;

const skaterColumns = [
	{ statKey: 'goals', labelKey: 'box.goals' },
	{ statKey: 'assists', labelKey: 'box.hockeyAssists' },
	{ statKey: 'plusMinus', labelKey: 'box.plusMinus' },
	{ statKey: 'shotsTotal', labelKey: 'box.shots' },
	{ statKey: 'penaltyMinutes', labelKey: 'box.penaltyMinutes' },
	{ statKey: 'timeOnIce', labelKey: 'box.timeOnIce' },
] as const;

const hockeyCategories = [
	{ name: 'forwards', headingKey: 'box.forwards', columns: skaterColumns, rowCap: 0, showTotals: false },
	{ name: 'defenses', headingKey: 'box.defensemen', columns: skaterColumns, rowCap: 0, showTotals: false },
	{ name: 'skaters', headingKey: 'box.skaters', columns: skaterColumns, rowCap: 0, showTotals: false },
	{
		name: 'goalies',
		headingKey: 'box.goaltending',
		columns: [
			{ statKey: 'goalsAgainst', labelKey: 'box.goalsAgainst' },
			{ statKey: 'shotsAgainst', labelKey: 'box.shotsAgainst' },
			{ statKey: 'saves', labelKey: 'box.saves' },
			{ statKey: 'savePct', labelKey: 'box.savePct' },
			{ statKey: 'timeOnIce', labelKey: 'box.timeOnIce' },
		],
		rowCap: 0,
		showTotals: false,
	},
] as const;

const boxSpecs = {
	baseball: baseballCategories,
	softball: baseballCategories,
	football: footballCategories,
	basketball: [{
		name: '',
		headingKey: 'box.players',
		columns: basketballColumns,
		rowCap: 0,
		showTotals: true,
	}],
	hockey: hockeyCategories,
	soccer: [],
} as const satisfies Record<SportType, readonly categorySpec[]>;

type SpecFor<S extends SportType> = typeof boxSpecs[S][number];
type AnySpec = { [S in SportType]: SpecFor<S> }[SportType];
export type BoxHeadingKey = { [S in SportType]: SpecFor<S>['headingKey'] }[SportType];
export type BoxColumnLabelKey = { [S in SportType]: SpecFor<S>['columns'][number]['labelKey'] }[SportType];

const periodHeadingKeys = {
	innings: 'box.byInning',
	quarters: 'box.byQuarter',
	periods: 'box.byPeriod',
	halves: 'box.byHalf',
} as const;

export type PeriodFormat = keyof typeof periodHeadingKeys;

export const lineScoreHeadingKey = (periodFormat: string | undefined) => (
	periodHeadingKeys[periodFormat as PeriodFormat] ?? periodHeadingKeys.periods
);

export type BoxPeriodLabelKey = 'box.periodEt1' | 'box.periodEt2' | 'box.periodPen' | 'box.periodSo';

export type PeriodLabel =
	| { kind: 'number'; value: number }
	| { kind: 'overtime'; index: number }
	| { kind: 'named'; labelKey: BoxPeriodLabelKey };

// The feed's soccer `linescores` are positionally fixed: [1H, 2H, ET1, ET2, PENS].
// MLS Round One goes from a draw straight to penalties and the feed still sends ET1 and ET2 zero-filled,
// indistinguishable from a scoreless extra time, so those columns are drawn.
const soccerPeriodLabels: PeriodLabel[] = [
	{ kind: 'number', value: 1 },
	{ kind: 'number', value: 2 },
	{ kind: 'named', labelKey: 'box.periodEt1' },
	{ kind: 'named', labelKey: 'box.periodEt2' },
	{ kind: 'named', labelKey: 'box.periodPen' },
];

export interface PeriodLabelInput {
	periodCount: number;
	regularPeriods: number;
	periodFormat: string | undefined;
	sportType: SportType | undefined;
	finalPeriodSuffix?: string;
	league?: LeagueId;
	isPostseason?: boolean;
}

const unlimitedOvertimeHockey = new Set<LeagueId>(['nhl', 'ncaamh']);

const isLiveShootout = ({ periodCount, regularPeriods, finalPeriodSuffix, league, isPostseason }: PeriodLabelInput): boolean => (
	finalPeriodSuffix === undefined
	&& periodCount === regularPeriods + 2
	&& !(isPostseason && league !== undefined && unlimitedOvertimeHockey.has(league))
);

export const periodLabels = (input: PeriodLabelInput): PeriodLabel[] => {
	const { periodCount, regularPeriods, periodFormat, sportType, finalPeriodSuffix } = input;
	if (sportType === 'soccer') {
		return Array.from({ length: periodCount }, (_, index) => (
			soccerPeriodLabels[index] ?? { kind: 'number' as const, value: index + 1 }
		));
	}

	const shootoutIndex = sportType === 'hockey' && periodCount > regularPeriods && (finalPeriodSuffix === 'SO' || isLiveShootout(input))
		? periodCount - 1
		: -1;

	return Array.from({ length: periodCount }, (_, index) => (
		index === shootoutIndex
			? { kind: 'named' as const, labelKey: 'box.periodSo' as const }
			: periodFormat === 'innings' || index < regularPeriods
				? { kind: 'number' as const, value: index + 1 }
				: { kind: 'overtime' as const, index: index - regularPeriods + 1 }
	));
};

export interface BoxScoreColumn {
	labelKey: BoxColumnLabelKey;
	index: number;
	description: string;
}

export interface BoxScoreSection {
	name: string;
	headingKey: BoxHeadingKey;
	columns: BoxScoreColumn[];
	athletes: BoxScoreAthlete[];
	totals: string[] | null;
	rowCap: number;
}

const statAt = (athlete: BoxScoreAthlete, index: number): string => athlete.stats[index] ?? '';

const toNumber = (value: string): number => {
	const parsed = Number.parseFloat(value);
	return Number.isFinite(parsed) ? parsed : 0;
};

const toSeconds = (value: string): number => {
	const parts = value.split(':');
	if (parts.length !== 2) return toNumber(value);
	return toNumber(parts[0] ?? '') * 60 + toNumber(parts[1] ?? '');
};

const indexOfKey = (category: BoxScoreCategory, statKey: string): number => category.keys.indexOf(statKey);

const basketballRank = (athlete: BoxScoreAthlete): number => (
	athlete.didNotPlay ? 2 : athlete.starter ? 0 : 1
);

const orderAthletes = (
	sportType: SportType,
	category: BoxScoreCategory,
	athletes: BoxScoreAthlete[],
): BoxScoreAthlete[] => {
	if (sportType === 'football') return athletes;

	if (category.name === 'batting') {
		return athletes.toSorted((a, b) => (a.batOrder || 10) - (b.batOrder || 10));
	}

	if (sportType === 'basketball') {
		return athletes.toSorted((a, b) => basketballRank(a) - basketballRank(b));
	}

	if (sportType === 'hockey' && category.name !== 'goalies') {
		const goals = indexOfKey(category, 'goals');
		const assists = indexOfKey(category, 'assists');
		const timeOnIce = indexOfKey(category, 'timeOnIce');
		const points = (athlete: BoxScoreAthlete): number => (
			toNumber(statAt(athlete, goals)) + toNumber(statAt(athlete, assists))
		);
		return athletes.toSorted((a, b) => (
			points(b) - points(a)
			|| toNumber(statAt(b, goals)) - toNumber(statAt(a, goals))
			|| toSeconds(statAt(b, timeOnIce)) - toSeconds(statAt(a, timeOnIce))
		));
	}

	return athletes;
};

const filterAthletes = (category: BoxScoreCategory, athletes: BoxScoreAthlete[]): BoxScoreAthlete[] => {
	if (category.name !== 'goalies') return athletes;
	const timeOnIce = indexOfKey(category, 'timeOnIce');
	if (timeOnIce === -1) return athletes;
	return athletes.filter(athlete => toSeconds(statAt(athlete, timeOnIce)) > 0);
};

const dropDuplicateSkaters = <T extends { name: string }>(categories: readonly T[], team: BoxScoreTeam): readonly T[] => {
	const hasSkaters = team.categories.some(category => category.name === 'skaters');
	if (!hasSkaters) return categories;
	return categories.filter(spec => spec.name !== 'forwards' && spec.name !== 'defenses');
};

export const buildSections = (sportType: SportType | undefined, team: BoxScoreTeam): BoxScoreSection[] => {
	const specs: readonly AnySpec[] = sportType ? boxSpecs[sportType] : [];
	return dropDuplicateSkaters(specs, team).flatMap(spec => {
		const category = team.categories.find(candidate => candidate.name === spec.name);
		if (!category) return [];

		const columns = spec.columns.flatMap(column => {
			const index = indexOfKey(category, column.statKey);
			return index === -1
				? []
				: [{ labelKey: column.labelKey, index, description: category.descriptions[index] ?? '' }];
		});
		if (columns.length === 0) return [];

		const athletes = orderAthletes(sportType as SportType, category, filterAthletes(category, category.athletes));
		if (athletes.length === 0) return [];

		return [{
			name: category.name,
			headingKey: spec.headingKey,
			columns,
			athletes,
			totals: spec.showTotals && category.totals.length > 0
				? columns.map(column => category.totals[column.index] ?? '')
				: null,
			rowCap: spec.rowCap,
		}];
	});
};

interface comparisonSpec {
	name: string;
	labelKey: string;
}

const comparisonSpecs = {
	soccer: [
		{ name: 'possessionPct', labelKey: 'box.possession' },
		{ name: 'totalShots', labelKey: 'box.shotsTaken' },
		{ name: 'shotsOnTarget', labelKey: 'box.onGoal' },
		{ name: 'wonCorners', labelKey: 'box.corners' },
		{ name: 'saves', labelKey: 'box.savesMade' },
		{ name: 'offsides', labelKey: 'box.offsides' },
		{ name: 'foulsCommitted', labelKey: 'box.fouls' },
		{ name: 'yellowCards', labelKey: 'box.yellowCards' },
		{ name: 'redCards', labelKey: 'box.redCards' },
	],
	football: [
		{ name: 'firstDowns', labelKey: 'box.firstDowns' },
		{ name: 'totalYards', labelKey: 'box.totalYards' },
		{ name: 'netPassingYards', labelKey: 'box.passingYards' },
		{ name: 'rushingYards', labelKey: 'box.rushingYards' },
		{ name: 'thirdDownEff', labelKey: 'box.thirdDown' },
		{ name: 'totalPenaltiesYards', labelKey: 'box.penalties' },
		{ name: 'turnovers', labelKey: 'box.turnovers' },
		{ name: 'possessionTime', labelKey: 'box.possession' },
	],
	basketball: [
		{ name: 'fieldGoalsMade-fieldGoalsAttempted', labelKey: 'box.fieldGoalsMade' },
		{ name: 'threePointFieldGoalsMade-threePointFieldGoalsAttempted', labelKey: 'box.threePointersMade' },
		{ name: 'freeThrowsMade-freeThrowsAttempted', labelKey: 'box.freeThrowsMade' },
		{ name: 'totalRebounds', labelKey: 'box.reboundsTotal' },
		{ name: 'assists', labelKey: 'box.assistsTotal' },
		{ name: 'totalTurnovers', labelKey: 'box.turnovers' },
		{ name: 'steals', labelKey: 'box.steals' },
		{ name: 'blocks', labelKey: 'box.blocks' },
		{ name: 'largestLead', labelKey: 'box.largestLead' },
		{ name: 'leadChanges', labelKey: 'box.leadChanges' },
	],
	hockey: [
		{ name: 'shotsTotal', labelKey: 'box.shotsOnGoal' },
		{ name: 'powerPlayGoals', labelKey: 'box.powerPlayGoals' },
		{ name: 'powerPlayOpportunities', labelKey: 'box.powerPlayChances' },
		{ name: 'penaltyMinutes', labelKey: 'box.penaltyMinutesTotal' },
		{ name: 'hits', labelKey: 'box.hitsDelivered' },
		{ name: 'blockedShots', labelKey: 'box.blockedShots' },
		{ name: 'faceoffPercent', labelKey: 'box.faceoffPct' },
		{ name: 'takeaways', labelKey: 'box.takeaways' },
	],
	baseball: [],
	softball: [],
} as const satisfies Record<SportType, readonly comparisonSpec[]>;

const conditionalComparisonSpecs = {
	soccer: [
		{ name: 'penaltyKickShots', labelKey: 'box.penaltyKicks' },
		{ name: 'penaltyKickGoals', labelKey: 'box.penaltyGoals' },
	],
	football: [],
	basketball: [],
	hockey: [],
	baseball: [],
	softball: [],
} as const satisfies Record<SportType, readonly comparisonSpec[]>;

type AnyComparisonSpec =
	| { [S in SportType]: typeof comparisonSpecs[S][number] }[SportType]
	| { [S in SportType]: typeof conditionalComparisonSpecs[S][number] }[SportType];

export type BoxComparisonLabelKey = AnyComparisonSpec['labelKey'];

export interface BoxComparisonRow {
	labelKey: BoxComparisonLabelKey;
	away: string;
	home: string;
}

const isZero = (value: string): boolean => /^[0.\s-]*$/.test(value);

export const buildComparison = (
	sportType: SportType | undefined,
	rows: readonly TeamComparisonRow[],
): BoxComparisonRow[] => {
	if (!sportType || rows.length === 0) return [];
	const find = (name: string) => rows.find(row => row.name === name);

	const select = (specs: readonly AnyComparisonSpec[]): BoxComparisonRow[] => specs.flatMap(spec => {
		const row = find(spec.name);
		return row ? [{ labelKey: spec.labelKey, away: row.away, home: row.home }] : [];
	});

	const always = select(comparisonSpecs[sportType]);
	const conditional = select(conditionalComparisonSpecs[sportType]);
	const anyPenalty = conditional.some(row => !isZero(row.away) || !isZero(row.home));
	return anyPenalty ? [...always, ...conditional] : always;
};

export const hasBoxScoreContent = (sportType: SportType | undefined, box: BoxScore): boolean => (
	box.lineScore !== null
	|| buildComparison(sportType, box.teamComparison).length > 0
	|| (box.away !== null && buildSections(sportType, box.away).length > 0)
	|| (box.home !== null && buildSections(sportType, box.home).length > 0)
);
