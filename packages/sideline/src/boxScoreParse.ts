interface RawTeamRef {
	id?: string;
	abbreviation?: string;
}

interface RawAthleteEntry {
	athlete?: {
		id?: string;
		displayName?: string;
		shortName?: string;
		position?: { abbreviation?: string };
	};
	stats?: unknown;
	starter?: boolean;
	didNotPlay?: boolean;
	reason?: string;
	batOrder?: number;
	position?: { abbreviation?: string };
}

interface RawStatCategory {
	name?: string;
	type?: string;
	labels?: unknown;
	keys?: unknown;
	descriptions?: unknown;
	totals?: unknown;
	athletes?: RawAthleteEntry[];
}

interface RawPlayerBlock {
	team?: RawTeamRef;
	statistics?: RawStatCategory[];
}

interface RawTeamBlock {
	team?: RawTeamRef;
	homeAway?: string;
	statistics?: unknown;
}

interface RawTeamStat {
	name?: string;
	label?: string;
	abbreviation?: string;
	displayValue?: unknown;
}

interface RawLinePeriod {
	displayValue?: unknown;
	hits?: number;
	errors?: number;
}

interface RawLineCompetitor {
	homeAway?: string;
	team?: RawTeamRef;
	score?: unknown;
	linescores?: RawLinePeriod[];
}

interface RawSummary {
	boxscore?: {
		players?: RawPlayerBlock[];
		teams?: RawTeamBlock[];
	};
	header?: {
		competitions?: { competitors?: RawLineCompetitor[] }[];
	};
}

export interface BoxScoreAthlete {
	id: string;
	name: string;
	position: string;
	stats: string[];
	starter: boolean;
	// ESPN sends `batOrder: 0` for pitchers and for every sport that has no lineup, so a real spot
	// in the order is 1-9 and 0 means "not batting".
	batOrder: number;
	// Basketball is the only sport that reports this, as a flag plus a reason and an empty `stats`.
	// The flag is what both readers branch on: ESPN sends `didNotPlay: true` with no `reason`
	// often enough that a truthy check on the reason renders a row of empty cells instead of DNP.
	didNotPlay: boolean;
	didNotPlayReason: string;
}

export interface BoxScoreCategory {
	// Football and hockey name their categories, baseball types them, and basketball sends a
	// single unnamed one holding the whole box score — so an empty name is a real category rather
	// than a parse failure.
	name: string;
	labels: string[];
	keys: string[];
	descriptions: string[];
	// Absent on every hockey category, present on the rest.
	totals: string[];
	athletes: BoxScoreAthlete[];
}

export interface BoxScoreTeam {
	teamId: string;
	abbreviation: string;
	categories: BoxScoreCategory[];
}

export interface TeamComparisonRow {
	name: string;
	label: string;
	away: string;
	home: string;
}

export interface LineScoreRow {
	teamId: string;
	abbreviation: string;
	periods: string[];
	total: string;
	hits: number | null;
	errors: number | null;
}

export interface LineScore {
	periodCount: number;
	away: LineScoreRow;
	home: LineScoreRow;
}

export interface BoxScore {
	lineScore: LineScore | null;
	away: BoxScoreTeam | null;
	home: BoxScoreTeam | null;
	teamComparison: TeamComparisonRow[];
}

export const emptyBoxScore: BoxScore = {
	lineScore: null,
	away: null,
	home: null,
	teamComparison: [],
};

const asText = (value: unknown): string => (
	typeof value === 'string' ? value : typeof value === 'number' ? String(value) : ''
);

const asTextList = (value: unknown): string[] => (
	Array.isArray(value) ? value.map(asText) : []
);

// Team id is the primary key and `homeAway` the fallback, the same way `parseTeamRecords` resolves
// its competitors: ESPN orders these blocks by its own `displayOrder`, which is away-then-home in
// every sport sampled except soccer, where it is reversed. College hockey ids are synthesized on
// our side and can never match, which is what the fallback is for.
const pickBySide = <T extends { team?: RawTeamRef; homeAway?: string }>(
	blocks: T[] | undefined,
	teamId: string,
	side: 'home' | 'away',
	otherTeamId: string,
): T | undefined => {
	if (!Array.isArray(blocks)) return undefined;
	const byId = teamId ? blocks.find(block => block?.team?.id === teamId) : undefined;
	if (byId) return byId;
	const bySide = blocks.find(block => block?.homeAway === side);
	if (bySide) return bySide;
	if (blocks.length !== 2 || !otherTeamId) return undefined;
	const otherIndex = blocks.findIndex(block => block?.team?.id === otherTeamId);
	return otherIndex === -1 ? undefined : blocks[1 - otherIndex];
};

const parseAthlete = (entry: RawAthleteEntry | null | undefined): BoxScoreAthlete => ({
	id: asText(entry?.athlete?.id),
	name: entry?.athlete?.shortName || entry?.athlete?.displayName || '',
	position: asText(entry?.position?.abbreviation || entry?.athlete?.position?.abbreviation),
	stats: asTextList(entry?.stats),
	starter: entry?.starter === true,
	batOrder: typeof entry?.batOrder === 'number' ? entry.batOrder : 0,
	didNotPlay: entry?.didNotPlay === true,
	didNotPlayReason: entry?.didNotPlay === true ? asText(entry.reason) : '',
});

const parseCategory = (category: RawStatCategory | null | undefined): BoxScoreCategory => ({
	name: asText(category?.name || category?.type),
	labels: asTextList(category?.labels),
	keys: asTextList(category?.keys),
	descriptions: asTextList(category?.descriptions),
	totals: asTextList(category?.totals),
	athletes: Array.isArray(category?.athletes) ? category.athletes.map(parseAthlete) : [],
});

const parseTeamBlock = (
	block: RawPlayerBlock | undefined,
	fallbackAbbreviation: string,
): BoxScoreTeam | null => {
	if (!block) return null;
	const categories = (Array.isArray(block.statistics) ? block.statistics : [])
		.map(parseCategory)
		// A category with no columns cannot be rendered as a table, and one with no athletes is
		// what ESPN sends for a phase that never happened — an empty `puntReturns`, or hockey's
		// `skaters` alongside the `forwards` and `defenses` it duplicates.
		.filter(category => category.keys.length > 0 && category.athletes.length > 0);
	if (categories.length === 0) return null;
	return {
		teamId: asText(block.team?.id),
		abbreviation: asText(block.team?.abbreviation) || fallbackAbbreviation,
		categories,
	};
};

// Only the flat, display-ready shape. Basketball, football, hockey and soccer send
// `{ name, label, displayValue }` rows meant to be printed; baseball sends a nested tree of ~100
// season-shaped stats under `{ name, displayName, stats: [] }` instead.
const flatTeamStats = (block: RawTeamBlock | undefined): RawTeamStat[] => {
	const stats = Array.isArray(block?.statistics) ? block.statistics : [];
	return stats.filter((stat): stat is RawTeamStat => (
		typeof stat === 'object' && stat !== null
		&& 'displayValue' in stat
		&& !('stats' in stat)
	));
};

export const parseTeamComparison = (
	data: unknown,
	homeTeamId: string,
	awayTeamId: string,
): TeamComparisonRow[] => {
	const teams = (data as RawSummary)?.boxscore?.teams;
	const awayStats = flatTeamStats(pickBySide(teams, awayTeamId, 'away', homeTeamId));
	const homeStats = flatTeamStats(pickBySide(teams, homeTeamId, 'home', awayTeamId));
	if (awayStats.length === 0 || homeStats.length === 0) return [];

	return awayStats.flatMap(stat => {
		const name = asText(stat.name);
		const home = homeStats.find(candidate => asText(candidate.name) === name);
		if (!name || !home) return [];
		return [{
			name,
			label: asText(stat.label || stat.abbreviation) || name,
			away: asText(stat.displayValue),
			home: asText(home.displayValue),
		}];
	});
};

const parseLineRow = (
	competitor: RawLineCompetitor | undefined,
	periodCount: number,
	fallbackAbbreviation: string,
): LineScoreRow => {
	const periods = Array.isArray(competitor?.linescores) ? competitor.linescores : [];
	const withHitsErrors = periods.filter(period => typeof period?.hits === 'number');
	const sum = (pick: (period: RawLinePeriod) => number | undefined): number => (
		periods.reduce((total, period) => total + (period ? pick(period) ?? 0 : 0), 0)
	);

	return {
		teamId: asText(competitor?.team?.id),
		abbreviation: asText(competitor?.team?.abbreviation) || fallbackAbbreviation,
		periods: Array.from({ length: periodCount }, (_, index) => asText(periods[index]?.displayValue)),
		total: asText(competitor?.score),
		hits: withHitsErrors.length > 0 ? sum(period => period.hits) : null,
		errors: withHitsErrors.length > 0 ? sum(period => period.errors) : null,
	};
};

export const parseLineScore = (
	data: unknown,
	homeTeamId: string,
	awayTeamId: string,
	homeAbbreviation: string,
	awayAbbreviation: string,
): LineScore | null => {
	const competitors = (data as RawSummary)?.header?.competitions?.[0]?.competitors;
	const away = pickBySide(competitors, awayTeamId, 'away', homeTeamId);
	const home = pickBySide(competitors, homeTeamId, 'home', awayTeamId);
	if (!away || !home) return null;

	const periodCount = Math.max(
		Array.isArray(away.linescores) ? away.linescores.length : 0,
		Array.isArray(home.linescores) ? home.linescores.length : 0,
	);
	if (periodCount === 0) return null;

	return {
		periodCount,
		away: parseLineRow(away, periodCount, awayAbbreviation),
		home: parseLineRow(home, periodCount, homeAbbreviation),
	};
};

export const parseBoxScore = (
	data: unknown,
	homeTeamId: string,
	awayTeamId: string,
	homeAbbreviation: string,
	awayAbbreviation: string,
): BoxScore => {
	const players = (data as RawSummary)?.boxscore?.players;
	return {
		lineScore: parseLineScore(data, homeTeamId, awayTeamId, homeAbbreviation, awayAbbreviation),
		away: parseTeamBlock(pickBySide(players, awayTeamId, 'away', homeTeamId), awayAbbreviation),
		home: parseTeamBlock(pickBySide(players, homeTeamId, 'home', awayTeamId), homeAbbreviation),
		teamComparison: parseTeamComparison(data, homeTeamId, awayTeamId),
	};
};
