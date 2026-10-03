import type { CollegeFilter, CollegeFilterMap, CollegeLeagueId, ConferenceDirectory, Game, LeagueId, ResolvedTheme, Team } from './types';

export const collegeLeagueIds: readonly CollegeLeagueId[] = ['ncaaf', 'ncaab', 'ncaaw', 'ncaamh', 'cbase', 'csoft'];

export const isCollegeLeagueId = (leagueId: unknown): leagueId is CollegeLeagueId => (
	collegeLeagueIds.includes(leagueId as CollegeLeagueId)
);

export type CollegeDivisionName = 'fbs' | 'fcs' | 'd1' | 'd2' | 'd3';

export interface CollegeDivision {
	key: string;
	name: CollegeDivisionName;
	// The scoreboard's `groups=` value. Absent where the league's scoreboard takes none.
	groups?: string;
	hasConferences: boolean;
}

// The first entry of each league is its default, which is what the scoreboard returned before this
// filter existed.
export const collegeDivisions: Record<CollegeLeagueId, readonly CollegeDivision[]> = {
	ncaaf: [
		{ key: '80', name: 'fbs', groups: '80', hasConferences: true },
		{ key: '81', name: 'fcs', groups: '81', hasConferences: true },
		{ key: '57', name: 'd2', groups: '57', hasConferences: false },
		{ key: '58', name: 'd3', groups: '58', hasConferences: false },
	],
	ncaab: [{ key: '50', name: 'd1', groups: '50', hasConferences: true }],
	ncaaw: [{ key: '50', name: 'd1', groups: '50', hasConferences: true }],
	ncaamh: [{ key: 'd1', name: 'd1', hasConferences: true }],
	cbase: [{ key: 'd1', name: 'd1', hasConferences: true }],
	csoft: [{ key: 'd1', name: 'd1', hasConferences: true }],
};

// The college hockey poll stops at 20.
export const collegeRankedPollSize: Record<CollegeLeagueId, number> = {
	ncaaf: 25,
	ncaab: 25,
	ncaaw: 25,
	ncaamh: 20,
	cbase: 25,
	csoft: 25,
};

// Our sources list only about half of baseball's and softball's conferences, so every team outside
// them lands here.
export const otherConferenceKey = 'other';

export const collegeLeaguesWithOtherConferences: readonly CollegeLeagueId[] = ['cbase', 'csoft'];

// These scoreboards carry no conference on the team, so filtering by conference needs the directory.
const leaguesWithoutScoreboardConferences: readonly CollegeLeagueId[] = ['ncaamh', 'cbase', 'csoft'];

export const defaultCollegeFilter = (leagueId: CollegeLeagueId): CollegeFilter => ({
	divisions: [collegeDivisions[leagueId][0]!.key],
	conferences: [],
	ranked: false,
});

export const resolveCollegeFilter = (filters: CollegeFilterMap, leagueId: CollegeLeagueId): CollegeFilter => (
	filters[leagueId] ?? defaultCollegeFilter(leagueId)
);

export const isDefaultCollegeFilter = (leagueId: CollegeLeagueId, filter: CollegeFilter): boolean => {
	const [defaultKey] = defaultCollegeFilter(leagueId).divisions;
	return filter.divisions.length === 1
		&& filter.divisions[0] === defaultKey
		&& filter.conferences.length === 0
		&& !filter.ranked;
};

const maxStoredConferences = 64;

const uniqueStrings = (value: unknown): string[] => (
	Array.isArray(value)
		? [...new Set(value.filter((item): item is string => typeof item === 'string' && item.length > 0 && item.length <= 16))]
		: []
);

const normalizeCollegeFilter = (leagueId: CollegeLeagueId, raw: Record<string, unknown>): CollegeFilter => {
	const knownDivisions = new Set(collegeDivisions[leagueId].map(division => division.key));
	return {
		divisions: uniqueStrings(raw.divisions).filter(key => knownDivisions.has(key)),
		conferences: uniqueStrings(raw.conferences).slice(0, maxStoredConferences),
		ranked: raw.ranked === true,
	};
};

// Defaults are dropped rather than stored, so prefs only ever hold what someone actually changed.
export const normalizeCollegeFilters = (value: unknown): CollegeFilterMap => {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
	const result: CollegeFilterMap = {};
	for (const leagueId of collegeLeagueIds) {
		const raw = (value as Record<string, unknown>)[leagueId];
		if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
		const filter = normalizeCollegeFilter(leagueId, raw as Record<string, unknown>);
		if (!isDefaultCollegeFilter(leagueId, filter)) result[leagueId] = filter;
	}
	return result;
};

export const withCollegeFilter = (filters: CollegeFilterMap, leagueId: CollegeLeagueId, filter: CollegeFilter): CollegeFilterMap => {
	const rest = { ...filters };
	delete rest[leagueId];
	return isDefaultCollegeFilter(leagueId, filter) ? rest : { ...rest, [leagueId]: filter };
};

export const isConferenceCovered = (leagueId: CollegeLeagueId, filter: CollegeFilter, divisionKey: string): boolean => (
	collegeDivisions[leagueId].length === 1
		? filter.divisions.length > 0
		: filter.divisions.includes(divisionKey)
);

export const needsConferenceDirectory = (leagueId: CollegeLeagueId, filter: CollegeFilter, hasFavorites: boolean): boolean => {
	if (leagueId === 'ncaaf') return hasFavorites || !isDefaultCollegeFilter(leagueId, filter);
	return leaguesWithoutScoreboardConferences.includes(leagueId) && filter.conferences.length > 0;
};

/* The `groups=` values to fetch for one league; an empty list means one request with no `groups`.
   Only football has more than one division, and it fetches each one that something picked could
   match: a selected division, the division a selected conference sits in, FBS for Top 25, and the
   division of any favorite team. */
export const collegeFetchGroups = (
	leagueId: LeagueId,
	filter?: CollegeFilter,
	directory?: ConferenceDirectory,
	favoriteTeamIds: readonly string[] = [],
): string[] => {
	if (!isCollegeLeagueId(leagueId)) return [];
	const divisions = collegeDivisions[leagueId];
	const [defaultDivision] = divisions;
	if (divisions.length === 1 || !filter) return defaultDivision?.groups ? [defaultDivision.groups] : [];

	const wanted = new Set(filter.divisions);
	if (filter.ranked) wanted.add(defaultDivision!.key);
	for (const conferenceId of filter.conferences) {
		const entry = directory?.conferences.find(conference => conference.id === conferenceId);
		if (entry) {
			wanted.add(entry.divisionKey);
		} else {
			for (const division of divisions) if (division.hasConferences) wanted.add(division.key);
		}
	}
	for (const teamId of favoriteTeamIds) {
		const divisionKey = directory?.teamDivision[teamId];
		if (divisionKey) wanted.add(divisionKey);
	}
	if (wanted.size === 0) wanted.add(defaultDivision!.key);

	return divisions
		.filter(division => wanted.has(division.key) && division.groups)
		.map(division => division.groups!);
};

const conferenceOf = (team: Team, directory: ConferenceDirectory | undefined): string | undefined => (
	team.conferenceId ?? directory?.teamConference[team.id] ?? (directory ? otherConferenceKey : undefined)
);

export const passesCollegeFilter = (
	game: Game,
	filter: CollegeFilter,
	directory: ConferenceDirectory | undefined,
	isFavorite: boolean,
): boolean => {
	if (isFavorite || !isCollegeLeagueId(game.league)) return true;
	const leagueId = game.league;

	// Without the directory there is no way to tell these leagues' conferences apart, and an empty
	// board would be the worse mistake.
	if (filter.conferences.length > 0 && !directory && leaguesWithoutScoreboardConferences.includes(leagueId)) return true;

	const divisions = collegeDivisions[leagueId];
	if (divisions.length === 1) {
		if (filter.divisions.length > 0) return true;
	} else if (game.collegeGroups?.some(group => filter.divisions.includes(group))) {
		return true;
	}

	if (filter.ranked && (game.homeTeam.rank !== undefined || game.awayTeam.rank !== undefined)) return true;

	if (filter.conferences.length === 0) return false;
	return [game.homeTeam, game.awayTeam].some(team => {
		const conferenceId = conferenceOf(team, directory);
		return conferenceId !== undefined && filter.conferences.includes(conferenceId);
	});
};

export const filterCollegeGames = (
	games: Game[],
	filters: CollegeFilterMap,
	directories: Partial<Record<CollegeLeagueId, ConferenceDirectory>>,
	isFavorite: (game: Game) => boolean,
): Game[] => games.filter(game => (
	!isCollegeLeagueId(game.league)
	|| passesCollegeFilter(game, resolveCollegeFilter(filters, game.league), directories[game.league], isFavorite(game))
));

/* ── Conference crests ──────────────────────────────────────────────────────────────────────────
   Conference ids are per sport: the SEC is 8 in football and 23 in basketball, where 8 is the Big 12.
   The CDN's id-keyed crests use football's ids, so a crest is found by its name slug (`sec`), which
   is the same file in every sport, and only then upgraded to the id-keyed art, which is often better
   and is the only kind drawn for a dark ground. */
const conferenceCrestBase = 'https://a.espncdn.com/i/teamlogos/ncaa_conf';

const conferenceCrestIds: Record<string, { id: string; dark?: boolean }> = {
	american: { id: '151', dark: true },
	acc: { id: '1', dark: true },
	big_12: { id: '4', dark: true },
	big_ten: { id: '5', dark: true },
	conference_usa: { id: '12' },
	fbs_independents: { id: '18', dark: true },
	mid_american: { id: '15', dark: true },
	mountain_west: { id: '17', dark: true },
	pac_12: { id: '9', dark: true },
	sec: { id: '8', dark: true },
	sun_belt: { id: '37' },
	big_sky: { id: '20' },
	caa: { id: '48', dark: true },
	coastal: { id: '48', dark: true },
	fcs_independents: { id: '32' },
	ivy: { id: '22' },
	meac: { id: '24' },
	missouri_valley: { id: '21', dark: true },
	northeast: { id: '25', dark: true },
	patriot_league: { id: '27', dark: true },
	pioneer: { id: '28', dark: true },
	southern: { id: '29' },
	southland: { id: '30', dark: true },
	swac: { id: '31', dark: true },
};

// These leagues' conferences carry no logo, so they borrow the crest of the same conference by name.
// Hockey's `IND` is deliberately absent: `independents.png` is the FBS independents mark.
const conferenceCrestAliases: Partial<Record<CollegeLeagueId, Record<string, string>>> = {
	ncaab: { Metro: 'maac' },
	ncaaw: { Metro: 'maac' },
	ncaamh: { 'Big Ten': 'big_ten', ECAC: 'ecac_hockey', MAAC: 'maac' },
	cbase: {
		American: 'american', ACC: 'acc', 'Atlantic Sun': 'atlantic_sun', 'Big 10': 'big_ten', 'Big 12': 'big_12',
		'Big East': 'big_east', 'Big West': 'big_west', CAA: 'caa', 'C-USA': 'conference_usa', Metro: 'maac',
		NEC: 'northeast', SEC: 'sec', Southland: 'southland', 'Sun Belt': 'sun_belt', WCC: 'west_coast',
	},
	csoft: {
		American: 'american', ACC: 'acc', 'Atlantic Sun': 'atlantic_sun', 'Big 10': 'big_ten', 'Big 12': 'big_12',
		'C-USA': 'conference_usa', 'Mountain West': 'mountain_west', SEC: 'sec', 'Sun Belt': 'sun_belt', WAC: 'wac',
	},
};

export const conferenceCrestSlug = (leagueId: CollegeLeagueId, shortName: string, logoHref?: string): string | undefined => {
	const fromHref = logoHref ? /\/ncaa_conf\/500\/([a-z0-9_]+)\.png/.exec(logoHref)?.[1] : undefined;
	return fromHref ?? conferenceCrestAliases[leagueId]?.[shortName];
};

export interface ConferenceCrest {
	src?: string;
	// Tried when `src` will not load.
	fallbackSrc?: string;
	// The artwork was drawn for a dark ground, so it needs no legibility check there.
	drawnForDark: boolean;
}

export const resolveConferenceCrest = (slug: string | undefined, theme: ResolvedTheme): ConferenceCrest => {
	if (!slug) return { drawnForDark: false };
	const slugUrl = `${conferenceCrestBase}/500/${slug}.png`;
	const byId = conferenceCrestIds[slug];
	if (!byId) return { src: slugUrl, drawnForDark: false };
	if (theme === 'dark' && byId.dark) {
		return { src: `${conferenceCrestBase}/500-dark/${byId.id}.png`, fallbackSrc: slugUrl, drawnForDark: true };
	}
	return { src: `${conferenceCrestBase}/500/${byId.id}.png`, fallbackSrc: slugUrl, drawnForDark: false };
};
