import * as z from 'zod/mini';
import { settledInPool, takeRequestSlot } from './apiClient';
import { collegeDivisions, conferenceCrestSlug } from './college';
import { leagueConfigMap } from './constants';
import type { CollegeLeagueId, ConferenceDirectory, ConferenceEntry } from './types';

const coreApiBase = 'https://sports.core.api.espn.com/v2/sports';

// The core API answers in pages of `$ref`s. These leagues' conferences sit under a division group;
// hockey, baseball and softball are found by walking down from the top of the tree instead.
const conferenceParents: Partial<Record<CollegeLeagueId, string[]>> = {
	ncaaf: ['80', '81'],
	ncaab: ['50'],
	ncaaw: ['50'],
};

const teamConferenceLeagues: readonly CollegeLeagueId[] = ['ncaamh', 'cbase', 'csoft'];

const directoryPoolSize = 4;

const RefSchema = z.object({ $ref: z.string() });

const RefListSchema = z.object({
	items: z.array(RefSchema),
});

const LeagueDocSchema = z.object({
	season: z.object({ year: z.number() }),
});

const GroupDocSchema = z.object({
	id: z.string(),
	name: z.string(),
	shortName: z.optional(z.string()),
	abbreviation: z.optional(z.string()),
	logos: z.optional(z.array(z.object({ href: z.optional(z.string()) }))),
	children: z.optional(RefSchema),
	teams: z.optional(RefSchema),
	standings: z.optional(RefSchema),
});

const StandingSchema = z.object({
	standings: z.optional(z.array(z.object({ team: z.optional(RefSchema) }))),
});

type GroupDoc = z.infer<typeof GroupDocSchema>;

// The refs come back as http; extension pages may only fetch https.
const toHttps = (url: string): string => url.replace(/^http:/, 'https:');

const withLimit = (url: string, limit: number): string => {
	const parsed = new URL(toHttps(url));
	parsed.searchParams.set('limit', String(limit));
	return parsed.toString();
};

const fetchCore = async <T>(url: string, schema: z.ZodMiniType<T>): Promise<T> => {
	await takeRequestSlot();
	const res = await fetch(toHttps(url), { headers: { Accept: 'application/json' } });
	if (!res.ok) throw new Error(`Conference lookup failed: HTTP ${res.status} for ${url}`);
	const parsed = schema.safeParse(await res.json());
	if (!parsed.success) throw new Error(`Conference lookup returned an unexpected shape for ${url}`);
	return parsed.data;
};

const fetchAll = async <T, R>(items: T[], run: (item: T) => Promise<R>): Promise<R[]> => {
	const results = await settledInPool(items, run, directoryPoolSize);
	return results.map(result => {
		if (result.status === 'rejected') throw result.reason;
		return result.value;
	});
};

const fetchGroupsAt = async (listUrl: string): Promise<GroupDoc[]> => {
	const list = await fetchCore(withLimit(listUrl, 100), RefListSchema);
	return await fetchAll(list.items, item => fetchCore(item.$ref, GroupDocSchema));
};

const teamIdFromRef = (ref: string | undefined): string | undefined => (ref ? /\/teams\/(\d+)/.exec(ref)?.[1] : undefined);

const teamIdsAt = async (teamsUrl: string): Promise<string[]> => {
	const list = await fetchCore(withLimit(teamsUrl, 500), RefListSchema);
	return list.items
		.map(item => teamIdFromRef(item.$ref))
		.filter((id): id is string => id !== undefined);
};

// Baseball and softball conferences link no team list, but their standings name every team.
const conferenceTeamIds = async (group: GroupDoc): Promise<string[]> => {
	if (group.teams) return await teamIdsAt(group.teams.$ref);
	if (!group.standings) return [];
	const tables = await fetchCore(group.standings.$ref, RefListSchema);
	const [table] = tables.items;
	if (!table) return [];
	const standing = await fetchCore(table.$ref, StandingSchema);
	return (standing.standings ?? [])
		.map(entry => teamIdFromRef(entry.team?.$ref))
		.filter((id): id is string => id !== undefined);
};

const toConferenceEntry = (leagueId: CollegeLeagueId, group: GroupDoc, divisionKey: string): ConferenceEntry => {
	const shortName = group.shortName ?? group.abbreviation ?? group.name;
	return {
		id: group.id,
		name: group.name,
		shortName,
		divisionKey,
		crestSlug: conferenceCrestSlug(leagueId, shortName, group.logos?.[0]?.href),
	};
};

export const fetchConferenceDirectory = async (leagueId: CollegeLeagueId): Promise<ConferenceDirectory> => {
	const config = leagueConfigMap[leagueId];
	const [sport, league] = config.espnPath.split('/');
	const leagueBase = `${coreApiBase}/${sport}/leagues/${league}`;
	const { season } = await fetchCore(leagueBase, LeagueDocSchema);
	const groupsBase = `${leagueBase}/seasons/${season.year}/types/2/groups`;

	const conferences: { group: GroupDoc; divisionKey: string }[] = [];
	const parents = conferenceParents[leagueId];
	if (parents) {
		const byParent = await fetchAll(parents, parent => fetchGroupsAt(`${groupsBase}/${parent}/children`));
		byParent.forEach((groups, index) => {
			for (const group of groups) conferences.push({ group, divisionKey: parents[index]! });
		});
	} else {
		const divisionKey = collegeDivisions[leagueId][0]!.key;
		const top = await fetchGroupsAt(groupsBase);
		const nested = await fetchAll(top, group => (group.children ? fetchGroupsAt(group.children.$ref) : Promise.resolve([group])));
		for (const group of nested.flat()) conferences.push({ group, divisionKey });
	}

	const teamConference: Record<string, string> = {};
	if (teamConferenceLeagues.includes(leagueId)) {
		const teamLists = await fetchAll(conferences, ({ group }) => conferenceTeamIds(group));
		teamLists.forEach((teamIds, index) => {
			for (const teamId of teamIds) teamConference[teamId] = conferences[index]!.group.id;
		});
	}

	const teamDivision: Record<string, string> = {};
	if (leagueId === 'ncaaf' && parents) {
		const divisionTeams = await fetchAll(parents, parent => teamIdsAt(`${groupsBase}/${parent}/teams`));
		divisionTeams.forEach((teamIds, index) => {
			for (const teamId of teamIds) teamDivision[teamId] = parents[index]!;
		});
	}

	return {
		leagueId,
		seasonYear: season.year,
		conferences: conferences.map(({ group, divisionKey }) => toConferenceEntry(leagueId, group, divisionKey)),
		teamConference,
		teamDivision,
		fetchedAt: Date.now(),
	};
};
