import type { SportType } from '@arenaswap/core/types';

// Two sources, one shape out.
//
// The whole league comes from `/apis/v2/sports/{path}/standings?level=3`, which nests
// league → conference → division and is what the Standings tab shows wherever it is affordable.
// The `/summary` response the screen already fetches carries a `standings` block too, but ESPN
// pre-filters that one to the matchup's own division — so it is the fallback for the three
// leagues whose full table is not worth the wire: men's and women's college basketball are 6.2MB
// and 365 teams, college football 2.6MB and 138.

interface RawStat {
	name?: string;
	description?: string;
	displayValue?: unknown;
}

interface RawLogo {
	href?: string;
	rel?: unknown;
}

// The `/summary` block sends the team as a bare short name and no abbreviation at all; the league
// endpoint sends a real team object. `location` is the column either way — "Tampa Bay", "Montreal",
// "Manchester City" — because a standings row is named rather than abbreviated.
interface RawTeamObject {
	id?: unknown;
	location?: unknown;
	shortDisplayName?: unknown;
	displayName?: unknown;
	logos?: RawLogo[];
}

interface RawEntry {
	team?: unknown;
	id?: unknown;
	stats?: RawStat[];
	logo?: RawLogo[];
}

interface RawGroup {
	header?: unknown;
	standings?: { entries?: RawEntry[] };
}

interface RawSummary {
	standings?: { groups?: RawGroup[] };
}

interface RawNode {
	name?: unknown;
	abbreviation?: unknown;
	isConference?: unknown;
	standings?: { entries?: RawEntry[] };
	children?: RawNode[];
}

interface columnSpec {
	// ESPN's own `name`, which is stable across leagues where the abbreviation is not.
	statName: string;
	labelKey: string;
}

export interface StandingsColumn {
	labelKey: StandingsLabelKey;
	// ESPN's own wording for the stat, passed through untranslated the way the box score passes
	// through its column descriptions. It is the only thing that says GB means games behind.
	description: string;
}

export interface StandingsRow {
	teamId: string;
	name: string;
	logo: string | undefined;
	// Aligned with the group's columns, so a row renders without looking anything up.
	values: string[];
	// Where this row sits, for the leagues that publish a position. Null everywhere else: a
	// division of five is not a ranking anyone quotes.
	rank: string | null;
}

export interface StandingsGroup {
	header: string;
	// The conference the division belongs to, for the leagues that have both levels. Null for a
	// flat league table and for the `/summary` fallback, neither of which knows its parent.
	conference: string | null;
	columns: StandingsColumn[];
	rows: StandingsRow[];
}

export const emptyStandings: StandingsGroup[] = [];

// A one-team group is ESPN answering out of season — college hockey returns exactly that in
// September. Nothing below a pair is a standing.
const minimumRows = 2;

// Which columns a sport shows and in what order, ordered the way each sport prints its own table
// rather than the way ESPN sends them: `stats` arrives alphabetized, so PCT would lead an NFL
// division and wins would come last.
const numericSpecs = {
	football: [
		{ statName: 'wins', labelKey: 'standings.wins' },
		{ statName: 'losses', labelKey: 'standings.losses' },
		{ statName: 'ties', labelKey: 'standings.ties' },
		{ statName: 'winPercent', labelKey: 'standings.winPercent' },
	],
	basketball: [
		{ statName: 'wins', labelKey: 'standings.wins' },
		{ statName: 'losses', labelKey: 'standings.losses' },
		{ statName: 'winPercent', labelKey: 'standings.winPercent' },
		{ statName: 'gamesBehind', labelKey: 'standings.gamesBehind' },
	],
	// Three results rather than two, and a points column instead of a percentage — a hockey table
	// cannot be read as W-L-PCT without lying about the overtime column.
	hockey: [
		{ statName: 'wins', labelKey: 'standings.wins' },
		{ statName: 'losses', labelKey: 'standings.losses' },
		{ statName: 'otLosses', labelKey: 'standings.otLosses' },
		{ statName: 'points', labelKey: 'standings.points' },
	],
	baseball: [
		{ statName: 'wins', labelKey: 'standings.wins' },
		{ statName: 'losses', labelKey: 'standings.losses' },
		{ statName: 'winPercent', labelKey: 'standings.winPercent' },
		{ statName: 'gamesBehind', labelKey: 'standings.gamesBehind' },
	],
	softball: [
		{ statName: 'wins', labelKey: 'standings.wins' },
		{ statName: 'losses', labelKey: 'standings.losses' },
		{ statName: 'winPercent', labelKey: 'standings.winPercent' },
		{ statName: 'gamesBehind', labelKey: 'standings.gamesBehind' },
	],
	// A league table, printed the way every league table is: played, the three results, goal
	// difference, points. `ties` is ESPN's name for a draw in every sport, so the key is shared
	// with the others above and only the label differs.
	soccer: [
		{ statName: 'gamesPlayed', labelKey: 'standings.gamesPlayed' },
		{ statName: 'wins', labelKey: 'standings.wins' },
		{ statName: 'ties', labelKey: 'standings.draws' },
		{ statName: 'losses', labelKey: 'standings.losses' },
		{ statName: 'pointDifferential', labelKey: 'standings.goalDifference' },
		{ statName: 'points', labelKey: 'standings.soccerPoints' },
	],
} as const satisfies Record<SportType, readonly columnSpec[]>;

// What a college division sends instead of a win column: two record strings and nothing countable.
// Only reached when the numeric set above comes back empty, because the league endpoint sends
// `vs. Conf.` alongside real wins and losses — printing both would be the same record twice.
const recordSpecs = [
	{ statName: 'vs. Conf.', labelKey: 'standings.conference' },
	{ statName: 'overall', labelKey: 'standings.overall' },
] as const satisfies readonly columnSpec[];

// Narrowed off the specs themselves rather than left as `string`: `i18n.t` only accepts a key the
// generated union knows, so a typo in a label above is a build error instead of a blank column head.
type AnyStandingsSpec =
	| { [S in SportType]: typeof numericSpecs[S][number] }[SportType]
	| typeof recordSpecs[number];

export type StandingsLabelKey = AnyStandingsSpec['labelKey'];

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

const statValue = (entry: RawEntry, statName: string): RawStat | undefined => (
	entry.stats?.find(stat => stat.name === statName)
);

const displayOf = (stat: RawStat | undefined): string => {
	const value = stat?.displayValue;
	return typeof value === 'string' ? value : typeof value === 'number' ? String(value) : '';
};

// The plain crest, never the `dark` variant: this table sits on the light `.gd-setup` card, where
// a mark drawn for a dark background is the one that disappears.
const logoFrom = (logos: RawLogo[] | undefined): string | undefined => {
	const list = Array.isArray(logos) ? logos : [];
	const plain = list.find(logo => {
		const rel = Array.isArray(logo.rel) ? logo.rel : [];
		return rel.includes('default') && !rel.includes('dark');
	});
	const href = (plain ?? list[0])?.href;
	return typeof href === 'string' && href.length > 0 ? href : undefined;
};

// "2026 NFC North Standings" arrives with the word the tab above it already says. Trimming it
// leaves a year and a proper noun, which is the part worth the width — and the part that reads the
// same in every language, since ESPN sends this header in English whatever the locale.
const trimStandingsSuffix = (header: string): string => (
	header.replace(/\s+standings\s*$/i, '').trim()
);

const columnsFor = (sportType: SportType, entries: RawEntry[]): AnyStandingsSpec[] => {
	const present = (specs: readonly AnyStandingsSpec[]) => specs.filter(spec => (
		entries.some(entry => displayOf(statValue(entry, spec.statName)).length > 0)
	));
	const numeric = present(numericSpecs[sportType] as readonly AnyStandingsSpec[]);
	return numeric.length > 0 ? numeric : present(recordSpecs);
};

const buildRows = (
	entries: RawEntry[],
	specs: AnyStandingsSpec[],
	identify: (entry: RawEntry) => { teamId: string; name: string; logo: string | undefined },
): StandingsRow[] => entries.flatMap<StandingsRow>(entry => {
	const identity = identify(entry);
	if (!identity.name) return [];
	return [{
		...identity,
		values: specs.map(spec => displayOf(statValue(entry, spec.statName))),
		// Only the leagues that publish a position get one. Deriving it from the row index
		// instead would number an eight-team division 1 to 8 and invent a standing.
		rank: displayOf(statValue(entry, 'rank')) || null,
	}];
});

const describeColumns = (entries: RawEntry[], specs: AnyStandingsSpec[]): StandingsColumn[] => (
	specs.map(spec => ({
		labelKey: spec.labelKey,
		description: entries
			.map(entry => text(statValue(entry, spec.statName)?.description))
			.find(description => description.length > 0) ?? '',
	}))
);

// ── The whole league ─────────────────────────────────────────────────────────

const teamObjectIdentity = (entry: RawEntry) => {
	const team = (entry.team ?? {}) as RawTeamObject;
	return {
		teamId: text(team.id),
		name: text(team.location) || text(team.shortDisplayName) || text(team.displayName),
		logo: logoFrom(team.logos),
	};
};

// Walks league → conference → division, carrying the conference name down to the divisions under
// it so the table can print one heading over its blocks. A flat league — the Premier League, a
// World Cup group stage — has no middle level and its groups carry a null conference.
const collectNodes = (
	node: RawNode,
	sportType: SportType,
	conference: string | null,
	into: StandingsGroup[],
): void => {
	const entries = node.standings?.entries ?? [];
	if (entries.length >= minimumRows) {
		const specs = columnsFor(sportType, entries);
		const rows = specs.length === 0 ? [] : buildRows(entries, specs, teamObjectIdentity);
		if (rows.length >= minimumRows) {
			into.push({
				header: trimStandingsSuffix(text(node.name)),
				conference,
				columns: describeColumns(entries, specs),
				rows,
			});
		}
	}

	// `isConference` marks the level that owns a heading. The root league carries it as false and
	// passes whatever it was handed, which is null — so a two-level league gets conference
	// headings and a one-level league gets none.
	const childConference = node.isConference === true ? text(node.name) : conference;
	for (const child of node.children ?? []) collectNodes(child, sportType, childConference, into);
};

// Every league takes the whole-table endpoint except these three. Gzipped they are 257KB, 261KB
// and 64KB against 4-15KB for a professional league, and men's college basketball is 6.2MB of
// JSON to parse for 365 teams across 31 conferences — which is a directory rather than a table
// anybody reads. Those three fall back to the matchup's own conference off the summary.
const summaryOnlyLeagues: ReadonlySet<string> = new Set(['ncaab', 'ncaaw', 'ncaaf']);

export const usesFullLeagueStandings = (league: string): boolean => !summaryOnlyLeagues.has(league);

export const parseLeagueStandings = (
	data: unknown,
	sportType: SportType | undefined,
): StandingsGroup[] => {
	if (!sportType || !numericSpecs[sportType]) return emptyStandings;
	const root = data as RawNode | undefined;
	if (!root || typeof root !== 'object') return emptyStandings;
	const groups: StandingsGroup[] = [];
	collectNodes(root, sportType, null, groups);
	return groups;
};

// ── The matchup's own division, off the summary ──────────────────────────────

const summaryIdentity = (entry: RawEntry) => ({
	teamId: text(entry.id),
	name: text(entry.team),
	logo: logoFrom(entry.logo),
});

const buildSummaryGroup = (
	group: RawGroup,
	sportType: SportType,
	matchupIds: ReadonlySet<string>,
): StandingsGroup | null => {
	const entries = group.standings?.entries ?? [];
	if (entries.length === 0) return null;

	// A group holding neither team is a table the reader cannot find themselves in. ESPN returns
	// one for a World Cup knockout tie, where the two sides came out of different groups. This
	// rule is for this source only: a group here is meant to *be* the matchup's division, unlike
	// the whole-league walk above, where every group is wanted.
	if (!entries.some(entry => matchupIds.has(text(entry.id)))) return null;

	const specs = columnsFor(sportType, entries);
	// Olympic hockey sends the four teams in the group and an empty `stats` on every one of them.
	if (specs.length === 0) return null;

	const rows = buildRows(entries, specs, summaryIdentity);
	if (rows.length === 0) return null;

	return {
		header: trimStandingsSuffix(text(group.header)),
		conference: null,
		columns: describeColumns(entries, specs),
		rows,
	};
};

export const parseStandings = (
	data: unknown,
	sportType: SportType | undefined,
	homeTeamId: string,
	awayTeamId: string,
): StandingsGroup[] => {
	if (!sportType || !numericSpecs[sportType]) return emptyStandings;
	const groups = (data as RawSummary)?.standings?.groups;
	if (!Array.isArray(groups)) return emptyStandings;

	const matchupIds = new Set([homeTeamId, awayTeamId].filter(Boolean));
	if (matchupIds.size === 0) return emptyStandings;

	return groups.flatMap(group => {
		const parsed = buildSummaryGroup(group, sportType, matchupIds);
		return parsed ? [parsed] : [];
	});
};
