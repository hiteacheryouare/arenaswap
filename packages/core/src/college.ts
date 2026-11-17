import type { CollegeFilter, CollegeFilterMap, CollegeLeagueId, ConferenceDirectory, Game, LeagueId, ResolvedTheme, Team } from './types';

export const collegeLeagueIds: readonly CollegeLeagueId[] = ['ncaaf', 'ncaab', 'ncaaw', 'ncaamh', 'cbase', 'csoft'];

export const isCollegeLeagueId = (leagueId: unknown): leagueId is CollegeLeagueId => (
	collegeLeagueIds.includes(leagueId as CollegeLeagueId)
);

export type CollegeDivisionName = 'fbs' | 'fcs' | 'd1' | 'd2' | 'd3';

export interface CollegeDivision {
	key: string;
	name: CollegeDivisionName;
	groups?: string;
	hasConferences: boolean;
}

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

export const collegeRankedPollSize: Record<CollegeLeagueId, number> = {
	ncaaf: 25,
	ncaab: 25,
	ncaaw: 25,
	ncaamh: 20,
	cbase: 25,
	csoft: 25,
};

export const otherConferenceKey = 'other';

export const collegeLeaguesWithOtherConferences: readonly CollegeLeagueId[] = ['cbase', 'csoft'];

const leaguesWithoutScoreboardConferences: readonly CollegeLeagueId[] = ['ncaamh', 'cbase', 'csoft'];

const defaultDivisionOf = (leagueId: CollegeLeagueId): CollegeDivision => collegeDivisions[leagueId][0]!;

export const defaultCollegeFilter = (leagueId: CollegeLeagueId): CollegeFilter => ({
	divisions: [defaultDivisionOf(leagueId).key],
	conferences: [],
	ranked: false,
	titleRounds: true,
});

export const resolveCollegeFilter = (filters: CollegeFilterMap, leagueId: CollegeLeagueId): CollegeFilter => (
	filters[leagueId] ?? defaultCollegeFilter(leagueId)
);

export const isDefaultCollegeFilter = (leagueId: CollegeLeagueId, filter: CollegeFilter): boolean => {
	const [defaultKey] = defaultCollegeFilter(leagueId).divisions;
	return filter.divisions.length === 1
		&& filter.divisions[0] === defaultKey
		&& filter.conferences.length === 0
		&& !filter.ranked
		&& filter.titleRounds;
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
		titleRounds: raw.titleRounds !== false,
	};
};

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

export const collegeFetchGroups = (
	leagueId: LeagueId,
	filter?: CollegeFilter,
	directory?: ConferenceDirectory,
	favoriteTeamIds: readonly string[] = [],
): string[] => {
	if (!isCollegeLeagueId(leagueId)) return [];
	const divisions = collegeDivisions[leagueId];
	const defaultDivision = defaultDivisionOf(leagueId);
	if (divisions.length === 1 || !filter) return defaultDivision.groups ? [defaultDivision.groups] : [];

	const wanted = new Set(filter.divisions);
	if (filter.ranked || filter.titleRounds) wanted.add(defaultDivision.key);
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
	if (wanted.size === 0) wanted.add(defaultDivision.key);

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
	if (filter.titleRounds && game.collegeTitleRound) return true;
	const leagueId = game.league;

	if (filter.conferences.length > 0 && !directory && leaguesWithoutScoreboardConferences.includes(leagueId)) return true;

	const divisions = collegeDivisions[leagueId];
	if (divisions.length === 1) {
		if (filter.divisions.length > 0) return true;
	} else if (game.collegeGroups?.some(group => filter.divisions.includes(group))) {
		return true;
	}

	if (filter.ranked && !game.collegeSeeded && (game.homeTeam.rank !== undefined || game.awayTeam.rank !== undefined)) return true;

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

// The scoreboard names a game's conference but links no crest. Its short name slugs straight to a
// crest file for most of them; these few are filed under a longer name.
const scoreboardConferenceSlugs: Record<string, string> = {
	CUSA: 'conference_usa',
	'C-USA': 'conference_usa',
	MAC: 'mid_american',
	MVFC: 'missouri_valley',
	NEC: 'northeast',
	Patriot: 'patriot_league',
};

export const conferenceSlugFromName = (shortName: string): string | undefined => {
	const slug = scoreboardConferenceSlugs[shortName]
		?? shortName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
	return slug || undefined;
};

export interface ConferenceCrest {
	src?: string;
	fallbackSrc?: string;
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
