import type { SportType } from '@arenaswap/core/types';
import type { BoxScore, BoxScoreAthlete, BoxScoreCategory, BoxScoreTeam, TeamComparisonRow } from './boxScoreParse';

// Which categories a sport shows, in what order, and which of ESPN's columns each one keeps.
//
// The budget is the reason anything is cut: ~263px inside the card leaves a truncated name column
// and at most six numbers. So these are condensed box scores, which have their own conventional
// column orders — not full ones with the right-hand side chopped off. Truncating basketball's full
// order (MIN | FG 3PT FT | REB AST STL BLK TO PF | PTS) at six gives a basketball table with no
// points column, which is why PTS-REB-AST sits directly after MIN here instead.
//
// Selection is by ESPN's stable `keys`, never by its display `labels`: the labels are the text we
// are replacing, and the same abbreviation means different things in different categories.

interface columnSpec {
	statKey: string;
	labelKey: string;
}

interface categorySpec {
	// ESPN's own category name. Basketball's single category arrives unnamed, so '' is a real
	// category rather than a missing one.
	name: string;
	headingKey: string;
	columns: readonly columnSpec[];
	// 0 means every row. Only football needs one: a college `defensive` array runs past 30 players
	// a side, and nobody scrolls 30 rows of tackles to reach the next section.
	rowCap: number;
	showTotals: boolean;
}

const baseballCategories = [
	{
		name: 'batting',
		headingKey: 'box.batting',
		// `hits-atBats` leads because it collapses two columns into one and "1-3" is how a fan
		// says it out loud. The slot that bought pays for HR, the one batting event worth
		// switching games for. AVG/OBP/SLG are season context, and a batter's `#P` is pitches
		// seen rather than thrown.
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
		// The canonical newspaper pitching line, unmodified. R and ER are usually the same number
		// and the pair is still habitual enough that dropping one is noticed.
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
		// QBR and RTG are composites a fan cannot compute or verify, and QBR is ESPN's own —
		// the same rule that keeps `MLBRating` out of the pre-game leaders block.
		columns: [
			{ statKey: 'completions/passingAttempts', labelKey: 'box.completionsAttempts' },
			{ statKey: 'passingYards', labelKey: 'box.yards' },
			{ statKey: 'yardsPerPassAttempt', labelKey: 'box.average' },
			{ statKey: 'passingTouchdowns', labelKey: 'box.touchdowns' },
			{ statKey: 'interceptions', labelKey: 'box.interceptions' },
			// Sacks suffered, and only the NFL sends it — college has no such column. Under
			// `defensive` below the same abbreviation means sacks recorded.
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
			// A receiver at 11 targets and 3 catches is a story the other columns do not tell.
			// The NFL sends it and college does not.
			{ statKey: 'receivingTargets', labelKey: 'box.targets' },
		],
		rowCap: 6,
		showTotals: false,
	},
	{
		name: 'defensive',
		headingKey: 'box.defensive',
		// The only category that answers who is wrecking the game on the other side of the ball.
		// TOT and SOLO both stay despite correlating: tackles are quoted as the pair. `QB HTS` is
		// near-duplicative of sacks and the least recognized column on the list.
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
		// Cheap to keep: empty in most games, and a takeaway is the highest-leverage play in the
		// sport. An empty category is dropped by the parser, so this costs a heading only when
		// somebody actually picked a pass off.
		columns: [
			{ statKey: 'interceptions', labelKey: 'box.interceptions' },
			{ statKey: 'interceptionYards', labelKey: 'box.yards' },
			{ statKey: 'interceptionTouchdowns', labelKey: 'box.touchdowns' },
		],
		rowCap: 0,
		showTotals: false,
	},
] as const;

// Kicking, punting, returns and fumbles are deliberately absent. A kicker's 3-for-3 is nine points
// the reader is already looking at on the scoreboard directly above; what a kicking table adds over
// that is misses, which are rare. A section that is uninformative in most games teaches the reader
// to scroll past the whole block.

const basketballColumns = [
	// MIN is the denominator that makes the rest legible — 18 points in 14 minutes is a different
	// sentence from 18 in 38 — and it is how a benched or injured starter shows up. FG and 3PT sit
	// last because they are a shooting pair and the widest strings on the row.
	{ statKey: 'minutes', labelKey: 'box.minutes' },
	{ statKey: 'points', labelKey: 'box.points' },
	{ statKey: 'rebounds', labelKey: 'box.rebounds' },
	{ statKey: 'assists', labelKey: 'box.assists' },
	{ statKey: 'fieldGoalsMade-fieldGoalsAttempted', labelKey: 'box.fieldGoals' },
	{ statKey: 'threePointFieldGoalsMade-threePointFieldGoalsAttempted', labelKey: 'box.threePointers' },
] as const;

// Forwards and defenses keep the split ESPN and the NHL's own game summary both use. The position
// group is what makes +/- and TOI legible — a defenseman at 24:00 is a normal night and a forward
// at 24:00 is a workhorse — and merging them would need a POS column, which costs one of the six
// numeric slots to say what a section heading says for free.
const skaterColumns = [
	{ statKey: 'goals', labelKey: 'box.goals' },
	{ statKey: 'assists', labelKey: 'box.hockeyAssists' },
	{ statKey: 'plusMinus', labelKey: 'box.plusMinus' },
	// ESPN's own label for `shotsTotal` is `S`, which is shots on goal. Its `SOG` column is
	// shootout goals, contradicting ESPN's published glossary — so `S` is the label used here and
	// `SOG` is never rendered, and no column in this file is labelled SOG mapping to another key.
	{ statKey: 'shotsTotal', labelKey: 'box.shots' },
	// A penalty creates the power play, which is the thing that makes hockey exciting. Time on ice
	// is coach-trust analysis; this reader is watching for events. Both fit, so both stay.
	{ statKey: 'penaltyMinutes', labelKey: 'box.penaltyMinutes' },
	{ statKey: 'timeOnIce', labelKey: 'box.timeOnIce' },
] as const;

const hockeyCategories = [
	{ name: 'forwards', headingKey: 'box.forwards', columns: skaterColumns, rowCap: 0, showTotals: false },
	{ name: 'defenses', headingKey: 'box.defensemen', columns: skaterColumns, rowCap: 0, showTotals: false },
	// Sent empty in every game sampled. When it is populated it replaces the two above rather than
	// supplementing them, which is what `dropDuplicateSkaters` guards.
	{ name: 'skaters', headingKey: 'box.skaters', columns: skaterColumns, rowCap: 0, showTotals: false },
	{
		name: 'goalies',
		headingKey: 'box.goaltending',
		// ESPN's own payload order, which is also Hockey-Reference's. The situational splits
		// (ESSV/PPSV/SHSV) are analyst territory, and `YTDG` is a season total sitting in a game
		// box score — rendered as G it would show somebody a 22-goal night.
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
		// Conventional in basketball, and not in football.
		showTotals: true,
	}],
	hockey: hockeyCategories,
	// No per-player box score exists for soccer. The team comparison table is the whole answer
	// there, and it is rendered for every sport that sends the flat shape.
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

// Soccer's `linescores` are positionally fixed rather than counted: [1H, 2H, ET1, ET2, PENS]. Two
// entries at full time, four after extra time, five if it went to penalties, and index 4 is always
// the shootout. Slicing the list to the entry count is also what gets a match live in the first
// period of extra time right, at three entries.
//
// MLS Round One goes from a 90-minute draw straight to penalties by rule, and ESPN still emits
// five entries with indices 2 and 3 zero-filled. Those phantom columns are drawn rather than
// detected: from the line score alone they are identical to a genuinely scoreless extra time,
// which is the commoner case of the two and the one that must not be erased.
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
	// ESPN's own suffix off the Final designation, already parsed onto the game. 'SO' is the only
	// value that moves a heading: a hockey shootout and a second overtime both arrive as a fifth
	// entry, and a shootout cannot happen in the playoffs, so the suffix separates the two.
	finalPeriodSuffix?: string;
}

// Extra innings are just numbered — a 12th inning reads "12". A fifth quarter does not read "5";
// it reads OT, and the ones after it 2OT and 3OT.
export const periodLabels = ({
	periodCount,
	regularPeriods,
	periodFormat,
	sportType,
	finalPeriodSuffix,
}: PeriodLabelInput): PeriodLabel[] => {
	// Keyed on the sport rather than on `periodFormat`: 'halves' over two regular periods also
	// describes NCAAB, whose fifth column is an overtime and not extra time.
	if (sportType === 'soccer') {
		return Array.from({ length: periodCount }, (_, index) => (
			soccerPeriodLabels[index] ?? { kind: 'number' as const, value: index + 1 }
		));
	}

	const shootoutIndex = sportType === 'hockey' && finalPeriodSuffix === 'SO' && periodCount > regularPeriods
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
	// Position in the category's own `labels` / `stats` arrays, which are parallel.
	index: number;
	// ESPN's own description of the column, which is the only thing that can tell a reader that
	// SACKS under passing means sacks suffered while SACKS under defensive means sacks recorded.
	// English, like every other ESPN string we pass through rather than translate.
	description: string;
}

export interface BoxScoreSection {
	name: string;
	headingKey: BoxHeadingKey;
	columns: BoxScoreColumn[];
	athletes: BoxScoreAthlete[];
	// Aligned to `columns`, or null for a category ESPN sends no totals for — every hockey one.
	totals: string[] | null;
	rowCap: number;
}

const statAt = (athlete: BoxScoreAthlete, index: number): string => athlete.stats[index] ?? '';

// A legitimate stat is often '0', '0-0' or '.000', so nothing here may lean on truthiness — the
// same trap that ate a rookie's '0-0' in the pre-game leaders block.
const toNumber = (value: string): number => {
	const parsed = Number.parseFloat(value);
	return Number.isFinite(parsed) ? parsed : 0;
};

// '20:14' is twenty minutes and fourteen seconds. Read as a float it would be 20.14, which happens
// to sort correctly and happens to be wrong.
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
	// Football and baseball pitching arrive in the order that is already conventional: ESPN sorts
	// each football category descending by its primary stat, and pitchers arrive in order of
	// appearance. Neither is re-sorted.
	if (sportType === 'football') return athletes;

	if (category.name === 'batting') {
		// The batting order is information, and a fan reads down it looking for their guy. Sort is
		// stable, so substitutions keep their chronological position inside the slot they took
		// over. A `batOrder` of 0 means no spot in the order and sorts last.
		return athletes.toSorted((a, b) => (a.batOrder || 10) - (b.batOrder || 10));
	}

	if (sportType === 'basketball') {
		// The announced lineup, then the bench in ESPN's order — which tracks the rotation — then
		// everyone who did not play, as a group at the bottom.
		return athletes.toSorted((a, b) => basketballRank(a) - basketballRank(b));
	}

	if (sportType === 'hockey' && category.name !== 'goalies') {
		// The one sport whose array order carries nothing a fan can use: line combinations are not
		// exposed and jersey order is noise. Points, then goals, then time on ice.
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
	// Both goalies are on the roster and the backup arrives all zeros, which renders a .000 save
	// percentage — the most wrong-looking number this screen could show.
	const timeOnIce = indexOfKey(category, 'timeOnIce');
	if (timeOnIce === -1) return athletes;
	return athletes.filter(athlete => toSeconds(statAt(athlete, timeOnIce)) > 0);
};

// `skaters` duplicates `forwards` and `defenses` rather than adding to them, so a game that sends
// all three would list every player twice.
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

		// A column ESPN did not send in this league is dropped rather than rendered empty: college
		// football sends no sacks under passing and no targets under receiving, and the NFL sends
		// both.
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

// Which team stats a sport compares, in what order. ESPN sends 14 to 28 of them and most are
// derived or situational — soccer alone ships nine percentage columns computed from other rows.
//
// The labels here are words rather than the abbreviations the player columns use, because a row in
// this table has the full width of the card to sit in and only a column head has to be terse.
//
// Baseball is absent on purpose: it sends a nested season-shaped tree instead of the flat rows
// every other sport sends, and its team totals are already the R-H-E on the line score above.

interface comparisonSpec {
	name: string;
	labelKey: string;
}

const comparisonSpecs = {
	// The order every match panel prints: control of the match, then discipline. `shotPct` is
	// derived from the two rows above it and reads 100% off a single shot.
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

// A penalty is match-defining when it happens and a row of zeros in every other match, so the two
// penalty rows are appended only once one of the four values is something other than zero.
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

// Whether there is a box score to show at all. The detail screen asks before offering a tab that
// leads to it, and the card itself asks before drawing — one answer, so the two cannot disagree
// and strand the reader on an empty panel.
//
// Both sides are checked rather than the selected one: the opening minutes of a football game
// parse to categories with no athletes on the side you happen to be looking at, and the strip is
// what gets you to the side that has them.
export const hasBoxScoreContent = (sportType: SportType | undefined, box: BoxScore): boolean => (
	box.lineScore !== null
	|| buildComparison(sportType, box.teamComparison).length > 0
	|| (box.away !== null && buildSections(sportType, box.away).length > 0)
	|| (box.home !== null && buildSections(sportType, box.home).length > 0)
);
